/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT Zero-Trust Security Gateway Schema                        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. sys_global_controls  — System-wide toggle/flag controls   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  json,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { users } from "./schema";

// ══════════════════════════════════════════════════════
// Table 1: sys_global_controls — System-wide toggle controls
//
// Key-value store for global system flags such as
// PIPELINE_FROZEN, MAINTENANCE_MODE, etc.
// Each control records who last changed it and why.
// ══════════════════════════════════════════════════════

export const sysGlobalControls = pgTable("sys_global_controls", {
  id: serial("id").primaryKey(),

  /** Unique control key, e.g. "PIPELINE_FROZEN", "MAINTENANCE_MODE" */
  controlKey: varchar("control_key", { length: 100 }).notNull().unique(),

  /** Control value as text, e.g. "true", "false", or JSON string */
  controlValue: text("control_value"),

  /** FK → users.id — who last updated this control */
  updatedBy: integer("updated_by").references(() => users.id),

  /** When this control was last updated */
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),

  /** JSONB metadata: reason, expiry, notes, etc. */
  metadata: json("metadata").$type<Record<string, unknown>>(),
});

// ══════════════════════════════════════════════════════
// Type Exports — Select (read) and Insert (write) models
// ══════════════════════════════════════════════════════

export type SysGlobalControl = InferSelectModel<typeof sysGlobalControls>;
export type NewSysGlobalControl = InferInsertModel<typeof sysGlobalControls>;
