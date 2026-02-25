/**
 * Smart Inventory — Dynamic Safety Stock & Cash Flow Optimization Schema
 * Phase 3.3 — AI-Driven Inventory: From Static Min/Max to Dynamic Prediction
 *
 * This schema enables the Smart Inventory Engine:
 *   1 Sales forecasts (demand signal per product per month)
 *   2 Material inventory rules (static + AI-dynamic safety stock per part)
 *   3 Inventory AI action logs (audit trail of stock adjustments + savings)
 *
 * Bridges existing domains:
 *   - materials (material-schema.ts)             -> part master + static min/max
 *   - bomItems (bom-schema.ts)                   -> BOM explosion for demand
 *   - inventory (material-schema.ts)             -> current stock levels
 *   - supplierMaterials (material-schema.ts)     -> lead time + unit price
 *   - supplyChainPredictions (schema.ts)         -> ML prediction feed
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────

export const forecastTrendEnum = pgEnum("forecast_trend", [
  "HIGH_GROWTH",    // >20% increase
  "MODERATE_GROWTH",// 5-20% increase
  "STABLE",         // -5% to +5%
  "DECLINING",      // -5% to -20%
  "STEEP_DECLINE",  // >20% decrease
]);

export const stockHealthEnum = pgEnum("stock_health", [
  "OVERSTOCK",      // current >> dynamic safety → cash trap
  "ADEQUATE",       // current within healthy range
  "LOW",            // current approaching dynamic min
  "SHORTAGE_RISK",  // current << dynamic safety → expedite
  "STOCKOUT",       // current = 0
]);

export const inventoryActionEnum = pgEnum("inventory_ai_action", [
  "INCREASE_STOCK",   // dynamic safety raised → recommend buy
  "DECREASE_STOCK",   // dynamic safety lowered → release cash
  "EXPEDITE",         // shortage risk → rush order
  "HOLD",             // overstock → stop buying
  "REBALANCE",        // move stock between warehouses
]);

// ─── Sales Forecasts (demand signal) ─────────────────────────────────

export const salesForecasts = pgTable("sales_forecasts", {
  id: serial("id").primaryKey(),
  productCode: varchar("product_code", { length: 50 }).notNull(),
  productName: varchar("product_name", { length: 200 }),
  month: varchar("month", { length: 7 }).notNull(),            // "2026-03"
  forecastedQty: integer("forecasted_qty").notNull(),
  actualQty: integer("actual_qty"),                             // filled after month ends
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }), // 0-100
  forecastSource: varchar("forecast_source", { length: 50 }),   // "AI", "SALES_TEAM", "HISTORY"
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_sf_product").on(table.productCode),
  index("idx_sf_month").on(table.month),
  index("idx_sf_product_month").on(table.productCode, table.month),
]);

// ─── Material Inventory Rules (static + AI dynamic) ──────────────────

export const materialInventoryRules = pgTable("material_inventory_rules", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 50 }).notNull(),
  partName: varchar("part_name", { length: 200 }),
  category: varchar("category", { length: 50 }),                // "RAW", "COMPONENT", "SUBASSEMBLY"

  currentStock: integer("current_stock").notNull(),
  staticMin: integer("static_min").notNull(),                   // old-school fixed minimum
  staticMax: integer("static_max"),
  dynamicSafetyStock: integer("dynamic_safety_stock"),          // AI-calculated
  reorderPoint: integer("reorder_point"),

  leadTimeDays: integer("lead_time_days").default(14),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }), // for cash impact calc
  annualDemand: integer("annual_demand"),

  stockHealth: stockHealthEnum("stock_health"),
  forecastTrend: forecastTrendEnum("forecast_trend"),
  lastRecalculated: timestamp("last_recalculated", { mode: "string" }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_mir_part").on(table.partNumber),
  index("idx_mir_health").on(table.stockHealth),
  index("idx_mir_trend").on(table.forecastTrend),
]);

// ─── Inventory AI Action Logs (audit trail) ──────────────────────────

export const inventoryAiLogs = pgTable("inventory_ai_logs", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 50 }).notNull(),
  partName: varchar("part_name", { length: 200 }),
  action: inventoryActionEnum("action").notNull(),
  reason: text("reason").notNull(),

  previousDynamicStock: integer("previous_dynamic_stock"),
  newDynamicStock: integer("new_dynamic_stock"),
  currentStock: integer("current_stock"),

  potentialSavings: decimal("potential_savings", { precision: 12, scale: 2 }), // ¥ freed or needed
  forecastTrend: forecastTrendEnum("forecast_trend"),
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }),

  executedAt: timestamp("executed_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_ial_part").on(table.partNumber),
  index("idx_ial_action").on(table.action),
  index("idx_ial_executed").on(table.executedAt),
]);
