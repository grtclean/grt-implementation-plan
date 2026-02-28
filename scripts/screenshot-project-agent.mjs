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
await page.goto('http://127.0.0.1:3000/project-agent');
await page.waitForTimeout(6000);

// Check content loaded
const hasContent = await page.locator('text=AI 项目 Agent').isVisible().catch(() => false);
if (!hasContent) {
  console.log('Page still loading, taking screenshot of current state');
  await page.screenshot({ path: 'screenshot-project-agent.png', fullPage: false });
  await browser.close();
  process.exit(0);
}

// Click Seed Demo
const seedBtn = page.locator('button', { hasText: 'Seed Demo' });
if (await seedBtn.isVisible()) {
  await seedBtn.click();
  console.log('Clicked Seed Demo');
  await page.waitForTimeout(4000);
}

// Remove overlays
async function clearOverlays() {
  await page.evaluate(() => {
    document.querySelectorAll('[data-radix-toast-viewport], [role="status"], [data-sonner-toaster], [data-radix-popper-content-wrapper]').forEach(el => el.remove());
    document.querySelectorAll('[data-state="open"][role="dialog"]').forEach(el => el.remove());
  });
  await page.waitForTimeout(300);
}
await clearOverlays();

// Select project
await page.evaluate(() => {
  const combobox = document.querySelector('[role="combobox"]');
  if (combobox) combobox.click();
});
await page.waitForTimeout(800);

const options = page.locator('[role="option"]');
const count = await options.count();
console.log(`Found ${count} project options`);
if (count > 0) {
  for (let i = 0; i < count; i++) {
    const text = await options.nth(i).textContent();
    if (text && text.includes('清洗线A')) {
      await options.nth(i).click({ force: true });
      console.log('Selected:', text);
      break;
    }
    if (i === count - 1) {
      await options.first().click({ force: true });
      console.log('Selected first project');
    }
  }
  await page.waitForTimeout(3000);
}

await clearOverlays();

// Screenshot 1: Lifecycle tab (default)
await page.screenshot({ path: 'screenshot-project-agent.png', fullPage: false });
console.log('Screenshot 1: lifecycle');

// Tab click helper using Playwright native click with force
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

// Screenshot 2: AI Reviews tab
await clickTab('AI评审');
await page.screenshot({ path: 'screenshot-project-agent-reviews.png', fullPage: false });
console.log('Screenshot 2: reviews');

// Screenshot 3: Risk Alerts tab
await clickTab('风险预警');
await page.screenshot({ path: 'screenshot-project-agent-risks.png', fullPage: false });
console.log('Screenshot 3: risks');

// Screenshot 4: Timeline tab
await clickTab('时间线');
await page.screenshot({ path: 'screenshot-project-agent-timeline.png', fullPage: false });
console.log('Screenshot 4: timeline');

await browser.close();
