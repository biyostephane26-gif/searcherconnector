'use server';

import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth()); // Anti-détection par défaut

// User-Agents variés (desktop + mobile) pour éviter les patterns
const USER_AGENTS = [
  // Desktop Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  // Desktop Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  // Mobile Chrome
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Samsung Galaxy S24) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
];

// Viewports variés pour éviter les patterns
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
];

// Délai humain aléatoire (1-8s, pas trop régulier)
export const humanDelay = async (min = 1000, max = 8000) => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  await new Promise(r => setTimeout(r, delay));
};

// Scroll humain (pas tout en une fois)
export const humanScroll = async (page: any) => {
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) {
      window.scrollBy(0, Math.floor(Math.random() * 300 + 100));
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000 + 500)));
    }
  });
};

// Mouvement de souris humain (fait semblant)
export const humanMouseMove = async (page: any) => {
  try {
    await page.mouse.move(Math.random() * 500 + 100, Math.random() * 500 + 100);
    await humanDelay(200, 1000);
  } catch { /* Ignore si pas supporté */ }
};

export async function launchBrowser(options: { headless?: boolean; proxy?: string } = {}) {
  // Choisir un user-agent et viewport aléatoires
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const viewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];

  const browser = await chromium.launch({
    headless: options.headless ?? true,
    args: [
      '--disable-blink-features=AutomationControlled', // Cache que c'est un bot
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      ...(options.proxy ? [`--proxy-server=${options.proxy}`] : [])
    ]
  });
  const context = await browser.newContext({
    userAgent,
    viewport,
    locale: 'fr-FR',
    timezoneId: 'Africa/Douala',
    permissions: ['geolocation'],
    geolocation: { latitude: 4.0511, longitude: 9.7679 }, // Cameroun pour plus de crédibilité
    javaScriptEnabled: true,
    acceptDownloads: false,
    colorScheme: 'dark', // Plus humain que light par défaut
  });
  const page = await context.newPage();
  
  // Comportements humanistes
  page.setDefaultTimeout(90000); // Un peu plus long pour éviter les timeouts forcés
  
  // Bloquer les ressources inutiles pour être plus rapide et moins détectable
  await page.route('**/*', async (route: any) => {
    const resourceType = route.request().resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  return { browser, context, page, humanDelay, humanScroll, humanMouseMove };
}
