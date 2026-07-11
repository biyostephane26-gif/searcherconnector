// =================================================================
// SEARCHER CONNECTOR — MODULE FIND YOUR IDEAL WORKER
// Pour : business + investor (recruteurs)
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { callGeminiDirect } from '../../lib/scaiUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SERPER_KEY = process.env.SERPER_API_KEY || '';
const APIFY_KEY  = process.env.APIFY_API_KEY || process.env.VITE_APIFY_API_KEY || '';

// ── Extraction critères — Gemini en priorité, fallback local ─────
async function extractCriteriaFromDescription(description: string): Promise<{
  domain: string; skills: string[]; level: string; zone: string; employment_type: string;
}> {
  const FALLBACK = {
    domain: description.slice(0, 60).trim(),
    skills: description.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 5),
    level: description.toLowerCase().includes('senior') ? 'senior' : description.toLowerCase().includes('junior') ? 'junior' : 'any',
    zone: (description.toLowerCase().includes('remote') || description.toLowerCase().includes('worldwide')) ? 'worldwide' : description.toLowerCase().includes('afrique') || description.toLowerCase().includes('africa') ? 'continental' : 'local',
    employment_type: (description.toLowerCase().includes('freelance') || description.toLowerCase().includes('contract')) ? 'freelance' : 'any',
  };

  const prompt = `Extrais les critères de recrutement de ce texte. Réponds UNIQUEMENT en JSON valide, une ligne:
{"domain":"domaine principal","skills":["skill1","skill2"],"level":"junior|mid|senior|any","zone":"local|continental|worldwide","employment_type":"freelance|employee|any"}
Texte: "${description.slice(0, 500)}"`;

  try {
    const text = await callGeminiDirect(prompt);
    if (!text) return FALLBACK;
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s === -1 || e === -1) return FALLBACK;
    const parsed = JSON.parse(text.slice(s, e + 1));
    // Valider les champs attendus
    return {
      domain:          typeof parsed.domain === 'string'          ? parsed.domain.slice(0, 80) : FALLBACK.domain,
      skills:          Array.isArray(parsed.skills)               ? parsed.skills.slice(0, 8)  : FALLBACK.skills,
      level:           ['junior','mid','senior','any'].includes(parsed.level) ? parsed.level   : 'any',
      zone:            ['local','continental','worldwide'].includes(parsed.zone) ? parsed.zone  : FALLBACK.zone,
      employment_type: ['freelance','employee','any'].includes(parsed.employment_type) ? parsed.employment_type : 'any',
    };
  } catch {
    return FALLBACK;
  }
}

async function apifyRun(actorId: string, input: Record<string, any>): Promise<any[]> {
  if (!APIFY_KEY) return [];
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, maxItems: 20 }), signal: AbortSignal.timeout(30000) }
    );
    if (!runRes.ok) return [];
    const run = await runRes.json();
    const runId = run?.data?.id;
    if (!runId) return [];
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const s = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_KEY}`)).json();
      if (s?.data?.status === 'SUCCEEDED')
        return await (await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${APIFY_KEY}&limit=20`)).json() || [];
      if (['FAILED','ABORTED'].includes(s?.data?.status)) return [];
    }
    return [];
  } catch { return []; }
}

function scoreWorker(profile: any, criteria: { domain: string; skills: string[]; level: string }): number {
  const hay = `${profile.title || ''} ${profile.snippet || ''} ${profile.bio || ''}`.toLowerCase();
  let score = 30; // Base higher

  // Skip videos, channels without portfolio links
  const isVideoChannel = (profile.link || profile.portfolio_url || '').includes('youtube.com') || 
                         (profile.link || profile.portfolio_url || '').includes('vimeo.com') || 
                         (profile.link || profile.portfolio_url || '').includes('tiktok.com');
  if (isVideoChannel) return 0;

  // Correspondance domaine
  const domainWords = criteria.domain.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  score += Math.min(domainWords.filter(w => hay.includes(w)).length * 15, 40);

  // Correspondance compétences
  score += Math.min(criteria.skills.filter(s => hay.includes(s.toLowerCase())).length * 10, 25);

  // Niveau
  if (criteria.level !== 'any' && hay.includes(criteria.level)) score += 10;

  // Multiple portfolio/links available = huge bonus
  const hasPortfolio = !!profile.portfolio_url;
  const hasLinkedIn = (profile.link || profile.portfolio_url || '').includes('linkedin.com');
  const hasGithub = (profile.link || profile.portfolio_url || '').includes('github.com') || !!profile.github_url;
  const hasBehance = (profile.link || profile.portfolio_url || '').includes('behance.net') || !!profile.behance_url;
  
  if (hasPortfolio) score += 10;
  if (hasLinkedIn) score += 10;
  if (hasGithub) score += 10;
  if (hasBehance) score += 10;

  // Profil Searcher vérifié = priorité
  if (profile.is_searcher_member) score += 20;
  if (profile.verification_status === 'genius') score += 15;

  return Math.max(0, Math.min(100, score));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId, description, zone = 'worldwide', employment_type = 'any' } = req.body;
  if (!userId || !description) return res.status(400).json({ error: 'userId et description requis' });

  const startedAt = Date.now();
  const allProfiles: any[] = [];
  const analysisLog: string[] = [];

  try {
    // ── Extraire les critères de la description ───────────────────
    analysisLog.push(`📝 Analyse de la description : "${description.slice(0, 100)}..."`);
    const criteria = await extractCriteriaFromDescription(description);
    analysisLog.push(`🎯 Critères extraits : domaine="${criteria.domain}" | niveau="${criteria.level}" | zone="${criteria.zone}" | type="${criteria.employment_type}"`);

    const effectiveZone = zone !== 'worldwide' ? zone : criteria.zone;
    const domain = criteria.domain;

    // ── 1. Profils Searcher internes (TOUJOURS EN PREMIER) ────────
    const { data: searcherProfiles } = await supabaseAdmin
      .from('users_profiles')
      .select('id,full_name,domain,bio,country,city,verification_status,avatar_url,github_url,behance_url,portfolio_url,linkedin_url,profile_type')
      .or(`domain.ilike.%${domain.split(' ')[0]}%`)
      .in('verification_status', ['verified', 'genius'])
      .in('profile_type', ['freelance', 'job_seeker'])
      .limit(30);

    const searcher_count = searcherProfiles?.length || 0;
    analysisLog.push(`\n🏆 PRIORITÉ 1 — Profils Searcher vérifiés : ${searcher_count} trouvés`);

    searcherProfiles?.forEach(p => allProfiles.push({
      full_name: p.full_name,
      title: `${p.full_name} — ${p.domain || ''}`,
      link: `/profile/${p.id}`,
      snippet: p.bio || '',
      source: 'searcher:internal',
      portfolio_url: p.portfolio_url || p.github_url || p.behance_url || p.linkedin_url || '',
      avatar: p.avatar_url || '',
      location: `${p.city || ''} ${p.country || ''}`.trim(),
      is_searcher_member: true,
      verification_status: p.verification_status,
      profile_type: p.profile_type,
    }));

    // ── 2. LinkedIn Profiles via Apify ────────────────────────────
    let linkedin_count = 0;
    if (APIFY_KEY) {
      try {
        const locationFilter = effectiveZone === 'local' ? criteria.zone : '';
        const liProfiles = await apifyRun('curious_coder/linkedin-people-scraper', {
          searchQueries: [`${domain} ${criteria.level !== 'any' ? criteria.level : ''} ${locationFilter}`],
          maxResults: 20, proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
        });
        linkedin_count = liProfiles.length;
        analysisLog.push(`💼 COUCHE 2 — LinkedIn via Apify : ${linkedin_count} profils`);
        liProfiles.forEach(p => allProfiles.push({
          full_name: p.name || p.fullName || '',
          title: p.headline || p.name || 'LinkedIn Profile',
          link: p.url || p.profileUrl || '',
          snippet: `${p.headline || ''} | ${p.location || ''}`,
          source: 'apify:linkedin',
          portfolio_url: p.url || '',
          avatar: p.photo || '',
          location: p.location || '',
        }));
      } catch { analysisLog.push('⚠️ LinkedIn Apify indisponible'); }
    }

    // ── 3. GitHub (si domaine tech) ───────────────────────────────
    let github_count = 0;
    const isTechDomain = ['developer','dev','engineer','code','full stack','frontend','backend','mobile','data','ai','devops'].some(t => domain.toLowerCase().includes(t));
    if (APIFY_KEY && isTechDomain) {
      try {
        const ghProfiles = await apifyRun('curious_coder/github-scraper', {
          searchQueries: [domain], maxResults: 15, proxy: { useApifyProxy: true },
        });
        github_count = ghProfiles.length;
        analysisLog.push(`⚙️ COUCHE 3 — GitHub : ${github_count} profils dev`);
        ghProfiles.forEach(p => allProfiles.push({
          full_name: p.name || p.login || '',
          title: `${p.name || p.login} — GitHub Developer`,
          link: p.profileUrl || `https://github.com/${p.login}`,
          snippet: `${p.bio || ''} | ${p.repositories || 0} repos | ${p.followers || 0} followers`,
          source: 'apify:github',
          portfolio_url: p.blog || p.website || p.profileUrl || '',
          avatar: p.avatarUrl || '',
          location: p.location || '',
          stats: { repos: p.repositories, followers: p.followers },
        }));
      } catch { analysisLog.push('⚠️ GitHub Apify indisponible'); }
    }

    // ── 4. Upwork (si cherche freelance) ─────────────────────────
    let upwork_count = 0;
    if (APIFY_KEY && (criteria.employment_type === 'freelance' || employment_type === 'freelance')) {
      try {
        const upProfiles = await apifyRun('tugkan/upwork-jobs-scraper', {
          search: domain, maxJobs: 15, proxy: { useApifyProxy: true },
        });
        upwork_count = upProfiles.length;
        analysisLog.push(`🔧 COUCHE 4 — Upwork freelancers : ${upwork_count} profils`);
        upProfiles.forEach(p => allProfiles.push({
          full_name: p.clientName || '',
          title: p.title || 'Upwork Freelancer',
          link: p.url || p.link || '',
          snippet: p.description?.slice(0, 300) || '',
          source: 'apify:upwork',
          portfolio_url: p.url || '',
        }));
      } catch { analysisLog.push('⚠️ Upwork Apify indisponible'); }
    }

    // ── 5. Serper — profils publics ───────────────────────────────
    let serper_count = 0;
    if (SERPER_KEY) {
      try {
        const serperQ = `${domain} profile portfolio ${effectiveZone === 'local' ? criteria.zone : 'remote'} site:github.com OR site:behance.net OR site:linkedin.com`;
        const r = await fetch('https://google.serper.dev/search', {
          method: 'POST', headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: serperQ, num: 10 }), signal: AbortSignal.timeout(10000),
        });
        if (r.ok) {
          const serperItems = ((await r.json()).organic || []);
          serper_count = serperItems.length;
          analysisLog.push(`🔍 COUCHE 5 — Serper (portfolios publics) : ${serper_count} résultats`);
          serperItems.forEach((p: any) => allProfiles.push({
            full_name: p.title?.split(' - ')[0] || p.title || '',
            title: p.title || '',
            link: p.link || '',
            snippet: p.snippet || '',
            source: 'serper',
            portfolio_url: p.link || '',
          }));
        }
      } catch { analysisLog.push('⚠️ Serper indisponible'); }
    }

    // ── Scoring et classement ─────────────────────────────────────
    const totalAnalyzed = allProfiles.length;

    const scored = allProfiles
      .filter(p => (p.link || p.portfolio_url))
      .map(p => ({ ...p, worker_score: scoreWorker(p, { domain, skills: criteria.skills, level: criteria.level }) }))
      .filter(p => p.worker_score >= 20) // Lower threshold from 25 to 20
      .sort((a, b) => {
        // Profils Searcher vérifiés TOUJOURS en premier
        if (a.is_searcher_member && !b.is_searcher_member) return -1;
        if (!a.is_searcher_member && b.is_searcher_member) return 1;
        if (a.verification_status === 'genius' && b.verification_status !== 'genius') return -1;
        if (a.verification_status !== 'genius' && b.verification_status === 'genius') return 1;
        return b.worker_score - a.worker_score;
      });

    const retained = scored.slice(0, 20);
    const rejected_count = totalAnalyzed - retained.length;

    analysisLog.push(`\n═══════════════════════════════`);
    analysisLog.push(`📊 RÉSUMÉ DE L'ANALYSE`);
    analysisLog.push(`  Total analysé    : ${totalAnalyzed} profils`);
    analysisLog.push(`  Retenus          : ${retained.length} profils`);
    analysisLog.push(`  Rejetés          : ${rejected_count} profils`);
    analysisLog.push(`  Dont Searcher ✓  : ${retained.filter(p => p.is_searcher_member).length} profils vérifiés`);
    analysisLog.push(`  Score min retenu : ${retained[retained.length - 1]?.worker_score || 0}/100`);
    analysisLog.push(`  Score max        : ${retained[0]?.worker_score || 0}/100`);

    return res.status(200).json({
      success: true,
      criteria_extracted: criteria,
      total_analyzed: totalAnalyzed,
      total_retained: retained.length,
      total_rejected: rejected_count,
      rejection_reason: `${rejected_count} profils rejetés car : score insuffisant (< 25/100), hors domaine "${domain}", ou sans lien de profil valide`,
      breakdown: { searcher_internal: searcher_count, linkedin: linkedin_count, github: github_count, upwork: upwork_count, serper: serper_count },
      analysis_log: analysisLog,
      workers: retained.map(p => ({
        full_name: p.full_name || p.title,
        title: p.title,
        portfolio_url: p.portfolio_url,
        profile_url: p.link,
        source: p.source,
        location: p.location || '',
        worker_score: p.worker_score,
        snippet: p.snippet,
        avatar_url: p.avatar || '',
        is_searcher_member: p.is_searcher_member || false,
        verification_status: p.verification_status || null,
        stats: p.stats || {},
      })),
      execution_ms: Date.now() - startedAt,
    });

  } catch (error: any) {
    console.error('Find Worker error:', error.message);
    return res.status(500).json({ error: 'Erreur interne', detail: error.message });
  }
}
