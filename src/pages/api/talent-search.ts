// =================================================================
// SEARCHER CONNECTOR — MODULE TALENT SEARCH
// Pour : investors + business
// But  : trouver des profils talentueux (devs, designers, marketers...)
//        sur GitHub, LinkedIn, Behance, Dribbble, les plateformes pro
// Architecture : Apify (profils) + Serper (portfolios publics)
//                + profils Searcher internes en base de données
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SERPER_KEY = process.env.SERPER_API_KEY || '';
const APIFY_KEY  = process.env.APIFY_API_KEY || process.env.VITE_APIFY_API_KEY || '';

// ── Utilitaires ───────────────────────────────────────────────────
async function apifyRun(actorId: string, input: Record<string, any>): Promise<any[]> {
  if (!APIFY_KEY) return [];
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, maxItems: 25 }), signal: AbortSignal.timeout(30000) }
    );
    if (!runRes.ok) return [];
    const run = await runRes.json();
    const runId = run?.data?.id;
    if (!runId) return [];
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const s = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_KEY}`, { signal: AbortSignal.timeout(8000) })).json();
      if (s?.data?.status === 'SUCCEEDED') {
        return await (await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${APIFY_KEY}&limit=25`)).json() || [];
      }
      if (['FAILED','ABORTED'].includes(s?.data?.status)) return [];
    }
    return [];
  } catch { return []; }
}

async function serperSearch(q: string): Promise<any[]> {
  if (!SERPER_KEY) return [];
  try {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST', headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, num: 10, tbs: 'qdr:y' }), signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    return ((await r.json()).organic || []).map((x: any) => ({
      title: x.title, link: x.link, snippet: x.snippet, source: 'serper',
    }));
  } catch { return []; }
}

// ── Scoring des talents ───────────────────────────────────────────
function scoreTalent(profile: any, criteria: { domain: string; zone: string; level?: string }): number {
  const hay = `${profile.title || ''} ${profile.snippet || ''} ${profile.bio || ''}`.toLowerCase();
  const domainLow = criteria.domain.toLowerCase();
  const domainWords = domainLow.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);

  let score = 20;

  // Correspondance domaine
  const domainHits = domainWords.filter(w => hay.includes(w)).length;
  score += Math.min(domainHits * 20, 45);

  // Portfolio disponible = +bonus important
  if (profile.portfolio_url && profile.portfolio_url.length > 5) score += 15;

  // Source fiable = GitHub (code visible), Behance (design visible)
  const src = (profile.source || '').toLowerCase();
  if (src.includes('github'))  score += 10;
  if (src.includes('behance')) score += 8;
  if (src.includes('linkedin')) score += 5;

  // Stats activité
  if (profile.stats?.projects > 5)       score += 5;
  if (profile.stats?.followers > 100)    score += 5;
  if (profile.stats?.appreciations > 50) score += 5;

  // Niveau
  if (criteria.level && hay.includes(criteria.level.toLowerCase())) score += 10;

  return Math.min(100, score);
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId, domain, zone = 'worldwide', level, limit = 20 } = req.body;
  if (!userId || !domain) return res.status(400).json({ error: 'userId et domain requis' });

  const startedAt = Date.now();
  const allProfiles: any[] = [];
  const analysisLog: string[] = [];

  try {
    // ── 1. Profils Searcher en DB (priorité absolue) ──────────────
    const { data: searcherProfiles } = await supabaseAdmin
      .from('users_profiles')
      .select('id,full_name,domain,bio,country,verification_status,avatar_url,github_url,behance_url,portfolio_url,linkedin_url')
      .ilike('domain', `%${domain}%`)
      .in('verification_status', ['verified', 'genius'])
      .limit(20);

    const searcher_count = searcherProfiles?.length || 0;
    analysisLog.push(`✅ ${searcher_count} profils Searcher vérifiés trouvés`);

    if (searcherProfiles) {
      searcherProfiles.forEach(p => allProfiles.push({
        title: p.full_name || 'Talent Searcher',
        link: `/profile/${p.id}`,
        snippet: p.bio || '',
        source: 'searcher:internal',
        portfolio_url: p.portfolio_url || p.github_url || p.behance_url || p.linkedin_url || '',
        avatar: p.avatar_url || '',
        location: p.country || '',
        verified: true,
        verification_status: p.verification_status,
        is_searcher_member: true,
      }));
    }

    // ── 2. GitHub Profiles via Apify ──────────────────────────────
    let github_count = 0;
    if (APIFY_KEY) {
      try {
        const ghProfiles = await apifyRun('curious_coder/github-scraper', {
          searchQueries: [`${domain} developer`], maxResults: 20, proxy: { useApifyProxy: true },
        });
        github_count = ghProfiles.length;
        analysisLog.push(`📊 ${github_count} profils GitHub analysés`);
        ghProfiles.forEach(p => allProfiles.push({
          title: p.name || p.login || 'GitHub Dev',
          link: p.profileUrl || `https://github.com/${p.login}`,
          snippet: `${p.bio || ''} | ${p.repositories || 0} repos | ${p.followers || 0} followers`,
          source: 'apify:github',
          portfolio_url: p.blog || p.website || p.profileUrl || '',
          avatar: p.avatarUrl || '',
          location: p.location || '',
          stats: { projects: p.repositories || 0, followers: p.followers || 0 },
        }));
      } catch { analysisLog.push('⚠️ GitHub via Apify indisponible'); }
    }

    // ── 3. Behance Profiles via Apify ─────────────────────────────
    let behance_count = 0;
    if (APIFY_KEY) {
      try {
        const bhProfiles = await apifyRun('apify/behance-scraper', {
          searchQuery: domain, maxResults: 15, proxy: { useApifyProxy: true },
        });
        behance_count = bhProfiles.length;
        analysisLog.push(`🎨 ${behance_count} profils Behance analysés`);
        bhProfiles.forEach(p => allProfiles.push({
          title: p.name || 'Behance Designer',
          link: p.url || p.profileUrl || '',
          snippet: `${p.occupation || ''} | ${p.appreciations || 0} appreciations`,
          source: 'apify:behance',
          portfolio_url: p.url || '',
          avatar: p.avatar || '',
          location: p.location || '',
          stats: { projects: p.projectCount || 0, appreciations: p.appreciations || 0, followers: p.followers || 0 },
        }));
      } catch { analysisLog.push('⚠️ Behance via Apify indisponible'); }
    }

    // ── 4. LinkedIn Profiles via Apify ────────────────────────────
    let linkedin_count = 0;
    if (APIFY_KEY) {
      try {
        const liProfiles = await apifyRun('curious_coder/linkedin-people-scraper', {
          searchQueries: [`${domain} ${zone !== 'local' ? '' : ''}`], maxResults: 15, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
        });
        linkedin_count = liProfiles.length;
        analysisLog.push(`💼 ${linkedin_count} profils LinkedIn analysés`);
        liProfiles.forEach(p => allProfiles.push({
          title: p.name || p.fullName || 'LinkedIn Profile',
          link: p.url || p.profileUrl || '',
          snippet: `${p.headline || ''} | ${p.location || ''}`,
          source: 'apify:linkedin',
          portfolio_url: p.url || '',
          avatar: p.photo || '',
          location: p.location || '',
        }));
      } catch { analysisLog.push('⚠️ LinkedIn via Apify indisponible'); }
    }

    // ── 5. Serper — portfolios publics ────────────────────────────
    const serperQueries = [
      `${domain} portfolio site:github.com OR site:behance.net OR site:dribbble.com`,
      `${domain} expert portfolio projects`,
    ];
    const serperItems = (await Promise.allSettled(serperQueries.map(q => serperSearch(q))))
      .filter(r => r.status === 'fulfilled').flatMap(r => (r as any).value);
    analysisLog.push(`🔍 ${serperItems.length} portfolios publics trouvés via Serper`);
    serperItems.forEach(p => allProfiles.push({ ...p, portfolio_url: p.link || '' }));

    // ── Scoring et sélection des meilleurs ────────────────────────
    const totalAnalyzed = allProfiles.length;
    analysisLog.push(`\n📈 TOTAL ANALYSÉ : ${totalAnalyzed} profils`);

    const scored = allProfiles
      .map(p => ({ ...p, talent_score: scoreTalent(p, { domain, zone, level }) }))
      .filter(p => p.talent_score >= 30)
      .sort((a, b) => {
        // Profils Searcher toujours en premier
        if (a.is_searcher_member && !b.is_searcher_member) return -1;
        if (!a.is_searcher_member && b.is_searcher_member) return 1;
        return b.talent_score - a.talent_score;
      });

    const retained = scored.slice(0, Math.min(limit, 20));
    const rejected = totalAnalyzed - retained.length;

    analysisLog.push(`✅ RETENUS : ${retained.length} talents`);
    analysisLog.push(`❌ REJETÉS : ${rejected} (hors domaine, pas de portfolio, profil incomplet)`);
    analysisLog.push(`\nDétail des rejets :`);
    analysisLog.push(`  - Score insuffisant (< 30) : ${scored.filter(p => p.talent_score < 30).length}`);
    analysisLog.push(`  - Hors domaine "${domain}" : ${allProfiles.filter(p => !(`${p.title || ''} ${p.snippet || ''}`.toLowerCase().includes(domain.toLowerCase().split(' ')[0]))).length}`);
    analysisLog.push(`  - Sans portfolio visible : ${allProfiles.filter(p => !p.portfolio_url).length}`);

    return res.status(200).json({
      success: true,
      total_analyzed: totalAnalyzed,
      total_retained: retained.length,
      total_rejected: rejected,
      breakdown: { searcher_internal: searcher_count, github: github_count, behance: behance_count, linkedin: linkedin_count, serper: serperItems.length },
      analysis_log: analysisLog,
      talents: retained.map(p => ({
        title: p.title,
        portfolio_url: p.portfolio_url,
        source: p.source,
        location: p.location,
        talent_score: p.talent_score,
        snippet: p.snippet,
        avatar_url: p.avatar || '',
        is_searcher_member: p.is_searcher_member || false,
        verification_status: p.verification_status || null,
        stats: p.stats || {},
      })),
      execution_ms: Date.now() - startedAt,
    });

  } catch (error: any) {
    console.error('Talent Search error:', error.message);
    return res.status(500).json({ error: 'Erreur interne', detail: error.message });
  }
}
