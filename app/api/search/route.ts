import { NextResponse } from 'next/server';

const SERPER_KEY = process.env.SERPER_API_KEY || '';

// Mapping simple pour la localisation Serper
const getCountryCode = (countryName: string) => {
  const map: Record<string, string> = {
    'france': 'fr',
    'cameroun': 'cm',
    'canada': 'ca',
    'usa': 'us',
    'united states': 'us',
    'belgique': 'be',
    'suisse': 'ch',
    'senegal': 'sn',
    'cote d\'ivoire': 'ci',
    'maroc': 'ma',
  };
  const normalized = countryName.toLowerCase().trim();
  return map[normalized] || 'us';
};

function parseFreshnessHours(dateText?: string) {
  const raw = String(dateText || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes('hour') || raw.includes('heure')) return Number(raw.match(/\d+/)?.[0] || 1);
  if (raw.includes('day') || raw.includes('jour')) return Number(raw.match(/\d+/)?.[0] || 1) * 24;
  if (raw.includes('week') || raw.includes('semaine')) return Number(raw.match(/\d+/)?.[0] || 1) * 24 * 7;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : Math.max(0, Math.round((Date.now() - parsed) / 36e5));
}

function hasOldYear(text: string, currentYear: number) {
  const years = text.match(/\b20\d{2}\b/g) || [];
  return years.some((year) => Number(year) < currentYear);
}

function sourcePlatform(link = '') {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

function isLikelyOpportunity(result: any, currentYear: number) {
  const haystack = `${result?.title || ''} ${result?.snippet || ''} ${result?.link || ''}`.toLowerCase();
  if (!result?.link || hasOldYear(haystack, currentYear)) return false;

  const blocked = [
    'news', 'article', 'blog', 'guide', 'course', 'formation', 'salary', 'salaire',
    'report', 'rapport', 'ranking', 'definition', 'what is', 'how to', 'press release'
  ];
  if (blocked.some((word) => haystack.includes(word))) return false;

  const opportunityWords = [
    'job', 'jobs', 'hiring', 'career', 'careers', 'apply', 'recruitment', 'recrutement',
    'emploi', 'offre', 'poste', 'mission', 'freelance', 'contract', 'contrat',
    'internship', 'stage', 'vacancy', 'remote'
  ];
  return opportunityWords.some((word) => haystack.includes(word));
}

function normalizeSearchResult(result: any, currentYear: number) {
  const freshnessHours = parseFreshnessHours(result.date);
  return {
    ...result,
    source_platform: sourcePlatform(result.link),
    freshness_hours: freshnessHours,
    is_likely_opportunity: isLikelyOpportunity(result, currentYear)
  };
}

async function serperSearch(query: string, gl = 'us', hl = 'en', tbs = 'qdr:w') {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10, gl, hl, tbs }),
    });
    const data = await res.json();
    return data.organic || [];
  } catch (error) {
    console.error('Serper search error:', error);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { type, payload } = await req.json();

    if (!SERPER_KEY) {
      return NextResponse.json({ error: 'Serper API Key missing' }, { status: 500 });
    }

    let results: any[] = [];

    switch (type) {
      case 'jobs': {
        const { domain, country, profileType, searchPreferences } = payload;
        const gl = getCountryCode(country);
        const hl = gl === 'us' ? 'en' : 'fr';
        const currentYear = new Date().getFullYear();
        const afterDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        // Extraire les mots-clés stratégiques des préférences
        const extraKeywords = searchPreferences?.keywords?.length > 0 
          ? searchPreferences.keywords.join(' OR ') 
          : '';
        
        // Base commune : Domaine + Pays + Année (2026)
        const baseQuery = `${domain} ${country} 2026`;
        let queries: string[] = [
          // Recherche Web Globale (Scanne tout le net)
          `${baseQuery} "hiring" OR "recrutement" OR "opportunity" OR "mission"`,
          `"looking for" ${domain} ${country} ${extraKeywords ? `(${extraKeywords})` : ''}`,
          // Recherche sur les réseaux sociaux (sources d'opportunités directes)
          `site:twitter.com OR site:reddit.com OR site:linkedin.com/posts "${domain}" ${country}`,
        ];

        // Ajouts spécifiques selon le profil mais sans limiter le reste
        if (profileType === 'freelance') {
          queries.push(`${domain} ${country} mission freelance OR contrat OR project site:malt.fr OR site:upwork.com OR site:freelancer.com`);
        } else if (profileType === 'business') {
          queries.push(`${domain} ${country} business opportunities OR partners OR clients OR expansion`);
        } else if (profileType === 'investor') {
          queries.push(`${domain} ${country} startups looking for funding OR pitch deck OR investment`);
        } else {
          queries.push(`${domain} ${country} jobs OR hiring site:linkedin.com/jobs OR site:indeed.com OR site:glassdoor.com`);
        }

        // On ajoute une recherche sur les préférences de vision si elles existent
        if (searchPreferences?.vision_summary) {
          queries.push(`${searchPreferences.vision_summary} ${country} opportunity`);
        }

        // On ajoute une recherche large sur les sites de news/blogs pro pour les opportunités cachées
        queries.push(`news ${domain} ${country} expansion OR hiring OR investment 2026`);

        const searchResults = await Promise.all(queries.map(q => serperSearch(q, gl, hl)));
        results = searchResults.flat();
        break;
      }
      case 'salaries': {
        const { role, country } = payload;
        results = await serperSearch(`average salary ${role} ${country} 2026 USD`);
        break;
      }
      case 'investors': {
        const { sector, ticketSize } = payload;
        const searchResults = await Promise.all([
          serperSearch(`venture capital investors ${sector} 2026 crunchbase`),
          serperSearch(`angel investors ${sector} funding ${ticketSize}`),
          serperSearch(`VC fund ${sector} portfolio investments`),
        ]);
        results = searchResults.flat();
        break;
      }
      case 'clients': {
        const { product, targetCustomer, country } = payload;
        results = await serperSearch(`people looking for ${product} ${targetCustomer} ${country} buy`);
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid search type' }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Search API Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
