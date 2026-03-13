/**
 * AEI Extended Schema — Cross-System Performance Aggregation
 *
 * AEI = AI-Enhanced Intelligence Performance
 * Extends the meeting-based 4D scoring with engineering, operational, and collaboration metrics.
 *
 * Tables:
 * - aei_contribution_logs: Multi-source contribution event tracking
 * - aei_monthly_scores: Composite monthly AEI scores per employee
 */

import {
  pgTable, pgEnum, serial, integer, varchar, text,
  timestamp, json, real, index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const aeiContributionTypeEnum = pgEnum("aei_contribution_type", [
  "design_export", "plc_version", "bom_change", "defect_resolved",
  "maintenance_done", "doc_shared", "meeting_action", "cleaning_pass",
  "code_review", "training_completed", "safety_incident", "cleanliness_match",
]);

// ── Contribution Logs ───────────────────────────────────────────────────

export const aeiContributionLogs = pgTable("aei_contribution_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userName: varchar("user_name", { length: 200 }).notNull(),
  contributionType: aeiContributionTypeEnum("contribution_type").notNull(),
  sourceTable: varchar("source_table", { length: 100 }).notNull(),
  sourceId: integer("source_id"),
  points: integer("points").notNull().default(1),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  buCode: varchar("bu_code", { length: 20 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("aei_contrib_user_idx").on(table.userId),
  index("aei_contrib_month_idx").on(table.month),
  index("aei_contrib_type_idx").on(table.contributionType),
  index("aei_contrib_user_month_idx").on(table.userId, table.month),
]);

export type AeiContributionLog = InferSelectModel<typeof aeiContributionLogs>;
export type InsertAeiContributionLog = InferInsertModel<typeof aeiContributionLogs>;

// ── Monthly Scores ──────────────────────────────────────────────────────

export const aeiMonthlyScores = pgTable("aei_monthly_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userName: varchar("user_name", { length: 200 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  meetingScore: real("meeting_score").default(0),           // 30% weight — from AI Performance Engine
  engineeringScore: real("engineering_score").default(0),   // 25% weight — design exports + PLC versions
  operationalScore: real("operational_score").default(0),   // 25% weight — defect resolution + cleaning pass rate
  collaborationScore: real("collaboration_score").default(0), // 20% weight — SharePoint + doc shares
  compositeAeiScore: real("composite_aei_score").default(0), // weighted sum (0-100)
  rank: integer("rank"),
  totalEmployees: integer("total_employees"),
  trendSlope: real("trend_slope"), // from linear regression over 6 months
  riskFlag: varchar("risk_flag", { length: 30 }), // null | 'declining' | 'at_risk' | 'burnout'
  details: json("details").$type<{
    designExports: number;
    plcVersions: number;
    defectsResolved: number;
    cleaningPassRate: number;
    docsShared: number;
    trainingsCompleted: number;
    safetyIncidents: number;
  }>().default({
    designExports: 0, plcVersions: 0, defectsResolved: 0,
    cleaningPassRate: 0, docsShared: 0, trainingsCompleted: 0, safetyIncidents: 0,
  }),
  buCode: varchar("bu_code", { length: 20 }),
  calculatedAt: timestamp("calculated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("aei_scores_user_idx").on(table.userId),
  index("aei_scores_month_idx").on(table.month),
  index("aei_scores_user_month_idx").on(table.userId, table.month),
  index("aei_scores_composite_idx").on(table.compositeAeiScore),
  index("aei_scores_rank_idx").on(table.rank),
]);

export type AeiMonthlyScore = InferSelectModel<typeof aeiMonthlyScores>;
export type InsertAeiMonthlyScore = InferInsertModel<typeof aeiMonthlyScores>;
