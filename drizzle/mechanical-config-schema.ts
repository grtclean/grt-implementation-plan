/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Mechanical Configuration Standards Schema                  ║
 * ║  机械配置标准治理平台                                        ║
 * ║                                                            ║
 * ║  CTO mandate: Systematize GRT/OEM/customer mechanical      ║
 * ║  standards with knowledge graph, quotation compliance,      ║
 * ║  customer config checklists, and acceptance tracking.       ║
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
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────

export const mechStdOriginEnum = pgEnum("mech_std_origin", [
  "GRT_INTERNAL",   // GRT内部标准
  "ISO",            // 国际标准化组织
  "DIN",            // 德国工业标准
  "EN",             // 欧洲标准
  "GB",             // 中国国标
  "ASME",           // 美国机械工程师学会
  "JIS",            // 日本工业标准
  "OEM_CUSTOMER",   // 客户OEM标准
  "INDUSTRY",       // 行业标准
]);

export const mechStdCategoryEnum = pgEnum("mech_std_category", [
  "structural_frame",      // 结构框架 (钢架/底座/焊接件)
  "material_selection",    // 材料选型 (钢材/铝材/不锈钢/工程塑料)
  "surface_treatment",     // 表面处理 (喷涂/电镀/阳极氧化/钝化)
  "welding",               // 焊接工艺 (MIG/TIG/激光焊/焊缝等级)
  "fastener",              // 紧固件 (螺栓/螺母/扭矩/防松)
  "sealing",               // 密封 (O-ring/垫片/洁净室兼容)
  "pneumatic_hydraulic",   // 气动液压 (SMC/Festo/压力等级/阀岛)
  "piping_routing",        // 管路布线 (线槽/拖链/气管路径)
  "thermal_management",    // 热管理 (冷却/通风/热交换器)
  "noise_vibration",       // 噪声振动 (减振/隔音/限值)
  "ergonomic_access",      // 人机工程 (操作高度/维护通道/安全间距)
  "safety_guarding",       // 安全防护 (围栏/安全光栅/联锁)
  "appearance_paint",      // 外观涂装 (RAL色号/粉末涂装/客户指定色)
  "packaging_shipping",    // 包装运输 (木箱/集装箱/防潮/固定)
]);

export const mechStdStatusEnum = pgEnum("mech_std_status", [
  "draft",
  "under_review",
  "active",
  "superseded",
  "deprecated",
]);

export const mechLinkTypeEnum = pgEnum("mech_link_type", [
  "derives_from",     // A源自B
  "supersedes",       // A取代B
  "conflicts_with",   // A与B冲突
  "requires",         // A依赖B
  "references",       // A参考B
  "complements",      // A补充B
]);

export const mechCheckStatusEnum = pgEnum("mech_check_status", [
  "NOT_CHECKED",
  "PASS",
  "FAIL",
  "WAIVED",
  "N_A",
]);

export const mechAcceptanceResultEnum = pgEnum("mech_acceptance_result", [
  "PENDING",
  "ACCEPTED",
  "CONDITIONAL",
  "REJECTED",
]);

// ── Table 1: Master Mechanical Standards Library ───────────────

export const mechanicalStandards = pgTable(
  "mechanical_standards",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),           // e.g., "GRT-MS-001", "ISO 2768-m", "DIN EN 1090-2"
    origin: mechStdOriginEnum("origin").notNull(),
    category: mechStdCategoryEnum("category").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    titleEn: varchar("title_en", { length: 500 }),
    description: text("description"),
    version: varchar("version", { length: 30 }).notNull(),
    referenceDoc: varchar("reference_doc", { length: 300 }),
    referenceUrl: varchar("reference_url", { length: 500 }),
    applicableRegions: json("applicable_regions").$type<string[]>(),     // ["EU", "US", "CN", "GLOBAL"]
    applicableMaterials: json("applicable_materials").$type<string[]>(), // ["Q235", "SUS304", "AL6061"]
    keyRequirements: json("key_requirements").$type<string[]>(),
    inspectionMethods: json("inspection_methods").$type<string[]>(),
    toleranceClass: varchar("tolerance_class", { length: 50 }),           // e.g., "ISO 2768-mK"
    status: mechStdStatusEnum("status").default("active").notNull(),
    effectiveDate: timestamp("effective_date"),
    supersededBy: integer("superseded_by"),
    tags: json("tags").$type<string[]>(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_ms_code_ver").on(t.code, t.version),
    index("idx_ms_origin").on(t.origin),
    index("idx_ms_category").on(t.category),
    index("idx_ms_status").on(t.status),
  ]
);

// ── Table 2: Customer Mechanical Config Profiles ──────────────

export const mechCustomerConfigs = pgTable(
  "mech_customer_configs",
  {
    id: serial("id").primaryKey(),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerCode: varchar("customer_code", { length: 50 }),
    region: varchar("region", { length: 20 }).notNull(),
    // ── Mechanical configuration fields ──
    frameMaterial: varchar("frame_material", { length: 100 }),          // "Q235焊接件" / "SUS304" / "AL6061-T6"
    surfaceFinish: varchar("surface_finish", { length: 200 }),          // "RAL7035粉末涂装 80μm" / "钝化处理"
    weldingStandard: varchar("welding_standard", { length: 100 }),      // "EN 1090-2 EXC2" / "AWS D1.1"
    toleranceGrade: varchar("tolerance_grade", { length: 50 }),          // "ISO 2768-mK" / customer-specific
    ipRating: varchar("ip_rating", { length: 20 }),                      // "IP54" / "IP65"
    cleanroomClass: varchar("cleanroom_class", { length: 50 }),          // "ISO Class 6" / "无"
    pneumaticsBrand: varchar("pneumatics_brand", { length: 100 }),       // "SMC" / "Festo" / "客户指定"
    hydraulicsPressure: varchar("hydraulics_pressure", { length: 50 }),   // "6 bar" / "10 bar"
    cableRoutingSpec: varchar("cable_routing_spec", { length: 200 }),     // "igus拖链 + Panduit线槽"
    paintColorCode: varchar("paint_color_code", { length: 50 }),          // "RAL7035" / "RAL5015"
    noiseLimit: varchar("noise_limit", { length: 50 }),                   // "≤75dB(A) @1m"
    vibrationLimit: varchar("vibration_limit", { length: 100 }),          // "≤2.5mm/s RMS"
    packagingSpec: varchar("packaging_spec", { length: 200 }),            // "出口木箱 + VCI防锈 + 集装箱加固"
    safetyGuardSpec: varchar("safety_guard_spec", { length: 200 }),       // "Troax网格围栏 + SICK C4000光栅"
    fastenerStandard: varchar("fastener_standard", { length: 100 }),      // "8.8级镀锌 + Nordlock" / "A2-70 SS"
    documentLanguages: json("document_languages").$type<string[]>(),
    specialRequirements: text("special_requirements"),
    overlayStandardIds: json("overlay_standard_ids").$type<number[]>(),  // FK[] → mechanicalStandards
    isActive: boolean("is_active").default(true).notNull(),
    buCode: varchar("bu_code", { length: 20 }),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_mcc_customer").on(t.customerName),
    index("idx_mcc_region").on(t.region),
  ]
);

// ── Table 3: Config Line Items (per-customer BOM-like checklist) ─

export const mechConfigLineItems = pgTable(
  "mech_config_line_items",
  {
    id: serial("id").primaryKey(),
    configId: integer("config_id").notNull(),                   // FK → mechCustomerConfigs
    category: mechStdCategoryEnum("category").notNull(),
    itemCode: varchar("item_code", { length: 50 }).notNull(),   // "FRM-001", "SRF-002"
    itemName: varchar("item_name", { length: 300 }).notNull(),
    specification: text("specification"),                         // Detailed spec text
    standardId: integer("standard_id"),                           // FK → mechanicalStandards
    brand: varchar("brand", { length: 100 }),                     // Approved brand
    alternativeBrands: json("alternative_brands").$type<string[]>(),
    quantityFormula: varchar("quantity_formula", { length: 200 }), // "每台1套" / "按面积计算"
    isMandatory: boolean("is_mandatory").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_mcli_config").on(t.configId),
    index("idx_mcli_category").on(t.category),
  ]
);

// ── Table 4: Knowledge Graph Links ────────────────────────────

export const mechStandardLinks = pgTable(
  "mech_standard_links",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").notNull(),           // FK → mechanicalStandards
    targetId: integer("target_id").notNull(),           // FK → mechanicalStandards
    linkType: mechLinkTypeEnum("link_type").notNull(),
    description: varchar("description", { length: 300 }),
    strength: integer("strength").default(50),           // 0-100 relevance
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_msl_pair").on(t.sourceId, t.targetId, t.linkType),
    index("idx_msl_source").on(t.sourceId),
    index("idx_msl_target").on(t.targetId),
  ]
);

// ── Table 5: Project Mechanical Selections ────────────────────

export const mechProjectSelections = pgTable(
  "mech_project_selections",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id"),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    projectName: varchar("project_name", { length: 300 }),
    customerConfigId: integer("customer_config_id"),            // FK → mechCustomerConfigs
    applicablePhases: json("applicable_phases").$type<string[]>(),
    selectedStandardIds: json("selected_standard_ids").$type<number[]>(),
    designBasis: json("design_basis").$type<{
      frameMaterial: string;
      surfaceFinish: string;
      toleranceGrade: string;
      ipRating: string;
      pneumaticsBrand: string;
      safetyGuardSpec: string;
      paintColor: string;
      noiseLimit: string;
    }>(),
    lockedAt: timestamp("locked_at"),
    lockedBy: integer("locked_by"),
    notes: text("notes"),
    buCode: varchar("bu_code", { length: 20 }),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_mps_project").on(t.projectCode),
    index("idx_mps_config").on(t.customerConfigId),
  ]
);

// ── Table 6: Quotation Compliance Checks ──────────────────────

export const mechQuotationChecks = pgTable(
  "mech_quotation_checks",
  {
    id: serial("id").primaryKey(),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    quotationNumber: varchar("quotation_number", { length: 50 }).notNull(),
    customerConfigId: integer("customer_config_id"),
    checkItem: varchar("check_item", { length: 500 }).notNull(),
    category: mechStdCategoryEnum("category").notNull(),
    standardId: integer("standard_id"),
    customerRequirement: text("customer_requirement"),         // What the customer specified
    grtProposal: text("grt_proposal"),                         // What GRT quoted
    complianceStatus: mechCheckStatusEnum("compliance_status").default("NOT_CHECKED").notNull(),
    deviationNote: text("deviation_note"),                     // If not compliant, why
    costImpact: varchar("cost_impact", { length: 100 }),       // "无" / "+¥2,500" / "-5% 如替代品牌"
    checkedBy: integer("checked_by"),
    checkedAt: timestamp("checked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_mqc_project").on(t.projectCode),
    index("idx_mqc_quotation").on(t.quotationNumber),
    index("idx_mqc_status").on(t.complianceStatus),
  ]
);

// ── Table 7: Phase Checklists ─────────────────────────────────

export const mechPhaseChecklists = pgTable(
  "mech_phase_checklists",
  {
    id: serial("id").primaryKey(),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    standardId: integer("standard_id"),
    standardCode: varchar("standard_code", { length: 80 }),
    phase: varchar("phase", { length: 10 }).notNull(),          // M0, M1, M3, M5, M7, M8, M11
    checkItem: varchar("check_item", { length: 500 }).notNull(),
    checkMethod: text("check_method"),
    acceptanceCriteria: text("acceptance_criteria"),
    status: mechCheckStatusEnum("status").default("NOT_CHECKED").notNull(),
    checkedBy: integer("checked_by"),
    checkedAt: timestamp("checked_at"),
    evidence: varchar("evidence", { length: 500 }),
    deviationNote: text("deviation_note"),
    waiverApprovedBy: integer("waiver_approved_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_mpc_project").on(t.projectCode),
    index("idx_mpc_phase").on(t.phase),
    index("idx_mpc_status").on(t.status),
  ]
);

// ── Table 8: Customer Acceptance Records ──────────────────────

export const mechAcceptanceRecords = pgTable(
  "mech_acceptance_records",
  {
    id: serial("id").primaryKey(),
    projectCode: varchar("project_code", { length: 50 }).notNull(),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    acceptancePhase: varchar("acceptance_phase", { length: 30 }).notNull(), // FAT / SAT / 到场验收
    checkItem: varchar("check_item", { length: 500 }).notNull(),
    category: mechStdCategoryEnum("category").notNull(),
    standardId: integer("standard_id"),
    result: mechAcceptanceResultEnum("result").default("PENDING").notNull(),
    score: real("score"),                                       // 0-100 satisfaction score
    customerComment: text("customer_comment"),
    correctiveAction: text("corrective_action"),
    inspectorName: varchar("inspector_name", { length: 100 }),
    inspectedAt: timestamp("inspected_at"),
    evidenceUrl: varchar("evidence_url", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_mar_project").on(t.projectCode),
    index("idx_mar_phase").on(t.acceptancePhase),
    index("idx_mar_result").on(t.result),
    index("idx_mar_customer").on(t.customerName),
  ]
);

// ── Table 9: Mechanical Review Rules (phase gate) ─────────────

export const mechReviewRules = pgTable(
  "mech_review_rules",
  {
    id: serial("id").primaryKey(),
    phase: varchar("phase", { length: 10 }).notNull(),
    origin: mechStdOriginEnum("origin").notNull(),
    ruleCode: varchar("rule_code", { length: 50 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    checklistTemplate: json("checklist_template").$type<string[]>(),
    requiredApprovers: json("required_approvers").$type<string[]>(),
    isBlocking: boolean("is_blocking").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_mrr_phase_rule").on(t.phase, t.ruleCode),
    index("idx_mrr_origin").on(t.origin),
  ]
);

// ── Relations ──────────────────────────────────────────────────

export const mechCustomerConfigsRelations = relations(mechCustomerConfigs, ({ many }) => ({
  lineItems: many(mechConfigLineItems),
  projectSelections: many(mechProjectSelections),
}));

export const mechConfigLineItemsRelations = relations(mechConfigLineItems, ({ one }) => ({
  config: one(mechCustomerConfigs, {
    fields: [mechConfigLineItems.configId],
    references: [mechCustomerConfigs.id],
  }),
}));

export const mechProjectSelectionsRelations = relations(mechProjectSelections, ({ one }) => ({
  customerConfig: one(mechCustomerConfigs, {
    fields: [mechProjectSelections.customerConfigId],
    references: [mechCustomerConfigs.id],
  }),
}));

export const mechStandardLinksRelations = relations(mechStandardLinks, ({ one }) => ({
  source: one(mechanicalStandards, { fields: [mechStandardLinks.sourceId], references: [mechanicalStandards.id] }),
}));

// ── Types ──────────────────────────────────────────────────────

export type MechanicalStandard = typeof mechanicalStandards.$inferSelect;
export type NewMechanicalStandard = typeof mechanicalStandards.$inferInsert;
export type MechCustomerConfig = typeof mechCustomerConfigs.$inferSelect;
export type MechConfigLineItem = typeof mechConfigLineItems.$inferSelect;
export type MechStandardLink = typeof mechStandardLinks.$inferSelect;
export type MechProjectSelection = typeof mechProjectSelections.$inferSelect;
export type MechQuotationCheck = typeof mechQuotationChecks.$inferSelect;
export type MechPhaseChecklist = typeof mechPhaseChecklists.$inferSelect;
export type MechAcceptanceRecord = typeof mechAcceptanceRecords.$inferSelect;
export type MechReviewRule = typeof mechReviewRules.$inferSelect;
