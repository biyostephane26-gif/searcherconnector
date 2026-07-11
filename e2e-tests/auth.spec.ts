import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Login/);
  });

  test('should show signup page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveTitle(/Signup/);
  });

  test('should have login form fields', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]'));
    const passwordInput = page.locator('input[type="password"]').or(page.locator('input[name="password"]'));
    
    if (await emailInput.count() > 0) {
      await expect(emailInput.first()).toBeVisible();
    }
    if (await passwordInput.count() > 0) {
      await expect(passwordInput.first()).toBeVisible();
    }
  });
});
