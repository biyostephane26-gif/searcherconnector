import { test, expect } from '@playwright/test';
import { BrowserCheck, RetryStrategyBuilder, Frequency } from 'checkly/constructs';

new BrowserCheck('searcher-connector-homepage', {
  name: 'Homepage Load Test',
  frequency: Frequency.EVERY_5_MINUTES,
  locations: ['us-east-1', 'eu-west-1', 'af-south-1'],
  tags: ['core', 'homepage'],
  retryStrategy: RetryStrategyBuilder.linearStrategy({
    baseBackoffSeconds: 60,
    maxRetries: 2,
    maxDurationSeconds: 300,
    sameRegion: true,
  }),
  code: async ({ page }) => {
    await page.goto(process.env.ENVIRONMENT_URL || 'https://searcherconnector.com');
    await expect(page).toHaveTitle(/Searcher Connector/);
    await expect(page.locator('h1').first()).toBeVisible();
  },
});
