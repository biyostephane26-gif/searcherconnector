import { NextApiRequest, NextApiResponse } from 'next';
import { getScaiSessions } from '../../../lib/mongo';
import { fetchGroqWithRotation, genererSystemPrompt } from '../../../lib/scaiUtils';
import { checkRateLimit } from '../../../lib/rateLimiter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, message, userProfile = {} } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: "userId et message sont requis." });
    }

    // Anti-spam : 20 messages / minute max par utilisateur (protège les clés Groq/Gemini)
    if (!checkRateLimit(`scai-chat:${userId}`, 20, 60_000)) {
      return res.status(429).json({ error: 'Trop de messages envoyés. Attends quelques secondes.' });
    }

    const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const sessionsCollection = await getScaiSessions();

    // Toggle "Apprentissage SCAI" (Settings) — désactivé = conversation
    // éphémère, pas d'historique chargé ni sauvegardé (confidentialité réelle).
    const learningEnabled = userProfile?.search_preferences?.scai_learning !== false;

    // 1. RÉCUPÉRATION : Chercher le document de l'utilisateur
    const doc = learningEnabled ? await sessionsCollection.findOne({ userId: idPropre }) : null;

    // Récupérer le tableau 'messages' (ou 'historique' pour rétrocompatibilité), sinon initialiser à vide
    let messages = doc && doc.messages ? doc.messages : (doc && doc.historique ? doc.historique : []);

    // S'assurer que le prompt système est toujours présent au début
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({ role: 'system', content: genererSystemPrompt(userId, userProfile) });
    } else {
      // Mettre à jour le prompt système avec les instructions les plus récentes
      messages[0].content = genererSystemPrompt(userId, userProfile);
    }

    // 2. AJOUT DU MESSAGE USER
    messages.push({ role: 'user', content: message });

    // 3. PRÉPARATION DE LA FENÊTRE D'ENVOI (System + 6 derniers messages)
    const systemMsg = messages[0];
    const echanges = messages.slice(1);
    const fenetreEnvoi = [
      systemMsg,
      ...echanges.slice(-6)
    ];

    // 4. ENVOI À GROQ avec fallback Gemini automatique
    // Timeout de 30s sur l'appel IA pour ne pas bloquer le serveur
    let reponseSCAI: string
    try {
      const aiPromise = fetchGroqWithRotation(fenetreEnvoi)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout IA — les moteurs ont pris trop de temps. Réessaie.')), 30000)
      )
      reponseSCAI = await Promise.race([aiPromise, timeoutPromise])
    } catch (aiErr: any) {
      // Retourner l'erreur IA directement au client — pas un 500 opaque
      return res.status(200).json({
        success: false,
        error: aiErr.message || 'IA indisponible',
        response: aiErr.message || 'Les moteurs IA sont temporairement saturés. Réessaie dans 1 minute.',
        suggest_scan: false,
        scan_params: null,
        detected_updates: {},
      })
    }

    // ── Détecter le token [SCAN_READY:{...}] dans la réponse SCAI ──
    // SCAI pose ses questions et quand il a tout, il émet ce token.
    // On l'intercepte ici pour le renvoyer au client proprement.
    let suggest_scan = false;
    let scan_params: any = null;
    let reponseNettoyee = reponseSCAI || '';

    const scanTokenMatch = reponseNettoyee.match(/\[SCAN_READY:(\{[^\]]+\})\]/i);
    if (scanTokenMatch) {
      try {
        scan_params = JSON.parse(scanTokenMatch[1]);
        suggest_scan = true;
        // Retirer le token brut de la réponse affichée à l'utilisateur
        reponseNettoyee = reponseNettoyee.replace(scanTokenMatch[0], '').trim();
      } catch (_) {
        // Si le JSON est malformé, on ignore mais on détecte quand même l'intention
        suggest_scan = true;
        reponseNettoyee = reponseNettoyee.replace(scanTokenMatch[0], '').trim();
      }
    }

    // Détection de fallback : si l'utilisateur lui-même demande le scan explicitement
    const messageLower = message.toLowerCase();
    const userForceScan = messageLower.includes('lance le scan') 
      || messageLower.includes('lance un scan') 
      || messageLower.includes('go scan')
      || messageLower.includes('oui lance')
      || messageLower.includes('vas-y lance');
    if (userForceScan && !suggest_scan) {
      suggest_scan = true;
    }

    // ── Détecter les mises à jour de profil suggérées par SCAI ──
    // SCAI peut demander des infos et l'utilisateur répond → on détecte
    const detected_updates: any = {};
    const msgLower = message.toLowerCase();
    
    // Détecter domaine mentionné par l'utilisateur
    if (!userProfile.domain && msgLower.length > 2 && !msgLower.includes('?')) {
      // Heuristique simple : si le message est court et ressemble à un domaine
      const domainKeywords = ['développeur','developer','designer','marketing','sales','finance','data','devops','freelance','consultant'];
      for (const kw of domainKeywords) {
        if (msgLower.includes(kw)) {
          detected_updates.domain = message.trim().slice(0, 100);
          break;
        }
      }
    }

    // Détecter zone confirmée
    if (msgLower.includes('local') || msgLower.includes('cameroun') || msgLower.includes('afrique') || msgLower.includes('africa')) {
      detected_updates.last_search_zone = msgLower.includes('mondial') || msgLower.includes('worldwide') ? 'worldwide' : msgLower.includes('afrique') || msgLower.includes('africa') ? 'continental' : 'local';
    }

    // 5. AJOUT DE LA RÉPONSE IA (version nettoyée sans le token)
    messages.push({ role: 'assistant', content: reponseNettoyee });

    // 6. SAUVEGARDE GLOBALE — historique PERMANENT, jamais effacé
    // On garde TOUT l'historique — pas de limite de taille
    // L'utilisateur peut retrouver ses conversations les plus anciennes
    // (sauf si l'utilisateur a désactivé "Apprentissage SCAI" dans Settings)
    if (learningEnabled) {
      await sessionsCollection.updateOne(
        { userId: idPropre },
        {
          $set: {
            messages: messages,
            derniereVue: new Date().toISOString(),
            // Méta pour le monitoring
            lastActive: new Date().toISOString(),
            messageCount: messages.filter((m: any) => m.role !== 'system').length,
          }
        },
        { upsert: true }
      );
    }

    return res.status(200).json({ 
      success: true, 
      response: reponseNettoyee,
      suggest_scan,
      scan_params,          // { zone, has_budget, profile_type, domain } — le client l'utilise pour lancer le scan
      detected_updates,     // mises à jour de profil détectées dans le message utilisateur
    });
  } catch (err: any) {
    const errMsg = err?.message || 'Erreur inconnue'
    // Log local en dev
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = require('fs')
        fs.appendFileSync('chat-error.log', new Date().toISOString() + ' ' + (err.stack || errMsg) + '\n')
      } catch { /* ignore */ }
    }
    // Retourner 200 avec le message d'erreur — pas un 500 opaque
    // Comme ça le client peut l'afficher proprement dans le chat
    return res.status(200).json({
      success: false,
      error: errMsg,
      response: errMsg.includes('MONGODB') || errMsg.includes('mongo')
        ? 'Problème de connexion à la mémoire. Réessaie dans quelques secondes.'
        : `Erreur : ${errMsg.slice(0, 200)}`,
      suggest_scan: false,
      scan_params: null,
      detected_updates: {},
    })
  }
}
