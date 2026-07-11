export async function scrapeGitHub(term: string) {
  const results: any[] = [];
  try {
    const headers: any = { 'User-Agent': 'SearcherConnector' };
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    // Rechercher des issues avec le label "good first issue" ou "help wanted"
    const r = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(term + ' label:"good first issue" OR label:"help wanted"')}&per_page=20&sort=updated`, {
      signal: AbortSignal.timeout(10000),
      headers,
    });
    if (!r.ok) return [];
    const data = await r.json();

    for (const issue of (data.items || []).slice(0, 20)) {
      results.push({
        title: issue.title?.slice(0, 200) || '',
        company: issue.repository_url?.split('/').slice(-2).join('/') || 'GitHub',
        location: 'Remote',
        link: issue.html_url || '',
        snippet: issue.body?.slice(0, 300) || '',
        date: issue.created_at || '',
        source: 'github',
      });
    }
  } catch (e) {
    console.error('GitHub scrape error:', e);
  }
  return results;
}
