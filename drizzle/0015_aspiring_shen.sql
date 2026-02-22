CREATE TYPE "public"."delivery_registration_status_enum" AS ENUM('pending', 'received', 'qc_pending', 'qc_passed', 'qc_failed', 'warehouse_confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."framework_agreement_status_enum" AS ENUM('draft', 'active', 'expired', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."payment_workflow_status_enum" AS ENUM('pending', 'in_progress', 'approved', 'rejected', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_workflow_step_enum" AS ENUM('payment_term_check', 'quality_feedback_ok', 'bu_dept_approval', 'quality_prod_approval', 'payment_approved', 'procurement_confirmed', 'supplier_confirmed', 'contract_archived');--> statement-breakpoint
CREATE TYPE "public"."qualification_result_enum" AS ENUM('qualified', 'conditional', 'failed');--> statement-breakpoint
CREATE TYPE "public"."qualification_status_enum" AS ENUM('draft', 'in_progress', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."qualification_type_enum" AS ENUM('initial', 'annual', 'special');--> statement-breakpoint
CREATE TYPE "public"."quality_loss_agreement_status_enum" AS ENUM('draft', 'signed', 'active', 'expired', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."quality_loss_incident_status_enum" AS ENUM('reported', 'investigating', 'confirmed', 'penalty_applied', 'deducted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."report_verification_status_enum" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."rfq_bidding_type_enum" AS ENUM('sealed', 'open', 'reverse', 'negotiated');--> statement-breakpoint
CREATE TYPE "public"."rfq_quote_status_enum" AS ENUM('submitted', 'under_review', 'shortlisted', 'awarded', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."rfq_status_enum" AS ENUM('draft', 'published', 'bidding', 'evaluating', 'awarded', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."small_value_status_enum" AS ENUM('draft', 'pending_supervisor', 'supervisor_approved', 'procurement_confirmed', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."barcode_format_enum" AS ENUM('QR', 'CODE128', 'EAN13', 'DATAMATRIX');--> statement-breakpoint
CREATE TYPE "public"."bom_match_result_enum" AS ENUM('MATCH', 'MISMATCH', 'SUBSTITUTE', 'NOT_FOUND');--> statement-breakpoint
CREATE TYPE "public"."disposal_method_enum" AS ENUM('recycle', 'destroy', 'return', 'salvage');--> statement-breakpoint
CREATE TYPE "public"."inspection_disposition_enum" AS ENUM('accept', 'reject', 'rework', 'return_to_supplier', 'hold');--> statement-breakpoint
CREATE TYPE "public"."inspection_result_enum" AS ENUM('PASS', 'FAIL', 'CONDITIONAL', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."maintenance_type_enum" AS ENUM('preventive', 'corrective', 'predictive', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."penalty_trigger_type_enum" AS ENUM('quality_reject', 'late_delivery', 'missing_report', 'safety_violation');--> statement-breakpoint
CREATE TYPE "public"."penalty_type_enum" AS ENUM('warning', 'fine', 'probation', 'suspension', 'blacklist');--> statement-breakpoint
CREATE TYPE "public"."trace_relationship_type_enum" AS ENUM('supplied_to', 'inspected_as', 'assembled_in', 'scrapped_from', 'resolved_by', 'consumed_by', 'maintained_with');--> statement-breakpoint
CREATE TABLE "delivery_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"registration_code" varchar(50) NOT NULL,
	"purchase_order_id" integer,
	"po_number" varchar(50),
	"supplier_id" integer,
	"supplier_name" varchar(200),
	"material_code" varchar(100),
	"material_name" varchar(200),
	"delivered_quantity" numeric(12, 4),
	"unit" varchar(20),
	"tracking_number" varchar(100),
	"packing_list" jsonb,
	"test_report_urls" jsonb,
	"qc_inspection_id" integer,
	"warehouse_receipt_id" integer,
	"received_by_name" varchar(100),
	"received_at" timestamp,
	"notes" text,
	"status" "delivery_registration_status_enum" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dr_uk_registration_code" UNIQUE("registration_code")
);
--> statement-breakpoint
CREATE TABLE "framework_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_code" varchar(50) NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200),
	"title" varchar(300),
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"pricing_items" jsonb,
	"total_budget" numeric(14, 2) DEFAULT '0',
	"spent_amount" numeric(14, 2) DEFAULT '0',
	"payment_terms" varchar(200),
	"currency" varchar(10) DEFAULT 'CNY',
	"notes" text,
	"status" "framework_agreement_status_enum" DEFAULT 'draft',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fa_uk_agreement_code" UNIQUE("agreement_code")
);
--> statement-breakpoint
CREATE TABLE "payment_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_code" varchar(50) NOT NULL,
	"invoice_id" integer,
	"invoice_number" varchar(50),
	"supplier_id" integer,
	"supplier_name" varchar(200),
	"payment_amount" numeric(14, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CNY',
	"current_step" "payment_workflow_step_enum" DEFAULT 'payment_term_check',
	"payment_due_date" date,
	"payment_term_expired" boolean DEFAULT false,
	"quality_feedback_ok" boolean DEFAULT false,
	"quality_feedback_at" timestamp,
	"bu_approved_by" integer,
	"bu_approved_at" timestamp,
	"quality_approved_by" integer,
	"quality_approved_at" timestamp,
	"payment_approved_by" integer,
	"payment_approved_at" timestamp,
	"procurement_confirmed_by" integer,
	"procurement_confirmed_at" timestamp,
	"supplier_confirm_token" varchar(100),
	"supplier_confirmed_at" timestamp,
	"contract_archived" boolean DEFAULT false,
	"contract_archived_at" timestamp,
	"quality_deduction_amount" numeric(12, 2) DEFAULT '0',
	"net_payment_amount" numeric(14, 2),
	"notes" text,
	"status" "payment_workflow_status_enum" DEFAULT 'pending',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pw_uk_workflow_code" UNIQUE("workflow_code")
);
--> statement-breakpoint
CREATE TABLE "quality_loss_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_code" varchar(50) NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200),
	"framework_agreement_id" integer,
	"quality_loss_threshold" numeric(14, 2),
	"quality_loss_rate_threshold" numeric(5, 4),
	"penalty_formula" text,
	"max_penalty_amount" numeric(14, 2),
	"effective_date" date,
	"expiry_date" date,
	"signed_by" varchar(100),
	"signed_at" timestamp,
	"witnessed_by" varchar(100),
	"notes" text,
	"status" "quality_loss_agreement_status_enum" DEFAULT 'draft',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qla_uk_agreement_code" UNIQUE("agreement_code")
);
--> statement-breakpoint
CREATE TABLE "quality_loss_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"incident_code" varchar(50) NOT NULL,
	"quality_loss_agreement_id" integer,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200),
	"purchase_order_id" integer,
	"po_number" varchar(50),
	"material_code" varchar(100),
	"material_name" varchar(200),
	"loss_amount" numeric(14, 2) NOT NULL,
	"loss_description" text,
	"root_cause" text,
	"evidence_urls" jsonb,
	"penalty_triggered" boolean DEFAULT false,
	"penalty_amount" numeric(14, 2) DEFAULT '0',
	"supplier_acknowledged" boolean DEFAULT false,
	"supplier_acknowledged_at" timestamp,
	"deduction_from_payment_id" integer,
	"notes" text,
	"status" "quality_loss_incident_status_enum" DEFAULT 'reported',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qli_uk_incident_code" UNIQUE("incident_code")
);
--> statement-breakpoint
CREATE TABLE "rfq_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_code" varchar(50) NOT NULL,
	"title" varchar(300),
	"material_code" varchar(100),
	"material_name" varchar(200),
	"quantity" numeric(12, 4),
	"unit" varchar(20),
	"bidding_type" "rfq_bidding_type_enum" DEFAULT 'sealed',
	"deadline" timestamp,
	"evaluation_criteria" jsonb,
	"invited_supplier_ids" jsonb,
	"selected_quote_id" integer,
	"generated_po_id" integer,
	"framework_agreement_id" integer,
	"notes" text,
	"status" "rfq_status_enum" DEFAULT 'draft',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rfq_uk_rfq_code" UNIQUE("rfq_code")
);
--> statement-breakpoint
CREATE TABLE "rfq_supplier_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_event_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200),
	"unit_price" numeric(12, 4),
	"total_price" numeric(14, 2),
	"currency" varchar(10) DEFAULT 'CNY',
	"delivery_days" integer,
	"warranty_months" integer,
	"payment_terms" varchar(200),
	"technical_notes" text,
	"attachment_urls" jsonb,
	"price_score" numeric(5, 2),
	"quality_score" numeric(5, 2),
	"delivery_score" numeric(5, 2),
	"total_score" numeric(5, 2),
	"rank" integer,
	"status" "rfq_quote_status_enum" DEFAULT 'submitted',
	"submitted_at" timestamp DEFAULT now(),
	"evaluated_at" timestamp,
	"evaluated_by" integer
);
--> statement-breakpoint
CREATE TABLE "small_value_procurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_code" varchar(50) NOT NULL,
	"material_name" varchar(200) NOT NULL,
	"material_code" varchar(100),
	"specification" varchar(200),
	"quantity" integer DEFAULT 1,
	"unit" varchar(20) DEFAULT '件',
	"estimated_unit_price" numeric(10, 2) NOT NULL,
	"estimated_total_amount" numeric(12, 2),
	"purpose" text,
	"requested_by" integer,
	"requested_by_name" varchar(100),
	"supervisor_id" integer,
	"supervisor_name" varchar(100),
	"supervisor_approved_at" timestamp,
	"supervisor_rejection_reason" text,
	"procurement_officer_id" integer,
	"procurement_officer_name" varchar(100),
	"procurement_confirmed_at" timestamp,
	"assigned_supplier_id" integer,
	"assigned_supplier_name" varchar(200),
	"annual_contract_id" integer,
	"actual_unit_price" numeric(10, 2),
	"notes" text,
	"status" "small_value_status_enum" DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "svp_uk_request_code" UNIQUE("request_code")
);
--> statement-breakpoint
CREATE TABLE "supplier_qualifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200),
	"qualification_type" "qualification_type_enum" DEFAULT 'initial',
	"audit_date" date,
	"auditor_name" varchar(100),
	"auditor_id" integer,
	"iso_system_certifications" jsonb,
	"special_requirements" jsonb,
	"quality_system_score" numeric(5, 2),
	"process_capability_score" numeric(5, 2),
	"delivery_capability_score" numeric(5, 2),
	"overall_score" numeric(5, 2),
	"overall_result" "qualification_result_enum",
	"valid_until" date,
	"next_audit_date" date,
	"attachment_urls" jsonb,
	"notes" text,
	"status" "qualification_status_enum" DEFAULT 'draft',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_report_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200),
	"document_type" varchar(50) NOT NULL,
	"document_title" varchar(300),
	"file_url" text,
	"file_size" integer,
	"related_po_number" varchar(50),
	"related_material_code" varchar(100),
	"expiry_date" date,
	"verification_status" "report_verification_status_enum" DEFAULT 'pending',
	"verified_by" integer,
	"verified_at" timestamp,
	"rejection_reason" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assembly_bom_scan_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_number" varchar(50) NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"scanned_barcode" varchar(200) NOT NULL,
	"resolved_material_code" varchar(100),
	"bom_item_id" integer,
	"expected_material_code" varchar(100),
	"bom_match_result" "bom_match_result_enum" NOT NULL,
	"deviation_confirmed" boolean DEFAULT false,
	"deviation_reason" text,
	"deviation_confirmed_by" integer,
	"deviation_confirmed_at" timestamp,
	"bom_adjustment_applied" boolean DEFAULT false,
	"lot_number" varchar(100),
	"serial_number" varchar(100),
	"scanned_by" integer,
	"scanned_by_name" varchar(100),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assembly_labor_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_number" varchar(50) NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"worker_id" integer NOT NULL,
	"worker_name" varchar(100),
	"clock_in_time" timestamp NOT NULL,
	"clock_out_time" timestamp,
	"net_work_minutes" integer,
	"planned_minutes" integer,
	"efficiency_percent" numeric(6, 2),
	"quality_result" varchar(20),
	"execution_log_id" integer,
	"defects_found" integer DEFAULT 0,
	"rework_minutes" integer DEFAULT 0,
	"confirmed_by_worker" boolean DEFAULT false,
	"confirmed_by_supervisor" boolean DEFAULT false,
	"supervisor_id" integer,
	"supervisor_confirmed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_quality_complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"complaint_code" varchar(50) NOT NULL,
	"customer_id" integer,
	"customer_name" varchar(200),
	"project_number" varchar(50),
	"equipment_serial_number" varchar(100),
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"description" text NOT NULL,
	"affected_parts" jsonb,
	"traced_lot_numbers" jsonb,
	"traced_supplier_ids" jsonb,
	"eight_d_report_id" integer,
	"capa_id" integer,
	"design_change_required" boolean DEFAULT false,
	"ecn_number" varchar(50),
	"bom_version_id" integer,
	"fmea_updated" boolean DEFAULT false,
	"control_plan_updated" boolean DEFAULT false,
	"satisfaction_score" integer,
	"resolution_date" timestamp,
	"root_cause" text,
	"corrective_action" text,
	"reported_by" integer,
	"assigned_to" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_maintenance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"maintenance_code" varchar(50) NOT NULL,
	"equipment_id" integer NOT NULL,
	"equipment_name" varchar(200),
	"equipment_code" varchar(50),
	"maintenance_type" "maintenance_type_enum" DEFAULT 'preventive' NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"scheduled_date" date,
	"started_at" timestamp,
	"completed_at" timestamp,
	"downtime_minutes" integer DEFAULT 0,
	"work_performed" text,
	"findings" text,
	"parts_consumed" jsonb,
	"labor_cost" numeric(12, 2) DEFAULT '0',
	"parts_cost" numeric(12, 2) DEFAULT '0',
	"total_cost" numeric(12, 2) DEFAULT '0',
	"next_maintenance_date" date,
	"performed_by" integer,
	"performed_by_name" varchar(100),
	"approved_by" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incoming_inspection_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspection_code" varchar(50) NOT NULL,
	"purchase_receipt_id" integer,
	"lot_id" integer,
	"label_id" integer,
	"material_code" varchar(100) NOT NULL,
	"material_name" varchar(200),
	"supplier_id" integer,
	"supplier_name" varchar(200),
	"po_number" varchar(50),
	"inspected_quantity" numeric(12, 4),
	"sample_size" integer,
	"defect_count" integer DEFAULT 0,
	"has_test_report" boolean DEFAULT false NOT NULL,
	"test_report_url" text,
	"test_report_grt_material_match" boolean DEFAULT false,
	"test_report_order_match" boolean DEFAULT false,
	"inspection_result" "inspection_result_enum" DEFAULT 'PENDING' NOT NULL,
	"disposition" "inspection_disposition_enum" DEFAULT 'hold',
	"disposition_reason" text,
	"measurement_data" jsonb,
	"control_plan_id" integer,
	"eight_d_report_id" integer,
	"inspected_by" integer,
	"inspected_by_name" varchar(100),
	"inspected_at" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrap_disposal_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrap_code" varchar(50) NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"material_name" varchar(200),
	"lot_number" varchar(100),
	"serial_number" varchar(100),
	"quantity" numeric(12, 4) DEFAULT '1',
	"unit" varchar(20),
	"scrap_reason" text NOT NULL,
	"scrap_category" varchar(50),
	"project_number" varchar(50),
	"process_code" varchar(20),
	"authorized_by" integer NOT NULL,
	"authorized_by_name" varchar(100),
	"authorized_at" timestamp,
	"disposal_method" "disposal_method_enum" DEFAULT 'recycle' NOT NULL,
	"disposal_date" date,
	"replacement_required" boolean DEFAULT false,
	"replacement_purchase_request_id" integer,
	"supplier_penalty_id" integer,
	"unit_cost" numeric(12, 2),
	"total_scrap_cost" numeric(12, 2),
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spare_part_consumption_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"spare_part_id" integer NOT NULL,
	"maintenance_record_id" integer,
	"equipment_id" integer,
	"equipment_name" varchar(200),
	"quantity_consumed" integer NOT NULL,
	"previous_stock" integer,
	"new_stock" integer,
	"reason" text,
	"auto_reorder_triggered" boolean DEFAULT false,
	"purchase_request_id" integer,
	"consumed_by" integer,
	"consumed_by_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spare_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_code" varchar(50) NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"material_name" varchar(200) NOT NULL,
	"specification" varchar(200),
	"category" varchar(50),
	"applicable_equipment_types" jsonb,
	"min_stock_level" integer DEFAULT 0,
	"reorder_point" integer DEFAULT 0,
	"max_stock_level" integer,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"reserved_stock" integer DEFAULT 0,
	"auto_reorder_enabled" boolean DEFAULT false,
	"preferred_supplier_id" integer,
	"preferred_supplier_name" varchar(200),
	"unit_price" numeric(12, 2),
	"avg_monthly_consumption" numeric(10, 2),
	"lead_time_days" integer,
	"is_critical" boolean DEFAULT false,
	"warehouse_id" integer,
	"location_code" varchar(50),
	"last_reorder_date" date,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_penalties" (
	"id" serial PRIMARY KEY NOT NULL,
	"penalty_code" varchar(50) NOT NULL,
	"supplier_id" integer NOT NULL,
	"supplier_name" varchar(200),
	"trigger_type" "penalty_trigger_type_enum" NOT NULL,
	"trigger_reference_id" integer,
	"trigger_reference_type" varchar(50),
	"penalty_type" "penalty_type_enum" DEFAULT 'warning' NOT NULL,
	"description" text,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"escalation_level" integer DEFAULT 1 NOT NULL,
	"fine_amount" numeric(12, 2),
	"corrective_action_required" boolean DEFAULT false,
	"corrective_action_deadline" date,
	"corrective_action_status" varchar(20),
	"is_blacklisted" boolean DEFAULT false,
	"blacklist_effective_date" date,
	"blacklist_reason" text,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_shipment_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_serial_number" varchar(100) NOT NULL,
	"supplier_id" integer,
	"supplier_name" varchar(200),
	"project_number" varchar(50),
	"bom_product_code" varchar(100),
	"material_code" varchar(100) NOT NULL,
	"material_name" varchar(200),
	"po_number" varchar(50),
	"quantity" numeric(12, 4),
	"unit" varchar(20),
	"batch_number" varchar(100),
	"production_date" date,
	"expiry_date" date,
	"barcode_data" text,
	"barcode_format" "barcode_format_enum" DEFAULT 'QR',
	"is_validated" boolean DEFAULT false,
	"validation_errors" text,
	"print_count" integer DEFAULT 0,
	"last_printed_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traceability_graph_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_entity_type" varchar(50) NOT NULL,
	"from_entity_id" integer NOT NULL,
	"to_entity_type" varchar(50) NOT NULL,
	"to_entity_id" integer NOT NULL,
	"relationship_type" "trace_relationship_type_enum" NOT NULL,
	"project_number" varchar(50),
	"metadata" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "procurementClassification" varchar(50) DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "reorderPoint" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "reorderPrOwnerId" integer;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "reorderPrOwnerName" varchar(100);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "qualificationStatus" varchar(50) DEFAULT 'qualified';--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "qualificationExpiry" varchar(20);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "portalLoginEmail" varchar(100);--> statement-breakpoint
CREATE INDEX "dr_po_idx" ON "delivery_registrations" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "dr_supplier_idx" ON "delivery_registrations" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "dr_status_idx" ON "delivery_registrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fa_supplier_idx" ON "framework_agreements" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "fa_status_idx" ON "framework_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fa_end_date_idx" ON "framework_agreements" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "pw_invoice_idx" ON "payment_workflows" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "pw_supplier_idx" ON "payment_workflows" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "pw_status_idx" ON "payment_workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pw_step_idx" ON "payment_workflows" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "pw_due_date_idx" ON "payment_workflows" USING btree ("payment_due_date");--> statement-breakpoint
CREATE INDEX "qla_supplier_idx" ON "quality_loss_agreements" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "qla_status_idx" ON "quality_loss_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "qla_expiry_idx" ON "quality_loss_agreements" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "qli_agreement_idx" ON "quality_loss_incidents" USING btree ("quality_loss_agreement_id");--> statement-breakpoint
CREATE INDEX "qli_supplier_idx" ON "quality_loss_incidents" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "qli_status_idx" ON "quality_loss_incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "qli_penalty_idx" ON "quality_loss_incidents" USING btree ("penalty_triggered");--> statement-breakpoint
CREATE INDEX "rfq_status_idx" ON "rfq_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rfq_material_idx" ON "rfq_events" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "rfq_deadline_idx" ON "rfq_events" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "rfq_quote_rfq_idx" ON "rfq_supplier_quotes" USING btree ("rfq_event_id");--> statement-breakpoint
CREATE INDEX "rfq_quote_supplier_idx" ON "rfq_supplier_quotes" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "rfq_quote_status_idx" ON "rfq_supplier_quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "svp_status_idx" ON "small_value_procurements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "svp_requested_by_idx" ON "small_value_procurements" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "sq_supplier_idx" ON "supplier_qualifications" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "sq_type_idx" ON "supplier_qualifications" USING btree ("qualification_type");--> statement-breakpoint
CREATE INDEX "sq_result_idx" ON "supplier_qualifications" USING btree ("overall_result");--> statement-breakpoint
CREATE INDEX "sq_valid_until_idx" ON "supplier_qualifications" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "sq_status_idx" ON "supplier_qualifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "srs_supplier_idx" ON "supplier_report_submissions" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "srs_doc_type_idx" ON "supplier_report_submissions" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "srs_verification_idx" ON "supplier_report_submissions" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "absl_project_process_idx" ON "assembly_bom_scan_logs" USING btree ("project_number","process_code");--> statement-breakpoint
CREATE INDEX "absl_barcode_idx" ON "assembly_bom_scan_logs" USING btree ("scanned_barcode");--> statement-breakpoint
CREATE INDEX "absl_material_idx" ON "assembly_bom_scan_logs" USING btree ("resolved_material_code");--> statement-breakpoint
CREATE INDEX "absl_bom_item_idx" ON "assembly_bom_scan_logs" USING btree ("bom_item_id");--> statement-breakpoint
CREATE INDEX "absl_result_idx" ON "assembly_bom_scan_logs" USING btree ("bom_match_result");--> statement-breakpoint
CREATE INDEX "alc_project_process_idx" ON "assembly_labor_confirmations" USING btree ("project_number","process_code");--> statement-breakpoint
CREATE INDEX "alc_worker_idx" ON "assembly_labor_confirmations" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "alc_date_idx" ON "assembly_labor_confirmations" USING btree ("clock_in_time");--> statement-breakpoint
CREATE INDEX "alc_exec_log_idx" ON "assembly_labor_confirmations" USING btree ("execution_log_id");--> statement-breakpoint
CREATE INDEX "cqc_code_idx" ON "customer_quality_complaints" USING btree ("complaint_code");--> statement-breakpoint
CREATE INDEX "cqc_customer_idx" ON "customer_quality_complaints" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "cqc_project_idx" ON "customer_quality_complaints" USING btree ("project_number");--> statement-breakpoint
CREATE INDEX "cqc_severity_idx" ON "customer_quality_complaints" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "cqc_status_idx" ON "customer_quality_complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cqc_8d_idx" ON "customer_quality_complaints" USING btree ("eight_d_report_id");--> statement-breakpoint
CREATE INDEX "cqc_date_idx" ON "customer_quality_complaints" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "emr_code_idx" ON "equipment_maintenance_records" USING btree ("maintenance_code");--> statement-breakpoint
CREATE INDEX "emr_equipment_idx" ON "equipment_maintenance_records" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "emr_type_idx" ON "equipment_maintenance_records" USING btree ("maintenance_type");--> statement-breakpoint
CREATE INDEX "emr_status_idx" ON "equipment_maintenance_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "emr_scheduled_idx" ON "equipment_maintenance_records" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "emr_next_idx" ON "equipment_maintenance_records" USING btree ("next_maintenance_date");--> statement-breakpoint
CREATE INDEX "iir_code_idx" ON "incoming_inspection_records" USING btree ("inspection_code");--> statement-breakpoint
CREATE INDEX "iir_receipt_idx" ON "incoming_inspection_records" USING btree ("purchase_receipt_id");--> statement-breakpoint
CREATE INDEX "iir_lot_idx" ON "incoming_inspection_records" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "iir_material_idx" ON "incoming_inspection_records" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "iir_supplier_idx" ON "incoming_inspection_records" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "iir_result_idx" ON "incoming_inspection_records" USING btree ("inspection_result");--> statement-breakpoint
CREATE INDEX "iir_date_idx" ON "incoming_inspection_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sdr_code_idx" ON "scrap_disposal_records" USING btree ("scrap_code");--> statement-breakpoint
CREATE INDEX "sdr_material_idx" ON "scrap_disposal_records" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "sdr_lot_idx" ON "scrap_disposal_records" USING btree ("lot_number");--> statement-breakpoint
CREATE INDEX "sdr_project_idx" ON "scrap_disposal_records" USING btree ("project_number");--> statement-breakpoint
CREATE INDEX "sdr_method_idx" ON "scrap_disposal_records" USING btree ("disposal_method");--> statement-breakpoint
CREATE INDEX "sdr_date_idx" ON "scrap_disposal_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "spcl_spare_part_idx" ON "spare_part_consumption_logs" USING btree ("spare_part_id");--> statement-breakpoint
CREATE INDEX "spcl_maintenance_idx" ON "spare_part_consumption_logs" USING btree ("maintenance_record_id");--> statement-breakpoint
CREATE INDEX "spcl_equipment_idx" ON "spare_part_consumption_logs" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "spcl_date_idx" ON "spare_part_consumption_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sp_part_code_idx" ON "spare_parts" USING btree ("part_code");--> statement-breakpoint
CREATE INDEX "sp_material_idx" ON "spare_parts" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "sp_category_idx" ON "spare_parts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "sp_critical_idx" ON "spare_parts" USING btree ("is_critical");--> statement-breakpoint
CREATE INDEX "sp_stock_alert_idx" ON "spare_parts" USING btree ("current_stock","reorder_point");--> statement-breakpoint
CREATE INDEX "spen_code_idx" ON "supplier_penalties" USING btree ("penalty_code");--> statement-breakpoint
CREATE INDEX "spen_supplier_idx" ON "supplier_penalties" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "spen_trigger_idx" ON "supplier_penalties" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "spen_type_idx" ON "supplier_penalties" USING btree ("penalty_type");--> statement-breakpoint
CREATE INDEX "spen_blacklist_idx" ON "supplier_penalties" USING btree ("is_blacklisted");--> statement-breakpoint
CREATE INDEX "spen_active_idx" ON "supplier_penalties" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "spen_date_idx" ON "supplier_penalties" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ssl_supplier_idx" ON "supplier_shipment_labels" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "ssl_material_idx" ON "supplier_shipment_labels" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "ssl_po_idx" ON "supplier_shipment_labels" USING btree ("po_number");--> statement-breakpoint
CREATE INDEX "ssl_project_idx" ON "supplier_shipment_labels" USING btree ("project_number");--> statement-breakpoint
CREATE INDEX "ssl_barcode_idx" ON "supplier_shipment_labels" USING btree ("supplier_serial_number");--> statement-breakpoint
CREATE INDEX "tge_from_idx" ON "traceability_graph_edges" USING btree ("from_entity_type","from_entity_id");--> statement-breakpoint
CREATE INDEX "tge_to_idx" ON "traceability_graph_edges" USING btree ("to_entity_type","to_entity_id");--> statement-breakpoint
CREATE INDEX "tge_relationship_idx" ON "traceability_graph_edges" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "tge_project_idx" ON "traceability_graph_edges" USING btree ("project_number");