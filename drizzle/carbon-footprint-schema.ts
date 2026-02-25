/**
 * Carbon Footprint & CBAM Compliance Schema
 * Phase 3.4 — Product Carbon Footprint Tracking (产品碳足迹追踪)
 *
 * EU CBAM (Carbon Border Adjustment Mechanism) requires exporters to
 * declare the embedded CO₂e of every product crossing the EU border.
 *
 * This schema enables the Carbon Calculation Engine:
 *   1 Material carbon factors (Scope 3 — upstream material emissions)
 *   2 Machine energy profiles (Scope 2 — manufacturing electricity)
 *   3 Product CBAM declarations (aggregated footprint + EU compliance status)
 *
 * Bridges existing domains:
 *   - bomItems (bom-schema.ts)                  → BOM explosion for material mass
 *   - materials (material-schema.ts)             → part master + weight data
 *   - machineHealthSensors (smart-scheduling)    → powerConsumption (kW)
 *   - productionEquipments (production-equipment) → machine registry
 *   - ecoBomChanges (eco-integration-schema.ts)  → material swap for green alternatives
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────

export const cbamStatusEnum = pgEnum("cbam_status", [
  "COMPLIANT",       // total CO₂e < EU threshold
  "AT_RISK",         // total CO₂e within 10% of threshold
  "NON_COMPLIANT",   // total CO₂e > EU threshold
]);

export const carbonScopeEnum = pgEnum("carbon_scope", [
  "SCOPE_2",         // manufacturing electricity
  "SCOPE_3",         // upstream materials
]);

// ─── Material Carbon Factors (Scope 3 emissions per kg) ──────────────

export const materialCarbonFactors = pgTable("material_carbon_factors", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 50 }).notNull(),
  partName: varchar("part_name", { length: 200 }),
  materialType: varchar("material_type", { length: 100 }),        // "Stainless Steel 316L", "Carbon Steel", etc.
  co2PerKg: decimal("co2_per_kg", { precision: 10, scale: 4 }).notNull(),  // kg CO₂e per kg of material
  source: varchar("source", { length: 100 }),                      // "IPCC 2023", "Supplier EPD", "GaBi DB"
  region: varchar("region", { length: 50 }),                       // "CN", "EU", "Global"
  validFrom: timestamp("valid_from", { mode: "string" }),
  validUntil: timestamp("valid_until", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_mcf_part").on(table.partNumber),
  index("idx_mcf_material_type").on(table.materialType),
]);

// ─── Machine Energy Profiles (Scope 2 electricity emissions) ─────────

export const machineEnergyProfiles = pgTable("machine_energy_profiles", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").notNull(),
  machineCode: varchar("machine_code", { length: 50 }).notNull(),
  machineName: varchar("machine_name", { length: 200 }),
  kwPerHour: decimal("kw_per_hour", { precision: 8, scale: 2 }).notNull(),     // kW average power draw
  gridCo2Factor: decimal("grid_co2_factor", { precision: 8, scale: 4 }).notNull(), // kg CO₂e per kWh (grid mix)
  region: varchar("region", { length: 50 }),                                     // "CN-East", "CN-South", "DE"
  source: varchar("source", { length: 100 }),                                    // "State Grid 2025", "TÜV"
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_mep_machine").on(table.machineCode),
  index("idx_mep_region").on(table.region),
]);

// ─── Product CBAM Declarations ───────────────────────────────────────

export const productCbamDeclarations = pgTable("product_cbam_declarations", {
  id: serial("id").primaryKey(),
  productCode: varchar("product_code", { length: 50 }).notNull(),
  productName: varchar("product_name", { length: 200 }),
  declarationDate: timestamp("declaration_date", { mode: "string" }).defaultNow().notNull(),

  // Scope 3 — Materials
  materialCo2: decimal("material_co2", { precision: 12, scale: 4 }),  // kg CO₂e from BOM materials
  materialBreakdown: text("material_breakdown"),                       // JSON: per-part CO₂ breakdown

  // Scope 2 — Energy
  energyCo2: decimal("energy_co2", { precision: 12, scale: 4 }),      // kg CO₂e from machining energy
  energyBreakdown: text("energy_breakdown"),                           // JSON: per-machine CO₂ breakdown

  // Total
  totalCo2: decimal("total_co2", { precision: 12, scale: 4 }),        // materialCo2 + energyCo2
  co2PerUnit: decimal("co2_per_unit", { precision: 12, scale: 4 }),   // total / production quantity

  // EU CBAM threshold
  euThreshold: decimal("eu_threshold", { precision: 12, scale: 4 }),  // max allowed kg CO₂e
  status: cbamStatusEnum("status").notNull(),

  // Audit
  calculatedBy: varchar("calculated_by", { length: 100 }),
  approvedBy: varchar("approved_by", { length: 100 }),
  notes: text("notes"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_pcbd_product").on(table.productCode),
  index("idx_pcbd_status").on(table.status),
  index("idx_pcbd_date").on(table.declarationDate),
]);
