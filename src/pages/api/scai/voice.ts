import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchGroqWithRotation, genererSystemPrompt } from '../../../lib/scaiUtils';
import { getScaiSessions } from '../../../lib/mongo';

// Configuration des clients
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default: Rachel

// Clés en rotation — l'env réel n'a QUE des clés numérotées
// (GROQ_API_KEY_1..10, ELEVENLABS_KEY_1..10). L'ancien code lisait
// GROQ_API_KEY / ELEVENLABS_API_KEY (inexistantes) : STT et TTS
// échouaient systématiquement avec "not configured".
const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  ...Array.from({ length: 10 }, (_, i) => process.env[`GROQ_API_KEY_${i + 1}`]),
].filter(Boolean) as string[];
const ELEVENLABS_KEYS = [
  process.env.ELEVENLABS_API_KEY,
  ...Array.from({ length: 10 }, (_, i) => process.env[`ELEVENLABS_KEY_${i + 1}`]),
].filter(Boolean) as string[];

type VoiceResponse = {
  success: boolean;
  text?: string;
  audioUrl?: string;
  audioBuffer?: string; // base64 — un Buffer ne peut pas traverser JSON tel quel
  response?: string;
  suggest_scan?: boolean;
  scan_params?: any;
  detected_updates?: any;
  error?: string;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Accept large audio files
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VoiceResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId, userProfile = {}, mode = 'full' } = req.body;
    
    // Mode 1: Speech-to-Text ONLY (transcribe audio)
    if (mode === 'stt' && req.body.audio) {
      const transcription = await transcribeAudio(req.body.audio);
      return res.status(200).json({
        success: true,
        text: transcription
      });
    }

    // Mode 2: Text-to-Speech ONLY (generate audio from text)
    if (mode === 'tts' && req.body.text) {
      const audioBuffer = await textToSpeech(req.body.text);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="scai-voice.mp3"');
      // .send() attend VoiceResponse ici à cause du typage générique de la
      // réponse — mais ce mode renvoie du binaire brut, pas du JSON.
      return (res as NextApiResponse).status(200).send(audioBuffer);
    }

    // Mode 3: FULL PIPELINE (STT → LLM → TTS)
    const { text: userText, audio: userAudio } = req.body;
    let finalText = userText;

    if (!finalText && userAudio) {
      finalText = await transcribeAudio(userAudio);
    }

    if (!finalText && !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId et texte/audio requis' 
      });
    }

    // Step 1: Get LLM response (reuse existing chat logic)
    const chatResponse = await processChat(userId, finalText, userProfile);
    
    // Step 2: Generate voice response (if TTS enabled)
    let audioBuffer: Buffer | null = null;
    if (mode === 'full' && chatResponse.response) {
      try {
        audioBuffer = await textToSpeech(chatResponse.response);
      } catch (ttsErr) {
        console.warn('TTS failed, falling back to text-only:', ttsErr);
      }
    }

    // Return response
    if (audioBuffer && mode === 'full') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        text: finalText,
        response: chatResponse.response,
        audioBuffer: audioBuffer.toString('base64'),
        suggest_scan: chatResponse.suggest_scan,
        scan_params: chatResponse.scan_params,
        detected_updates: chatResponse.detected_updates
      });
    }

    return res.status(200).json({
      success: true,
      text: finalText,
      response: chatResponse.response,
      suggest_scan: chatResponse.suggest_scan,
      scan_params: chatResponse.scan_params,
      detected_updates: chatResponse.detected_updates
    });

  } catch (error: any) {
    console.error('SCAI Voice error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur système'
    });
  }
}

// ──────────────────────────────────────────────────────────────
// SPEECH-TO-TEXT (Whisper via Groq)
// ──────────────────────────────────────────────────────────────
async function transcribeAudio(audioData: any): Promise<string> {
  if (GROQ_KEYS.length === 0) {
    throw new Error('Aucune clé Groq configurée (GROQ_API_KEY_1..10)');
  }

  // Handle both base64 and File/Blob
  let audioBlob: Blob;
  if (typeof audioData === 'string' && audioData.startsWith('data:audio')) {
    const base64Data = audioData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    audioBlob = new Blob([buffer], { type: 'audio/webm' });
  } else {
    audioBlob = audioData as Blob;
  }

  // Rotation sur les clés : si l'une est à court de quota (429) ou invalide,
  // on tente la suivante au lieu d'échouer directement.
  let lastError = '';
  for (const key of GROQ_KEYS) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    // Pas de paramètre "language" forcé — Whisper détecte automatiquement
    // parmi ~99 langues. Avant, tout était transcrit comme si c'était du
    // français, ce qui cassait la reconnaissance pour toute autre langue.

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
      },
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      return data.text;
    }
    lastError = `${response.status} ${await response.text()}`;
    // 401/403/429 → clé morte ou saturée, essayer la suivante ; autre
    // statut (ex. 400 audio invalide) → inutile de retenter
    if (![401, 403, 429].includes(response.status)) break;
  }
  throw new Error(`STT failed: ${lastError}`);
}

// Coupe à `max` caractères max, mais à la dernière fin de phrase avant
// cette limite (jamais en plein mot) — avant, un slice(0,500) brut coupait
// SCAI en pleine phrase, ce qui donnait l'impression que l'audio "se coupe".
function truncateAtSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('\n'));
  return lastEnd > max * 0.5 ? cut.slice(0, lastEnd + 1) : cut;
}

// ──────────────────────────────────────────────────────────────
// TEXT-TO-SPEECH (ElevenLabs)
// ──────────────────────────────────────────────────────────────
async function textToSpeech(text: string): Promise<Buffer> {
  if (ELEVENLABS_KEYS.length === 0) {
    throw new Error('Aucune clé ElevenLabs configurée (ELEVENLABS_KEY_1..10)');
  }

  // Rotation sur les clés — chaque compte gratuit ElevenLabs a son propre
  // quota mensuel de caractères ; on passe à la suivante quand l'une est vide.
  let lastError = '';
  for (const key of ELEVENLABS_KEYS) {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': key,
        },
        body: JSON.stringify({
          text: truncateAtSentence(text, 2500), // coupe proprement, pas en plein mot
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    lastError = `${response.status} ${await response.text()}`;
    if (![401, 403, 429].includes(response.status)) break;
  }
  throw new Error(`TTS failed: ${lastError}`);
}

// ──────────────────────────────────────────────────────────────
// CHAT PROCESSING (reuse existing logic)
// ──────────────────────────────────────────────────────────────
async function processChat(userId: string, message: string, userProfile: any = {}) {
  const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const sessionsCollection = await getScaiSessions();

  // Toggle "Mémoire des conversations" (Settings) — désactivé = éphémère
  const learningEnabled = userProfile?.search_preferences?.scai_learning !== false;

  // 1. RÉCUPÉRATION : Chercher le document de l'utilisateur
  const doc = learningEnabled ? await sessionsCollection.findOne({ userId: idPropre }) : null;
  let messages = doc && doc.messages ? doc.messages : (doc && doc.historique ? doc.historique : []);

  if (messages.length === 0 || messages[0].role !== 'system') {
    messages.unshift({ role: 'system', content: genererSystemPrompt(userId, userProfile) });
  } else {
    messages[0].content = genererSystemPrompt(userId, userProfile);
  }

  messages.push({ role: 'user', content: message });

  // 2. ENVOI À GROQ
  const systemMsg = messages[0];
  const echanges = messages.slice(1);
  const fenetreEnvoi = [systemMsg, ...echanges.slice(-6)];

  let reponseSCAI: string;
  try {
    const aiPromise = fetchGroqWithRotation(fenetreEnvoi);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout IA')), 25000)
    );
    reponseSCAI = await Promise.race([aiPromise, timeoutPromise]);
  } catch (aiErr: any) {
    return {
      response: aiErr.message || 'IA indisponible',
      suggest_scan: false,
      scan_params: null,
      detected_updates: {}
    };
  }

  // 3. Parse SCAN_READY token
  let suggest_scan = false;
  let scan_params: any = null;
  let reponseNettoyee = reponseSCAI || '';

  const scanTokenMatch = reponseNettoyee.match(/\[SCAN_READY:(\{[^\]]+\})\]/i);
  if (scanTokenMatch) {
    try {
      scan_params = JSON.parse(scanTokenMatch[1]);
      suggest_scan = true;
      reponseNettoyee = reponseNettoyee.replace(scanTokenMatch[0], '').trim();
    } catch (_) {
      suggest_scan = true;
      reponseNettoyee = reponseNettoyee.replace(scanTokenMatch[0], '').trim();
    }
  }

  messages.push({ role: 'assistant', content: reponseNettoyee });

  if (learningEnabled) await sessionsCollection.updateOne(
    { userId: idPropre },
    {
      $set: {
        messages: messages,
        derniereVue: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        messageCount: messages.filter((m: any) => m.role !== 'system').length,
      }
    },
    { upsert: true }
  );

  return {
    response: reponseNettoyee,
    suggest_scan,
    scan_params,
    detected_updates: {}
  };
}
