import {
  pgTable, serial, varchar, text, integer, boolean, timestamp, decimal, json,
  pgEnum, index, uniqueIndex,
} from "drizzle-orm/pg-core";

/* ── Enums ────────────────────────────────────────────────── */

export const procedureTypeEnum = pgEnum("procedure_type", [
  "core_procedure",       // 核心流程
  "regulation",           // 规章制度
  "compliance",           // 合规要求
  "exception_handling",   // 异常处理
]);

export const procedureStatusEnum = pgEnum("procedure_status", [
  "draft",          // 草稿
  "under_review",   // 评审中
  "approved",       // 已批准
  "effective",      // 生效中
  "superseded",     // 已替代
  "archived",       // 已归档
]);

export const procedurePriorityEnum = pgEnum("procedure_priority", [
  "critical",    // 关键
  "high",        // 高
  "standard",    // 标准
  "reference",   // 参考
]);

export const ackMethodEnum = pgEnum("ack_method", [
  "digital_signature",  // 电子签名
  "checkbox",           // 勾选确认
  "quiz_pass",          // 测试通过
]);

export const exceptionSeverityEnum = pgEnum("exception_severity", [
  "minor",     // 轻微
  "major",     // 严重
  "critical",  // 关键
]);

export const exceptionStatusEnum = pgEnum("exception_status", [
  "open",           // 待处理
  "investigating",  // 调查中
  "resolved",       // 已解决
  "closed",         // 已关闭
]);

export const reviewFrequencyEnum = pgEnum("review_frequency", [
  "monthly",       // 每月
  "quarterly",     // 每季度
  "semi_annual",   // 每半年
  "annual",        // 每年
  "on_change",     // 变更时
]);

/* ── Table 1: Procedure Categories (制度分类) ─────────────── */

export const deptProcedureCategories = pgTable("dept_procedure_categories", {
  id: serial("id").primaryKey(),
  deptCode: varchar("dept_code", { length: 50 }).notNull(),
  deptName: varchar("dept_name", { length: 100 }).notNull(),
  deptNameEn: varchar("dept_name_en", { length: 100 }),
  procedureType: procedureTypeEnum("procedure_type").notNull(),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_proc_cat_dept").on(t.deptCode),
  index("idx_proc_cat_type").on(t.procedureType),
]);

/* ── Table 2: Procedures (规章制度) ───────────────────────── */

export const deptProcedures = pgTable("dept_procedures", {
  id: serial("id").primaryKey(),
  procedureCode: varchar("procedure_code", { length: 80 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  titleEn: varchar("title_en", { length: 500 }),
  categoryId: integer("category_id"),
  deptCode: varchar("dept_code", { length: 50 }).notNull(),
  procedureType: procedureTypeEnum("procedure_type").notNull(),
  priority: procedurePriorityEnum("priority").default("standard").notNull(),
  status: procedureStatusEnum("status").default("draft").notNull(),

  // Version
  currentVersion: varchar("current_version", { length: 20 }).default("V1.0"),
  versionMajor: integer("version_major").default(1),
  versionMinor: integer("version_minor").default(0),

  // Content
  content: text("content"),
  summary: text("summary"),
  scope: text("scope"),

  // Applicability
  applicableRoles: json("applicable_roles").$type<string[]>(),
  applicableBUs: json("applicable_bus").$type<string[]>(),

  // Regulatory
  legalBasis: text("legal_basis"),
  industryStandard: varchar("industry_standard", { length: 200 }),

  // Lifecycle
  effectiveDate: timestamp("effective_date"),
  expiryDate: timestamp("expiry_date"),
  reviewFrequency: reviewFrequencyEnum("review_frequency").default("annual"),
  nextReviewDate: timestamp("next_review_date"),

  // Ownership
  ownerUserId: integer("owner_user_id"),
  ownerName: varchar("owner_name", { length: 100 }),
  ownerRole: varchar("owner_role", { length: 50 }),
  approverUserId: integer("approver_user_id"),
  approverName: varchar("approver_name", { length: 100 }),

  // Relations
  relatedProcedureIds: json("related_procedure_ids").$type<number[]>(),
  attachments: json("attachments").$type<ProcedureAttachment[]>(),
  kpiCodes: json("kpi_codes").$type<string[]>(),

  // Penalty rules for violations
  penaltyRules: json("penalty_rules").$type<PenaltyRule[]>(),

  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_proc_dept").on(t.deptCode),
  index("idx_proc_type").on(t.procedureType),
  index("idx_proc_status").on(t.status),
  index("idx_proc_effective").on(t.effectiveDate),
  index("idx_proc_owner").on(t.ownerRole),
]);

/* ── Table 3: Procedure Versions (版本历史) ───────────────── */

export const deptProcedureVersions = pgTable("dept_procedure_versions", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedure_id").notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  versionMajor: integer("version_major"),
  versionMinor: integer("version_minor"),
  changeType: varchar("change_type", { length: 30 }), // major | minor | editorial
  changeSummary: text("change_summary").notNull(),
  content: text("content"),
  approvedBy: integer("approved_by"),
  approvedByName: varchar("approved_by_name", { length: 100 }),
  approvedAt: timestamp("approved_at"),
  publishedAt: timestamp("published_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_proc_ver_proc").on(t.procedureId),
]);

/* ── Table 4: Acknowledgments (已读确认) ──────────────────── */

export const deptProcedureAcknowledgments = pgTable("dept_procedure_acknowledgments", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedure_id").notNull(),
  versionAcknowledged: varchar("version_acknowledged", { length: 20 }).notNull(),
  userId: integer("user_id").notNull(),
  employeeId: varchar("employee_id", { length: 50 }),
  employeeName: varchar("employee_name", { length: 100 }),
  department: varchar("department", { length: 100 }),
  acknowledgedAt: timestamp("acknowledged_at").notNull(),
  acknowledgmentMethod: ackMethodEnum("acknowledgment_method").default("checkbox"),
  quizScore: integer("quiz_score"),
  ipAddress: varchar("ip_address", { length: 50 }),
  isLatestVersion: boolean("is_latest_version").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("idx_proc_ack_unique").on(t.procedureId, t.userId, t.versionAcknowledged),
  index("idx_proc_ack_user").on(t.userId),
  index("idx_proc_ack_proc").on(t.procedureId),
]);

/* ── Table 5: Exception Records (异常记录) ────────────────── */

export const deptProcedureExceptions = pgTable("dept_procedure_exceptions", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedure_id").notNull(),
  exceptionCode: varchar("exception_code", { length: 50 }),
  reportedBy: integer("reported_by"),
  reportedByName: varchar("reported_by_name", { length: 100 }),
  reportedAt: timestamp("reported_at").defaultNow(),
  department: varchar("department", { length: 100 }),
  description: text("description").notNull(),
  severity: exceptionSeverityEnum("severity").default("minor").notNull(),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action"),
  preventiveAction: text("preventive_action"),
  status: exceptionStatusEnum("status").default("open").notNull(),
  resolvedBy: integer("resolved_by"),
  resolvedByName: varchar("resolved_by_name", { length: 100 }),
  resolvedAt: timestamp("resolved_at"),
  kpiImpact: json("kpi_impact").$type<KpiImpact[]>(),
  linkedIncidentIds: json("linked_incident_ids").$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_proc_exc_proc").on(t.procedureId),
  index("idx_proc_exc_status").on(t.status),
  index("idx_proc_exc_severity").on(t.severity),
]);

/* ── Table 6: KPI Links (KPI关联) ─────────────────────────── */

export const deptProcedureKpiLinks = pgTable("dept_procedure_kpi_links", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedure_id").notNull(),
  kpiCode: varchar("kpi_code", { length: 80 }).notNull(),
  kpiName: varchar("kpi_name", { length: 200 }).notNull(),
  kpiNameEn: varchar("kpi_name_en", { length: 200 }),
  targetValue: varchar("target_value", { length: 50 }),
  measurementMethod: text("measurement_method"),
  weight: decimal("weight", { precision: 5, scale: 2 }).default("1.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_proc_kpi_proc").on(t.procedureId),
  index("idx_proc_kpi_code").on(t.kpiCode),
]);

/* ── TypeScript Types ─────────────────────────────────────── */

export interface ProcedureAttachment {
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
}

export interface PenaltyRule {
  violationType: string;   // e.g., "未按时确认", "违反流程", "信息泄露"
  severity: "minor" | "major" | "critical";
  consequence: string;     // e.g., "扣减信用积分5分", "书面警告", "降级处理"
  escalation: string;      // e.g., "报部门经理", "报副总", "报董事长"
}

export interface KpiImpact {
  kpiCode: string;
  impactType: "positive" | "negative";
  impactValue: number;
}
