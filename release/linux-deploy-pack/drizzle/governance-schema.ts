/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT System Control Tower — Enterprise Governance Schema       ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. sys_dictionaries          — MDM (Master Data Management)  ║
 * ║    2. sys_workflow_definitions  — BPMN workflow templates        ║
 * ║    3. sys_workflow_nodes        — BPMN nodes within workflows   ║
 * ║    4. sys_data_policies         — RLS (Row-Level Security)      ║
 * ║    5. sys_audit_logs            — System-wide audit trail       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { users } from "./schema";

// ══════════════════════════════════════════════════════
// Enum value tuples (exported for reuse in Zod schemas)
// ══════════════════════════════════════════════════════

export const SYS_WORKFLOW_NODE_TYPES = [
  "START",
  "APPROVAL",
  "CONDITION",
  "NOTIFICATION",
  "ACTION",
  "END",
] as const;

export const SYS_AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VIEW",
  "APPROVE",
  "REJECT",
  "LOGIN",
  "EXPORT",
  "APPROVE_KNOWLEDGE",
  "ROLLBACK_KNOWLEDGE",
  "SYSTEM_FREEZE",
] as const;

export type SysWorkflowNodeType = (typeof SYS_WORKFLOW_NODE_TYPES)[number];
export type SysAuditAction = (typeof SYS_AUDIT_ACTIONS)[number];

// ══════════════════════════════════════════════════════
// Postgres Enums
// ══════════════════════════════════════════════════════

export const sysWorkflowNodeTypeEnum = pgEnum("sys_workflow_node_type", SYS_WORKFLOW_NODE_TYPES);
export const sysAuditActionEnum = pgEnum("sys_audit_action", SYS_AUDIT_ACTIONS);

// ══════════════════════════════════════════════════════
// Table 1: sys_dictionaries — MDM (Master Data Management)
//
// Universal key-value dictionary with hierarchy support.
// Replaces scattered hardcoded enums across the system.
// Categories: UNIT_OF_MEASURE, DEPARTMENT, LEAVE_TYPE, etc.
// ══════════════════════════════════════════════════════

export const sysDictionaries = pgTable("sys_dictionaries", {
  id: serial("id").primaryKey(),

  /** Category grouping, e.g. "UNIT_OF_MEASURE", "DEPARTMENT", "LEAVE_TYPE" */
  category: varchar("category", { length: 100 }).notNull(),

  /** Machine-readable key within category */
  code: varchar("code", { length: 100 }).notNull(),

  /** English display label */
  label: varchar("label", { length: 200 }).notNull(),

  /** Chinese display label */
  labelZh: varchar("label_zh", { length: 200 }).notNull(),

  /** Optional extended value (free-form text) */
  value: text("value"),

  /** Display ordering within category */
  sortOrder: integer("sort_order").default(0),

  /** Soft-delete / deactivation flag */
  isActive: boolean("is_active").default(true),

  /** Self-referential FK for hierarchical dictionaries (nullable) */
  parentId: integer("parent_id"),

  /** Extensible JSONB metadata */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  unique("uq_dict_category_code").on(table.category, table.code),
  index("sys_dict_category_idx").on(table.category),
  index("sys_dict_active_idx").on(table.isActive),
  index("sys_dict_parent_idx").on(table.parentId),
]);

// ══════════════════════════════════════════════════════
// Table 2: sys_workflow_definitions — BPMN Workflow Templates
//
// Reusable workflow definitions that can be instantiated
// for any entity type (leave approvals, procurement, etc.).
// Versioned — bump `version` when editing a live workflow.
// ══════════════════════════════════════════════════════

export const sysWorkflowDefinitions = pgTable("sys_workflow_definitions", {
  id: serial("id").primaryKey(),

  /** Unique machine-readable code, e.g. "LEAVE_APPROVAL", "PROCUREMENT" */
  code: varchar("code", { length: 100 }).notNull().unique(),

  /** English name */
  name: varchar("name", { length: 200 }).notNull(),

  /** Chinese name */
  nameZh: varchar("name_zh", { length: 200 }).notNull(),

  /** Optional long description */
  description: text("description"),

  /** Which table/entity this workflow applies to, e.g. "oa_workflows", "procurement_orders" */
  entityType: varchar("entity_type", { length: 100 }),

  /** JSONB rules for auto-triggering this workflow (field conditions, thresholds, etc.) */
  triggerConditions: json("trigger_conditions").$type<Record<string, unknown>>(),

  /** Whether this workflow is active and can be instantiated */
  isActive: boolean("is_active").default(true),

  /** Schema version — increment when modifying nodes of a live workflow */
  version: integer("version").default(1),

  /** FK → users.id — who created this workflow definition */
  createdBy: integer("created_by").references(() => users.id),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("sys_wf_def_entity_type_idx").on(table.entityType),
  index("sys_wf_def_active_idx").on(table.isActive),
]);

// ══════════════════════════════════════════════════════
// Table 3: sys_workflow_nodes — BPMN Nodes Within Workflows
//
// Each row is a node (step) in a workflow definition.
// The `config` JSONB holds node-type-specific configuration:
//   APPROVAL: { approverRole, approverIds, escalationHours }
//   CONDITION: { field, operator, value, trueNodeId, falseNodeId }
//   NOTIFICATION: { template, channels }
//   ACTION: { actionType, params }
// ══════════════════════════════════════════════════════

export const sysWorkflowNodes = pgTable("sys_workflow_nodes", {
  id: serial("id").primaryKey(),

  /** FK → sys_workflow_definitions.id — parent workflow */
  workflowDefinitionId: integer("workflow_definition_id")
    .references(() => sysWorkflowDefinitions.id)
    .notNull(),

  /** Type of this node in the BPMN graph */
  nodeType: sysWorkflowNodeTypeEnum("node_type").notNull(),

  /** Human-readable step name */
  name: varchar("name", { length: 200 }).notNull(),

  /** JSONB: approver rules, conditions, notification templates, action params */
  config: json("config").$type<Record<string, unknown>>(),

  /** JSONB array of next node IDs (supports branching) */
  nextNodeIds: json("next_node_ids").$type<number[]>(),

  /** Display ordering within the workflow */
  sortOrder: integer("sort_order").default(0),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("sys_wf_node_def_idx").on(table.workflowDefinitionId),
  index("sys_wf_node_type_idx").on(table.nodeType),
]);

// ══════════════════════════════════════════════════════
// Table 4: sys_data_policies — RLS (Row-Level Security)
//
// Declarative data access policies evaluated at runtime.
// Each policy restricts which rows a user/role/BU can see
// for a given entity table. Higher priority = evaluated first.
// ══════════════════════════════════════════════════════

export const sysDataPolicies = pgTable("sys_data_policies", {
  id: serial("id").primaryKey(),

  /** Policy name for admin UI */
  name: varchar("name", { length: 200 }).notNull(),

  /** Optional description of what this policy enforces */
  description: text("description"),

  /** Which DB table this policy applies to, e.g. "projects", "oa_workflows" */
  entityTable: varchar("entity_table", { length: 100 }).notNull(),

  /** SQL-like condition string, e.g. "bu_code = :userBu AND status != 'DRAFT'" */
  conditionExpression: text("condition_expression").notNull(),

  /** JSONB array of role names this policy applies to */
  allowedRoles: json("allowed_roles").$type<string[]>(),

  /** JSONB array of BU codes this policy applies to */
  allowedBus: json("allowed_bus").$type<string[]>(),

  /** Evaluation priority — higher = evaluated first */
  priority: integer("priority").default(0),

  /** Whether this policy is enforced */
  isActive: boolean("is_active").default(true),

  /** FK → users.id — who created this policy */
  createdBy: integer("created_by").references(() => users.id),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("sys_dp_entity_table_idx").on(table.entityTable),
  index("sys_dp_active_idx").on(table.isActive),
  index("sys_dp_priority_idx").on(table.priority),
]);

// ══════════════════════════════════════════════════════
// Table 5: sys_audit_logs — System-wide Audit Trail
//
// Immutable log of all significant system events.
// Denormalizes actorName for fast reads without JOINs.
// JSONB snapshots capture before/after state for diffing.
// ══════════════════════════════════════════════════════

export const sysAuditLogs = pgTable("sys_audit_logs", {
  id: serial("id").primaryKey(),

  /** Table name of the affected entity */
  entityType: varchar("entity_type", { length: 100 }).notNull(),

  /** Record ID within the entity table */
  entityId: integer("entity_id"),

  /** What happened */
  action: sysAuditActionEnum("action").notNull(),

  /** FK → users.id — who performed the action (nullable for system actions) */
  actorId: integer("actor_id").references(() => users.id),

  /** Denormalized actor display name for fast reads */
  actorName: varchar("actor_name", { length: 200 }),

  /** JSONB snapshot of the record before the change (null for CREATE) */
  previousData: json("previous_data").$type<Record<string, unknown>>(),

  /** JSONB snapshot of the record after the change (null for DELETE) */
  newData: json("new_data").$type<Record<string, unknown>>(),

  /** Client IP address (supports IPv6, max 45 chars) */
  ipAddress: varchar("ip_address", { length: 45 }),

  /** Browser/client user-agent string */
  userAgent: text("user_agent"),

  /** Session identifier for correlating multiple actions */
  sessionId: varchar("session_id", { length: 100 }),

  /** Extra context JSONB — route, module, reason, etc. */
  metadata: json("metadata").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("sys_al_entity_idx").on(table.entityType, table.entityId),
  index("sys_al_actor_idx").on(table.actorId),
  index("sys_al_action_idx").on(table.action),
  index("sys_al_created_at_idx").on(table.createdAt),
]);

// ══════════════════════════════════════════════════════
// Type Exports — Select (read) and Insert (write) models
// ══════════════════════════════════════════════════════

export type SysDictionary = InferSelectModel<typeof sysDictionaries>;
export type NewSysDictionary = InferInsertModel<typeof sysDictionaries>;

export type SysWorkflowDefinition = InferSelectModel<typeof sysWorkflowDefinitions>;
export type NewSysWorkflowDefinition = InferInsertModel<typeof sysWorkflowDefinitions>;

export type SysWorkflowNode = InferSelectModel<typeof sysWorkflowNodes>;
export type NewSysWorkflowNode = InferInsertModel<typeof sysWorkflowNodes>;

export type SysDataPolicy = InferSelectModel<typeof sysDataPolicies>;
export type NewSysDataPolicy = InferInsertModel<typeof sysDataPolicies>;

export type SysAuditLog = InferSelectModel<typeof sysAuditLogs>;
export type NewSysAuditLog = InferInsertModel<typeof sysAuditLogs>;
