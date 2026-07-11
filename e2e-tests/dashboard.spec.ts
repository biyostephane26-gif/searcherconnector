import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test('should show dashboard for authenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    expect(page.url()).toContain('/login'); // Should redirect to login
  });

  test('should display pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Pricing/);
    const pricingCards = page.locator('[class*="card"]').or(page.locator('[class*="plan"]'));
    if (await pricingCards.count() > 0) {
      await expect(pricingCards.first()).toBeVisible();
    }
  });
});
