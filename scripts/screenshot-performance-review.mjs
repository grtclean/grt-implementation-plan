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
await page.goto('http://127.0.0.1:3000/performance-review');
await page.waitForTimeout(8000); // longer wait — auto-seeds on mount

// Remove overlays
async function clearOverlays() {
  await page.evaluate(() => {
    document.querySelectorAll('[data-radix-toast-viewport], [role="status"], [data-sonner-toaster], [data-radix-popper-content-wrapper]').forEach(el => el.remove());
    document.querySelectorAll('[data-state="open"][role="dialog"]').forEach(el => el.remove());
  });
  await page.waitForTimeout(300);
}
await clearOverlays();

// Screenshot 1: Dashboard tab (default)
await page.screenshot({ path: 'screenshot-performance-review.png', fullPage: false });
console.log('Screenshot 1: dashboard');

// Tab click helper
async function clickTab(textMatch) {
  await clearOverlays();
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();
  for (let i = 0; i < tabCount; i++) {
    const text = await tabs.nth(i).textContent();
    if (text && text.includes(textMatch)) {
      await tabs.nth(i).click({ force: true });
      console.log(`  Clicked tab: ${text.trim()}`);
      break;
    }
  }
  await page.waitForTimeout(2000);
  await clearOverlays();
}

// Screenshot 2: Evaluate tab
await clickTab('评委');
await page.screenshot({ path: 'screenshot-performance-review-evaluate.png', fullPage: false });
console.log('Screenshot 2: evaluate');

// Screenshot 3: Summary tab
await clickTab('会议纪要');
await page.screenshot({ path: 'screenshot-performance-review-summary.png', fullPage: false });
console.log('Screenshot 3: summary');

await browser.close();
