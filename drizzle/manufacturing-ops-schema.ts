/**
 * Manufacturing Operations Schema — 制造运营扩展
 *
 * Six tables:
 * 1. mes_capacity_plans      — station capacity planning (daily/weekly/shift)
 * 2. mes_equipment_downtime  — equipment downtime events & root cause tracking
 * 3. mes_defect_analysis     — defect root cause analysis (Ishikawa / 5-Why)
 * 4. labor_time_entries      — individual labor time tracking per work order
 * 5. labor_cost_tracking     — project-level labor cost budget vs actual
 * 6. skill_task_requirements — process skill requirements & certifications
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  index,
  json,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// Table 1: mes_capacity_plans
// ──────────────────────────────────────────────────────────────
export const mesCapacityPlans = pgTable(
  "mes_capacity_plans",
  {
    id: serial("id").primaryKey(),
    stationId: integer("station_id").notNull(),
    planDate: varchar("plan_date", { length: 10 }).notNull(),
    planType: varchar("plan_type", { length: 20 }).default("daily"),
    shiftCode: varchar("shift_code", { length: 20 }),
    processCode: varchar("process_code", { length: 20 }),
    plannedHours: decimal("planned_hours", { precision: 8, scale: 2 }).notNull(),
    actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0"),
    plannedUnits: integer("planned_units").default(0),
    actualUnits: integer("actual_units").default(0),
    utilizationPct: decimal("utilization_pct", { precision: 5, scale: 2 }),
    bottleneckScore: decimal("bottleneck_score", { precision: 5, scale: 2 }),
    notes: text("notes"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_mcp_station_id").on(table.stationId),
    index("idx_mcp_plan_date").on(table.planDate),
    index("idx_mcp_station_date").on(table.stationId, table.planDate),
    index("idx_mcp_process_code").on(table.processCode),
  ],
);

export type MesCapacityPlan = InferSelectModel<typeof mesCapacityPlans>;
export type NewMesCapacityPlan = InferInsertModel<typeof mesCapacityPlans>;

// ──────────────────────────────────────────────────────────────
// Table 2: mes_equipment_downtime
// ──────────────────────────────────────────────────────────────
export const mesEquipmentDowntime = pgTable(
  "mes_equipment_downtime",
  {
    id: serial("id").primaryKey(),
    equipmentId: integer("equipment_id").notNull(),
    stationId: integer("station_id"),
    downtimeType: varchar("downtime_type", { length: 30 }).notNull(),
    startAt: timestamp("start_at", { mode: "string" }).notNull(),
    endAt: timestamp("end_at", { mode: "string" }),
    durationMinutes: integer("duration_minutes"),
    rootCause: text("root_cause"),
    rootCauseCategory: varchar("root_cause_category", { length: 30 }),
    impactedWorkOrders: json("impacted_work_orders"),
    reportedBy: integer("reported_by"),
    resolvedBy: integer("resolved_by"),
    resolution: text("resolution"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_med_equipment_id").on(table.equipmentId),
    index("idx_med_station_id").on(table.stationId),
    index("idx_med_downtime_type").on(table.downtimeType),
    index("idx_med_start_at").on(table.startAt),
  ],
);

export type MesEquipmentDowntime = InferSelectModel<typeof mesEquipmentDowntime>;
export type NewMesEquipmentDowntime = InferInsertModel<typeof mesEquipmentDowntime>;

// ──────────────────────────────────────────────────────────────
// Table 3: mes_defect_analysis
// ──────────────────────────────────────────────────────────────
export const mesDefectAnalysis = pgTable(
  "mes_defect_analysis",
  {
    id: serial("id").primaryKey(),
    qualityCheckId: integer("quality_check_id").notNull(),
    workOrderId: integer("work_order_id"),
    stationId: integer("station_id").notNull(),
    defectCode: varchar("defect_code", { length: 50 }),
    defectDescription: text("defect_description"),
    rootCauseCategory: varchar("root_cause_category", { length: 30 }).notNull(),
    rootCauseDetail: text("root_cause_detail").notNull(),
    ishikawaBranch: varchar("ishikawa_branch", { length: 30 }),
    fiveWhyChain: json("five_why_chain"),
    correctiveAction: text("corrective_action"),
    correctiveActionDueDate: timestamp("corrective_action_due_date", { mode: "string" }),
    preventiveAction: text("preventive_action"),
    preventiveActionDueDate: timestamp("preventive_action_due_date", { mode: "string" }),
    status: varchar("status", { length: 20 }).default("open"),
    severity: varchar("severity", { length: 10 }),
    assignedTo: integer("assigned_to"),
    assignedToName: varchar("assigned_to_name", { length: 100 }),
    closedBy: integer("closed_by"),
    closedAt: timestamp("closed_at", { mode: "string" }),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_mda_quality_check_id").on(table.qualityCheckId),
    index("idx_mda_station_id").on(table.stationId),
    index("idx_mda_root_cause_category").on(table.rootCauseCategory),
    index("idx_mda_status").on(table.status),
    index("idx_mda_assigned_to").on(table.assignedTo),
  ],
);

export type MesDefectAnalysis = InferSelectModel<typeof mesDefectAnalysis>;
export type NewMesDefectAnalysis = InferInsertModel<typeof mesDefectAnalysis>;

// ──────────────────────────────────────────────────────────────
// Table 4: labor_time_entries
// ──────────────────────────────────────────────────────────────
export const laborTimeEntries = pgTable(
  "labor_time_entries",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull(),
    employeeName: varchar("employee_name", { length: 100 }),
    workOrderId: integer("work_order_id"),
    stationId: integer("station_id"),
    processCode: varchar("process_code", { length: 20 }),
    startTime: timestamp("start_time", { mode: "string" }).notNull(),
    endTime: timestamp("end_time", { mode: "string" }),
    durationMinutes: decimal("duration_minutes", { precision: 8, scale: 2 }),
    source: varchar("source", { length: 20 }).default("manual"),
    uwbSessionId: integer("uwb_session_id"),
    validated: boolean("validated").default(false),
    validatedBy: integer("validated_by"),
    validatedAt: timestamp("validated_at", { mode: "string" }),
    laborRate: decimal("labor_rate", { precision: 10, scale: 2 }),
    laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
    projectId: integer("project_id"),
    buCode: varchar("bu_code", { length: 20 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_lte_employee_id").on(table.employeeId),
    index("idx_lte_work_order_id").on(table.workOrderId),
    index("idx_lte_station_id").on(table.stationId),
    index("idx_lte_process_code").on(table.processCode),
    index("idx_lte_employee_start").on(table.employeeId, table.startTime),
    index("idx_lte_project_id").on(table.projectId),
    index("idx_lte_source").on(table.source),
  ],
);

export type LaborTimeEntry = InferSelectModel<typeof laborTimeEntries>;
export type NewLaborTimeEntry = InferInsertModel<typeof laborTimeEntries>;

// ──────────────────────────────────────────────────────────────
// Table 5: labor_cost_tracking
// ──────────────────────────────────────────────────────────────
export const laborCostTracking = pgTable(
  "labor_cost_tracking",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    projectCode: varchar("project_code", { length: 50 }),
    processCode: varchar("process_code", { length: 20 }).notNull(),
    budgetHours: decimal("budget_hours", { precision: 10, scale: 2 }).notNull(),
    actualHours: decimal("actual_hours", { precision: 10, scale: 2 }).default("0"),
    budgetCost: decimal("budget_cost", { precision: 14, scale: 2 }).notNull(),
    actualCost: decimal("actual_cost", { precision: 14, scale: 2 }).default("0"),
    variancePct: decimal("variance_pct", { precision: 5, scale: 2 }),
    completionPct: decimal("completion_pct", { precision: 5, scale: 2 }).default("0"),
    forecastFinalCost: decimal("forecast_final_cost", { precision: 14, scale: 2 }),
    status: varchar("status", { length: 20 }).default("on_track"),
    thresholdYellow: decimal("threshold_yellow", { precision: 5, scale: 2 }).default("10"),
    thresholdRed: decimal("threshold_red", { precision: 5, scale: 2 }).default("25"),
    lastUpdatedAt: timestamp("last_updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_lct_project_id").on(table.projectId),
    index("idx_lct_process_code").on(table.processCode),
    index("idx_lct_status").on(table.status),
    index("idx_lct_project_process").on(table.projectId, table.processCode),
  ],
);

export type LaborCostTracking = InferSelectModel<typeof laborCostTracking>;
export type NewLaborCostTracking = InferInsertModel<typeof laborCostTracking>;

// ──────────────────────────────────────────────────────────────
// Table 6: skill_task_requirements
// ──────────────────────────────────────────────────────────────
export const skillTaskRequirements = pgTable(
  "skill_task_requirements",
  {
    id: serial("id").primaryKey(),
    processCode: varchar("process_code", { length: 20 }).notNull(),
    stationId: integer("station_id"),
    requiredSkillDomain: varchar("required_skill_domain", { length: 100 }).notNull(),
    requiredLevel: integer("required_level").notNull(),
    preferredCertifications: json("preferred_certifications"),
    minExperienceMonths: integer("min_experience_months").default(0),
    description: text("description"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_str_process_code").on(table.processCode),
    index("idx_str_skill_domain").on(table.requiredSkillDomain),
  ],
);

export type SkillTaskRequirement = InferSelectModel<typeof skillTaskRequirements>;
export type NewSkillTaskRequirement = InferInsertModel<typeof skillTaskRequirements>;
