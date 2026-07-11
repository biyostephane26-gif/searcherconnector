'use server';

import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'playwright';

chromium.use(stealth());

// ======================================================
// SUPER HYPER MEGA ANTI-DETECTION
// ======================================================

// 📱 + 💻 GIGANTESQUE LISTE DE USER-AGENTS RÉELS
const USER_AGENTS = [
  // Chrome Desktop (Windows)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  // Chrome Desktop (Mac)
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  // Firefox Desktop
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0',
  // Safari Desktop
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  // Chrome Mobile (iOS)
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.82 Mobile/15E148 Safari/604.1',
  // Safari Mobile (iOS)
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  // Chrome Mobile (Android)
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.123 Mobile Safari/537.36',
];

// 📐 VIEWPORTS VARIÉS
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 375, height: 812 }, // iPhone X
  { width: 390, height: 844 }, // iPhone 15
  { width: 412, height: 915 }, // Android
];

// 🗺️ TIMEZONES RÉELLES
const TIMEZONES = [
  'Africa/Douala', 'Africa/Lagos', 'Africa/Johannesburg',
  'Europe/Paris', 'Europe/London',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Asia/Dubai', 'Asia/Singapore',
];

// 🌍 LOCALISATIONS RÉELLES
const GEOLOCATIONS = [
  { latitude: 4.0511, longitude: 9.7679 }, // Douala
  { latitude: 6.5244, longitude: 3.3792 }, // Lagos
  { latitude: 48.8566, longitude: 2.3522 }, // Paris
  { latitude: 51.5074, longitude: -0.1278 }, // London
  { latitude: 40.7128, longitude: -74.0060 }, // NYC
];

// ======================================================
// COMPORTEMENTS HUMAINS AVANCÉS
// ======================================================

// Délai humain ultra réaliste (pas uniforme, distribution normale)
export const humanDelay = async (min = 800, max = 6000) => {
  const mean = (min + max) / 2;
  const stdDev = (max - mean) / 3;
  let delay;
  do {
    delay = mean + stdDev * (Math.random() - 0.5) * 2;
  } while (delay < min || delay > max);
  await new Promise(r => setTimeout(r, Math.floor(delay)));
};

// Mouvement de souris BEZIER (naturel, pas ligne droite !)
export const humanMouseMoveBezier = async (page: any, toX: number, toY: number) => {
  const from = await page.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
  const controlX = from.x + (toX - from.x) * 0.5 + (Math.random() - 0.5) * 200;
  const controlY = from.y + (toY - from.y) * 0.5 + (Math.random() - 0.5) * 100;
  
  const steps = Math.floor(Math.random() * 30) + 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1-t)*(1-t)*from.x + 2*(1-t)*t*controlX + t*t*toX;
    const y = (1-t)*(1-t)*from.y + 2*(1-t)*t*controlY + t*t*toY;
    await page.mouse.move(x, y);
    await new Promise(r => setTimeout(r, Math.random() * 10 + 5));
  }
};

// Scroll humain (petits sauts, pauses, parfois remonte)
export const humanScroll = async (page: any, direction: 'down' | 'up' | 'random' = 'down') => {
  let currentScroll = 0;
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  
  const scrollTimes = Math.floor(Math.random() * 4) + 3;
  for (let i = 0; i < scrollTimes; i++) {
    const scrollAmount = Math.floor(Math.random() * 400) + 200;
    if (direction === 'down') currentScroll = Math.min(currentScroll + scrollAmount, pageHeight);
    else if (direction === 'up') currentScroll = Math.max(currentScroll - scrollAmount, 0);
    else currentScroll = Math.min(Math.max(currentScroll + (Math.random() > 0.5 ? scrollAmount : -scrollAmount), 0), pageHeight);
    
    await page.evaluate((pos) => window.scrollTo({ top: pos, behavior: 'smooth' }), currentScroll);
    await humanDelay(300, 1200);
  }
};

// Clic humain (hover d'abord, petit décalage, pause, puis clic)
export const humanClick = async (page: any, selector: string) => {
  await page.waitForSelector(selector, { timeout: 15000 });
  const element = await page.$(selector);
  if (!element) return;
  
  const box = await element.boundingBox();
  if (!box) return;
  
  // Clic pas exactement au centre
  const x = box.x + box.width * (0.3 + Math.random() * 0.4);
  const y = box.y + box.height * (0.3 + Math.random() * 0.4);
  
  await humanMouseMoveBezier(page, x, y);
  await humanDelay(200, 800);
  await page.mouse.down();
  await humanDelay(50, 150);
  await page.mouse.up();
};

// ======================================================
// FINGERPRINTING DYNAMIQUE
// ======================================================

export const generateFingerprint = () => {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const viewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
  const timezone = TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];
  const geolocation = GEOLOCATIONS[Math.floor(Math.random() * GEOLOCATIONS.length)];
  const language = Math.random() > 0.5 ? 'fr-FR' : 'en-US';
  const colorScheme = Math.random() > 0.5 ? 'dark' : 'light';
  const platform = ua.includes('Win') ? 'Win32' : ua.includes('Mac') ? 'MacIntel' : 'Linux x86_64';
  
  return { ua, viewport, timezone, geolocation, language, colorScheme, platform };
};

// ======================================================
// LANCEMENT DU BROWSER ULTRA SÛR
// ======================================================

export async function launchUltraBrowser(options: { headless?: boolean; proxy?: string } = {}) {
  const fingerprint = generateFingerprint();
  
  const browser = await chromium.launch({
    headless: options.headless ?? true,
    executablePath: executablePath(),
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      ...(options.proxy ? [`--proxy-server=${options.proxy}`] : [])
    ]
  });

  const context = await browser.newContext({
    userAgent: fingerprint.ua,
    viewport: fingerprint.viewport,
    locale: fingerprint.language,
    timezoneId: fingerprint.timezone,
    permissions: ['geolocation'],
    geolocation: fingerprint.geolocation,
    javaScriptEnabled: true,
    acceptDownloads: false,
    colorScheme: fingerprint.colorScheme,
    extraHTTPHeaders: {
      'Accept-Language': `${fingerprint.language},fr;q=0.9,en;q=0.8`,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    }
  });

  // Injecter des scripts anti-détection dans le contexte
  await context.addInitScript(() => {
    // Supprimer les traces de WebDriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // Simuler des plugins humains
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin' },
        { name: 'Chrome PDF Viewer' },
        { name: 'Native Client' },
      ],
    });
    
    // Simuler des langues
    Object.defineProperty(navigator, 'languages', {
      get: () => ['fr-FR', 'fr', 'en-US', 'en'],
    });
    
    // Simuler une batterie
    const originalBattery = (navigator as any).getBattery;
    if (originalBattery) {
      (navigator as any).getBattery = async () => {
        const bat = await originalBattery.call(navigator);
        Object.defineProperty(bat, 'charging', { get: () => Math.random() > 0.5 });
        Object.defineProperty(bat, 'level', { get: () => 0.3 + Math.random() * 0.7 });
        return bat;
      };
    }
    
    // Fausser le canvas fingerprint
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args: any[]) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += Math.random() * 2;
          imageData.data[i+1] += Math.random() * 2;
          imageData.data[i+2] += Math.random() * 2;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return toDataURL.apply(this, args);
    };
  });

  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  // Ne pas bloquer les ressources (ça semble moins humain !)
  // Au lieu de ça, on les charge mais on peut les rendre plus "lents" si besoin

  return { 
    browser, 
    context, 
    page, 
    fingerprint,
    humanDelay, 
    humanScroll, 
    humanMouseMoveBezier,
    humanClick
  };
}
