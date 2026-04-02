/**
 * 智慧排程工作台 — Database Schema
 *
 * Tables:
 *   scheduling_bom_work_hours       — BOM装配工时分解 (T1-T15细化)
 *   scheduling_historical_benchmarks — 历史工时基准统计
 *   scheduling_milestone_checkpoints — 里程碑目标与历史基准对标
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  date,
  json,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ─────────────────────────────────────────────────────────────
//  scheduling_bom_work_hours — BOM装配工时分解
//  每个T工序的细化BOM装配内容与理论工时
// ─────────────────────────────────────────────────────────────
export const schedulingBomWorkHours = pgTable(
  "scheduling_bom_work_hours",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    processCode: varchar("process_code", { length: 20 }).notNull(), // T1-T15
    bomStepId: integer("bom_step_id"), // FK → process_bom_steps (raw SQL table)
    assemblyDescription: text("assembly_description"), // 装配具体内容描述
    bomItemIds: json("bom_item_ids").$type<number[]>(), // 关联的bom_items IDs
    baseTheoryMinutes: integer("base_theory_minutes"), // SOP计算的理论工时(分钟)
    difficultyFactor: decimal("difficulty_factor", { precision: 3, scale: 1 }).default("1.0"), // 0.5-3.0
    adjustedMinutes: integer("adjusted_minutes"), // 手动调整后工时
    adjustReason: text("adjust_reason"),
    adjustedBy: integer("adjusted_by").references(() => users.id),
    adjustedAt: timestamp("adjusted_at", { mode: "string" }),
    predecessorStepIds: json("predecessor_step_ids").$type<number[]>(), // 前置工步IDs (R5)
    toolsRequired: json("tools_required").$type<string[]>(),
    equipmentRequired: varchar("equipment_required", { length: 200 }),
    skillLevelRequired: varchar("skill_level_required", { length: 10 }), // L1-L5
    workerCount: integer("worker_count").default(1),
    materialReady: boolean("material_ready").default(false), // R5
    materialEarliestAvailable: date("material_earliest_available"), // 从PO系统计算的最早可用日期 (R5)
    sortOrder: integer("sort_order").default(0),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending/confirmed/scheduled/in_progress/completed
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("sbwh_project_idx").on(table.projectId),
    index("sbwh_process_idx").on(table.processCode),
    index("sbwh_status_idx").on(table.status),
    index("sbwh_bom_step_idx").on(table.bomStepId),
    index("sbwh_project_process_idx").on(table.projectId, table.processCode),
  ],
);

export type SchedulingBomWorkHour = typeof schedulingBomWorkHours.$inferSelect;
export type InsertSchedulingBomWorkHour = typeof schedulingBomWorkHours.$inferInsert;

// ─────────────────────────────────────────────────────────────
//  scheduling_historical_benchmarks — 历史工时基准统计
// ─────────────────────────────────────────────────────────────
export const schedulingHistoricalBenchmarks = pgTable(
  "scheduling_historical_benchmarks",
  {
    id: serial("id").primaryKey(),
    processCode: varchar("process_code", { length: 20 }).notNull(), // T1-T15
    productCategory: varchar("product_category", { length: 100 }).notNull(), // 超声波清洗线/精密清洗/医疗/航空/半导体
    avgHours: decimal("avg_hours", { precision: 10, scale: 2 }),
    minHours: decimal("min_hours", { precision: 10, scale: 2 }),
    maxHours: decimal("max_hours", { precision: 10, scale: 2 }),
    p50Hours: decimal("p50_hours", { precision: 10, scale: 2 }),
    p80Hours: decimal("p80_hours", { precision: 10, scale: 2 }),
    sampleCount: integer("sample_count").default(0), // < 5 低置信度
    sourceProjects: json("source_projects").$type<Array<{
      projectCode: string;
      projectName: string;
      actualHours: number;
      completedDate: string;
    }>>(),
    lastComputedAt: timestamp("last_computed_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("shb_process_idx").on(table.processCode),
    index("shb_category_idx").on(table.productCategory),
    index("shb_process_category_idx").on(table.processCode, table.productCategory),
  ],
);

export type SchedulingHistoricalBenchmark = typeof schedulingHistoricalBenchmarks.$inferSelect;
export type InsertSchedulingHistoricalBenchmark = typeof schedulingHistoricalBenchmarks.$inferInsert;

// ─────────────────────────────────────────────────────────────
//  scheduling_milestone_checkpoints — 里程碑目标与历史基准对标
// ─────────────────────────────────────────────────────────────
export const schedulingMilestoneCheckpoints = pgTable(
  "scheduling_milestone_checkpoints",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    milestoneCode: varchar("milestone_code", { length: 10 }).notNull(), // M0-M12
    milestoneName: varchar("milestone_name", { length: 100 }),
    targetDate: date("target_date"),
    baselineDate: date("baseline_date"), // 历史均值推算
    actualDate: date("actual_date"),
    baselineSource: text("baseline_source"), // "基于GRT347/GRT369/GRT388历史均值，T4机械装配平均8.5天"
    historicalAvgDays: decimal("historical_avg_days", { precision: 10, scale: 2 }),
    historicalMinDays: decimal("historical_min_days", { precision: 10, scale: 2 }),
    historicalMaxDays: decimal("historical_max_days", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending/on_track/at_risk/delayed/completed
    slackDays: integer("slack_days"),
    criticalPath: boolean("critical_path").default(false),
    relatedProcessCodes: json("related_process_codes").$type<string[]>(), // from M_TO_T_MAPPING
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("smc_project_idx").on(table.projectId),
    index("smc_milestone_idx").on(table.milestoneCode),
    index("smc_status_idx").on(table.status),
    index("smc_project_milestone_idx").on(table.projectId, table.milestoneCode),
  ],
);

export type SchedulingMilestoneCheckpoint = typeof schedulingMilestoneCheckpoints.$inferSelect;
export type InsertSchedulingMilestoneCheckpoint = typeof schedulingMilestoneCheckpoints.$inferInsert;
