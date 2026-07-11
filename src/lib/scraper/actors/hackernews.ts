export async function scrapeHackerNews(term: string) {
  const results: any[] = [];
  try {
    // 1. Récupérer le dernier "Who is hiring?" post
    const r = await fetch('https://hacker-news.firebaseio.com/v0/user/whoishiring/submitted.json', {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const submittedIds = await r.json();
    
    // 2. Prendre le premier ID (le plus récent)
    const latestId = submittedIds?.[0];
    if (!latestId) return [];

    // 3. Récupérer le post et ses commentaires
    const postR = await fetch(`https://hacker-news.firebaseio.com/v0/item/${latestId}.json`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!postR.ok) return [];
    const post = await postR.json();

    // 4. Récupérer les commentaires (les offres d'emploi)
    const tl = term.toLowerCase();
    const kids = post.kids || [];
    
    // On prend les 30 premiers commentaires pour ne pas trop spammer
    for (const kidId of kids.slice(0, 30)) {
      try {
        const commentR = await fetch(`https://hacker-news.firebaseio.com/v0/item/${kidId}.json`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!commentR.ok) continue;
        const comment = await commentR.json();
        
        if (comment.text && comment.text.toLowerCase().includes(tl)) {
          results.push({
            title: comment.text.slice(0, 200).replace(/<[^>]+>/g, ''),
            company: 'HackerNews',
            location: '',
            link: `https://news.ycombinator.com/item?id=${kidId}`,
            snippet: comment.text.replace(/<[^>]+>/g, '').slice(0, 300),
            date: new Date(comment.time * 1000).toISOString(),
            source: 'hackernews',
          });
        }
      } catch { /* skip */ }
    }
  } catch (e) {
    console.error('HackerNews scrape error:', e);
  }
  return results;
}
