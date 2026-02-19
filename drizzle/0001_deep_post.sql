CREATE TABLE "hrm_kpi_library" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"unit" varchar(30) NOT NULL,
	"kpi_type" varchar(30) NOT NULL,
	"category" varchar(50),
	"calculation_formula" text,
	"data_source" varchar(100),
	"bu_code" varchar(20),
	"status" varchar(30) DEFAULT 'active',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_kpi_library_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hrm_kpi_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_id" integer,
	"title" varchar(200) NOT NULL,
	"department" varchar(100) NOT NULL,
	"bu_code" varchar(20),
	"responsibilities" text,
	"hiring_requirements" text,
	"core_competency" text,
	"headcount" integer DEFAULT 1,
	"status" varchar(30) DEFAULT 'active',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrm_military_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" integer,
	"year" integer NOT NULL,
	"position_id" integer,
	"commitment_text" text NOT NULL,
	"target_summary_json" json,
	"reward_text" text,
	"consequence_text" text,
	"signature_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"signed_at" timestamp,
	"witnessed_by" integer,
	"witnessed_at" timestamp,
	"document_url" text,
	"status" varchar(30) DEFAULT 'active',
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_mil_orders_uk_user_year" UNIQUE("user_id","year")
);
--> statement-breakpoint
CREATE TABLE "hrm_monthly_performance_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" integer,
	"position_id" integer,
	"month_date" varchar(7) NOT NULL,
	"overall_kpi_score" numeric(5, 2),
	"bonus_coefficient" numeric(3, 2),
	"kpi_details_json" json,
	"gaps_text" text,
	"improvement_plan_text" text,
	"reviewer_comments" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"status" varchar(30) DEFAULT 'draft',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_monthly_perf_uk_user_month" UNIQUE("user_id","month_date")
);
--> statement-breakpoint
CREATE TABLE "hrm_position_kpi_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"position_id" integer NOT NULL,
	"kpi_id" integer NOT NULL,
	"year" integer NOT NULL,
	"target_value" numeric(15, 2) NOT NULL,
	"challenge_value" numeric(15, 2),
	"minimum_value" numeric(15, 2),
	"weight" numeric(5, 2) NOT NULL,
	"scoring_method" varchar(30) DEFAULT 'linear',
	"notes" text,
	"status" varchar(30) DEFAULT 'active',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_pos_kpi_tgt_uk_pos_kpi_year" UNIQUE("position_id","kpi_id","year")
);
--> statement-breakpoint
CREATE TABLE "hrm_user_skill_matrix" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_id" integer,
	"skill_name" varchar(100) NOT NULL,
	"skill_category" varchar(50),
	"current_level" integer NOT NULL,
	"target_level" integer NOT NULL,
	"assessment_date" timestamp,
	"assessed_by" integer,
	"history_json" json,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hrm_skill_matrix_uk_user_skill" UNIQUE("user_id","skill_name")
);
--> statement-breakpoint
CREATE INDEX "hrm_kpi_lib_kpi_type_idx" ON "hrm_kpi_library" USING btree ("kpi_type");--> statement-breakpoint
CREATE INDEX "hrm_kpi_lib_bu_code_idx" ON "hrm_kpi_library" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "hrm_kpi_lib_status_idx" ON "hrm_kpi_library" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hrm_kpi_pos_department_idx" ON "hrm_kpi_positions" USING btree ("department");--> statement-breakpoint
CREATE INDEX "hrm_kpi_pos_bu_code_idx" ON "hrm_kpi_positions" USING btree ("bu_code");--> statement-breakpoint
CREATE INDEX "hrm_kpi_pos_status_idx" ON "hrm_kpi_positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hrm_kpi_pos_position_id_idx" ON "hrm_kpi_positions" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "hrm_mil_orders_user_id_idx" ON "hrm_military_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hrm_mil_orders_year_idx" ON "hrm_military_orders" USING btree ("year");--> statement-breakpoint
CREATE INDEX "hrm_mil_orders_sig_status_idx" ON "hrm_military_orders" USING btree ("signature_status");--> statement-breakpoint
CREATE INDEX "hrm_mil_orders_status_idx" ON "hrm_military_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hrm_monthly_perf_user_id_idx" ON "hrm_monthly_performance_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hrm_monthly_perf_employee_id_idx" ON "hrm_monthly_performance_reviews" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hrm_monthly_perf_month_date_idx" ON "hrm_monthly_performance_reviews" USING btree ("month_date");--> statement-breakpoint
CREATE INDEX "hrm_monthly_perf_status_idx" ON "hrm_monthly_performance_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hrm_pos_kpi_tgt_position_id_idx" ON "hrm_position_kpi_targets" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "hrm_pos_kpi_tgt_kpi_id_idx" ON "hrm_position_kpi_targets" USING btree ("kpi_id");--> statement-breakpoint
CREATE INDEX "hrm_pos_kpi_tgt_year_idx" ON "hrm_position_kpi_targets" USING btree ("year");--> statement-breakpoint
CREATE INDEX "hrm_skill_matrix_user_id_idx" ON "hrm_user_skill_matrix" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hrm_skill_matrix_employee_id_idx" ON "hrm_user_skill_matrix" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hrm_skill_matrix_skill_name_idx" ON "hrm_user_skill_matrix" USING btree ("skill_name");--> statement-breakpoint
CREATE INDEX "hrm_skill_matrix_skill_category_idx" ON "hrm_user_skill_matrix" USING btree ("skill_category");