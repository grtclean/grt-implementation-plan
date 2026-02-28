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

// Navigate to Digital Cloud Hall with module=service
await page.goto('http://localhost:3000/digital-cloud-hall?module=service');
await page.waitForTimeout(5000);

// Take full page screenshot
await page.screenshot({ path: 'screenshot-global-service.png', fullPage: true });
console.log('Screenshot 1 saved (full page)');

// Scroll down to map + compliance sections — try both window and main content container
await page.evaluate(() => {
  window.scrollTo(0, 1200);
  // Also scroll the main content area if it's a nested scrollable
  const main = document.querySelector('main') || document.querySelector('[class*="overflow-y"]') || document.querySelector('[class*="overflow-auto"]');
  if (main) main.scrollTop = 1200;
  // Also try the direct parent of the dashboard content
  const containers = document.querySelectorAll('div');
  for (const el of containers) {
    if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 300) {
      el.scrollTop = 1200;
    }
  }
});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'screenshot-global-service-map.png', fullPage: false });
console.log('Screenshot 2 saved (map + compliance)');

await browser.close();
