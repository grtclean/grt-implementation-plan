import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await context.newPage();

// Login via API
const loginRes = await page.request.post('http://localhost:3000/api/auth/login', {
  data: { username: 'admin', password: 'admin123' },
});
console.log('Login status:', loginRes.status());
await page.waitForTimeout(500);

// ─── 1. Seed base demo data (clients, equipments, tickets, spare parts) ───
console.log('Seeding NA demo data...');
await page.goto('http://localhost:3000/service-dashboard-admin');
await page.waitForTimeout(3000);

// Call seedNADemo via tRPC batch endpoint
const seedRes = await page.evaluate(async () => {
  const res = await fetch('/api/trpc/serviceDashboard.seedNADemo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: {} }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
});
console.log('seedNADemo:', seedRes.status);

// ─── 2. Seed location data into config table ─────────────────────────────
const locations = [
  { region: "NorthAmerica", city: "Detroit", state: "MI", country: "US", lat: 42.33, lng: -83.05, status: "active", clientName: "GM Powertrain", equipmentType: "Ultrasonic Cleaning Line", engineerCount: 3 },
  { region: "NorthAmerica", city: "Detroit", state: "MI", country: "US", lat: 42.36, lng: -83.10, status: "active", clientName: "Ford Dearborn", equipmentType: "Spray Wash System", engineerCount: 2 },
  { region: "NorthAmerica", city: "Houston", state: "TX", country: "US", lat: 29.76, lng: -95.37, status: "completed", clientName: "Tesla Gigafactory TX", equipmentType: "Immersion Cleaning Station", engineerCount: 1 },
  { region: "NorthAmerica", city: "Chicago", state: "IL", country: "US", lat: 41.88, lng: -87.63, status: "active", clientName: "Stellantis Chicago", equipmentType: "Multi-Stage Wash Line", engineerCount: 2 },
  { region: "NorthAmerica", city: "Los Angeles", state: "CA", country: "US", lat: 34.05, lng: -118.24, status: "planned", clientName: "Rivian LA Center", equipmentType: "Automated Cleaning Cell", engineerCount: 0 },
  { region: "NorthAmerica", city: "Monterrey", state: "NL", country: "MX", lat: 25.67, lng: -100.31, status: "active", clientName: "Nemak Monterrey", equipmentType: "Die-Cast Cleaning Line", engineerCount: 2 },
  { region: "NorthAmerica", city: "Spartanburg", state: "SC", country: "US", lat: 34.95, lng: -81.93, status: "active", clientName: "BMW Manufacturing", equipmentType: "Precision Cleaning System", engineerCount: 2 },
];

console.log('Seeding locations...');
for (const loc of locations) {
  await page.evaluate(async (data) => {
    await fetch('/api/trpc/serviceDashboard.upsertLocation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: data }),
    });
  }, loc);
}
console.log(`Seeded ${locations.length} locations`);

// ─── 3. Seed KPI data into config table ──────────────────────────────────
const kpis = [
  // Region overview
  { category: "region_overview", region: "Asia", key: "projectCount", value: 128, label: "项目数", unit: "个" },
  { category: "region_overview", region: "Asia", key: "engineerCount", value: 45, label: "工程师", unit: "人" },
  { category: "region_overview", region: "Asia", key: "activeTickets", value: 23, label: "活跃工单", unit: "个" },
  { category: "region_overview", region: "Asia", key: "avgResponseHours", value: 4.2, label: "平均响应", unit: "小时" },
  { category: "region_overview", region: "Asia", key: "healthScore", value: 92, label: "健康分", unit: "分" },
  { category: "region_overview", region: "NorthAmerica", key: "projectCount", value: 34, label: "项目数", unit: "个" },
  { category: "region_overview", region: "NorthAmerica", key: "engineerCount", value: 12, label: "工程师", unit: "人" },
  { category: "region_overview", region: "NorthAmerica", key: "activeTickets", value: 8, label: "活跃工单", unit: "个" },
  { category: "region_overview", region: "NorthAmerica", key: "avgResponseHours", value: 6.5, label: "平均响应", unit: "小时" },
  { category: "region_overview", region: "NorthAmerica", key: "healthScore", value: 87, label: "健康分", unit: "分" },
  { category: "region_overview", region: "Europe", key: "projectCount", value: 18, label: "项目数", unit: "个" },
  { category: "region_overview", region: "Europe", key: "engineerCount", value: 6, label: "工程师", unit: "人" },
  { category: "region_overview", region: "Europe", key: "activeTickets", value: 5, label: "活跃工单", unit: "个" },
  { category: "region_overview", region: "Europe", key: "avgResponseHours", value: 8.1, label: "平均响应", unit: "小时" },
  { category: "region_overview", region: "Europe", key: "healthScore", value: 81, label: "健康分", unit: "分" },
  { category: "region_overview", region: "Other", key: "projectCount", value: 9, label: "项目数", unit: "个" },
  { category: "region_overview", region: "Other", key: "engineerCount", value: 3, label: "工程师", unit: "人" },
  { category: "region_overview", region: "Other", key: "activeTickets", value: 2, label: "活跃工单", unit: "个" },
  { category: "region_overview", region: "Other", key: "avgResponseHours", value: 12.3, label: "平均响应", unit: "小时" },
  { category: "region_overview", region: "Other", key: "healthScore", value: 74, label: "健康分", unit: "分" },
  // China HQ
  { category: "china_hq", region: null, key: "avgResponseHours", value: 3.8, label: "平均响应时间", unit: "小时" },
  { category: "china_hq", region: null, key: "firstCallResolution", value: 72, label: "首次解决率", unit: "%" },
  { category: "china_hq", region: null, key: "sparePartsAvailability", value: 94, label: "备件可用率", unit: "%" },
  { category: "china_hq", region: null, key: "mttr", value: 18.5, label: "平均修复时间", unit: "小时" },
  { category: "china_hq", region: null, key: "customerSatisfaction", value: 4.3, label: "客户满意度", unit: "分" },
  { category: "china_hq", region: null, key: "engineerUtilization", value: 82, label: "工程师利用率", unit: "%" },
  { category: "china_hq", region: null, key: "preventiveMaintenanceRate", value: 68, label: "预防性维护率", unit: "%" },
  { category: "china_hq", region: null, key: "slaCompliance", value: 91, label: "SLA达标率", unit: "%" },
  // North America
  { category: "north_america", region: null, key: "avgResponseHours", value: 6.2, label: "平均响应时间", unit: "小时" },
  { category: "north_america", region: null, key: "firstCallResolution", value: 65, label: "首次解决率", unit: "%" },
  { category: "north_america", region: null, key: "sparePartsAvailability", value: 78, label: "备件可用率", unit: "%" },
  { category: "north_america", region: null, key: "mttr", value: 28.4, label: "平均修复时间", unit: "小时" },
  { category: "north_america", region: null, key: "customerSatisfaction", value: 4.0, label: "客户满意度", unit: "分" },
  { category: "north_america", region: null, key: "engineerUtilization", value: 74, label: "工程师利用率", unit: "%" },
  { category: "north_america", region: null, key: "preventiveMaintenanceRate", value: 55, label: "预防性维护率", unit: "%" },
  { category: "north_america", region: null, key: "slaCompliance", value: 83, label: "SLA达标率", unit: "%" },
];

console.log('Seeding KPIs...');
const bulkRes = await page.evaluate(async (items) => {
  const res = await fetch('/api/trpc/serviceDashboard.bulkUpsertKpis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { items } }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}, kpis);
console.log('bulkUpsertKpis:', bulkRes.status);

// ─── 4. Click "从系统聚合" to sync live DB data ──────────────────────────
await page.reload();
await page.waitForTimeout(3000);

// Click the sync button
const syncBtn = page.getByRole('button', { name: /从系统聚合/ });
if (await syncBtn.isVisible()) {
  await syncBtn.click();
  console.log('Clicked syncFromDB');
  await page.waitForTimeout(2000);
}

// ─── 5. Screenshot: KPI tab ──────────────────────────────────────────────
await page.waitForTimeout(1000);
await page.screenshot({ path: 'screenshot-service-admin.png', fullPage: false });
console.log('Screenshot 1/3: KPI tab → screenshot-service-admin.png');

// ─── 6. Screenshot: Locations tab ────────────────────────────────────────
const locTab = page.getByRole('button', { name: /项目站点管理/ });
if (await locTab.isVisible()) {
  await locTab.click();
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: 'screenshot-service-admin-locations.png', fullPage: false });
console.log('Screenshot 2/3: Locations tab → screenshot-service-admin-locations.png');

// ─── 7. Screenshot: Import tab ──────────────────────────────────────────
const importTab = page.getByRole('button', { name: /批量导入/ });
if (await importTab.isVisible()) {
  await importTab.click();
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: 'screenshot-service-admin-import.png', fullPage: false });
console.log('Screenshot 3/3: Import tab → screenshot-service-admin-import.png');

await browser.close();
console.log('Done!');
