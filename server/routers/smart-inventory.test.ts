/**
 * Smart Inventory — Dynamic Safety Stock Automated Test Suite
 * Phase 3.3 — AI-Driven Inventory Optimization
 *
 * Proves:
 *   1. analyzeForecastTrend: correct trend classification at all boundaries
 *   2. trendMultiplier: correct multiplier for each trend
 *   3. calculateDynamicSafetyStock: static × multiplier
 *   4. explodeBomDemand: product forecast → raw material demand
 *   5. classifyStockHealth: overstock/adequate/low/shortage/stockout
 *   6. determineAction: correct action for each health + trend combo
 *   7. calculateCashImpact: excess → positive, deficit → negative
 *   8. recalculateSafetyStock: THE FULL ENGINE
 *   9. CEO Money Proof: high growth → dynamic increases → buy recommendation
 *  10. Edge cases: empty data, zero stock, single month
 *
 * Run: pnpm test -- server/routers/smart-inventory.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  analyzeForecastTrend,
  trendMultiplier,
  calculateDynamicSafetyStock,
  explodeBomDemand,
  classifyStockHealth,
  determineAction,
  calculateCashImpact,
  recalculateSafetyStock,
  type SalesForecast,
  type BomItem,
  type MaterialRule,
  type ForecastTrend,
  type StockHealth,
} from "./smart-inventory.router";

// ─── Helpers ────────────────────────────────────────────────────────

const NOW = new Date("2026-02-25T12:00:00Z");

function makeForecast(overrides?: Partial<SalesForecast>): SalesForecast {
  return {
    productCode: "GWM-3000",
    productName: "High-Pressure Industrial Washer",
    month: "2026-03",
    forecastedQty: 50,
    confidenceLevel: 85,
    ...overrides,
  };
}

function makeRule(overrides?: Partial<MaterialRule>): MaterialRule {
  return {
    partNumber: "SS316-PLATE-3MM",
    partName: "SS316 Plate 3mm",
    category: "RAW",
    currentStock: 500,
    staticMin: 200,
    staticMax: 1000,
    leadTimeDays: 14,
    unitCost: 85.50,
    annualDemand: 3000,
    ...overrides,
  };
}

function makeBom(overrides?: Partial<BomItem>): BomItem {
  return {
    productCode: "GWM-3000",
    partNumber: "SS316-PLATE-3MM",
    partName: "SS316 Plate 3mm",
    qtyPerUnit: 4,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ① analyzeForecastTrend — trend classification
// ═══════════════════════════════════════════════════════════════════

describe("analyzeForecastTrend", () => {
  it("returns HIGH_GROWTH for >20% increase (50→75 = +50%)", () => {
    const fcs = [
      makeForecast({ month: "2026-03", forecastedQty: 50 }),
      makeForecast({ month: "2026-04", forecastedQty: 60 }),
      makeForecast({ month: "2026-05", forecastedQty: 75 }),
    ];
    expect(analyzeForecastTrend(fcs)).toBe("HIGH_GROWTH");
  });

  it("returns MODERATE_GROWTH for 5-20% increase (100→115 = +15%)", () => {
    const fcs = [
      makeForecast({ month: "2026-03", forecastedQty: 100 }),
      makeForecast({ month: "2026-05", forecastedQty: 115 }),
    ];
    expect(analyzeForecastTrend(fcs)).toBe("MODERATE_GROWTH");
  });

  it("returns STABLE for -5% to +5% (100→103 = +3%)", () => {
    const fcs = [
      makeForecast({ month: "2026-03", forecastedQty: 100 }),
      makeForecast({ month: "2026-05", forecastedQty: 103 }),
    ];
    expect(analyzeForecastTrend(fcs)).toBe("STABLE");
  });

  it("returns DECLINING for -5% to -20% (100→85 = -15%)", () => {
    const fcs = [
      makeForecast({ month: "2026-03", forecastedQty: 100 }),
      makeForecast({ month: "2026-05", forecastedQty: 85 }),
    ];
    expect(analyzeForecastTrend(fcs)).toBe("DECLINING");
  });

  it("returns STEEP_DECLINE for >20% decrease (40→15 = -62.5%)", () => {
    const fcs = [
      makeForecast({ month: "2026-03", forecastedQty: 40 }),
      makeForecast({ month: "2026-04", forecastedQty: 25 }),
      makeForecast({ month: "2026-05", forecastedQty: 15 }),
    ];
    expect(analyzeForecastTrend(fcs)).toBe("STEEP_DECLINE");
  });

  it("returns STABLE for single month forecast", () => {
    expect(analyzeForecastTrend([makeForecast()])).toBe("STABLE");
  });

  it("returns STABLE for empty forecast array", () => {
    expect(analyzeForecastTrend([])).toBe("STABLE");
  });

  it("returns HIGH_GROWTH when first month is zero", () => {
    const fcs = [
      makeForecast({ month: "2026-03", forecastedQty: 0 }),
      makeForecast({ month: "2026-05", forecastedQty: 50 }),
    ];
    expect(analyzeForecastTrend(fcs)).toBe("HIGH_GROWTH");
  });

  it("returns STABLE when first and last are both zero", () => {
    const fcs = [
      makeForecast({ month: "2026-03", forecastedQty: 0 }),
      makeForecast({ month: "2026-05", forecastedQty: 0 }),
    ];
    expect(analyzeForecastTrend(fcs)).toBe("STABLE");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ② trendMultiplier
// ═══════════════════════════════════════════════════════════════════

describe("trendMultiplier", () => {
  it("returns 1.5 for HIGH_GROWTH", () => expect(trendMultiplier("HIGH_GROWTH")).toBe(1.5));
  it("returns 1.25 for MODERATE_GROWTH", () => expect(trendMultiplier("MODERATE_GROWTH")).toBe(1.25));
  it("returns 1.0 for STABLE", () => expect(trendMultiplier("STABLE")).toBe(1.0));
  it("returns 0.75 for DECLINING", () => expect(trendMultiplier("DECLINING")).toBe(0.75));
  it("returns 0.5 for STEEP_DECLINE", () => expect(trendMultiplier("STEEP_DECLINE")).toBe(0.5));
});

// ═══════════════════════════════════════════════════════════════════
// ③ calculateDynamicSafetyStock
// ═══════════════════════════════════════════════════════════════════

describe("calculateDynamicSafetyStock", () => {
  it("increases stock 50% for HIGH_GROWTH (200 → 300)", () => {
    expect(calculateDynamicSafetyStock(200, "HIGH_GROWTH")).toBe(300);
  });

  it("keeps stock same for STABLE (200 → 200)", () => {
    expect(calculateDynamicSafetyStock(200, "STABLE")).toBe(200);
  });

  it("halves stock for STEEP_DECLINE (200 → 100)", () => {
    expect(calculateDynamicSafetyStock(200, "STEEP_DECLINE")).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(calculateDynamicSafetyStock(150, "MODERATE_GROWTH")).toBe(188); // 150 × 1.25
  });
});

// ═══════════════════════════════════════════════════════════════════
// ④ explodeBomDemand — BOM explosion
// ═══════════════════════════════════════════════════════════════════

describe("explodeBomDemand", () => {
  const forecasts = [
    makeForecast({ productCode: "GWM-3000", month: "2026-03", forecastedQty: 50 }),
    makeForecast({ productCode: "GWM-3000", month: "2026-04", forecastedQty: 60 }),
    makeForecast({ productCode: "GUC-500", month: "2026-03", forecastedQty: 30 }),
  ];

  const bom: BomItem[] = [
    makeBom({ productCode: "GWM-3000", partNumber: "SS316-PLATE-3MM", qtyPerUnit: 4 }),
    makeBom({ productCode: "GWM-3000", partNumber: "PUMP-HP-15KW", qtyPerUnit: 1 }),
    makeBom({ productCode: "GUC-500", partNumber: "SS316-PLATE-3MM", qtyPerUnit: 6 }),
  ];

  it("accumulates demand across months for same product", () => {
    const demand = explodeBomDemand(forecasts, bom);
    // GWM-3000: (50+60) × 4 = 440 plates, plus GUC-500: 30 × 6 = 180, total = 620
    const plates = demand.get("SS316-PLATE-3MM");
    expect(plates).toBeDefined();
    expect(plates!.totalDemand).toBe(620);
  });

  it("correctly computes single-product part demand", () => {
    const demand = explodeBomDemand(forecasts, bom);
    const pump = demand.get("PUMP-HP-15KW");
    expect(pump!.totalDemand).toBe(110); // (50+60) × 1
  });

  it("returns empty map for empty forecasts", () => {
    expect(explodeBomDemand([], bom).size).toBe(0);
  });

  it("returns empty map when BOM has no matching products", () => {
    const unrelated = [makeForecast({ productCode: "UNKNOWN-999" })];
    expect(explodeBomDemand(unrelated, bom).size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑤ classifyStockHealth
// ═══════════════════════════════════════════════════════════════════

describe("classifyStockHealth", () => {
  it("returns STOCKOUT for zero stock", () => {
    expect(classifyStockHealth(0, 100)).toBe("STOCKOUT");
  });

  it("returns SHORTAGE_RISK for stock < 40% of dynamic (30 vs 100)", () => {
    expect(classifyStockHealth(30, 100)).toBe("SHORTAGE_RISK");
  });

  it("returns LOW for stock 40-79% of dynamic (50 vs 100)", () => {
    expect(classifyStockHealth(50, 100)).toBe("LOW");
  });

  it("returns ADEQUATE for stock 80-200% of dynamic (150 vs 100)", () => {
    expect(classifyStockHealth(150, 100)).toBe("ADEQUATE");
  });

  it("returns OVERSTOCK for stock > 200% of dynamic (250 vs 100)", () => {
    expect(classifyStockHealth(250, 100)).toBe("OVERSTOCK");
  });

  it("returns ADEQUATE at exact ratio 1.0 (100 vs 100)", () => {
    expect(classifyStockHealth(100, 100)).toBe("ADEQUATE");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑥ determineAction
// ═══════════════════════════════════════════════════════════════════

describe("determineAction", () => {
  it("returns EXPEDITE for STOCKOUT", () => {
    expect(determineAction("STOCKOUT", "STABLE")).toBe("EXPEDITE");
  });

  it("returns EXPEDITE for SHORTAGE_RISK", () => {
    expect(determineAction("SHORTAGE_RISK", "HIGH_GROWTH")).toBe("EXPEDITE");
  });

  it("returns INCREASE_STOCK for LOW + HIGH_GROWTH", () => {
    expect(determineAction("LOW", "HIGH_GROWTH")).toBe("INCREASE_STOCK");
  });

  it("returns INCREASE_STOCK for LOW + MODERATE_GROWTH", () => {
    expect(determineAction("LOW", "MODERATE_GROWTH")).toBe("INCREASE_STOCK");
  });

  it("returns DECREASE_STOCK for OVERSTOCK + DECLINING", () => {
    expect(determineAction("OVERSTOCK", "DECLINING")).toBe("DECREASE_STOCK");
  });

  it("returns DECREASE_STOCK for OVERSTOCK + STEEP_DECLINE", () => {
    expect(determineAction("OVERSTOCK", "STEEP_DECLINE")).toBe("DECREASE_STOCK");
  });

  it("returns HOLD for OVERSTOCK + STABLE", () => {
    expect(determineAction("OVERSTOCK", "STABLE")).toBe("HOLD");
  });

  it("returns HOLD for ADEQUATE stock", () => {
    expect(determineAction("ADEQUATE", "STABLE")).toBe("HOLD");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑦ calculateCashImpact
// ═══════════════════════════════════════════════════════════════════

describe("calculateCashImpact", () => {
  it("returns positive value for overstock (excess inventory)", () => {
    // 500 on hand, only need 200, unit cost 85.50
    // Excess: 300 × 85.50 = 25,650
    expect(calculateCashImpact(500, 200, 85.50)).toBe(25650);
  });

  it("returns negative value for shortage (need to buy)", () => {
    // 8 on hand, need 30, unit cost 12800
    // Deficit: -22 × 12800 = -281,600
    expect(calculateCashImpact(8, 30, 12800)).toBe(-281600);
  });

  it("returns 0 when stock equals dynamic safety", () => {
    expect(calculateCashImpact(100, 100, 50)).toBe(0);
  });

  it("handles zero unit cost", () => {
    expect(calculateCashImpact(500, 200, 0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑧ recalculateSafetyStock — THE FULL ENGINE
// ═══════════════════════════════════════════════════════════════════

describe("recalculateSafetyStock (THE BRAIN)", () => {
  const forecasts: SalesForecast[] = [
    // HIGH_GROWTH product
    makeForecast({ productCode: "GWM-3000", month: "2026-03", forecastedQty: 50 }),
    makeForecast({ productCode: "GWM-3000", month: "2026-04", forecastedQty: 60 }),
    makeForecast({ productCode: "GWM-3000", month: "2026-05", forecastedQty: 75 }),
    // STEEP_DECLINE product
    makeForecast({ productCode: "GSC-200", month: "2026-03", forecastedQty: 40 }),
    makeForecast({ productCode: "GSC-200", month: "2026-04", forecastedQty: 25 }),
    makeForecast({ productCode: "GSC-200", month: "2026-05", forecastedQty: 15 }),
  ];

  const bom: BomItem[] = [
    makeBom({ productCode: "GWM-3000", partNumber: "PUMP-HP-15KW", qtyPerUnit: 1 }),
    makeBom({ productCode: "GSC-200", partNumber: "PUMP-LP-5KW", qtyPerUnit: 1 }),
  ];

  const rules: MaterialRule[] = [
    // HP Pump — shortage for growing demand
    makeRule({ partNumber: "PUMP-HP-15KW", partName: "HP Pump", currentStock: 8, staticMin: 20, unitCost: 12800 }),
    // LP Pump — overstock for declining demand
    makeRule({ partNumber: "PUMP-LP-5KW", partName: "LP Pump", currentStock: 35, staticMin: 15, unitCost: 3200 }),
  ];

  it("returns results for all material rules", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    expect(report.results).toHaveLength(2);
  });

  it("calculates correct dynamic safety stock for HIGH_GROWTH part", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    const pump = report.results.find(r => r.partNumber === "PUMP-HP-15KW")!;
    expect(pump.forecastTrend).toBe("HIGH_GROWTH");
    expect(pump.dynamicSafetyStock).toBe(30); // 20 × 1.5
  });

  it("calculates correct dynamic safety stock for STEEP_DECLINE part", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    const pump = report.results.find(r => r.partNumber === "PUMP-LP-5KW")!;
    expect(pump.forecastTrend).toBe("STEEP_DECLINE");
    expect(pump.dynamicSafetyStock).toBe(8); // 15 × 0.5 = 7.5 → 8 (rounded)
  });

  it("classifies HP Pump as SHORTAGE_RISK (8 stock vs 30 dynamic)", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    const pump = report.results.find(r => r.partNumber === "PUMP-HP-15KW")!;
    expect(pump.stockHealth).toBe("SHORTAGE_RISK");
    expect(pump.action).toBe("EXPEDITE");
  });

  it("classifies LP Pump as OVERSTOCK (35 stock vs 8 dynamic)", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    const pump = report.results.find(r => r.partNumber === "PUMP-LP-5KW")!;
    expect(pump.stockHealth).toBe("OVERSTOCK");
    expect(pump.action).toBe("DECREASE_STOCK");
  });

  it("computes correct summary counts", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    expect(report.summary.totalParts).toBe(2);
    expect(report.summary.shortageRisk).toBe(1);
    expect(report.summary.overstock).toBe(1);
  });

  it("computes positive cash trapped for overstock items", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    expect(report.summary.totalCashTrapped).toBeGreaterThan(0);
  });

  it("computes positive cash needed for shortage items", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    expect(report.summary.totalCashNeeded).toBeGreaterThan(0);
  });

  it("populates topCashTraps with overstock items", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    expect(report.topCashTraps.length).toBeGreaterThan(0);
    expect(report.topCashTraps[0].stockHealth).toBe("OVERSTOCK");
  });

  it("populates topShortageRisks with shortage items", () => {
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    expect(report.topShortageRisks.length).toBeGreaterThan(0);
    expect(report.topShortageRisks[0].stockHealth).toBe("SHORTAGE_RISK");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑨ CEO MONEY PROOF (Action 4 exact scenario)
// ═══════════════════════════════════════════════════════════════════

describe("CEO Money Proof: High Growth → Dynamic Increases → Buy Recommendation", () => {
  it("proves the full cycle: high growth forecast → dynamic stock rises → system recommends BUY even above old static min", () => {
    // Setup: Part with static_min = 20, current_stock = 22 (above old static min!)
    // After AI: dynamic_safety = 30, so 22/30 = 73% → LOW → BUY
    const forecasts: SalesForecast[] = [
      makeForecast({ productCode: "GROWTH-PRODUCT", month: "2026-03", forecastedQty: 100 }),
      makeForecast({ productCode: "GROWTH-PRODUCT", month: "2026-04", forecastedQty: 130 }),
      makeForecast({ productCode: "GROWTH-PRODUCT", month: "2026-05", forecastedQty: 160 }),  // +60% growth
    ];

    const bom: BomItem[] = [
      makeBom({ productCode: "GROWTH-PRODUCT", partNumber: "CRITICAL-PART", partName: "Critical Part", qtyPerUnit: 2 }),
    ];

    const rules: MaterialRule[] = [
      makeRule({
        partNumber: "CRITICAL-PART", partName: "Critical Part",
        currentStock: 22,      // ABOVE old static_min of 20
        staticMin: 20,
        unitCost: 500,
      }),
    ];

    // STEP 1: Verify forecast trend is HIGH_GROWTH
    const trend = analyzeForecastTrend(forecasts);
    expect(trend).toBe("HIGH_GROWTH");

    // STEP 2: Run AI Engine
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    const part = report.results[0];

    // STEP 3: Verify dynamic safety stock INCREASED
    expect(part.dynamicSafetyStock).toBe(30);  // 20 × 1.5 = 30
    expect(part.dynamicSafetyStock).toBeGreaterThan(part.staticMin);  // 30 > 20

    // STEP 4: Despite being ABOVE old static_min (22 > 20),
    //         system sees 22 < 30 (new dynamic) → 73% ratio → LOW → recommends buying!
    expect(part.currentStock).toBeGreaterThan(part.staticMin);  // 22 > 20 old min
    expect(part.currentStock).toBeLessThan(part.dynamicSafetyStock);  // 22 < 30 new dynamic
    expect(part.stockHealth).toBe("LOW");  // 22/30 = 73% → LOW
    expect(part.action).toBe("INCREASE_STOCK");  // BUY recommendation

    // STEP 5: Cash impact shows investment needed
    expect(part.potentialSavings).toBeLessThan(0);  // negative = needs investment
    expect(part.reason).toContain("GROWTH");
  });

  it("proves decline scenario: declining forecast → dynamic drops → system flags CASH TRAP", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ productCode: "DYING-PRODUCT", month: "2026-03", forecastedQty: 100 }),
      makeForecast({ productCode: "DYING-PRODUCT", month: "2026-04", forecastedQty: 60 }),
      makeForecast({ productCode: "DYING-PRODUCT", month: "2026-05", forecastedQty: 40 }),  // -60% decline
    ];

    const bom: BomItem[] = [
      makeBom({ productCode: "DYING-PRODUCT", partNumber: "EXCESS-PART", partName: "Excess Part", qtyPerUnit: 3 }),
    ];

    const rules: MaterialRule[] = [
      makeRule({
        partNumber: "EXCESS-PART", partName: "Excess Part",
        currentStock: 200,      // way above even old static_min
        staticMin: 50,
        unitCost: 120,
      }),
    ];

    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    const part = report.results[0];

    // Dynamic stock dropped: 50 × 0.5 = 25
    expect(part.forecastTrend).toBe("STEEP_DECLINE");
    expect(part.dynamicSafetyStock).toBe(25);
    expect(part.stockHealth).toBe("OVERSTOCK");  // 200 vs 25
    expect(part.action).toBe("DECREASE_STOCK");

    // Cash trapped: (200 - 25) × 120 = ¥21,000
    expect(part.potentialSavings).toBe(21000);
    expect(part.reason).toContain("CASH TRAP");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑩ Edge cases
// ═══════════════════════════════════════════════════════════════════

describe("Edge cases", () => {
  it("handles empty forecasts gracefully", () => {
    const rules = [makeRule()];
    const report = recalculateSafetyStock([], [], rules, NOW);
    expect(report.results).toHaveLength(1);
    expect(report.results[0].forecastTrend).toBe("STABLE");
  });

  it("handles empty rules gracefully", () => {
    const report = recalculateSafetyStock([makeForecast()], [], [], NOW);
    expect(report.results).toHaveLength(0);
    expect(report.summary.totalParts).toBe(0);
  });

  it("handles zero-cost parts without divide-by-zero", () => {
    const rules = [makeRule({ unitCost: 0, currentStock: 1000 })];
    const report = recalculateSafetyStock([], [], rules, NOW);
    expect(report.results[0].potentialSavings).toBe(0);
  });

  it("uses most aggressive trend when part is in multiple products", () => {
    const forecasts: SalesForecast[] = [
      // Product A: high growth
      makeForecast({ productCode: "A", month: "2026-03", forecastedQty: 50 }),
      makeForecast({ productCode: "A", month: "2026-05", forecastedQty: 80 }),
      // Product B: stable
      makeForecast({ productCode: "B", month: "2026-03", forecastedQty: 30 }),
      makeForecast({ productCode: "B", month: "2026-05", forecastedQty: 31 }),
    ];
    const bom: BomItem[] = [
      makeBom({ productCode: "A", partNumber: "SHARED-PART", qtyPerUnit: 2 }),
      makeBom({ productCode: "B", partNumber: "SHARED-PART", qtyPerUnit: 3 }),
    ];
    const rules = [makeRule({ partNumber: "SHARED-PART", staticMin: 100 })];

    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    // Should use HIGH_GROWTH (most aggressive) not STABLE
    expect(report.results[0].forecastTrend).toBe("HIGH_GROWTH");
    expect(report.results[0].dynamicSafetyStock).toBe(150); // 100 × 1.5
  });

  it("correctly computes BOM demand across multiple products", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ productCode: "A", month: "2026-03", forecastedQty: 10 }),
      makeForecast({ productCode: "B", month: "2026-03", forecastedQty: 20 }),
    ];
    const bom: BomItem[] = [
      makeBom({ productCode: "A", partNumber: "SHARED", qtyPerUnit: 5 }),
      makeBom({ productCode: "B", partNumber: "SHARED", qtyPerUnit: 3 }),
    ];
    const rules = [makeRule({ partNumber: "SHARED" })];

    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    // (10×5) + (20×3) = 50 + 60 = 110
    expect(report.results[0].demandNext3Months).toBe(110);
  });

  it("report timestamp matches input now parameter", () => {
    const report = recalculateSafetyStock([], [], [makeRule()], NOW);
    expect(report.timestamp).toBe(NOW.toISOString());
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⬛ HARDENING — Production-Readiness Stress Tests
// ═══════════════════════════════════════════════════════════════════

describe("HARDENING: Forecast trend exact boundaries", () => {
  it("+20.01% → HIGH_GROWTH (> 20 threshold)", () => {
    // first=100, last=120.01 → changePercent = 20.01%
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 120.01 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("HIGH_GROWTH");
  });

  it("+20.00% exactly → MODERATE_GROWTH (not HIGH_GROWTH, uses > not >=)", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 120 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("MODERATE_GROWTH");
  });

  it("+5.01% → MODERATE_GROWTH", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 105.01 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("MODERATE_GROWTH");
  });

  it("+5.00% exactly → STABLE (not MODERATE_GROWTH, uses > not >=)", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 105 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("STABLE");
  });

  it("-5.00% exactly → STABLE (>= -5 boundary)", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 95 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("STABLE");
  });

  it("-5.01% → DECLINING", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 94.99 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("DECLINING");
  });

  it("-20.00% exactly → DECLINING (>= -20 boundary)", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 80 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("DECLINING");
  });

  it("-20.01% → STEEP_DECLINE", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 79.99 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("STEEP_DECLINE");
  });

  it("first=0 last>0 → HIGH_GROWTH (division by zero guard)", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 0 }),
      makeForecast({ month: "2026-06", forecastedQty: 50 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("HIGH_GROWTH");
  });

  it("first=0 last=0 → STABLE", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 0 }),
      makeForecast({ month: "2026-06", forecastedQty: 0 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("STABLE");
  });

  it("single month → STABLE (< 2 data points)", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
    ];
    expect(analyzeForecastTrend(forecasts)).toBe("STABLE");
  });
});

describe("HARDENING: Stock health with edge cases", () => {
  it("currentStock = 0 → STOCKOUT regardless of dynamic safety stock", () => {
    expect(classifyStockHealth(0, 100)).toBe("STOCKOUT");
    expect(classifyStockHealth(0, 0)).toBe("STOCKOUT");
  });

  it("dynamicSafetyStock = 0, currentStock > 0 → OVERSTOCK (ratio = Infinity > 2.0)", () => {
    // Division by zero: currentStock / 0 = Infinity → ratio > 2.0 → OVERSTOCK
    expect(classifyStockHealth(1, 0)).toBe("OVERSTOCK");
    expect(classifyStockHealth(500, 0)).toBe("OVERSTOCK");
  });

  it("ratio = 2.01 → OVERSTOCK", () => {
    expect(classifyStockHealth(201, 100)).toBe("OVERSTOCK");
  });

  it("ratio = 2.0 exactly → ADEQUATE (not OVERSTOCK, uses > 2.0)", () => {
    expect(classifyStockHealth(200, 100)).toBe("ADEQUATE");
  });

  it("ratio = 0.8 → ADEQUATE (>= 0.8 boundary)", () => {
    expect(classifyStockHealth(80, 100)).toBe("ADEQUATE");
  });

  it("ratio = 0.79 → LOW", () => {
    expect(classifyStockHealth(79, 100)).toBe("LOW");
  });

  it("ratio = 0.4 → LOW (>= 0.4 boundary)", () => {
    expect(classifyStockHealth(40, 100)).toBe("LOW");
  });

  it("ratio = 0.39 → SHORTAGE_RISK", () => {
    expect(classifyStockHealth(39, 100)).toBe("SHORTAGE_RISK");
  });

  it("negative currentStock → SHORTAGE_RISK (ratio < 0 < 0.4)", () => {
    expect(classifyStockHealth(-50, 100)).toBe("SHORTAGE_RISK");
  });
});

describe("HARDENING: Cash impact edge cases", () => {
  it("zero unitCost → 0 (not NaN)", () => {
    const result = calculateCashImpact(500, 200, 0);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("unitCost = 0, excess stock → still 0", () => {
    const result = calculateCashImpact(1000, 100, 0);
    expect(result).toBe(0);
  });

  it("stock equals safety stock → 0 cash impact", () => {
    const result = calculateCashImpact(200, 200, 85.50);
    expect(result).toBe(0);
  });

  it("negative excess → negative cash impact (deficit)", () => {
    const result = calculateCashImpact(100, 200, 10);
    expect(result).toBe(-1000); // (100-200) × 10 = -1000
  });

  it("precision: rounds to 2 decimal places", () => {
    const result = calculateCashImpact(101, 100, 1.333);
    // (101-100) × 1.333 = 1.333 → rounded to 1.33
    expect(result).toBe(1.33);
  });
});

describe("HARDENING: BOM explosion edge cases", () => {
  it("empty forecasts and BOM → empty map", () => {
    const demand = explodeBomDemand([], []);
    expect(demand.size).toBe(0);
  });

  it("forecasts with no matching BOM → empty map", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ productCode: "UNKNOWN" }),
    ];
    const bom: BomItem[] = [
      makeBom({ productCode: "OTHER" }),
    ];
    const demand = explodeBomDemand(forecasts, bom);
    expect(demand.size).toBe(0);
  });

  it("zero forecastedQty → zero demand", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ productCode: "A", forecastedQty: 0 }),
    ];
    const bom: BomItem[] = [
      makeBom({ productCode: "A", partNumber: "PART-1", qtyPerUnit: 5 }),
    ];
    const demand = explodeBomDemand(forecasts, bom);
    expect(demand.get("PART-1")!.totalDemand).toBe(0);
  });
});

describe("HARDENING: Full engine with extreme inputs", () => {
  it("very large forecastedQty does not overflow", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 1_000_000 }),
      makeForecast({ month: "2026-06", forecastedQty: 1_500_000 }),
    ];
    const bom: BomItem[] = [makeBom({ qtyPerUnit: 10 })];
    const rules = [makeRule({ staticMin: 5000, currentStock: 100 })];
    const report = recalculateSafetyStock(forecasts, bom, rules, NOW);
    expect(report.results[0].forecastTrend).toBe("HIGH_GROWTH");
    expect(report.results[0].dynamicSafetyStock).toBe(7500); // 5000 × 1.5
    expect(report.results[0].stockHealth).toBe("SHORTAGE_RISK"); // 100 vs 7500
  });

  it("deterministic: same inputs always produce same output", () => {
    const forecasts: SalesForecast[] = [
      makeForecast({ month: "2026-01", forecastedQty: 100 }),
      makeForecast({ month: "2026-06", forecastedQty: 150 }),
    ];
    const bom: BomItem[] = [makeBom()];
    const rules = [makeRule()];
    const r1 = recalculateSafetyStock(forecasts, bom, rules, NOW);
    const r2 = recalculateSafetyStock(forecasts, bom, rules, NOW);
    expect(r1).toEqual(r2);
  });
});
