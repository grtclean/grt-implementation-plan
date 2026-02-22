CREATE TYPE "public"."dt_asset_status" AS ENUM('draft', 'pending_review', 'released', 'obsolete');--> statement-breakpoint
CREATE TYPE "public"."dt_file_format" AS ENUM('glb', 'gltf', 'step', 'zw1', 'sldprt', 'sldasm', 'fbx', 'obj', 'stl', 'other');--> statement-breakpoint
CREATE TYPE "public"."iatf_audit_action" AS ENUM('upload', 'approve', 'reject', 'freeze', 'obsolete', 'download', 'delete', 'hash_verify');--> statement-breakpoint
CREATE TABLE "dt_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"project_code" varchar(50),
	"asset_name" varchar(300) NOT NULL,
	"asset_number" varchar(50),
	"version" integer DEFAULT 1 NOT NULL,
	"version_string" varchar(20) DEFAULT 'V1.0',
	"previous_version_id" integer,
	"file_format" "dt_file_format" NOT NULL,
	"storage_url" varchar(1000) NOT NULL,
	"original_file_name" varchar(500),
	"file_size_bytes" bigint,
	"mime_type" varchar(100),
	"sha256_hash" varchar(64) NOT NULL,
	"status" "dt_asset_status" DEFAULT 'draft' NOT NULL,
	"is_latest" boolean DEFAULT true,
	"design_frozen" boolean DEFAULT false,
	"design_frozen_at" timestamp,
	"design_frozen_by" integer,
	"vertex_count" integer,
	"face_count" integer,
	"bounding_box" json,
	"thumbnail_url" varchar(500),
	"owner_user_id" integer,
	"owner_name" varchar(128),
	"tags" json,
	"metadata" json,
	"description" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dt_assets_asset_number_unique" UNIQUE("asset_number")
);
--> statement-breakpoint
CREATE TABLE "dt_robot_assembly_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"dt_asset_id" integer NOT NULL,
	"part_number" varchar(100) NOT NULL,
	"part_name" varchar(300),
	"position_x" numeric(12, 4) NOT NULL,
	"position_y" numeric(12, 4) NOT NULL,
	"position_z" numeric(12, 4) NOT NULL,
	"rotation_x" numeric(8, 4) DEFAULT '0',
	"rotation_y" numeric(8, 4) DEFAULT '0',
	"rotation_z" numeric(8, 4) DEFAULT '0',
	"assembly_torque_nm" numeric(8, 2),
	"assembly_sequence" integer,
	"tool_required" varchar(100),
	"grip_type" varchar(50),
	"safety_clearance_mm" numeric(8, 2),
	"node_type" varchar(30) DEFAULT 'part',
	"instructions" text,
	"metadata" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iatf_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"action" "iatf_audit_action" NOT NULL,
	"actor_id" integer NOT NULL,
	"actor_name" varchar(128),
	"timestamp_utc" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"hash_at_action" varchar(64),
	"previous_status" varchar(30),
	"new_status" varchar(30),
	"asset_version" integer,
	"details" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dt_assets" ADD CONSTRAINT "dt_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dt_assets" ADD CONSTRAINT "dt_assets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dt_assets" ADD CONSTRAINT "dt_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dt_assets" ADD CONSTRAINT "dt_assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dt_robot_assembly_nodes" ADD CONSTRAINT "dt_robot_assembly_nodes_dt_asset_id_dt_assets_id_fk" FOREIGN KEY ("dt_asset_id") REFERENCES "public"."dt_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dt_robot_assembly_nodes" ADD CONSTRAINT "dt_robot_assembly_nodes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iatf_audit_logs" ADD CONSTRAINT "iatf_audit_logs_asset_id_dt_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."dt_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iatf_audit_logs" ADD CONSTRAINT "iatf_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dt_assets_project_idx" ON "dt_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "dt_assets_format_idx" ON "dt_assets" USING btree ("file_format");--> statement-breakpoint
CREATE INDEX "dt_assets_status_idx" ON "dt_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dt_assets_owner_idx" ON "dt_assets" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "dt_assets_hash_idx" ON "dt_assets" USING btree ("sha256_hash");--> statement-breakpoint
CREATE INDEX "dt_assets_latest_idx" ON "dt_assets" USING btree ("is_latest");--> statement-breakpoint
CREATE INDEX "dt_assets_frozen_idx" ON "dt_assets" USING btree ("design_frozen");--> statement-breakpoint
CREATE INDEX "dt_robot_nodes_asset_idx" ON "dt_robot_assembly_nodes" USING btree ("dt_asset_id");--> statement-breakpoint
CREATE INDEX "dt_robot_nodes_part_idx" ON "dt_robot_assembly_nodes" USING btree ("part_number");--> statement-breakpoint
CREATE INDEX "dt_robot_nodes_sequence_idx" ON "dt_robot_assembly_nodes" USING btree ("assembly_sequence");--> statement-breakpoint
CREATE INDEX "iatf_audit_asset_idx" ON "iatf_audit_logs" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "iatf_audit_action_idx" ON "iatf_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "iatf_audit_actor_idx" ON "iatf_audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "iatf_audit_timestamp_idx" ON "iatf_audit_logs" USING btree ("timestamp_utc");