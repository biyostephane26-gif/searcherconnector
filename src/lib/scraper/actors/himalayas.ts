export async function scrapeHimalayas(term: string) {
  const results: any[] = [];
  try {
    const r = await fetch(`https://himalayas.app/jobs/api?q=${encodeURIComponent(term)}&limit=20`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const data = await r.json();

    for (const job of (data.jobs || []).slice(0, 20)) {
      if (job.applicationLink || job.url) {
        results.push({
          title: (job.title || job.jobTitle || '').slice(0, 200),
          company: job.companyName || '',
          location: job.location || '',
          link: job.applicationLink || job.url || '',
          snippet: job.description?.slice(0, 300) || `${job.companyName} — ${job.location}`,
          date: job.publishedAt || '',
          source: 'himalayas',
        });
      }
    }
  } catch (e) {
    console.error('Himalayas scrape error:', e);
  }
  return results;
}
