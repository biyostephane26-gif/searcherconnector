export async function scrapeWizbii(term: string) {
  const results: any[] = [];
  try {
    // Wizbii a une API publique ou on peut scraper le RSS/JSON
    const r = await fetch(`https://www.wizbii.com/api/search/offers?q=${encodeURIComponent(term)}&page=1&per_page=20`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!r.ok) return [];
    const data = await r.json();

    for (const job of (data.offers || []).slice(0, 20)) {
      if (job.title && job.company) {
        results.push({
          title: job.title.slice(0, 200),
          company: job.company.name || job.company,
          location: job.location || '',
          link: job.url || `https://www.wizbii.com/offres/${job.id}`,
          snippet: job.description?.slice(0, 300) || `${job.company} — ${job.location}`,
          date: job.published_at || '',
          source: 'wizbii',
        });
      }
    }
  } catch (e) {
    console.error('Wizbii scrape error:', e);
    // Fallback: si l'API ne marche pas, on peut essayer un autre endpoint ou retourner []
  }
  return results;
}
