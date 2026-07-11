export async function scrapeArbeitnow(term: string) {
  const results: any[] = [];
  try {
    const r = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    const tl = term.toLowerCase();

    // Filtrer les jobs qui contiennent le terme
    for (const job of (data.data || []).slice(0, 20)) {
      const title = job.title || '';
      const desc = job.description || '';
      const hay = `${title} ${desc}`.toLowerCase();
      if (hay.includes(tl)) {
        results.push({
          title: title.slice(0, 200),
          company: job.company_name || '',
          location: job.location || '',
          link: job.url || '',
          snippet: desc.replace(/<[^>]+>/g, '').slice(0, 300),
          date: job.created_at || '',
          source: 'arbeitnow',
        });
      }
    }
  } catch (e) {
    console.error('Arbeitnow scrape error:', e);
  }
  return results;
}
