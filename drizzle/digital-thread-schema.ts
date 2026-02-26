/**
 * GRT Digital Thread Schema — Vault Files & Engineering Change Orders
 */
import {
  pgTable,
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
import { users } from "./schema";

// ══════════════════════════════════════════════════════
// Table 1: grt_vault_files — Cloud Vault File Storage
// ══════════════════════════════════════════════════════

export const grtVaultFiles = pgTable("grt_vault_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  filePath: text("file_path"),
  fileType: varchar("file_type", { length: 100 }),
  fileSizeBytes: integer("file_size_bytes"),
  mimeType: varchar("mime_type", { length: 100 }),
  version: integer("version").default(1),
  isLatest: boolean("is_latest").default(true),
  parentFileId: integer("parent_file_id"),
  checkoutBy: integer("checkout_by").references(() => users.id),
  checkoutAt: timestamp("checkout_at", { mode: "string" }),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("vault_project_idx").on(table.projectId),
  index("vault_file_type_idx").on(table.fileType),
]);

// ══════════════════════════════════════════════════════
// Table 2: engineering_change_orders — ECO Workflows
// ══════════════════════════════════════════════════════

export const engineeringChangeOrders = pgTable("engineering_change_orders", {
  id: serial("id").primaryKey(),
  ecoNumber: varchar("eco_number", { length: 100 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  projectId: integer("project_id"),
  status: varchar("status", { length: 50 }).default("DRAFT"),
  priority: varchar("priority", { length: 50 }).default("MEDIUM"),
  impactAnalysis: json("impact_analysis").$type<Record<string, unknown>>(),
  affectedFiles: json("affected_files").$type<number[]>(),
  requestedBy: integer("requested_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { mode: "string" }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("eco_project_idx").on(table.projectId),
  index("eco_status_idx").on(table.status),
]);

export type GrtVaultFile = InferSelectModel<typeof grtVaultFiles>;
export type NewGrtVaultFile = InferInsertModel<typeof grtVaultFiles>;
export type EngineeringChangeOrder = InferSelectModel<typeof engineeringChangeOrders>;
export type NewEngineeringChangeOrder = InferInsertModel<typeof engineeringChangeOrders>;
