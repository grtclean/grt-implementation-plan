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

// Navigate to /service-dashboard-admin
await page.goto('http://localhost:3000/service-dashboard-admin');
await page.waitForTimeout(4000);

// Take screenshot
await page.screenshot({ path: 'screenshot-service-admin.png', fullPage: false });
console.log('Screenshot saved to screenshot-service-admin.png');

await browser.close();
