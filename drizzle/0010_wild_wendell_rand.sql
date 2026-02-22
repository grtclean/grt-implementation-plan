CREATE TYPE "public"."oa_agenda_status" AS ENUM('open', 'in_progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."oa_announcement_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."oa_trip_report_status" AS ENUM('draft', 'submitted', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."oa_workflow_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."oa_workflow_type" AS ENUM('LEAVE', 'OVERTIME', 'ATTENDANCE_FIX', 'OUTING', 'VEHICLE', 'STATIONERY', 'PROCUREMENT', 'EXPENSE', 'SEAL', 'GIFT');--> statement-breakpoint
CREATE TABLE "competency_rubrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_role" varchar(100) NOT NULL,
	"domain" "capabilityDomainEnum" NOT NULL,
	"level" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_rubric_role_domain_level" UNIQUE("job_role","domain","level")
);
--> statement-breakpoint
CREATE TABLE "employee_capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"target_level" integer DEFAULT 3 NOT NULL,
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"assessed_by" varchar(100) DEFAULT 'self',
	"certified_by" varchar(200),
	"certification_expiry_date" date,
	"evidence" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_employee_skill" UNIQUE("employee_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "employee_domain_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"domain" "capabilityDomainEnum" NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"score" numeric(5, 2) DEFAULT '0',
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"assessed_by" varchar(100) DEFAULT 'system',
	"assessment_period" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_employee_domain_period" UNIQUE("employee_id","domain","assessment_period")
);
--> statement-breakpoint
CREATE TABLE "skill_dictionary" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_zh" varchar(200) NOT NULL,
	"domain" "capabilityDomainEnum" NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"is_certifiable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_dictionary_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "business_trip_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"project_id" integer,
	"trip_request_id" integer,
	"customer_id" integer,
	"travel_start_date" date,
	"travel_end_date" date,
	"destination" varchar(200),
	"trip_summary" text,
	"key_findings" text,
	"follow_up_actions" json,
	"technical_questionnaire_data" json,
	"attachments" json,
	"status" "oa_trip_report_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_events_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"department_id" integer,
	"organizer_id" integer,
	"start_time" varchar(20),
	"end_time" varchar(20),
	"day_of_week" integer,
	"recurrence_rule" varchar(200),
	"location" varchar(200),
	"auto_agenda_context" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_agendas_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer,
	"meeting_date" date,
	"agenda_item" text,
	"source_type" varchar(50),
	"source_id" integer,
	"decision" text,
	"assigned_to" integer,
	"deadline" date,
	"status" "oa_agenda_status" DEFAULT 'open' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oa_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"content" text,
	"category" varchar(50) DEFAULT 'general',
	"priority" varchar(20) DEFAULT 'normal',
	"author_id" integer,
	"department_id" integer,
	"status" "oa_announcement_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"expires_at" timestamp,
	"notify_dingtalk" boolean DEFAULT false,
	"dingtalk_notified" boolean DEFAULT false,
	"attachments" json,
	"is_pinned" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oa_leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"year" integer NOT NULL,
	"leave_type" varchar(30) NOT NULL,
	"total_days" integer DEFAULT 0 NOT NULL,
	"used_days" integer DEFAULT 0 NOT NULL,
	"pending_days" integer DEFAULT 0 NOT NULL,
	"carried_over_days" integer DEFAULT 0,
	"carry_over_expiry" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oa_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer,
	"type" "oa_workflow_type" NOT NULL,
	"status" "oa_workflow_status" DEFAULT 'PENDING' NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" json,
	"linked_project_id" integer,
	"approver_id" integer,
	"approved_at" timestamp,
	"approver_comment" text,
	"dingtalk_notified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_capabilities" ADD CONSTRAINT "employee_capabilities_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_capabilities" ADD CONSTRAINT "employee_capabilities_skill_id_skill_dictionary_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill_dictionary"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_domain_scores" ADD CONSTRAINT "employee_domain_scores_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_trip_reports" ADD CONSTRAINT "business_trip_reports_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_trip_reports" ADD CONSTRAINT "business_trip_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_trip_reports" ADD CONSTRAINT "business_trip_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_events_meetings" ADD CONSTRAINT "company_events_meetings_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agendas_actions" ADD CONSTRAINT "meeting_agendas_actions_meeting_id_company_events_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."company_events_meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agendas_actions" ADD CONSTRAINT "meeting_agendas_actions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_announcements" ADD CONSTRAINT "oa_announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_leave_balances" ADD CONSTRAINT "oa_leave_balances_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_workflows" ADD CONSTRAINT "oa_workflows_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_workflows" ADD CONSTRAINT "oa_workflows_linked_project_id_projects_id_fk" FOREIGN KEY ("linked_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_workflows" ADD CONSTRAINT "oa_workflows_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rubric_job_role" ON "competency_rubrics" USING btree ("job_role");--> statement-breakpoint
CREATE INDEX "idx_rubric_domain" ON "competency_rubrics" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_cap_employee" ON "employee_capabilities" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_cap_skill" ON "employee_capabilities" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_ds_employee" ON "employee_domain_scores" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_ds_domain" ON "employee_domain_scores" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_ds_period" ON "employee_domain_scores" USING btree ("assessment_period");--> statement-breakpoint
CREATE INDEX "idx_skill_domain" ON "skill_dictionary" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_skill_category" ON "skill_dictionary" USING btree ("category");--> statement-breakpoint
CREATE INDEX "btr_employee_idx" ON "business_trip_reports" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "btr_project_idx" ON "business_trip_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "btr_status_idx" ON "business_trip_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "btr_travel_start_idx" ON "business_trip_reports" USING btree ("travel_start_date");--> statement-breakpoint
CREATE INDEX "cem_department_idx" ON "company_events_meetings" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "cem_active_idx" ON "company_events_meetings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "maa_meeting_date_idx" ON "meeting_agendas_actions" USING btree ("meeting_id","meeting_date");--> statement-breakpoint
CREATE INDEX "maa_status_idx" ON "meeting_agendas_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maa_assigned_idx" ON "meeting_agendas_actions" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "oa_ann_status_idx" ON "oa_announcements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "oa_ann_category_idx" ON "oa_announcements" USING btree ("category");--> statement-breakpoint
CREATE INDEX "oa_ann_author_idx" ON "oa_announcements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "oa_ann_department_idx" ON "oa_announcements" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "oa_ann_pinned_idx" ON "oa_announcements" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX "olb_employee_year_idx" ON "oa_leave_balances" USING btree ("employee_id","year");--> statement-breakpoint
CREATE INDEX "olb_leave_type_idx" ON "oa_leave_balances" USING btree ("leave_type");--> statement-breakpoint
CREATE INDEX "oa_workflows_type_idx" ON "oa_workflows" USING btree ("type");--> statement-breakpoint
CREATE INDEX "oa_workflows_status_idx" ON "oa_workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "oa_workflows_applicant_idx" ON "oa_workflows" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "oa_workflows_project_idx" ON "oa_workflows" USING btree ("linked_project_id");