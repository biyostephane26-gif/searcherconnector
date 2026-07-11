import { test, expect } from '@playwright/test';
import { BrowserCheck, RetryStrategyBuilder, Frequency } from 'checkly/constructs';

new BrowserCheck('searcher-connector-theme', {
  name: 'Dark/Light Mode Test',
  frequency: Frequency.EVERY_15_MINUTES,
  locations: ['us-east-1', 'eu-west-1'],
  tags: ['ui', 'theme'],
  retryStrategy: RetryStrategyBuilder.linearStrategy({
    baseBackoffSeconds: 60,
    maxRetries: 2,
    maxDurationSeconds: 300,
    sameRegion: true,
  }),
  code: async ({ page }) => {
    await page.goto(process.env.ENVIRONMENT_URL || 'https://searcherconnector.com');
    
    // Check that default is dark mode
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/light-mode/);
    
    // If logged in, test theme toggle (requires navigation to settings)
    // For now, just verify that the theme system is present in the code
    await expect(page.locator('head')).toContainText('--bg-primary');
  },
});
