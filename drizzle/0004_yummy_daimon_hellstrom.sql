CREATE TYPE "public"."ai_gen_source" AS ENUM('template_generation', 'test_suggestion', 'case_optimization', 'risk_analysis');--> statement-breakpoint
CREATE TYPE "public"."test_case_category" AS ENUM('functional', 'performance', 'safety', 'integration', 'regression', 'acceptance');--> statement-breakpoint
CREATE TYPE "public"."test_case_phase" AS ENUM('setup', 'execution', 'verification', 'teardown');--> statement-breakpoint
CREATE TYPE "public"."test_case_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."test_execution_env" AS ENUM('dev', 'staging', 'prod', 'field', 'lab');--> statement-breakpoint
CREATE TYPE "public"."test_execution_status" AS ENUM('planned', 'in_progress', 'paused', 'completed', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."test_result_severity" AS ENUM('critical', 'major', 'minor', 'cosmetic');--> statement-breakpoint
CREATE TYPE "public"."test_result_status" AS ENUM('not_started', 'pass', 'fail', 'blocked', 'skipped', 'partial');--> statement-breakpoint
CREATE TYPE "public"."test_template_domain" AS ENUM('software_uat', 'plc_test', 'fat_checklist', 'sat_checklist', 'custom');--> statement-breakpoint
CREATE TYPE "public"."test_template_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "ai_generation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"source" "ai_gen_source" NOT NULL,
	"prompt_input_conditions" json NOT NULL,
	"model_used" varchar(100) NOT NULL,
	"model_version" varchar(50),
	"response_tokens" integer,
	"prompt_tokens" integer,
	"total_tokens" integer,
	"generated_content" json,
	"confidence_score" numeric(5, 4),
	"user_accepted" boolean,
	"user_modifications" text,
	"generated_by" integer,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"code" varchar(50),
	"title" varchar(300) NOT NULL,
	"description" text,
	"phase" "test_case_phase" DEFAULT 'execution' NOT NULL,
	"category" "test_case_category" DEFAULT 'functional' NOT NULL,
	"priority" "test_case_priority" DEFAULT 'medium' NOT NULL,
	"preconditions" text,
	"steps" json,
	"expected_result" text,
	"required_role" varchar(50),
	"skill_level" varchar(30),
	"estimated_hours" numeric(6, 2),
	"automatable" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"project_id" integer,
	"execution_name" varchar(200) NOT NULL,
	"status" "test_execution_status" DEFAULT 'planned' NOT NULL,
	"environment" "test_execution_env" NOT NULL,
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"lead_user_id" integer,
	"team_user_ids" json,
	"total_cases" integer DEFAULT 0,
	"passed_cases" integer DEFAULT 0,
	"failed_cases" integer DEFAULT 0,
	"blocked_cases" integer DEFAULT 0,
	"overall_score" numeric(5, 2),
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"execution_id" integer NOT NULL,
	"test_case_id" integer NOT NULL,
	"status" "test_result_status" DEFAULT 'not_started' NOT NULL,
	"executed_by" integer,
	"executed_at" timestamp,
	"actual_hours" numeric(6, 2),
	"bug_severity" "test_result_severity",
	"bug_description" text,
	"bug_ticket_url" varchar(500),
	"evidence_urls" json,
	"notes" text,
	"retest_of" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"domain" "test_template_domain" NOT NULL,
	"status" "test_template_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_template_id" integer,
	"description" text,
	"scope" text,
	"applicable_phases" json,
	"required_roles" json,
	"tags" json,
	"estimated_total_hours" numeric(8, 2),
	"passing_score_percent" integer DEFAULT 80,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_template_id_test_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."test_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_template_id_test_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."test_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_template_id_test_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."test_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_execution_id_test_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."test_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_gen_logs_template_idx" ON "ai_generation_logs" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "ai_gen_logs_source_idx" ON "ai_generation_logs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "ai_gen_logs_model_idx" ON "ai_generation_logs" USING btree ("model_used");--> statement-breakpoint
CREATE INDEX "ai_gen_logs_generated_at_idx" ON "ai_generation_logs" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "test_cases_template_idx" ON "test_cases" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "test_cases_phase_idx" ON "test_cases" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "test_cases_priority_idx" ON "test_cases" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "test_executions_template_idx" ON "test_executions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "test_executions_project_idx" ON "test_executions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_executions_status_idx" ON "test_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_executions_env_idx" ON "test_executions" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "test_results_execution_idx" ON "test_results" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "test_results_case_idx" ON "test_results" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "test_results_status_idx" ON "test_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_templates_domain_idx" ON "test_templates" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "test_templates_status_idx" ON "test_templates" USING btree ("status");