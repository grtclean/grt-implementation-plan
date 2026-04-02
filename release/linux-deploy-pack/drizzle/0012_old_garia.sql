CREATE TYPE "public"."genesis_chat_role" AS ENUM('USER', 'AI', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."knowledge_doc_status" AS ENUM('UPLOADED', 'PROCESSING', 'ANALYZED', 'FAILED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."knowledge_doc_type" AS ENUM('POLICY', 'SOP', 'CONTRACT', 'SPECIFICATION', 'MANUAL', 'REPORT', 'SPREADSHEET', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."genesis_proposal_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMMITTED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "genesis_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"source_document_id" integer,
	"proposal_type" varchar(100),
	"target_entity" varchar(100),
	"proposed_json_diff" json NOT NULL,
	"current_snapshot" json,
	"impact_analysis" json,
	"status" "genesis_proposal_status" DEFAULT 'DRAFT',
	"confidence" real,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_comment" text,
	"committed_at" timestamp,
	"committed_by" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_chat_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposal_id" integer NOT NULL,
	"role" "genesis_chat_role" NOT NULL,
	"content" text NOT NULL,
	"attachments" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "genesis_proposals" ADD CONSTRAINT "genesis_proposals_source_document_id_knowledge_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genesis_proposals" ADD CONSTRAINT "genesis_proposals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genesis_proposals" ADD CONSTRAINT "genesis_proposals_committed_by_users_id_fk" FOREIGN KEY ("committed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genesis_proposals" ADD CONSTRAINT "genesis_proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_chat_logs" ADD CONSTRAINT "proposal_chat_logs_proposal_id_genesis_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."genesis_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gp_source_document_idx" ON "genesis_proposals" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "gp_proposal_type_idx" ON "genesis_proposals" USING btree ("proposal_type");--> statement-breakpoint
CREATE INDEX "gp_status_idx" ON "genesis_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gp_created_by_idx" ON "genesis_proposals" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "gp_target_entity_idx" ON "genesis_proposals" USING btree ("target_entity");--> statement-breakpoint
CREATE INDEX "pcl_proposal_idx" ON "proposal_chat_logs" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "pcl_role_idx" ON "proposal_chat_logs" USING btree ("role");--> statement-breakpoint
CREATE INDEX "pcl_created_at_idx" ON "proposal_chat_logs" USING btree ("created_at");