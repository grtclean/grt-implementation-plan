ALTER TABLE "grt_roles" ADD COLUMN "display_name_zh" varchar(128);--> statement-breakpoint
ALTER TABLE "grt_roles" ADD COLUMN "category" varchar(50) DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "grt_roles" ADD COLUMN "level" integer DEFAULT 1;