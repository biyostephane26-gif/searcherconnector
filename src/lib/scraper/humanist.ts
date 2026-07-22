// =================================================================
// SEARCHER CONNECTOR — SCRAPERS HUMANISTES (ScrapingBee/ZenRows/Apify)
// =================================================================
// Utilisé par le scan par catégorie (app/api/cache-scan) pour peupler
// le cache partagé avec LinkedIn/Upwork/réseaux sociaux — réservé au
// palier TIER 1 (10min) pour maîtriser la consommation de crédits.
// Note : src/pages/api/scan.ts a sa propre implémentation (Niveau 3,
// scan live par utilisateur) — duplication volontaire pour ne pas
// risquer de casser ce chemin déjà fonctionnel en le refactorant.
// =================================================================

const APIFY_KEYS = [
  process.env.APIFY_API_KEY, process.env.APIFY_API_KEY_2, process.env.APIFY_API_KEY_3,
  process.env.APIFY_API_KEY_4, process.env.APIFY_API_KEY_5, process.env.APIFY_API_KEY_6,
  process.env.APIFY_API_KEY_7, process.env.APIFY_API_KEY_8, process.env.APIFY_API_KEY_9,
  process.env.APIFY_API_KEY_10,
].filter(Boolean) as string[];
let _apifyKeyIndex = 0;
function getApifyKey(): string { const k = APIFY_KEYS[_apifyKeyIndex % Math.max(APIFY_KEYS.length, 1)]; _apifyKeyIndex++; return k || ''; }
const HAS_APIFY = APIFY_KEYS.length > 0;

const SCRAPINGBEE_KEYS = [
  process.env.SCRAPINGBEE_KEY_1, process.env.SCRAPINGBEE_KEY_2, process.env.SCRAPINGBEE_KEY_3,
  process.env.SCRAPINGBEE_KEY_4, process.env.SCRAPINGBEE_KEY_5, process.env.SCRAPINGBEE_KEY_6,
  process.env.SCRAPINGBEE_KEY_7, process.env.SCRAPINGBEE_KEY_8, process.env.SCRAPINGBEE_KEY_9,
  process.env.SCRAPINGBEE_KEY_10,
].filter(Boolean) as string[];
let _scrapingbeeKeyIndex = 0;
function getScrapingBeeKey(): string { const k = SCRAPINGBEE_KEYS[_scrapingbeeKeyIndex % Math.max(SCRAPINGBEE_KEYS.length, 1)]; _scrapingbeeKeyIndex++; return k || ''; }

const ZENROWS_KEYS = [
  process.env.ZENROWS_KEY_1, process.env.ZENROWS_KEY_2, process.env.ZENROWS_KEY_3,
  process.env.ZENROWS_KEY_4, process.env.ZENROWS_KEY_5, process.env.ZENROWS_KEY_6,
  process.env.ZENROWS_KEY_7, process.env.ZENROWS_KEY_8, process.env.ZENROWS_KEY_9,
  process.env.ZENROWS_KEY_10,
].filter(Boolean) as string[];
let _zenrowsKeyIndex = 0;
function getZenRowsKey(): string { const k = ZENROWS_KEYS[_zenrowsKeyIndex % Math.max(ZENROWS_KEYS.length, 1)]; _zenrowsKeyIndex++; return k || ''; }

export const HAS_HUMANIST_SCRAPERS = SCRAPINGBEE_KEYS.length > 0 || ZENROWS_KEYS.length > 0 || HAS_APIFY;

const humanDelay = () => new Promise(r => setTimeout(r, 1200 + Math.random() * 3800));
const MOBILE_UAS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Samsung Galaxy S24) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
];
const randomUA = () => MOBILE_UAS[Math.floor(Math.random() * MOBILE_UAS.length)];

async function scrapingBee(url: string, params: Record<string, string> = {}): Promise<string> {
  const key = getScrapingBeeKey();
  if (!key) return '';
  await humanDelay();
  const p = new URLSearchParams({ api_key: key, url, render_js: 'false', premium_proxy: 'true', country_code: 'us', device: 'mobile', ...params });
  try {
    const r = await fetch(`https://app.scrapingbee.com/api/v1/?${p}`, { headers: { 'User-Agent': randomUA() }, signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.text() : '';
  } catch { return ''; }
}

async function zenRows(url: string): Promise<string> {
  const key = getZenRowsKey();
  if (!key) return '';
  await humanDelay();
  const p = new URLSearchParams({ url, apikey: key, js_render: 'false', premium_proxy: 'true', proxy_country: 'us' });
  try {
    const r = await fetch(`https://api.zenrows.com/v1/?${p}`, { headers: { 'User-Agent': randomUA() }, signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.text() : '';
  } catch { return ''; }
}

async function apifyRun(actorId: string, input: Record<string, any>): Promise<any[]> {
  if (!HAS_APIFY) return [];
  const key = getApifyKey();
  try {
    const run = await (await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, maxItems: 20 }), signal: AbortSignal.timeout(35000),
    })).json();
    const runId = run?.data?.id; if (!runId) return [];
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const s = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${key}`, { signal: AbortSignal.timeout(8000) })).json();
      if (s?.data?.status === 'SUCCEEDED') return await (await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${key}&limit=20`)).json() || [];
      if (['FAILED', 'ABORTED'].includes(s?.data?.status)) return [];
    }
  } catch { /* silencieux — cascade continue */ }
  return [];
}

async function withFailover(scrapers: Array<() => Promise<any[]>>): Promise<any[]> {
  for (const scraper of scrapers) {
    try { const result = await scraper(); if (result.length > 0) return result; } catch { /* essai suivant */ }
  }
  return [];
}

// ── LinkedIn ──────────────────────────────────────────────────────
async function linkedInViaScrapingBee(term: string, country: string): Promise<any[]> {
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(term)}&location=${encodeURIComponent(country)}&f_TPR=r604800&sortBy=DD`;
  const html = await scrapingBee(url, { render_js: 'true' });
  if (!html) return [];
  const jobs: any[] = [];
  const titleRe = /<h3[^>]*class="[^"]*job-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi;
  const linkRe = /<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"[^>]*>/gi;
  const titles: string[] = [], links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(html))) titles.push(m[1].replace(/<[^>]+>/g, '').trim());
  while ((m = linkRe.exec(html))) links.push(m[1].split('?')[0]);
  for (let i = 0; i < Math.min(titles.length, 15); i++) if (titles[i] && links[i]) jobs.push({ title: titles[i], link: links[i], snippet: 'LinkedIn Job', date: '', source: 'humanist:linkedin' });
  return jobs;
}
async function linkedInViaApify(term: string, country: string): Promise<any[]> {
  const items = await apifyRun('curious_coder/linkedin-jobs-scraper', { queries: [term], location: country, limit: 15, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } });
  return items.map((j: any) => ({ title: j.title || j.jobTitle || '', link: j.applyUrl || j.jobUrl || j.url || '', snippet: `${j.company || ''} — ${j.location || ''}`, date: j.publishedAt || '', source: 'humanist:linkedin', company: j.company || '', location: j.location || '' })).filter((j: any) => j.link);
}
export async function scrapeLinkedIn(term: string, country: string): Promise<any[]> {
  return withFailover([() => linkedInViaScrapingBee(term, country), () => linkedInViaApify(term, country)]);
}

// ── Upwork ────────────────────────────────────────────────────────
async function upworkViaScrapingBee(term: string): Promise<any[]> {
  const url = `https://www.upwork.com/search/jobs/?q=${encodeURIComponent(term)}&sort=recency`;
  const html = await scrapingBee(url, { render_js: 'true', wait: '2000' });
  if (!html) return [];
  const jobs: any[] = [];
  const re = /"title":"([^"]+)"[^}]*"ciphertext":"([^"]+)"[^}]*"amount":\{"amount":(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && jobs.length < 15) jobs.push({ title: m[1], link: `https://www.upwork.com/jobs/~${m[2]}`, snippet: `Budget: $${m[3]}`, date: '', source: 'humanist:upwork' });
  return jobs;
}
async function upworkViaApify(term: string): Promise<any[]> {
  const items = await apifyRun('tugkan/upwork-jobs-scraper', { search: term, maxJobs: 15, proxy: { useApifyProxy: true } });
  return items.map((j: any) => ({ title: j.title || '', link: j.url || j.link || '', snippet: j.description?.slice(0, 300) || '', date: j.publishedDate || '', source: 'humanist:upwork' })).filter((j: any) => j.link);
}
export async function scrapeUpwork(term: string): Promise<any[]> {
  return withFailover([() => upworkViaScrapingBee(term), () => upworkViaApify(term)]);
}

// ── Twitter/X (via Nitter — gratuit, pas de crédit consommé) ──────
const NITTER_INSTANCES = ['https://nitter.net', 'https://nitter.privacydev.net', 'https://nitter.poast.org'];
async function twitterViaNitter(query: string): Promise<any[]> {
  const instance = NITTER_INSTANCES[Math.floor(Math.random() * NITTER_INSTANCES.length)];
  try {
    const r = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&f=tweets`, { headers: { 'User-Agent': randomUA() }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const html = await r.text();
    const tweets: any[] = [];
    const re = /<div class="tweet-content[^"]*">([\s\S]*?)<\/div>[\s\S]*?<a[^>]*class="[^"]*tweet-link[^"]*"[^>]*href="([^"]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && tweets.length < 15) {
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      if (text.length > 20) tweets.push({ title: text.slice(0, 80), link: `https://twitter.com${m[2]}`, snippet: text.slice(0, 300), date: new Date().toISOString(), source: 'humanist:twitter' });
    }
    return tweets;
  } catch { return []; }
}
export async function scrapeTwitter(query: string): Promise<any[]> {
  return withFailover([() => twitterViaNitter(query)]);
}

// ── Facebook / Instagram (Apify uniquement — plus fiable que scraping direct) ──
export async function scrapeFacebook(query: string): Promise<any[]> {
  if (!HAS_APIFY) return [];
  const items = await apifyRun('apify/facebook-pages-scraper', { startUrls: [{ url: `https://www.facebook.com/search/posts/?q=${encodeURIComponent(query)}` }], maxPosts: 15, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } });
  return items.map((p: any) => ({ title: p.postText?.slice(0, 80) || 'Facebook Post', link: p.url || p.postUrl || '', snippet: p.postText?.slice(0, 300) || '', date: p.time || '', source: 'humanist:facebook' })).filter((p: any) => p.link && p.snippet?.length > 20);
}
export async function scrapeInstagram(hashtag: string): Promise<any[]> {
  if (!HAS_APIFY) return [];
  const items = await apifyRun('apify/instagram-hashtag-scraper', { hashtags: [hashtag], resultsLimit: 15, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } });
  return items.map((p: any) => ({ title: p.caption?.slice(0, 80) || 'Instagram', link: p.url || (p.shortCode ? `https://instagram.com/p/${p.shortCode}` : ''), snippet: p.caption?.slice(0, 300) || '', date: p.timestamp || '', source: 'humanist:instagram' })).filter((p: any) => p.link && p.snippet?.length > 20);
}
