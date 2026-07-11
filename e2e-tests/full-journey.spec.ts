import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Full Job Seeker Journey', () => {
  test('Visit all pages and capture screenshots', async ({ page }) => {
    const pagesToVisit = [
      { name: 'Landing', path: '/' },
      { name: 'Signup', path: '/signup?type=job_seeker' },
      { name: 'Login', path: '/login' },
      { name: 'Onboarding', path: '/onboarding' },
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Opportunities', path: '/opportunities' },
      { name: 'Pricing', path: '/pricing' },
      { name: 'Social Network', path: '/social' },
      { name: 'Founder Dashboard', path: '/founder' },
    ];

    for (const pageInfo of pagesToVisit) {
      console.log(`Visiting ${pageInfo.name} at ${pageInfo.path}...`);
      try {
        await page.goto(pageInfo.path, { waitUntil: 'networkidle', timeout: 60000 });
      } catch (e) {
        console.warn(`Couldn't load ${pageInfo.name}, continuing...`);
      }
      await page.waitForTimeout(1500);
      const screenshotPath = join(__dirname, '..', 'screenshots', `${pageInfo.name.toLowerCase().replace(/ /g, '-')}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot: ${screenshotPath}`);
    }
  });
});
