import { launchBrowser } from '../../workers/browser';

export async function scrapeRemotive(keyword: string) {
  const { browser, page } = await launchBrowser({ headless: true });
  const results: any[] = [];

  try {
    await page.goto(`https://remotive.com/remote-jobs/search?search=${encodeURIComponent(keyword)}`, {
      waitUntil: 'networkidle'
    });

    // Pause humaniste
    await page.waitForTimeout(1500 + Math.random() * 2000);

    // Récupération des jobs
    const jobCards = await page.$$('.job-list-item');
    for (const card of jobCards.slice(0, 20)) { // Max 20 pour éviter les bans
      try {
        const title = await card.$eval('.job-title', el => el.textContent?.trim());
        const company = await card.$eval('.company', el => el.textContent?.trim());
        const location = await card.$eval('.location', el => el.textContent?.trim());
        const url = await card.$eval('a', el => el.href);
        const date = await card.$eval('.date', el => el.textContent?.trim());

        if (title) {
          results.push({
            title,
            company,
            location,
            url,
            date,
            source: 'remotive'
          });
        }
      } catch { /* skip si un champ manque */ }
    }

  } finally {
    await browser.close();
  }

  return results;
}
