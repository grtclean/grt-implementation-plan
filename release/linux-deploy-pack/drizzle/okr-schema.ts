/**
 * OKR (Objectives & Key Results) Schema
 *
 * Supports: Company → BU → Department → Individual OKR hierarchy
 * Engine 3: Strategy & OKR Hub
 */
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  real,
  serial,
} from "drizzle-orm/pg-core";

// ── OKR Objectives ──────────────────────────────────
export const okrObjectives = pgTable("okr_objectives", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  /** Hierarchy level: company | bu | department | individual */
  level: varchar("level", { length: 20 }).notNull().default("individual"),
  /** Owner user ID or BU/dept identifier */
  ownerId: varchar("owner_id", { length: 100 }).notNull(),
  ownerName: varchar("owner_name", { length: 200 }),
  /** Parent objective ID for cascading alignment */
  parentId: integer("parent_id"),
  /** Time period: e.g. "2026-Q1" */
  period: varchar("period", { length: 20 }).notNull(),
  /** Overall progress 0-100 (auto-calculated from KRs) */
  progress: real("progress").notNull().default(0),
  /** Status: draft | active | completed | cancelled */
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  /** Priority: P0 | P1 | P2 */
  priority: varchar("priority", { length: 10 }).default("P1"),
  /** BU assignment */
  buCode: varchar("bu_code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Key Results ─────────────────────────────────────
export const okrKeyResults = pgTable("okr_key_results", {
  id: serial("id").primaryKey(),
  objectiveId: integer("objective_id").notNull().references(() => okrObjectives.id),
  title: varchar("title", { length: 500 }).notNull(),
  /** Metric type: number | percentage | boolean | currency */
  metricType: varchar("metric_type", { length: 20 }).notNull().default("percentage"),
  /** Starting value */
  startValue: real("start_value").notNull().default(0),
  /** Target value */
  targetValue: real("target_value").notNull().default(100),
  /** Current actual value */
  currentValue: real("current_value").notNull().default(0),
  /** Unit label: %, $, count, etc. */
  unit: varchar("unit", { length: 30 }).default("%"),
  /** Confidence level: 0.0 to 1.0 */
  confidence: real("confidence").default(0.5),
  /** Owner (may differ from objective owner) */
  ownerId: varchar("owner_id", { length: 100 }),
  ownerName: varchar("owner_name", { length: 200 }),
  /** Status: on_track | at_risk | behind | completed */
  status: varchar("status", { length: 20 }).notNull().default("on_track"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── OKR Check-ins ───────────────────────────────────
export const okrCheckIns = pgTable("okr_check_ins", {
  id: serial("id").primaryKey(),
  keyResultId: integer("key_result_id").notNull().references(() => okrKeyResults.id),
  /** Value at time of check-in */
  value: real("value").notNull(),
  /** Confidence at time of check-in */
  confidence: real("confidence").default(0.5),
  /** Free-text note */
  note: text("note"),
  /** Who recorded this */
  authorId: varchar("author_id", { length: 100 }),
  authorName: varchar("author_name", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
