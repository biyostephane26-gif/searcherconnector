import { test, expect } from '@playwright/test';

test.describe('Searcher Connector Home Page', () => {
  test('should load the home page correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Searcher Connector/);
  });

  test('should display the main hero section', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-testid="hero-section"]').or(page.locator('h1').first());
    await expect(hero).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('nav a').or(page.locator('header a'));
    await expect(navLinks.first()).toBeVisible();
  });
});
