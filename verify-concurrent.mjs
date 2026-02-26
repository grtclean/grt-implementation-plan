/**
 * Lightweight Concurrent Command Center Verification Script
 *
 * Uses Playwright as a LIBRARY (not the test runner).
 * Single browser → single page → sequential checks → minimal memory.
 *
 * Usage:  node verify-concurrent.mjs
 */
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = "test-results";
const results = [];
let page, browser;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(icon, msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`  ${icon}  [${ts}]  ${msg}`);
}

async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    const ms = Date.now() - t0;
    results.push({ name, status: "PASS", ms });
    log("\x1b[32m✓\x1b[0m", `${name}  (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - t0;
    results.push({ name, status: "FAIL", ms, error: err.message });
    log("\x1b[31m✗\x1b[0m", `${name}  — ${err.message}`);
  }
}

async function screenshot(filename) {
  await page.screenshot({
    path: path.join(OUT, filename),
    fullPage: true,
  });
}

async function visible(selector, timeout = 8000) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout });
  return el;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Ensure output dir
  fs.mkdirSync(OUT, { recursive: true });

  console.log("\n\x1b[36m━━━ Concurrent Command Center — Lightweight Verify ━━━\x1b[0m\n");

  // Launch ONE browser, ONE context, ONE page
  browser = await chromium.launch({
    headless: true,
    args: ["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();

  // ── Login ──────────────────────────────────────────────────────────────────
  log("🔑", "Logging in …");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForSelector("#username", { timeout: 10000 });
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  log("🔑", "Logged in");

  // ── Navigate ───────────────────────────────────────────────────────────────
  log("🔗", "Navigating to /concurrent-command-center …");
  await page.goto(`${BASE}/concurrent-command-center`, {
    waitUntil: "networkidle",
    timeout: 20000,
  });
  await page.waitForTimeout(2000);

  // ── Step 1: Page Header ────────────────────────────────────────────────────
  await step("1. Page header visible", async () => {
    await visible("text=并行调试指挥中心");
    await screenshot("concurrent-01-page-loaded.png");
  });

  // ── Step 2: Stat Cards ─────────────────────────────────────────────────────
  await step("2. Four stat cards", async () => {
    await visible("text=Active Sandboxes");
    await visible("text=Pending Merges");
    await visible("text=Commissioning Progress");
    await visible("text=Passed Sub-Systems");
    await screenshot("concurrent-02-stat-cards.png");
  });

  // ── Step 3: Software sandbox cards ─────────────────────────────────────────
  await step("3. Left panel — 4 sandbox cards", async () => {
    await visible("text=System Software Concurrent Sandbox");
    for (const label of ["Finance", "HR", "Quality", "Supply Chain"]) {
      await page.getByText(label, { exact: true }).first().waitFor({ state: "visible", timeout: 5000 });
    }
    await visible("text=Claude Agent 1");
    await visible("text=Gemini Planner");
    await screenshot("concurrent-03-sandbox-cards.png");
  });

  // ── Step 4: Approve Merge ──────────────────────────────────────────────────
  await step("4. Approve Merge → Merged badge", async () => {
    const btn = page.locator("button:has-text('Approve Merge')").first();
    await btn.waitFor({ state: "visible", timeout: 8000 });
    await btn.click();
    await page.waitForTimeout(1500);
    await visible("text=Merged");
    await screenshot("concurrent-04-merged.png");
  });

  // ── Step 5: Hardware sub-system cards ──────────────────────────────────────
  await step("5. Right panel — 5 sub-system cards", async () => {
    await visible("text=Equipment Commissioning Hub");
    await visible("text=SAIC New Energy Cleaning Line");
    for (const sub of [
      "Conveyor Belt System",
      "Ultrasonic Generator",
      "Drying System",
      "Filtration Unit",
      "PLC Control Panel",
    ]) {
      await visible(`text=${sub}`);
    }
    await screenshot("concurrent-05-hardware-cards.png");
  });

  // ── Step 6: Claim for Debugging ────────────────────────────────────────────
  await step("6. Claim for Debugging", async () => {
    const claimBtn = page.locator("button:has-text('Claim')").first();
    await claimBtn.waitFor({ state: "visible", timeout: 8000 });
    await claimBtn.click();
    await page.waitForTimeout(1500);
    await visible("text=Current User");
    await screenshot("concurrent-06-claimed.png");
  });

  // ── Step 7: Mark Passed ────────────────────────────────────────────────────
  await step("7. Mark Passed", async () => {
    const passBtn = page.locator("button:has-text('Mark Passed')").first();
    await passBtn.waitFor({ state: "visible", timeout: 8000 });
    await passBtn.click();
    await page.waitForTimeout(1500);
    await screenshot("concurrent-07-mark-passed.png");
  });

  // ── Step 8: Role Simulator ─────────────────────────────────────────────────
  await step("8. Multi-Role Session Simulator", async () => {
    await visible("text=Multi-Role Session Simulator");
    await visible("button:has-text('Admin')");
    await visible("button:has-text('HR Manager')");
    await visible("button:has-text('Sales')");
    await screenshot("concurrent-08-role-simulator.png");
  });

  // ── Step 9: Sidebar menu ───────────────────────────────────────────────────
  await step("9. Sidebar — AI DevOps → 并行指挥中心", async () => {
    // Try to expand AI DevOps group
    const devops = page.locator("text=AI DevOps").first();
    if (await devops.isVisible().catch(() => false)) {
      await devops.click();
      await page.waitForTimeout(800);
    }
    const zhMenu = await page.locator("text=并行指挥中心").first().isVisible().catch(() => false);
    const enMenu = await page.locator("text=Concurrent Command").first().isVisible().catch(() => false);
    if (!zhMenu && !enMenu) throw new Error("Menu item not found in sidebar");
    await screenshot("concurrent-09-sidebar.png");
  });

  // ── Step 10: Full dashboard ────────────────────────────────────────────────
  await step("10. Full dashboard screenshot", async () => {
    await page.waitForTimeout(1000);
    await screenshot("concurrent-10-full-dashboard.png");
  });

  // ── Cleanup & Report ───────────────────────────────────────────────────────
  await context.close();
  await browser.close();

  console.log("\n\x1b[36m━━━ Results ━━━\x1b[0m\n");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`  Total: ${results.length}   \x1b[32mPassed: ${passed}\x1b[0m   \x1b[31mFailed: ${failed}\x1b[0m\n`);

  // Write markdown report
  const md = [
    "# Concurrent Command Center — Verification Report",
    "",
    `> Run: ${new Date().toISOString()}`,
    `> Method: Lightweight single-browser sequential verify`,
    "",
    "| # | Check | Status | Time |",
    "|---|-------|--------|------|",
    ...results.map(
      (r) =>
        `| ${r.name.split(".")[0]} | ${r.name.slice(r.name.indexOf(".") + 2)} | ${r.status === "PASS" ? "✅ PASS" : "❌ FAIL"} | ${r.ms}ms |`
    ),
    "",
    `**Summary: ${passed}/${results.length} passed**`,
    "",
  ];

  if (failed > 0) {
    md.push("## Failures", "");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        md.push(`- **${r.name}**: ${r.error}`);
      });
    md.push("");
  }

  md.push("## Screenshots", "");
  for (let i = 1; i <= 10; i++) {
    const files = fs.readdirSync(OUT).filter((f) => f.startsWith(`concurrent-${String(i).padStart(2, "0")}`));
    if (files.length > 0) {
      md.push(`- Step ${i}: \`${files[0]}\``);
    }
  }

  const reportPath = path.join(OUT, "concurrent-verify-report.md");
  fs.writeFileSync(reportPath, md.join("\n"));
  console.log(`  📄 Report: ${reportPath}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\n\x1b[31m  Fatal error:\x1b[0m", err.message);
  browser?.close().catch(() => {});
  process.exit(2);
});
