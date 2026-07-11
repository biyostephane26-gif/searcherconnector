import { test, expect } from '@playwright/test';

test.describe('Complete Job Seeker Journey', () => {
  test('Visit all key pages and capture screenshots', async ({ page }, testInfo) => {
    // Step 1: Go to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `step-01-homepage.png`, fullPage: true });
    testInfo.attach('Homepage', { path: `step-01-homepage.png`, contentType: 'image/png' });

    // Step 2: Signup page
    await page.goto('/signup?type=job_seeker');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `step-02-signup-page.png`, fullPage: true });
    testInfo.attach('Sign Up Page', { path: `step-02-signup-page.png`, contentType: 'image/png' });

    // Step 3: Login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `step-03-login-page.png`, fullPage: true });
    testInfo.attach('Login Page', { path: `step-03-login-page.png`, contentType: 'image/png' });

    // Step 4: Dashboard (let's see if we can access it - might redirect to login)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `step-04-dashboard.png`, fullPage: true });
    testInfo.attach('Dashboard', { path: `step-04-dashboard.png`, contentType: 'image/png' });

    // Step 5: Opportunities
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `step-05-opportunities.png`, fullPage: true });
    testInfo.attach('Opportunities', { path: `step-05-opportunities.png`, contentType: 'image/png' });

    // Step 6: Pricing
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `step-06-pricing.png`, fullPage: true });
    testInfo.attach('Pricing', { path: `step-06-pricing.png`, contentType: 'image/png' });

    // Step 7: Social Network
    await page.goto('/social');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `step-07-social.png`, fullPage: true });
    testInfo.attach('Social Network', { path: `step-07-social.png`, contentType: 'image/png' });
  });
});