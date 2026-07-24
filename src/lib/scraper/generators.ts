// =================================================================
// SEARCHER CONNECTOR — GÉNÉRATEURS GÉNÉRIQUES (300+ ACTEURS TEMPS RÉEL)
// =================================================================
// Ces fonctions génériques traitent TOUTES nos 300+ sources,
// filtrent les résultats à < 24h, et évitent les blocages !

import {
  JOB_BOARDS, ATS_COMPANIES, FREELANCE_PLATFORMS, TECH_RSS_FEEDS, SOCIAL_COMMUNITIES,
  NICHE_PLATFORMS, AI_TECH_PLATFORMS, GLOBAL_FREELANCE, INTERNSHIP_JUNIOR,
  REMOTE_EXCLUSIVE, EXECUTIVE_CAREERS, INDUSTRY_SPECIALIZED,
} from './massive-sources';

type SourceEntry = { name: string; type: string; url: string; isPaidOnly: boolean };

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
export async function fetchGenericAPI(url: string, keyword: string, isPaidOnly: boolean = false): Promise<any[]> {
  try {
    const data = await fetchRawCached(url, 'json');
    const results = parseGenericAPIData(data, keyword, isPaidOnly);
    // 🚨 FILTRER TEMPS RÉEL : GARDER SEULEMENT < 24h !
    return results.filter(item => isDateFreshEnough(item.date));
  } catch (e) {
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
export async function fetchGenericRSS(url: string, keyword: string, isPaidOnly: boolean = false): Promise<any[]> {
  try {
    const text = await fetchRawCached(url, 'text');
    const results = parseGenericRSS(text, keyword, url, isPaidOnly);
    // 🚨 FILTRER TEMPS RÉEL : GARDER SEULEMENT < 24h !
    return results.filter(item => isDateFreshEnough(item.date));
  } catch (e) {
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
// Fenêtre de ROTATION (distincte du cache ci-dessus) — détermine la vitesse à
// laquelle rotatingSlice() parcourt tout le pool de ~2005 sources. À 6h et
// 150 sources/scan, un cycle complet prenait ~80h (2005/150×6h) : le
// dashboard fondateur (actif = vu <24h) ne pouvait jamais refléter qu'une
// fraction du pool. À 90min, un cycle complet prend ~20h → le pool entier
// est retenté en moins d'un jour, sans coût API supplémentaire par scan.
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
  return withSourceCache(source.url, keyword, async () => {
    if (source.type === 'api') return fetchGenericAPI(source.url, keyword, source.isPaidOnly);
    if (source.type === 'rss') return fetchGenericRSS(source.url, keyword, source.isPaidOnly);
    // 'browser' ou tout autre type sans parseur direct → recherche site-scoped
    return siteScopedSearch(hostnameOf(source.url), keyword);
  });
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

  // `url` ici sert uniquement de clé de cache/dédup — l'URL réelle interrogée
  // est reconstruite dans fetchATS() à partir de `ats` + `slug`.
  const atsAsSourceEntries: SourceEntry[] = ATS_COMPANIES.map(c => ({ name: c.name, type: 'ats', url: `https://${c.ats}/${c.slug}`, isPaidOnly: c.isPaidOnly }));

  const allCategories: SourceEntry[] = [
    ...(JOB_BOARDS as SourceEntry[]),
    ...atsAsSourceEntries,
    ...(FREELANCE_PLATFORMS as SourceEntry[]),
    ...(TECH_RSS_FEEDS as any[]).map(f => ({ name: f.name, type: 'rss', url: f.url, isPaidOnly: f.isPaidOnly })),
    ...(SOCIAL_COMMUNITIES as SourceEntry[]),
    ...(NICHE_PLATFORMS as SourceEntry[]),
    ...(AI_TECH_PLATFORMS as SourceEntry[]),
    ...(GLOBAL_FREELANCE as SourceEntry[]),
    ...(INTERNSHIP_JUNIOR as SourceEntry[]),
    ...(REMOTE_EXCLUSIVE as SourceEntry[]),
    ...(EXECUTIVE_CAREERS as SourceEntry[]),
    ...(INDUSTRY_SPECIALIZED as SourceEntry[]),
  ];

  // ── Filtrage RÉEL gratuit / payant (absent jusqu'ici) ──────────
  const eligible = allCategories.filter(s => isPaid || !s.isPaidOnly);

  const total = allCategories.length;
  const eligibleCount = eligible.length;
  log.push(`🔍 Registre: ${total} sources (${allCategories.filter(s=>!s.isPaidOnly).length} gratuites / ${allCategories.filter(s=>s.isPaidOnly).length} premium)`);
  log.push(`📋 Plan ${isPaid ? 'payant' : 'gratuit'} → ${eligibleCount} sources éligibles, ${BATCH_SIZE} interrogées ce scan (rotation 6h pour couverture complète)`);

  const batch = rotatingSlice(eligible, BATCH_SIZE);

  // fetchATS a une signature différente (company object) → traité à part
  const atsBatch = batch.filter(s => s.type === 'ats');
  const otherBatch = batch.filter(s => s.type !== 'ats');

  const atsByName = new Map(ATS_COMPANIES.map(c => [c.name, c]));
  const [atsResults, otherResults] = await Promise.all([
    runInBatches(atsBatch, 5, s => {
      const company = atsByName.get(s.name);
      if (!company) return Promise.resolve([]);
      return withSourceCache(s.url, keyword, () => fetchATS(company, keyword));
    }),
    runInBatches(otherBatch, 5, s => executeSource(s, keyword)),
  ]);

  const allResults = [...atsResults, ...otherResults];
  log.push(`✅ Scan terminé ! ${allResults.length} résultats bruts sur ${batch.length} sources interrogées`);

  return allResults;
}