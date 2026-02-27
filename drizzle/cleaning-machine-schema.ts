import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./schema";

/**
 * Cleaning Machine Project Extension — 1:1 extension of the `projects` table
 * for industrial parts cleaning machine specifics (GRT core business).
 */
export const cleaningMachineProjects = pgTable("cleaning_machine_projects", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).unique().notNull(),

  // ── Cleaning machine specifics ──
  cleaningMethod: varchar("cleaning_method", { length: 50 }),        // spray | ultrasonic | immersion | vacuum | combination
  workpieceMaterial: varchar("workpiece_material", { length: 100 }), // aluminum | steel | cast_iron | plastic | mixed
  workpieceType: varchar("workpiece_type", { length: 100 }),         // e.g., engine_block, transmission_case, cylinder_head
  throughputTarget: integer("throughput_target"),                     // parts/hour
  beatTimeSeconds: integer("beat_time_seconds"),                     // cycle time
  cleanlinessStandard: varchar("cleanliness_standard", { length: 50 }), // VDA19 | ISO16232 | custom
  cleanlinessValue: varchar("cleanliness_value", { length: 50 }),    // e.g., "≤600μm, ≤0.5mg"
  tankCount: integer("tank_count"),                                   // number of cleaning stages
  dryingMethod: varchar("drying_method", { length: 50 }),            // vacuum | hot_air | infrared | none
  automationLevel: varchar("automation_level", { length: 30 }),      // manual | semi_auto | full_auto
  customerIndustry: varchar("customer_industry", { length: 50 }),    // automotive | aerospace | medical | electronics
  customerSite: varchar("customer_site", { length: 200 }),           // delivery location

  // ── Regional Compliance ──
  targetRegion: varchar("target_region", { length: 20 }),       // US | EU | CN | multi
  applicableRegulations: text("applicable_regulations"),        // JSON array of regulation codes

  // ── AI state ──
  aiSuggestedPlatform: text("ai_suggested_platform"),   // JSON blob
  aiQuotationDraft: text("ai_quotation_draft"),         // JSON blob

  // ── Contract ──
  contractNumber: varchar("contract_number", { length: 64 }),
  contractSignedDate: timestamp("contract_signed_date"),
  contractAmount: integer("contract_amount"),             // RMB

  // ── Lifecycle ──
  currentMPhase: varchar("current_m_phase", { length: 10 }).default("M0"),
  tPipelineTriggered: boolean("t_pipeline_triggered").default(false),

  // ── Timestamps ──
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Project T-Milestones — T1 through T15 for the cleaning machine build lifecycle.
 */
export const projectTMilestones = pgTable("project_t_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),

  milestoneCode: varchar("milestone_code", { length: 10 }).notNull(),   // T1..T15
  milestoneName: varchar("milestone_name", { length: 100 }).notNull(),
  milestoneNameEn: varchar("milestone_name_en", { length: 100 }),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("not_started"),     // not_started | in_progress | completed | blocked
  plannedDate: timestamp("planned_date"),
  actualDate: timestamp("actual_date"),
  ownerRole: varchar("owner_role", { length: 30 }),
  deliverables: text("deliverables"),  // JSON array

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * T-Milestone seed definitions (T1–T15 for industrial cleaning machine lifecycle).
 */
export const T_MILESTONE_DEFINITIONS = [
  { code: "T1",  name: "设计冻结",           nameEn: "Design Freeze",                    ownerRole: "bu_mech" },
  { code: "T2",  name: "BOM发布",            nameEn: "BOM Release",                       ownerRole: "bu_mech" },
  { code: "T3",  name: "长周期件采购",       nameEn: "Long-Lead Procurement",              ownerRole: "procurement_eng" },
  { code: "T4",  name: "零件加工开始",       nameEn: "Parts Fabrication Start",            ownerRole: "production_worker" },
  { code: "T5",  name: "槽体/框架制造",      nameEn: "Tank & Frame Fabrication",           ownerRole: "production_worker" },
  { code: "T6",  name: "管路/电气安装",      nameEn: "Piping & Electrical",                ownerRole: "bu_elec" },
  { code: "T7",  name: "分装",               nameEn: "Sub-Assembly",                       ownerRole: "team_lead" },
  { code: "T8",  name: "总装完成",           nameEn: "Main Assembly Complete",             ownerRole: "team_lead" },
  { code: "T9",  name: "水电气接通",         nameEn: "Utilities Connect",                  ownerRole: "team_lead" },
  { code: "T10", name: "清洗剂调试",         nameEn: "Cleaning Agent Commissioning",       ownerRole: "bu_mech" },
  { code: "T11", name: "空运转测试",         nameEn: "Empty Run Test",                     ownerRole: "bu_mech" },
  { code: "T12", name: "工厂验收(FAT)",      nameEn: "Factory Acceptance Test",            ownerRole: "bu_pm" },
  { code: "T13", name: "拆装发货",           nameEn: "Disassembly & Shipping",             ownerRole: "team_lead" },
  { code: "T14", name: "现场安装",           nameEn: "Site Installation",                  ownerRole: "cs_engineer" },
  { code: "T15", name: "现场验收交付(SAT)",  nameEn: "SAT & Handover",                     ownerRole: "bu_pm" },
] as const;

// ══════════════════════════════════════════════════════════════
// Regional Equipment Compliance Requirements
// ══════════════════════════════════════════════════════════════

export const REGIONAL_REGULATIONS = {
  US: [
    { code: "UL_508A", name: "UL 508A 工业控制面板", nameEn: "UL 508A Industrial Control Panels", category: "electrical" },
    { code: "NFPA_79", name: "NFPA 79 电气标准", nameEn: "NFPA 79 Electrical Standard", category: "electrical" },
    { code: "OSHA_1910", name: "OSHA 1910 通用工业", nameEn: "OSHA 1910 General Industry", category: "machinery" },
    { code: "NEC_409", name: "NEC Article 409", nameEn: "NEC Article 409", category: "electrical" },
  ],
  EU: [
    { code: "CE_2006_42_EC", name: "CE 2006/42/EC 机械指令", nameEn: "CE 2006/42/EC Machinery Directive", category: "machinery" },
    { code: "ATEX_2014_34_EU", name: "ATEX 2014/34/EU 防爆", nameEn: "ATEX 2014/34/EU Explosion Protection", category: "explosion" },
    { code: "EN_ISO_12100", name: "EN ISO 12100 安全", nameEn: "EN ISO 12100 Safety of Machinery", category: "machinery" },
    { code: "EN_60204_1", name: "EN 60204-1 电气安全", nameEn: "EN 60204-1 Electrical Safety", category: "electrical" },
    { code: "REACH", name: "REACH 化学品法规", nameEn: "REACH Chemical Regulation", category: "chemical" },
  ],
  CN: [
    { code: "GB_5226_1", name: "GB 5226.1 电气安全", nameEn: "GB 5226.1 Electrical Safety", category: "electrical" },
    { code: "GB_T_19001", name: "GB/T 19001 质量管理", nameEn: "GB/T 19001 Quality Management", category: "machinery" },
    { code: "GB_12265", name: "GB 12265 机械安全", nameEn: "GB 12265 Machinery Safety", category: "machinery" },
    { code: "CCC", name: "CCC 强制认证", nameEn: "CCC Mandatory Certification", category: "electrical" },
  ],
} as const;

export const equipmentComplianceRequirements = pgTable("equipment_compliance_requirements", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  targetRegion: varchar("target_region", { length: 20 }).notNull(),    // US | EU | CN
  regulationCode: varchar("regulation_code", { length: 50 }).notNull(),
  regulationName: varchar("regulation_name", { length: 200 }),
  regulationNameEn: varchar("regulation_name_en", { length: 200 }),
  category: varchar("category", { length: 30 }),                       // electrical | machinery | explosion | chemical
  status: varchar("status", { length: 20 }).default("not_started"),    // not_started | in_progress | compliant | waived
  complianceCost: integer("compliance_cost"),                           // estimated cost in RMB
  evidenceDocumentUrl: text("evidence_document_url"),
  assignedTo: varchar("assigned_to", { length: 100 }),
  dueDate: varchar("due_date", { length: 20 }),
  completedDate: varchar("completed_date", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ══════════════════════════════════════════════════════════════
// Cleanliness Reports — Persistent archive of AI-generated QC reports
// ══════════════════════════════════════════════════════════════

export const cleanlinessReports = pgTable("cleanliness_reports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  projectPhase: varchar("project_phase", { length: 30 }),              // process_trial | FAT | SAT | production | shipping | field_acceptance
  batchNumber: varchar("batch_number", { length: 50 }).notNull(),
  standard: varchar("standard", { length: 50 }),                       // VDA19 | ISO16232 | custom
  cleanlinessClass: varchar("cleanliness_class", { length: 10 }),
  inspectionData: text("inspection_data"),                             // JSON: AI inspect structured data
  judgmentData: text("judgment_data"),                                  // JSON: AI judge result
  reportContent: text("report_content"),                               // JSON: AI generateReport full report
  overallVerdict: varchar("overall_verdict", { length: 20 }),          // pass | fail | conditional
  reportPdfUrl: text("report_pdf_url"),
  rawDataFileUrl: text("raw_data_file_url"),
  inspectorName: varchar("inspector_name", { length: 100 }),
  inspectionDate: varchar("inspection_date", { length: 20 }),
  approvedBy: varchar("approved_by", { length: 100 }),
  approvedDate: varchar("approved_date", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ══════════════════════════════════════════════════════════════
// Process Trials — Cleaning process parameter testing
// ══════════════════════════════════════════════════════════════

export const processTrials = pgTable("process_trials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  trialCode: varchar("trial_code", { length: 50 }).unique(),           // PT-2026-001
  trialName: varchar("trial_name", { length: 200 }),
  cleaningMethod: varchar("cleaning_method", { length: 50 }),          // spray | ultrasonic | immersion | combination
  workpieceMaterial: varchar("workpiece_material", { length: 100 }),
  workpieceType: varchar("workpiece_type", { length: 100 }),
  processParameters: text("process_parameters"),                       // JSON: { pressure_bar, temperature_c, cycle_time_s, ... }
  beforeCleanliness: text("before_cleanliness"),                       // JSON: { particleCounts, residualMass_mg, ... }
  afterCleanliness: text("after_cleanliness"),                         // JSON: same structure
  verdict: varchar("verdict", { length: 20 }),                         // pass | fail | conditional
  verdictNotes: text("verdict_notes"),
  photoBeforeUrl: text("photo_before_url"),
  photoAfterUrl: text("photo_after_url"),
  microscopeReportUrl: text("microscope_report_url"),
  testedBy: varchar("tested_by", { length: 100 }),
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  approvedBy: varchar("approved_by", { length: 100 }),
  status: varchar("status", { length: 20 }).default("planned"),        // planned | in_progress | completed | failed
  trialDate: varchar("trial_date", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ══════════════════════════════════════════════════════════════
// Customer NDAs — NDA/NPA confidentiality agreement management
// ══════════════════════════════════════════════════════════════

export const customerNdas = pgTable("customer_ndas", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"),
  projectId: integer("project_id"),
  ndaCode: varchar("nda_code", { length: 50 }).unique(),               // NDA-2026-001
  ndaType: varchar("nda_type", { length: 30 }),                        // mutual | unilateral | npa
  title: varchar("title", { length: 300 }),
  counterpartyName: varchar("counterparty_name", { length: 200 }),
  counterpartyContact: varchar("counterparty_contact", { length: 200 }),
  status: varchar("status", { length: 20 }).default("draft"),          // draft | sent | under_review | signed | expired | terminated
  signDate: varchar("sign_date", { length: 20 }),
  expiryDate: varchar("expiry_date", { length: 20 }),
  duration: integer("duration"),                                        // months
  scope: text("scope"),
  restrictions: text("restrictions"),
  documentUrl: text("document_url"),
  signedCopyUrl: text("signed_copy_url"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
