-- Quality inspection tables for IATF 16949 / VDA 6.3 compliance
-- Used by qualityMaterialPerformance service and kiosk workshop terminal

CREATE TABLE IF NOT EXISTS "quality_checkpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" varchar(100) NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"bom_step_id" integer,
	"checkpoint_name" varchar(200) NOT NULL,
	"checkpoint_type" varchar(50) NOT NULL,
	"description" text,
	"acceptance_criteria" text,
	"is_mandatory" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_by" varchar(100),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS "quality_check_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkpoint_id" integer NOT NULL,
	"project_id" varchar(100) NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"inspector_id" varchar(100),
	"inspector_name" varchar(100),
	"result" varchar(20) NOT NULL,
	"score" numeric(5, 2),
	"ccd_image_url" text,
	"ccd_analysis_data" jsonb,
	"defect_count" integer DEFAULT 0,
	"remarks" text,
	"checked_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS "quality_defects" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_result_id" integer NOT NULL,
	"project_id" varchar(100) NOT NULL,
	"process_code" varchar(20) NOT NULL,
	"defect_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"root_cause" text,
	"corrective_action" text,
	"assigned_to" varchar(100),
	"status" varchar(20) DEFAULT 'open',
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_qcp_project" ON "quality_checkpoints" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_qcp_process" ON "quality_checkpoints" ("project_id", "process_code");
CREATE INDEX IF NOT EXISTS "idx_qcr_project" ON "quality_check_results" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_qcr_process" ON "quality_check_results" ("project_id", "process_code");
CREATE INDEX IF NOT EXISTS "idx_qd_project" ON "quality_defects" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_qd_status" ON "quality_defects" ("status");
