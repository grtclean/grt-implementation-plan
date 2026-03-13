-- Smart Production Scheduling Workbench — DDL Migration
-- BOM工时分解 + 历史基准 + 里程碑对标
-- Created: 2026-03-08

-- Table 1: scheduling_bom_work_hours — BOM装配工时分解
CREATE TABLE IF NOT EXISTS "scheduling_bom_work_hours" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "process_code" varchar(20) NOT NULL,
  "bom_step_id" integer,
  "assembly_description" text,
  "bom_item_ids" jsonb DEFAULT '[]'::jsonb,
  "base_theory_minutes" integer,
  "difficulty_factor" decimal(3,1) DEFAULT 1.0,
  "adjusted_minutes" integer,
  "adjust_reason" text,
  "adjusted_by" integer,
  "adjusted_at" timestamp,
  "predecessor_step_ids" jsonb DEFAULT '[]'::jsonb,
  "tools_required" jsonb DEFAULT '[]'::jsonb,
  "equipment_required" varchar(200),
  "skill_level_required" varchar(10),
  "worker_count" integer DEFAULT 1,
  "material_ready" boolean DEFAULT false,
  "material_earliest_available" date,
  "sort_order" integer DEFAULT 0,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sbwh_project_idx" ON "scheduling_bom_work_hours" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "sbwh_process_idx" ON "scheduling_bom_work_hours" USING btree ("process_code");
CREATE INDEX IF NOT EXISTS "sbwh_status_idx" ON "scheduling_bom_work_hours" USING btree ("status");
CREATE INDEX IF NOT EXISTS "sbwh_bom_step_idx" ON "scheduling_bom_work_hours" USING btree ("bom_step_id");
CREATE INDEX IF NOT EXISTS "sbwh_project_process_idx" ON "scheduling_bom_work_hours" USING btree ("project_id", "process_code");

--> statement-breakpoint

-- Table 2: scheduling_historical_benchmarks — 历史工时基准统计
CREATE TABLE IF NOT EXISTS "scheduling_historical_benchmarks" (
  "id" serial PRIMARY KEY NOT NULL,
  "process_code" varchar(20) NOT NULL,
  "product_category" varchar(100) NOT NULL,
  "avg_hours" decimal(10,2),
  "min_hours" decimal(10,2),
  "max_hours" decimal(10,2),
  "p50_hours" decimal(10,2),
  "p80_hours" decimal(10,2),
  "sample_count" integer DEFAULT 0,
  "source_projects" jsonb DEFAULT '[]'::jsonb,
  "last_computed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "shb_process_idx" ON "scheduling_historical_benchmarks" USING btree ("process_code");
CREATE INDEX IF NOT EXISTS "shb_category_idx" ON "scheduling_historical_benchmarks" USING btree ("product_category");
CREATE INDEX IF NOT EXISTS "shb_process_category_idx" ON "scheduling_historical_benchmarks" USING btree ("process_code", "product_category");

--> statement-breakpoint

-- Table 3: scheduling_milestone_checkpoints — 里程碑目标与历史基准对标
CREATE TABLE IF NOT EXISTS "scheduling_milestone_checkpoints" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "milestone_code" varchar(10) NOT NULL,
  "milestone_name" varchar(100),
  "target_date" date,
  "baseline_date" date,
  "actual_date" date,
  "baseline_source" text,
  "historical_avg_days" decimal(10,2),
  "historical_min_days" decimal(10,2),
  "historical_max_days" decimal(10,2),
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "slack_days" integer,
  "critical_path" boolean DEFAULT false,
  "related_process_codes" jsonb DEFAULT '[]'::jsonb,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "smc_project_idx" ON "scheduling_milestone_checkpoints" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "smc_milestone_idx" ON "scheduling_milestone_checkpoints" USING btree ("milestone_code");
CREATE INDEX IF NOT EXISTS "smc_status_idx" ON "scheduling_milestone_checkpoints" USING btree ("status");
CREATE INDEX IF NOT EXISTS "smc_project_milestone_idx" ON "scheduling_milestone_checkpoints" USING btree ("project_id", "milestone_code");
