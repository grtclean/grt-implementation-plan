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
 * Data source: DB-first (real materials + inventory + BOM tables) with seed fallback.
 * Architecture: Pure calculation functions exported for Vitest.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

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

// ─── Seed/Fallback Data (GRT Cleaning Equipment Supply Chain) ────────

const SEED_FORECASTS: SalesForecast[] = [
  { productCode: "GWM-3000", productName: "High-Pressure Industrial Washer", month: "2026-03", forecastedQty: 50, confidenceLevel: 85 },
  { productCode: "GWM-3000", productName: "High-Pressure Industrial Washer", month: "2026-04", forecastedQty: 60, confidenceLevel: 80 },
  { productCode: "GWM-3000", productName: "High-Pressure Industrial Washer", month: "2026-05", forecastedQty: 75, confidenceLevel: 72 },
  { productCode: "GUC-500", productName: "Ultrasonic Cleaning System 500L", month: "2026-03", forecastedQty: 30, confidenceLevel: 90 },
  { productCode: "GUC-500", productName: "Ultrasonic Cleaning System 500L", month: "2026-04", forecastedQty: 32, confidenceLevel: 88 },
  { productCode: "GUC-500", productName: "Ultrasonic Cleaning System 500L", month: "2026-05", forecastedQty: 31, confidenceLevel: 85 },
  { productCode: "GSC-200", productName: "Spray Cabinet Degreaser", month: "2026-03", forecastedQty: 40, confidenceLevel: 78 },
  { productCode: "GSC-200", productName: "Spray Cabinet Degreaser", month: "2026-04", forecastedQty: 25, confidenceLevel: 75 },
  { productCode: "GSC-200", productName: "Spray Cabinet Degreaser", month: "2026-05", forecastedQty: 15, confidenceLevel: 70 },
];

const SEED_BOM: BomItem[] = [
  { productCode: "GWM-3000", partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", qtyPerUnit: 4 },
  { productCode: "GWM-3000", partNumber: "PUMP-HP-15KW", partName: "High-Pressure Pump 15kW", qtyPerUnit: 1 },
  { productCode: "GWM-3000", partNumber: "NOZZLE-FAN-45", partName: "Fan Nozzle 45°", qtyPerUnit: 6 },
  { productCode: "GWM-3000", partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", qtyPerUnit: 12 },
  { productCode: "GWM-3000", partNumber: "PLC-SIEMENS-1200", partName: "Siemens S7-1200 PLC", qtyPerUnit: 1 },
  { productCode: "GUC-500", partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", qtyPerUnit: 6 },
  { productCode: "GUC-500", partNumber: "TRANSDUCER-40KHZ", partName: "Ultrasonic Transducer 40kHz", qtyPerUnit: 8 },
  { productCode: "GUC-500", partNumber: "HEATER-3KW", partName: "Immersion Heater 3kW", qtyPerUnit: 2 },
  { productCode: "GUC-500", partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", qtyPerUnit: 8 },
  { productCode: "GUC-500", partNumber: "PLC-SIEMENS-1200", partName: "Siemens S7-1200 PLC", qtyPerUnit: 1 },
  { productCode: "GSC-200", partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", qtyPerUnit: 3 },
  { productCode: "GSC-200", partNumber: "NOZZLE-FAN-45", partName: "Fan Nozzle 45°", qtyPerUnit: 4 },
  { productCode: "GSC-200", partNumber: "PUMP-LP-5KW", partName: "Low-Pressure Pump 5kW", qtyPerUnit: 1 },
  { productCode: "GSC-200", partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", qtyPerUnit: 6 },
];

const SEED_RULES: MaterialRule[] = [
  { partNumber: "SS316-PLATE-3MM", partName: "SS316 Plate 3mm", category: "RAW",
    currentStock: 2000, staticMin: 500, staticMax: 3000, leadTimeDays: 21, unitCost: 85.50, annualDemand: 6000 },
  { partNumber: "PUMP-HP-15KW", partName: "High-Pressure Pump 15kW", category: "COMPONENT",
    currentStock: 8, staticMin: 20, staticMax: 50, leadTimeDays: 45, unitCost: 12800, annualDemand: 120 },
  { partNumber: "NOZZLE-FAN-45", partName: "Fan Nozzle 45°", category: "COMPONENT",
    currentStock: 300, staticMin: 200, staticMax: 800, leadTimeDays: 14, unitCost: 145, annualDemand: 3600 },
  { partNumber: "SEAL-VITON-DN50", partName: "Viton Seal DN50", category: "RAW",
    currentStock: 1500, staticMin: 500, staticMax: 3000, leadTimeDays: 7, unitCost: 18.50, annualDemand: 12000 },
  { partNumber: "PLC-SIEMENS-1200", partName: "Siemens S7-1200 PLC", category: "COMPONENT",
    currentStock: 15, staticMin: 10, staticMax: 30, leadTimeDays: 60, unitCost: 4200, annualDemand: 180 },
  { partNumber: "TRANSDUCER-40KHZ", partName: "Ultrasonic Transducer 40kHz", category: "COMPONENT",
    currentStock: 200, staticMin: 100, staticMax: 400, leadTimeDays: 30, unitCost: 680, annualDemand: 960 },
  { partNumber: "HEATER-3KW", partName: "Immersion Heater 3kW", category: "COMPONENT",
    currentStock: 50, staticMin: 30, staticMax: 100, leadTimeDays: 14, unitCost: 350, annualDemand: 240 },
  { partNumber: "PUMP-LP-5KW", partName: "Low-Pressure Pump 5kW", category: "COMPONENT",
    currentStock: 35, staticMin: 15, staticMax: 50, leadTimeDays: 30, unitCost: 3200, annualDemand: 80 },
];

// ─── DB helpers ──────────────────────────────────────────────────────

/** Load sales forecasts from DB, fallback to SEED_FORECASTS */
async function loadForecasts(): Promise<{ forecasts: SalesForecast[]; dataSource: "database" | "seed" }> {
  try {
    const db = await requireDb();
    const rows = await db.execute(sql`
      SELECT product_code, product_name, month, forecasted_qty, confidence_level
      FROM sales_forecasts
      ORDER BY product_code, month
    `);
    const arr = (rows as any).rows ?? [];
    if (arr.length === 0) return { forecasts: SEED_FORECASTS, dataSource: "seed" };

    return {
      forecasts: arr.map((r: any) => ({
        productCode: r.product_code,
        productName: r.product_name,
        month: r.month,
        forecastedQty: Number(r.forecasted_qty),
        confidenceLevel: Number(r.confidence_level),
      })),
      dataSource: "database",
    };
  } catch {
    return { forecasts: SEED_FORECASTS, dataSource: "seed" };
  }
}

/** Load BOM structure from real bom_masters + bom_items tables, fallback to SEED_BOM */
async function loadBom(): Promise<{ bom: BomItem[]; dataSource: "database" | "seed" }> {
  try {
    const db = await requireDb();
    const rows = await db.execute(sql`
      SELECT bm.product_code, bi.material_code AS part_number, bi.material_name AS part_name,
             bi.quantity AS qty_per_unit
      FROM bom_items bi
      JOIN bom_masters bm ON bi.bom_master_id = bm.id
      WHERE bm.status IN ('active', 'approved', 'released', 'draft')
    `);
    const arr = (rows as any).rows ?? [];
    if (arr.length === 0) return { bom: SEED_BOM, dataSource: "seed" };

    return {
      bom: arr.map((r: any) => ({
        productCode: r.product_code,
        partNumber: r.part_number,
        partName: r.part_name,
        qtyPerUnit: Number(r.qty_per_unit ?? 1),
      })),
      dataSource: "database",
    };
  } catch {
    return { bom: SEED_BOM, dataSource: "seed" };
  }
}

/** Load material rules from real materials + inventory tables, fallback to SEED_RULES */
async function loadMaterialRules(): Promise<{ rules: MaterialRule[]; dataSource: "database" | "seed" }> {
  try {
    const db = await requireDb();
    const rows = await db.execute(sql`
      SELECT m.material_code AS part_number, m.material_name AS part_name,
             COALESCE(m.material_type, 'component') AS category,
             COALESCE(i.quantity, 0) AS current_stock,
             COALESCE(i.min_stock, 0) AS static_min,
             COALESCE(i.max_stock, 0) AS static_max,
             COALESCE(m.standard_cost, 0) AS unit_cost,
             COALESCE(i.safety_stock, 0) AS safety_stock
      FROM materials m
      LEFT JOIN inventory i ON i.material_id = m.id
      WHERE m.status != 'deleted'
        AND COALESCE(i.min_stock, 0) > 0
    `);
    const arr = (rows as any).rows ?? [];
    if (arr.length === 0) return { rules: SEED_RULES, dataSource: "seed" };

    return {
      rules: arr.map((r: any) => ({
        partNumber: r.part_number,
        partName: r.part_name,
        category: String(r.category).toUpperCase(),
        currentStock: Number(r.current_stock),
        staticMin: Number(r.static_min),
        staticMax: Number(r.static_max),
        leadTimeDays: 14,  // default; not tracked in current materials schema
        unitCost: Number(r.unit_cost),
        annualDemand: 0,   // not tracked
      })),
      dataSource: "database",
    };
  } catch {
    return { rules: SEED_RULES, dataSource: "seed" };
  }
}

// ─── tRPC Router ─────────────────────────────────────────────────────

export const smartInventoryRouter = router({
  /**
   * dashboard — full recalculation with cash impact analysis.
   */
  dashboard: protectedProcedure.query(async () => {
    const [{ forecasts }, { bom }, { rules }] = await Promise.all([
      loadForecasts(), loadBom(), loadMaterialRules(),
    ]);
    const report = recalculateSafetyStock(forecasts, bom, rules);
    const dataSource = rules === SEED_RULES ? "seed" as const : "database" as const;
    return { ...report, dataSource };
  }),

  /**
   * forecasts — view sales forecasts by product.
   */
  forecasts: protectedProcedure.query(async () => {
    const { forecasts, dataSource } = await loadForecasts();
    return {
      forecasts,
      products: [...new Set(forecasts.map(f => f.productCode))].map(code => {
        const fcs = forecasts.filter(f => f.productCode === code);
        return {
          productCode: code,
          productName: fcs[0].productName,
          trend: analyzeForecastTrend(fcs),
          months: fcs,
        };
      }),
      dataSource,
    };
  }),

  /**
   * recalculate — trigger manual recalculation.
   */
  recalculate: protectedProcedure.mutation(async () => {
    const [{ forecasts }, { bom }, { rules }] = await Promise.all([
      loadForecasts(), loadBom(), loadMaterialRules(),
    ]);
    const report = recalculateSafetyStock(forecasts, bom, rules, new Date());
    const dataSource = rules === SEED_RULES ? "seed" as const : "database" as const;
    return { ...report, dataSource };
  }),

  /**
   * partDetail — detailed analysis for a single part.
   */
  partDetail: protectedProcedure
    .input(z.object({ partNumber: z.string() }))
    .query(async ({ input }) => {
      const [{ forecasts }, { bom }, { rules }] = await Promise.all([
        loadForecasts(), loadBom(), loadMaterialRules(),
      ]);
      const report = recalculateSafetyStock(forecasts, bom, rules);
      const part = report.results.find(r => r.partNumber === input.partNumber);
      if (!part) return { found: false, part: null };

      const relatedForecasts = forecasts.filter(f =>
        bom.some(b => b.productCode === f.productCode && b.partNumber === input.partNumber)
      );
      const relatedProducts = [...new Set(
        bom.filter(b => b.partNumber === input.partNumber).map(b => b.productCode)
      )];

      return {
        found: true,
        part,
        relatedForecasts,
        relatedProducts,
        bom: bom.filter(b => b.partNumber === input.partNumber),
      };
    }),

  /**
   * seedDemo — create sales_forecasts table and seed demo data.
   */
  seedDemo: protectedProcedure.mutation(async () => {
    const db = await requireDb();

    // Create sales_forecasts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sales_forecasts (
        id SERIAL PRIMARY KEY,
        product_code VARCHAR(50) NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        month VARCHAR(10) NOT NULL,
        forecasted_qty INTEGER NOT NULL DEFAULT 0,
        confidence_level INTEGER NOT NULL DEFAULT 80,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(product_code, month)
      )
    `);

    // Seed forecast data (upsert)
    const results = [];
    for (const fc of SEED_FORECASTS) {
      try {
        await db.execute(sql`
          INSERT INTO sales_forecasts (product_code, product_name, month, forecasted_qty, confidence_level)
          VALUES (${fc.productCode}, ${fc.productName}, ${fc.month}, ${fc.forecastedQty}, ${fc.confidenceLevel})
          ON CONFLICT (product_code, month) DO UPDATE SET
            forecasted_qty = EXCLUDED.forecasted_qty,
            confidence_level = EXCLUDED.confidence_level,
            updated_at = NOW()
        `);
        results.push({ productCode: fc.productCode, month: fc.month, status: "ok" });
      } catch (e) {
        results.push({ productCode: fc.productCode, month: fc.month, status: "error", error: String(e) });
      }
    }

    return {
      seeded: true,
      forecasts: results,
      tables: ["sales_forecasts"],
      note: "Material rules and BOM data are read from real 'materials', 'inventory', and 'bom_items'/'bom_masters' tables.",
    };
  }),
});
