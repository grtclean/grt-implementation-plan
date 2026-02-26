import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3006";

test.describe("Concurrent Command Center — Full E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE}/login`);
    await page.waitForSelector("#username", { timeout: 10000 });
    await page.fill("#username", "admin");
    await page.fill("#password", "admin123");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    // Navigate to the command center
    await page.goto(`${BASE}/concurrent-command-center`);
    await page.waitForTimeout(3000);
  });

  test("1. Page loads with correct header", async ({ page }) => {
    await expect(page.locator("text=并行调试指挥中心")).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: "test-results/concurrent-01-page-loaded.png", fullPage: true });
  });

  test("2. Shows 4 stat cards", async ({ page }) => {
    await expect(page.locator("text=Active Sandboxes")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Pending Merges")).toBeVisible();
    await expect(page.locator("text=Commissioning Progress")).toBeVisible();
    await expect(page.locator("text=Passed Sub-Systems")).toBeVisible();
    await page.screenshot({ path: "test-results/concurrent-02-stat-cards.png", fullPage: true });
  });

  test("3. Left panel: 4 sandbox cards visible", async ({ page }) => {
    await expect(page.locator("text=System Software Concurrent Sandbox")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Finance", { exact: true })).toBeVisible();
    await expect(page.getByText("HR", { exact: true })).toBeVisible();
    await expect(page.getByText("Quality", { exact: true })).toBeVisible();
    await expect(page.getByText("Supply Chain", { exact: true })).toBeVisible();

    // AI agent badges
    await expect(page.locator("text=Claude Agent 1")).toBeVisible();
    await expect(page.locator("text=Gemini Planner")).toBeVisible();

    // Status badges
    await expect(page.locator("text=TESTING")).toBeVisible();
    await expect(page.locator("text=READY FOR MERGE")).toBeVisible();
    await page.screenshot({ path: "test-results/concurrent-03-sandbox-cards.png", fullPage: true });
  });

  test("4. Left panel: Approve Merge → Merged badge", async ({ page }) => {
    const approveBtn = page.locator("button:has-text('Approve Merge')");
    await expect(approveBtn).toBeVisible({ timeout: 15000 });

    await approveBtn.click();
    await page.waitForTimeout(2000);

    // Should show Merged badge
    await expect(page.locator("text=Merged").first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "test-results/concurrent-04-merged.png", fullPage: true });
  });

  test("5. Right panel: 5 sub-system cards for SAIC project", async ({ page }) => {
    await expect(page.locator("text=Equipment Commissioning Hub")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=SAIC New Energy Cleaning Line")).toBeVisible();

    await expect(page.locator("text=Conveyor Belt System")).toBeVisible();
    await expect(page.locator("text=Ultrasonic Generator")).toBeVisible();
    await expect(page.locator("text=Drying System")).toBeVisible();
    await expect(page.locator("text=Filtration Unit")).toBeVisible();
    await expect(page.locator("text=PLC Control Panel")).toBeVisible();
    await page.screenshot({ path: "test-results/concurrent-05-hardware-cards.png", fullPage: true });
  });

  test("6. Right panel: Claim for Debugging on IDLE sub-system", async ({ page }) => {
    const claimBtns = page.locator("button:has-text('Claim')");
    await expect(claimBtns.first()).toBeVisible({ timeout: 15000 });

    await claimBtns.first().click();
    await page.waitForTimeout(2000);

    // Should show "Current User" as assigned engineer
    await expect(page.locator("text=Current User").first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "test-results/concurrent-06-claimed.png", fullPage: true });
  });

  test("7. Right panel: Mark as Passed on DEBUGGING sub-system", async ({ page }) => {
    const passBtn = page.locator("button:has-text('Mark Passed')");
    await expect(passBtn.first()).toBeVisible({ timeout: 15000 });

    await passBtn.first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "test-results/concurrent-07-mark-passed.png", fullPage: true });
  });

  test("8. Multi-Role Session Simulator buttons visible", async ({ page }) => {
    await expect(page.locator("text=Multi-Role Session Simulator")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("button:has-text('Admin')")).toBeVisible();
    await expect(page.locator("button:has-text('HR Manager')")).toBeVisible();
    await expect(page.locator("button:has-text('Sales')")).toBeVisible();
    await page.screenshot({ path: "test-results/concurrent-08-role-simulator.png", fullPage: true });
  });

  test("9. Sidebar: AI DevOps → 并行指挥中心 with NEW badge", async ({ page }) => {
    await page.waitForTimeout(1000);

    // Expand AI DevOps group in sidebar
    const aiDevOps = page.locator("text=AI DevOps").first();
    if (await aiDevOps.isVisible({ timeout: 5000 }).catch(() => false)) {
      await aiDevOps.click();
      await page.waitForTimeout(1000);
    }

    // Look for 并行指挥中心 or Concurrent Command in sidebar
    const menuText = page.locator("text=并行指挥中心");
    const menuTextEn = page.locator("text=Concurrent Command");

    const visible = await menuText.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await menuTextEn.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(visible).toBeTruthy();
    await page.screenshot({ path: "test-results/concurrent-09-sidebar.png", fullPage: true });
  });

  test("10. Full dashboard screenshot", async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/concurrent-10-full-dashboard.png", fullPage: true });
  });
});
