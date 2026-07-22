// =================================================================
// SEARCHER CONNECTOR — MOTEUR DE SCAN v6.1 "FAILOVER ULTRA-HUMANISTE"
//
// OBJECTIF : Avoir TOUT le web en temps réel — zéro lacune
//
// ARCHITECTURE DES SCRAPERS (3 par réseau fermé) :
//   LinkedIn  → ScrapingBee → ZenRows → Apify (failover auto)
//   Facebook  → ScrapingBee(mbasic) → ZenRows → Apify
//   Twitter/X → Nitter (gratuit illimité) → ScrapingBee → Apify
//   Instagram → ScrapingBee → ZenRows → Apify
//   Upwork    → ScrapingBee → ZenRows → Apify
//
// ULTRA-HUMANISTE : délai aléatoire, IP tournante, User-Agent réel,
//                   cookies session, comportement mobile simulé
//
// FAILOVER : si source 1 bloquée → source 2 → source 3 → []
//            Jamais d'arrêt total du scan
//
// NIVEAU 1 (toujours, gratuit) :
//   Serper + Brave + Exa.ai + Tavily + SearXNG(VPS optionnel) +
//   Remotive + Arbeitnow + Himalayas + HN + GitHub + Adzuna +
//   ATS Greenhouse/Lever + DevTo + ProductHunt + Reddit + Mastodon + Bluesky
//
// NIVEAU 2 (si < seuil) : Bing + Wellfound + GitHub profils
//
// NIVEAU 3 (budget/plan payant) : Scrapers humanistes failover
//   ScrapingBee (1000 crédits gratuits) + ZenRows (1000 crédits)
//   + Apify (réserve) + Nitter (illimité)
//
// AFFICHAGE :
//   Plan gratuit → 8 visibles + aperçu flou "Débloquer Premium"
//   Plan payant  → tout visible
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';
import { fetchAllSources } from '../../lib/scraper/generators';
import { cache } from '../../lib/scraper/cache-manager';
import { matchCategories, matchCategoriesForUser } from '../../lib/scraper/categories';
import { detectRequiredLevel, computeLevelMatch } from '../../lib/scraper/skill-matching';
import { checkRateLimit } from '../../lib/rateLimiter';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// ── Clients ───────────────────────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
let _mongo: MongoClient | null = null;
async function getMongo() {
  if (!_mongo) { _mongo = new MongoClient(process.env.MONGODB_URI!); await _mongo.connect(); }
  return _mongo.db('searcherconnector');
}

// ── Clés API ──────────────────────────────────────────────────────
const SERPER_KEY        = process.env.SERPER_API_KEY       || '';
// Apify : toutes les clés disponibles en rotation
const APIFY_KEYS        = [
  process.env.APIFY_API_KEY,
  process.env.APIFY_API_KEY_2,
  process.env.APIFY_API_KEY_3,
  process.env.APIFY_API_KEY_4,
  process.env.APIFY_API_KEY_5,
  process.env.APIFY_API_KEY_6,
  process.env.APIFY_API_KEY_7,
  process.env.APIFY_API_KEY_8,
  process.env.APIFY_API_KEY_9,
  process.env.APIFY_API_KEY_10,
].filter(Boolean) as string[];
let _apifyKeyIndex = 0;
function getApifyKey(): string { const k = APIFY_KEYS[_apifyKeyIndex % Math.max(APIFY_KEYS.length, 1)]; _apifyKeyIndex++; return k || ''; }
const APIFY_KEY = APIFY_KEYS.length > 0; // booléen pour vérifications

// ScrapingBee : toutes les clés disponibles en rotation
const SCRAPINGBEE_KEYS = [
  process.env.SCRAPINGBEE_KEY_1,
  process.env.SCRAPINGBEE_KEY_2,
  process.env.SCRAPINGBEE_KEY_3,
  process.env.SCRAPINGBEE_KEY_4,
  process.env.SCRAPINGBEE_KEY_5,
  process.env.SCRAPINGBEE_KEY_6,
  process.env.SCRAPINGBEE_KEY_7,
  process.env.SCRAPINGBEE_KEY_8,
  process.env.SCRAPINGBEE_KEY_9,
  process.env.SCRAPINGBEE_KEY_10,
].filter(Boolean) as string[];
let _scrapingbeeKeyIndex = 0;
function getScrapingBeeKey(): string { const k = SCRAPINGBEE_KEYS[_scrapingbeeKeyIndex % Math.max(SCRAPINGBEE_KEYS.length, 1)]; _scrapingbeeKeyIndex++; return k || ''; }

// ZenRows : toutes les clés disponibles en rotation
const ZENROWS_KEYS = [
  process.env.ZENROWS_KEY_1,
  process.env.ZENROWS_KEY_2,
  process.env.ZENROWS_KEY_3,
  process.env.ZENROWS_KEY_4,
  process.env.ZENROWS_KEY_5,
  process.env.ZENROWS_KEY_6,
  process.env.ZENROWS_KEY_7,
  process.env.ZENROWS_KEY_8,
  process.env.ZENROWS_KEY_9,
  process.env.ZENROWS_KEY_10,
].filter(Boolean) as string[];
let _zenrowsKeyIndex = 0;
function getZenRowsKey(): string { const k = ZENROWS_KEYS[_zenrowsKeyIndex % Math.max(ZENROWS_KEYS.length, 1)]; _zenrowsKeyIndex++; return k || ''; }
const EXA_KEY      = process.env.EXA_API_KEY    || '';       // exa.ai — 1000 req/mois gratuit
const TAVILY_KEY   = process.env.TAVILY_API_KEY || '';       // tavily.com — 1000 req/mois gratuit
const BRAVE_KEY    = '';       // désactivé — remplacé par DuckDuckGo
const BING_KEY     = '';       // désactivé — remplacé par Wizbii
const SEARXNG_URL  = '';       // désactivé — remplacé par Jooble
const ADZUNA_ID    = process.env.ADZUNA_APP_ID  || '';
const ADZUNA_KEY   = process.env.ADZUNA_APP_KEY || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN   || '';

// ── Seuils de la cascade ─────────────────────────────────────────
const LEVEL1_MIN = 15;  // si < 15 résultats → lancer niveau 2
const LEVEL2_MIN = 25;  // si < 25 résultats → lancer niveau 3 (Apify)
// Plan gratuit : 10 résultats visibles — assez pour qu'une offre bien scorée
// puisse générer suffisamment de revenus pour payer l'abonnement Talent (19$/mois)
// Ex: une mission freelance à 500$ via Upwork couvre 26 mois d'abonnement
const FREE_VISIBLE  = 10;
const PAID_VISIBLE  = 999;
const UA = 'Mozilla/5.0 (compatible; SearcherConnector/6.0)';
const H: Record<string,string> = { 'User-Agent': UA, Accept: '*/*' };

// =================================================================
// UTILITAIRES
// =================================================================
function parseDate(d?: string): number {
  if (!d) return 0;
  const s = d.toLowerCase(), n = Date.now();
  const m = (p: RegExp) => parseInt(s.match(p)?.[1] || '1');
  if (/\d+\s*min/.test(s))            return n - m(/(\d+)\s*min/)            * 60000;
  if (/\d+\s*(hour|heure)/.test(s))   return n - m(/(\d+)\s*(hour|heure)/)   * 3600000;
  if (/\d+\s*(day|jour)/.test(s))     return n - m(/(\d+)\s*(day|jour)/)     * 86400000;
  if (/\d+\s*(week|semaine)/.test(s)) return n - m(/(\d+)\s*(week|semaine)/) * 604800000;
  const p = new Date(d).getTime(); return isNaN(p) ? 0 : p;
}
function ageH(d?: string) { return Math.max(0, Math.round((Date.now() - parseDate(d)) / 3600000)); }

function dedup(items: any[]): any[] {
  const su = new Set<string>(), st = new Set<string>();
  return items.filter(r => {
    const u = (r.link || r.url || '').split('?')[0].toLowerCase().trim();
    const t = (r.title || '').toLowerCase().trim().slice(0, 55);
    if (u && su.has(u)) return false;
    if (t.length > 10 && st.has(t)) return false;
    if (u) su.add(u); if (t.length > 10) st.add(t); return true;
  }).sort((a, b) => parseDate(b.date) - parseDate(a.date));
}

// safe() — si fn() plante, retourne [] et log l'erreur
async function safe<T>(name: string, fn: () => Promise<T[]>, log: string[]): Promise<T[]> {
  try {
    const r = await fn();
    log.push(`✅ ${name}: ${r.length} résultats`);
    return r;
  } catch (e: any) {
    log.push(`⚠️ ${name}: ERREUR — ${e.message?.slice(0, 80) || 'unknown'}`);
    return [];
  }
}

function extractKeywords(domain: string): string[] {
  const d = domain.toLowerCase();
  const map: Record<string, string[]> = {
    'growth':['growth marketing','growth hacking','user acquisition'],
    'martech':['marketing automation','martech','HubSpot','CRM'],
    'marketing':['digital marketing','marketing','SEO','growth'],
    'engineering':['software engineer','developer','full stack'],
    'developer':['developer','software engineer','programmer'],
    'design':['UI/UX designer','designer','graphic designer'],
    'data':['data analyst','data scientist','analytics'],
    'finance':['financial analyst','finance','accountant'],
    'sales':['sales','business development','SDR'],
    'product':['product manager','product owner'],
    'devops':['DevOps','cloud engineer','SRE'],
    'ai':['AI engineer','machine learning','ML'],
    'mobile':['mobile developer','iOS','Android','React Native'],
    'fullstack':['full stack developer','React developer','Node.js'],
    'frontend':['frontend developer','React developer','Vue.js'],
    'backend':['backend developer','Node.js','Python developer'],
    'content':['content writer','copywriter','content creator'],
    'seo':['SEO specialist','SEO expert'],
    'video':['video editor','motion designer','videographer'],
    'automation':['automation engineer','no-code','Zapier'],
    'consultant':['consultant','advisor','expert'],
    'startup':['startup','entrepreneur','founder'],
    'investor':['investor','venture capital','angel investor'],
  };
  const kws: string[] = [];
  const words = d.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,' ').split(/\s+/).filter(w=>w.length>2);
  for (const w of words) for (const [key,vals] of Object.entries(map)) if (w.includes(key)||key.includes(w)) kws.push(...vals.slice(0,2));
  const quoted = domain.length<=25 ? `"${domain}"` : words.slice(0,2).join(' ');
  return [...new Set([quoted,...kws.slice(0,4)])];
}

// =================================================================
// NIVEAU 1 — SOURCES TOUJOURS GRATUITES
// =================================================================

// ── Serper ────────────────────────────────────────────────────────
async function serper(q: string, num=10): Promise<any[]> {
  if (!SERPER_KEY) return [];
  const r = await fetch('https://google.serper.dev/search', {
    method:'POST', headers:{'X-API-KEY':SERPER_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({q,num,tbs:'qdr:w'}), signal:AbortSignal.timeout(10000),
  });
  if (!r.ok) return [];
  return ((await r.json()).organic||[]).map((x:any)=>({title:x.title,link:x.link,snippet:x.snippet,date:x.date,source:'serper'}));
}

// ── Brave Search ─────────────────────────────────────────────────
// REMPLACÉ par DuckDuckGo Instant (gratuit, sans clé, sans carte)
async function duckduckgoSearch(q: string): Promise<any[]> {
  // DDG Instant Answer API — pas de clé, pas de limite stricte
  try {
    const r = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
      { headers: H, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return [];
    const d = await r.json();
    const results: any[] = [];
    // RelatedTopics contient des résultats pertinents
    for (const t of (d.RelatedTopics || [])) {
      if (t.FirstURL && t.Text) {
        results.push({ title: t.Text.slice(0, 100), link: t.FirstURL, snippet: t.Text, date: '', source: 'duckduckgo' });
      }
      if (results.length >= 10) break;
    }
    return results;
  } catch { return []; }
}

// ── Exa.ai — recherche sémantique (1000 req/mois gratuit) ────────
// Parfait pour "trouve-moi quelqu'un qui cherche un dev React"
async function exaSearch(query: string, profileType: string): Promise<any[]> {
  if (!EXA_KEY) return [];
  // Exa cherche par sens, pas juste mots-clés — idéal pour opportunités
  const r = await fetch('https://api.exa.ai/search', {
    method:'POST', headers:{'Content-Type':'application/json','x-api-key':EXA_KEY},
    body: JSON.stringify({
      query: profileType==='freelance' ? `hiring ${query} freelancer remote` : profileType==='investor' ? `startup ${query} seeking investment` : `${query} job opportunity remote`,
      numResults: 15,
      useAutoprompt: true,
      startPublishedDate: new Date(Date.now() - 7*86400000).toISOString().split('T')[0],
    }),
    signal:AbortSignal.timeout(12000),
  });
  if (!r.ok) return [];
  return ((await r.json()).results||[]).map((x:any)=>({title:x.title,link:x.url,snippet:x.text?.slice(0,300)||x.snippet||'',date:x.publishedDate,source:'exa.ai'}));
}

// ── Tavily — API pour agents IA (1000 req/mois gratuit) ──────────
// Conçu exactement pour les agents autonomes comme SCAI
async function tavilySearch(query: string): Promise<any[]> {
  if (!TAVILY_KEY) return [];
  const r = await fetch('https://api.tavily.com/search', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      api_key: TAVILY_KEY, query, search_depth:'basic',
      include_answer:false, max_results:15,
      include_domains:[], exclude_domains:['wikipedia.org','youtube.com'],
    }),
    signal:AbortSignal.timeout(12000),
  });
  if (!r.ok) return [];
  return ((await r.json()).results||[]).map((x:any)=>({title:x.title,link:x.url,snippet:x.content?.slice(0,300)||'',date:x.published_date,source:'tavily'}));
}

// ── SearXNG → REMPLACÉ par Jooble (API emploi gratuite, 500 req/jour) ───
// Jooble agrège Indeed, Glassdoor, LinkedIn Jobs, Monster, etc.
// Inscription gratuite : https://jooble.org/api/about
const JOOBLE_KEY = process.env.JOOBLE_API_KEY || '';
async function joobleSearch(term: string, country: string): Promise<any[]> {
  if (!JOOBLE_KEY) {
    // Fallback sans clé : scrape Jooble via Serper
    return serper(`site:jooble.org ${term} ${country}`, 8);
  }
  try {
    const r = await fetch('https://jooble.org/api/' + JOOBLE_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: term, location: country, page: 1 }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    return ((await r.json()).jobs || []).slice(0, 15).map((j: any) => ({
      title:   j.title || '',
      link:    j.link  || '',
      snippet: `${j.company || ''} — ${j.location || ''} ${j.salary ? '· ' + j.salary : ''}`,
      date:    j.updated || '',
      source:  'api:jooble',
    })).filter((j: any) => j.link);
  } catch { return []; }
}

// ── Bing → REMPLACÉ par Wizbii + AfricaJobs (gratuit, 0 clé) ─────
// Wizbii : jobs Europe et Afrique francophone
async function wizbiiSearch(term: string): Promise<any[]> {
  try {
    const r = await fetch(
      `https://www.wizbii.com/api/v3/jobs?q=${encodeURIComponent(term)}&limit=15&lang=fr`,
      { headers: H, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return ((d.jobs || d.items || d.data || []) as any[]).slice(0, 15).map((j: any) => ({
      title:   j.title   || j.name   || '',
      link:    j.url     || j.applyUrl || `https://www.wizbii.com/job/${j.id || ''}`,
      snippet: `${j.company?.name || j.companyName || ''} — ${j.location?.city || j.city || ''}`,
      date:    j.publishedAt || j.createdAt || '',
      source:  'api:wizbii',
    })).filter((j: any) => j.title);
  } catch { return []; }
}

// ── Remotive (gratuit sans clé) ───────────────────────────────────
async function fetchRemotive(term: string): Promise<any[]> {
  const r = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=15`,{signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  return ((await r.json()).jobs||[]).filter((j:any)=>!j.applicants_count||j.applicants_count<=10).map((j:any)=>({title:j.title,link:j.url,snippet:j.description?.replace(/<[^>]+>/g,'').slice(0,300),date:j.publication_date,source:'api:remotive'}));
}

// ── Arbeitnow (gratuit sans clé) ─────────────────────────────────
async function fetchArbeitnow(term: string): Promise<any[]> {
  const r = await fetch('https://www.arbeitnow.com/api/job-board-api',{signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  const tl=term.toLowerCase();
  return ((await r.json()).data||[]).filter((j:any)=>j.title?.toLowerCase().includes(tl)||j.description?.toLowerCase().includes(tl)).slice(0,10).map((j:any)=>({title:j.title,link:j.url,snippet:j.description?.replace(/<[^>]+>/g,'').slice(0,300),date:j.created_at,source:'api:arbeitnow'}));
}

// ── Himalayas (gratuit sans clé) ──────────────────────────────────
async function fetchHimalayas(term: string): Promise<any[]> {
  const r = await fetch(`https://himalayas.app/jobs/api?q=${encodeURIComponent(term)}&limit=15`,{signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  return ((await r.json()).jobs||[]).slice(0,15).map((j:any)=>({title:j.title||j.jobTitle,link:j.applicationLink||j.url||'',snippet:`${j.companyName||''} — ${j.location||'Remote'}`,date:j.publishedAt||'',source:'api:himalayas'})).filter((j:any)=>j.link);
}

// ── HackerNews Algolia (gratuit sans clé) ────────────────────────
async function fetchHN(term: string): Promise<any[]> {
  const r = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term+' hiring')}&tags=job&hitsPerPage=15`,{signal:AbortSignal.timeout(8000)});
  if (!r.ok) return [];
  return ((await r.json()).hits||[]).map((h:any)=>({title:h.title||'HN Job',link:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,snippet:(h.comment_text||h.title||'').slice(0,300),date:new Date(h.created_at).toISOString(),source:'hackernews'}));
}

// ── GitHub Issues / Repos (gratuit — 5000 req/h avec token) ──────
async function fetchGitHub(term: string): Promise<any[]> {
  const q=`${term} label:"help wanted" OR label:"bounty" OR label:"paid"`;
  const headers:any={...H,Accept:'application/vnd.github.v3+json'};
  if (GITHUB_TOKEN) headers.Authorization=`token ${GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&order=desc&per_page=15`,{headers,signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  return ((await r.json()).items||[]).map((i:any)=>({title:i.title,link:i.html_url,snippet:(i.body||i.title).slice(0,300),date:i.created_at,source:'github'}));
}

// ── DevTo API (gratuit sans clé) — profils dev ──────────────────
async function fetchDevTo(term: string): Promise<any[]> {
  const r = await fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(term.split(' ')[0].toLowerCase())}&per_page=15&top=7`,{headers:{...H,'api-key':''},signal:AbortSignal.timeout(8000)});
  if (!r.ok) return [];
  return ((await r.json())||[]).map((a:any)=>({title:a.title,link:a.url||`https://dev.to${a.path}`,snippet:a.description||'',date:a.published_at,source:'devto',company:a.user?.username||''}));
}

// ── ProductHunt API (gratuit sans clé) — startups/makers ─────────
async function fetchProductHunt(profileType: string, term: string): Promise<any[]> {
  if (!['investor','business'].includes(profileType)) return [];
  const r = await fetch(`https://www.producthunt.com/frontend/graphql`,{
    method:'POST', headers:{...H,'Content-Type':'application/json'},
    body: JSON.stringify({query:`{posts(order:VOTES,topic:"${term.split(' ')[0]}",first:15){edges{node{name,tagline,url,votesCount,website,createdAt}}}}`}),
    signal:AbortSignal.timeout(10000),
  });
  if (!r.ok) return [];
  const d = await r.json();
  return ((d.data?.posts?.edges)||[]).map((e:any)=>e.node).map((p:any)=>({title:p.name,link:p.url||p.website||'',snippet:p.tagline||'',date:p.createdAt,source:'producthunt'})).filter((p:any)=>p.link);
}

// ── Adzuna (clé gratuite) ─────────────────────────────────────────
async function fetchAdzuna(term: string, country: string): Promise<any[]> {
  if (!ADZUNA_ID||!ADZUNA_KEY) return [];
  const cc:Record<string,string>={cameroun:'ng',france:'fr',uk:'gb',usa:'us',canada:'ca',nigeria:'ng','south africa':'za'};
  const code=cc[country.toLowerCase()]||'us';
  const r = await fetch(`https://api.adzuna.com/v1/api/jobs/${code}/search/1?app_id=${ADZUNA_ID}&app_key=${ADZUNA_KEY}&what=${encodeURIComponent(term)}&results_per_page=15`,{signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  return ((await r.json()).results||[]).map((j:any)=>({title:j.title,link:j.redirect_url,snippet:j.description?.slice(0,300)||`${j.company?.display_name||''} — ${j.location?.display_name||''}`,date:j.created,source:'api:adzuna'}));
}

// ── ATS Greenhouse (gratuit sans clé) ────────────────────────────
async function fetchGreenhouseATS(term: string): Promise<any[]> {
  const cos=['stripe','notion','figma','vercel','linear','retool','brex','ramp','rippling','deel','remote','lattice'];
  const tl=term.toLowerCase();
  const res=await Promise.allSettled(cos.slice(0,8).map(async co=>{
    try {
      const r=await fetch(`https://boards-api.greenhouse.io/v1/boards/${co}/jobs?content=true`,{signal:AbortSignal.timeout(8000)});
      if (!r.ok) return [];
      return ((await r.json()).jobs||[]).filter((j:any)=>j.title?.toLowerCase().includes(tl)).slice(0,3).map((j:any)=>({title:j.title,link:j.absolute_url||'',snippet:`${co} — ${j.departments?.[0]?.name||''} ${j.offices?.[0]?.name||'Remote'}`,date:j.updated_at||'',source:`ats:greenhouse:${co}`}));
    } catch { return []; }
  }));
  return res.filter(r=>r.status==='fulfilled').flatMap(r=>(r as any).value);
}

// ── ATS Lever (gratuit sans clé) ─────────────────────────────────
async function fetchLeverATS(term: string): Promise<any[]> {
  const cos=['netflix','discord','duolingo','coinbase','plaid','robinhood','lyft'];
  const tl=term.toLowerCase();
  const res=await Promise.allSettled(cos.slice(0,5).map(async co=>{
    try {
      const r=await fetch(`https://api.lever.co/v0/postings/${co}?mode=json`,{signal:AbortSignal.timeout(8000)});
      if (!r.ok) return [];
      return ((await r.json()) as any[]).filter((j:any)=>j.text?.toLowerCase().includes(tl)).slice(0,3).map((j:any)=>({title:j.text,link:j.hostedUrl||'',snippet:`${co} — ${j.categories?.team||''} ${j.categories?.location||''}`,date:j.createdAt?new Date(j.createdAt).toISOString():'',source:`ats:lever:${co}`}));
    } catch { return []; }
  }));
  return res.filter(r=>r.status==='fulfilled').flatMap(r=>(r as any).value);
}

// Requêtes Serper par profil/zone (excluant réseaux sociaux)
function buildSerperQueries(domain:string, profileType:string, zone:string, country:string): string[] {
  const kws=extractKeywords(domain);
  const p1=kws[0]||`"${domain}"`, p2=kws[1]||p1, p3=kws[2]||p2;
  const c=country||'Cameroun', yr='2025 OR 2026';
  const excl='-site:linkedin.com -site:twitter.com -site:facebook.com -site:instagram.com';
  if (profileType==='freelance') {
    if (zone==='local') return [`${p1} freelance mission ${c} ${yr} ${excl}`,`site:upwork.com ${p2}`,`site:malt.fr ${p2}`,`cherche ${p2} freelance ${c} ${excl}`];
    if (zone==='continental') return [`${p1} freelance Afrique remote ${yr} ${excl}`,`site:upwork.com ${p2} Africa`,`site:malt.fr ${p2} Africa`];
    return [`${p1} freelance contract remote ${yr} ${excl}`,`site:upwork.com ${p2}`,`site:toptal.com ${p2}`,`site:contra.com ${p2}`,`site:guru.com ${p2}`,`site:peopleperhour.com ${p2}`,`looking for ${p2} freelance remote ${yr} ${excl}`];
  }
  if (profileType==='job_seeker') {
    if (zone==='local') return [`${p1} emploi ${c} (CDI OR CDD OR stage) ${yr} ${excl}`,`site:jobberman.com ${p2}`,`site:myjobmag.com ${p2}`,`site:brightermonday.com ${p2}`];
    if (zone==='continental') return [`${p1} job Africa ${yr} ${excl}`,`${p2} hiring Cameroon Nigeria Kenya Senegal ${excl}`,`site:fuzu.com ${p2}`];
    return [`${p1} remote job worldwide ${yr} ${excl}`,`site:remoteok.io ${p2}`,`site:weworkremotely.com ${p2}`,`site:wellfound.com ${p2}`,`site:himalayas.app ${p2}`];
  }
  if (profileType==='investor') {
    if (zone==='continental') return [`startup Africa ${p1} funding ${yr} ${excl}`,`site:crunchbase.com Africa ${p2}`,`site:techcabal.com ${p2} funding`];
    return [`site:crunchbase.com ${p1} funding ${yr}`,`startup ${p2} seed funding ${yr} ${excl}`,`venture capital ${p2} ${yr} ${excl}`];
  }
  if (profileType==='business') {
    return [`company needs ${p1} service worldwide ${yr} ${excl}`,`${p2} outsourcing B2B ${yr} ${excl}`,`"partner" OR "vendor" ${p2} ${yr} ${excl}`];
  }
  return [`"${domain}" opportunity ${yr} ${excl}`];
}

// =================================================================
// SCRAPERS ULTRA-HUMANISTES — RÉSEAUX FERMÉS (FAILOVER 3 NIVEAUX)
//
// FONCTIONNEMENT :
//   1. Délai aléatoire entre chaque requête (1-5s)
//   2. User-Agent mobile réel (iPhone/Samsung)
//   3. IP résidentielle tournante (via ScrapingBee/ZenRows)
//   4. Si source 1 bloquée → source 2 → source 3
//   5. Jamais d'arrêt total — toujours une source de secours
// =================================================================

// Délai humain aléatoire — évite la détection de bot
const humanDelay = () => new Promise(r => setTimeout(r, 1200 + Math.random() * 3800));

// User-Agents mobiles réels (iPhone + Samsung + Pixel)
const MOBILE_UAS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Samsung Galaxy S24) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
];
const randomUA = () => MOBILE_UAS[Math.floor(Math.random() * MOBILE_UAS.length)];

// ── ScrapingBee — proxy résidentiel tournant (source 1) ──────────
// Gère les CAPTCHAs, Cloudflare, anti-bots automatiquement
// 1000 crédits gratuits à l'inscription (sans carte bancaire)
async function scrapingBee(url: string, params: Record<string,string> = {}): Promise<string> {
  const key = getScrapingBeeKey();
  if (!key) return '';
  await humanDelay();
  const p = new URLSearchParams({
    api_key:         key,
    url:             url,
    render_js:       'false',          // plus rapide, suffit pour data
    premium_proxy:   'true',           // IP résidentielle
    country_code:    'us',
    device:          'mobile',         // simule mobile
    ...params,
  });
  try {
    const r = await fetch(`https://app.scrapingbee.com/api/v1/?${p}`, {
      headers: { 'User-Agent': randomUA() },
      signal: AbortSignal.timeout(20000),
    });
    if (r.status === 429 || r.status === 403) throw new Error(`ScrapingBee bloqué: ${r.status}`);
    return r.ok ? await r.text() : '';
  } catch (e: any) {
    throw new Error(`ScrapingBee: ${e.message}`);
  }
}

// ── ZenRows — bypass Cloudflare + anti-bot (source 2) ────────────
// Spécialisé dans les sites avec protections agressives
// 1000 crédits gratuits à l'inscription (sans carte bancaire)
async function zenRows(url: string): Promise<string> {
  const key = getZenRowsKey();
  if (!key) return '';
  await humanDelay();
  const p = new URLSearchParams({
    url,
    apikey:           key,
    js_render:        'false',
    premium_proxy:    'true',
    proxy_country:    'us',
  });
  try {
    const r = await fetch(`https://api.zenrows.com/v1/?${p}`, {
      headers: { 'User-Agent': randomUA() },
      signal: AbortSignal.timeout(20000),
    });
    if (r.status === 429 || r.status === 403) throw new Error(`ZenRows bloqué: ${r.status}`);
    return r.ok ? await r.text() : '';
  } catch (e: any) {
    throw new Error(`ZenRows: ${e.message}`);
  }
}

// ── Failover générique — essaie 3 scrapers en cascade ────────────
// Si le premier est bloqué → passe au suivant automatiquement
async function withFailover(
  scrapers: Array<() => Promise<any[]>>,
  sourceName: string,
  log: string[]
): Promise<any[]> {
  for (let i = 0; i < scrapers.length; i++) {
    try {
      const result = await scrapers[i]();
      if (result.length > 0) {
        log.push(`✅ ${sourceName} (source ${i+1}/${scrapers.length}): ${result.length} résultats`);
        return result;
      }
    } catch (e: any) {
      log.push(`⚠️ ${sourceName} source ${i+1} bloquée: ${e.message?.slice(0,60)} → essai source ${i+2}...`);
    }
  }
  log.push(`❌ ${sourceName}: toutes sources bloquées — continué sans interruption`);
  return [];
}

// =================================================================
// LINKEDIN — 3 scrapers en failover
// Source 1: ScrapingBee (résidentiel)
// Source 2: ZenRows (bypass Cloudflare)
// Source 3: Apify (Playwright résidentiel)
// =================================================================
async function linkedInScraper1(term: string, country: string): Promise<any[]> {
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(term)}&location=${encodeURIComponent(country)}&f_TPR=r604800&sortBy=DD`;
  const html = await scrapingBee(url, { render_js: 'true' });
  if (!html) return [];
  // Extraire les titres/liens des offres LinkedIn
  const jobs: any[] = [];
  const titleRe = /<h3[^>]*class="[^"]*job-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi;
  const linkRe  = /<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"[^>]*>/gi;
  const compRe  = /<h4[^>]*class="[^"]*job-search-card__company-name[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi;
  const titles: string[] = [], links: string[] = [], companies: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(html))) titles.push(m[1].replace(/<[^>]+>/g, '').trim());
  while ((m = linkRe.exec(html)))   links.push(m[1].split('?')[0]);
  while ((m = compRe.exec(html)))   companies.push(m[1].replace(/<[^>]+>/g, '').trim());
  for (let i = 0; i < Math.min(titles.length, 15); i++) {
    if (titles[i] && links[i]) jobs.push({ title: titles[i], link: links[i], snippet: `${companies[i]||''} — LinkedIn Job`, date: '', source: 'humanist:linkedin:scrapingbee' });
  }
  return jobs;
}

async function linkedInScraper2(term: string, country: string): Promise<any[]> {
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(term)}&location=${encodeURIComponent(country)}&f_TPR=r604800`;
  const html = await zenRows(url);
  if (!html) return [];
  const jobs: any[] = [];
  const re = /"title":"([^"]+)","entityUrn":"[^"]*","url":"(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && jobs.length < 15) {
    jobs.push({ title: m[1], link: m[2], snippet: 'LinkedIn Job — ZenRows', date: '', source: 'humanist:linkedin:zenrows' });
  }
  return jobs;
}

async function linkedInScraper3(term: string, country: string): Promise<any[]> {
  if (!APIFY_KEY) return [];
  const items = await apifyRun('curious_coder/linkedin-jobs-scraper', { queries: [term], location: country, limit: 15, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } });
  return items.map((j: any) => ({ title: j.title || j.jobTitle || '', link: j.applyUrl || j.jobUrl || j.url || '', snippet: `${j.company || ''} — ${j.location || ''}`, date: j.publishedAt || '', source: 'humanist:linkedin:apify', company: j.company || '', location: j.location || '' })).filter((j: any) => j.link);
}

// =================================================================
// TWITTER/X — 3 scrapers en failover
// Source 1: Nitter (miroir gratuit illimité — zéro blocage)
// Source 2: ScrapingBee (Twitter mobile)
// Source 3: Apify (Playwright résidentiel)
// =================================================================
const NITTER_INSTANCES = [
  'https://nitter.net', 'https://nitter.privacydev.net',
  'https://nitter.poast.org', 'https://nitter.1d4.us',
];

async function twitterScraper1(query: string): Promise<any[]> {
  // Nitter = miroir Twitter sans compte, sans blocage, gratuit illimité
  const instance = NITTER_INSTANCES[Math.floor(Math.random() * NITTER_INSTANCES.length)];
  try {
    const r = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&f=tweets`, {
      headers: { 'User-Agent': randomUA(), Accept: 'text/html' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`Nitter ${r.status}`);
    const html = await r.text();
    const tweets: any[] = [];
    const re = /<div class="tweet-content[^"]*">([\s\S]*?)<\/div>[\s\S]*?<a[^>]*class="[^"]*tweet-link[^"]*"[^>]*href="([^"]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && tweets.length < 20) {
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      const link = `https://twitter.com${m[2]}`;
      if (text.length > 20) tweets.push({ title: text.slice(0, 80), link, snippet: text.slice(0, 300), date: new Date().toISOString(), source: 'humanist:twitter:nitter' });
    }
    return tweets;
  } catch (e: any) { throw new Error(`Nitter: ${e.message}`); }
}

async function twitterScraper2(query: string): Promise<any[]> {
  const url = `https://mobile.twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
  const html = await scrapingBee(url);
  if (!html) return [];
  const tweets: any[] = [];
  const re = /"full_text":"((?:[^"\\]|\\.)*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && tweets.length < 15) {
    const text = m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim();
    if (text.length > 20) tweets.push({ title: text.slice(0, 80), link: `https://twitter.com/search?q=${encodeURIComponent(query)}`, snippet: text.slice(0, 300), date: '', source: 'humanist:twitter:scrapingbee' });
  }
  return tweets;
}

async function twitterScraper3(query: string): Promise<any[]> {
  if (!APIFY_KEY) return [];
  const items = await apifyRun('apify/twitter-scraper', { searchTerms: [query], maxTweets: 20, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } });
  return items.map((t: any) => ({ title: t.text?.slice(0, 80) || 'Tweet', link: t.url || t.twitterUrl || '', snippet: t.text?.slice(0, 300) || '', date: t.createdAt || '', source: 'humanist:twitter:apify' })).filter((t: any) => t.link && t.snippet?.length > 20);
}

// =================================================================
// FACEBOOK — 3 scrapers en failover
// Source 1: ScrapingBee sur mbasic.facebook.com (version ultra-légère)
// Source 2: ZenRows sur m.facebook.com
// Source 3: Apify (Playwright résidentiel)
// =================================================================
async function facebookScraper1(query: string): Promise<any[]> {
  // mbasic.facebook.com = version ultra-légère, zéro JavaScript, anti-bot minimal
  const url = `https://mbasic.facebook.com/search/posts/?q=${encodeURIComponent(query)}&type=post&source=filter&isTrending=0`;
  const html = await scrapingBee(url, { country_code: 'cm' }); // Cameroun IP = moins suspect
  if (!html) return [];
  const posts: any[] = [];
  const re = /<div[^>]*data-ft[^>]*>([\s\S]*?)<\/div>/gi;
  const linkRe = /<a[^>]+href="(https:\/\/www\.facebook\.com\/[^"?]+)[^"]*"[^>]*>/gi;
  const textRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const texts: string[] = [], links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = textRe.exec(html)) && texts.length < 20) texts.push(m[1].replace(/<[^>]+>/g, '').trim());
  while ((m = linkRe.exec(html)) && links.length < 20) links.push(m[1]);
  for (let i = 0; i < Math.min(texts.length, 15); i++) {
    if (texts[i]?.length > 20) posts.push({ title: texts[i].slice(0, 80), link: links[i] || `https://facebook.com/search/posts/?q=${encodeURIComponent(query)}`, snippet: texts[i].slice(0, 300), date: '', source: 'humanist:facebook:scrapingbee' });
  }
  return posts;
}

async function facebookScraper2(query: string): Promise<any[]> {
  const url = `https://mbasic.facebook.com/search/groups/?q=${encodeURIComponent(query)}`;
  const html = await zenRows(url);
  if (!html) return [];
  const posts: any[] = [];
  const re = /<a[^>]+href="(https:\/\/m\.facebook\.com\/groups\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && posts.length < 15) {
    posts.push({ title: m[2].trim(), link: m[1], snippet: `Facebook Group: ${m[2].trim()}`, date: '', source: 'humanist:facebook:zenrows' });
  }
  return posts;
}

async function facebookScraper3(query: string): Promise<any[]> {
  if (!APIFY_KEY) return [];
  const items = await apifyRun('apify/facebook-pages-scraper', { startUrls: [{ url: `https://www.facebook.com/search/posts/?q=${encodeURIComponent(query)}` }], maxPosts: 15, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } });
  return items.map((p: any) => ({ title: p.postText?.slice(0, 80) || 'Facebook Post', link: p.url || p.postUrl || '', snippet: p.postText?.slice(0, 300) || '', date: p.time || '', source: 'humanist:facebook:apify' })).filter((p: any) => p.link && p.snippet?.length > 20);
}

// =================================================================
// INSTAGRAM — 3 scrapers en failover
// Source 1: ScrapingBee hashtags publics
// Source 2: ZenRows
// Source 3: Apify
// =================================================================
async function instagramScraper1(hashtag: string): Promise<any[]> {
  const url = `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`;
  const html = await scrapingBee(url, { render_js: 'true' });
  if (!html) return [];
  const posts: any[] = [];
  const re = /"accessibility_caption":"([^"]+)"[^}]*"shortcode":"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && posts.length < 15) {
    posts.push({ title: m[1].slice(0, 80), link: `https://www.instagram.com/p/${m[2]}/`, snippet: m[1].slice(0, 300), date: '', source: 'humanist:instagram:scrapingbee' });
  }
  return posts;
}

async function instagramScraper2(hashtag: string): Promise<any[]> {
  const url = `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`;
  const html = await zenRows(url);
  if (!html) return [];
  const posts: any[] = [];
  const re = /"shortcode":"([^"]+)"[^}]*"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && posts.length < 15) {
    posts.push({ title: m[2].slice(0, 80), link: `https://www.instagram.com/p/${m[1]}/`, snippet: m[2].slice(0, 300), date: '', source: 'humanist:instagram:zenrows' });
  }
  return posts;
}

async function instagramScraper3(hashtag: string): Promise<any[]> {
  if (!APIFY_KEY) return [];
  const items = await apifyRun('apify/instagram-hashtag-scraper', { hashtags: [hashtag], resultsLimit: 15, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } });
  return items.map((p: any) => ({ title: p.caption?.slice(0, 80) || 'Instagram', link: p.url || `https://instagram.com/p/${p.shortCode}`, snippet: p.caption?.slice(0, 300) || '', date: p.timestamp || '', source: 'humanist:instagram:apify' })).filter((p: any) => p.link && p.snippet?.length > 20);
}

// =================================================================
// UPWORK — 3 scrapers en failover
// =================================================================
async function upworkScraper1(term: string): Promise<any[]> {
  const url = `https://www.upwork.com/search/jobs/?q=${encodeURIComponent(term)}&sort=recency`;
  const html = await scrapingBee(url, { render_js: 'true', wait: '2000' });
  if (!html) return [];
  const jobs: any[] = [];
  const re = /"title":"([^"]+)"[^}]*"ciphertext":"([^"]+)"[^}]*"amount":\{"amount":(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && jobs.length < 15) {
    jobs.push({ title: m[1], link: `https://www.upwork.com/jobs/~${m[2]}`, snippet: `Budget: $${m[3]} — Upwork Job`, date: '', source: 'humanist:upwork:scrapingbee' });
  }
  return jobs;
}

async function upworkScraper2(term: string): Promise<any[]> {
  const url = `https://www.upwork.com/search/jobs/?q=${encodeURIComponent(term)}&sort=recency`;
  const html = await zenRows(url);
  if (!html) return [];
  const jobs: any[] = [];
  const re = /"title":"([^"]+)","type":"[^"]*","ciphertext":"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && jobs.length < 15) {
    jobs.push({ title: m[1], link: `https://www.upwork.com/jobs/~${m[2]}`, snippet: 'Upwork Job — ZenRows', date: '', source: 'humanist:upwork:zenrows' });
  }
  return jobs;
}

async function upworkScraper3(term: string): Promise<any[]> {
  if (!APIFY_KEY) return [];
  const items = await apifyRun('tugkan/upwork-jobs-scraper', { search: term, maxJobs: 15, proxy: { useApifyProxy: true } });
  return items.map((j: any) => ({ title: j.title || '', link: j.url || j.link || '', snippet: j.description?.slice(0, 300) || '', date: j.publishedDate || '', source: 'humanist:upwork:apify' })).filter((j: any) => j.link);
}

// ── Fonctions de failover par plateforme ─────────────────────────
async function scrapeLinkedIn(term: string, country: string, log: string[]): Promise<any[]> {
  return withFailover([
    () => linkedInScraper1(term, country),
    () => linkedInScraper2(term, country),
    () => linkedInScraper3(term, country),
  ], 'LinkedIn', log);
}

async function scrapeTwitter(query: string, log: string[]): Promise<any[]> {
  return withFailover([
    () => twitterScraper1(query),
    () => twitterScraper2(query),
    () => twitterScraper3(query),
  ], 'Twitter/X', log);
}

async function scrapeFacebook(query: string, log: string[]): Promise<any[]> {
  return withFailover([
    () => facebookScraper1(query),
    () => facebookScraper2(query),
    () => facebookScraper3(query),
  ], 'Facebook', log);
}

async function scrapeInstagram(hashtag: string, log: string[]): Promise<any[]> {
  return withFailover([
    () => instagramScraper1(hashtag),
    () => instagramScraper2(hashtag),
    () => instagramScraper3(hashtag),
  ], 'Instagram', log);
}

async function scrapeUpwork(term: string, log: string[]): Promise<any[]> {
  return withFailover([
    () => upworkScraper1(term),
    () => upworkScraper2(term),
    () => upworkScraper3(term),
  ], 'Upwork', log);
}

// =================================================================
// NIVEAU 2 — SOURCES SUPPLÉMENTAIRES (si niveau 1 insuffisant)
// =================================================================

// AngelList/Wellfound public RSS
async function fetchWellfound(term: string): Promise<any[]> {
  const r = await fetch(`https://wellfound.com/role/r/${encodeURIComponent(term)}/rss`,{headers:H,signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  return parseRSS(await r.text(), 'wellfound');
}

// Mastodon hashtag public (gratuit sans auth)
async function fetchMastodonPublic(tag: string): Promise<any[]> {
  const instances=['https://mastodon.social','https://fosstodon.org','https://hachyderm.io'];
  const res=await Promise.allSettled(instances.slice(0,2).map(async inst=>{
    try {
      const r=await fetch(`${inst}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=15`,{signal:AbortSignal.timeout(8000)});
      if (!r.ok) return [];
      return ((await r.json())||[]).map((s:any)=>({title:(s.content||'').replace(/<[^>]+>/g,'').slice(0,80),link:s.url,snippet:(s.content||'').replace(/<[^>]+>/g,'').slice(0,300),date:s.created_at,source:`mastodon:${new URL(inst).hostname}`}));
    } catch { return []; }
  }));
  return res.filter(r=>r.status==='fulfilled').flatMap(r=>(r as any).value);
}

// Bluesky AT Protocol (gratuit sans clé)
async function fetchBluesky(profileType: string, term: string): Promise<any[]> {
  const qMap:Record<string,string>={freelance:`${term} freelance hiring`,job_seeker:`${term} hiring job`,investor:`${term} startup funding`,business:`${term} B2B clients`};
  const q=qMap[profileType]||term;
  const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=20`,{signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  return ((await r.json()).posts||[]).map((p:any)=>({title:(p.record?.text||'').slice(0,80),link:`https://bsky.app/profile/${p.author?.handle}/post/${p.uri?.split('/').pop()||''}`,snippet:(p.record?.text||'').slice(0,300),date:p.record?.createdAt||p.indexedAt||'',source:'bluesky'})).filter((p:any)=>p.link.includes('/post/')&&p.snippet);
}

// GitHub profils (pour talent search, niveau 2)
async function fetchGitHubProfiles(term: string): Promise<any[]> {
  const headers:any={...H,Accept:'application/vnd.github.v3+json'};
  if (GITHUB_TOKEN) headers.Authorization=`token ${GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(term+' in:bio followers:>10')}&sort=followers&order=desc&per_page=15`,{headers,signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  return ((await r.json()).items||[]).map((u:any)=>({title:u.login,link:u.html_url,snippet:`GitHub: ${u.login} — ${u.type}`,date:'',source:'github:profile'}));
}

// Reddit public JSON (gratuit sans clé)
async function fetchReddit(subreddit: string, term: string): Promise<any[]> {
  const r = await fetch(`https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(term)}&sort=new&limit=10&t=week&restrict_sr=1`,{headers:{...H,Accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if (!r.ok) return [];
  return ((await r.json()).data?.children||[]).map((p:any)=>({title:p.data.title,link:`https://reddit.com${p.data.permalink}`,snippet:(p.data.selftext||p.data.title).slice(0,300),date:new Date(p.data.created_utc*1000).toISOString(),source:`reddit:r/${subreddit}`}));
}

// =================================================================
// NIVEAU 3 — APIFY (seulement si budget confirmé ou plan payant)
// =================================================================
async function apifyRun(actorId: string, input: Record<string,any>, timeoutMs=35000): Promise<any[]> {
  if (!APIFY_KEY) return [];
  const key = getApifyKey();
  const run = await (await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,maxItems:20}),signal:AbortSignal.timeout(timeoutMs)})).json();
  const runId=run?.data?.id; if (!runId) return [];
  for (let i=0;i<6;i++) {
    await new Promise(r=>setTimeout(r,5000));
    const s=await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${key}`,{signal:AbortSignal.timeout(8000)})).json();
    if (s?.data?.status==='SUCCEEDED') return await (await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${key}&limit=20`)).json()||[];
    if (['FAILED','ABORTED'].includes(s?.data?.status)) return [];
  }
  return [];
}

async function apifyLinkedIn(term:string, country:string): Promise<any[]> {
  const items=await apifyRun('curious_coder/linkedin-jobs-scraper',{queries:[term],location:country,limit:20,proxy:{useApifyProxy:true}});
  return items.map((j:any)=>({title:j.title||j.jobTitle||'',link:j.applyUrl||j.jobUrl||j.url||'',snippet:`${j.company||''} — ${j.location||''} — ${j.employmentType||''}`,date:j.publishedAt||j.postedAt||'',source:'apify:linkedin',company:j.company||'',location:j.location||''})).filter((j:any)=>j.link);
}
async function apifyUpwork(term:string): Promise<any[]> {
  const items=await apifyRun('tugkan/upwork-jobs-scraper',{search:term,maxJobs:20,proxy:{useApifyProxy:true}});
  return items.map((j:any)=>({title:j.title||'',link:j.url||j.link||'',snippet:j.description?.slice(0,300)||'',date:j.publishedDate||'',source:'apify:upwork'})).filter((j:any)=>j.link);
}
async function apifyMalt(term:string): Promise<any[]> {
  const items=await apifyRun('silentflow/malt-scraper',{keyword:term,country:'FR',maxResults:20,proxy:{useApifyProxy:true}});
  return items.map((j:any)=>({title:j.name||j.title||'',link:j.profileUrl||j.url||'',snippet:`${j.title||''} — ${j.dailyRate||''} — ${j.skills?.slice(0,3).join(', ')||''}`,date:'',source:'apify:malt',location:j.location||''})).filter((j:any)=>j.link);
}
async function apifyFreelancerCom(term:string): Promise<any[]> {
  const items=await apifyRun('getdataforme/freelancer-jobs-scraper',{keyword:term,maxResults:20,proxy:{useApifyProxy:true}});
  return items.map((j:any)=>({title:j.title||'',link:j.url||j.link||'',snippet:`Budget: ${j.budget||'N/A'} — Bids: ${j.bids||0}`,date:j.postedAt||'',source:'apify:freelancer.com'})).filter((j:any)=>j.link);
}
async function apifyPPH(term:string): Promise<any[]> {
  const items=await apifyRun('getdataforme/PeoplePerHour-Job-Scraper',{keyword:term,maxResults:20,proxy:{useApifyProxy:true}});
  return items.map((j:any)=>({title:j.title||'',link:j.url||j.link||'',snippet:j.description?.slice(0,300)||'',date:j.postedAt||'',source:'apify:peopleperhour'})).filter((j:any)=>j.link);
}
async function apifyIndeedGlassdoor(term:string, country:string): Promise<any[]> {
  const items=await apifyRun('truefetch/job-search',{query:term,location:country,sources:['indeed','glassdoor'],maxResults:20,proxy:{useApifyProxy:true}});
  return items.map((j:any)=>({title:j.title||'',link:j.url||j.applyUrl||'',snippet:`${j.company||''} — ${j.location||''} — ${j.salary||''}`,date:j.postedAt||'',source:`apify:${j.source||'indeed'}`,company:j.company||'',location:j.location||''})).filter((j:any)=>j.link);
}
async function apifyJobberman(term:string, country:string): Promise<any[]> {
  // Jobberman = #1 en Afrique ! Nigeria, Ghana, Kenya, South Africa
  const countryMap: Record<string,string> = {
    'nigeria':'ng', 'ghana':'gh', 'kenya':'ke', 'south africa':'za', 'afrique du sud':'za'
  };
  const cc = countryMap[country.toLowerCase()] || 'ng';
  const items=await apifyRun('lucasrgoncalves/jobberman-scraper',{search:term,country:cc,maxResults:20,proxy:{useApifyProxy:true,apifyProxyGroups:['RESIDENTIAL']}});
  return items.map((j:any)=>({title:j.title||'',link:j.url||'',snippet:`${j.company||'Jobberman'} — ${j.location||''} — ${j.salary||''}`,date:j.postedAt||'',source:'apify:jobberman',company:j.company||'',location:j.location||'',applicants_count:j.applicants||0})).filter((j:any)=>j.link);
}
async function apifyJiji(term:string, country:string): Promise<any[]> {
  // Jiji = #1 pour les annonces et petits jobs en Afrique
  const countryMap: Record<string,string> = {
    'nigeria':'ng', 'ghana':'gh', 'kenya':'ke', 'uganda':'ug', 'tanzania':'tz', 'south africa':'za', 'afrique du sud':'za'
  };
  const cc = countryMap[country.toLowerCase()] || 'ng';
  const items=await apifyRun('andrewmhart/jiji-scraper',{search:term,country:cc,maxResults:20,proxy:{useApifyProxy:true,apifyProxyGroups:['RESIDENTIAL']}});
  return items.map((j:any)=>({title:j.title||'',link:j.url||'',snippet:`${j.price?j.price+' — ':''}${j.location||''}`,date:j.postedAt||'',source:'apify:jiji',company:'Jiji',location:j.location||''})).filter((j:any)=>j.link);
}
async function apifyCrunchbase(term:string): Promise<any[]> {
  const items=await apifyRun('apify/crunchbase-scraper',{searchUrl:`https://www.crunchbase.com/discover/organization.companies?field_ids=short_description&query=${encodeURIComponent(term)}`,maxResults:15,proxy:{useApifyProxy:true}});
  return items.map((c:any)=>({title:c.name||'',link:c.cbUrl||c.url||'',snippet:`${c.shortDescription||''} — Funding: ${c.totalFunding||'N/A'}`,date:c.lastFundingAt||'',source:'apify:crunchbase',location:c.location||''})).filter((c:any)=>c.link);
}
async function apifyInstagram(hashtag:string): Promise<any[]> {
  const items=await apifyRun('apify/instagram-hashtag-scraper',{hashtags:[hashtag],resultsLimit:15,proxy:{useApifyProxy:true,apifyProxyGroups:['RESIDENTIAL']}});
  return items.map((p:any)=>({title:p.caption?.slice(0,80)||'Instagram',link:p.url||p.shortCode?`https://instagram.com/p/${p.shortCode}`:'',snippet:p.caption?.slice(0,300)||'',date:p.timestamp||'',source:'apify:instagram'})).filter((p:any)=>p.link&&p.snippet?.length>20);
}
async function apifyTwitter(query:string): Promise<any[]> {
  const items=await apifyRun('apify/twitter-scraper',{searchTerms:[query],maxTweets:20,proxy:{useApifyProxy:true,apifyProxyGroups:['RESIDENTIAL']}});
  return items.map((t:any)=>({title:t.text?.slice(0,80)||'Tweet',link:t.url||t.twitterUrl||'',snippet:t.text?.slice(0,300)||'',date:t.createdAt||'',source:'apify:twitter'})).filter((t:any)=>t.link&&t.snippet?.length>20);
}

// RSS parser Node.js
function parseRSS(xml: string, src: string): any[] {
  const items:any[]=[];
  const tx=(b:string,tag:string)=>{const m=new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,'i').exec(b);return(m?.[1]||'').replace(/<[^>]+>/g,'').trim();};
  const ha=(b:string)=>/<link[^>]+href=["']([^"']+)["']/i.exec(b)?.[1]?.trim()||'';
  const proc=(b:string)=>{const t=tx(b,'title');let l=tx(b,'link')||ha(b);if(!l){const g=tx(b,'guid');if(g.startsWith('http'))l=g;}const s=(tx(b,'description')||tx(b,'summary')||tx(b,'content')).slice(0,400);const d=tx(b,'pubDate')||tx(b,'updated')||tx(b,'published');if(t&&l)items.push({title:t,link:l,snippet:s,date:d,source:`rss:${src}`});};
  let m:RegExpExecArray|null;const ir=/<item[^>]*>([\s\S]*?)<\/item>/gi,er=/<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  while((m=ir.exec(xml)))proc(m[1]);while((m=er.exec(xml)))proc(m[1]);
  return items.slice(0,20);
}

// =================================================================
// SCORING LOCAL — 100% mots-clés, zéro appel réseau
// =================================================================
function scoreLocally(items: any[], profile: any, isPaid: boolean): any[] {
  const kws = extractKeywords(profile.domain || '');
  const terms = [profile.domain?.toLowerCase()||'', ...kws.map((k:string)=>k.toLowerCase().replace(/"/g,''))].filter(t=>t.length>2);
  const type: string = profile.profile_type || 'freelance';

  const pos: Record<string,string[]> = {
    freelance:  ['freelance','contract','mission','project','remote','hiring','looking for','need a','budget','pay','hire','gig','[hiring]','urgent','developer needed','designer needed'],
    job_seeker: ['job','hiring','position','role','career','apply','recruitment','emploi','poste','cdi','cdd','stage','internship','vacancy'],
    investor:   ['startup','funding','investment','seed','series','venture','raise','financement','levée','pitch','fundraising','raising','founder','pre-seed','series a'],
    business:   ['client','b2b','partner','outsource','service','agency','need','vendor','provider','looking for','outsource','needs'],
  };
  const neg: Record<string,string[]> = {
    freelance:  ['[for hire]','i am a ','i\'m a ','my portfolio','available for hire','looking for work','hire me','my rate is','cdi permanent','staff engineer','full-time employee'],
    job_seeker: ['[for hire]','freelance mission','i am looking for work'],
    investor:   ['job posting','apply now','[for hire]','cdi','cdd','hiring','position'],
    business:   ['[for hire]','looking for work','my cv','my resume'],
  };
  const p = pos[type] || [], n = neg[type] || [];

  // Minimum score lower for investor/business to keep more relevant results
  const minScore = ['investor','business'].includes(type) ? 18 : 25;

  return items.map(r => {
    const hay = `${r.title||''} ${r.snippet||''}`.toLowerCase();
    let score = 20;

    const dHits = terms.filter(t=>t.length>3&&hay.includes(t)).length;
    score += Math.min(dHits * 20, 45);
    score += Math.min(p.filter(w=>hay.includes(w)).length * 8, 25);
    score -= n.filter(w=>hay.includes(w)).length * 30;

    const ah = ageH(r.date);
    // 🚨 Filtrage ULTRA pour PROFILS PAYANTS : < 48h (2 jours) !
    if (isPaid) {
      if (ah < 6)    score += 50; // <6h → ULTRA BOOST !
      else if (ah < 12)   score += 40;
      else if (ah < 24)   score += 30;
      else if (ah < 48)   score += 20; // <48h → still good
      else if (ah > 336)  score -= 50; // >2 semaines → trop vieux
    } else {
      if (ah < 6)    score += 12;
      else if (ah < 24)   score += 6;
      else if (ah > 336)  score -= 12;
    }

    // 🚨 Boost pour offres avec <10 candidats !
    if (r.applicants_count !== undefined && r.applicants_count < 10) {
      score += 60; // MEGA BOOST !
    } else if (r.applicants_count !== undefined && r.applicants_count < 20) {
      score += 30;
    }

    // Boost sources fiables (inclure sources investor/business)
    const src = (r.source||'').toLowerCase();
    const trustedSources = [
      'apify:linkedin','apify:upwork','apify:malt','apify:freelancer','apify:peopleperhour','apify:indeed',
      'api:remotive','api:himalayas','api:arbeitnow','api:adzuna','ats:greenhouse','ats:lever',
      'exa.ai','tavily','brave','producthunt','wellfound','crunchbase','techcabal','reddit:startups','reddit:entrepreneur'
    ];
    if (trustedSources.some(s=>src.includes(s))) score += 10;

    // Boost FORT pour les sources à revenus élevés (priorité dans les slots gratuits)
    // Ces sources ont les missions avec les meilleurs budgets → l'utilisateur peut payer l'abonnement
    const highValueSources = [
      'upwork','malt','freelancer','peopleperhour','contra','toptal','remotive','himalayas','crunchbase','wellfound','producthunt'
    ];
    if (highValueSources.some(s=>src.includes(s))) score += 18;

    // Niveau de compétence requis vs niveau réel de l'utilisateur (évalué
    // par IA, voir skill-matching.ts) — même logique que cache-scan/route.ts
    const requiredLevel = detectRequiredLevel(r.title || '', r.snippet || '');
    const levelMatch = computeLevelMatch(profile.skill_level, requiredLevel);
    score += levelMatch.boost;

    score = Math.max(0, Math.min(100, score));
    if (score < minScore) return null;

    return {
      title:           (r.title||'Opportunité').slice(0,200),
      company:         (r.company||r.source||'').slice(0,150),
      location:        (r.location||'').slice(0,120),
      country:         profile.country||'',
      score,
      match_reason:    dHits>0 ? `${dHits} terme(s) du domaine "${profile.domain}" trouvé(s). ${p.filter(w=>hay.includes(w)).length} signal(aux) positif(s).${r.applicants_count ? ` ${r.applicants_count} candidats !` : ''}` : `Signal ${type} détecté.`,
      source_platform: r.source||'web',
      original_url:    r.link||'',
      is_foreign:      false,
      is_suspicious:   false,
      salary_min:      0,
      salary_max:      0,
      currency:        'USD',
      hours_ago:       ah||24,
      applicants_count: r.applicants_count, // Stocke le nb de candidats !
      required_level:  requiredLevel,
      recommended:     levelMatch.recommended,
    };
  }).filter(Boolean).sort((a:any,b:any)=>b.score-a.score);
}

// =================================================================
// ORCHESTRATEUR EN CASCADE
// Chaque niveau ne se lance que si le précédent est insuffisant.
// Si un outil plante → les autres continuent (safe() gère ça).
// Zéro crédit Apify gaspillé en phase de test.
// =================================================================

// =================================================================
// MATRICE SOURCES PAR PROFIL
// Chaque source n'est interrogée QUE si elle est pertinente
// pour le type de profil et la zone demandée.
// =================================================================
//
// job_seeker  → emploi salarié : job boards, ATS, LinkedIn emploi, Adzuna, Remotive, Glassdoor
// freelance   → missions : Upwork, Malt, Freelancer, Contra, PPH, Reddit slavelabour, HN
// investor    → projets à financer : Crunchbase, AngelList, ProductHunt, startups news, Reddit startups
// business    → clients B2B : LinkedIn Business, Facebook, Instagram, Opportunity Creator, Wellfound
//
// Sources universelles (tous profils) :
//   Serper, DuckDuckGo, Exa.ai, Tavily, GitHub Issues (bounty/paid)
//
// =================================================================

async function orchestrate(
  profileType: string, domain: string, zone: string, country: string,
  hasBudget: boolean, isPaid: boolean,
  log: string[]
): Promise<{ items: any[]; metrics: Record<string,number> }> {

  const kws    = extractKeywords(domain);
  const term   = (kws[1]||kws[0]||domain).replace(/"/g,'');
  const term2  = (kws[2]||kws[1]||domain).replace(/"/g,'');
  const serperQ = buildSerperQueries(domain, profileType, zone, country);

  const isJobSeeker  = profileType === 'job_seeker';
  const isFreelance  = profileType === 'freelance';
  const isInvestor   = profileType === 'investor';
  const isBusiness   = profileType === 'business';

  // Plan payant = toutes les sources pertinentes pour son profil (pas de limite)
  // Plan gratuit = sources de base seulement
  const fullSources = isPaid || hasBudget;

  log.push(`\n🔑 Profil: ${profileType} | Domaine: "${domain}" | Zone: ${zone} | Plan payant: ${isPaid}`);
  log.push(`📋 NIVEAU 1 — Sources universelles + sources spécifiques au profil ${profileType}`);

  // ── SOURCES UNIVERSELLES (tous profils, toujours) ─────────────
  const universalCalls: Promise<any[]>[] = [];
  
  // --- SEULEMENT POUR PROFILS PAYANTS : APIs avec crédits ---
  if (isPaid) {
    universalCalls.push(safe('Serper',     () => Promise.all(serperQ.slice(0, 6).map(q => serper(q))).then(r => r.flat()), log));
    universalCalls.push(safe('Exa.ai',     () => exaSearch(term, profileType), log));
    universalCalls.push(safe('Tavily',     () => tavilySearch(`${term} ${isFreelance ? 'freelance mission remote' : isInvestor ? 'startup funding seed' : isBusiness ? 'B2B service client' : 'job hiring'}`), log));
  }
  
  // --- POUR TOUS LES PROFILS : SOURCES 100% GRATUITES ---
  universalCalls.push(safe('DuckDuckGo', () => duckduckgoSearch(`${term} ${isFreelance ? 'freelance hiring' : isInvestor ? 'startup funding' : isBusiness ? 'B2B client' : 'job opportunity'} ${zone === 'local' ? country : ''}`), log));
  universalCalls.push(safe('GitHub',     () => fetchGitHub(term), log));
  universalCalls.push(safe('Massive-Sources', () => fetchAllSources(term, log, isPaid), log));

  // ── SOURCES JOB SEEKER (emploi salarié) ───────────────────────
  // Job boards, ATS, Adzuna, Remotive, Arbeitnow, Himalayas
  const jobSeekerCalls = isJobSeeker ? [
    safe('Remotive',   () => fetchRemotive(term), log),
    safe('Arbeitnow',  () => fetchArbeitnow(term), log),
    safe('Himalayas',  () => fetchHimalayas(term), log),
    safe('Adzuna',     () => fetchAdzuna(term, country), log),
    safe('ATS-GH',     () => fetchGreenhouseATS(term), log),
    safe('ATS-Lever',  () => fetchLeverATS(term), log),
    safe('HackerNews', () => fetchHN(term), log),
    safe('Jooble',     () => joobleSearch(term, zone === 'local' ? country : zone === 'continental' ? 'Africa' : ''), log),
    safe('Wizbii',     () => wizbiiSearch(term), log),
    safe('Jobberman',  () => apifyJobberman(term, country), log),
    safe('Jiji',       () => apifyJiji(term, country), log),
    safe('Reddit-jobs',() => fetchReddit('jobs', term), log),
    safe('Reddit-remote',()=> fetchReddit('remotework', term), log),
  ] : [];

  // ── SOURCES FREELANCE (missions, clients) ─────────────────────
  // Upwork via Serper, HN Who's Hiring, Reddit slavelabour, DevTo
  const freelanceCalls = isFreelance ? [
    safe('HackerNews', () => fetchHN(term), log),
    safe('DevTo',      () => fetchDevTo(term), log),
    safe('Reddit-SL',  () => fetchReddit('slavelabour', term), log),
    safe('Reddit-hire',() => fetchReddit('hiring', term), log),
    safe('Jooble',     () => joobleSearch(term, zone === 'local' ? country : ''), log),
    safe('Wizbii',     () => wizbiiSearch(term), log),
    safe('Jobberman',  () => apifyJobberman(term, country), log),
    safe('Jiji',       () => apifyJiji(term, country), log),
  ] : [];

  // ── SOURCES INVESTOR (startups, projets à financer) ───────────
  // ProductHunt, Wellfound, Reddit startups, Mastodon, Bluesky
  const investorCalls = isInvestor ? [
    safe('ProductHunt',() => fetchProductHunt('investor', term), log),
    safe('Wellfound',  () => fetchWellfound(term), log),
    safe('Reddit-ST',  () => fetchReddit('startups', term), log),
    safe('Reddit-EN',  () => fetchReddit('Entrepreneur', term), log),
    safe('Mastodon',   () => fetchMastodonPublic('startup'), log),
    safe('Bluesky',    () => fetchBluesky('investor', term), log),
  ] : [];

  // ── SOURCES BUSINESS OWNER (clients B2B) ──────────────────────
  // ProductHunt, Reddit entrepreneur, Mastodon, Bluesky, DevTo
  const businessCalls = isBusiness ? [
    safe('ProductHunt',() => fetchProductHunt('business', term), log),
    safe('Wellfound',  () => fetchWellfound(term), log),
    safe('Reddit-EN',  () => fetchReddit('Entrepreneur', term), log),
    safe('DevTo',      () => fetchDevTo(term), log),
    safe('Mastodon',   () => fetchMastodonPublic('remotework'), log),
    safe('Bluesky',    () => fetchBluesky('business', term), log),
  ] : [];

  // ── Lancer tout en parallèle ──────────────────────────────────
  const allLevel1Results = await Promise.all([
    ...universalCalls,
    ...jobSeekerCalls,
    ...freelanceCalls,
    ...investorCalls,
    ...businessCalls,
  ]);

  const level1 = dedup(allLevel1Results.flat());
  log.push(`📊 Niveau 1 total: ${level1.length} résultats uniques`);

  // ── NIVEAU 2 — sources complémentaires si insuffisant ─────────
  let level2Items: any[] = [];
  if (level1.length < LEVEL1_MIN) {
    log.push(`\n⚡ NIVEAU 2 — ${level1.length} < ${LEVEL1_MIN} → sources complémentaires`);

    const level2Calls: Promise<any[]>[] = [
      safe('GitHub-Pro', () => fetchGitHubProfiles(term), log),
    ];

    if (isJobSeeker || isFreelance) {
      level2Calls.push(safe('Mastodon', () => fetchMastodonPublic('remotework'), log));
      level2Calls.push(safe('Bluesky',  () => fetchBluesky(profileType, term), log));
    }
    if (isInvestor || isBusiness) {
      level2Calls.push(safe('Mastodon', () => fetchMastodonPublic('startup'), log));
      level2Calls.push(safe('Bluesky',  () => fetchBluesky(profileType, term), log));
    }

    const level2Results = await Promise.all(level2Calls);
    level2Items = dedup(level2Results.flat());
    log.push(`📊 Niveau 2 total: ${level2Items.length} résultats supplémentaires`);
  } else {
    log.push(`✅ Niveau 1 suffisant (${level1.length} >= ${LEVEL1_MIN}) → Niveau 2 ignoré`);
  }

  const afterLevel2 = dedup([...level1, ...level2Items]);

  // ── NIVEAU 3 — Scrapers humanistes + Apify ────────────────────
  // --- UNIQUEMENT POUR LES PROFILS PAYANTS !!! ---
  let apifyItems: any[] = [];
  const needLevel3 = isPaid; // Seuls les payants ont droit au niveau 3
  
  if (needLevel3) {
    const hasScrapers = SCRAPINGBEE_KEYS.length > 0 || ZENROWS_KEYS.length > 0 || APIFY_KEY;
    if (hasScrapers) {
      log.push(`\n💰 NIVEAU 3 — Scrapers humanistes failover (Plan payant actif)`);

      const kw = term;
      const humanistCalls: Promise<any[]>[] = [];

      // JOB SEEKER → LinkedIn emploi, Indeed/Glassdoor
      if (isJobSeeker) {
        humanistCalls.push(scrapeLinkedIn(kw, country, log));
        if (APIFY_KEY) {
          humanistCalls.push(safe('Apify-Indeed', () => apifyIndeedGlassdoor(kw, country), log));
        }
      }

      // FREELANCE → LinkedIn + Upwork + Facebook groupes + Malt + Freelancer + PPH
      if (isFreelance) {
        humanistCalls.push(scrapeLinkedIn(kw, country, log));
        humanistCalls.push(scrapeUpwork(kw, log));
        humanistCalls.push(scrapeFacebook(`${kw} freelance mission`, log));
        if (APIFY_KEY) {
          humanistCalls.push(safe('Apify-Malt',       () => apifyMalt(kw), log));
          humanistCalls.push(safe('Apify-Freelancer',  () => apifyFreelancerCom(kw), log));
          humanistCalls.push(safe('Apify-PPH',         () => apifyPPH(kw), log));
        }
      }

      // INVESTOR → LinkedIn startups + Facebook business + Crunchbase + Instagram
      if (isInvestor) {
        humanistCalls.push(scrapeLinkedIn(`${kw} startup`, country, log));
        humanistCalls.push(scrapeFacebook(`${kw} startup funding`, log));
        humanistCalls.push(scrapeInstagram('startupfunding', log));
        if (APIFY_KEY) {
          humanistCalls.push(safe('Apify-Crunchbase', () => apifyCrunchbase(kw), log));
        }
      }

      // BUSINESS → LinkedIn + Facebook groupes + Instagram
      if (isBusiness) {
        humanistCalls.push(scrapeLinkedIn(`${kw} client B2B`, country, log));
        humanistCalls.push(scrapeFacebook(`${kw} client business`, log));
        humanistCalls.push(scrapeInstagram('businessgrowth', log));
      }

      // Twitter/X → tous profils (opportunités cachées, annonces temps réel)
      humanistCalls.push(scrapeTwitter(`${kw} ${
        isFreelance ? 'freelance hiring'    :
        isInvestor  ? 'startup raising'     :
        isBusiness  ? 'B2B service needed'  :
                    'hiring'
      } ${zone === 'local' ? country : 'remote'}`, log));

      const humanistResults = await Promise.allSettled(humanistCalls);
      apifyItems = dedup(
        humanistResults
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => (r as any).value)
      );
      log.push(`📊 Niveau 3 total: ${apifyItems.length} résultats (scrapers humanistes)`);
    } else {
      log.push(`\nℹ️ Scrapers humanistes non configurés — manque des clés API (ScrapingBee/ZenRows/Apify)`);
    }
  } else {
    log.push(`\nℹ️ Plan gratuit — Niveau 3 désactivé (utilisez un plan payant pour accéder aux sources premium)`);
  }

  const all = dedup([...afterLevel2, ...apifyItems]);

  // Métriques pour l'UI
  const metrics: Record<string,number> = {
    serper:   allLevel1Results[0]?.length || 0,
    ddg:      allLevel1Results[1]?.length || 0,
    exa:      allLevel1Results[2]?.length || 0,
    tavily:   allLevel1Results[3]?.length || 0,
    jooble:   level1.filter((r:any) => r.source === 'api:jooble' || r.source === 'api:wizbii').length,
    free_api: level1.filter((r:any) => ['api:','ats:','hackernews'].some(s => (r.source||'').startsWith(s))).length,
    social:   level1.filter((r:any) => ['reddit:','mastodon:','bluesky'].some(s => (r.source||'').startsWith(s))).length,
    apify:    apifyItems.length,
    level2:   level2Items.length,
    total:    all.length,
  };

  log.push(`\n═══════════════════════════════════`);
  log.push(`📈 RÉSUMÉ ORCHESTRATEUR`);
  log.push(`  Serper:   ${metrics.serper}`);
  log.push(`  DDG:      ${metrics.ddg}`);
  log.push(`  Exa.ai:   ${metrics.exa}`);
  log.push(`  Tavily:   ${metrics.tavily}`);
  log.push(`  Jooble:   ${metrics.jooble}`);
  log.push(`  APIs:     ${metrics.free_api}`);
  log.push(`  Social:   ${metrics.social}`);
  log.push(`  Apify:    ${metrics.apify}`);
  log.push(`  TOTAL:    ${all.length} uniques`);

  return { items: all, metrics };
}


// =================================================================
// HANDLER PRINCIPAL — POST /api/scan
// Corps : { userId, zone?, has_budget? }
// Rate limiting : max 3 scans simultanés pour protéger l'infra
// =================================================================

// Compteur de scans actifs (en mémoire — simple mais efficace pour l'infra carton)
let _activeScans = 0;
const MAX_CONCURRENT_SCANS = 3;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId, zone = 'continental', has_budget = false } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  // ── Le fondateur n'a aucune restriction (maintenance, quotas, rate
  // limit) — vérifié en premier pour pouvoir bypasser tout le reste. ──
  const { data: roleCheck } = await supabaseAdmin
    .from('users_profiles').select('role').eq('id', userId).single();
  const callerIsFounder = roleCheck?.role === 'founder';

  // ── Mode maintenance (Founder dashboard) ────────────────────────
  if (!callerIsFounder) {
    const { data: maintenanceSetting } = await supabaseAdmin
      .from('app_settings').select('value').eq('key', 'MAINTENANCE_MODE').single();
    if (maintenanceSetting?.value === 'true') {
      return res.status(503).json({
        error: 'Searcher Connector est en maintenance. Réessaie dans quelques minutes.',
        maintenance: true,
      });
    }
  }

  // ── Rate limiting ─────────────────────────────────────────────
  if (!callerIsFounder && _activeScans >= MAX_CONCURRENT_SCANS) {
    return res.status(429).json({
      error: 'Le moteur est occupé avec d\'autres scans. Réessaie dans 30 secondes.',
      retry_after: 30,
      active_scans: _activeScans,
    });
  }

  _activeScans++;
  const releaseSlot = () => { _activeScans = Math.max(0, _activeScans - 1); };

  // Anti-rafale : 5 requêtes/minute max par utilisateur (le quota journalier
  // ci-dessous protège le volume, ceci protège contre le flood/double-clic)
  if (!callerIsFounder && !checkRateLimit(`scan:${userId}`, 5, 60_000)) {
    releaseSlot();
    return res.status(429).json({ error: 'Trop de scans lancés d\'un coup. Attends une minute.' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? supabaseAdmin
    : token
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
      : supabaseAdmin;

  const log: string[] = [];
  const startedAt = Date.now();

  try {
    // ── Profil (bypass RLS garanti) ───────────────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users_profiles').select('*').eq('id', userId).single();
    if (profileError || !profile)
      return res.status(404).json({ error: 'Profil introuvable. Complète ton profil avant le scan.', detail: profileError?.message });

    const profileType: string = profile.profile_type || 'freelance';
    const domain:      string = profile.domain  || 'developer';
    const country:     string = profile.country || 'Cameroun';
    const plan:        string = profile.plan    || 'free';

    // ── Scan gratuit / payant activable depuis le dashboard Founder ──
    // (le fondateur bypass ce toggle — il doit pouvoir tester même
    // quand les scans sont désactivés pour tout le monde)
    if (!callerIsFounder) {
      const scanToggleKey = plan === 'free' ? 'FREE_SCAN_ENABLED' : 'PAID_SCAN_ENABLED';
      const { data: scanToggle } = await supabaseAdmin
        .from('app_settings').select('value').eq('key', scanToggleKey).single();
      if (scanToggle?.value === 'false') {
        releaseSlot();
        return res.status(503).json({ error: 'Les scans sont temporairement désactivés pour ton plan. Réessaie plus tard.' });
      }
    }

    if (!profile.domain || !profile.country)
      return res.status(400).json({ error: 'Complète ton domaine et ton pays dans les paramètres avant le scan.' });

    // Plan payant → accès complet automatique. Le fondateur (role==='founder')
    // n'a aucune restriction quel que soit son `plan` en base.
    const isFounder       = profile.role === 'founder';
    const isPaid          = isFounder || ['starter', 'pro', 'enterprise'].includes(plan);
    // Budget : confirmé par SCAI OU plan payant OU stocké dans le profil
    const hasBudgetEff   = has_budget === true || has_budget === 'true' || isPaid
                        || (profile.search_preferences as any)?.has_budget === true;

    // ── Quota quotidien par plan ────────────────────────────────
    // Gratuit : 1 scan/jour · Starter : 10 scans/jour · Pro : illimité
    // (voir Pricing.tsx) — le fondateur n'a pas de limite.
    const DAILY_QUOTAS: Record<string, number> = {
      free: 1, starter: 10, pro: 9999, enterprise: 9999
    }
    const dailyLimit = isFounder ? 9999 : (DAILY_QUOTAS[plan] || 1)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { count: scansToday } = await supabaseAdmin
        .from('agent_actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', 'search_scan')
        .gte('created_at', `${today}T00:00:00`)
      if ((scansToday || 0) >= dailyLimit) {
        releaseSlot()
        return res.status(429).json({
          error: `Quota atteint — ${dailyLimit} scan(s)/jour sur le plan ${plan}. Revient demain ou passe à un plan supérieur.`,
          quota_used: scansToday,
          quota_limit: dailyLimit,
          plan,
          upgrade_url: '/pricing',
        })
      }
    } catch { /* non-bloquant — si erreur on laisse passer */ }

    log.push(`🚀 SCAN v6.1 | ${profile.full_name} | ${profileType} | zone: ${zone} | budget: ${hasBudgetEff} | plan: ${plan}`);

    // ── Try Cache Pool First ─────────────────────────────────────
    // Catégories du cache partagé pertinentes pour les domaines de
    // l'utilisateur (jusqu'à 3), alimenté par le scan de fond —
    // scheduler.js → /api/cache-scan
    const categories = matchCategoriesForUser(profile.domains, domain, profileType);
    try {
      const cachedOpportunities = (await cache.getOpportunities({
        categories,
        sourceType: isPaid ? undefined : 'free',
        excludeSeenByUserId: userId,
        limit: isPaid ? 200 : 100
      })) as any[];
      
      // Seuil bas volontairement (le cache démarre vide) — à remonter vers ~100
      // une fois le scheduler tourné assez longtemps pour densifier chaque catégorie.
      const MIN_CACHE_RESULTS = 20;
      if (cachedOpportunities && cachedOpportunities.length >= MIN_CACHE_RESULTS) {
        log.push(`⚡ [CACHE POOL HIT] ${cachedOpportunities.length} opportunités depuis le Cache Pool Intelligent`);
        
        // Convert to the format expected by the rest of the code
        const allItems = cachedOpportunities.map(o => ({
          title: o.title,
          company: o.company || '',
          location: o.location || '',
          link: o.original_url,
          snippet: o.description || '',
          date: o.published_at,
          source: o.source_platform,
          applicants_count: o.applicants_count,
          score: o.freshness_score || 50
        }));
        
        // ── Filtre temporel ───────────────────────────────────────────
        // Free: max 30j; Paid: max 2 JOURS (ULTRA FRAIS!)
        const maxDays = isPaid ? 2 : 30;
        const fresh = dedup(allItems).filter(r => {
          if (!r.date) return true;
          const ts = new Date(r.date).getTime();
          return isNaN(ts) || ts >= Date.now() - maxDays * 86400000;
        });

        // ── Scoring local (zéro appel réseau) ─────────────────────────
        const scored = scoreLocally(fresh, profile, isPaid);
        log.push(`\n✅ ${scored.length} opportunités scorées depuis le Cache Pool`);
        log.push(`🕐 Durée totale: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);

        // ── Sauvegarde Supabase ───────────────────────────────────────
        if (scored.length > 0) {
          const rows = scored.map((o: any) => ({
            user_id:         userId,
            title:           o.title,
            company:         o.company || '',
            location:        o.location || '',
            country:         o.country || country,
            score:           o.score,
            match_reason:    o.match_reason || '',
            source_platform: o.source_platform || 'web',
            original_url:    o.original_url || '',
            is_foreign:      false,
            is_suspicious:   false,
            hours_ago:       o.hours_ago || 0,
            salary_min:      0,
            salary_max:      0,
            currency:        'USD',
            status:          'found',
            required_level:  o.required_level || null,
            recommended:     !!o.recommended,
            created_at:      new Date().toISOString(),
          }));
          let { error: insertErr } = await dbClient.from('opportunities').insert(rows);
          // required_level/recommended n'existent que si la migration
          // add_skill_level_matching.sql est appliquée — retry sans ces
          // champs plutôt que de perdre TOUT le résultat du scan.
          if (insertErr && /required_level|recommended/.test(insertErr.message)) {
            const stripped = rows.map(({ required_level, recommended, ...rest }: any) => rest);
            ({ error: insertErr } = await dbClient.from('opportunities').insert(stripped));
          }
          if (insertErr) log.push(`⚠️ Insert Supabase: ${insertErr.message}`);
        }

        // ── Log agent_actions ─────────────────────────────────────────
        try {
          await dbClient.from('agent_actions').insert({
            user_id:      userId,
            action_type:  'search_scan',
            result:       `Scan v6.1 terminé avec Cache Pool. ${scored.length} opportunités.`,
            success:      true,
            execution_ms: Date.now() - startedAt,
          });
        } catch (_) {}

        // ── Notification ──────────────────────────────────────────────
        try {
          await dbClient.from('notifications').insert({
            user_id:    userId,
            type:       'scan_complete',
            title:      '⚡ Scan terminé (Cache Pool)',
            message:    `${scored.length} opportunités trouvées.`,
            is_read:    false,
            created_at: new Date().toISOString(),
          });
        } catch (_) {}

        // ── Affichage conditionnel : Free = 8, Paid = tout ────────────
        const maxVisible    = isPaid ? PAID_VISIBLE : FREE_VISIBLE;
        const visible       = scored.slice(0, maxVisible);
        const locked        = scored.slice(maxVisible);
        const lockedCount   = locked.length;
        
        // Mark these opportunities as seen by the user
        for (const o of cachedOpportunities) {
          try { await cache.markOpportunityAsSeen(userId, o.id, 'seen'); } catch (_) {}
        }

        const topScore   = scored[0]?.score || 0
        const freshCount = scored.filter((o:any) => o.hours_ago < 24).length
        const careerMessage = getCareerMessage(scored.length, lockedCount, profileType, topScore, freshCount)
        // Pas d'email ici : l'utilisateur vient de déclencher ce scan lui-même,
        // il voit le résultat à l'écran instantanément. La notification in-app
        // (ci-dessus) suffit — un email par scan exploserait le volume à l'échelle
        // (1000+ utilisateurs pouvant scanner plusieurs fois/jour).

        log.push(`🎉 SCAN v6.1 TERMINÉ (CACHE POOL) | found:${scored.length} | visible:${visible.length} | locked:${lockedCount} | ${((Date.now()-startedAt)/1000).toFixed(1)}s`);
        
        return res.status(200).json({
          success:      true,
          found:        scored.length,
          returned:     visible.length,
          autoApplied:  0,
          locked_count: lockedCount,
          locked_message: lockedCount > 0 ? careerMessage : null,
          locked_cta:   lockedCount > 0 ? `/pricing` : null,
          has_budget:   hasBudgetEff,
          plan,
          zone,
          profileType,
          execution_ms: Date.now() - startedAt,
          scan_log:     log,
          sourcesScanned: {
            serper: 0,
            ddg: 0,
            exa: 0,
            tavily: 0,
            jooble: 0,
            apis: 0,
            social: 0,
            apify: 0,
            total: cachedOpportunities.length,
            reddit: 0,
            mastodon: 0,
            bluesky: 0,
            telegram: 0,
            github: 0,
            hackernews: 0,
            extra: 0,
            rss: 0,
            ats: 0,
            sourcesTouched: cachedOpportunities.length,
          },
          results: visible,
          locked_preview: lockedCount > 0 ? locked.slice(0, 5).map((o: any) => ({
            title_preview: o.title?.slice(0, 25) + '...',
            score:         o.score,
            source_platform: o.source_platform,
            is_locked:     true,
          })) : [],
        });
      }
    } catch (cacheErr) {
      log.push(`⚠️ Cache Pool indisponible ou vide — scan complet`);
      // Continue to regular scan flow if cache fails or is empty
    }

    // ── Nettoyer les anciennes opportunités (non-bloquant) ────────
    dbClient.from('opportunities').delete().eq('user_id', userId).then(() => {}, () => {});

    // ── Cache MongoDB EQUILIBRÉ : Fraîcheur + économie ────────
    // Pour plans gratuits: 1H DE CACHE (suffisamment frais pour les devs !)
    // Pour plans payants: 15MIN DE CACHE (TRES frais !)
    const cacheKey = `scan_v6_${profileType}_${zone}_${domain.toLowerCase()}_${country.toLowerCase()}_${hasBudgetEff ? 'paid' : 'free'}`;
    let allItems: any[]                    = [];
    let metrics:  Record<string, number>   = {};

    try {
      const db         = await getMongo();
      const useCache = true; // Toujours utiliser le cache pour économiser !
      const cacheDuration = isPaid ? 15 * 60 * 1000 : 60 * 60 * 1000; // 15min paid, 1h free !
      const cacheThreshold = new Date(Date.now() - cacheDuration);
      const cached = useCache ? await db.collection('scan_cache').findOne({ key: cacheKey, timestamp: { $gt: cacheThreshold } }) : null;

      if (cached && (cached.items as any[])?.length > 0) {
        log.push(`⚡ [CACHE HIT] ${(cached.items as any[]).length} résultats depuis MongoDB (${isPaid ? '15min' : '1h'} cache)`);
        allItems = cached.items as any[];
        metrics  = (cached.metrics as Record<string, number>) || {};
      } else {
        log.push(`📡 [CACHE MISS${!useCache ? ' (plan payant, pas de cache)' : ''}] Lancement de l'orchestrateur...`);
        const result = await orchestrate(profileType, domain, zone, country, hasBudgetEff, isPaid, log);
        allItems = result.items;
        metrics  = result.metrics;
        if (allItems.length > 0 && useCache) // Sauvegarder le cache !
          await db.collection('scan_cache').updateOne(
            { key: cacheKey },
            { $set: { key: cacheKey, items: allItems, metrics, log, timestamp: new Date() } },
            { upsert: true }
          );
      }
    } catch (mongoErr) {
      log.push(`⚠️ MongoDB indisponible — scan sans cache`);
      const result = await orchestrate(profileType, domain, zone, country, hasBudgetEff, isPaid, log);
      allItems = result.items;
      metrics  = result.metrics;
    }

    // ── Filtre temporel ───────────────────────────────────────────
    // Free: max 30j; Paid: max 2 JOURS (ULTRA FRAIS!)
    const maxDays = isPaid ? 2 : 30;
    const fresh = dedup(allItems).filter(r => {
      if (!r.date) return true;
      const ts = new Date(r.date).getTime();
      return isNaN(ts) || ts >= Date.now() - maxDays * 86400000;
    });

    // ── Scoring local (zéro appel réseau) ─────────────────────────
    const scored = scoreLocally(fresh, profile, isPaid);
    log.push(`\n✅ ${scored.length} opportunités scorées (score >= 25)`);
    log.push(`🕐 Durée totale: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);

    // ── Sauvegarde Supabase ───────────────────────────────────────
    if (scored.length > 0) {
      const rows = scored.map((o: any) => ({
        user_id:         userId,
        title:           o.title,
        company:         o.company || '',
        location:        o.location || '',
        country:         o.country || country,
        score:           o.score,
        match_reason:    o.match_reason || '',
        source_platform: o.source_platform || 'web',
        original_url:    o.original_url || '',
        is_foreign:      false,
        is_suspicious:   false,
        hours_ago:       o.hours_ago || 0,
        salary_min:      0,
        salary_max:      0,
        currency:        'USD',
        status:          'found',
        required_level:  o.required_level || null,
        recommended:     !!o.recommended,
        created_at:      new Date().toISOString(),
      }));
      let { error: insertErr } = await dbClient.from('opportunities').insert(rows);
      // Fallback si la migration add_skill_level_matching.sql n'est pas
      // encore appliquée (colonnes absentes) — ne jamais perdre le scan.
      if (insertErr && /required_level|recommended/.test(insertErr.message)) {
        const stripped = rows.map(({ required_level, recommended, ...rest }: any) => rest);
        ({ error: insertErr } = await dbClient.from('opportunities').insert(stripped));
      }
      if (insertErr) log.push(`⚠️ Insert Supabase: ${insertErr.message}`);
    }

    // ── AUTO-CLEANUP: Supprimer les vieux résultats (7+ jours) ─────────────
    // Excepté les résultats fréquemment consultés (vue >10 fois)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await dbClient.from('opportunities')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', sevenDaysAgo)
        .lt('view_count', 10); // Conserver les résultats consultés >10 fois
      log.push(`🧹 Nettoyage: Supprimé les résultats >7 jours et <10 vues`);
    } catch (cleanupErr) {
      log.push(`⚠️ Nettoyage échoué: ${(cleanupErr as any)?.message}`);
    }

    // ── Log agent_actions ─────────────────────────────────────────
    try {
      await dbClient.from('agent_actions').insert({
        user_id:      userId,
        action_type:  'search_scan',
        result:       `Scan v6.1 terminé. ${scored.length} opportunités. Sources: Serper:${metrics.serper||0} DDG:${metrics.ddg||0} Exa:${metrics.exa||0} Tavily:${metrics.tavily||0} Jooble:${metrics.jooble||0} APIs:${metrics.free_api||0} Apify:${metrics.apify||0} Total:${metrics.total||0}`,
        success:      true,
        execution_ms: Date.now() - startedAt,
      });
    } catch (_) {}

    // ── Notification ──────────────────────────────────────────────
    try {
      await dbClient.from('notifications').insert({
        user_id:    userId,
        type:       'scan_complete',
        title:      '⚡ Scan terminé',
        message:    `${scored.length} opportunités trouvées. ${scored.filter((o:any)=>o.hours_ago<24).length} fraîches (<24h). Sources analysées: ${metrics.total||0}.`,
        is_read:    false,
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    // ── Affichage conditionnel : Free = 8, Paid = tout ────────────
    const maxVisible    = isPaid ? PAID_VISIBLE : FREE_VISIBLE;
    const visible       = scored.slice(0, maxVisible);
    const locked        = scored.slice(maxVisible);
    const lockedCount   = locked.length;

    // Métriques recalculées depuis les items réels
    const realMetrics = {
      serper:     allItems.filter((r:any) => r.source === 'serper').length,
      ddg:        allItems.filter((r:any) => r.source === 'duckduckgo').length,
      exa:        allItems.filter((r:any) => r.source === 'exa.ai').length,
      tavily:     allItems.filter((r:any) => r.source === 'tavily').length,
      jooble:     allItems.filter((r:any) => r.source === 'api:jooble' || r.source === 'api:wizbii').length,
      apis:       allItems.filter((r:any) => ['api:','ats:','hackernews','github','devto','producthunt'].some(s=>(r.source||'').startsWith(s))).length,
      social:     allItems.filter((r:any) => ['reddit:','mastodon:','bluesky','apify:instagram','apify:twitter','apify:facebook'].some(s=>(r.source||'').startsWith(s))).length,
      apify:      allItems.filter((r:any) => (r.source||'').startsWith('apify:')).length,
      total:      fresh.length,
    };

    // ── Messages d'encouragement — ton conseiller carrière, pas pub ──
    // Varié selon le profil, le nombre trouvé, et le score max
    const topScore   = scored[0]?.score || 0
    const freshCount = scored.filter((o:any) => o.hours_ago < 24).length

    function getCareerMessage(count: number, locked: number, type: string, top: number, fresh: number): string {
      if (locked === 0) return ''
      const msgs: Record<string, string[]> = {
        freelance: [
          `J'ai trouvé ${locked} missions supplémentaires — dont plusieurs avec des budgets intéressants. Avec un accès étendu, tu aurais matière à choisir plutôt qu'à accepter la première venue.`,
          `${locked} opportunités de plus sont disponibles. À ce stade de ta recherche, la diversité des offres fait souvent la différence entre une bonne mission et une excellente.`,
          `Il y a ${locked} résultats de plus que je n'affiche pas ici. Dans un marché compétitif, voir plus d'options te donne un avantage réel sur les autres candidats.`,
        ],
        job_seeker: [
          `${locked} postes supplémentaires correspondent à ton profil. Les études montrent que les candidats qui voient plus d'offres négocient mieux leur salaire — en moyenne +15%.`,
          `J'ai identifié ${locked} autres opportunités. Parfois, c'est l'offre numéro 11 qui correspond vraiment à ce qu'on cherche.`,
          `${locked} résultats de plus t'attendent. Avec ${fresh} offres fraîches ce cycle, le timing est bon pour maximiser ta visibilité.`,
        ],
        investor: [
          `${locked} projets supplémentaires ont été identifiés dans ce secteur. Dans l'investissement, les meilleures opportunités viennent rarement des premières recherches.`,
          `J'ai analysé ${locked} autres startups correspondant à tes critères. Le dealflow complet donne une meilleure vision du marché.`,
        ],
        business: [
          `${locked} leads supplémentaires correspondent à tes critères. Un pipeline plus large augmente statistiquement ton taux de conversion.`,
          `J'ai trouvé ${locked} autres entreprises qui pourraient avoir besoin de tes services. Plus de contacts qualifiés, plus de chances de signer.`,
        ],
      }
      const pool = msgs[type] || msgs.job_seeker
      return pool[Math.floor(Math.random() * pool.length)]
    }

    const careerMessage = getCareerMessage(scored.length, lockedCount, profileType, topScore, freshCount)
    // Pas d'email ici non plus — même raison que le chemin Cache Pool ci-dessus.

    // ── Log interne (pas en console prod) ────────────────────────
    log.push(`🎉 SCAN v6.1 TERMINÉ | found:${scored.length} | visible:${visible.length} | locked:${lockedCount} | ${((Date.now()-startedAt)/1000).toFixed(1)}s`);

    return res.status(200).json({
      success:      true,
      found:        scored.length,
      returned:     visible.length,
      autoApplied:  0,
      locked_count: lockedCount,
      locked_message: lockedCount > 0 ? careerMessage : null,
      locked_cta:   lockedCount > 0 ? `/pricing` : null,
      has_budget:   hasBudgetEff,
      plan,
      zone,
      profileType,
      execution_ms: Date.now() - startedAt,
      scan_log:     log,
      sourcesScanned: {
        ...realMetrics,
        // Compatibilité useAgent.ts existant
        reddit:        allItems.filter((r:any)=>(r.source||'').startsWith('reddit:')).length,
        mastodon:      allItems.filter((r:any)=>(r.source||'').startsWith('mastodon:')).length,
        bluesky:       allItems.filter((r:any)=>r.source==='bluesky').length,
        telegram:      0,
        github:        allItems.filter((r:any)=>r.source==='github'||r.source==='github:profile').length,
        hackernews:    allItems.filter((r:any)=>r.source==='hackernews').length,
        extra:         realMetrics.apis,
        rss:           0,
        ats:           allItems.filter((r:any)=>(r.source||'').startsWith('ats:')).length,
        sourcesTouched: realMetrics.total,
      },
      results: visible,
      locked_preview: lockedCount > 0 ? locked.slice(0, 5).map((o: any) => ({
        title_preview: o.title?.slice(0, 25) + '...',
        score:         o.score,
        source_platform: o.source_platform,
        is_locked:     true,
      })) : [],
    });

  } catch (error: any) {
    log.push(`❌ ERREUR FATALE: ${error.message}`);
    // Signaler au monitoring
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/monitoring`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'system_error', source: 'scan', message: error.message, severity: 'high' }),
    }).catch(() => {})
    return res.status(500).json({ error: 'Erreur interne du scan', detail: error.message, scan_log: log });
  } finally {
    releaseSlot() // Toujours libérer le slot même en cas d'erreur
  }
}

// ── Config Next.js API — timeout étendu pour les scans longs ─────
// Le scan peut prendre jusqu'à 90s sur les sources lentes
export const config = {
  api: {
    bodyParser:    { sizeLimit: '1mb' },
    responseLimit: false,
    // Note: externalResolver n'existe pas — le timeout est géré
    // côté Vercel via vercel.json maxDuration
  },
}
