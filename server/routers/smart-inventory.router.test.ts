/**
 * Smart Inventory Router — tRPC Integration Unit Tests
 *
 * Tests all 5 tRPC procedures via authenticated/anonymous callers with mocked DB:
 *   1. dashboard   — full recalculation with cash impact (query)
 *   2. forecasts   — view sales forecasts by product (query)
 *   3. recalculate — trigger manual recalculation (mutation)
 *   4. partDetail  — detailed analysis for a single part (query)
 *   5. seedDemo    — create table + seed demo data (mutation)
 *
 * Mock strategy:
 *   - `db.execute(sql`...`)` is the only DB access pattern used by this router
 *   - We mock `requireDb` to return a mockDb with a mocked `execute` method
 *   - The `execute` mock returns `{ rows: [...] }` to simulate DB result sets
 *   - When `execute` throws, the router falls back to SEED_* data
 *
 * Run: npx vitest run server/routers/smart-inventory.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// ── Mock DB state ────────────────────────────────────────────

/** Queue of results for successive db.execute() calls within a single test */
const executeResultsQueue: any[] = [];

function getNextExecuteResult() {
  if (executeResultsQueue.length > 0) {
    const next = executeResultsQueue.shift()!;
    if (next instanceof Error) throw next;
    return next;
  }
  // Default: empty rows (triggers seed fallback)
  return { rows: [] };
}

const mockDb: any = {
  execute: vi.fn(() => Promise.resolve(getNextExecuteResult())),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// Drizzle sql tag — no-op for mocking
vi.mock("drizzle-orm", () => ({
  sql: new Proxy(() => {}, {
    apply: () => ({}),
    get: () => () => ({}),
  }),
}));

// ── Reset ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  executeResultsQueue.length = 0;
  mockDb.execute = vi.fn(() => Promise.resolve(getNextExecuteResult()));
});

// ── Sample DB rows (mimic what real SQL would return) ────────

const DB_FORECAST_ROWS = [
  { product_code: "GWM-3000", product_name: "High-Pressure Industrial Washer", month: "2026-03", forecasted_qty: 50, confidence_level: 85 },
  { product_code: "GWM-3000", product_name: "High-Pressure Industrial Washer", month: "2026-04", forecasted_qty: 60, confidence_level: 80 },
  { product_code: "GWM-3000", product_name: "High-Pressure Industrial Washer", month: "2026-05", forecasted_qty: 75, confidence_level: 72 },
];

const DB_BOM_ROWS = [
  { product_code: "GWM-3000", part_number: "SS316-PLATE-3MM", part_name: "SS316 Plate 3mm", qty_per_unit: 4 },
  { product_code: "GWM-3000", part_number: "PUMP-HP-15KW", part_name: "High-Pressure Pump 15kW", qty_per_unit: 1 },
];

const DB_MATERIAL_ROWS = [
  { part_number: "SS316-PLATE-3MM", part_name: "SS316 Plate 3mm", category: "raw", current_stock: 2000, static_min: 500, static_max: 3000, unit_cost: 85.5, safety_stock: 500 },
  { part_number: "PUMP-HP-15KW", part_name: "High-Pressure Pump 15kW", category: "component", current_stock: 8, static_min: 20, static_max: 50, unit_cost: 12800, safety_stock: 20 },
];

// ═════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════

describe("smartInventory router", () => {

  // ─── dashboard ──────────────────────────────────────────
  describe("dashboard", () => {
    it("returns a full recalculation report with seed data when DB returns empty rows", async () => {
      const caller = createAdminCaller();
      // 3 execute calls: loadForecasts, loadBom, loadMaterialRules — all empty → seed fallback
      const result = await caller.smartInventory.dashboard();

      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("topCashTraps");
      expect(result).toHaveProperty("topShortageRisks");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("dataSource", "seed");
      expect(result.summary.totalParts).toBeGreaterThan(0);
    });

    it("returns database dataSource when DB returns real data for materials", async () => {
      const caller = createAdminCaller();
      // loadForecasts: return DB rows
      executeResultsQueue.push({ rows: DB_FORECAST_ROWS });
      // loadBom: return DB rows
      executeResultsQueue.push({ rows: DB_BOM_ROWS });
      // loadMaterialRules: return DB rows
      executeResultsQueue.push({ rows: DB_MATERIAL_ROWS });

      const result = await caller.smartInventory.dashboard();

      expect(result.dataSource).toBe("database");
      expect(result.results).toHaveLength(2);
      expect(result.summary.totalParts).toBe(2);
    });

    it("includes summary with correct structure", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.dashboard();

      const { summary } = result;
      expect(summary).toHaveProperty("totalParts");
      expect(summary).toHaveProperty("overstock");
      expect(summary).toHaveProperty("adequate");
      expect(summary).toHaveProperty("low");
      expect(summary).toHaveProperty("shortageRisk");
      expect(summary).toHaveProperty("stockout");
      expect(summary).toHaveProperty("totalCashTrapped");
      expect(summary).toHaveProperty("totalCashNeeded");
      expect(summary).toHaveProperty("netCashImpact");
      // Sum of categories should equal totalParts
      expect(summary.overstock + summary.adequate + summary.low + summary.shortageRisk + summary.stockout)
        .toBe(summary.totalParts);
    });

    it("falls back to seed when DB execute throws an error", async () => {
      const caller = createAdminCaller();
      mockDb.execute = vi.fn(() => Promise.reject(new Error("connection refused")));

      const result = await caller.smartInventory.dashboard();

      expect(result.dataSource).toBe("seed");
      expect(result.results.length).toBeGreaterThan(0);
    });

    it("includes topCashTraps sorted by descending potentialSavings", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.dashboard();

      if (result.topCashTraps.length > 1) {
        for (let i = 0; i < result.topCashTraps.length - 1; i++) {
          expect(result.topCashTraps[i].potentialSavings)
            .toBeGreaterThanOrEqual(result.topCashTraps[i + 1].potentialSavings);
        }
      }
    });

    it("includes topShortageRisks sorted by ascending potentialSavings", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.dashboard();

      if (result.topShortageRisks.length > 1) {
        for (let i = 0; i < result.topShortageRisks.length - 1; i++) {
          expect(result.topShortageRisks[i].potentialSavings)
            .toBeLessThanOrEqual(result.topShortageRisks[i + 1].potentialSavings);
        }
      }
    });

    it("netCashImpact equals totalCashTrapped minus totalCashNeeded", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.dashboard();

      const { totalCashTrapped, totalCashNeeded, netCashImpact } = result.summary;
      expect(netCashImpact).toBeCloseTo(totalCashTrapped - totalCashNeeded, 2);
    });
  });

  // ─── forecasts ──────────────────────────────────────────
  describe("forecasts", () => {
    it("returns forecast data with seed source when DB empty", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      expect(result).toHaveProperty("forecasts");
      expect(result).toHaveProperty("products");
      expect(result).toHaveProperty("dataSource", "seed");
      expect(result.forecasts.length).toBeGreaterThan(0);
    });

    it("returns database source when DB returns rows", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: DB_FORECAST_ROWS });

      const result = await caller.smartInventory.forecasts();

      expect(result.dataSource).toBe("database");
      expect(result.forecasts).toHaveLength(3);
    });

    it("groups forecasts by product with trend analysis", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      expect(result.products.length).toBeGreaterThan(0);
      for (const product of result.products) {
        expect(product).toHaveProperty("productCode");
        expect(product).toHaveProperty("productName");
        expect(product).toHaveProperty("trend");
        expect(product).toHaveProperty("months");
        expect(product.months.length).toBeGreaterThan(0);
      }
    });

    it("product codes are unique in the products array", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      const codes = result.products.map((p: any) => p.productCode);
      const uniqueCodes = [...new Set(codes)];
      expect(codes).toEqual(uniqueCodes);
    });

    it("each product's months contain only that product's forecasts", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      for (const product of result.products) {
        for (const fc of product.months) {
          expect(fc.productCode).toBe(product.productCode);
        }
      }
    });

    it("trend values are valid ForecastTrend enums", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      const validTrends = ["HIGH_GROWTH", "MODERATE_GROWTH", "STABLE", "DECLINING", "STEEP_DECLINE"];
      for (const product of result.products) {
        expect(validTrends).toContain(product.trend);
      }
    });

    it("falls back to seed data when DB throws", async () => {
      const caller = createAdminCaller();
      mockDb.execute = vi.fn(() => Promise.reject(new Error("table not found")));

      const result = await caller.smartInventory.forecasts();

      expect(result.dataSource).toBe("seed");
      expect(result.forecasts.length).toBeGreaterThan(0);
    });
  });

  // ─── recalculate ────────────────────────────────────────
  describe("recalculate", () => {
    it("returns a full report like dashboard (mutation equivalent)", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.recalculate();

      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("topCashTraps");
      expect(result).toHaveProperty("topShortageRisks");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("dataSource");
    });

    it("produces consistent results with dashboard using same data", async () => {
      const callerA = createAdminCaller();
      const callerB = createAdminCaller();
      // Both use seed data (DB returns empty)
      const dashboard = await callerA.smartInventory.dashboard();
      const recalc = await callerB.smartInventory.recalculate();

      // Same part count and summary categories
      expect(recalc.summary.totalParts).toBe(dashboard.summary.totalParts);
      expect(recalc.summary.overstock).toBe(dashboard.summary.overstock);
      expect(recalc.summary.shortageRisk).toBe(dashboard.summary.shortageRisk);
      expect(recalc.dataSource).toBe(dashboard.dataSource);
    });

    it("returns database dataSource when DB provides data", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: DB_FORECAST_ROWS });
      executeResultsQueue.push({ rows: DB_BOM_ROWS });
      executeResultsQueue.push({ rows: DB_MATERIAL_ROWS });

      const result = await caller.smartInventory.recalculate();
      expect(result.dataSource).toBe("database");
    });

    it("timestamp is a valid ISO string", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.recalculate();

      const parsed = new Date(result.timestamp);
      expect(parsed.toISOString()).toBe(result.timestamp);
    });

    it("results contain expected fields for each part", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.recalculate();

      for (const part of result.results) {
        expect(part).toHaveProperty("partNumber");
        expect(part).toHaveProperty("partName");
        expect(part).toHaveProperty("category");
        expect(part).toHaveProperty("currentStock");
        expect(part).toHaveProperty("staticMin");
        expect(part).toHaveProperty("dynamicSafetyStock");
        expect(part).toHaveProperty("forecastTrend");
        expect(part).toHaveProperty("stockHealth");
        expect(part).toHaveProperty("action");
        expect(part).toHaveProperty("reason");
        expect(part).toHaveProperty("potentialSavings");
        expect(part).toHaveProperty("demandNext3Months");
        expect(part).toHaveProperty("unitCost");
        expect(part).toHaveProperty("leadTimeDays");
      }
    });
  });

  // ─── partDetail ─────────────────────────────────────────
  describe("partDetail", () => {
    it("returns found=true with part data for a known part", async () => {
      const caller = createAdminCaller();
      // Uses seed data which includes SS316-PLATE-3MM
      const result = await caller.smartInventory.partDetail({ partNumber: "SS316-PLATE-3MM" });

      expect(result.found).toBe(true);
      expect(result.part).not.toBeNull();
      expect(result.part!.partNumber).toBe("SS316-PLATE-3MM");
    });

    it("returns found=false for an unknown part number", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "NONEXISTENT-PART-999" });

      expect(result.found).toBe(false);
      expect(result.part).toBeNull();
    });

    it("includes relatedForecasts for the requested part", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "SS316-PLATE-3MM" });

      expect(result.found).toBe(true);
      // SS316-PLATE-3MM is used in GWM-3000, GUC-500, GSC-200 per seed BOM
      expect(result.relatedForecasts!.length).toBeGreaterThan(0);
    });

    it("includes relatedProducts array for the requested part", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "SS316-PLATE-3MM" });

      expect(result.found).toBe(true);
      // SS316-PLATE-3MM is used in 3 products: GWM-3000, GUC-500, GSC-200
      expect(result.relatedProducts!.length).toBe(3);
      expect(result.relatedProducts).toContain("GWM-3000");
      expect(result.relatedProducts).toContain("GUC-500");
      expect(result.relatedProducts).toContain("GSC-200");
    });

    it("includes BOM items for the requested part", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "SS316-PLATE-3MM" });

      expect(result.found).toBe(true);
      expect(result.bom!.length).toBe(3); // 3 product entries
      for (const item of result.bom!) {
        expect(item.partNumber).toBe("SS316-PLATE-3MM");
      }
    });

    it("part detail includes full DynamicStockResult fields", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "PUMP-HP-15KW" });

      expect(result.found).toBe(true);
      const part = result.part!;
      expect(part.partNumber).toBe("PUMP-HP-15KW");
      expect(typeof part.dynamicSafetyStock).toBe("number");
      expect(typeof part.forecastTrend).toBe("string");
      expect(typeof part.stockHealth).toBe("string");
      expect(typeof part.action).toBe("string");
      expect(typeof part.reason).toBe("string");
      expect(typeof part.potentialSavings).toBe("number");
    });

    it("works with DB-sourced data", async () => {
      const caller = createAdminCaller();
      // 3 calls: loadForecasts, loadBom, loadMaterialRules
      executeResultsQueue.push({ rows: DB_FORECAST_ROWS });
      executeResultsQueue.push({ rows: DB_BOM_ROWS });
      executeResultsQueue.push({ rows: DB_MATERIAL_ROWS });

      const result = await caller.smartInventory.partDetail({ partNumber: "SS316-PLATE-3MM" });
      expect(result.found).toBe(true);
      expect(result.part!.partNumber).toBe("SS316-PLATE-3MM");
    });

    it("returns found=false for parts not in DB material rules", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: DB_FORECAST_ROWS });
      executeResultsQueue.push({ rows: DB_BOM_ROWS });
      executeResultsQueue.push({ rows: DB_MATERIAL_ROWS });

      const result = await caller.smartInventory.partDetail({ partNumber: "NOZZLE-FAN-45" });
      // NOZZLE-FAN-45 is NOT in DB_MATERIAL_ROWS
      expect(result.found).toBe(false);
    });

    it("returns PLC part with correct product relationships from seed", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "PLC-SIEMENS-1200" });

      expect(result.found).toBe(true);
      // PLC is used in GWM-3000 and GUC-500
      expect(result.relatedProducts).toContain("GWM-3000");
      expect(result.relatedProducts).toContain("GUC-500");
      expect(result.relatedProducts).toHaveLength(2);
    });
  });

  // ─── seedDemo ───────────────────────────────────────────
  describe("seedDemo", () => {
    it("creates sales_forecasts table and seeds data", async () => {
      const caller = createAdminCaller();
      // CREATE TABLE → ok, then 9 INSERT calls for SEED_FORECASTS
      // mockDb.execute is already mocked to return { rows: [] } by default

      const result = await caller.smartInventory.seedDemo();

      expect(result).toHaveProperty("seeded", true);
      expect(result).toHaveProperty("forecasts");
      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("note");
      expect(result.tables).toContain("sales_forecasts");
      expect(Array.isArray(result.forecasts)).toBe(true);
      // Should have 9 seed forecasts (3 products x 3 months)
      expect(result.forecasts).toHaveLength(9);
    });

    it("all forecast entries have ok status when DB succeeds", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.seedDemo();

      for (const fc of result.forecasts) {
        expect(fc.status).toBe("ok");
        expect(fc).toHaveProperty("productCode");
        expect(fc).toHaveProperty("month");
      }
    });

    it("handles individual insert failures gracefully (per-row try/catch)", async () => {
      const caller = createAdminCaller();
      let callCount = 0;
      mockDb.execute = vi.fn(() => {
        callCount++;
        // First call is CREATE TABLE — succeeds
        // Fail the 3rd INSERT (call #3)
        if (callCount === 3) {
          return Promise.reject(new Error("duplicate key"));
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await caller.smartInventory.seedDemo();

      expect(result.seeded).toBe(true);
      // One should have error status
      const errorEntries = result.forecasts.filter((f: any) => f.status === "error");
      expect(errorEntries.length).toBe(1);
      expect(errorEntries[0].error).toContain("duplicate key");
      // Remaining should be ok
      const okEntries = result.forecasts.filter((f: any) => f.status === "ok");
      expect(okEntries.length).toBe(8);
    });

    it("throws when CREATE TABLE fails (not caught by per-row try/catch)", async () => {
      const caller = createAdminCaller();
      let callCount = 0;
      mockDb.execute = vi.fn(() => {
        callCount++;
        // First call is CREATE TABLE — fail it
        if (callCount === 1) {
          return Promise.reject(new Error("permission denied"));
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(caller.smartInventory.seedDemo()).rejects.toThrow();
    });

    it("calls db.execute at least 10 times (1 CREATE TABLE + 9 INSERTs)", async () => {
      const caller = createAdminCaller();
      await caller.smartInventory.seedDemo();

      // 1 CREATE TABLE + 9 SEED_FORECASTS upserts = 10
      expect(mockDb.execute).toHaveBeenCalledTimes(10);
    });

    it("note mentions real tables", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.seedDemo();

      expect(result.note).toContain("materials");
      expect(result.note).toContain("inventory");
      expect(result.note).toContain("bom_items");
    });
  });

  // ─── Authentication guards ─────────────────────────────
  describe("authentication", () => {
    it("rejects anonymous for dashboard", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartInventory.dashboard()).rejects.toThrow();
    });

    it("rejects anonymous for forecasts", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartInventory.forecasts()).rejects.toThrow();
    });

    it("rejects anonymous for recalculate", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartInventory.recalculate()).rejects.toThrow();
    });

    it("rejects anonymous for partDetail", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartInventory.partDetail({ partNumber: "SS316-PLATE-3MM" })).rejects.toThrow();
    });

    it("rejects anonymous for seedDemo", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.smartInventory.seedDemo()).rejects.toThrow();
    });

    it("allows admin access to dashboard", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.dashboard();
      expect(result).toHaveProperty("results");
    });

    it("allows admin access to recalculate", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.recalculate();
      expect(result).toHaveProperty("results");
    });

    it("allows admin access to seedDemo", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.seedDemo();
      expect(result.seeded).toBe(true);
    });
  });

  // ─── DB data mapping ───────────────────────────────────
  describe("DB data mapping", () => {
    it("correctly maps forecast DB rows to SalesForecast objects", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          { product_code: "P-100", product_name: "Widget", month: "2026-06", forecasted_qty: "200", confidence_level: "92" },
        ],
      });

      const result = await caller.smartInventory.forecasts();

      expect(result.dataSource).toBe("database");
      expect(result.forecasts[0].productCode).toBe("P-100");
      expect(result.forecasts[0].productName).toBe("Widget");
      expect(result.forecasts[0].month).toBe("2026-06");
      expect(result.forecasts[0].forecastedQty).toBe(200); // Number conversion
      expect(result.forecasts[0].confidenceLevel).toBe(92);
    });

    it("correctly maps material DB rows with category uppercasing", async () => {
      const caller = createAdminCaller();
      // forecasts: empty → seed; bom: empty → seed
      executeResultsQueue.push({ rows: [] });
      executeResultsQueue.push({ rows: [] });
      // materials: return custom row with lowercase category
      executeResultsQueue.push({
        rows: [{
          part_number: "TEST-PART-1",
          part_name: "Test Part",
          category: "subassembly",
          current_stock: "150",
          static_min: "100",
          static_max: "500",
          unit_cost: "42.50",
          safety_stock: "100",
        }],
      });

      const result = await caller.smartInventory.dashboard();

      expect(result.dataSource).toBe("database");
      const testPart = result.results.find((r: any) => r.partNumber === "TEST-PART-1");
      expect(testPart).toBeDefined();
      expect(testPart!.category).toBe("SUBASSEMBLY"); // uppercased
      expect(testPart!.currentStock).toBe(150);
      expect(testPart!.unitCost).toBe(42.5);
    });

    it("handles BOM rows with null qty_per_unit defaulting to 1", async () => {
      const caller = createAdminCaller();
      // forecasts: return DB data
      executeResultsQueue.push({
        rows: [
          { product_code: "X-1", product_name: "X Product", month: "2026-03", forecasted_qty: 10, confidence_level: 80 },
        ],
      });
      // bom: return row with null qty_per_unit
      executeResultsQueue.push({
        rows: [
          { product_code: "X-1", part_number: "X-PART", part_name: "X Part", qty_per_unit: null },
        ],
      });
      // materials: empty → seed
      executeResultsQueue.push({ rows: [] });

      const result = await caller.smartInventory.dashboard();
      // Should not throw; qty defaults to 1
      expect(result).toHaveProperty("results");
    });
  });

  // ─── Seed data integrity ───────────────────────────────
  describe("seed data integrity", () => {
    it("seed data has 9 forecasts across 3 products", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      expect(result.dataSource).toBe("seed");
      expect(result.forecasts).toHaveLength(9);
      expect(result.products).toHaveLength(3);
    });

    it("seed data has 8 material rules", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.dashboard();

      expect(result.dataSource).toBe("seed");
      expect(result.summary.totalParts).toBe(8);
    });

    it("GWM-3000 forecast trend is HIGH_GROWTH in seed data", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      const gwm = result.products.find((p: any) => p.productCode === "GWM-3000");
      expect(gwm).toBeDefined();
      // 50 → 60 → 75 = +50% = HIGH_GROWTH
      expect(gwm!.trend).toBe("HIGH_GROWTH");
    });

    it("GSC-200 forecast trend is STEEP_DECLINE in seed data", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      const gsc = result.products.find((p: any) => p.productCode === "GSC-200");
      expect(gsc).toBeDefined();
      // 40 → 25 → 15 = -62.5% = STEEP_DECLINE
      expect(gsc!.trend).toBe("STEEP_DECLINE");
    });

    it("GUC-500 forecast trend is STABLE in seed data", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.forecasts();

      const guc = result.products.find((p: any) => p.productCode === "GUC-500");
      expect(guc).toBeDefined();
      // 30 → 32 → 31 = +3.3% = STABLE
      expect(guc!.trend).toBe("STABLE");
    });

    it("PUMP-HP-15KW is in shortage with seed data (8 stock vs high demand)", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "PUMP-HP-15KW" });

      expect(result.found).toBe(true);
      const part = result.part!;
      expect(part.currentStock).toBe(8);
      expect(part.forecastTrend).toBe("HIGH_GROWTH");
      // dynamicSafetyStock = 20 × 1.5 = 30
      expect(part.dynamicSafetyStock).toBe(30);
      // 8/30 = 26.7% → SHORTAGE_RISK
      expect(part.stockHealth).toBe("SHORTAGE_RISK");
      expect(part.action).toBe("EXPEDITE");
    });
  });

  // ─── Edge cases ─────────────────────────────────────────
  describe("edge cases", () => {
    it("partDetail with empty string partNumber returns found=false", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "" });
      expect(result.found).toBe(false);
    });

    it("partDetail with special characters in partNumber returns found=false", async () => {
      const caller = createAdminCaller();
      const result = await caller.smartInventory.partDetail({ partNumber: "!@#$%^&*()" });
      expect(result.found).toBe(false);
    });

    it("dashboard handles mixed DB success/failure across loaders", async () => {
      const caller = createAdminCaller();
      let callCount = 0;
      mockDb.execute = vi.fn(() => {
        callCount++;
        // forecasts: succeed with data
        if (callCount === 1) return Promise.resolve({ rows: DB_FORECAST_ROWS });
        // bom: fail → seed fallback
        if (callCount === 2) return Promise.reject(new Error("table missing"));
        // materials: succeed
        if (callCount === 3) return Promise.resolve({ rows: DB_MATERIAL_ROWS });
        return Promise.resolve({ rows: [] });
      });

      const result = await caller.smartInventory.dashboard();
      // Should still work — each loader handles its own errors
      expect(result).toHaveProperty("results");
      expect(result.results.length).toBeGreaterThan(0);
    });

    it("handles rows property being undefined (some DB drivers)", async () => {
      const caller = createAdminCaller();
      // Some drivers return the array directly without .rows
      executeResultsQueue.push({ /* no rows property */ });

      const result = await caller.smartInventory.forecasts();
      // (rows as any).rows → undefined → [] → length 0 → seed fallback
      expect(result.dataSource).toBe("seed");
    });
  });
});
