CREATE TABLE "task_prerequisites" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_type" varchar(50) NOT NULL,
	"phase_code" varchar(10) NOT NULL,
	"description" text NOT NULL,
	"check_type" varchar(30) NOT NULL,
	"required_gate_stage" varchar(10),
	"required_check_item" varchar(200),
	"required_task_type" varchar(50),
	"required_task_status" varchar(30) DEFAULT 'done',
	"required_table_name" varchar(100),
	"required_column_name" varchar(100),
	"error_message" varchar(300) NOT NULL,
	"severity" varchar(20) DEFAULT 'hard',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_time_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"phase_code" varchar(10),
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"duration_min" integer,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "safety_checklist_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "task_category" varchar(50);--> statement-breakpoint
CREATE INDEX "task_prerequisites_type_idx" ON "task_prerequisites" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "task_prerequisites_phase_idx" ON "task_prerequisites" USING btree ("phase_code");--> statement-breakpoint
CREATE INDEX "task_time_sessions_task_idx" ON "task_time_sessions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_time_sessions_user_idx" ON "task_time_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_time_sessions_active_idx" ON "task_time_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "task_time_sessions_project_idx" ON "task_time_sessions" USING btree ("project_id");