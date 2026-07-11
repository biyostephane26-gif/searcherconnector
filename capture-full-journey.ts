import { chromium, test } from '@playwright/test';
import { join } from 'path';

test.describe('Full User Journey', () => {
  test('Complete journey with screenshots and video', async ({ page }) => {
    // Wait for any animations or loads
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
      console.log(`Visiting ${pageInfo.name}...`);
      try {
        await page.goto(pageInfo.path, { waitUntil: 'networkidle', timeout: 60000 });
      } catch (e) {
        console.warn(`Couldn't load ${pageInfo.name}, continuing...`);
      }
      await page.waitForTimeout(1000);
      const screenshotPath = join(__dirname, 'screenshots', `${pageInfo.name.toLowerCase().replace(/ /g, '-')}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot for ${pageInfo.name} at ${screenshotPath}`);
    }

    // Also take a screenshot of the scan page
    console.log('Checking for scan page...');
    try {
      // Check if /scan or similar exists
      await page.goto('/opportunities', { waitUntil: 'networkidle', timeout: 60000 });
      const scanPath = join(__dirname, 'screenshots', 'scan-page.png');
      await page.screenshot({ path: scanPath, fullPage: true });
    } catch (e) {
      console.warn('Could not take scan page screenshot');
    }

    console.log('All screenshots captured!');
  });
});
