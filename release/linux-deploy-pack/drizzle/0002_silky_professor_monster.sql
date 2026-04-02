CREATE TYPE "public"."cert_level" AS ENUM('trainee', 'qualified', 'trainer');--> statement-breakpoint
CREATE TYPE "public"."defect_severity" AS ENUM('critical', 'major', 'minor');--> statement-breakpoint
CREATE TYPE "public"."inspection_result" AS ENUM('PASS', 'FAIL', 'DEVIATION', 'REWORK', 'SCRAP');--> statement-breakpoint
CREATE TYPE "public"."capaStatusEnum" AS ENUM('open', 'investigation', 'action_planned', 'implemented', 'verified', 'closed');--> statement-breakpoint
CREATE TYPE "public"."capaTypeEnum" AS ENUM('corrective', 'preventive');--> statement-breakpoint
CREATE TYPE "public"."controlMethodEnum" AS ENUM('visual', 'gauge', 'spc', 'cmm', 'test', 'audit', 'other');--> statement-breakpoint
CREATE TYPE "public"."controlPlanPhaseEnum" AS ENUM('prototype', 'pre_launch', 'production');--> statement-breakpoint
CREATE TYPE "public"."controlPlanStatusEnum" AS ENUM('draft', 'active', 'superseded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."eightDStatusEnum" AS ENUM('open', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'closed', 'verified');--> statement-breakpoint
CREATE TYPE "public"."fmeaActionStatusEnum" AS ENUM('open', 'in_progress', 'completed', 'verified', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fmeaStatusEnum" AS ENUM('draft', 'in_review', 'approved', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."fmeaTypeEnum" AS ENUM('DFMEA', 'PFMEA');--> statement-breakpoint
CREATE TYPE "public"."msaStudyStatusEnum" AS ENUM('planned', 'in_progress', 'completed', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."msaStudyTypeEnum" AS ENUM('gage_rr', 'bias', 'linearity', 'stability', 'attribute_agreement');--> statement-breakpoint
CREATE TYPE "public"."ppapElementStatusEnum" AS ENUM('not_started', 'in_progress', 'completed', 'not_applicable', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ppapLevelEnum" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."ppapStatusEnum" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'interim_approved');--> statement-breakpoint
CREATE TYPE "public"."safetyRuleCategoryEnum" AS ENUM('physical', 'chemical', 'electrical', 'operational');--> statement-breakpoint
CREATE TYPE "public"."safetyRuleSeverityEnum" AS ENUM('fatal', 'critical', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."severityLevelEnum" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '10');--> statement-breakpoint
CREATE TABLE "defect_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(255) NOT NULL,
	"category" varchar(50),
	"severity" "defect_severity" NOT NULL,
	"applicable_stations" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "defect_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_number" varchar(100) NOT NULL,
	"batch_id" varchar(100),
	"material_barcode" varchar(100) NOT NULL,
	"operator_id" varchar(50) NOT NULL,
	"station_id" integer NOT NULL,
	"equipment_params" jsonb,
	"ai_ccd_result" varchar(20),
	"human_final_result" "inspection_result" NOT NULL,
	"cycle_time_seconds" integer,
	"defect_code_id" integer,
	"remarks" text,
	"env_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operator_certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" varchar(50) NOT NULL,
	"station_id" integer NOT NULL,
	"cert_level" "cert_level" DEFAULT 'qualified' NOT NULL,
	"certified_at" timestamp DEFAULT now() NOT NULL,
	"certified_by" varchar(50),
	"valid_until" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "operator_station_unique" UNIQUE("operator_id","station_id")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"process_type" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_quality_checkpoint" boolean DEFAULT false,
	"sop_url" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "production_equipment_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"equipment_code" varchar(50),
	"equipment_name" varchar(200),
	"previous_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"previous_work_order_id" integer,
	"new_work_order_id" integer,
	"notes" text,
	"changed_by" integer,
	"changed_by_name" varchar(100),
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_equipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'idle' NOT NULL,
	"location" varchar(200),
	"current_work_order_id" integer,
	"utilization" numeric(5, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_equipments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "capa_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"capa_code" varchar(50) NOT NULL,
	"eight_d_report_id" integer,
	"project_id" integer,
	"capa_type" "capaTypeEnum" NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"root_cause" text,
	"action_plan" text,
	"responsible_id" integer,
	"responsible_name" varchar(100),
	"target_date" timestamp,
	"completion_date" timestamp,
	"verification_method" text,
	"verification_result" text,
	"effectiveness_check" text,
	"status" "capaStatusEnum" DEFAULT 'open' NOT NULL,
	"closed_by" integer,
	"closed_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "control_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"control_plan_id" integer NOT NULL,
	"item_number" integer NOT NULL,
	"process_step" varchar(200),
	"process_number" varchar(50),
	"machine_tool" varchar(200),
	"characteristic_name" varchar(200) NOT NULL,
	"characteristic_number" varchar(50),
	"characteristic_type" varchar(20),
	"special_characteristic" varchar(10),
	"specification" text,
	"tolerance" varchar(200),
	"control_method" "controlMethodEnum" DEFAULT 'visual' NOT NULL,
	"control_description" text,
	"sample_size" varchar(50),
	"sample_frequency" varchar(100),
	"reaction_plan" text,
	"fmea_item_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "control_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"project_id" integer,
	"fmea_document_id" integer,
	"title" varchar(200) NOT NULL,
	"part_name" varchar(200),
	"part_number" varchar(100),
	"phase" "controlPlanPhaseEnum" DEFAULT 'prototype' NOT NULL,
	"revision" integer DEFAULT 1,
	"status" "controlPlanStatusEnum" DEFAULT 'draft' NOT NULL,
	"customer_approval_date" timestamp,
	"supplier_approval_date" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eight_d_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_code" varchar(50) NOT NULL,
	"project_id" integer,
	"title" varchar(300) NOT NULL,
	"problem_description" text,
	"severity" varchar(20) DEFAULT 'medium',
	"source" varchar(100),
	"customer_id" integer,
	"customer_name" varchar(200),
	"part_number" varchar(100),
	"defect_quantity" integer,
	"team_leader_id" integer,
	"team_members" text,
	"d2_description" text,
	"d2_is_what" text,
	"d2_is_not_what" text,
	"d3_containment_actions" text,
	"d3_implemented_at" timestamp,
	"d4_root_causes" text,
	"d4_analysis_method" varchar(50),
	"d4_verification_data" text,
	"d5_corrective_actions" text,
	"d6_implementation_date" timestamp,
	"d6_verification_result" text,
	"d6_effectiveness_data" text,
	"d7_prevention_actions" text,
	"d7_system_changes" text,
	"d8_lessons_learned" text,
	"d8_team_recognition" text,
	"d8_closure_date" timestamp,
	"current_step" "eightDStatusEnum" DEFAULT 'open' NOT NULL,
	"due_date" timestamp,
	"closed_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmea_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"fmea_item_id" integer NOT NULL,
	"action_description" text NOT NULL,
	"responsible_person" varchar(100),
	"responsible_id" integer,
	"target_date" timestamp,
	"completion_date" timestamp,
	"status" "fmeaActionStatusEnum" DEFAULT 'open' NOT NULL,
	"verification_result" text,
	"evidence" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmea_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"fmea_code" varchar(50) NOT NULL,
	"project_id" integer,
	"fmea_type" "fmeaTypeEnum" NOT NULL,
	"title" varchar(200) NOT NULL,
	"scope" text,
	"product_name" varchar(200),
	"process_name" varchar(200),
	"model_year" varchar(20),
	"team_members" text,
	"status" "fmeaStatusEnum" DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 1,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmea_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"fmea_document_id" integer NOT NULL,
	"item_number" integer NOT NULL,
	"system_element" varchar(200),
	"function_requirement" text,
	"failure_mode" varchar(500) NOT NULL,
	"failure_effect" text,
	"failure_cause" text,
	"severity" integer DEFAULT 1 NOT NULL,
	"occurrence" integer DEFAULT 1 NOT NULL,
	"detection" integer DEFAULT 1 NOT NULL,
	"rpn" integer DEFAULT 1 NOT NULL,
	"action_priority" varchar(2),
	"current_prevention_control" text,
	"current_detection_control" text,
	"revised_severity" integer,
	"revised_occurrence" integer,
	"revised_detection" integer,
	"revised_rpn" integer,
	"revised_action_priority" varchar(2),
	"special_characteristic" varchar(10),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_form_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"jdy_app_id" varchar(64) NOT NULL,
	"jdy_app_name" varchar(200) NOT NULL,
	"jdy_form_id" varchar(64) NOT NULL,
	"jdy_form_name" varchar(200) NOT NULL,
	"target_entity" varchar(50),
	"field_mapping" json,
	"record_count" integer DEFAULT 0,
	"sample_data" json,
	"field_schema" json,
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"last_discovered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jiandaoyun_import_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_code" varchar(64) NOT NULL,
	"run_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"current_phase" varchar(50),
	"current_step" varchar(100),
	"progress_percent" integer DEFAULT 0,
	"total_expected" integer DEFAULT 0,
	"total_processed" integer DEFAULT 0,
	"total_created" integer DEFAULT 0,
	"total_updated" integer DEFAULT 0,
	"total_skipped" integer DEFAULT 0,
	"total_failed" integer DEFAULT 0,
	"phase_results" json,
	"errors" json,
	"import_config" json,
	"started_at" timestamp,
	"completed_at" timestamp,
	"triggered_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jiandaoyun_import_runs_run_code_unique" UNIQUE("run_code")
);
--> statement-breakpoint
CREATE TABLE "msa_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"study_id" integer NOT NULL,
	"operator_id" integer,
	"operator_name" varchar(100),
	"part_number" integer NOT NULL,
	"trial_number" integer NOT NULL,
	"measured_value" numeric(12, 6) NOT NULL,
	"reference_value" numeric(12, 6),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "msa_studies" (
	"id" serial PRIMARY KEY NOT NULL,
	"study_code" varchar(50) NOT NULL,
	"project_id" integer,
	"control_plan_item_id" integer,
	"study_type" "msaStudyTypeEnum" NOT NULL,
	"gauge_name" varchar(200) NOT NULL,
	"gauge_id" varchar(100),
	"gauge_resolution" varchar(50),
	"part_name" varchar(200),
	"characteristic_name" varchar(200),
	"specification" text,
	"tolerance" varchar(100),
	"num_operators" integer DEFAULT 3,
	"num_parts" integer DEFAULT 10,
	"num_trials" integer DEFAULT 3,
	"repeatability" numeric(8, 4),
	"reproducibility" numeric(8, 4),
	"grr_percent" numeric(8, 4),
	"ndc" integer,
	"status" "msaStudyStatusEnum" DEFAULT 'planned' NOT NULL,
	"conclusion" varchar(50),
	"conducted_by" integer,
	"conducted_at" timestamp,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ppap_elements" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"element_number" integer NOT NULL,
	"element_name" varchar(200) NOT NULL,
	"required" smallint DEFAULT 1 NOT NULL,
	"status" "ppapElementStatusEnum" DEFAULT 'not_started' NOT NULL,
	"document_path" text,
	"review_notes" text,
	"completed_by" integer,
	"completed_at" timestamp,
	"verified_by" integer,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ppap_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_code" varchar(50) NOT NULL,
	"project_id" integer,
	"part_name" varchar(200) NOT NULL,
	"part_number" varchar(100) NOT NULL,
	"revision" varchar(20) DEFAULT 'A',
	"customer_id" integer,
	"customer_name" varchar(200),
	"submission_level" "ppapLevelEnum" DEFAULT '3' NOT NULL,
	"submission_reason" varchar(200),
	"status" "ppapStatusEnum" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"approved_by" integer,
	"customer_decision" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" "safetyRuleCategoryEnum" NOT NULL,
	"description" text,
	"material_type" varchar(100),
	"equipment_model" varchar(100),
	"parameter_name" varchar(100) NOT NULL,
	"unit" varchar(20),
	"min_value" numeric(12, 4),
	"max_value" numeric(12, 4),
	"forbidden_values" text,
	"severity" "safetyRuleSeverityEnum" DEFAULT 'warning' NOT NULL,
	"is_active" smallint DEFAULT 1 NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grt_approval_instances" ADD COLUMN "jiandaoyun_id" varchar(64);--> statement-breakpoint
ALTER TABLE "grt_approval_step_records" ADD COLUMN "jiandaoyun_id" varchar(64);--> statement-breakpoint
ALTER TABLE "grt_approval_templates" ADD COLUMN "jiandaoyun_id" varchar(64);--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_defect_code_id_defect_codes_id_fk" FOREIGN KEY ("defect_code_id") REFERENCES "public"."defect_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator_certifications" ADD CONSTRAINT "operator_certifications_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "defect_codes_code_idx" ON "defect_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "defect_codes_severity_idx" ON "defect_codes" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "exec_logs_project_station_idx" ON "execution_logs" USING btree ("project_number","station_id","created_at");--> statement-breakpoint
CREATE INDEX "exec_logs_barcode_idx" ON "execution_logs" USING btree ("material_barcode");--> statement-breakpoint
CREATE INDEX "exec_logs_batch_idx" ON "execution_logs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "exec_logs_operator_idx" ON "execution_logs" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "exec_logs_result_idx" ON "execution_logs" USING btree ("human_final_result");--> statement-breakpoint
CREATE INDEX "op_cert_operator_idx" ON "operator_certifications" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "op_cert_valid_until_idx" ON "operator_certifications" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "stations_code_idx" ON "stations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "stations_sort_order_idx" ON "stations" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_equip_hist_equipment" ON "production_equipment_status_history" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "idx_equip_hist_changed_at" ON "production_equipment_status_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_prod_equip_code" ON "production_equipments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_prod_equip_status" ON "production_equipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prod_equip_type" ON "production_equipments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_prod_equip_location" ON "production_equipments" USING btree ("location");--> statement-breakpoint
CREATE INDEX "capa_records_code_idx" ON "capa_records" USING btree ("capa_code");--> statement-breakpoint
CREATE INDEX "capa_records_8d_idx" ON "capa_records" USING btree ("eight_d_report_id");--> statement-breakpoint
CREATE INDEX "capa_records_project_idx" ON "capa_records" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "control_plan_items_plan_idx" ON "control_plan_items" USING btree ("control_plan_id");--> statement-breakpoint
CREATE INDEX "control_plans_code_idx" ON "control_plans" USING btree ("plan_code");--> statement-breakpoint
CREATE INDEX "control_plans_project_idx" ON "control_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "control_plans_fmea_idx" ON "control_plans" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "eight_d_reports_code_idx" ON "eight_d_reports" USING btree ("report_code");--> statement-breakpoint
CREATE INDEX "eight_d_reports_project_idx" ON "eight_d_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "eight_d_reports_step_idx" ON "eight_d_reports" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "fmea_actions_item_idx" ON "fmea_actions" USING btree ("fmea_item_id");--> statement-breakpoint
CREATE INDEX "fmea_actions_status_idx" ON "fmea_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fmea_documents_code_idx" ON "fmea_documents" USING btree ("fmea_code");--> statement-breakpoint
CREATE INDEX "fmea_documents_project_idx" ON "fmea_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "fmea_documents_type_idx" ON "fmea_documents" USING btree ("fmea_type");--> statement-breakpoint
CREATE INDEX "fmea_items_document_idx" ON "fmea_items" USING btree ("fmea_document_id");--> statement-breakpoint
CREATE INDEX "fmea_items_rpn_idx" ON "fmea_items" USING btree ("rpn");--> statement-breakpoint
CREATE INDEX "idx_jdy_form_mappings_app" ON "jiandaoyun_form_mappings" USING btree ("jdy_app_id");--> statement-breakpoint
CREATE INDEX "idx_jdy_form_mappings_form" ON "jiandaoyun_form_mappings" USING btree ("jdy_form_id");--> statement-breakpoint
CREATE INDEX "idx_jdy_form_mappings_target" ON "jiandaoyun_form_mappings" USING btree ("target_entity");--> statement-breakpoint
CREATE INDEX "idx_jdy_import_runs_code" ON "jiandaoyun_import_runs" USING btree ("run_code");--> statement-breakpoint
CREATE INDEX "idx_jdy_import_runs_status" ON "jiandaoyun_import_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "msa_measurements_study_idx" ON "msa_measurements" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "msa_studies_code_idx" ON "msa_studies" USING btree ("study_code");--> statement-breakpoint
CREATE INDEX "msa_studies_project_idx" ON "msa_studies" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ppap_elements_submission_idx" ON "ppap_elements" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "ppap_submissions_code_idx" ON "ppap_submissions" USING btree ("submission_code");--> statement-breakpoint
CREATE INDEX "ppap_submissions_project_idx" ON "ppap_submissions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "safety_rules_code_idx" ON "safety_rules" USING btree ("rule_code");--> statement-breakpoint
CREATE INDEX "safety_rules_material_idx" ON "safety_rules" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "safety_rules_equipment_idx" ON "safety_rules" USING btree ("equipment_model");--> statement-breakpoint
CREATE INDEX "approval_instance_jdy_id_idx" ON "grt_approval_instances" USING btree ("jiandaoyun_id");--> statement-breakpoint
CREATE INDEX "approval_step_jdy_id_idx" ON "grt_approval_step_records" USING btree ("jiandaoyun_id");--> statement-breakpoint
CREATE INDEX "approval_template_jdy_id_idx" ON "grt_approval_templates" USING btree ("jiandaoyun_id");