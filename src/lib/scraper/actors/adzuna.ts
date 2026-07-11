export async function scrapeAdzuna(term: string) {
  const results: any[] = [];
  try {
    const ADZUNA_ID = process.env.ADZUNA_APP_ID || '';
    const ADZUNA_KEY = process.env.ADZUNA_APP_KEY || '';
    
    if (!ADZUNA_ID || !ADZUNA_KEY) {
      console.warn('Adzuna API keys not found');
      return [];
    }

    const country = 'fr'; // Ou 'us' si tu veux les États-Unis
    const r = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${ADZUNA_ID}&app_key=${ADZUNA_KEY}&results_per_page=20&what=${encodeURIComponent(term)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const data = await r.json();

    for (const job of (data.results || []).slice(0, 20)) {
      results.push({
        title: job.title?.slice(0, 200) || '',
        company: job.company?.display_name || '',
        location: job.location?.display_name || '',
        link: job.redirect_url || '',
        snippet: job.description?.slice(0, 300) || '',
        date: job.created || '',
        source: 'adzuna',
      });
    }
  } catch (e) {
    console.error('Adzuna scrape error:', e);
  }
  return results;
}
