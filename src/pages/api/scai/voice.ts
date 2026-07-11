import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getScaiSessions, fetchGroqWithRotation, genererSystemPrompt } from '../../../lib/scaiUtils';

// Configuration des clients
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default: Rachel
const GROQ_API_KEY = process.env.GROQ_API_KEY;

type VoiceResponse = {
  success: boolean;
  text?: string;
  audioUrl?: string;
  audioBuffer?: Buffer;
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
      return res.status(200).send(audioBuffer);
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
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
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

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'fr'); // French by default, can be auto-detected

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`STT failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.text;
}

// ──────────────────────────────────────────────────────────────
// TEXT-TO-SPEECH (ElevenLabs)
// ──────────────────────────────────────────────────────────────
async function textToSpeech(text: string): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text.slice(0, 500), // Limit to prevent very long audio
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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`TTS failed: ${response.status} ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ──────────────────────────────────────────────────────────────
// CHAT PROCESSING (reuse existing logic)
// ──────────────────────────────────────────────────────────────
async function processChat(userId: string, message: string, userProfile: any = {}) {
  const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const sessionsCollection = await getScaiSessions();

  // 1. RÉCUPÉRATION : Chercher le document de l'utilisateur
  let doc = await sessionsCollection.findOne({ userId: idPropre });
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

  await sessionsCollection.updateOne(
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
