CREATE TYPE "public"."campaign_operation" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'SIMULATED', 'APPROVED', 'EXECUTING', 'COMPLETED', 'ROLLED_BACK', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('ORG_RESTRUCTURE', 'INVENTORY_ROLLOVER', 'PRICE_UPDATE', 'ROLE_MIGRATION', 'DATA_CLEANUP');--> statement-breakpoint
CREATE TYPE "public"."freeze_type" AS ENUM('FULL', 'PARTIAL', 'CATEGORY');--> statement-breakpoint
CREATE TYPE "public"."payload_status" AS ENUM('PENDING', 'APPLIED', 'FAILED', 'ROLLED_BACK', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."sys_audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'REJECT', 'LOGIN', 'EXPORT');--> statement-breakpoint
CREATE TYPE "public"."sys_workflow_node_type" AS ENUM('START', 'APPROVAL', 'CONDITION', 'NOTIFICATION', 'ACTION', 'END');--> statement-breakpoint
CREATE TABLE "campaign_payloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" integer,
	"operation" "campaign_operation" NOT NULL,
	"payload_before" json,
	"payload_after" json,
	"execution_order" integer DEFAULT 0,
	"status" "payload_status" DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"campaign_type" "campaign_type" NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"simulation_result" json,
	"approved_by" integer,
	"approved_at" timestamp,
	"executed_by" integer,
	"executed_at" timestamp,
	"completed_at" timestamp,
	"rollback_reason" text,
	"affected_entity_count" integer DEFAULT 0,
	"metadata" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "global_campaigns_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "inventory_freeze_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"warehouse_id" integer,
	"freeze_type" "freeze_type" NOT NULL,
	"freeze_scope" json,
	"frozen_by" integer,
	"frozen_at" timestamp DEFAULT now() NOT NULL,
	"unfrozen_at" timestamp,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" integer,
	"action" "sys_audit_action" NOT NULL,
	"actor_id" integer,
	"actor_name" varchar(200),
	"previous_data" json,
	"new_data" json,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(100),
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_data_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"entity_table" varchar(100) NOT NULL,
	"condition_expression" text NOT NULL,
	"allowed_roles" json,
	"allowed_bus" json,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_dictionaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"code" varchar(100) NOT NULL,
	"label" varchar(200) NOT NULL,
	"label_zh" varchar(200) NOT NULL,
	"value" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"parent_id" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_dict_category_code" UNIQUE("category","code")
);
--> statement-breakpoint
CREATE TABLE "sys_workflow_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_zh" varchar(200) NOT NULL,
	"description" text,
	"entity_type" varchar(100),
	"trigger_conditions" json,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sys_workflow_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_workflow_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_definition_id" integer NOT NULL,
	"node_type" "sys_workflow_node_type" NOT NULL,
	"name" varchar(200) NOT NULL,
	"config" json,
	"next_node_ids" json,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_payloads" ADD CONSTRAINT "campaign_payloads_campaign_id_global_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."global_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_campaigns" ADD CONSTRAINT "global_campaigns_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_campaigns" ADD CONSTRAINT "global_campaigns_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_campaigns" ADD CONSTRAINT "global_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_freeze_logs" ADD CONSTRAINT "inventory_freeze_logs_campaign_id_global_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."global_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_freeze_logs" ADD CONSTRAINT "inventory_freeze_logs_frozen_by_users_id_fk" FOREIGN KEY ("frozen_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_audit_logs" ADD CONSTRAINT "sys_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_data_policies" ADD CONSTRAINT "sys_data_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_workflow_definitions" ADD CONSTRAINT "sys_workflow_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_workflow_nodes" ADD CONSTRAINT "sys_workflow_nodes_workflow_definition_id_sys_workflow_definitions_id_fk" FOREIGN KEY ("workflow_definition_id") REFERENCES "public"."sys_workflow_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payloads_campaign_idx" ON "campaign_payloads" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "payloads_entity_type_idx" ON "campaign_payloads" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "payloads_status_idx" ON "campaign_payloads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payloads_exec_order_idx" ON "campaign_payloads" USING btree ("execution_order");--> statement-breakpoint
CREATE INDEX "campaigns_type_idx" ON "global_campaigns" USING btree ("campaign_type");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "global_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_created_by_idx" ON "global_campaigns" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "freeze_campaign_idx" ON "inventory_freeze_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "freeze_warehouse_idx" ON "inventory_freeze_logs" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "freeze_frozen_by_idx" ON "inventory_freeze_logs" USING btree ("frozen_by");--> statement-breakpoint
CREATE INDEX "sys_al_entity_idx" ON "sys_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "sys_al_actor_idx" ON "sys_audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "sys_al_action_idx" ON "sys_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "sys_al_created_at_idx" ON "sys_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sys_dp_entity_table_idx" ON "sys_data_policies" USING btree ("entity_table");--> statement-breakpoint
CREATE INDEX "sys_dp_active_idx" ON "sys_data_policies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sys_dp_priority_idx" ON "sys_data_policies" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "sys_dict_category_idx" ON "sys_dictionaries" USING btree ("category");--> statement-breakpoint
CREATE INDEX "sys_dict_active_idx" ON "sys_dictionaries" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sys_dict_parent_idx" ON "sys_dictionaries" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "sys_wf_def_entity_type_idx" ON "sys_workflow_definitions" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "sys_wf_def_active_idx" ON "sys_workflow_definitions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sys_wf_node_def_idx" ON "sys_workflow_nodes" USING btree ("workflow_definition_id");--> statement-breakpoint
CREATE INDEX "sys_wf_node_type_idx" ON "sys_workflow_nodes" USING btree ("node_type");