CREATE TABLE "ai_knowledge_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_type" "knowledge_doc_type" NOT NULL,
	"file_path" text,
	"file_size_bytes" integer,
	"mime_type" varchar(100),
	"status" "knowledge_doc_status" DEFAULT 'UPLOADED',
	"extracted_text" text,
	"summary" text,
	"key_entities" json,
	"embedding_vector" text,
	"analysis_result" json,
	"tags" json,
	"uploaded_by" integer,
	"processed_at" timestamp,
	"error_message" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "genesis_proposals" DROP CONSTRAINT "genesis_proposals_source_document_id_knowledge_documents_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_knowledge_documents" ADD CONSTRAINT "ai_knowledge_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kd_file_type_idx" ON "ai_knowledge_documents" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "kd_status_idx" ON "ai_knowledge_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kd_uploaded_by_idx" ON "ai_knowledge_documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "kd_created_at_idx" ON "ai_knowledge_documents" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "genesis_proposals" ADD CONSTRAINT "genesis_proposals_source_document_id_ai_knowledge_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."ai_knowledge_documents"("id") ON DELETE no action ON UPDATE no action;