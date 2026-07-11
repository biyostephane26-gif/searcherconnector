import { launchUltraBrowser } from '../../workers/ultra-browser';
import { ScraperResult } from '../actor-registry';

// ======================================================
// ACTEUR 1 : LINKEDIN PUBLIC JOBS (PAS DE LOGIN !)
// ======================================================
export async function scrapeLinkedInPublic(keyword: string): Promise<ScraperResult[]> {
  const { browser, page, humanDelay, humanScroll } = await launchUltraBrowser();
  const results: ScraperResult[] = [];

  try {
    // URL LinkedIn public jobs (sans login)
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=Worldwide`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await humanDelay(2000, 5000);

    // Scroll pour charger les jobs
    await humanScroll(page, 'down');
    await humanDelay(1000, 3000);

    // Extraire les jobs
    const jobElements = await page.$$('ul.jobs-search__results-list li');
    for (const el of jobElements.slice(0, 15)) { // On prend les 15 premiers pour éviter les bans
      try {
        const title = await el.$eval('h3', (h3: any) => h3?.innerText?.trim() || '');
        const company = await el.$eval('h4', (h4: any) => h4?.innerText?.trim() || '');
        const location = await el.$eval('div.job-search-card__location', (loc: any) => loc?.innerText?.trim() || '');
        const link = await el.$eval('a', (a: any) => a?.href || '');
        const dateRaw = await el.$eval('time', (t: any) => t?.getAttribute('datetime') || '');
        const snippet = `${title} chez ${company}`;

        if (title && link) {
          results.push({
            title,
            company,
            location,
            link,
            snippet,
            date: dateRaw,
            source: 'LinkedIn Public Jobs'
          });
        }
      } catch (e) { /* Si un job échoue, on continue */ }
    }

  } catch (error) {
    console.error('❌ Erreur LinkedIn Public:', error);
  } finally {
    await browser.close();
  }

  return results;
}

// ======================================================
// ACTEUR 2 : UPWORK PUBLIC JOBS (PAS DE LOGIN !)
// ======================================================
export async function scrapeUpworkPublic(keyword: string): Promise<ScraperResult[]> {
  const { browser, page, humanDelay, humanScroll } = await launchUltraBrowser();
  const results: ScraperResult[] = [];

  try {
    const searchUrl = `https://www.upwork.com/nx/search/jobs?q=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await humanDelay(3000, 6000);
    await humanScroll(page, 'down');
    await humanDelay(1000, 3000);

    // Extraire les jobs (ajuste les sélecteurs si Upwork change)
    const jobCards = await page.$$('article.job-tile');
    for (const card of jobCards.slice(0, 15)) {
      try {
        const title = await card.$eval('h3.job-tile-title', (t: any) => t?.innerText?.trim() || '');
        const company = 'Client sur Upwork';
        const link = await card.$eval('a', (a: any) => a?.href || '');
        const snippet = await card.$eval('div.job-description', (d: any) => d?.innerText?.slice(0, 200)?.trim() || title);

        if (title && link) {
          results.push({
            title,
            company,
            link,
            snippet,
            source: 'Upwork Public Jobs'
          });
        }
      } catch (e) { /* Continue on error */ }
    }

  } catch (error) {
    console.error('❌ Erreur Upwork Public:', error);
  } finally {
    await browser.close();
  }

  return results;
}

// ======================================================
// ACTEUR 3 : MALT PUBLIC (PAS DE LOGIN !)
// ======================================================
export async function scrapeMaltPublic(keyword: string): Promise<ScraperResult[]> {
  const { browser, page, humanDelay, humanScroll } = await launchUltraBrowser();
  const results: ScraperResult[] = [];

  try {
    const searchUrl = `https://www.malt.fr/s?q=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await humanDelay(3000, 5000);

    const cards = await page.$$('div[class*="card"]');
    for (const card of cards.slice(0, 10)) {
      try {
        const title = await card.$eval('h2, h3, [class*="title"]', (t: any) => t?.innerText?.trim() || '');
        const link = await card.$eval('a', (a: any) => a?.href || '');
        if (title && link) {
          results.push({ title, link, source: 'Malt Public' });
        }
      } catch (e) { /* Skip errors */ }
    }

  } catch (error) {
    console.error('❌ Erreur Malt Public:', error);
  } finally {
    await browser.close();
  }

  return results;
}

// ======================================================
// ACTEUR 4 : TURING (PAS DE LOGIN !)
// ======================================================
export async function scrapeTuring(keyword: string): Promise<ScraperResult[]> {
  const { browser, page, humanDelay, humanScroll } = await launchUltraBrowser();
  const results: ScraperResult[] = [];

  try {
    const searchUrl = `https://www.turing.com/jobs?search=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await humanDelay(3000, 5000);
    await humanScroll(page, 'down');
    await humanDelay(1000, 3000);

    const cards = await page.$$('div[class*="job-card"], article[class*="job"]');
    for (const card of cards.slice(0, 10)) {
      try {
        const title = await card.$eval('h2, h3, [class*="title"]', (t: any) => t?.innerText?.trim() || '');
        const link = await card.$eval('a', (a: any) => a?.href || '');
        const snippet = title;
        if (title && link) {
          results.push({ title, link, snippet, source: 'Turing' });
        }
      } catch (e) { /* Skip errors */ }
    }

  } catch (error) {
    console.error('❌ Erreur Turing:', error);
  } finally {
    await browser.close();
  }

  return results;
}

// ======================================================
// ACTEUR 5 : ARC.DEV (PAS DE LOGIN !)
// ======================================================
export async function scrapeArcDev(keyword: string): Promise<ScraperResult[]> {
  const { browser, page, humanDelay, humanScroll } = await launchUltraBrowser();
  const results: ScraperResult[] = [];

  try {
    const searchUrl = `https://arc.dev/jobs?search=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await humanDelay(3000, 5000);
    await humanScroll(page, 'down');
    await humanDelay(1000, 3000);

    const cards = await page.$$('div[class*="job-card"], article[class*="job"]');
    for (const card of cards.slice(0, 10)) {
      try {
        const title = await card.$eval('h2, h3, [class*="title"]', (t: any) => t?.innerText?.trim() || '');
        const link = await card.$eval('a', (a: any) => a?.href || '');
        const snippet = title;
        if (title && link) {
          results.push({ title, link, snippet, source: 'Arc.dev' });
        }
      } catch (e) { /* Skip errors */ }
    }

  } catch (error) {
    console.error('❌ Erreur Arc.dev:', error);
  } finally {
    await browser.close();
  }

  return results;
}