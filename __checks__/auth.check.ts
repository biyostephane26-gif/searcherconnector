import { test, expect } from '@playwright/test';
import { BrowserCheck, RetryStrategyBuilder, Frequency } from 'checkly/constructs';

new BrowserCheck('searcher-connector-auth', {
  name: 'Authentication Flow Test',
  frequency: Frequency.EVERY_10_MINUTES,
  locations: ['us-east-1', 'eu-west-1', 'af-south-1'],
  tags: ['core', 'auth'],
  retryStrategy: RetryStrategyBuilder.linearStrategy({
    baseBackoffSeconds: 60,
    maxRetries: 2,
    maxDurationSeconds: 300,
    sameRegion: true,
  }),
  code: async ({ page }) => {
    // Test login page load
    await page.goto(`${process.env.ENVIRONMENT_URL || 'https://searcherconnector.com'}/login`);
    await expect(page.locator('text=Sign In')).toBeVisible();
    
    // Test signup page load
    await page.goto(`${process.env.ENVIRONMENT_URL || 'https://searcherconnector.com'}/signup`);
    await expect(page.locator('text=Create Account')).toBeVisible();
  },
});
