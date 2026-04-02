/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT Strategic Campaigns — Global Rollover Engine Schema       ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Enables batch operations across the enterprise:                ║
 * ║    · Organizational restructures                                ║
 * ║    · Inventory rollovers (year-end, period-end)                 ║
 * ║    · Price updates across product lines                         ║
 * ║    · Role migrations                                            ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. global_campaigns       — Campaign definitions + status    ║
 * ║    2. campaign_payloads      — Individual mutation operations   ║
 * ║    3. inventory_freeze_logs  — Freeze audit during rollover     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { users } from "./schema";

// ══════════════════════════════════════════════════════
// Enums
// ══════════════════════════════════════════════════════

/** Type of strategic campaign */
export const campaignTypeEnum = pgEnum("campaign_type", [
  "ORG_RESTRUCTURE",
  "INVENTORY_ROLLOVER",
  "PRICE_UPDATE",
  "ROLE_MIGRATION",
  "DATA_CLEANUP",
]);

/** Campaign lifecycle status */
export const campaignStatusEnum = pgEnum("campaign_status", [
  "DRAFT",
  "SIMULATED",
  "APPROVED",
  "EXECUTING",
  "COMPLETED",
  "ROLLED_BACK",
  "FAILED",
]);

/** Individual payload operation type */
export const campaignOperationEnum = pgEnum("campaign_operation", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ARCHIVE",
]);

/** Payload execution status */
export const payloadStatusEnum = pgEnum("payload_status", [
  "PENDING",
  "APPLIED",
  "FAILED",
  "ROLLED_BACK",
  "SKIPPED",
]);

/** Inventory freeze scope type */
export const freezeTypeEnum = pgEnum("freeze_type", [
  "FULL",
  "PARTIAL",
  "CATEGORY",
]);

// ══════════════════════════════════════════════════════
// Table 1: global_campaigns — Strategic batch operations
// ══════════════════════════════════════════════════════

export const globalCampaigns = pgTable("global_campaigns", {
  id: serial("id").primaryKey(),

  /** Unique campaign code, e.g. "ROLLOVER-2026-Q1" */
  code: varchar("code", { length: 50 }).notNull().unique(),

  /** Human-readable campaign name */
  name: varchar("name", { length: 200 }).notNull(),

  /** Detailed description of the campaign purpose */
  description: text("description"),

  /** Type of batch operation */
  campaignType: campaignTypeEnum("campaign_type").notNull(),

  /** Campaign lifecycle status */
  status: campaignStatusEnum("status").default("DRAFT").notNull(),

  /** Simulation results: warnings array, affected counts, risk score */
  simulationResult: json("simulation_result").$type<{
    warnings: string[];
    affectedCounts: Record<string, number>;
    riskScore: number;
  }>(),

  /** Who approved the campaign (FK -> users.id) */
  approvedBy: integer("approved_by").references(() => users.id),

  /** When the campaign was approved */
  approvedAt: timestamp("approved_at", { mode: "string" }),

  /** Who executed the campaign (FK -> users.id) */
  executedBy: integer("executed_by").references(() => users.id),

  /** When the campaign execution started */
  executedAt: timestamp("executed_at", { mode: "string" }),

  /** When the campaign completed */
  completedAt: timestamp("completed_at", { mode: "string" }),

  /** Reason for rollback (if status is ROLLED_BACK) */
  rollbackReason: text("rollback_reason"),

  /** Total number of entities affected by this campaign */
  affectedEntityCount: integer("affected_entity_count").default(0),

  /** Arbitrary metadata for extensions */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  /** Who created the campaign (FK -> users.id) */
  createdBy: integer("created_by").references(() => users.id),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),

  /** Last update timestamp */
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("campaigns_type_idx").on(table.campaignType),
  index("campaigns_status_idx").on(table.status),
  index("campaigns_created_by_idx").on(table.createdBy),
]);

// ══════════════════════════════════════════════════════
// Table 2: campaign_payloads — Individual operations
//   within a campaign
// ══════════════════════════════════════════════════════

export const campaignPayloads = pgTable("campaign_payloads", {
  id: serial("id").primaryKey(),

  /** FK -> global_campaigns.id — which campaign this payload belongs to */
  campaignId: integer("campaign_id").references(() => globalCampaigns.id).notNull(),

  /** Target table name, e.g. "users", "products", "warehouses" */
  entityType: varchar("entity_type", { length: 100 }).notNull(),

  /** Target record ID (null for CREATE operations) */
  entityId: integer("entity_id"),

  /** Mutation operation type */
  operation: campaignOperationEnum("operation").notNull(),

  /** JSONB snapshot of the record's current state before mutation */
  payloadBefore: json("payload_before").$type<Record<string, unknown>>(),

  /** JSONB desired state after mutation */
  payloadAfter: json("payload_after").$type<Record<string, unknown>>(),

  /** Order of execution within the campaign (lower = earlier) */
  executionOrder: integer("execution_order").default(0),

  /** Payload execution status */
  status: payloadStatusEnum("status").default("PENDING").notNull(),

  /** Error message if execution failed */
  errorMessage: text("error_message"),

  /** When this payload was executed */
  executedAt: timestamp("executed_at", { mode: "string" }),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("payloads_campaign_idx").on(table.campaignId),
  index("payloads_entity_type_idx").on(table.entityType),
  index("payloads_status_idx").on(table.status),
  index("payloads_exec_order_idx").on(table.executionOrder),
]);

// ══════════════════════════════════════════════════════
// Table 3: inventory_freeze_logs — Freeze audit during
//   rollover campaigns
// ══════════════════════════════════════════════════════

export const inventoryFreezeLogs = pgTable("inventory_freeze_logs", {
  id: serial("id").primaryKey(),

  /** FK -> global_campaigns.id — which campaign triggered this freeze */
  campaignId: integer("campaign_id").references(() => globalCampaigns.id).notNull(),

  /** Warehouse ID (optional, depends on warehouse table existence) */
  warehouseId: integer("warehouse_id"),

  /** Type of freeze applied */
  freezeType: freezeTypeEnum("freeze_type").notNull(),

  /** JSONB scope definition: specific SKUs, categories, etc. */
  freezeScope: json("freeze_scope").$type<{
    skus?: string[];
    categories?: string[];
    zones?: string[];
  }>(),

  /** Who initiated the freeze (FK -> users.id) */
  frozenBy: integer("frozen_by").references(() => users.id),

  /** When the freeze was applied */
  frozenAt: timestamp("frozen_at", { mode: "string" }).defaultNow().notNull(),

  /** When the freeze was lifted (null = still frozen) */
  unfrozenAt: timestamp("unfrozen_at", { mode: "string" }),

  /** Reason for freeze */
  reason: text("reason"),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("freeze_campaign_idx").on(table.campaignId),
  index("freeze_warehouse_idx").on(table.warehouseId),
  index("freeze_frozen_by_idx").on(table.frozenBy),
]);

// ── Type Exports ──────────────────────────────────────

export type GlobalCampaign = InferSelectModel<typeof globalCampaigns>;
export type NewGlobalCampaign = InferInsertModel<typeof globalCampaigns>;
export type CampaignPayload = InferSelectModel<typeof campaignPayloads>;
export type NewCampaignPayload = InferInsertModel<typeof campaignPayloads>;
export type InventoryFreezeLog = InferSelectModel<typeof inventoryFreezeLogs>;
export type NewInventoryFreezeLog = InferInsertModel<typeof inventoryFreezeLogs>;
