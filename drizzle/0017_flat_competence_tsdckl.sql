-- Migration: Replace multi-table competency schema with flat TSDCKL assessment table
-- Old tables: competency_rubrics, skill_dictionary, employee_capabilities, employee_domain_scores
-- New table: employee_competence_assessments (flat TSDCKL scores)

DROP TABLE IF EXISTS "employee_domain_scores" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "employee_capabilities" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "skill_dictionary" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "competency_rubrics" CASCADE;
--> statement-breakpoint
CREATE TABLE "employee_competence_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" varchar(100) NOT NULL,
	"department" varchar(100),
	"position" varchar(100),
	"t_score" varchar(50),
	"s_score" varchar(50),
	"d_score" varchar(50),
	"c_score" varchar(50),
	"k_score" varchar(50),
	"l_score" varchar(50),
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_eca_employee" ON "employee_competence_assessments" USING btree ("employee_id");
--> statement-breakpoint
CREATE INDEX "idx_eca_department" ON "employee_competence_assessments" USING btree ("department");
--> statement-breakpoint
ALTER TABLE "employee_competence_assessments" ADD CONSTRAINT "uq_eca_employee_assessed" UNIQUE("employee_id","assessed_at");
