import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await context.newPage();

// Login
await page.request.post('http://localhost:3000/api/auth/login', {
  data: { username: 'admin', password: 'admin123' },
});
await page.waitForTimeout(500);

// Navigate
await page.goto('http://localhost:3000/finance-agent');
await page.waitForTimeout(3000);

// Seed demo data
await page.locator('button:has-text("生成演示数据")').click();
await page.waitForTimeout(4000);

// Reload to pick up seeded data
await page.reload();
await page.waitForTimeout(4000);

// Select the intercepted claim (second option = FA-DEMO-002)
const select = page.locator('select');
const options = await select.locator('option').allTextContents();
console.log('Options:', options);

// Find the FA-DEMO-002 intercept one
for (let i = 0; i < options.length; i++) {
  if (options[i].includes('DEMO-002') || options[i].includes('62,000') || options[i].includes('62000')) {
    await select.selectOption({ index: i });
    break;
  }
}
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshot-finance-agent-demo.png', fullPage: false });
console.log('Screenshot 1: intercept card');

// History tab
await page.locator('button:has-text("审核历史")').click();
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshot-finance-agent-history.png', fullPage: false });
console.log('Screenshot 2: history');

// Policy tab
await page.locator('button:has-text("费用政策")').click();
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshot-finance-agent-policy.png', fullPage: false });
console.log('Screenshot 3: policy');

await browser.close();
