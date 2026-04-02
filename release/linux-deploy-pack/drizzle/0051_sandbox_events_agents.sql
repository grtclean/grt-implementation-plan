-- Sandbox Event Bus & Agent Registry
CREATE TYPE "public"."agent_status_enum" AS ENUM('active', 'standby', 'disabled', 'error');--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sandbox_event_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_type" varchar(100) NOT NULL,
  "source_module" varchar(50) NOT NULL,
  "target_modules" jsonb DEFAULT '[]',
  "payload" jsonb DEFAULT '{}',
  "user_id" integer REFERENCES "users"("id"),
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agent_registry" (
  "id" serial PRIMARY KEY NOT NULL,
  "agent_id" varchar(50) NOT NULL UNIQUE,
  "display_name" varchar(200) NOT NULL,
  "sandbox_id" varchar(50),
  "ai_provider" varchar(30) NOT NULL,
  "ai_model" varchar(100),
  "system_prompt" text,
  "status" "agent_status_enum" DEFAULT 'standby' NOT NULL,
  "config" jsonb DEFAULT '{}',
  "last_invoked_at" timestamp,
  "total_invocations" integer DEFAULT 0 NOT NULL,
  "total_tokens_used" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sandbox_event_type_idx" ON "sandbox_event_log" USING btree("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_event_source_idx" ON "sandbox_event_log" USING btree("source_module");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sandbox_event_created_idx" ON "sandbox_event_log" USING btree("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_registry_sandbox_idx" ON "agent_registry" USING btree("sandbox_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_registry_status_idx" ON "agent_registry" USING btree("status");--> statement-breakpoint

-- Seed 13 agents
INSERT INTO "agent_registry" ("agent_id", "display_name", "sandbox_id", "ai_provider", "ai_model", "status") VALUES
  ('agent-annual-planner', '年度规划Agent', 'annual-planning', 'gemini', 'gemini-2.0-flash', 'standby'),
  ('agent-payroll-calc', '薪酬计算Agent', 'payroll-attendance', 'claude', 'claude-sonnet-4-6', 'active'),
  ('agent-perf-coach', '绩效教练Agent', 'performance-points', 'gemini', 'gemini-2.0-flash', 'standby'),
  ('agent-hr-lifecycle', 'HR生命周期Agent', 'hr-lifecycle', 'claude', 'claude-sonnet-4-6', 'standby'),
  ('agent-project-pm', '项目管理Agent', 'project-lifecycle', 'gemini', 'gemini-2.0-flash', 'standby'),
  ('agent-quoting', '报价Agent', 'quoting-bom', 'gemini', 'gemini-2.0-flash', 'disabled'),
  ('agent-mech-validator', '机械校验Agent', 'mechanical-standards', 'claude', 'claude-sonnet-4-6', 'disabled'),
  ('agent-elec-validator', '电气校验Agent', 'electrical-standards', 'claude', 'claude-sonnet-4-6', 'disabled'),
  ('agent-customer-insight', '客户洞察Agent', 'customer-config', 'gemini', 'gemini-2.0-flash', 'disabled'),
  ('agent-acceptance', '验收Agent', 'acceptance-tracking', 'openai', 'gpt-4o', 'disabled'),
  ('agent-scheduling', '排产Agent', 'production-scheduling', 'gemini', 'gemini-2.0-flash', 'standby'),
  ('agent-red-team', '红队Agent', NULL, 'openai', 'gpt-4o', 'active'),
  ('agent-copilot', 'Copilot Agent', NULL, 'gemini', 'gemini-2.0-flash', 'active');
