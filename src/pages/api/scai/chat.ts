import { NextApiRequest, NextApiResponse } from 'next';
import { getScaiSessions } from '../../../lib/mongo';
import { fetchGroqWithRotation, fetchGeminiVision, genererSystemPrompt } from '../../../lib/scaiUtils';
import { checkRateLimit } from '../../../lib/rateLimiter';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Une image collée/envoyée dans le chat en base64 dépasse vite la limite
// par défaut (1 Mo) du body parser des routes Pages Router.
export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, message, userProfile = {}, image, conversationId: rawConvId } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: "userId et message sont requis." });
    }
    // "default" pour la rétrocompatibilité — anciens clients qui
    // n'envoient pas encore conversationId retombent sur l'unique
    // conversation historique de l'utilisateur, jamais perdue.
    const conversationId = String(rawConvId || 'default').slice(0, 100);
    // Image collée/envoyée dans le chat (data URL) — limite raisonnable
    // côté requête pour ne pas saturer le body parser par défaut de Next.
    if (image && typeof image === 'string' && image.length > 8_000_000) {
      return res.status(413).json({ error: 'Image trop lourde (max ~6 Mo).' });
    }

    // Anti-spam : 20 messages / minute max par utilisateur (protège les clés Groq/Gemini)
    if (!checkRateLimit(`scai-chat:${userId}`, 20, 60_000)) {
      return res.status(429).json({ error: 'Trop de messages envoyés. Attends quelques secondes.' });
    }

    const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const sessionsCollection = await getScaiSessions();

    // Contexte live (best-effort, jamais bloquant) : donne à SCAI une vraie
    // photo de l'état de l'utilisateur plutôt que le seul profil statique —
    // condition nécessaire pour qu'il personnalise vraiment ses réponses.
    try {
      const [{ count: opportunitiesCount }, { count: pendingApplications }, { count: readyToSendCount }] = await Promise.race([
        Promise.all([
          supabaseAdmin.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabaseAdmin.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending_action'),
          supabaseAdmin.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'ready_to_send'),
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout contexte live')), 2500)),
      ]) as any;
      userProfile.opportunitiesCount  = opportunitiesCount ?? null;
      userProfile.pendingApplications = pendingApplications ?? null;
      userProfile.readyToSendCount    = readyToSendCount ?? null;
    } catch { /* SCAI répond quand même sans ce contexte plutôt que de bloquer */ }

    // Toggle "Apprentissage SCAI" (Settings) — désactivé = conversation
    // éphémère, pas d'historique chargé ni sauvegardé (confidentialité réelle).
    const learningEnabled = userProfile?.search_preferences?.scai_learning !== false;

    // 1. RÉCUPÉRATION : Chercher le document de CETTE conversation (un
    // utilisateur peut avoir plusieurs conversations en parallèle, comme
    // "Nouveau" dans Cowork — jamais un seul document par utilisateur).
    let doc = learningEnabled ? await sessionsCollection.findOne({ userId: idPropre, conversationId }) : null;
    // Migration douce : avant le multi-conversation, un utilisateur n'avait
    // qu'un seul document (sans conversationId). Le premier accès à
    // "default" retrouve cet historique existant plutôt que de le rendre
    // invisible — la mise à jour plus bas lui ajoute conversationId.
    if (!doc && learningEnabled && conversationId === 'default') {
      doc = await sessionsCollection.findOne({ userId: idPropre, conversationId: { $exists: false } });
    }
    const isNewConversation = !doc;

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

    // 3. PRÉPARATION DE LA FENÊTRE D'ENVOI (System + historique récent)
    // Avant : seulement les 6 derniers messages, quelle que soit la
    // longueur réelle de la conversation — SCAI "oubliait" et redemandait
    // les mêmes infos après 2-3 échanges. On prend maintenant autant de
    // messages récents que le budget de caractères le permet (~12000
    // caractères ≈ 3000-4000 tokens, largement dans la fenêtre de
    // contexte de gpt-oss-120b/Gemini), plafonné à 60 messages pour
    // éviter un cas pathologique (messages énormes en rafale).
    const systemMsg = messages[0];
    const echanges = messages.slice(1);
    const MAX_CONTEXT_CHARS = 12000;
    const MAX_CONTEXT_MESSAGES = 60;
    const fenetreMessages: typeof echanges = [];
    let charBudget = MAX_CONTEXT_CHARS;
    for (let i = echanges.length - 1; i >= 0 && fenetreMessages.length < MAX_CONTEXT_MESSAGES; i--) {
      const len = (echanges[i]?.content || '').length;
      if (fenetreMessages.length > 0 && charBudget - len < 0) break;
      charBudget -= len;
      fenetreMessages.unshift(echanges[i]);
    }
    const fenetreEnvoi = [systemMsg, ...fenetreMessages];

    // 4. ENVOI À GROQ avec fallback Gemini automatique
    // (ou analyse Gemini Vision directement si une image accompagne le message —
    // Groq ne traite pas d'images sur ce modèle)
    // Timeout de 30s sur l'appel IA pour ne pas bloquer le serveur
    let reponseSCAI: string
    try {
      const aiPromise = (image && typeof image === 'string')
        ? fetchGeminiVision(fenetreEnvoi, image)
        : fetchGroqWithRotation(fenetreEnvoi)
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

    // ── Détecter le token [TOOL_READY:{...}] — SCAI demande un vrai outil
    // (PDF/Excel/Word/image/vidéo/prospection) au lieu d'halluciner un résultat ──
    let tool_call: { tool: string; prompt: string } | null = null;
    const toolTokenMatch = reponseNettoyee.match(/\[TOOL_READY:(\{[^\]]+\})\]/i);
    if (toolTokenMatch) {
      try {
        const parsed = JSON.parse(toolTokenMatch[1]);
        const validTools = ['pdf', 'excel', 'word', 'image', 'video', 'opportunity'];
        if (validTools.includes(parsed.tool) && typeof parsed.prompt === 'string') {
          tool_call = { tool: parsed.tool, prompt: parsed.prompt };
        }
      } catch (_) { /* token malformé — on ignore, pas d'outil déclenché */ }
      reponseNettoyee = reponseNettoyee.replace(toolTokenMatch[0], '').trim();
    }

    // ── Détecter le token [PLAN_READY:{...}] — SCAI planifie plusieurs
    // actions réelles enchaînées, exécutées en arrière-plan par le
    // scheduler (cowork_tasks), même après fermeture de la conversation ──
    let plan_created: { id: string; title: string } | null = null;
    const planTokenMatch = reponseNettoyee.match(/\[PLAN_READY:(\{[\s\S]+\})\]/i);
    if (planTokenMatch) {
      try {
        const parsed = JSON.parse(planTokenMatch[1]);
        const validTools = ['pdf', 'excel', 'word', 'image', 'video', 'scan', 'opportunity'];
        const steps = Array.isArray(parsed.steps)
          ? parsed.steps.filter((s: any) => validTools.includes(s?.tool) && typeof s?.prompt === 'string').map((s: any) => ({ tool: s.tool, prompt: s.prompt, status: 'pending' }))
          : [];
        if (steps.length > 0) {
          const title = String(parsed.title || 'Tâche SCAI').slice(0, 150);
          const { data: task } = await supabaseAdmin
            .from('cowork_tasks')
            .insert({ user_id: userId, title, steps, current_step: 0, status: 'running' })
            .select('id, title').single();
          if (task) plan_created = { id: task.id, title: task.title };
        }
      } catch (_) { /* token malformé — pas de plan créé */ }
      reponseNettoyee = reponseNettoyee.replace(planTokenMatch[0], '').trim();
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

    // 6. SAUVEGARDE — historique PERMANENT de CETTE conversation, jamais
    // effacé (on garde tout, pas de limite de taille). Le filtre cible le
    // document exact (par _id si trouvé via la migration "default", sinon
    // par userId+conversationId) — l'ancien filtre {userId} seul aurait
    // fusionné toutes les conversations d'un même utilisateur en une
    // seule, ce qui est exactement le bug que le multi-conversation
    // corrige (sauf si l'utilisateur a désactivé "Apprentissage SCAI").
    if (learningEnabled) {
      const filter = doc?._id ? { _id: doc._id } : { userId: idPropre, conversationId };
      const title = doc?.title || message.trim().slice(0, 60) || 'Nouvelle discussion';
      await sessionsCollection.updateOne(
        filter,
        {
          $set: {
            userId: idPropre,
            conversationId,
            title,
            messages: messages,
            derniereVue: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            messageCount: messages.filter((m: any) => m.role !== 'system').length,
          },
          $setOnInsert: { createdAt: new Date().toISOString() },
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
      tool_call,            // { tool, prompt } — le client déclenche le vrai outil (PDF/image/vidéo/…) si présent
      plan_created,         // { id, title } — tâche multi-étapes créée, exécutée en arrière-plan (cowork_tasks)
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
