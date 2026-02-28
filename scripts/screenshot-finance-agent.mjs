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
await page.goto('http://127.0.0.1:3000/finance-agent');
await page.waitForTimeout(5000);

// Remove overlays
async function clearOverlays() {
  await page.evaluate(() => {
    document.querySelectorAll('[data-radix-toast-viewport], [role="status"], [data-sonner-toaster], [data-radix-popper-content-wrapper]').forEach(el => el.remove());
    document.querySelectorAll('[data-state="open"][role="dialog"]').forEach(el => el.remove());
  });
  await page.waitForTimeout(300);
}

// Click Seed Demo button (RefreshCw icon button)
const seedBtn = page.locator('button').filter({ hasText: /Seed|Demo|演示/ });
if (await seedBtn.count() > 0) {
  await seedBtn.first().click({ force: true });
  console.log('Clicked Seed Demo');
  await page.waitForTimeout(3000);
} else {
  // Try the icon button next to title
  const iconBtns = page.locator('button:has(svg)');
  const btnCount = await iconBtns.count();
  for (let i = 0; i < btnCount; i++) {
    const text = await iconBtns.nth(i).textContent();
    if (text === '' || text?.trim() === '') {
      // Could be the seed button — skip for now
    }
  }
}

await clearOverlays();

// Screenshot 1: Submit tab (default)
await page.screenshot({ path: 'screenshot-finance-agent.png', fullPage: false });
console.log('Screenshot 1: submit');

// Click tab buttons (custom buttons, not Radix tabs)
async function clickNavButton(textMatch) {
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

// Screenshot 2: History tab
await clickNavButton('审核历史');
await page.screenshot({ path: 'screenshot-finance-agent-history.png', fullPage: false });
console.log('Screenshot 2: history');

// Screenshot 3: Policy tab
await clickNavButton('费用政策');
await page.screenshot({ path: 'screenshot-finance-agent-policy.png', fullPage: false });
console.log('Screenshot 3: policy');

await browser.close();
