/**
 * Smart Inventory — Dynamic Safety Stock Optimization Engine + tRPC Router
 * Phase 3.3 — AI-Driven Inventory: Static Min/Max → Dynamic Prediction
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                 THE INVENTORY INTELLIGENCE ENGINE                        │
 * │                                                                          │
 * │  ① FORECAST             ② BOM EXPLODE          ③ OPTIMIZE               │
 * │  ┌───────────────┐    ┌──────────────────┐   ┌───────────────────┐      │
 * │  │ Sales Forecast│    │ Product → Parts  │   │ Dynamic Safety    │      │
 * │  │ Next 3 months │──▶│ BOM Explosion    │──▶│ Stock Calculation│      │
 * │  │ Trend: UP/DOWN│    │ Material demand  │   │ vs Current Stock │      │
 * │  └───────────────┘    └──────────────────┘   └───────┬───────────┘      │
 * │                                                       │                  │
 * │  ④ CLASSIFY                    ⑤ ACTION                                 │
 * │  ┌───────────────────┐       ┌─────────────────────────┐                │
 * │  │ OVERSTOCK=Cash Trap│       │ DECREASE → Release Cash │                │
 * │  │ SHORTAGE=Expedite  │       │ INCREASE → Buy Now      │                │
 * │  │ ADEQUATE=Hold      │       │ EXPEDITE → Rush Order   │                │
 * │  └───────────────────┘       └─────────────────────────┘                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Forecast Trend Thresholds:
 *   HIGH_GROWTH:     >20% MoM increase  → dynamic = 1.5 × static_min
 *   MODERATE_GROWTH: 5-20% increase     → dynamic = 1.25 × static_min
 *   STABLE:          -5% to +5%         → dynamic = 1.0 × static_min
 *   DECLINING:       -5% to -20%        → dynamic = 0.75 × static_min
 *   STEEP_DECLINE:   >20% decrease      → dynamic = 0.5 × static_min
 *
 * Architecture: Pure calculation functions exported for Vitest.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type ForecastTrend = "HIGH_GROWTH" | "MODERATE_GROWTH" | "STABLE" | "DECLINING" | "STEEP_DECLINE";
export type StockHealth = "OVERSTOCK" | "ADEQUATE" | "LOW" | "SHORTAGE_RISK" | "STOCKOUT";
export type InventoryAction = "INCREASE_STOCK" | "DECREASE_STOCK" | "EXPEDITE" | "HOLD" | "REBALANCE";

export interface SalesForecast {
  productCode: string;
  productName: string;
  month: string;        // "2026-03"
  forecastedQty: number;
  confidenceLevel: number;  // 0-100
}

export interface BomItem {
  productCode: string;
  partNumber: string;
  partName: string;
  qtyPerUnit: number;   // how many parts per 1 finished product
}

export interface MaterialRule {
  partNumber: string;
  partName: string;
  category: string;         // "RAW", "COMPONENT", "SUBASSEMBLY"
  currentStock: number;
  staticMin: number;
  staticMax: number;
  leadTimeDays: number;
  unitCost: number;         // ¥ per unit
  annualDemand: number;
}

export interface DynamicStockResult {
  partNumber: string;
  partName: string;
  category: string;
  currentStock: number;
  staticMin: number;
  dynamicSafetyStock: number;
  forecastTrend: ForecastTrend;
  stockHealth: StockHealth;
  action: InventoryAction;
  reason: string;
  potentialSavings: number;     // positive = cash freed, negative = investment needed
  demandNext3Months: number;
  unitCost: number;
  leadTimeDays: number;
}

export interface RecalculationReport {
  results: DynamicStockResult[];
  summary: {
    totalParts: number;
    overstock: number;
    adequate: number;
    low: number;
    shortageRisk: number;
    stockout: number;
    totalCashTrapped: number;    // ¥ value of overstocked items
    totalCashNeeded: number;     // ¥ value of shortage items to buy
    netCashImpact: number;       // trapped - needed (positive = can release)
  };
  topCashTraps: DynamicStockResult[];
  topShortageRisks: DynamicStockResult[];
  timestamp: string;
}

// ─── Pure Calculation Engine (fully unit-testable) ───────────────────

/**
 * Analyze forecast trend from 3 months of data.
 * Compares M3 vs M1 to determine growth trajectory.
 */
export function analyzeForecastTrend(forecasts: SalesForecast[]): ForecastTrend {
  if (forecasts.length < 2) return "STABLE";

  const sorted = [...forecasts].sort((a, b) => a.month.localeCompare(b.month));
  const first = sorted[0].forecastedQty;
  const last = sorted[sorted.length - 1].forecastedQty;

  if (first === 0) return last > 0 ? "HIGH_GROWTH" : "STABLE";

  const changePercent = ((last - first) / first) * 100;

  if (changePercent > 20) return "HIGH_GROWTH";
  if (changePercent > 5) return "MODERATE_GROWTH";
  if (changePercent >= -5) return "STABLE";
  if (changePercent >= -20) return "DECLINING";
  return "STEEP_DECLINE";
}

/**
 * Calculate the dynamic safety stock multiplier from trend.
 */
export function trendMultiplier(trend: ForecastTrend): number {
  const multipliers: Record<ForecastTrend, number> = {
    HIGH_GROWTH: 1.5,
    MODERATE_GROWTH: 1.25,
    STABLE: 1.0,
    DECLINING: 0.75,
    STEEP_DECLINE: 0.5,
  };
  return multipliers[trend];
}

/**
 * Calculate dynamic safety stock from static min and forecast trend.
 */
export function calculateDynamicSafetyStock(
  staticMin: number,
  trend: ForecastTrend
): number {
  return Math.round(staticMin * trendMultiplier(trend));
}

/**
 * Explode BOM: given product forecasts, compute raw material demand.
 * For each product's forecast → multiply by BOM qty per unit.
 */
export function explodeBomDemand(
  forecasts: SalesForecast[],
  bom: BomItem[]
): Map<string, { partNumber: string; partName: string; totalDemand: number }> {
  const demand = new Map<string, { partNumber: string; partName: string; totalDemand: number }>();

  for (const fc of forecasts) {
    const parts = bom.filter(b => b.productCode === fc.productCode);
    for (const part of parts) {
      const existing = demand.get(part.partNumber) ?? { partNumber: part.partNumber, partName: part.partName, totalDemand: 0 };
      existing.totalDemand += fc.forecastedQty * part.qtyPerUnit;
      demand.set(part.partNumber, existing);
    }
  }

  return demand;
}

/**
 * Classify stock health by comparing current stock to dynamic safety stock.
 */
export function classifyStockHealth(
  currentStock: number,
  dynamicSafetyStock: number
): StockHealth {
  if (currentStock === 0) return "STOCKOUT";
  const ratio = currentStock / dynamicSafetyStock;
  if (ratio > 2.0) return "OVERSTOCK";
  if (ratio >= 0.8) return "ADEQUATE";
  if (ratio >= 0.4) return "LOW";
  return "SHORTAGE_RISK";
}

/**
 * Determine the action to take based on stock health.
 */
export function determineAction(health: StockHealth, trend: ForecastTrend): InventoryAction {
  if (health === "STOCKOUT" || health === "SHORTAGE_RISK") return "EXPEDITE";
  if (health === "LOW" && (trend === "HIGH_GROWTH" || trend === "MODERATE_GROWTH")) return "INCREASE_STOCK";
  if (health === "OVERSTOCK" && (trend === "DECLINING" || trend === "STEEP_DECLINE")) return "DECREASE_STOCK";
  if (health === "OVERSTOCK") return "HOLD";
  return "HOLD";
}

/**
 * Calculate potential savings (cash impact).
 * Positive = cash that can be freed (overstock above dynamic level).
 * Negative = cash needed to buy (shortage below dynamic level).
 */
export function calculateCashImpact(
  currentStock: number,
  dynamicSafetyStock: number,
  unitCost: number
): number {
  const excess = currentStock - dynamicSafetyStock;
  return Math.round(excess * unitCost * 100) / 100;
}

/**
 * THE BRAIN: Recalculate safety stock for all materials.
 * Input: forecasts + BOM + material rules.
 * Output: full optimization report with cash impact.
 */
export function recalculateSafetyStock(
  forecasts: SalesForecast[],
  bom: BomItem[],
  rules: MaterialRule[],
  now: Date = new Date()
): RecalculationReport {
  // Group forecasts by product
  const productForecasts = new Map<string, SalesForecast[]>();
  for (const fc of forecasts) {
    const list = productForecasts.get(fc.productCode) ?? [];
    list.push(fc);
    productForecasts.set(fc.productCode, list);
  }

  // Determine overall trend per product
  const productTrends = new Map<string, ForecastTrend>();
  for (const [productCode, fcs] of productForecasts) {
    productTrends.set(productCode, analyzeForecastTrend(fcs));
  }

  // Explode BOM to get material demand
  const bomDemand = explodeBomDemand(forecasts, bom);

  // For each material, determine the dominant trend from its products
  const partTrends = new Map<string, ForecastTrend>();
  for (const item of bom) {
    const pTrend = productTrends.get(item.productCode) ?? "STABLE";
    const existing = partTrends.get(item.partNumber);
    // If multiple products use the same part, use the most aggressive trend
    if (!existing || trendMultiplier(pTrend) > trendMultiplier(existing)) {
      partTrends.set(item.partNumber, pTrend);
    }
  }

  // Calculate results for each material rule
  const results: DynamicStockResult[] = rules.map(rule => {
    const trend = partTrends.get(rule.partNumber) ?? "STABLE";
    const dynamicSafetyStock = calculateDynamicSafetyStock(rule.staticMin, trend);
    const stockHealth = classifyStockHealth(rule.currentStock, dynamicSafetyStock);
    const action = determineAction(stockHealth, trend);
    const potentialSavings = calculateCashImpact(rule.currentStock, dynamicSafetyStock, rule.unitCost);
    const demandEntry = bomDemand.get(rule.partNumber);
    const demandNext3Months = demandEntry?.totalDemand ?? 0;

    let reason = "";
    if (stockHealth === "OVERSTOCK") {
      reason = `CASH TRAP: ${rule.currentStock} units on hand but dynamic safety only requires ${dynamicSafetyStock}. Forecast trend: ${trend}. ¥${Math.abs(potentialSavings).toLocaleString()} trapped in excess inventory.`;
    } else if (stockHealth === "SHORTAGE_RISK" || stockHealth === "STOCKOUT") {
      reason = `SHORTAGE RISK: Only ${rule.currentStock} units on hand, need ${dynamicSafetyStock} minimum. Forecast trend: ${trend}. Requires ¥${Math.abs(potentialSavings).toLocaleString()} investment to reach safety level.`;
    } else if (stockHealth === "LOW" && (trend === "HIGH_GROWTH" || trend === "MODERATE_GROWTH")) {
      reason = `GROWTH DEMAND: Stock at ${rule.currentStock} is below safe level ${dynamicSafetyStock} given ${trend} forecast. Recommend purchasing.`;
    } else {
      reason = `Stock level ${rule.currentStock} is adequate for dynamic safety stock ${dynamicSafetyStock} (trend: ${trend}).`;
    }

    return {
      partNumber: rule.partNumber,
      partName: rule.partName,
      category: rule.category,
      currentStock: rule.currentStock,
      staticMin: rule.staticMin,
      dynamicSafetyStock,
      forecastTrend: trend,
      stockHealth,
      action,
      reason,
      potentialSavings,
      demandNext3Months,
      unitCost: rule.unitCost,
      leadTimeDays: rule.leadTimeDays,
    };
  });

  // Summary
  const overstock = results.filter(r => r.stockHealth === "OVERSTOCK");
  const adequate = results.filter(r => r.stockHealth === "ADEQUATE");
  const low = results.filter(r => r.stockHealth === "LOW");
  const shortageRisk = results.filter(r => r.stockHealth === "SHORTAGE_RISK");
  const stockout = results.filter(r => r.stockHealth === "STOCKOUT");

  const totalCashTrapped = overstock.reduce((s, r) => s + Math.max(0, r.potentialSavings), 0);
  const totalCashNeeded = [...shortageRisk, ...stockout].reduce((s, r) => s + Math.abs(Math.min(0, r.potentialSavings)), 0);

  // Top 5 cash traps and risks
  const topCashTraps = [...overstock].sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 5);
  const topShortageRisks = [...shortageRisk, ...stockout].sort((a, b) => a.potentialSavings - b.potentialSavings).slice(0, 5);

  return {
    results,
    summary: {
      totalParts: results.length,
      overstock: overstock.length,
      adequate: adequate.length,
      low: low.length,
      shortageRisk: shortageRisk.length,
      stockout: stockout.length,
      totalCashTrapped: Math.round(totalCashTrapped * 100) / 100,
      totalCashNeeded: Math.round(totalCashNeeded * 100) / 100,
      netCashImpact: Math.round((totalCashTrapped - totalCashNeeded) * 100) / 100,
    },
    topCashTraps,
    topShortageRisks,
    timestamp: now.toISOString(),
  };
}

// ─── Mock Data (GRT Cleaning Equipment Supply Chain) ─────────────────

const MOCK_FORECASTS: SalesForecast[] = [
  // Product GWM-3000: High-Pressure Washer — HIGH GROWTH (50→60→75)
  { productCode: "GWM-3000", productName: "High-Pressure Industrial Washer", month: "2026-03", forecastedQty: 50, confidenceLevel: 85 },
  { productCode: "GWM-3000", productName: "High-Pressure Industrial Washer", month: "2026-04", forecastedQty: 60, confidenceLevel: 80 },
  { productCode: "GWM-3000", productName: "High-Pressure Industrial Washer", month: "2026-05", forecastedQty: 75, confidenceLevel: 72 },

  // Product GUC-500: Ultrasonic Cleaner — STABLE (30→32→31)
  { productCode: "GUC-500", productName: "Ultrasonic Cleaning System 500L", month: "2026-03", forecastedQty: 30, confidenceLevel: 90 },
  { productCode: "GUC-500", productName: "Ultrasonic Cleaning System 500L", month: "2026-04", forecastedQty: 32, confidenceLevel: 88 },
  { productCode: "GUC-500", productName: "Ultrasonic Cleaning System 500L", month: "2026-05", forecastedQty: 31, confidenceLevel: 85 },

  // Product GSC-200: Spray Cabinet — STEEP DECLINE (40→25→15)
  { productCode: "GSC-200", productName: "Spray Cabinet Degreaser", month: "2026-03", forecastedQty: 40, confidenceLevel: 78 },
  { productCode: "GSC-200", productName: "Spray Cabinet Degreaser", month: "2026-04", forecastedQty: 25, confidenceLevel: 75 },
  { productCode: "GSC-200", productName: "Spray Cabinet Degreaser", month: "2026-05", forecastedQty: 15, confidenceLevel: 70 },
];

const MOCK_BOM: BomItem[] = [
  // GWM-3000 BOM
  { productCode: "GWM-3000", partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", qtyPerUnit: 4 },
  { productCode: "GWM-3000", partNumber: "PUMP-HP-15KW", partName: "High-Pressure Pump 15kW", qtyPerUnit: 1 },
  { productCode: "GWM-3000", partNumber: "NOZZLE-FAN-45", partName: "Fan Nozzle 45°", qtyPerUnit: 6 },
  { productCode: "GWM-3000", partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", qtyPerUnit: 12 },
  { productCode: "GWM-3000", partNumber: "PLC-SIEMENS-1200", partName: "Siemens S7-1200 PLC", qtyPerUnit: 1 },

  // GUC-500 BOM
  { productCode: "GUC-500", partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", qtyPerUnit: 6 },
  { productCode: "GUC-500", partNumber: "TRANSDUCER-40KHZ", partName: "Ultrasonic Transducer 40kHz", qtyPerUnit: 8 },
  { productCode: "GUC-500", partNumber: "HEATER-3KW", partName: "Immersion Heater 3kW", qtyPerUnit: 2 },
  { productCode: "GUC-500", partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", qtyPerUnit: 8 },
  { productCode: "GUC-500", partNumber: "PLC-SIEMENS-1200", partName: "Siemens S7-1200 PLC", qtyPerUnit: 1 },

  // GSC-200 BOM
  { productCode: "GSC-200", partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", qtyPerUnit: 3 },
  { productCode: "GSC-200", partNumber: "NOZZLE-FAN-45", partName: "Fan Nozzle 45°", qtyPerUnit: 4 },
  { productCode: "GSC-200", partNumber: "PUMP-LP-5KW", partName: "Low-Pressure Pump 5kW", qtyPerUnit: 1 },
  { productCode: "GSC-200", partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", qtyPerUnit: 6 },
];

const MOCK_RULES: MaterialRule[] = [
  // SS316 Plate — shared by all 3 products, currently overstocked
  { partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", category: "RAW",
    currentStock: 2000, staticMin: 500, staticMax: 3000, leadTimeDays: 21, unitCost: 85.50, annualDemand: 6000 },

  // HP Pump — critical, limited supply
  { partNumber: "PUMP-HP-15KW", partName: "High-Pressure Pump 15kW", category: "COMPONENT",
    currentStock: 8, staticMin: 20, staticMax: 50, leadTimeDays: 45, unitCost: 12800, annualDemand: 120 },

  // Fan Nozzle — medium stock
  { partNumber: "NOZZLE-FAN-45", partName: "Fan Nozzle 45°", category: "COMPONENT",
    currentStock: 300, staticMin: 200, staticMax: 800, leadTimeDays: 14, unitCost: 145, annualDemand: 3600 },

  // Viton Seals — consumable, fast moving
  { partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", category: "RAW",
    currentStock: 1500, staticMin: 500, staticMax: 3000, leadTimeDays: 7, unitCost: 18.50, annualDemand: 12000 },

  // PLC — expensive, long lead
  { partNumber: "PLC-SIEMENS-1200", partName: "Siemens S7-1200 PLC", category: "COMPONENT",
    currentStock: 15, staticMin: 10, staticMax: 30, leadTimeDays: 60, unitCost: 4200, annualDemand: 180 },

  // Ultrasonic Transducer — stable demand
  { partNumber: "TRANSDUCER-40KHZ", partName: "Ultrasonic Transducer 40kHz", category: "COMPONENT",
    currentStock: 200, staticMin: 100, staticMax: 400, leadTimeDays: 30, unitCost: 680, annualDemand: 960 },

  // Immersion Heater — stable demand
  { partNumber: "HEATER-3KW", partName: "Immersion Heater 3kW", category: "COMPONENT",
    currentStock: 50, staticMin: 30, staticMax: 100, leadTimeDays: 14, unitCost: 350, annualDemand: 240 },

  // LP Pump — declining demand (GSC-200 only)
  { partNumber: "PUMP-LP-5KW", partName: "Low-Pressure Pump 5kW", category: "COMPONENT",
    currentStock: 35, staticMin: 15, staticMax: 50, leadTimeDays: 30, unitCost: 3200, annualDemand: 80 },
];

// ─── tRPC Router ─────────────────────────────────────────────────────

export const smartInventoryRouter = router({
  /**
   * dashboard — full recalculation with cash impact analysis.
   */
  dashboard: protectedProcedure.query(async () => {
    const report = recalculateSafetyStock(MOCK_FORECASTS, MOCK_BOM, MOCK_RULES);
    return { ...report, dataSource: "mock" as const };
  }),

  /**
   * forecasts — view sales forecasts by product.
   */
  forecasts: protectedProcedure.query(async () => {
    return {
      forecasts: MOCK_FORECASTS,
      products: [...new Set(MOCK_FORECASTS.map(f => f.productCode))].map(code => {
        const fcs = MOCK_FORECASTS.filter(f => f.productCode === code);
        return {
          productCode: code,
          productName: fcs[0].productName,
          trend: analyzeForecastTrend(fcs),
          months: fcs,
        };
      }),
      dataSource: "mock" as const,
    };
  }),

  /**
   * recalculate — trigger manual recalculation.
   */
  recalculate: protectedProcedure.mutation(async () => {
    const report = recalculateSafetyStock(MOCK_FORECASTS, MOCK_BOM, MOCK_RULES, new Date());
    return { ...report, dataSource: "mock" as const };
  }),

  /**
   * partDetail — detailed analysis for a single part.
   */
  partDetail: protectedProcedure
    .input(z.object({ partNumber: z.string() }))
    .query(async ({ input }) => {
      const report = recalculateSafetyStock(MOCK_FORECASTS, MOCK_BOM, MOCK_RULES);
      const part = report.results.find(r => r.partNumber === input.partNumber);
      if (!part) return { found: false, part: null };

      const relatedForecasts = MOCK_FORECASTS.filter(f =>
        MOCK_BOM.some(b => b.productCode === f.productCode && b.partNumber === input.partNumber)
      );
      const relatedProducts = [...new Set(
        MOCK_BOM.filter(b => b.partNumber === input.partNumber).map(b => b.productCode)
      )];

      return {
        found: true,
        part,
        relatedForecasts,
        relatedProducts,
        bom: MOCK_BOM.filter(b => b.partNumber === input.partNumber),
      };
    }),
});
