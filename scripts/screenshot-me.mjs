import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await context.newPage();

// Login
const resp = await page.request.post('http://127.0.0.1:3000/api/auth/login', {
  data: { username: 'admin', password: 'admin123' },
});
console.log('Login status:', resp.status());
await page.waitForTimeout(500);

// Navigate
await page.goto('http://127.0.0.1:3000/me');
await page.waitForTimeout(5000);

// Remove overlays
async function clearOverlays() {
  await page.evaluate(() => {
    document.querySelectorAll('[data-radix-toast-viewport], [role="status"], [data-sonner-toaster], [data-radix-popper-content-wrapper]').forEach(el => el.remove());
    document.querySelectorAll('[data-state="open"][role="dialog"]').forEach(el => el.remove());
  });
  await page.waitForTimeout(300);
}
await clearOverlays();

// Screenshot 1: Daily tab (default)
await page.screenshot({ path: 'screenshot-me.png', fullPage: false });
console.log('Screenshot 1: daily (top)');

// Scroll down to show more content
await page.evaluate(() => {
  const main = document.querySelector('main') || document.querySelector('.overflow-auto') || document.documentElement;
  main.scrollTop = 500;
});
await page.waitForTimeout(1000);
await page.screenshot({ path: 'screenshot-me-daily.png', fullPage: false });
console.log('Screenshot 2: daily (scrolled)');

// Tab click helper
async function clickButton(textMatch) {
  await clearOverlays();
  const buttons = page.locator('button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const text = await buttons.nth(i).textContent();
    if (text && text.includes(textMatch)) {
      await buttons.nth(i).click({ force: true });
      console.log(`  Clicked: ${text.trim()}`);
      break;
    }
  }
  await page.waitForTimeout(2000);
  await clearOverlays();
}

// Screenshot 3: Weekly tab
await clickButton('每周');
await page.screenshot({ path: 'screenshot-me-weekly.png', fullPage: false });
console.log('Screenshot 3: weekly');

// Screenshot 4: Monthly tab
await clickButton('每月');
await page.screenshot({ path: 'screenshot-me-monthly.png', fullPage: false });
console.log('Screenshot 4: monthly');

await browser.close();
