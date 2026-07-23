// =================================================================
// SEARCHER CONNECTOR — OPPORTUNITY CREATOR
// But : Trouver des entreprises qui ont besoin de tes services,
//       les auditer automatiquement, générer un audit + approche
//       personnalisée AVANT d'envoyer le premier message.
//
// FLOW :
//   1. Scan entreprises locales/mondiales via Serper + ScrapingBee
//   2. Audit digital automatique (score 0-100)
//   3. Mockup textuel IA (ce que tu peux améliorer)
//   4. Message d'approche personnalisé prêt à envoyer
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { planTier } from '../../lib/planUtils';
import { planConfig } from '../../lib/planConfig';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SERPER_KEY      = process.env.SERPER_API_KEY      || '';
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_API_KEY || '';
const GROQ_KEYS       = [process.env.GROQ_API_KEY_9, process.env.GROQ_API_KEY_10].filter(Boolean) as string[];
const GEMINI_KEYS     = [process.env.GEMINI_KEY_1, process.env.GEMINI_KEY_2, process.env.GEMINI_KEY_3].filter(k => k?.startsWith('AIzaSy')) as string[];

// ── IA pour génération mockup + message ──────────────────────────
async function callAI(prompt: string): Promise<string> {
  // Essai Groq d'abord
  for (const key of GROQ_KEYS) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', temperature: 0.4, max_tokens: 600,
          messages: [{ role: 'user', content: prompt.slice(0, 1500) }] }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const text = (await r.json()).choices?.[0]?.message?.content || '';
      if (text.length > 20) return text;
    } catch { continue; }
  }
  // Fallback Gemini
  for (const key of GEMINI_KEYS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt.slice(0, 1500) }] }], generationConfig: { maxOutputTokens: 600, temperature: 0.4 } }),
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;
      const text = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text.length > 20) return text;
    } catch { continue; }
  }
  return '';
}

// ── Audit digital d'une entreprise ───────────────────────────────
async function auditCompany(company: any, domain: string): Promise<any> {
  const name    = company.name || company.title || '';
  const website = company.website || company.link || '';
  const snippet = company.snippet || company.description || '';

  // Déterminer ce qui manque (analyse heuristique rapide)
  const issues: string[] = [];
  let score = 100;

  if (!website || website.includes('facebook') || website.includes('google.maps')) {
    issues.push('Pas de site web propre'); score -= 30;
  }
  if (!snippet.includes('contact') && !snippet.includes('email') && !snippet.includes('tel')) {
    issues.push('Contact difficile à trouver'); score -= 10;
  }
  if (!snippet.toLowerCase().includes('instagram') && !snippet.toLowerCase().includes('facebook')) {
    issues.push('Présence réseaux sociaux faible ou inexistante'); score -= 15;
  }
  if (snippet.length < 100) {
    issues.push('Description en ligne très pauvre'); score -= 15;
  }
  if (!snippet.toLowerCase().includes(domain.toLowerCase().split(' ')[0])) {
    issues.push(`Service "${domain}" non mis en avant`); score -= 10;
  }

  score = Math.max(10, score);

  // Estimer le budget potentiel
  const budgetEstimate = score < 40 ? '$200-500/mois' : score < 60 ? '$100-200/mois' : '$50-100/mois';
  const replyChance    = score < 40 ? 'Élevée (80%)' : score < 60 ? 'Moyenne (50%)' : 'Faible (25%)';

  return {
    company_name:    name,
    website:         website,
    digital_score:   score,
    issues_detected: issues,
    budget_estimate: budgetEstimate,
    reply_chance:    replyChance,
    snippet:         snippet,
  };
}

// ── Génération du mockup textuel IA ──────────────────────────────
async function generateMockup(audit: any, userProfile: any): Promise<string> {
  const prompt = `Tu es un expert en marketing digital qui analyse des entreprises.

ENTREPRISE : ${audit.company_name}
Site web : ${audit.website || 'Aucun'}
Score digital : ${audit.digital_score}/100
Problèmes détectés : ${audit.issues_detected.join(', ')}
Description actuelle : "${audit.snippet}"

MON SERVICE : ${userProfile.domain || 'Marketing Digital'}
MON PROFIL : ${userProfile.full_name} — ${userProfile.profile_type}

GÉNÈRE un audit rapide de 1 page en 3 sections :

**🔍 CE QUI MANQUE** (2-3 points concrets)
**🚀 CE QUE JE PROPOSE** (ce que la personne peut faire pour eux)
**📈 RÉSULTAT ATTENDU** (en 30 jours, concret et mesurable)

Maximum 200 mots. Ton : professionnel mais direct. Langue : français.`;

  return await callAI(prompt);
}

// ── Génération du message d'approche ─────────────────────────────
async function generateApproachMessage(audit: any, userProfile: any, mockup: string): Promise<string> {
  const prompt = `Tu es ${userProfile.full_name}, expert en ${userProfile.domain}.

CONTEXTE : Tu as analysé l'entreprise "${audit.company_name}" et tu veux les approcher.
Score digital de l'entreprise : ${audit.digital_score}/100
Problèmes détectés : ${audit.issues_detected.slice(0, 2).join(' et ')}

GÉNÈRE un message d'approche court et percutant :
- Maximum 100 mots
- Commence par "Bonjour [équipe/nom de l'entreprise],"
- Mentionne 1 problème précis que tu as identifié
- Propose une solution concrète
- Inclus : "J'ai préparé un audit rapide de votre présence digitale."
- Termine par : "Disponible sur WhatsApp ou par email.\n\nPowered by Searcher Connector · SCAI"
- Ton : humain, pas robotique. Pas de "je vous contacte pour vous proposer mes services"

Langue : français.`;

  return await callAI(prompt);
}

// ── Recherche entreprises via Serper ─────────────────────────────
async function findCompanies(service: string, zone: string, country: string): Promise<any[]> {
  if (!SERPER_KEY) return [];

  const queries = [
    `entreprises ${country} ${zone === 'local' ? country : 'Afrique'} sans site web ${service}`,
    `small business ${country} looking for ${service} 2025 2026`,
    `site:google.com/maps ${service} ${country}`,
    `entreprise ${country} recrutement ${service} OR "cherche" OR "besoin"`,
  ];

  const results: any[] = [];
  for (const q of queries.slice(0, 3)) {
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, num: 10 }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      // Prendre aussi les résultats locaux Google Maps
      const organic = (d.organic || []).map((x: any) => ({ name: x.title, link: x.link, website: x.link, snippet: x.snippet, source: 'serper' }));
      const local   = (d.localResults || d.places || []).map((x: any) => ({ name: x.title || x.name, link: x.link || '', website: x.website || '', snippet: x.address || x.snippet || '', phone: x.phone || '', source: 'google_maps' }));
      results.push(...organic, ...local);
    } catch { continue; }
  }

  // Dédupliquer par nom
  const seen = new Set<string>();
  return results.filter(r => {
    const k = (r.name || '').toLowerCase().trim().slice(0, 40);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  }).slice(0, 20);
}

// ── HANDLER ───────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId, zone = 'local', limit = 10 } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  const startedAt = Date.now();
  const log: string[] = [];

  try {
    // ── Profil utilisateur ────────────────────────────────────────
    const { data: profile } = await supabaseAdmin.from('users_profiles').select('*').eq('id', userId).single();
    if (!profile) return res.status(404).json({ error: 'Profil introuvable' });

    // ── Quota Opportunity Creator par plan (Pro 3/j · Premium 10/j) ──
    // Free : 0 (réservé aux payants). Le fondateur n'a aucune limite.
    const oc_isFounder = profile.role === 'founder';
    if (!oc_isFounder) {
      const cfg = planConfig(planTier(profile));
      if (cfg.opportunityCreatorPerDay <= 0) {
        return res.status(403).json({ error: 'Opportunity Creator est réservé aux plans payants.', upgrade_url: '/pricing' });
      }
      try {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
        const { count: usedToday } = await supabaseAdmin
          .from('searcher_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('action_type', 'opportunity_creator')
          .gte('created_at', dayStart.toISOString());
        if ((usedToday || 0) >= cfg.opportunityCreatorPerDay) {
          return res.status(429).json({
            error: `Limite Opportunity Creator atteinte (${cfg.opportunityCreatorPerDay}/jour sur le plan ${cfg.label}). Reviens demain.`,
            quota_used: usedToday, quota_limit: cfg.opportunityCreatorPerDay,
          });
        }
      } catch { /* si la table/colonne n'existe pas → on ne bloque pas */ }
    }

    const domain  = profile.domain  || 'Marketing Digital';
    const country = profile.country || 'Cameroun';

    log.push(`🔍 Recherche entreprises pour : ${domain} | Zone: ${zone} | Pays: ${country}`);

    // ── Étape 1 : Trouver les entreprises ─────────────────────────
    const companies = await findCompanies(domain, zone, country);
    log.push(`✅ ${companies.length} entreprises trouvées`);

    // ── Étape 2 : Auditer chaque entreprise ───────────────────────
    const audits = await Promise.all(companies.slice(0, limit).map(c => auditCompany(c, domain)));
    // Trier par score numérique (les plus faibles = plus besoin d'aide = meilleure opportunité)
    audits.sort((a, b) => a.digital_score - b.digital_score);
    log.push(`📊 ${audits.length} audits générés`);

    // ── Étape 3 : Générer mockup + message pour les 5 meilleures ──
    const topTargets = audits.slice(0, 5);
    const enriched = await Promise.all(topTargets.map(async (audit) => {
      const [mockup, message] = await Promise.all([
        generateMockup(audit, profile),
        generateApproachMessage(audit, profile, ''),
      ]);
      return { ...audit, mockup_textuel: mockup, message_approche: message };
    }));

    log.push(`✉️ ${enriched.length} messages d'approche générés`);

    // ── Étape 4 : Sauvegarder dans searcher_logs ──────────────────
    try {
      await supabaseAdmin.from('searcher_logs').insert({
        user_id:      userId,
        action_type:  'opportunity_creator',
        description:  `${companies.length} entreprises scannées, ${enriched.length} opportunités préparées pour ${domain}`,
        platform:     'Opportunity Creator',
        result:       `Score moyen : ${Math.round(audits.reduce((a, b) => a + b.digital_score, 0) / audits.length)}/100`,
        auto_promo_sent: true,
      });
    } catch (_) {}

    return res.status(200).json({
      success:          true,
      domain,
      zone,
      total_found:      companies.length,
      total_audited:    audits.length,
      top_targets:      enriched,       // 5 meilleures avec mockup + message
      all_audits:       audits,         // tous les audits sans mockup
      log,
      execution_ms:     Date.now() - startedAt,
    });

  } catch (error: any) {
    return res.status(500).json({ error: 'Erreur interne', detail: error.message });
  }
}
