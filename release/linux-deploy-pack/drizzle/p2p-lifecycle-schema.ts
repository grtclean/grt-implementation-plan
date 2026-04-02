/**
 * P2P (Procure-to-Pay) Lifecycle Schema
 *
 * 10 tables covering the full procurement lifecycle:
 *   framework agreements, RFQ/bidding, delivery registration,
 *   payment workflows (8-step), small-value procurement,
 *   supplier report submissions, supplier qualifications,
 *   quality loss agreements, quality loss incidents
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  index,
  boolean,
  date,
  pgEnum,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ─── Enums ────────────────────────────────────────────────────

export const frameworkAgreementStatusEnum = pgEnum("framework_agreement_status_enum", [
  "draft",
  "active",
  "expired",
  "terminated",
]);

export const rfqStatusEnum = pgEnum("rfq_status_enum", [
  "draft",
  "published",
  "bidding",
  "evaluating",
  "awarded",
  "cancelled",
  "closed",
]);

export const rfqBiddingTypeEnum = pgEnum("rfq_bidding_type_enum", [
  "sealed",
  "open",
  "reverse",
  "negotiated",
]);

export const rfqQuoteStatusEnum = pgEnum("rfq_quote_status_enum", [
  "submitted",
  "under_review",
  "shortlisted",
  "awarded",
  "rejected",
  "withdrawn",
]);

export const deliveryRegistrationStatusEnum = pgEnum("delivery_registration_status_enum", [
  "pending",
  "received",
  "qc_pending",
  "qc_passed",
  "qc_failed",
  "warehouse_confirmed",
  "rejected",
]);

export const paymentWorkflowStepEnum = pgEnum("payment_workflow_step_enum", [
  "payment_term_check",
  "quality_feedback_ok",
  "bu_dept_approval",
  "quality_prod_approval",
  "payment_approved",
  "procurement_confirmed",
  "supplier_confirmed",
  "contract_archived",
]);

export const paymentWorkflowStatusEnum = pgEnum("payment_workflow_status_enum", [
  "pending",
  "in_progress",
  "approved",
  "rejected",
  "completed",
  "cancelled",
]);

export const smallValueStatusEnum = pgEnum("small_value_status_enum", [
  "draft",
  "pending_supervisor",
  "supervisor_approved",
  "procurement_confirmed",
  "completed",
  "rejected",
]);

export const reportVerificationStatusEnum = pgEnum("report_verification_status_enum", [
  "pending",
  "verified",
  "rejected",
]);

export const qualificationTypeEnum = pgEnum("qualification_type_enum", [
  "initial",
  "annual",
  "special",
]);

export const qualificationResultEnum = pgEnum("qualification_result_enum", [
  "qualified",
  "conditional",
  "failed",
]);

export const qualificationStatusEnum = pgEnum("qualification_status_enum", [
  "draft",
  "in_progress",
  "completed",
  "expired",
]);

export const qualityLossAgreementStatusEnum = pgEnum("quality_loss_agreement_status_enum", [
  "draft",
  "signed",
  "active",
  "expired",
  "terminated",
]);

export const qualityLossIncidentStatusEnum = pgEnum("quality_loss_incident_status_enum", [
  "reported",
  "investigating",
  "confirmed",
  "penalty_applied",
  "deducted",
  "closed",
]);

// ─── 1. Framework Agreements (年度框架协议) ──────────────────

export const frameworkAgreements = pgTable(
  "framework_agreements",
  {
    id: serial("id").primaryKey(),
    agreementCode: varchar("agreement_code", { length: 50 }).notNull(),
    supplierId: integer("supplier_id").notNull(),
    supplierName: varchar("supplier_name", { length: 200 }),
    title: varchar("title", { length: 300 }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    pricingItems: jsonb("pricing_items"), // [{materialCode, materialName, unitPrice, moq, unit}]
    totalBudget: decimal("total_budget", { precision: 14, scale: 2 }).default("0"),
    spentAmount: decimal("spent_amount", { precision: 14, scale: 2 }).default("0"),
    paymentTerms: varchar("payment_terms", { length: 200 }),
    currency: varchar("currency", { length: 10 }).default("CNY"),
    notes: text("notes"),
    buCode: varchar("bu_code", { length: 50 }),
    status: frameworkAgreementStatusEnum("status").default("draft"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("fa_uk_agreement_code").on(table.agreementCode),
    index("fa_supplier_idx").on(table.supplierId),
    index("fa_status_idx").on(table.status),
    index("fa_end_date_idx").on(table.endDate),
    index("fa_bu_code_idx").on(table.buCode),
  ]
);

// ─── 2. RFQ Events (询价/竞标事件) ──────────────────────────

export const rfqEvents = pgTable(
  "rfq_events",
  {
    id: serial("id").primaryKey(),
    rfqCode: varchar("rfq_code", { length: 50 }).notNull(),
    title: varchar("title", { length: 300 }),
    materialCode: varchar("material_code", { length: 100 }),
    materialName: varchar("material_name", { length: 200 }),
    quantity: decimal("quantity", { precision: 12, scale: 4 }),
    unit: varchar("unit", { length: 20 }),
    biddingType: rfqBiddingTypeEnum("bidding_type").default("sealed"),
    deadline: timestamp("deadline", { mode: "string" }),
    evaluationCriteria: jsonb("evaluation_criteria"), // [{criterion, weight}]
    invitedSupplierIds: jsonb("invited_supplier_ids"), // [supplierId, ...]
    selectedQuoteId: integer("selected_quote_id"),
    generatedPoId: integer("generated_po_id"),
    frameworkAgreementId: integer("framework_agreement_id"),
    notes: text("notes"),
    buCode: varchar("bu_code", { length: 50 }),
    status: rfqStatusEnum("status").default("draft"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("rfq_uk_rfq_code").on(table.rfqCode),
    index("rfq_status_idx").on(table.status),
    index("rfq_material_idx").on(table.materialCode),
    index("rfq_deadline_idx").on(table.deadline),
    index("rfq_bu_code_idx").on(table.buCode),
  ]
);

// ─── 3. RFQ Supplier Quotes (供应商报价) ─────────────────────

export const rfqSupplierQuotes = pgTable(
  "rfq_supplier_quotes",
  {
    id: serial("id").primaryKey(),
    rfqEventId: integer("rfq_event_id").notNull(),
    supplierId: integer("supplier_id").notNull(),
    supplierName: varchar("supplier_name", { length: 200 }),
    unitPrice: decimal("unit_price", { precision: 12, scale: 4 }),
    totalPrice: decimal("total_price", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 10 }).default("CNY"),
    deliveryDays: integer("delivery_days"),
    warrantyMonths: integer("warranty_months"),
    paymentTerms: varchar("payment_terms", { length: 200 }),
    technicalNotes: text("technical_notes"),
    attachmentUrls: jsonb("attachment_urls"),
    // Scoring
    priceScore: decimal("price_score", { precision: 5, scale: 2 }),
    qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
    deliveryScore: decimal("delivery_score", { precision: 5, scale: 2 }),
    totalScore: decimal("total_score", { precision: 5, scale: 2 }),
    rank: integer("rank"),
    status: rfqQuoteStatusEnum("status").default("submitted"),
    submittedAt: timestamp("submitted_at", { mode: "string" }).defaultNow(),
    evaluatedAt: timestamp("evaluated_at", { mode: "string" }),
    evaluatedBy: integer("evaluated_by").references(() => users.id),
  },
  (table) => [
    index("rfq_quote_rfq_idx").on(table.rfqEventId),
    index("rfq_quote_supplier_idx").on(table.supplierId),
    index("rfq_quote_status_idx").on(table.status),
  ]
);

// ─── 4. Delivery Registrations (供应商到货登记) ──────────────

export const deliveryRegistrations = pgTable(
  "delivery_registrations",
  {
    id: serial("id").primaryKey(),
    registrationCode: varchar("registration_code", { length: 50 }).notNull(),
    purchaseOrderId: integer("purchase_order_id"),
    poNumber: varchar("po_number", { length: 50 }),
    supplierId: integer("supplier_id"),
    supplierName: varchar("supplier_name", { length: 200 }),
    materialCode: varchar("material_code", { length: 100 }),
    materialName: varchar("material_name", { length: 200 }),
    deliveredQuantity: decimal("delivered_quantity", { precision: 12, scale: 4 }),
    unit: varchar("unit", { length: 20 }),
    trackingNumber: varchar("tracking_number", { length: 100 }),
    packingList: jsonb("packing_list"),
    testReportUrls: jsonb("test_report_urls"),
    qcInspectionId: integer("qc_inspection_id"),
    warehouseReceiptId: integer("warehouse_receipt_id"),
    receivedByName: varchar("received_by_name", { length: 100 }),
    receivedAt: timestamp("received_at", { mode: "string" }),
    notes: text("notes"),
    buCode: varchar("bu_code", { length: 50 }),
    status: deliveryRegistrationStatusEnum("status").default("pending"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("dr_uk_registration_code").on(table.registrationCode),
    index("dr_po_idx").on(table.purchaseOrderId),
    index("dr_supplier_idx").on(table.supplierId),
    index("dr_status_idx").on(table.status),
    index("dr_bu_code_idx").on(table.buCode),
  ]
);

// ─── 5. Payment Workflows (付款审批工作流 — 8步) ─────────────

export const paymentWorkflows = pgTable(
  "payment_workflows",
  {
    id: serial("id").primaryKey(),
    workflowCode: varchar("workflow_code", { length: 50 }).notNull(),
    invoiceId: integer("invoice_id"),
    invoiceNumber: varchar("invoice_number", { length: 50 }),
    supplierId: integer("supplier_id"),
    supplierName: varchar("supplier_name", { length: 200 }),
    paymentAmount: decimal("payment_amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("CNY"),
    currentStep: paymentWorkflowStepEnum("current_step").default("payment_term_check"),
    // Step timestamps
    paymentDueDate: date("payment_due_date"),
    paymentTermExpired: boolean("payment_term_expired").default(false),
    qualityFeedbackOk: boolean("quality_feedback_ok").default(false),
    qualityFeedbackAt: timestamp("quality_feedback_at", { mode: "string" }),
    buApprovedBy: integer("bu_approved_by").references(() => users.id),
    buApprovedAt: timestamp("bu_approved_at", { mode: "string" }),
    qualityApprovedBy: integer("quality_approved_by").references(() => users.id),
    qualityApprovedAt: timestamp("quality_approved_at", { mode: "string" }),
    paymentApprovedBy: integer("payment_approved_by").references(() => users.id),
    paymentApprovedAt: timestamp("payment_approved_at", { mode: "string" }),
    procurementConfirmedBy: integer("procurement_confirmed_by").references(() => users.id),
    procurementConfirmedAt: timestamp("procurement_confirmed_at", { mode: "string" }),
    supplierConfirmToken: varchar("supplier_confirm_token", { length: 100 }),
    supplierConfirmedAt: timestamp("supplier_confirmed_at", { mode: "string" }),
    contractArchived: boolean("contract_archived").default(false),
    contractArchivedAt: timestamp("contract_archived_at", { mode: "string" }),
    // Quality deduction
    qualityDeductionAmount: decimal("quality_deduction_amount", { precision: 12, scale: 2 }).default("0"),
    netPaymentAmount: decimal("net_payment_amount", { precision: 14, scale: 2 }),
    // Meta
    notes: text("notes"),
    buCode: varchar("bu_code", { length: 50 }),
    status: paymentWorkflowStatusEnum("status").default("pending"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("pw_uk_workflow_code").on(table.workflowCode),
    index("pw_invoice_idx").on(table.invoiceId),
    index("pw_supplier_idx").on(table.supplierId),
    index("pw_status_idx").on(table.status),
    index("pw_step_idx").on(table.currentStep),
    index("pw_due_date_idx").on(table.paymentDueDate),
    index("pw_bu_code_idx").on(table.buCode),
  ]
);

// ─── 6. Small Value Procurements (小额采购 <50元/件) ─────────

export const smallValueProcurements = pgTable(
  "small_value_procurements",
  {
    id: serial("id").primaryKey(),
    requestCode: varchar("request_code", { length: 50 }).notNull(),
    materialName: varchar("material_name", { length: 200 }).notNull(),
    materialCode: varchar("material_code", { length: 100 }),
    specification: varchar("specification", { length: 200 }),
    quantity: integer("quantity").default(1),
    unit: varchar("unit", { length: 20 }).default("件"),
    estimatedUnitPrice: decimal("estimated_unit_price", { precision: 10, scale: 2 }).notNull(),
    estimatedTotalAmount: decimal("estimated_total_amount", { precision: 12, scale: 2 }),
    purpose: text("purpose"),
    requestedBy: integer("requested_by").references(() => users.id), // 仓库保管员
    requestedByName: varchar("requested_by_name", { length: 100 }),
    supervisorId: integer("supervisor_id").references(() => users.id), // 仓库主管
    supervisorName: varchar("supervisor_name", { length: 100 }),
    supervisorApprovedAt: timestamp("supervisor_approved_at", { mode: "string" }),
    supervisorRejectionReason: text("supervisor_rejection_reason"),
    procurementOfficerId: integer("procurement_officer_id").references(() => users.id), // 采购专员
    procurementOfficerName: varchar("procurement_officer_name", { length: 100 }),
    procurementConfirmedAt: timestamp("procurement_confirmed_at", { mode: "string" }),
    assignedSupplierId: integer("assigned_supplier_id"),
    assignedSupplierName: varchar("assigned_supplier_name", { length: 200 }),
    annualContractId: integer("annual_contract_id"), // FK→framework_agreements
    actualUnitPrice: decimal("actual_unit_price", { precision: 10, scale: 2 }),
    notes: text("notes"),
    buCode: varchar("bu_code", { length: 50 }),
    status: smallValueStatusEnum("status").default("draft"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("svp_uk_request_code").on(table.requestCode),
    index("svp_status_idx").on(table.status),
    index("svp_requested_by_idx").on(table.requestedBy),
    index("svp_bu_code_idx").on(table.buCode),
  ]
);

// ─── 7. Supplier Report Submissions (供应商报告/证书提交) ────

export const supplierReportSubmissions = pgTable(
  "supplier_report_submissions",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull(),
    supplierName: varchar("supplier_name", { length: 200 }),
    documentType: varchar("document_type", { length: 50 }).notNull(), // test_report, certificate, msds, coa, calibration
    documentTitle: varchar("document_title", { length: 300 }),
    fileUrl: text("file_url"),
    fileSize: integer("file_size"),
    relatedPoNumber: varchar("related_po_number", { length: 50 }),
    relatedMaterialCode: varchar("related_material_code", { length: 100 }),
    expiryDate: date("expiry_date"),
    verificationStatus: reportVerificationStatusEnum("verification_status").default("pending"),
    verifiedBy: integer("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at", { mode: "string" }),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { mode: "string" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("srs_supplier_idx").on(table.supplierId),
    index("srs_doc_type_idx").on(table.documentType),
    index("srs_verification_idx").on(table.verificationStatus),
  ]
);

// ─── 8. Supplier Qualifications (供应商资格审查) ─────────────

export const supplierQualifications = pgTable(
  "supplier_qualifications",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").notNull(),
    supplierName: varchar("supplier_name", { length: 200 }),
    qualificationType: qualificationTypeEnum("qualification_type").default("initial"),
    auditDate: date("audit_date"),
    auditorName: varchar("auditor_name", { length: 100 }),
    auditorId: integer("auditor_id").references(() => users.id),
    // ISO System Certifications
    isoSystemCertifications: jsonb("iso_system_certifications"), // [{certName, certNumber, validUntil, certBody}]
    // Special requirements (阀门/高要求同行)
    specialRequirements: jsonb("special_requirements"), // [{requirement, description, met}]
    // Scoring
    qualitySystemScore: decimal("quality_system_score", { precision: 5, scale: 2 }),
    processCapabilityScore: decimal("process_capability_score", { precision: 5, scale: 2 }),
    deliveryCapabilityScore: decimal("delivery_capability_score", { precision: 5, scale: 2 }),
    overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
    overallResult: qualificationResultEnum("overall_result"),
    validUntil: date("valid_until"),
    nextAuditDate: date("next_audit_date"),
    attachmentUrls: jsonb("attachment_urls"),
    notes: text("notes"),
    status: qualificationStatusEnum("status").default("draft"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("sq_supplier_idx").on(table.supplierId),
    index("sq_type_idx").on(table.qualificationType),
    index("sq_result_idx").on(table.overallResult),
    index("sq_valid_until_idx").on(table.validUntil),
    index("sq_status_idx").on(table.status),
  ]
);

// ─── 9. Quality Loss Agreements (质量损失协议) ──────────────

export const qualityLossAgreements = pgTable(
  "quality_loss_agreements",
  {
    id: serial("id").primaryKey(),
    agreementCode: varchar("agreement_code", { length: 50 }).notNull(),
    supplierId: integer("supplier_id").notNull(),
    supplierName: varchar("supplier_name", { length: 200 }),
    frameworkAgreementId: integer("framework_agreement_id"),
    qualityLossThreshold: decimal("quality_loss_threshold", { precision: 14, scale: 2 }), // 金额阈值
    qualityLossRateThreshold: decimal("quality_loss_rate_threshold", { precision: 5, scale: 4 }), // 百分比阈值如0.005=0.5%
    penaltyFormula: text("penalty_formula"), // 超出部分的处罚计算公式
    maxPenaltyAmount: decimal("max_penalty_amount", { precision: 14, scale: 2 }),
    effectiveDate: date("effective_date"),
    expiryDate: date("expiry_date"),
    signedBy: varchar("signed_by", { length: 100 }), // 供应商签署人
    signedAt: timestamp("signed_at", { mode: "string" }),
    witnessedBy: varchar("witnessed_by", { length: 100 }), // GRT见证人
    notes: text("notes"),
    status: qualityLossAgreementStatusEnum("status").default("draft"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("qla_uk_agreement_code").on(table.agreementCode),
    index("qla_supplier_idx").on(table.supplierId),
    index("qla_status_idx").on(table.status),
    index("qla_expiry_idx").on(table.expiryDate),
  ]
);

// ─── 10. Quality Loss Incidents (质量损失事件记录) ───────────

export const qualityLossIncidents = pgTable(
  "quality_loss_incidents",
  {
    id: serial("id").primaryKey(),
    incidentCode: varchar("incident_code", { length: 50 }).notNull(),
    qualityLossAgreementId: integer("quality_loss_agreement_id"),
    supplierId: integer("supplier_id").notNull(),
    supplierName: varchar("supplier_name", { length: 200 }),
    purchaseOrderId: integer("purchase_order_id"),
    poNumber: varchar("po_number", { length: 50 }),
    materialCode: varchar("material_code", { length: 100 }),
    materialName: varchar("material_name", { length: 200 }),
    lossAmount: decimal("loss_amount", { precision: 14, scale: 2 }).notNull(),
    lossDescription: text("loss_description"),
    rootCause: text("root_cause"),
    evidenceUrls: jsonb("evidence_urls"),
    penaltyTriggered: boolean("penalty_triggered").default(false),
    penaltyAmount: decimal("penalty_amount", { precision: 14, scale: 2 }).default("0"),
    supplierAcknowledged: boolean("supplier_acknowledged").default(false),
    supplierAcknowledgedAt: timestamp("supplier_acknowledged_at", { mode: "string" }),
    deductionFromPaymentId: integer("deduction_from_payment_id"), // FK→payment_workflows
    notes: text("notes"),
    status: qualityLossIncidentStatusEnum("status").default("reported"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("qli_uk_incident_code").on(table.incidentCode),
    index("qli_agreement_idx").on(table.qualityLossAgreementId),
    index("qli_supplier_idx").on(table.supplierId),
    index("qli_status_idx").on(table.status),
    index("qli_penalty_idx").on(table.penaltyTriggered),
  ]
);
