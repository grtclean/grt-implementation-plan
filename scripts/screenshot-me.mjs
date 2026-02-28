import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await context.newPage();

// Login via API
const response = await page.request.post('http://localhost:3000/api/auth/login', {
  data: { username: 'admin', password: 'admin123' },
});
console.log('Login status:', response.status());
await page.waitForTimeout(500);

// Navigate to /me
await page.goto('http://localhost:3000/me');
await page.waitForTimeout(5000);

// Scroll down to show the daily plan categories
await page.evaluate(() => {
  const main = document.querySelector('main') || document.querySelector('.overflow-auto') || document.documentElement;
  main.scrollTop = 450;
});
await page.waitForTimeout(1000);

// Take screenshot
await page.screenshot({ path: 'screenshot-me-daily.png', fullPage: false });
console.log('Screenshot saved to screenshot-me-daily.png');

await browser.close();
