/**
 * Supply Chain Traceability & Quality Control Schema
 * IATF 16949 / VDA 6.3 Compliance
 *
 * 11 tables covering the full supply chain lifecycle:
 *   supplier shipment → incoming inspection → warehouse → assembly BOM verification
 *   → process quality → customer feedback → maintenance → scrap/replacement → spare parts
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
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────

export const barcodeFormatEnum = pgEnum("barcode_format_enum", [
  "QR",
  "CODE128",
  "EAN13",
  "DATAMATRIX",
]);

export const inspectionResultEnum = pgEnum("inspection_result_enum", [
  "PASS",
  "FAIL",
  "CONDITIONAL",
  "PENDING",
]);

export const inspectionDispositionEnum = pgEnum("inspection_disposition_enum", [
  "accept",
  "reject",
  "rework",
  "return_to_supplier",
  "hold",
]);

export const bomMatchResultEnum = pgEnum("bom_match_result_enum", [
  "MATCH",
  "MISMATCH",
  "SUBSTITUTE",
  "NOT_FOUND",
]);

export const maintenanceTypeEnum = pgEnum("maintenance_type_enum", [
  "preventive",
  "corrective",
  "predictive",
  "emergency",
]);

export const disposalMethodEnum = pgEnum("disposal_method_enum", [
  "recycle",
  "destroy",
  "return",
  "salvage",
]);

export const penaltyTriggerTypeEnum = pgEnum("penalty_trigger_type_enum", [
  "quality_reject",
  "late_delivery",
  "missing_report",
  "safety_violation",
]);

export const penaltyTypeEnum = pgEnum("penalty_type_enum", [
  "warning",
  "fine",
  "probation",
  "suspension",
  "blacklist",
]);

export const traceRelationshipTypeEnum = pgEnum("trace_relationship_type_enum", [
  "supplied_to",
  "inspected_as",
  "assembled_in",
  "scrapped_from",
  "resolved_by",
  "consumed_by",
  "maintained_with",
]);

// ─── 1. Supplier Shipment Labels ──────────────────────────────

export const supplierShipmentLabels = pgTable(
  "supplier_shipment_labels",
  {
    id: serial("id").primaryKey(),
    supplierSerialNumber: varchar("supplier_serial_number", { length: 100 }).notNull(),
    supplierId: integer("supplier_id"),
    supplierName: varchar("supplier_name", { length: 200 }),
    projectNumber: varchar("project_number", { length: 50 }),
    bomProductCode: varchar("bom_product_code", { length: 100 }),
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    materialName: varchar("material_name", { length: 200 }),
    poNumber: varchar("po_number", { length: 50 }),
    quantity: decimal("quantity", { precision: 12, scale: 4 }),
    unit: varchar("unit", { length: 20 }),
    batchNumber: varchar("batch_number", { length: 100 }),
    productionDate: date("production_date"),
    expiryDate: date("expiry_date"),
    barcodeData: text("barcode_data"),
    barcodeFormat: barcodeFormatEnum("barcode_format").default("QR"),
    isValidated: boolean("is_validated").default(false),
    validationErrors: text("validation_errors"), // JSON array
    printCount: integer("print_count").default(0),
    lastPrintedAt: timestamp("last_printed_at", { mode: "string" }),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ssl_supplier_idx").on(table.supplierId),
    index("ssl_material_idx").on(table.materialCode),
    index("ssl_po_idx").on(table.poNumber),
    index("ssl_project_idx").on(table.projectNumber),
    index("ssl_barcode_idx").on(table.supplierSerialNumber),
  ]
);

// ─── 2. Incoming Inspection Records (IQC) ─────────────────────

export const incomingInspectionRecords = pgTable(
  "incoming_inspection_records",
  {
    id: serial("id").primaryKey(),
    inspectionCode: varchar("inspection_code", { length: 50 }).notNull(),
    purchaseReceiptId: integer("purchase_receipt_id"),
    lotId: integer("lot_id"),
    labelId: integer("label_id"), // FK to supplier_shipment_labels
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    materialName: varchar("material_name", { length: 200 }),
    supplierId: integer("supplier_id"),
    supplierName: varchar("supplier_name", { length: 200 }),
    poNumber: varchar("po_number", { length: 50 }),
    inspectedQuantity: decimal("inspected_quantity", { precision: 12, scale: 4 }),
    sampleSize: integer("sample_size"),
    defectCount: integer("defect_count").default(0),

    // Test report enforcement (IATF 16949 requirement)
    hasTestReport: boolean("has_test_report").default(false).notNull(),
    testReportUrl: text("test_report_url"),
    testReportGrtMaterialMatch: boolean("test_report_grt_material_match").default(false),
    testReportOrderMatch: boolean("test_report_order_match").default(false),

    inspectionResult: inspectionResultEnum("inspection_result").default("PENDING").notNull(),
    disposition: inspectionDispositionEnum("disposition").default("hold"),
    dispositionReason: text("disposition_reason"),
    measurementData: jsonb("measurement_data"), // JSON: [{param, nominal, tolerance, measured, pass}]

    controlPlanId: integer("control_plan_id"),
    eightDReportId: integer("eight_d_report_id"),

    inspectedBy: integer("inspected_by"),
    inspectedByName: varchar("inspected_by_name", { length: 100 }),
    inspectedAt: timestamp("inspected_at", { mode: "string" }),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at", { mode: "string" }),

    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("iir_code_idx").on(table.inspectionCode),
    index("iir_receipt_idx").on(table.purchaseReceiptId),
    index("iir_lot_idx").on(table.lotId),
    index("iir_material_idx").on(table.materialCode),
    index("iir_supplier_idx").on(table.supplierId),
    index("iir_result_idx").on(table.inspectionResult),
    index("iir_date_idx").on(table.createdAt),
  ]
);

// ─── 3. Assembly BOM Scan Logs ────────────────────────────────

export const assemblyBomScanLogs = pgTable(
  "assembly_bom_scan_logs",
  {
    id: serial("id").primaryKey(),
    projectNumber: varchar("project_number", { length: 50 }).notNull(),
    processCode: varchar("process_code", { length: 20 }).notNull(), // T1-T15
    scannedBarcode: varchar("scanned_barcode", { length: 200 }).notNull(),
    resolvedMaterialCode: varchar("resolved_material_code", { length: 100 }),
    bomItemId: integer("bom_item_id"),
    expectedMaterialCode: varchar("expected_material_code", { length: 100 }),
    bomMatchResult: bomMatchResultEnum("bom_match_result").notNull(),
    deviationConfirmed: boolean("deviation_confirmed").default(false),
    deviationReason: text("deviation_reason"),
    deviationConfirmedBy: integer("deviation_confirmed_by"),
    deviationConfirmedAt: timestamp("deviation_confirmed_at", { mode: "string" }),
    bomAdjustmentApplied: boolean("bom_adjustment_applied").default(false),
    lotNumber: varchar("lot_number", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    scannedBy: integer("scanned_by"),
    scannedByName: varchar("scanned_by_name", { length: 100 }),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("absl_project_process_idx").on(table.projectNumber, table.processCode),
    index("absl_barcode_idx").on(table.scannedBarcode),
    index("absl_material_idx").on(table.resolvedMaterialCode),
    index("absl_bom_item_idx").on(table.bomItemId),
    index("absl_result_idx").on(table.bomMatchResult),
  ]
);

// ─── 4. Assembly Labor Confirmations ──────────────────────────

export const assemblyLaborConfirmations = pgTable(
  "assembly_labor_confirmations",
  {
    id: serial("id").primaryKey(),
    projectNumber: varchar("project_number", { length: 50 }).notNull(),
    processCode: varchar("process_code", { length: 20 }).notNull(),
    workerId: integer("worker_id").notNull(),
    workerName: varchar("worker_name", { length: 100 }),
    clockInTime: timestamp("clock_in_time", { mode: "string" }).notNull(),
    clockOutTime: timestamp("clock_out_time", { mode: "string" }),
    netWorkMinutes: integer("net_work_minutes"),
    plannedMinutes: integer("planned_minutes"),
    efficiencyPercent: decimal("efficiency_percent", { precision: 6, scale: 2 }),
    qualityResult: varchar("quality_result", { length: 20 }), // PASS/FAIL
    executionLogId: integer("execution_log_id"), // FK to execution_logs
    defectsFound: integer("defects_found").default(0),
    reworkMinutes: integer("rework_minutes").default(0),
    confirmedByWorker: boolean("confirmed_by_worker").default(false),
    confirmedBySupervisor: boolean("confirmed_by_supervisor").default(false),
    supervisorId: integer("supervisor_id"),
    supervisorConfirmedAt: timestamp("supervisor_confirmed_at", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("alc_project_process_idx").on(table.projectNumber, table.processCode),
    index("alc_worker_idx").on(table.workerId),
    index("alc_date_idx").on(table.clockInTime),
    index("alc_exec_log_idx").on(table.executionLogId),
  ]
);

// ─── 5. Customer Quality Complaints ───────────────────────────

export const customerQualityComplaints = pgTable(
  "customer_quality_complaints",
  {
    id: serial("id").primaryKey(),
    complaintCode: varchar("complaint_code", { length: 50 }).notNull(),
    customerId: integer("customer_id"),
    customerName: varchar("customer_name", { length: 200 }),
    projectNumber: varchar("project_number", { length: 50 }),
    equipmentSerialNumber: varchar("equipment_serial_number", { length: 100 }),
    severity: varchar("severity", { length: 20 }).default("medium").notNull(), // low/medium/high/critical
    status: varchar("status", { length: 20 }).default("open").notNull(), // open/investigating/resolved/closed
    description: text("description").notNull(),
    affectedParts: jsonb("affected_parts"), // JSON: [{materialCode, partName, quantity}]
    tracedLotNumbers: jsonb("traced_lot_numbers"), // JSON: string[]
    tracedSupplierIds: jsonb("traced_supplier_ids"), // JSON: number[]

    // 8D/CAPA linkage
    eightDReportId: integer("eight_d_report_id"),
    capaId: integer("capa_id"),

    // Design change loop
    designChangeRequired: boolean("design_change_required").default(false),
    ecnNumber: varchar("ecn_number", { length: 50 }),
    bomVersionId: integer("bom_version_id"),
    fmeaUpdated: boolean("fmea_updated").default(false),
    controlPlanUpdated: boolean("control_plan_updated").default(false),

    satisfactionScore: integer("satisfaction_score"), // 1-10
    resolutionDate: timestamp("resolution_date", { mode: "string" }),
    rootCause: text("root_cause"),
    correctiveAction: text("corrective_action"),

    reportedBy: integer("reported_by"),
    assignedTo: integer("assigned_to"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("cqc_code_idx").on(table.complaintCode),
    index("cqc_customer_idx").on(table.customerId),
    index("cqc_project_idx").on(table.projectNumber),
    index("cqc_severity_idx").on(table.severity),
    index("cqc_status_idx").on(table.status),
    index("cqc_8d_idx").on(table.eightDReportId),
    index("cqc_date_idx").on(table.createdAt),
  ]
);

// ─── 6. Equipment Maintenance Records ─────────────────────────

export const equipmentMaintenanceRecords = pgTable(
  "equipment_maintenance_records",
  {
    id: serial("id").primaryKey(),
    maintenanceCode: varchar("maintenance_code", { length: 50 }).notNull(),
    equipmentId: integer("equipment_id").notNull(),
    equipmentName: varchar("equipment_name", { length: 200 }),
    equipmentCode: varchar("equipment_code", { length: 50 }),
    maintenanceType: maintenanceTypeEnum("maintenance_type").default("preventive").notNull(),
    status: varchar("status", { length: 20 }).default("scheduled").notNull(), // scheduled/in_progress/completed/cancelled
    scheduledDate: date("scheduled_date"),
    startedAt: timestamp("started_at", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    downtimeMinutes: integer("downtime_minutes").default(0),
    workPerformed: text("work_performed"),
    findings: text("findings"),
    partsConsumed: jsonb("parts_consumed"), // JSON: [{sparePartId, materialCode, quantity, unitCost}]
    laborCost: decimal("labor_cost", { precision: 12, scale: 2 }).default("0"),
    partsCost: decimal("parts_cost", { precision: 12, scale: 2 }).default("0"),
    totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
    nextMaintenanceDate: date("next_maintenance_date"),
    performedBy: integer("performed_by"),
    performedByName: varchar("performed_by_name", { length: 100 }),
    approvedBy: integer("approved_by"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("emr_code_idx").on(table.maintenanceCode),
    index("emr_equipment_idx").on(table.equipmentId),
    index("emr_type_idx").on(table.maintenanceType),
    index("emr_status_idx").on(table.status),
    index("emr_scheduled_idx").on(table.scheduledDate),
    index("emr_next_idx").on(table.nextMaintenanceDate),
  ]
);

// ─── 7. Scrap Disposal Records ────────────────────────────────

export const scrapDisposalRecords = pgTable(
  "scrap_disposal_records",
  {
    id: serial("id").primaryKey(),
    scrapCode: varchar("scrap_code", { length: 50 }).notNull(),
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    materialName: varchar("material_name", { length: 200 }),
    lotNumber: varchar("lot_number", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    quantity: decimal("quantity", { precision: 12, scale: 4 }).default("1"),
    unit: varchar("unit", { length: 20 }),
    scrapReason: text("scrap_reason").notNull(),
    scrapCategory: varchar("scrap_category", { length: 50 }), // incoming_defect/process_defect/design_error/expired/damaged
    projectNumber: varchar("project_number", { length: 50 }),
    processCode: varchar("process_code", { length: 20 }),
    authorizedBy: integer("authorized_by").notNull(),
    authorizedByName: varchar("authorized_by_name", { length: 100 }),
    authorizedAt: timestamp("authorized_at", { mode: "string" }),
    disposalMethod: disposalMethodEnum("disposal_method").default("recycle").notNull(),
    disposalDate: date("disposal_date"),
    replacementRequired: boolean("replacement_required").default(false),
    replacementPurchaseRequestId: integer("replacement_purchase_request_id"),
    supplierPenaltyId: integer("supplier_penalty_id"),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
    totalScrapCost: decimal("total_scrap_cost", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("sdr_code_idx").on(table.scrapCode),
    index("sdr_material_idx").on(table.materialCode),
    index("sdr_lot_idx").on(table.lotNumber),
    index("sdr_project_idx").on(table.projectNumber),
    index("sdr_method_idx").on(table.disposalMethod),
    index("sdr_date_idx").on(table.createdAt),
  ]
);

// ─── 8. Spare Parts Catalog ───────────────────────────────────

export const spareParts = pgTable(
  "spare_parts",
  {
    id: serial("id").primaryKey(),
    partCode: varchar("part_code", { length: 50 }).notNull(),
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    materialName: varchar("material_name", { length: 200 }).notNull(),
    specification: varchar("specification", { length: 200 }),
    category: varchar("category", { length: 50 }), // mechanical/electrical/hydraulic/pneumatic/consumable
    applicableEquipmentTypes: jsonb("applicable_equipment_types"), // JSON: string[]
    minStockLevel: integer("min_stock_level").default(0),
    reorderPoint: integer("reorder_point").default(0),
    maxStockLevel: integer("max_stock_level"),
    currentStock: integer("current_stock").default(0).notNull(),
    reservedStock: integer("reserved_stock").default(0),
    autoReorderEnabled: boolean("auto_reorder_enabled").default(false),
    preferredSupplierId: integer("preferred_supplier_id"),
    preferredSupplierName: varchar("preferred_supplier_name", { length: 200 }),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
    avgMonthlyConsumption: decimal("avg_monthly_consumption", { precision: 10, scale: 2 }),
    leadTimeDays: integer("lead_time_days"),
    isCritical: boolean("is_critical").default(false),
    warehouseId: integer("warehouse_id"),
    locationCode: varchar("location_code", { length: 50 }),
    lastReorderDate: date("last_reorder_date"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("sp_part_code_idx").on(table.partCode),
    index("sp_material_idx").on(table.materialCode),
    index("sp_category_idx").on(table.category),
    index("sp_critical_idx").on(table.isCritical),
    index("sp_stock_alert_idx").on(table.currentStock, table.reorderPoint),
  ]
);

// ─── 9. Spare Part Consumption Logs ───────────────────────────

export const sparePartConsumptionLogs = pgTable(
  "spare_part_consumption_logs",
  {
    id: serial("id").primaryKey(),
    sparePartId: integer("spare_part_id").notNull(),
    maintenanceRecordId: integer("maintenance_record_id"),
    equipmentId: integer("equipment_id"),
    equipmentName: varchar("equipment_name", { length: 200 }),
    quantityConsumed: integer("quantity_consumed").notNull(),
    previousStock: integer("previous_stock"),
    newStock: integer("new_stock"),
    reason: text("reason"),
    autoReorderTriggered: boolean("auto_reorder_triggered").default(false),
    purchaseRequestId: integer("purchase_request_id"),
    consumedBy: integer("consumed_by"),
    consumedByName: varchar("consumed_by_name", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("spcl_spare_part_idx").on(table.sparePartId),
    index("spcl_maintenance_idx").on(table.maintenanceRecordId),
    index("spcl_equipment_idx").on(table.equipmentId),
    index("spcl_date_idx").on(table.createdAt),
  ]
);

// ─── 10. Supplier Penalties ───────────────────────────────────

export const supplierPenalties = pgTable(
  "supplier_penalties",
  {
    id: serial("id").primaryKey(),
    penaltyCode: varchar("penalty_code", { length: 50 }).notNull(),
    supplierId: integer("supplier_id").notNull(),
    supplierName: varchar("supplier_name", { length: 200 }),
    triggerType: penaltyTriggerTypeEnum("trigger_type").notNull(),
    triggerReferenceId: integer("trigger_reference_id"), // FK to inspection/receipt that triggered
    triggerReferenceType: varchar("trigger_reference_type", { length: 50 }),
    penaltyType: penaltyTypeEnum("penalty_type").default("warning").notNull(),
    description: text("description"),
    occurrenceCount: integer("occurrence_count").default(1).notNull(),
    escalationLevel: integer("escalation_level").default(1).notNull(), // 1-5
    fineAmount: decimal("fine_amount", { precision: 12, scale: 2 }),
    correctiveActionRequired: boolean("corrective_action_required").default(false),
    correctiveActionDeadline: date("corrective_action_deadline"),
    correctiveActionStatus: varchar("corrective_action_status", { length: 20 }), // pending/submitted/accepted/rejected
    isBlacklisted: boolean("is_blacklisted").default(false),
    blacklistEffectiveDate: date("blacklist_effective_date"),
    blacklistReason: text("blacklist_reason"),
    resolvedAt: timestamp("resolved_at", { mode: "string" }),
    resolvedBy: integer("resolved_by"),
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("spen_code_idx").on(table.penaltyCode),
    index("spen_supplier_idx").on(table.supplierId),
    index("spen_trigger_idx").on(table.triggerType),
    index("spen_type_idx").on(table.penaltyType),
    index("spen_blacklist_idx").on(table.isBlacklisted),
    index("spen_active_idx").on(table.isActive),
    index("spen_date_idx").on(table.createdAt),
  ]
);

// ─── 11. Traceability Graph Edges ─────────────────────────────

export const traceabilityGraphEdges = pgTable(
  "traceability_graph_edges",
  {
    id: serial("id").primaryKey(),
    fromEntityType: varchar("from_entity_type", { length: 50 }).notNull(),
    fromEntityId: integer("from_entity_id").notNull(),
    toEntityType: varchar("to_entity_type", { length: 50 }).notNull(),
    toEntityId: integer("to_entity_id").notNull(),
    relationshipType: traceRelationshipTypeEnum("relationship_type").notNull(),
    projectNumber: varchar("project_number", { length: 50 }),
    metadata: jsonb("metadata"), // Additional context
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("tge_from_idx").on(table.fromEntityType, table.fromEntityId),
    index("tge_to_idx").on(table.toEntityType, table.toEntityId),
    index("tge_relationship_idx").on(table.relationshipType),
    index("tge_project_idx").on(table.projectNumber),
  ]
);
