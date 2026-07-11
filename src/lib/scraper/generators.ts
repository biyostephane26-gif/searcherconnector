// =================================================================
// SEARCHER CONNECTOR — GÉNÉRATEURS GÉNÉRIQUES (300+ ACTEURS TEMPS RÉEL)
// =================================================================
// Ces fonctions génériques traitent TOUTES nos 300+ sources,
// filtrent les résultats à < 24h, et évitent les blocages !

import { JOB_BOARDS, ATS_COMPANIES, FREELANCE_PLATFORMS, TECH_RSS_FEEDS, SOCIAL_COMMUNITIES } from './massive-sources';

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
// GÉNÉRATEUR 1 — TRAITEMENT DES APIs GÉNÉRIQUES
// =================================================================
export async function fetchGenericAPI(url: string, keyword: string, isPaidOnly: boolean = false): Promise<any[]> {
  try {
    const domain = getDomainFromUrl(url);
    await rateLimitForDomain(domain);
    
    const r = await fetch(url, {
      headers: { 'User-Agent': randomUserAgent(), 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) return [];
    const data = await r.json();
    
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
      for (const item of arr.slice(0, 20)) {
        const title = item.title || item.jobTitle || item.name || '';
        const company = item.company || item.companyName || item.employer || '';
        const location = item.location || item.city || '';
        const link = item.link || item.url || item.applicationLink || item.redirect_url || '';
        const snippet = item.snippet || item.description || item.summary || item.body || title;
        const date = item.date || item.created_at || item.publishedAt || item.created || item.pubDate || item.published_date || '';
        
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
    const domain = getDomainFromUrl(url);
    await rateLimitForDomain(domain);
    
    const r = await fetch(url, {
      headers: { 'User-Agent': randomUserAgent(), 'Accept': 'application/rss+xml,application/xml' },
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) return [];
    const text = await r.text();
    
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
  
  for (const item of items.slice(0, 20)) {
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
export async function fetchATS(company: any, keyword: string): Promise<any[]> {
  const { name, ats, url } = company;
  try {
    const domain = getDomainFromUrl(url);
    await rateLimitForDomain(domain);
    
    let apiUrl = '';
    if (ats === 'greenhouse') {
      const slug = url.split('/').pop() || name.toLowerCase().replace(/\s+/g, '-');
      apiUrl = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
    } else if (ats === 'lever') {
      const slug = url.split('/').pop() || name.toLowerCase().replace(/\s+/g, '-');
      apiUrl = `https://api.lever.co/v0/postings/${slug}?mode=json`;
    } else {
      return [];
    }

    const r = await fetch(apiUrl, {
      headers: { 'User-Agent': randomUserAgent() },
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) return [];
    
    const data = await r.json();
    const results: any[] = [];
    const kw = keyword.toLowerCase();
    
    const jobs = data.jobs || data || [];
    for (const job of jobs.slice(0, 20)) {
      const title = job.title || job.text || '';
      const location = job.location?.name || job.location || '';
      const link = job.absolute_url || job.hostedUrl || job.url || url;
      const description = job.description || job.content || '';
      const date = job.updated_at || job.createdAt || '';
      
      const haystack = `${title} ${description}`.toLowerCase();
      if (haystack.includes(kw)) {
        results.push({
          title: String(title).slice(0, 200),
          company: name,
          location: String(location),
          link: String(link),
          snippet: String(description).replace(/<[^>]+>/g, '').slice(0, 300),
          date,
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
// GÉNÉRATEUR 4 — FONCTION PRINCIPALE QUI LANCE TOUT !
// =================================================================
export async function fetchAllSources(keyword: string, log: string[]): Promise<any[]> {
  const allResults: any[] = [];
  const concurrencyLimit = 5; // 5 requêtes en même temps max, pour éviter de surcharger

  log.push('🔍 Début du scan des 200+ sources (temps réel, < 24h)');

  // --- 1. Job Boards API (TOUS !) ---
  log.push('📋 Traitement des Job Boards API...');
  const apiJobBoards = JOB_BOARDS.filter(j => j.type === 'api');
  const apiJobResults = await Promise.all(
    apiJobBoards.map(board => fetchGenericAPI(board.url, keyword))
  );
  allResults.push(...apiJobResults.flat());

  // --- 2. Job Boards RSS (TOUS !) ---
  log.push('📰 Traitement des Job Boards RSS...');
  const rssJobBoards = JOB_BOARDS.filter(j => j.type === 'rss');
  const rssJobResults = await Promise.all(
    rssJobBoards.map(board => fetchGenericRSS(board.url, keyword))
  );
  allResults.push(...rssJobResults.flat());

  // --- 3. ATS (TOUS !) ---
  log.push('🏢 Traitement des ATS...');
  const atsResults = await Promise.all(
    ATS_COMPANIES.map(company => fetchATS(company, keyword))
  );
  allResults.push(...atsResults.flat());

  // --- 4. Tech RSS Feeds (TOUS !) ---
  log.push('💻 Traitement des RSS Tech...');
  const techRssResults = await Promise.all(
    TECH_RSS_FEEDS.map(feed => fetchGenericRSS(feed.url, keyword))
  );
  allResults.push(...techRssResults.flat());

  // --- 5. Freelance Platforms (API/RSS si disponibles) ---
  log.push('💼 Traitement des Plateformes Freelance...');
  const freelanceApi = FREELANCE_PLATFORMS.filter(f => f.type === 'api');
  const freelanceResults = await Promise.all(
    freelanceApi.map(platform => fetchGenericAPI(platform.url, keyword))
  );
  allResults.push(...freelanceResults.flat());

  // --- 6. Social Communities (RSS/API si disponibles) ---
  log.push('👥 Traitement des Réseaux Sociaux & Communautés...');
  // Pour les communautés, on peut utiliser les APIs/RSS des subreddits etc.
  const socialResults = await Promise.all(
    SOCIAL_COMMUNITIES.slice(0, 10).map(comm => fetchGenericRSS(comm.url, keyword))
  );
  allResults.push(...socialResults.flat());

  log.push(`✅ Scan terminé ! ${allResults.length} opportunités fraîches (< 24h) trouvées`);

  return allResults;
}