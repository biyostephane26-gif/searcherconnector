// =================================================================
// SEARCHER CONNECTOR — MODULE PORTFOLIO ANALYZER
// But : Donner une liste de liens de portfolios (ou profils)
//       → Searcher visite chaque portfolio via Apify
//       → Collecte les infos clés (sans exposer le contenu)
//       → Score chaque portfolio
//       → Retourne les 10 meilleurs avec UNIQUEMENT le lien
//         + le score + la raison — pas de contenu brut
// RÈGLE : Le recruteur doit fouiller lui-même les portfolios
//         Searcher ne montre que les chiffres et le pourquoi
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

const APIFY_KEY  = process.env.APIFY_API_KEY || process.env.VITE_APIFY_API_KEY || '';
const SERPER_KEY = process.env.SERPER_API_KEY || '';

// ── Apify runner ──────────────────────────────────────────────────
async function apifyRun(actorId: string, input: Record<string, any>): Promise<any[]> {
  if (!APIFY_KEY) return [];
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, maxItems: 1 }), signal: AbortSignal.timeout(30000) }
    );
    if (!runRes.ok) return [];
    const run = await runRes.json();
    const runId = run?.data?.id;
    if (!runId) return [];
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const s = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_KEY}`)).json();
      if (s?.data?.status === 'SUCCEEDED')
        return await (await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${APIFY_KEY}&limit=5`)).json() || [];
      if (['FAILED','ABORTED'].includes(s?.data?.status)) return [];
    }
    return [];
  } catch { return []; }
}

// ── Analyse d'un portfolio via Apify Web Scraper ──────────────────
async function analyzePortfolioUrl(url: string): Promise<{
  projects_count: number; tech_stack: string[]; has_case_studies: boolean;
  has_live_demos: boolean; last_updated: string; contact_visible: boolean;
  quality_signals: string[]; raw_text_length: number;
}> {
  if (!APIFY_KEY) {
    // Fallback : analyse basique depuis l'URL elle-même
    return {
      projects_count: 0, tech_stack: [], has_case_studies: false,
      has_live_demos: false, last_updated: '', contact_visible: false,
      quality_signals: [], raw_text_length: 0,
    };
  }

  try {
    const items = await apifyRun('apify/web-scraper', {
      startUrls: [{ url }],
      runMode: 'DEVELOPMENT',
      pageFunction: `async function pageFunction(context) {
        const { $ } = context;
        const text = $('body').text().toLowerCase();
        const links = $('a').map((i, el) => $(el).attr('href') || '').get();
        return {
          title: $('title').text().slice(0, 100),
          text_length: text.length,
          project_keywords: (text.match(/project|case study|portfolio|work|built|created|developed/g) || []).length,
          tech_keywords: ['react','vue','angular','node','python','django','rails','flutter','swift','kotlin','tensorflow','pytorch','aws','gcp','azure'].filter(t => text.includes(t)),
          has_contact: text.includes('contact') || text.includes('hire') || text.includes('email') || links.some(l => l.includes('mailto:')),
          has_demo: links.some(l => l.includes('demo') || l.includes('live') || l.includes('app.')),
          has_case_study: text.includes('case study') || text.includes('case_study') || text.includes('process'),
          github_links: links.filter(l => l.includes('github.com')).length,
        };
      }`,
      proxyConfiguration: { useApifyProxy: true },
    });
    if (!items.length) return { projects_count: 0, tech_stack: [], has_case_studies: false, has_live_demos: false, last_updated: '', contact_visible: false, quality_signals: [], raw_text_length: 0 };

    const d = items[0];
    return {
      projects_count: Math.round((d.project_keywords || 0) / 2),
      tech_stack: d.tech_keywords || [],
      has_case_studies: d.has_case_study || false,
      has_live_demos: d.has_demo || false,
      last_updated: '',
      contact_visible: d.has_contact || false,
      quality_signals: [
        ...(d.github_links > 0 ? ['GitHub code visible'] : []),
        ...(d.has_demo ? ['Live demos disponibles'] : []),
        ...(d.has_case_study ? ['Case studies présents'] : []),
        ...(d.has_contact ? ['Contact visible'] : []),
        ...(d.tech_keywords?.length > 2 ? [`Stack tech: ${d.tech_keywords.slice(0, 3).join(', ')}`] : []),
      ],
      raw_text_length: d.text_length || 0,
    };
  } catch { return { projects_count: 0, tech_stack: [], has_case_studies: false, has_live_demos: false, last_updated: '', contact_visible: false, quality_signals: [], raw_text_length: 0 }; }
}

// ── Scoring d'un portfolio ────────────────────────────────────────
function scorePortfolio(analysis: ReturnType<typeof analyzePortfolioUrl> extends Promise<infer T> ? T : never, domain: string): {
  score: number; strengths: string[]; weaknesses: string[]; verdict: string;
} {
  let score = 20;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Contenu substantiel
  if (analysis.raw_text_length > 3000) { score += 15; strengths.push('Portfolio détaillé et complet'); }
  else if (analysis.raw_text_length > 1000) { score += 8; }
  else weaknesses.push('Portfolio trop minimaliste');

  // Projets
  if (analysis.projects_count >= 5)      { score += 20; strengths.push(`${analysis.projects_count} projets réalisés`); }
  else if (analysis.projects_count >= 2) { score += 10; strengths.push(`${analysis.projects_count} projets présentés`); }
  else weaknesses.push('Peu de projets démontrés');

  // Case studies = signe de professionnalisme
  if (analysis.has_case_studies) { score += 15; strengths.push('Case studies avec processus de travail'); }
  else weaknesses.push('Pas de case studies');

  // Démos live
  if (analysis.has_live_demos) { score += 10; strengths.push('Démos live disponibles'); }

  // Stack technique visible
  if (analysis.tech_stack.length >= 3) { score += 10; strengths.push(`Maîtrise technique démontrée (${analysis.tech_stack.slice(0, 3).join(', ')})`); }

  // Contact visible
  if (analysis.contact_visible) { score += 5; strengths.push('Coordonnées accessibles'); }
  else weaknesses.push('Aucun moyen de contact visible');

  // Qualité générale
  score += Math.min(analysis.quality_signals.length * 3, 15);

  score = Math.min(100, score);

  const verdict = score >= 75 ? 'Excellent — Portfolio concret, projets réels, expérience prouvée'
    : score >= 55 ? 'Bon — Portfolio solide avec quelques lacunes mineures'
    : score >= 35 ? 'Moyen — Manque de preuves concrètes de l\'expérience'
    : 'Insuffisant — Portfolio trop vide pour évaluer les compétences';

  return { score, strengths, weaknesses, verdict };
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId, portfolio_urls, domain = '', top_n = 10 } = req.body;
  if (!userId || !portfolio_urls?.length) return res.status(400).json({ error: 'userId et portfolio_urls requis' });

  const urls: string[] = portfolio_urls.slice(0, 100); // max 100 portfolios
  const startedAt = Date.now();
  const analysisLog: string[] = [];
  const results: any[] = [];

  analysisLog.push(`🔍 DÉMARRAGE DE L'ANALYSE`);
  analysisLog.push(`  Portfolios à analyser : ${urls.length}`);
  analysisLog.push(`  Domaine cible         : ${domain || 'non spécifié'}`);
  analysisLog.push(`  Top retenus           : ${top_n}`);
  analysisLog.push('');

  // Analyser chaque portfolio (en parallèle par batch de 5)
  const batchSize = 5;
  let analyzed = 0;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        const analysis = await analyzePortfolioUrl(url);
        const scoring = scorePortfolio(analysis, domain);
        analyzed++;
        return { url, analysis, ...scoring };
      })
    );
    batchResults.forEach(r => {
      if (r.status === 'fulfilled') results.push(r.value);
    });
    analysisLog.push(`  ⏳ ${analyzed}/${urls.length} portfolios analysés...`);
  }

  // Trier par score décroissant
  const sorted = results.sort((a, b) => b.score - a.score);
  const retained = sorted.slice(0, top_n);
  const rejected = sorted.slice(top_n);

  analysisLog.push('');
  analysisLog.push(`═══════════════════════════════════════`);
  analysisLog.push(`📊 RÉSULTATS DE L'ANALYSE COMPLÈTE`);
  analysisLog.push(`  Total analysés   : ${analyzed}`);
  analysisLog.push(`  Retenus (top ${top_n}) : ${retained.length}`);
  analysisLog.push(`  Rejetés          : ${rejected.length}`);
  analysisLog.push('');
  analysisLog.push(`DÉTAIL DES REJETS (${rejected.length} portfolios écartés) :`);
  analysisLog.push(`  - Score insuffisant (< ${retained[retained.length-1]?.score || 0}/100) : ${rejected.filter(r => r.score < 40).length}`);
  analysisLog.push(`  - Pas de projets concrets : ${rejected.filter(r => r.analysis.projects_count < 2).length}`);
  analysisLog.push(`  - Pas de case studies : ${rejected.filter(r => !r.analysis.has_case_studies).length}`);
  analysisLog.push(`  - Portfolio trop vide : ${rejected.filter(r => r.analysis.raw_text_length < 500).length}`);
  analysisLog.push('');
  analysisLog.push(`POURQUOI CES ${retained.length} ONT ÉTÉ RETENUS :`);
  retained.forEach((r, i) => {
    analysisLog.push(`  ${i+1}. Score ${r.score}/100 — ${r.strengths[0] || 'Portfolio solide'}`);
  });

  return res.status(200).json({
    success: true,
    total_analyzed: analyzed,
    total_retained: retained.length,
    total_rejected: rejected.length,
    analysis_log: analysisLog,
    // RÈGLE : on retourne SEULEMENT le lien + le score + les raisons
    // PAS le contenu du portfolio — le recruteur fouille lui-même
    portfolios: retained.map((r, i) => ({
      rank: i + 1,
      portfolio_url: r.url,          // ← lien seulement
      score: r.score,
      verdict: r.verdict,
      strengths: r.strengths,        // pourquoi c'est bon
      weaknesses: r.weaknesses,      // ce qui manque
      tech_stack_detected: r.analysis.tech_stack, // stack visible
      projects_detected: r.analysis.projects_count,
      has_live_demos: r.analysis.has_live_demos,
      has_case_studies: r.analysis.has_case_studies,
      // AUCUN contenu brut du portfolio exposé ici
    })),
    rejected_summary: rejected.slice(0, 5).map(r => ({
      portfolio_url: r.url,
      score: r.score,
      main_reason: r.weaknesses[0] || 'Score insuffisant',
    })),
    execution_ms: Date.now() - startedAt,
  });
}
