CREATE TYPE "public"."agent_autonomy_level" AS ENUM('supervised', 'semi_autonomous', 'autonomous');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('inactive', 'active', 'paused', 'decommissioned');--> statement-breakpoint
CREATE TYPE "public"."agent_task_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_task_type" AS ENUM('document_draft', 'data_analysis', 'code_review', 'report_generation', 'meeting_summary', 'email_draft', 'risk_assessment', 'quality_inspection');--> statement-breakpoint
CREATE TYPE "public"."g_token_ref_type" AS ENUM('task_bid', 'smart_contract', 'skill_capsule', 'admin_adjustment', 'task_execution');--> statement-breakpoint
CREATE TYPE "public"."g_token_tx_type" AS ENUM('task_reward', 'task_expense', 'royalty_income', 'penalty', 'bonus', 'transfer_in', 'transfer_out');--> statement-breakpoint
CREATE TABLE "agent_task_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"task_bid_id" integer,
	"task_type" "agent_task_type" NOT NULL,
	"task_title" varchar(200) NOT NULL,
	"task_input" text,
	"task_output" text,
	"status" "agent_task_status" DEFAULT 'pending' NOT NULL,
	"quality_score" numeric(5, 2),
	"human_review_required" boolean DEFAULT true,
	"human_reviewed_by" integer,
	"human_approved" boolean,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"llm_tokens_used" integer,
	"g_token_reward" numeric(12, 4),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_agent_fleet" (
	"id" serial PRIMARY KEY NOT NULL,
	"master_assistant_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"agent_code" varchar(50) NOT NULL,
	"agent_did" varchar(100) NOT NULL,
	"agent_name" varchar(100) NOT NULL,
	"level" integer NOT NULL,
	"personality_config" text,
	"capability_mask" text,
	"max_task_complexity" integer DEFAULT 1 NOT NULL,
	"autonomy_level" "agent_autonomy_level" DEFAULT 'supervised' NOT NULL,
	"data_scope" varchar(20) DEFAULT 'self',
	"can_bid_tasks" boolean DEFAULT false,
	"max_concurrent_tasks" integer DEFAULT 1,
	"bid_price_range_low" numeric(12, 2) DEFAULT '0',
	"bid_price_range_high" numeric(12, 2) DEFAULT '100',
	"g_token_balance" numeric(14, 4) DEFAULT '0' NOT NULL,
	"total_earned" numeric(14, 4) DEFAULT '0' NOT NULL,
	"total_spent" numeric(14, 4) DEFAULT '0' NOT NULL,
	"task_completion_count" integer DEFAULT 0 NOT NULL,
	"avg_quality_score" numeric(5, 2) DEFAULT '0',
	"reputation_score" numeric(5, 2) DEFAULT '50' NOT NULL,
	"status" "agent_status" DEFAULT 'inactive' NOT NULL,
	"activated_at" timestamp,
	"last_task_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_employee_level" UNIQUE("employee_id","level")
);
--> statement-breakpoint
CREATE TABLE "g_token_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer,
	"employee_id" integer,
	"agent_code" varchar(50),
	"tx_type" "g_token_tx_type" NOT NULL,
	"amount" numeric(14, 4) NOT NULL,
	"balance_after" numeric(14, 4) NOT NULL,
	"reference_type" "g_token_ref_type",
	"reference_id" varchar(100),
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sys_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"author_id" integer,
	"author_name" varchar(100),
	"department" varchar(100),
	"report_type" varchar(50),
	"content_blocks" jsonb,
	"status" varchar(20) DEFAULT 'DRAFT',
	"cover_gradient" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_exec_agent" ON "agent_task_executions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_exec_status" ON "agent_task_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_exec_type" ON "agent_task_executions" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "idx_exec_created" ON "agent_task_executions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_agent_code" ON "ai_agent_fleet" USING btree ("agent_code");--> statement-breakpoint
CREATE INDEX "idx_agent_employee" ON "ai_agent_fleet" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_agent_master" ON "ai_agent_fleet" USING btree ("master_assistant_id");--> statement-breakpoint
CREATE INDEX "idx_agent_status" ON "ai_agent_fleet" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ledger_agent" ON "g_token_ledger" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_employee" ON "g_token_ledger" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_created" ON "g_token_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ledger_tx_type" ON "g_token_ledger" USING btree ("tx_type");--> statement-breakpoint
CREATE INDEX "idx_sys_reports_author" ON "sys_reports" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_sys_reports_status" ON "sys_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sys_reports_type" ON "sys_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "idx_sys_reports_created" ON "sys_reports" USING btree ("created_at");