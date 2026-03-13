/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Electrical Standards Governance Schema                     ║
 * ║  电气规范治理平台                                            ║
 * ║                                                            ║
 * ║  CTO mandate: Systematize CE/UL/OEM customer standards     ║
 * ║  into the project lifecycle to prevent electrical spec      ║
 * ║  mix-ups and customer complaints.                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  json,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────

export const stdFrameworkEnum = pgEnum("std_framework", [
  "CE",           // EU Machinery Directive + LVD + EMC
  "UL",           // UL508A / UL61010 / UL Listed
  "CSA",          // Canadian equivalent
  "GB",           // China GB/T standards
  "IEC",          // International base standards
  "NFPA",         // NFPA 79 (US industrial machinery)
  "SEMI",         // Semiconductor equipment (SEMI S2/S8/S23)
  "OEM_CUSTOM",   // Customer-specific overlay
]);

export const stdCategoryEnum = pgEnum("std_category", [
  "power_supply",          // 供电规范 (voltage, phase, frequency)
  "motor_drive",           // 电机与驱动
  "plc_control",           // PLC与控制系统
  "hmi_interface",         // 人机界面
  "safety_circuit",        // 安全回路 (e-stop, safety relay, light curtain)
  "wiring_cable",          // 布线与电缆
  "panel_enclosure",       // 电柜与防护等级
  "sensor_instrumentation",// 传感器与仪表
  "communication",         // 通讯协议 (Profinet/EtherNet/IP/Modbus)
  "grounding_emc",         // 接地与EMC
  "marking_labeling",      // 标识与铭牌
  "documentation",         // 图纸与文档交付物
  "remote_access",         // 远程接入规范
  "cybersecurity",         // 工控安全 (IEC 62443)
]);

export const stdStatusEnum = pgEnum("std_status", [
  "draft",
  "under_review",
  "active",
  "superseded",
  "deprecated",
]);

export const complianceCheckStatusEnum = pgEnum("compliance_check_status", [
  "NOT_CHECKED",
  "PASS",
  "FAIL",
  "WAIVED",
  "N_A",
]);

export const complaintSeverityEnum = pgEnum("complaint_severity", [
  "OBSERVATION",  // 观察项
  "MINOR",        // 一般
  "MAJOR",        // 严重
  "CRITICAL",     // 重大/安全
]);

// ── Table 1: Master Standards Library ──────────────────────────

export const electricalStandards = pgTable(
  "electrical_standards",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),         // e.g., "CE-LVD-2014/35", "UL508A-4.6.3"
    framework: stdFrameworkEnum("framework").notNull(),
    category: stdCategoryEnum("category").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    titleEn: varchar("title_en", { length: 500 }),
    description: text("description"),
    version: varchar("version", { length: 20 }).notNull(),
    referenceDoc: varchar("reference_doc", { length: 300 }),   // Document number
    referenceUrl: varchar("reference_url", { length: 500 }),
    applicableRegions: json("applicable_regions").$type<string[]>(),  // ["EU", "US", "CN", "GLOBAL"]
    applicableVoltages: json("applicable_voltages").$type<string[]>(), // ["380V/50Hz", "480V/60Hz"]
    keyRequirements: json("key_requirements").$type<string[]>(),      // Bullet-point key specs
    testMethods: json("test_methods").$type<string[]>(),
    status: stdStatusEnum("status").default("active").notNull(),
    effectiveDate: timestamp("effective_date"),
    supersededBy: integer("superseded_by"),    // FK to newer standard
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_es_code_version").on(t.code, t.version),
    index("idx_es_framework").on(t.framework),
    index("idx_es_category").on(t.category),
    index("idx_es_status").on(t.status),
  ]
);

// ── Table 2: Customer Standard Profiles ───────────────────────

export const customerStandardProfiles = pgTable(
  "customer_standard_profiles",
  {
    id: serial("id").primaryKey(),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerCode: varchar("customer_code", { length: 50 }),
    region: varchar("region", { length: 20 }).notNull(),              // EU, US, CN, JP, KR
    baseFramework: stdFrameworkEnum("base_framework").notNull(),       // CE, UL, GB, etc.
    overlayStandards: json("overlay_standards").$type<string[]>(),    // Additional OEM-specific codes
    voltageSpec: varchar("voltage_spec", { length: 100 }),            // e.g., "380V 3P+N+PE 50Hz"
    safetyLevel: varchar("safety_level", { length: 50 }),             // SIL2, PLd, Cat3, etc.
    plcPlatform: varchar("plc_platform", { length: 100 }),            // "Siemens S7-1500", "AB ControlLogix"
    hmiPlatform: varchar("hmi_platform", { length: 100 }),
    commProtocol: varchar("comm_protocol", { length: 100 }),          // "Profinet", "EtherNet/IP"
    panelIpRating: varchar("panel_ip_rating", { length: 20 }),        // IP54, IP65, NEMA 12
    cableSpec: varchar("cable_spec", { length: 200 }),                // "LAPP ÖLFLEX, UL Listed"
    specialRequirements: text("special_requirements"),
    documentLanguages: json("document_languages").$type<string[]>(),  // ["EN", "DE", "ZH"]
    auditHistory: json("audit_history").$type<{ date: string; auditor: string; result: string }[]>(),
    isActive: boolean("is_active").default(true).notNull(),
    buCode: varchar("bu_code", { length: 20 }),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_csp_customer").on(t.customerName),
    index("idx_csp_region").on(t.region),
    index("idx_csp_framework").on(t.baseFramework),
  ]
);

// ── Table 3: Project Standard Selection ───────────────────────

export const projectStandardSelections = pgTable(
  "project_standard_selections",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id"),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    projectName: varchar("project_name", { length: 300 }),
    customerProfileId: integer("customer_profile_id"),           // FK → customerStandardProfiles
    applicablePhases: json("applicable_phases").$type<string[]>(), // ["M0", "M1", "M3", "M7", "M8"]
    selectedStandardIds: json("selected_standard_ids").$type<number[]>(), // FK[] → electricalStandards
    designBasis: json("design_basis").$type<{
      voltage: string;
      frequency: string;
      phases: number;
      safetyLevel: string;
      ipRating: string;
      plcPlatform: string;
      hmiPlatform: string;
      commProtocol: string;
    }>(),
    lockedAt: timestamp("locked_at"),            // Phase lock: once M3 approved, freeze selections
    lockedBy: integer("locked_by"),
    notes: text("notes"),
    buCode: varchar("bu_code", { length: 20 }),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_pss_project").on(t.projectCode),
    index("idx_pss_customer").on(t.customerProfileId),
  ]
);

// ── Table 4: Compliance Checklist Items ───────────────────────

export const complianceChecklistItems = pgTable(
  "compliance_checklist_items",
  {
    id: serial("id").primaryKey(),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    standardId: integer("standard_id").notNull(),                // FK → electricalStandards
    standardCode: varchar("standard_code", { length: 50 }),
    checkPhase: varchar("check_phase", { length: 10 }).notNull(), // M0, M3, M7, M8, M11
    checkItem: varchar("check_item", { length: 500 }).notNull(),
    checkMethod: text("check_method"),
    acceptanceCriteria: text("acceptance_criteria"),
    status: complianceCheckStatusEnum("status").default("NOT_CHECKED").notNull(),
    checkedBy: integer("checked_by"),
    checkedAt: timestamp("checked_at"),
    evidence: varchar("evidence", { length: 500 }),     // Photo/doc reference
    deviationNote: text("deviation_note"),
    waiverApprovedBy: integer("waiver_approved_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_cci_project").on(t.projectCode),
    index("idx_cci_standard").on(t.standardId),
    index("idx_cci_phase").on(t.checkPhase),
    index("idx_cci_status").on(t.status),
  ]
);

// ── Table 5: Customer Electrical Complaints ───────────────────

export const electricalComplaints = pgTable(
  "electrical_complaints",
  {
    id: serial("id").primaryKey(),
    complaintNumber: varchar("complaint_number", { length: 50 }).notNull(),
    projectCode: varchar("project_code", { length: 50 }),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    equipmentModel: varchar("equipment_model", { length: 200 }),
    category: stdCategoryEnum("category").notNull(),
    severity: complaintSeverityEnum("severity").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    rootCause: text("root_cause"),
    violatedStandardIds: json("violated_standard_ids").$type<number[]>(),
    correctiveAction: text("corrective_action"),
    preventiveAction: text("preventive_action"),
    status: varchar("status", { length: 30 }).default("open").notNull(),
    reportedBy: varchar("reported_by", { length: 100 }),
    assigneeId: integer("assignee_id"),
    assigneeName: varchar("assignee_name", { length: 100 }),
    resolvedAt: timestamp("resolved_at"),
    buCode: varchar("bu_code", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_ec_number").on(t.complaintNumber),
    index("idx_ec_customer").on(t.customerName),
    index("idx_ec_severity").on(t.severity),
    index("idx_ec_status").on(t.status),
    index("idx_ec_category").on(t.category),
  ]
);

// ── Table 6: Review Gate Rules ────────────────────────────────

export const electricalReviewRules = pgTable(
  "electrical_review_rules",
  {
    id: serial("id").primaryKey(),
    phase: varchar("phase", { length: 10 }).notNull(),    // M0, M1, M3, M7, M8, M11
    framework: stdFrameworkEnum("framework").notNull(),
    ruleCode: varchar("rule_code", { length: 50 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    checklistTemplate: json("checklist_template").$type<string[]>(), // Default checklist items
    requiredApprovers: json("required_approvers").$type<string[]>(), // Roles: ["electrical_lead", "quality_manager"]
    isBlocking: boolean("is_blocking").default(true).notNull(),      // Blocks phase advancement
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_err_phase_rule").on(t.phase, t.ruleCode),
    index("idx_err_framework").on(t.framework),
  ]
);

// ── Relations ──────────────────────────────────────────────────

export const electricalStandardsRelations = relations(electricalStandards, ({ many }) => ({
  checklistItems: many(complianceChecklistItems),
}));

export const customerStandardProfilesRelations = relations(customerStandardProfiles, ({ many }) => ({
  projectSelections: many(projectStandardSelections),
}));

export const projectStandardSelectionsRelations = relations(projectStandardSelections, ({ one }) => ({
  customerProfile: one(customerStandardProfiles, {
    fields: [projectStandardSelections.customerProfileId],
    references: [customerStandardProfiles.id],
  }),
}));

export const complianceChecklistItemsRelations = relations(complianceChecklistItems, ({ one }) => ({
  standard: one(electricalStandards, {
    fields: [complianceChecklistItems.standardId],
    references: [electricalStandards.id],
  }),
}));

// ── Types ──────────────────────────────────────────────────────

export type ElectricalStandard = typeof electricalStandards.$inferSelect;
export type NewElectricalStandard = typeof electricalStandards.$inferInsert;
export type CustomerStandardProfile = typeof customerStandardProfiles.$inferSelect;
export type NewCustomerStandardProfile = typeof customerStandardProfiles.$inferInsert;
export type ProjectStandardSelection = typeof projectStandardSelections.$inferSelect;
export type ComplianceChecklistItem = typeof complianceChecklistItems.$inferSelect;
export type ElectricalComplaint = typeof electricalComplaints.$inferSelect;
export type ElectricalReviewRule = typeof electricalReviewRules.$inferSelect;
