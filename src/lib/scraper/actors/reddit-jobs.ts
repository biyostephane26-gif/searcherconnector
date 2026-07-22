import { launchBrowser } from '../../workers/browser';

export async function scrapeRedditJobs(keyword: string) {
  const { browser, page } = await launchBrowser({ headless: true });
  const results: any[] = [];

  try {
    await page.goto(`https://old.reddit.com/r/jobs/search?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=new`, {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(1500 + Math.random() * 2000);

    const posts = await page.$$('.thing.link');
    for (const post of posts.slice(0, 15)) {
      try {
        const title = await post.$eval('.title', el => el.textContent?.trim());
        const url = await post.$eval('.title a', el => (el as HTMLAnchorElement).href);
        const subreddit = await post.$eval('.subreddit', el => el.textContent?.trim());
        const date = await post.$eval('.time', el => el.getAttribute('datetime'));

        if (title && !title.toLowerCase().includes('hiring')) {
          results.push({
            title,
            company: subreddit,
            url,
            date,
            source: 'reddit'
          });
        }
      } catch { /* skip */ }
    }

  } finally {
    await browser.close();
  }

  return results;
}
