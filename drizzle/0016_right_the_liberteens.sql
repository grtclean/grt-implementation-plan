CREATE TABLE "oa_form_approval_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"step_index" integer NOT NULL,
	"step_name" varchar(100),
	"approver_id" integer,
	"approver_name" varchar(100),
	"action" varchar(20) NOT NULL,
	"comment" text,
	"delegated_to_id" integer,
	"delegated_to_name" varchar(100),
	"action_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oa_form_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "off_user_template_uq" UNIQUE("user_id","template_id")
);
--> statement-breakpoint
CREATE TABLE "oa_form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_code" varchar(50),
	"template_id" integer NOT NULL,
	"template_code" varchar(50),
	"template_name" varchar(200),
	"applicant_id" integer,
	"applicant_name" varchar(100),
	"department_id" integer,
	"department_name" varchar(100),
	"title" varchar(300) NOT NULL,
	"form_data" jsonb NOT NULL,
	"linked_project_id" integer,
	"linked_project_name" varchar(200),
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"current_approver_id" integer,
	"current_approver_name" varchar(100),
	"current_approval_step" integer DEFAULT 0,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"priority" varchar(20) DEFAULT 'normal',
	"due_date" timestamp,
	"dingtalk_notified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oa_form_submissions_submission_code_unique" UNIQUE("submission_code")
);
--> statement-breakpoint
CREATE TABLE "oa_form_template_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"version" integer NOT NULL,
	"fields" jsonb NOT NULL,
	"approval_flow" jsonb,
	"changed_by" integer,
	"change_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oftv_template_version_uq" UNIQUE("template_id","version")
);
--> statement-breakpoint
CREATE TABLE "oa_form_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_code" varchar(50),
	"template_name" varchar(200) NOT NULL,
	"template_name_en" varchar(200),
	"description" text,
	"category" varchar(50) DEFAULT 'general',
	"icon" varchar(50),
	"color" varchar(20),
	"fields" jsonb NOT NULL,
	"approval_flow" jsonb,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"is_system" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "oa_form_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
ALTER TABLE "oa_form_approval_records" ADD CONSTRAINT "oa_form_approval_records_submission_id_oa_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."oa_form_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_approval_records" ADD CONSTRAINT "oa_form_approval_records_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_favorites" ADD CONSTRAINT "oa_form_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_favorites" ADD CONSTRAINT "oa_form_favorites_template_id_oa_form_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."oa_form_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_submissions" ADD CONSTRAINT "oa_form_submissions_template_id_oa_form_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."oa_form_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_submissions" ADD CONSTRAINT "oa_form_submissions_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_submissions" ADD CONSTRAINT "oa_form_submissions_current_approver_id_users_id_fk" FOREIGN KEY ("current_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_template_versions" ADD CONSTRAINT "oa_form_template_versions_template_id_oa_form_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."oa_form_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_template_versions" ADD CONSTRAINT "oa_form_template_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oa_form_templates" ADD CONSTRAINT "oa_form_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ofar_submission_id_idx" ON "oa_form_approval_records" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "ofar_approver_id_idx" ON "oa_form_approval_records" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "ofar_action_at_idx" ON "oa_form_approval_records" USING btree ("action_at");--> statement-breakpoint
CREATE INDEX "off_user_id_idx" ON "oa_form_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ofs_submission_code_idx" ON "oa_form_submissions" USING btree ("submission_code");--> statement-breakpoint
CREATE INDEX "ofs_template_id_idx" ON "oa_form_submissions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "ofs_applicant_id_idx" ON "oa_form_submissions" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "ofs_status_idx" ON "oa_form_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ofs_current_approver_idx" ON "oa_form_submissions" USING btree ("current_approver_id");--> statement-breakpoint
CREATE INDEX "ofs_created_at_idx" ON "oa_form_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "oftv_template_id_idx" ON "oa_form_template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "oft_template_code_idx" ON "oa_form_templates" USING btree ("template_code");--> statement-breakpoint
CREATE INDEX "oft_category_idx" ON "oa_form_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "oft_is_active_idx" ON "oa_form_templates" USING btree ("is_active");