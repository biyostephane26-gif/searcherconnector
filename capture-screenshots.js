
const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Going to homepage...');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'step-01-homepage.png', fullPage: true });
  console.log('Saved homepage screenshot!');

  console.log('Going to signup page...');
  await page.goto('http://localhost:3000/signup?type=job_seeker');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'step-02-signup.png', fullPage: true });
  console.log('Saved signup screenshot!');

  console.log('Going to login page...');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'step-03-login.png', fullPage: true });
  console.log('Saved login screenshot!');

  console.log('Going to pricing page...');
  await page.goto('http://localhost:3000/pricing');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'step-04-pricing.png', fullPage: true });
  console.log('Saved pricing screenshot!');

  console.log('Going to social page...');
  await page.goto('http://localhost:3000/social');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'step-05-social.png', fullPage: true });
  console.log('Saved social screenshot!');

  console.log('Done! Closing browser...');
  await browser.close();
})();
