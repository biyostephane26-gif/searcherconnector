export async function scrapeDevTo(term: string) {
  const results: any[] = [];
  try {
    const r = await fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(term)}&per_page=20`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'SearcherConnector' }
    });
    if (!r.ok) return [];
    const data = await r.json();

    for (const article of (data || []).slice(0, 20)) {
      if (article.title && article.url) {
        results.push({
          title: article.title.slice(0, 200),
          company: article.user?.name || 'Dev.to',
          location: '',
          link: article.url || '',
          snippet: article.description?.slice(0, 300) || article.title,
          date: article.published_at || '',
          source: 'devto',
        });
      }
    }
  } catch (e) {
    console.error('DevTo scrape error:', e);
  }
  return results;
}
