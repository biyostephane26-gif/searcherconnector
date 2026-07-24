// =================================================================
// SEARCHER CONNECTOR — SCHEDULER DE SCAN AUTOMATIQUE (paliers)
// =================================================================
// Tourne en tâche de fond dans le même conteneur que le serveur Next.js.
// Scanne UNE FOIS PAR MÉTIER (pas une fois par utilisateur) et alimente
// le cache partagé (cache_opportunities) via /api/cache-scan. Les
// utilisateurs dont le domaine matche sont ensuite notifiés directement
// (voir matchAndNotify côté API) — plus besoin d'appeler les APIs de
// scraping à chaque recherche individuelle : ça économise les crédits.
//
// Deux dimensions de fréquence, indépendantes :
//  1) BRÉADTH (fetchAllSources — API/RSS/site: — peu coûteux grâce au
//     cache par URL) : chaque catégorie a un palier 10/30/60min selon
//     son intensité d'offres.
//  2) HUMANISTE (ScrapingBee/ZenRows/Apify — coûteux) : TOUTES les 14
//     catégories tournent dessus, 4 par tick de 10min, donc chaque
//     métier en bénéficie environ toutes les 35 min — pas seulement
//     un sous-ensemble fixe, comme demandé.
// =================================================================

import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config({ path: '.env.local' });
dotenv.config();

const INTERNAL_URL = process.env.INTERNAL_APP_URL || `http://localhost:${process.env.PORT || 3000}`;

// ── Paliers de fréquence pour le scan "large" (sources API/RSS/site:) ──
const TIER_1_CATEGORIES = ['dev-engineering', 'design', 'marketing-growth', 'freelance-general', 'sales-bizdev'];
const TIER_2_CATEGORIES = ['data-ai', 'product', 'devops-cloud', 'writing-content', 'startup-funding'];
const TIER_3_CATEGORIES = ['finance', 'customer-support', 'hr-recruiting', 'admin-office'];
const ALL_CATEGORIES = [...TIER_1_CATEGORIES, ...TIER_2_CATEGORIES, ...TIER_3_CATEGORIES];

// ── Rotation pour le scan "humaniste" (LinkedIn/Upwork/Twitter) ──────
// 4 catégories par tick de 10min → les 14 sont toutes couvertes en ~35min
const HUMANIST_BATCH_SIZE = 4;
let humanistRotationIndex = 0;
function nextHumanistBatch() {
  const batch = [];
  for (let i = 0; i < HUMANIST_BATCH_SIZE; i++) {
    batch.push(ALL_CATEGORIES[humanistRotationIndex % ALL_CATEGORIES.length]);
    humanistRotationIndex++;
  }
  return batch;
}

async function runCacheScan(label, categories, useHumanistScrapers = false) {
  try {
    const res = await fetch(`${INTERNAL_URL}/api/cache-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // isPaid: true → couvre aussi les sources premium pour remplir le cache
      // au maximum ; l'affichage gratuit/payant est filtré côté frontend.
      body: JSON.stringify({ categories, isPaid: true, useHumanistScrapers }),
      signal: AbortSignal.timeout(180000),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`⏰ [${label}] (${categories.join(', ')}) statut ${res.status} — trouvées: ${data.opportunitiesFound ?? '?'}, ajoutées: ${data.opportunitiesAdded ?? '?'}, matchées: ${data.matched?.matched ?? '?'}, notifiées: ${data.matched?.notified ?? '?'}`);
  } catch (e) {
    console.warn(`⚠️ [${label}] échec:`, e.message);
  }
}

// TIER 1 — breadth toutes les 10 minutes + rotation humaniste (4 catégories, toutes couvertes en rotation)
cron.schedule('*/10 * * * *', async () => {
  await runCacheScan('TIER 1 — 10min', TIER_1_CATEGORIES);
  await runCacheScan('HUMANISTE — rotation', nextHumanistBatch(), true);
});

// TIER 2 — breadth toutes les 30 minutes
cron.schedule('*/30 * * * *', () => runCacheScan('TIER 2 — 30min', TIER_2_CATEGORIES));

// TIER 3 — breadth toutes les 60 minutes
cron.schedule('0 * * * *', () => runCacheScan('TIER 3 — 60min', TIER_3_CATEGORIES));

// ── Rapport hebdomadaire par email ────────────────────────────────
// Route déjà écrite (app/api/cron/weekly-report) mais pensée pour Vercel
// Cron — jamais déclenchée sur Render. On l'appelle nous-mêmes ici.
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';
async function runWeeklyReport() {
  try {
    const res = await fetch(`${INTERNAL_URL}/api/cron/weekly-report`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`📧 [Rapport hebdo] statut ${res.status} —`, JSON.stringify(data).slice(0, 200));
  } catch (e) {
    console.warn('⚠️ [Rapport hebdo] échec:', e.message);
  }
}
// Tous les lundis à 09:00
cron.schedule('0 9 * * 1', runWeeklyReport);

// ── Réception Gmail (polling — gratuit, pas de Pub/Sub) ────────────
async function runGmailPoll() {
  try {
    const res = await fetch(`${INTERNAL_URL}/api/webhooks/gmail-poll`, {
      method: 'POST',
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`📬 [Gmail poll] statut ${res.status} — comptes vérifiés: ${data.checked ?? '?'}, nouveaux messages: ${data.newMessages ?? '?'}`);
  } catch (e) {
    console.warn('⚠️ [Gmail poll] échec:', e.message);
  }
}
// Toutes les 15 minutes — inutile de faire plus fréquent, ce n'est pas
// du temps réel critique comme les opportunités.
cron.schedule('*/15 * * * *', runGmailPoll);

// ── Nettoyage du cache d'opportunités ───────────────────────────────
// cleanupExpiredOpportunities() existait dans cache-manager.ts mais
// n'était jamais appelée — les vieilles opportunités ne disparaissaient
// jamais (is_expired restait à false indéfiniment).
async function runCacheCleanup() {
  try {
    const res = await fetch(`${INTERNAL_URL}/api/cron/cache-cleanup`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`🧹 [Nettoyage cache] statut ${res.status} — expirées: ${data.expiredCount ?? '?'}`);
  } catch (e) {
    console.warn('⚠️ [Nettoyage cache] échec:', e.message);
  }
}
// Toutes les heures
cron.schedule('0 * * * *', runCacheCleanup);

// ── Retour automatique au plan Free à l'expiration ──────────────────
// Complète l'activation manuelle de plan côté dashboard Founder
// (essai temporaire / paiement manuel limité dans le temps).
async function runPlanExpiryCheck() {
  try {
    const res = await fetch(`${INTERNAL_URL}/api/cron/plan-expiry-check`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`⏳ [Expiration plans] statut ${res.status} — revenus en Free: ${data.revertedCount ?? '?'}`);
  } catch (e) {
    console.warn('⚠️ [Expiration plans] échec:', e.message);
  }
}
// Toutes les heures
cron.schedule('0 * * * *', runPlanExpiryCheck);

// ── Reset QUOTIDIEN des crédits SCAI (voix + scraping live) ─────────
// Recharge les crédits selon le plan chaque jour à 00:05 (Free 5 · Pro 30
// · Premium 100) — anti-abus (plafond quotidien) sans blocage définitif.
async function runVoiceCreditsReset() {
  try {
    const res = await fetch(`${INTERNAL_URL}/api/cron/reset-voice-credits`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`🎙️ [Reset crédits SCAI] statut ${res.status} — comptes rechargés: ${data.accountsReset ?? '?'}`);
  } catch (e) {
    console.warn('⚠️ [Reset crédits SCAI] échec:', e.message);
  }
}
// Chaque jour à 00:05
cron.schedule('5 0 * * *', runVoiceCreditsReset);

// ── Anti-veille (Render free tier) ──────────────────────────────────
// Render endort le service après ~15min sans requête entrante → le
// premier visiteur attend ~15s de réveil, ce qui ressemble à "rien ne
// s'affiche". Ce ping garde le service actif tant qu'il tourne déjà.
// Complément : un ping EXTERNE (UptimeRobot) est nécessaire en plus,
// car si le service dort déjà, ce ping interne dort avec lui et ne
// peut pas se réveiller tout seul.
const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || process.env.NEXT_PUBLIC_APP_URL || '';
async function runSelfPing() {
  if (!PUBLIC_URL) return;
  try {
    const res = await fetch(PUBLIC_URL, { signal: AbortSignal.timeout(15000) });
    console.log(`💓 [Anti-veille] ping ${PUBLIC_URL} → statut ${res.status}`);
  } catch (e) {
    console.warn('⚠️ [Anti-veille] échec ping:', e.message);
  }
}
cron.schedule('*/10 * * * *', runSelfPing);

console.log('🚀 Scheduler démarré : scan 10/30/60min, rotation humaniste ~35min, rapport hebdo lundi 9h, polling Gmail 15min, nettoyage cache 1h, expiration plans 1h, reset crédits SCAI quotidien.');
