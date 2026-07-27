// =================================================================
// SEARCHER CONNECTOR — GÉNÉRATEURS GÉNÉRIQUES (300+ ACTEURS TEMPS RÉEL)
// =================================================================
// Ces fonctions génériques traitent TOUTES nos 300+ sources,
// filtrent les résultats à < 24h, et évitent les blocages !

import { FREELANCE_PLATFORMS_CURATED } from './massive-sources';

type SourceEntry = { name: string; type: string; url: string; isPaidOnly: boolean; category?: SourceCategory };

// Catégorie de CONTRAT typique de la source (pas du contenu individuel) —
// utilisée pour l'exclusion dure freelance-vs-CDI par source plutôt que par
// mots-clés dans le texte scrapé (souvent trop court pour contenir un
// marqueur fiable). Voir isSourceCategoryMismatch dans typeSignals.ts.
export type SourceCategory = 'job' | 'freelance' | 'mixed';

function tagCategory<T extends { name: string; type?: string; url: string; isPaidOnly: boolean }>(
  arr: T[], category: SourceCategory
): SourceEntry[] {
  return arr.map(s => ({ name: s.name, type: s.type || 'browser', url: s.url, isPaidOnly: s.isPaidOnly, category }));
}

// Total de sources CONFIGURÉES — depuis le passage freelance-only
// (2026-07-27), ne compte plus que le registre curé (~93 plateformes
// freelance vérifiées), les ~2000 sources job/CDI génériques ayant été
// retirées du pipeline actif (voir FREELANCE_PLATFORMS_CURATED dans
// massive-sources.ts).
export const TOTAL_CONFIGURED_SOURCES = FREELANCE_PLATFORMS_CURATED.length;

// Bufferise les échecs/succès de sources pour que l'appelant (cache-scan)
// les persiste après le scan — generators.ts reste indépendant de la
// couche DB, pas de client Supabase ici.
type SourceOutcome = { name: string; ok: boolean; error?: string };
let outcomeBuffer: SourceOutcome[] = [];
export function drainSourceHealthBuffer(): SourceOutcome[] {
  const buf = outcomeBuffer;
  outcomeBuffer = [];
  return buf;
}
function recordOutcome(name: string | undefined, ok: boolean, error?: string) {
  if (!name) return;
  outcomeBuffer.push({ name, ok, error });
}

export const TOTAL_CONFIGURED_PAID_SOURCES =
  FREELANCE_PLATFORMS_CURATED.filter(s => s.isPaidOnly).length;

// 🚦 Rate Limiting par domaine pour éviter les blocages
const lastRequestPerDomain = new Map<string, number>();
const MIN_DELAY_PER_DOMAIN = 1000; // Minimum 1s entre chaque requête au même domaine

async function rateLimitForDomain(domain: string) {
  const now = Date.now();
  const lastRequest = lastRequestPerDomain.get(domain) || 0;
  const timeSinceLastRequest = now - lastRequest;
  if (timeSinceLastRequest < MIN_DELAY_PER_DOMAIN) {
    const delayToWait = MIN_DELAY_PER_DOMAIN - timeSinceLastRequest;
    await new Promise(r => setTimeout(r, delayToWait));
  }
  lastRequestPerDomain.set(domain, Date.now());
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

// User-Agent random pour éviter les bans
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36'
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 📅 Vérifie si une date est moins vieille que X heures
function isDateFreshEnough(dateStr: string | number | Date, maxHours: number = 24): boolean {
  if (!dateStr) return true; // Si pas de date, on garde (mieux que rien !)
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return true;
  const now = Date.now();
  const ageInMs = now - date.getTime();
  const ageInHours = ageInMs / (1000 * 60 * 60);
  return ageInHours <= maxHours;
}

// =================================================================
// CACHE DE RÉPONSE BRUTE — par URL seule (pas par URL+mot-clé)
// =================================================================
// Une même source (RSS/API) est appelée UNE SEULE FOIS par cycle de scan
// même si on la interroge pour 14 métiers différents : on met en cache
// la réponse brute (10 min, aligné sur la cadence du palier le plus
// rapide) et on refiltre en mémoire pour chaque catégorie — zéro appel
// réseau supplémentaire.
const rawResponseCacheTTLMs = 10 * 60 * 1000;
const rawResponseCache = new Map<string, { at: number; data: any }>();

async function fetchRawCached(url: string, kind: 'json' | 'text'): Promise<any> {
  const cached = rawResponseCache.get(url);
  if (cached && Date.now() - cached.at < rawResponseCacheTTLMs) return cached.data;

  const domain = getDomainFromUrl(url);
  await rateLimitForDomain(domain);
  const r = await fetch(url, {
    headers: { 'User-Agent': randomUserAgent(), Accept: kind === 'json' ? 'application/json' : 'application/rss+xml,application/xml' },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = kind === 'json' ? await r.json() : await r.text();
  rawResponseCache.set(url, { at: Date.now(), data });
  return data;
}

// =================================================================
// GÉNÉRATEUR 1 — TRAITEMENT DES APIs GÉNÉRIQUES
// =================================================================
export async function fetchGenericAPI(url: string, keyword: string, isPaidOnly: boolean = false, sourceName?: string): Promise<any[]> {
  try {
    const data = await fetchRawCached(url, 'json');
    const results = parseGenericAPIData(data, keyword, isPaidOnly);
    // Fetch + parse réussis = la source répond, indépendamment du nombre
    // de résultats matchés ce tour-ci (mot-clé absent ce cycle ≠ source cassée).
    recordOutcome(sourceName, true);
    // 🚨 FILTRER TEMPS RÉEL : GARDER SEULEMENT < 24h !
    return results.filter(item => isDateFreshEnough(item.date));
  } catch (e) {
    recordOutcome(sourceName, false, (e as any)?.message);
    console.warn(`[API] Erreur ${url}:`, (e as any)?.message);
    return [];
  }
}

function parseGenericAPIData(data: any, keyword: string, isPaidOnly: boolean): any[] {
  const results: any[] = [];
  const kw = keyword.toLowerCase();
  
  // Essayer différents chemins de données courants
  const possibleArrays = [
    data.data, data.jobs, data.items, data.results, data.offers,
    data.list, data.entries, data.posts, data.articles,
    data // Si c'est déjà un array
  ];

  for (const arr of possibleArrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      // 200 (pas 20) : la réponse est maintenant mise en cache par URL,
      // donc regarder plus d'items ne coûte rien en réseau — important
      // puisqu'une même réponse est refiltrée pour 14 métiers différents.
      for (const item of arr.slice(0, 200)) {
        const title = item.title || item.jobTitle || item.name || '';
        const company = item.company || item.companyName || item.employer || '';
        const location = item.location || item.city || '';
        const link = item.link || item.url || item.applicationLink || item.redirect_url || '';
        const snippet = item.snippet || item.description || item.summary || item.body || title;
        const date = item.date || item.created_at || item.publishedAt || item.created || item.pubDate || item.published_date || '';
        const applicantsRaw = item.applicants_count ?? item.applicantsCount ?? item.num_applicants ?? item.applicants;
        const applicants_count = typeof applicantsRaw === 'number' ? applicantsRaw : undefined;

        // Filtrer par keyword
        const haystack = `${title} ${snippet} ${company}`.toLowerCase();
        if (haystack.includes(kw)) {
          results.push({
            title: String(title).slice(0, 200),
            company: String(company),
            location: String(location),
            link: String(link),
            snippet: String(snippet).replace(/<[^>]+>/g, '').slice(0, 300),
            date,
            applicants_count,
            source: 'generic-api',
            isPremium: isPaidOnly
          });
        }
      }
      if (results.length > 0) break;
    }
  }
  return results;
}

// =================================================================
// GÉNÉRATEUR 2 — TRAITEMENT DES RSS FEEDS (TEMPS RÉEL)
// =================================================================
export async function fetchGenericRSS(url: string, keyword: string, isPaidOnly: boolean = false, sourceName?: string): Promise<any[]> {
  try {
    const text = await fetchRawCached(url, 'text');
    const results = parseGenericRSS(text, keyword, url, isPaidOnly);
    recordOutcome(sourceName, true);
    // 🚨 FILTRER TEMPS RÉEL : GARDER SEULEMENT < 24h !
    return results.filter(item => isDateFreshEnough(item.date));
  } catch (e) {
    recordOutcome(sourceName, false, (e as any)?.message);
    console.warn(`[RSS] Erreur ${url}:`, (e as any)?.message);
    return [];
  }
}

function parseGenericRSS(xmlText: string, keyword: string, sourceUrl: string, isPaidOnly: boolean): any[] {
  const results: any[] = [];
  const kw = keyword.toLowerCase();
  
  // Parser simple (pas besoin de lib externe)
  const items = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || 
                xmlText.match(/<entry[^>]*>([\s\S]*?)<\/entry>/gi) || [];
  
  for (const item of items.slice(0, 200)) {
    const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '');
    const link = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || 
                  item.match(/<link[^>]+href=["']([^"']+)["']/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '');
    const description = (item.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || 
                         item.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] || 
                         item.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '');
    const pubDate = (item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1] || 
                     item.match(/<updated[^>]*>([\s\S]*?)<\/updated>/)?.[1] || 
                     item.match(/<published[^>]*>([\s\S]*?)<\/published>/)?.[1] || 
                     item.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '');
    
    const haystack = `${title} ${description}`.toLowerCase();
    if (haystack.includes(kw)) {
      results.push({
        title: title.slice(0, 200),
        company: '',
        location: '',
        link: link || sourceUrl,
        snippet: description.replace(/<[^>]+>/g, '').slice(0, 300),
        date: pubDate,
        source: 'generic-rss',
        isPremium: isPaidOnly
      });
    }
  }
  return results;
}

// =================================================================
// GÉNÉRATEUR 3 — TRAITEMENT DES ATS (Greenhouse, Lever, etc.)
// =================================================================
// Construit la vraie URL d'API à partir du slug vérifié (pas dérivé
// d'une page marketing — voir le commentaire sur ATS_COMPANIES dans
// massive-sources.ts pour l'historique du bug que ça corrige).
function atsApiUrl(ats: string, slug: string): string | null {
  switch (ats) {
    case 'greenhouse': return `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`
    case 'lever':       return `https://api.lever.co/v0/postings/${slug}?mode=json`
    case 'ashby':       return `https://api.ashbyhq.com/posting-api/job-board/${slug}`
    case 'workable':    return `https://apply.workable.com/api/v1/widget/accounts/${slug}`
    default:            return null
  }
}

// Chaque ATS a un format de réponse différent — normalisé ici en une
// liste unique {title, location, link, description, date}.
function normalizeAtsJobs(ats: string, data: any): Array<{ title: string; location: string; link: string; description: string; date: string }> {
  if (ats === 'greenhouse') {
    return (data.jobs || []).map((j: any) => ({
      title: j.title || '', location: j.location?.name || '',
      link: j.absolute_url || '', description: j.content || '', date: j.updated_at || '',
    }))
  }
  if (ats === 'lever') {
    return (Array.isArray(data) ? data : []).map((j: any) => ({
      title: j.text || '', location: j.categories?.location || '',
      link: j.hostedUrl || '', description: j.descriptionPlain || j.description || '', date: j.createdAt || '',
    }))
  }
  if (ats === 'ashby') {
    return (data.jobs || []).map((j: any) => ({
      title: j.title || '', location: j.location || '',
      link: j.jobUrl || '', description: j.descriptionPlain || '', date: j.publishedAt || '',
    }))
  }
  if (ats === 'workable') {
    return (data.jobs || []).map((j: any) => ({
      title: j.title || '', location: [j.city, j.country].filter(Boolean).join(', '),
      link: j.url || j.shortlink || '', description: j.department || '', date: j.published_on || '',
    }))
  }
  return []
}

export async function fetchATS(company: any, keyword: string): Promise<any[]> {
  const { name, ats, slug } = company
  try {
    const apiUrl = atsApiUrl(ats, slug)
    if (!apiUrl) return []

    const domain = getDomainFromUrl(apiUrl)
    await rateLimitForDomain(domain)

    const r = await fetch(apiUrl, {
      headers: { 'User-Agent': randomUserAgent() },
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) return [];

    const data = await r.json();
    const results: any[] = [];
    const kw = keyword.toLowerCase();

    const jobs = normalizeAtsJobs(ats, data)
    for (const job of jobs.slice(0, 20)) {
      const haystack = `${job.title} ${job.description}`.toLowerCase();
      if (haystack.includes(kw)) {
        results.push({
          title: String(job.title).slice(0, 200),
          company: name,
          location: String(job.location),
          link: String(job.link),
          snippet: String(job.description).replace(/<[^>]+>/g, '').slice(0, 300),
          date: job.date,
          source: `${ats}-${name}`,
          isPremium: false // All ATS are free
        });
      }
    }

    // 🚨 FILTRER TEMPS RÉEL : GARDER SEULEMENT < 24h !
    return results.filter(item => isDateFreshEnough(item.date));
  } catch (e) {
    console.warn(`[ATS] Erreur ${name}:`, (e as any)?.message);
    return [];
  }
}

// =================================================================
// RECHERCHE "site:" — pour les sources sans API/RSS exploitable
// (la grande majorité des ~2000 sources : pages carrière, plateformes
// fermées, réseaux sociaux...). On s'appuie sur Serper (déjà utilisé
// ailleurs dans le moteur) pour interroger Google scopé au domaine —
// ça marche même si l'URL exacte enregistrée pour la source est fausse,
// tant que le domaine lui-même est réel.
// =================================================================
const SERPER_KEY = process.env.SERPER_API_KEY || '';

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

async function siteScopedSearch(domain: string, keyword: string): Promise<any[]> {
  if (!SERPER_KEY || !domain) return [];
  try {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `site:${domain} ${keyword}`, num: 5, tbs: 'qdr:w' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return ((data.organic || []) as any[]).map((x: any) => ({
      title: x.title, company: '', location: '', link: x.link,
      snippet: x.snippet || '', date: x.date || '', source: `site:${domain}`, isPremium: false,
    }));
  } catch { return []; }
}

// =================================================================
// Cache mémoire léger par source — évite de re-hit la même source
// à chaque scan répété dans une courte fenêtre (protège le budget API)
// =================================================================
const sourceCacheTTLMs = 6 * 60 * 60 * 1000; // 6h — protège le budget API par source
// Fenêtre de rotation pour fetchAllSources() (scan live utilisateur,
// inchangé) — distincte du système de paliers par source (pickTierBatch,
// utilisé par le scan de fond du scheduler) plus bas dans ce fichier.
const rotationWindowMs = 90 * 60 * 1000; // 90min
const sourceCache = new Map<string, { at: number; results: any[] }>();

function cacheKey(url: string, keyword: string): string { return `${url}::${keyword.toLowerCase()}`; }

async function withSourceCache(url: string, keyword: string, fn: () => Promise<any[]>): Promise<any[]> {
  const key = cacheKey(url, keyword);
  const cached = sourceCache.get(key);
  if (cached && Date.now() - cached.at < sourceCacheTTLMs) return cached.results;
  const results = await fn();
  sourceCache.set(key, { at: Date.now(), results });
  return results;
}

// Batch executor — respecte une limite de concurrence réelle
async function runInBatches<T>(items: T[], limit: number, worker: (item: T) => Promise<any[]>): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const results = await Promise.all(chunk.map(item => worker(item).catch(() => [])));
    out.push(...results.flat());
  }
  return out;
}

// Exécute une source selon son type (api/rss → vrai fetch, browser/autre → site:)
async function executeSource(source: SourceEntry, keyword: string): Promise<any[]> {
  const results = await withSourceCache(source.url, keyword, async () => {
    if (source.type === 'api') return fetchGenericAPI(source.url, keyword, source.isPaidOnly, source.name);
    if (source.type === 'rss') return fetchGenericRSS(source.url, keyword, source.isPaidOnly, source.name);
    // 'browser' ou tout autre type sans parseur direct → recherche site-scoped
    return siteScopedSearch(hostnameOf(source.url), keyword);
  });
  // Le cache stocke les résultats bruts (sans catégorie) — on la ré-attache
  // à chaque appel plutôt que dans le cache, pour rester correct même si un
  // même item (url identique) était atteignable via deux registres différents.
  return source.category ? results.map((r: any) => ({ ...r, sourceCategory: source.category })) : results;
}

// Choisit un sous-ensemble rotatif d'une liste (couverture complète sur plusieurs scans)
function rotatingSlice<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const offset = Math.floor(Date.now() / rotationWindowMs) % items.length; // change toutes les 90min
  const rotated = [...items.slice(offset), ...items.slice(0, offset)];
  return rotated.slice(0, count);
}

// =================================================================
// GÉNÉRATEUR 4 — FONCTION PRINCIPALE QUI LANCE TOUT !
// Couvre les 12 catégories (~2000 sources), avec :
//  - filtrage réel gratuit/payant (isPaidOnly vs isPaid)
//  - rotation par lot pour ne jamais tout interroger d'un coup
//  - cache 6h par source pour protéger le budget Serper
// =================================================================
export async function fetchAllSources(keyword: string, log: string[], isPaid: boolean = false): Promise<any[]> {
  // Quota par scan — free: prudent, paid: plus large. Ajustable sans risque
  // pour le budget puisque chaque source est cachée 6h.
  const BATCH_SIZE = isPaid ? 150 : 40;

  // Registre freelance-only (voir massive-sources.ts) — plus d'ATS_COMPANIES
  // ni de job boards génériques dans le pipeline actif.
  const allSources: SourceEntry[] = FREELANCE_PLATFORMS_CURATED as SourceEntry[];

  // ── Filtrage RÉEL gratuit / payant (absent jusqu'ici) ──────────
  const eligible = allSources.filter(s => isPaid || !s.isPaidOnly);

  const total = allSources.length;
  const eligibleCount = eligible.length;
  log.push(`🔍 Registre freelance: ${total} sources (${allSources.filter(s=>!s.isPaidOnly).length} gratuites / ${allSources.filter(s=>s.isPaidOnly).length} premium)`);
  log.push(`📋 Plan ${isPaid ? 'payant' : 'gratuit'} → ${eligibleCount} sources éligibles, ${BATCH_SIZE} interrogées ce scan (rotation 6h pour couverture complète)`);

  const batch = rotatingSlice(eligible, BATCH_SIZE);
  const allResults = await runInBatches(batch, 5, s => executeSource(s, keyword));

  log.push(`✅ Scan terminé ! ${allResults.length} résultats bruts sur ${batch.length} sources interrogées`);

  return allResults;
}

// =================================================================
// SCAN DE FOND PAR PALIER DE FRÉQUENCE (scheduler.js)
// =================================================================
// Chaque source est classée selon la fréquence probable de repost de son
// origine (agrégateur multi-entreprises = très fréquent, board niche d'une
// seule PME = rare). Chaque palier tourne à SA cadence, et le lot par tick
// est calculé pour que le palier entier soit épuisé en 1h : à 10min (6
// ticks/h) le lot = pool/6 ; à 60min (1 tick/h) le lot = pool entier.
// Contrairement à fetchAllSources() (rotation temporelle, utilisée par le
// scan live utilisateur — inchangée), ici un index en mémoire avance
// exactement du lot à chaque appel, garantissant un cycle complet par heure.
export type SourceTier = 'fast' | 'medium' | 'slow' | 'veryslow';

const TIER_TICKS_PER_HOUR: Record<SourceTier, number> = { fast: 6, medium: 4, slow: 2, veryslow: 1 };

// Registre freelance-only découpé par palier — les tranches correspondent
// à l'ordre des catégories dans FREELANCE_PLATFORMS_CURATED (massive-
// sources.ts) : [0,34)=France+Mondiales, [34,66)=IT France+Design+Rédaction,
// [66,78)=Data/IA+Remote (🟡), [78,∞)=Allemagne+Afrique+Maghreb+Ouest+LATAM
// + compléments de recherche web ajoutés après le fichier de sourcing.
function buildTierPool(tier: SourceTier): SourceEntry[] {
  const pool = FREELANCE_PLATFORMS_CURATED as SourceEntry[];
  switch (tier) {
    case 'fast':     return pool.slice(0, 34);
    case 'medium':   return pool.slice(34, 66);
    case 'slow':     return pool.slice(66, 78);
    case 'veryslow': return pool.slice(78);
  }
}

const tierPools: Partial<Record<SourceTier, SourceEntry[]>> = {};
const tierRotationIndex: Record<SourceTier, number> = { fast: 0, medium: 0, slow: 0, veryslow: 0 };

// Tire LE lot du tick pour ce palier — à appeler UNE SEULE FOIS par appel
// HTTP à /api/cache-scan, même si plusieurs catégories/mots-clés sont
// traités dans le même appel (sinon la rotation avancerait plusieurs fois
// pour un seul tick de cron, cassant la garantie "cycle complet en 1h").
export function pickTierBatch(tier: SourceTier, isPaid: boolean, log: string[]): SourceEntry[] {
  if (!tierPools[tier]) tierPools[tier] = buildTierPool(tier);
  const pool = tierPools[tier]!;
  const eligible = pool.filter(s => isPaid || !s.isPaidOnly);
  if (eligible.length === 0) return [];

  const ticksPerHour = TIER_TICKS_PER_HOUR[tier];
  const batchSize = Math.max(1, Math.ceil(eligible.length / ticksPerHour));

  const offset = tierRotationIndex[tier] % eligible.length;
  const batch = [...eligible.slice(offset), ...eligible.slice(0, offset)].slice(0, batchSize);
  tierRotationIndex[tier] = (offset + batchSize) % eligible.length;

  log.push(`🎯 Palier ${tier} (${ticksPerHour}×/h) : ${eligible.length} sources au total, ${batch.length} ce tick (offset ${offset}) — cycle complet en 1h`);
  return batch;
}

// Exécute un lot déjà tiré (via pickTierBatch) pour UN mot-clé de catégorie
// donné — appelable plusieurs fois (une par catégorie) sans toucher à la
// rotation, qui a déjà été fixée pour tout le tick par pickTierBatch.
export async function runTierBatch(batch: SourceEntry[], keyword: string, log: string[]): Promise<any[]> {
  if (batch.length === 0) return [];
  const allResults = await runInBatches(batch, 5, s => executeSource(s, keyword));
  log.push(`✅ Lot palier exécuté pour "${keyword}" : ${allResults.length} résultats sur ${batch.length} sources`);
  return allResults;
}

// Wrapper pratique quand un seul mot-clé/catégorie est traité par appel
// (tire ET exécute en un coup — avance donc la rotation une fois).
export async function fetchSourcesByTier(tier: SourceTier, keyword: string, log: string[], isPaid: boolean = false): Promise<any[]> {
  const batch = pickTierBatch(tier, isPaid, log);
  return runTierBatch(batch, keyword, log);
}