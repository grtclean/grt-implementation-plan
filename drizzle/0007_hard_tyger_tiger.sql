CREATE TYPE "public"."plm_doc_status" AS ENUM('draft', 'in_review', 'released', 'obsolete');--> statement-breakpoint
CREATE TYPE "public"."plm_doc_type" AS ENUM('mechanical', 'electrical', 'software', 'manual');--> statement-breakpoint
CREATE TYPE "public"."plm_review_status" AS ENUM('pending', 'approved', 'rejected', 'revision_requested');--> statement-breakpoint
CREATE TABLE "plm_design_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_version_id" integer NOT NULL,
	"reviewer_user_id" integer NOT NULL,
	"reviewer_name" varchar(128),
	"reviewer_role" varchar(50),
	"review_status" "plm_review_status" DEFAULT 'pending' NOT NULL,
	"comments" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"reviewed_at" timestamp,
	"requested_by" integer,
	"is_design_freeze_review" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plm_document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version_string" varchar(20) NOT NULL,
	"version_major" integer DEFAULT 1 NOT NULL,
	"version_minor" integer DEFAULT 0 NOT NULL,
	"file_url_path" varchar(1000) NOT NULL,
	"original_file_name" varchar(500),
	"file_size_bytes" bigint,
	"file_hash" varchar(128),
	"change_reason" text,
	"source_version_id" integer,
	"uploaded_by" integer NOT NULL,
	"uploaded_by_name" varchar(128),
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"is_latest" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plm_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_number" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"doc_type" "plm_doc_type" NOT NULL,
	"current_status" "plm_doc_status" DEFAULT 'draft' NOT NULL,
	"project_id" integer,
	"project_code" varchar(50),
	"owner_user_id" integer,
	"owner_name" varchar(128),
	"current_version_string" varchar(20) DEFAULT 'V0.0',
	"total_versions" integer DEFAULT 0,
	"design_freeze_approved" boolean DEFAULT false,
	"design_freeze_at" timestamp,
	"design_freeze_by" integer,
	"file_extension" varchar(20),
	"mime_type" varchar(100),
	"tags" json,
	"metadata" json,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plm_documents_doc_number_unique" UNIQUE("doc_number")
);
--> statement-breakpoint
ALTER TABLE "plm_design_reviews" ADD CONSTRAINT "plm_design_reviews_document_version_id_plm_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."plm_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_design_reviews" ADD CONSTRAINT "plm_design_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_design_reviews" ADD CONSTRAINT "plm_design_reviews_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_document_versions" ADD CONSTRAINT "plm_document_versions_document_id_plm_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."plm_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_document_versions" ADD CONSTRAINT "plm_document_versions_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_documents" ADD CONSTRAINT "plm_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_documents" ADD CONSTRAINT "plm_documents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_documents" ADD CONSTRAINT "plm_documents_design_freeze_by_users_id_fk" FOREIGN KEY ("design_freeze_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_documents" ADD CONSTRAINT "plm_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plm_documents" ADD CONSTRAINT "plm_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plm_review_version_idx" ON "plm_design_reviews" USING btree ("document_version_id");--> statement-breakpoint
CREATE INDEX "plm_review_reviewer_idx" ON "plm_design_reviews" USING btree ("reviewer_user_id");--> statement-breakpoint
CREATE INDEX "plm_review_status_idx" ON "plm_design_reviews" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "plm_review_requested_at_idx" ON "plm_design_reviews" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "plm_review_freeze_idx" ON "plm_design_reviews" USING btree ("is_design_freeze_review");--> statement-breakpoint
CREATE INDEX "plm_ver_document_idx" ON "plm_document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "plm_ver_uploaded_by_idx" ON "plm_document_versions" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "plm_ver_uploaded_at_idx" ON "plm_document_versions" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "plm_ver_latest_idx" ON "plm_document_versions" USING btree ("document_id","is_latest");--> statement-breakpoint
CREATE INDEX "plm_doc_project_idx" ON "plm_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "plm_doc_type_idx" ON "plm_documents" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "plm_doc_status_idx" ON "plm_documents" USING btree ("current_status");--> statement-breakpoint
CREATE INDEX "plm_doc_owner_idx" ON "plm_documents" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "plm_doc_freeze_idx" ON "plm_documents" USING btree ("design_freeze_approved");