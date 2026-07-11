const { chromium } = require('playwright');
const path = require('path');

async function captureJourney() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
  });
  const context = await browser.newContext({
    recordVideo: {
      dir: path.join(__dirname, 'videos'),
    },
  });
  const page = await context.newPage();

  const pages = [
    { name: 'landing', url: 'http://localhost:3001/' },
    { name: 'signup', url: 'http://localhost:3001/signup?type=job_seeker' },
    { name: 'login', url: 'http://localhost:3001/login' },
    { name: 'onboarding', url: 'http://localhost:3001/onboarding' },
    { name: 'dashboard', url: 'http://localhost:3001/dashboard' },
    { name: 'opportunities', url: 'http://localhost:3001/opportunities' },
    { name: 'pricing', url: 'http://localhost:3001/pricing' },
    { name: 'social', url: 'http://localhost:3001/social' },
    { name: 'founder', url: 'http://localhost:3001/founder' },
  ];

  for (const { name, url } of pages) {
    console.log(`Visiting ${name} at ${url}...`);
    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
      const screenshotPath = path.join(__dirname, 'screenshots', `${name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot: ${screenshotPath}`);
    } catch (error) {
      console.warn(`Failed to capture ${name}:`, error.message);
    }
  }

  await context.close();
  await browser.close();
  console.log('Done! Check screenshots and videos folders!');
  console.log(`Screenshots saved to: ${path.join(__dirname, 'screenshots')}`);
  console.log(`Videos saved to: ${path.join(__dirname, 'videos')}`);
}

captureJourney().catch(console.error);
