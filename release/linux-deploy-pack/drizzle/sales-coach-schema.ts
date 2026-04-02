/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   Sales Coach Engine Schema — 全球销售全域赋能与战术指导         ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. client_annual_budgets      — CAPEX 年度投资预算采集       ║
 * ║    2. project_bidding_strategies  — M阶段投标应标策略            ║
 * ║                                                                 ║
 * ║  Product lines: 清洗机(Cleaning) / 视觉检测(Vision) / 零排放(ZLD)║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users } from "./schema";

// ── Enums ──────────────────────────────────────────────

export const scBudgetDeadlineStatusEnum = pgEnum("sc_budget_deadline_status", [
  "pending",
  "partial",
  "completed",
  "overdue",
]);

export const scBiddingStrategyStatusEnum = pgEnum("sc_bidding_strategy_status", [
  "draft",
  "submitted",
  "reviewed",
  "approved",
]);

// ══════════════════════════════════════════════════════
// Table 1: client_annual_budgets — CAPEX年度投资预算
//
// Sales must record each key client's annual investment
// budgets per product line. Red alert if missing/overdue.
// ══════════════════════════════════════════════════════

export const clientAnnualBudgets = pgTable("client_annual_budgets", {
  id: serial("id").primaryKey(),

  clientId: integer("client_id").notNull(),
  year: integer("year").notNull(),

  /** 清洗机 CAPEX (Industrial Cleaning) */
  cleaningCapex: decimal("cleaning_capex", { precision: 15, scale: 2 }).default("0"),
  /** 视觉检测 CAPEX (Vision Inspection) */
  visionCapex: decimal("vision_capex", { precision: 15, scale: 2 }).default("0"),
  /** 零排放 CAPEX (Zero Liquid Discharge) */
  zldCapex: decimal("zld_capex", { precision: 15, scale: 2 }).default("0"),
  /** Auto-sum of all product lines */
  totalCapex: decimal("total_capex", { precision: 15, scale: 2 }).default("0"),

  deadlineStatus: scBudgetDeadlineStatusEnum("deadline_status").notNull().default("pending"),
  deadlineDate: timestamp("deadline_date", { mode: "string" }),

  recordedBy: integer("recorded_by").references(() => users.id),
  buCode: varchar("bu_code", { length: 50 }),
  notes: text("notes"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("client_annual_budgets_client_year_uniq").on(table.clientId, table.year),
  index("client_annual_budgets_bu_idx").on(table.buCode),
  index("client_annual_budgets_year_idx").on(table.year),
  index("client_annual_budgets_status_idx").on(table.deadlineStatus),
]);

// ══════════════════════════════════════════════════════
// Table 2: project_bidding_strategies — M阶段投标策略
//
// Every M0-M3 opportunity must have: project background,
// communication plan, and bidding strategy. Kanban-style
// tactical board for sales teams.
// ══════════════════════════════════════════════════════

export const projectBiddingStrategies = pgTable("project_bidding_strategies", {
  id: serial("id").primaryKey(),

  projectId: integer("project_id").notNull(),
  opportunityId: integer("opportunity_id"),

  /** 项目背景 */
  projectBackground: text("project_background"),
  /** 交流计划 */
  communicationPlan: text("communication_plan"),
  /** 投标应标策略 */
  biddingStrategy: text("bidding_strategy"),

  /** [{name, strengths, weaknesses, strategy}] */
  competitorAnalysis: json("competitor_analysis").$type<{
    name: string;
    strengths: string;
    weaknesses: string;
    strategy: string;
  }[]>(),

  /** 1-5 confidence level */
  confidenceLevel: integer("confidence_level").notNull().default(3),
  /** M0/M1/M2/M3 */
  stage: varchar("stage", { length: 10 }).notNull().default("M0"),

  status: scBiddingStrategyStatusEnum("status").notNull().default("draft"),

  createdBy: integer("created_by").references(() => users.id),
  buCode: varchar("bu_code", { length: 50 }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("project_bidding_strategies_project_uniq").on(table.projectId),
  index("project_bidding_strategies_stage_idx").on(table.stage),
  index("project_bidding_strategies_bu_idx").on(table.buCode),
  index("project_bidding_strategies_status_idx").on(table.status),
]);

// ── Type Exports ────────────────────────────────────

export type ClientAnnualBudget = InferSelectModel<typeof clientAnnualBudgets>;
export type InsertClientAnnualBudget = InferInsertModel<typeof clientAnnualBudgets>;

export type ProjectBiddingStrategy = InferSelectModel<typeof projectBiddingStrategies>;
export type InsertProjectBiddingStrategy = InferInsertModel<typeof projectBiddingStrategies>;
