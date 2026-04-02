-- Add labor category, project linkage, and approval status to work_logs
ALTER TABLE "work_logs" ADD COLUMN IF NOT EXISTS "labor_category" varchar(30) DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "work_logs" ADD COLUMN IF NOT EXISTS "project_id" integer;--> statement-breakpoint
ALTER TABLE "work_logs" ADD COLUMN IF NOT EXISTS "approval_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_log_project" ON "work_logs" USING btree("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_log_category" ON "work_logs" USING btree("labor_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_log_approval" ON "work_logs" USING btree("approval_status");
