/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   Battle Arena & War Room Schema — 斗兽场排名 & 月度战情室      ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. monthly_battle_reports  — AI预填月度述职战报               ║
 * ║    2. global_arena_rankings   — 全局战力排行榜                  ║
 * ║                                                                 ║
 * ║  Entity types: SALES / ENGINEER / DIVISION / MANAGER            ║
 * ║  Bonus tiers:  S=吃肉 / A=喝汤 / B=温饱 / C=警告 / D=淘汰      ║
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

export const arenaEntityTypeEnum = pgEnum("arena_entity_type", [
  "SALES",
  "ENGINEER",
  "DIVISION",
  "MANAGER",
]);

export const arenaBonusTierEnum = pgEnum("arena_bonus_tier", [
  "S",  // 吃肉 — top performers
  "A",  // 喝汤 — above average
  "B",  // 温饱 — average
  "C",  // 警告 — below average
  "D",  // 淘汰 — bottom 10%
]);

export const battleReportStatusEnum = pgEnum("battle_report_status", [
  "ai_draft",       // AI auto-generated, awaiting user edit
  "user_submitted",  // User filled improvement plan
  "reviewed",        // Manager reviewed
  "locked",          // Finalized after monthly meeting
]);

// ══════════════════════════════════════════════════════
// Table 1: monthly_battle_reports — AI预填月度述职战报
//
// Generated on the 28th of each month by async task.
// AI reads: meeting records, M0-M3 conversion, CAPEX gaps.
// User fills in: improvement_action_plan.
// ══════════════════════════════════════════════════════

export const monthlyBattleReports = pgTable("monthly_battle_reports", {
  id: serial("id").primaryKey(),

  userId: integer("user_id").notNull().references(() => users.id),
  /** Period in YYYY-MM format */
  period: varchar("period", { length: 7 }).notNull(),

  /** AI-generated summary from meeting records, pipeline, CAPEX */
  aiGeneratedSummary: text("ai_generated_summary"),

  /** Structured KPI actual vs target */
  actualVsTargetKpi: json("actual_vs_target_kpi").$type<{
    salesTarget: number;
    salesActual: number;
    salesGapPercent: number;
    newClientTarget: number;
    newClientActual: number;
    meetingCount: number;
    actionItemsCompleted: number;
    actionItemsTotal: number;
    m0Count: number;
    m1Count: number;
    m2Count: number;
    m3Count: number;
    capexCoveragePercent: number;
  }>(),

  /** User-submitted improvement action plan */
  improvementActionPlan: text("improvement_action_plan"),

  /** AI-generated tactical suggestions for next month */
  aiTacticalSuggestions: json("ai_tactical_suggestions").$type<string[]>(),

  /** Key meeting highlights extracted by AI */
  meetingHighlights: json("meeting_highlights").$type<{
    meetingTitle: string;
    date: string;
    keyDecisions: string[];
  }[]>(),

  status: battleReportStatusEnum("status").notNull().default("ai_draft"),

  /** Task ID for async generation tracking */
  generationTaskId: integer("generation_task_id"),

  buCode: varchar("bu_code", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("monthly_battle_reports_user_period_uniq").on(table.userId, table.period),
  index("monthly_battle_reports_period_idx").on(table.period),
  index("monthly_battle_reports_status_idx").on(table.status),
  index("monthly_battle_reports_bu_idx").on(table.buCode),
]);

// ══════════════════════════════════════════════════════
// Table 2: global_arena_rankings — 全局战力排行榜
//
// Cross-department rankings computed monthly.
// Entity types: individual sales, engineers, managers,
// or entire divisions.
// ══════════════════════════════════════════════════════

export const globalArenaRankings = pgTable("global_arena_rankings", {
  id: serial("id").primaryKey(),

  period: varchar("period", { length: 7 }).notNull(),
  entityType: arenaEntityTypeEnum("entity_type").notNull(),

  /** userId for individuals, buId/deptId for DIVISION */
  entityId: integer("entity_id").notNull(),
  entityName: varchar("entity_name", { length: 200 }),

  /** Composite score 0-100 */
  comprehensiveScore: decimal("comprehensive_score", { precision: 6, scale: 2 }).notNull(),

  /** Rank position within entity_type for this period (1 = best) */
  rankPosition: integer("rank_position").notNull(),
  totalInCategory: integer("total_in_category").notNull().default(0),

  /** S/A/B/C/D tier */
  bonusTier: arenaBonusTierEnum("bonus_tier").notNull(),

  /** Score breakdown for transparency */
  scoreBreakdown: json("score_breakdown").$type<{
    kpiScore: number;
    meetingEngagement: number;
    pipelineHealth: number;
    taskCompletion: number;
    teamContribution: number;
  }>(),

  /** Relative bonus multiplier (1.0 = baseline) */
  bonusMultiplier: decimal("bonus_multiplier", { precision: 4, scale: 2 }).default("1.00"),

  /** Previous period rank (for animation direction) */
  previousRank: integer("previous_rank"),

  /** Rank change: positive = improved, negative = dropped */
  rankChange: integer("rank_change").default(0),

  buCode: varchar("bu_code", { length: 50 }),
  department: varchar("department", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("global_arena_rankings_period_type_entity_uniq").on(table.period, table.entityType, table.entityId),
  index("global_arena_rankings_period_idx").on(table.period),
  index("global_arena_rankings_type_idx").on(table.entityType),
  index("global_arena_rankings_rank_idx").on(table.rankPosition),
  index("global_arena_rankings_tier_idx").on(table.bonusTier),
]);

// ── Type Exports ────────────────────────────────────

export type MonthlyBattleReport = InferSelectModel<typeof monthlyBattleReports>;
export type InsertMonthlyBattleReport = InferInsertModel<typeof monthlyBattleReports>;

export type GlobalArenaRanking = InferSelectModel<typeof globalArenaRankings>;
export type InsertGlobalArenaRanking = InferInsertModel<typeof globalArenaRankings>;
