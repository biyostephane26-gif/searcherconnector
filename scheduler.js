// =================================================================
// SEARCHER CONNECTOR — SCHEDULER DE SCAN AUTOMATIQUE (paliers par SOURCE)
// =================================================================
// Tourne en tâche de fond dans le même conteneur que le serveur Next.js.
// Scanne UNE FOIS PAR MÉTIER (pas une fois par utilisateur) et alimente
// le cache partagé (cache_opportunities) via /api/cache-scan. Les
// utilisateurs dont le domaine matche sont ensuite notifiés directement.
//
// Paliers par FRÉQUENCE DE REPOST DE LA SOURCE (demandé par le fondateur,
// pas par métier) — chaque palier tourne à sa cadence et le lot par tick
// est dimensionné pour que TOUT le pool du palier soit épuisé en 1h :
//   FAST (10min, 6 ticks/h)     — agrégateurs à très fort volume (job
//                                 boards, RSS tech, communautés)
//   MEDIUM (15min, 4 ticks/h)   — boards ATS d'entreprises + freelance
//   SLOW (30min, 2 ticks/h)     — plateformes de niche
//   VERYSLOW (60min, 1 tick/h)  — stages/exécutif/spécialisé, reposts rares
// Le calcul du lot (pool/ticks_par_heure) vit dans generators.ts
// (pickTierBatch) — ce fichier ne fait que déclencher au bon rythme.
// Toutes les 14 catégories sont passées à chaque tick pour que chaque
// métier profite de chaque palier de sources.
// =================================================================

import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config({ path: '.env.local' });
dotenv.config();

const INTERNAL_URL = process.env.INTERNAL_APP_URL || `http://localhost:${process.env.PORT || 3000}`;

const ALL_CATEGORIES = [
  'dev-engineering', 'design', 'marketing-growth', 'freelance-general', 'sales-bizdev',
  'data-ai', 'product', 'devops-cloud', 'writing-content', 'startup-funding',
  'finance', 'customer-support', 'hr-recruiting', 'admin-office',
];

// ── Rotation pour le scan "humaniste" (LinkedIn/Upwork/Twitter, payant) ──
// 4 catégories par tick de 10min → les 14 sont toutes couvertes en ~35min.
// Distincte de la rotation par PALIER DE SOURCE ci-dessous : les scrapers
// humanistes ne tournent JAMAIS sur les 14 catégories d'un coup, sinon le
// coût API (ScrapingBee/ZenRows/Apify) explose ×3.5.
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

async function runCacheScan(label, sourceTier, useHumanistScrapers = false) {
  try {
    const res = await fetch(`${INTERNAL_URL}/api/cache-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // isPaid: true → couvre aussi les sources premium pour remplir le cache
      // au maximum ; l'affichage gratuit/payant est filtré côté frontend.
      body: JSON.stringify({
        categories: ALL_CATEGORIES, isPaid: true, sourceTier,
        useHumanistScrapers,
        humanistCategories: useHumanistScrapers ? nextHumanistBatch() : undefined,
      }),
      signal: AbortSignal.timeout(180000),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`⏰ [${label}] statut ${res.status} — trouvées: ${data.opportunitiesFound ?? '?'}, ajoutées: ${data.opportunitiesAdded ?? '?'}, matchées: ${data.matched?.matched ?? '?'}, notifiées: ${data.matched?.notified ?? '?'}`);
  } catch (e) {
    console.warn(`⚠️ [${label}] échec:`, e.message);
  }
}

// FAST — 10min, 6×/h → pool entier épuisé en 1h.
// URGENCE 2026-07-24 : scrapers humanistes (LinkedIn/Upwork/Twitter)
// COUPÉS ici — ils tournaient toutes les 10min, 24/7, sur 4 catégories
// en render_js:true (5-10x le coût normal d'un appel ScrapingBee), sans
// aucun rapport avec une vraie demande utilisateur → 98% des crédits
// ScrapingBee consommés en spéculatif. L'accès LinkedIn/Upwork live
// reste disponible à la demande via le scan payant (src/pages/api/scan.ts,
// gated à 5 crédits/scan, déclenché par un vrai clic utilisateur) — c'est
// LE seul chemin qui doit consommer du ScrapingBee tant que le budget
// n'est pas fixé avec le fondateur.
cron.schedule('*/10 * * * *', async () => {
  await runCacheScan('FAST — 10min', 'fast', false);
});

// MEDIUM — 15min, 4×/h → pool entier épuisé en 1h.
cron.schedule('*/15 * * * *', () => runCacheScan('MEDIUM — 15min', 'medium'));

// SLOW — 30min, 2×/h → pool entier épuisé en 1h.
cron.schedule('*/30 * * * *', () => runCacheScan('SLOW — 30min', 'slow'));

// VERYSLOW — 60min, 1×/h → tout le pool en un seul tick.
cron.schedule('0 * * * *', () => runCacheScan('VERYSLOW — 60min', 'veryslow'));

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
