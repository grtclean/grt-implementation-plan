/**
 * ECO Cost Impact Integration — Cross-Domain Bridge Schema
 * Phase 2.1 — PLM↔WMS↔ERP Fusion
 *
 * This schema bridges three existing domains:
 *   ① PLM  — engineering_change_orders (digital-thread-schema.ts)
 *   ② BOM  — bomItems + bomMasters (bom-schema.ts)
 *   ③ WMS  — inventory + materials (material-schema.ts)
 *
 * It does NOT duplicate those tables. It adds:
 *   - eco_bom_changes: line-level part swap tracking per ECO
 *   - eco_impact_snapshots: pre-computed financial impact for audit trail
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

export const ecoChangeTypeEnum = pgEnum("eco_change_type", [
  "SUBSTITUTE",    // Replace old part with new part
  "ADD",           // Add new part to BOM
  "REMOVE",        // Remove part from BOM
  "QUANTITY",      // Change quantity only (same part)
]);

export const ecoImpactStatusEnum = pgEnum("eco_impact_status", [
  "DRAFT",         // Impact calculated but not reviewed
  "REVIEWED",      // Manager reviewed the impact
  "APPROVED",      // ECO approved with known financial impact
  "REJECTED",      // ECO rejected due to financial impact
]);

// ─── ECO BOM Changes (line-level part swap tracking) ─────────────────

export const ecoBomChanges = pgTable("eco_bom_changes", {
  id: serial("id").primaryKey(),
  ecoId: integer("eco_id").notNull(),                          // FK → engineering_change_orders.id
  bomItemId: integer("bom_item_id"),                           // FK → bomItems.id (null for ADD)
  changeType: ecoChangeTypeEnum("change_type").notNull(),
  oldPartNumber: varchar("old_part_number", { length: 50 }),   // materialCode being replaced
  oldPartName: varchar("old_part_name", { length: 200 }),
  newPartNumber: varchar("new_part_number", { length: 50 }),   // new materialCode
  newPartName: varchar("new_part_name", { length: 200 }),
  oldQuantity: decimal("old_quantity", { precision: 10, scale: 4 }),
  newQuantity: decimal("new_quantity", { precision: 10, scale: 4 }),
  oldUnitCost: decimal("old_unit_cost", { precision: 12, scale: 2 }),
  newUnitCost: decimal("new_unit_cost", { precision: 12, scale: 2 }),
  reason: text("reason"),                                      // Engineering justification
  affectedMachines: text("affected_machines"),                 // JSON array of machine IDs
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_eco_bom_eco").on(table.ecoId),
  index("idx_eco_bom_old_part").on(table.oldPartNumber),
  index("idx_eco_bom_new_part").on(table.newPartNumber),
  index("idx_eco_bom_type").on(table.changeType),
]);

// ─── ECO Impact Snapshots (pre-computed for audit trail) ─────────────

export const ecoImpactSnapshots = pgTable("eco_impact_snapshots", {
  id: serial("id").primaryKey(),
  ecoId: integer("eco_id").notNull(),                          // FK → engineering_change_orders.id
  calculatedAt: timestamp("calculated_at", { mode: "string" }).defaultNow().notNull(),
  calculatedBy: integer("calculated_by"),
  scrapRiskValue: decimal("scrap_risk_value", { precision: 12, scale: 2 }).notNull(),
  newProcurementCost: decimal("new_procurement_cost", { precision: 12, scale: 2 }).notNull(),
  totalFinancialImpact: decimal("total_financial_impact", { precision: 12, scale: 2 }).notNull(),
  affectedInventoryCount: integer("affected_inventory_count").notNull(),
  affectedPartNumbers: text("affected_part_numbers"),          // JSON array
  impactBreakdown: text("impact_breakdown"),                   // Full JSON details
  status: ecoImpactStatusEnum("status").notNull().default("DRAFT"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  reviewNotes: text("review_notes"),
  currency: varchar("currency", { length: 3 }).notNull().default("CNY"),
}, (table) => [
  index("idx_eco_impact_eco").on(table.ecoId),
  index("idx_eco_impact_status").on(table.status),
  index("idx_eco_impact_date").on(table.calculatedAt),
]);
