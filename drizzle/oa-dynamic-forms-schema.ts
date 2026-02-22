/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   GRT Smart OA — Dynamic Forms Schema (Drizzle ORM)            ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Extends the core OA system (oa-schema.ts) with user-defined   ║
 * ║  form templates — Jiandaoyun-style dynamic forms that can be   ║
 * ║  created, versioned, and filled in by employees without code   ║
 * ║  changes.  Replaces the need to add new workflow types to the  ║
 * ║  OA_WORKFLOW_TYPES enum each time a new form is required.      ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. oa_form_templates          — Reusable form definitions    ║
 * ║    2. oa_form_submissions        — Filled-in form instances     ║
 * ║    3. oa_form_approval_records   — Audit trail per step         ║
 * ║    4. oa_form_template_versions  — Version history snapshots    ║
 * ║    5. oa_form_favorites          — User-pinned quick access     ║
 * ║                                                                 ║
 * ║  FK Constraints (all explicit `.references()`):                 ║
 * ║    · oa_form_templates.created_by            → users.id         ║
 * ║    · oa_form_submissions.template_id         → oa_form_templates.id ║
 * ║    · oa_form_submissions.applicant_id        → users.id         ║
 * ║    · oa_form_submissions.current_approver_id → users.id         ║
 * ║    · oa_form_approval_records.submission_id  → oa_form_submissions.id ║
 * ║    · oa_form_approval_records.approver_id    → users.id         ║
 * ║    · oa_form_template_versions.template_id   → oa_form_templates.id ║
 * ║    · oa_form_template_versions.changed_by    → users.id         ║
 * ║    · oa_form_favorites.user_id               → users.id         ║
 * ║    · oa_form_favorites.template_id           → oa_form_templates.id ║
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
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { users } from "./schema";

// ══════════════════════════════════════════════════════
// JSONB Interfaces — Dynamic Form Field & Approval Flow
// ══════════════════════════════════════════════════════

/**
 * Single field definition inside a form template.
 *
 * Each template stores an array of these in the `fields` JSONB column.
 * The frontend form renderer reads this definition to dynamically
 * build the form UI — labels, validation, conditional visibility, layout.
 *
 * Supported field types:
 *   - text / textarea / rich_text   — Free-form text input
 *   - number                        — Numeric input with min/max
 *   - date / datetime               — Date or datetime picker
 *   - select / multiselect / radio  — Single or multi-choice (uses `options`)
 *   - checkbox                      — Boolean toggle
 *   - file                          — File upload
 *   - user / department             — Entity picker (GRT user or dept)
 *   - address                       — Structured address input
 */
export interface DynamicFormFieldDef {
  /** Field key used as the property name in formData, e.g. "startDate" */
  name: string;
  /** Chinese display label, e.g. "开始日期" */
  label: string;
  /** English label for bilingual UI */
  labelEn?: string;
  /** Widget type that determines how the field is rendered */
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime"
    | "select"
    | "multiselect"
    | "radio"
    | "checkbox"
    | "file"
    | "user"
    | "department"
    | "address"
    | "rich_text";
  /** Whether this field must be filled before submission */
  required?: boolean;
  /** Placeholder text shown in empty input */
  placeholder?: string;
  /** Pre-populated value when creating a new submission */
  defaultValue?: unknown;
  /** Choice list for select / multiselect / radio field types */
  options?: { value: string; label: string }[];
  /** Validation constraints applied on the client and server side */
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    /** Regex pattern string (without delimiters) */
    pattern?: string;
    /** Human-readable error message shown when validation fails */
    message?: string;
  };
  /**
   * Conditional visibility rule — this field is only shown when
   * another field's value matches the given condition.
   * Example: `{ field: "travelType", operator: "eq", value: "international" }`
   */
  visibleIf?: {
    field: string;
    operator: "eq" | "neq" | "in";
    value: unknown;
  };
  /** Grid column span (1–12) for responsive layout */
  gridCol?: number;
  /** Visual group name — fields with the same group are rendered together */
  group?: string;
  /** Tooltip / help text shown next to the field label */
  helpText?: string;
  /** If true, field is displayed but not editable */
  readOnly?: boolean;
}

/**
 * Approval flow configuration attached to a form template.
 *
 * Defines an ordered sequence of approval steps that a submission
 * must pass through.  Each step can target a fixed user, a role,
 * the submitter's direct supervisor, or the department head.
 */
export interface ApprovalFlowConfig {
  /** Ordered list of approval steps */
  steps: ApprovalStepConfig[];
  /** Whether the submitter can withdraw after submission (default: false) */
  allowWithdraw?: boolean;
  /** Auto-approve if no approver can be resolved for a step (default: false) */
  autoApproveIfNoApprover?: boolean;
}

/**
 * Single step within an approval flow.
 *
 * The `approverType` discriminator determines how the system resolves
 * who needs to approve at this step:
 *   - fixed_user:           Uses `approverIds` list
 *   - role:                 Uses `approverRole` (e.g. "hr_manager")
 *   - department_head:      Uses `approverDepartmentLevel` (1=direct, 2=skip-level)
 *   - submitter_supervisor: Auto-resolved from org chart
 *   - custom:               Custom logic (handled by backend hook)
 */
export interface ApprovalStepConfig {
  /** Display name for this step, e.g. "部门经理审批" */
  stepName: string;
  /** English step name */
  stepNameEn?: string;
  /** How to resolve the approver(s) for this step */
  approverType:
    | "fixed_user"
    | "role"
    | "department_head"
    | "submitter_supervisor"
    | "custom";
  /** User IDs — only used when approverType = "fixed_user" */
  approverIds?: number[];
  /** Role identifier — only used when approverType = "role" */
  approverRole?: string;
  /**
   * Department head level — only used when approverType = "department_head".
   * 1 = direct department head, 2 = skip-level (department head's manager).
   */
  approverDepartmentLevel?: number;
  /**
   * When multiple approvers are resolved for this step:
   *   "all" = everyone must approve (AND logic, countersign)
   *   "any" = one approval is sufficient (OR logic, first-come)
   */
  multiApproveMode?: "all" | "any";
  /** Auto-skip this step if the resolved approver is the submitter */
  skipIfSelf?: boolean;
}

// ══════════════════════════════════════════════════════
// Status Constants (exported for reuse in Zod schemas)
// ══════════════════════════════════════════════════════

/**
 * Submission lifecycle statuses:
 *   draft      — Saved but not yet submitted
 *   pending    — Submitted, awaiting approval
 *   approved   — All approval steps passed
 *   rejected   — Rejected at any approval step
 *   cancelled  — Cancelled by system/admin
 *   withdrawn  — Withdrawn by submitter (if allowed by template)
 */
export const OA_FORM_SUBMISSION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "withdrawn",
] as const;
export type OaFormSubmissionStatus = (typeof OA_FORM_SUBMISSION_STATUSES)[number];

/**
 * Approval record actions:
 *   approve   — Step approved
 *   reject    — Step rejected (blocks the submission)
 *   return    — Returned to submitter for correction
 *   delegate  — Delegated to another user
 */
export const OA_FORM_APPROVAL_ACTIONS = [
  "approve",
  "reject",
  "return",
  "delegate",
] as const;
export type OaFormApprovalAction = (typeof OA_FORM_APPROVAL_ACTIONS)[number];

/**
 * Template categories — used for grouping in the form picker UI
 */
export const OA_FORM_CATEGORIES = [
  "hr",        // 人事类 (请假、转正、离职)
  "admin",     // 行政类 (用车、用印、物资)
  "finance",   // 财务类 (报销、预算、合同)
  "project",   // 项目类 (立项、变更、验收)
  "general",   // 通用类
] as const;
export type OaFormCategory = (typeof OA_FORM_CATEGORIES)[number];

/**
 * Submission priority levels
 */
export const OA_FORM_PRIORITIES = [
  "normal",
  "high",
  "urgent",
] as const;
export type OaFormPriority = (typeof OA_FORM_PRIORITIES)[number];

// ══════════════════════════════════════════════════════
// Table 1: oa_form_templates — Reusable Form Definitions
//
// Each template defines a complete form type: its fields (JSONB array
// of DynamicFormFieldDef), approval flow, display metadata, and
// versioning info.  Templates can be created by admins and reused
// by any employee to submit instances (oa_form_submissions).
//
// Examples:
//   - "出差申请"    (TRAVEL_REQ)      — category: hr
//   - "合同审批"    (CONTRACT_APPROVAL) — category: finance
//   - "设备借用"    (EQUIPMENT_BORROW) — category: admin
// ══════════════════════════════════════════════════════

export const oaFormTemplates = pgTable("oa_form_templates", {
  id: serial("id").primaryKey(),

  /**
   * Machine-readable unique code, e.g. "TRAVEL_REQ", "CONTRACT_APPROVAL".
   * Used for programmatic lookups and API filtering.
   */
  templateCode: varchar("template_code", { length: 50 }).unique(),

  /** Chinese display name, e.g. "出差申请" */
  templateName: varchar("template_name", { length: 200 }).notNull(),

  /** English display name, e.g. "Travel Request" */
  templateNameEn: varchar("template_name_en", { length: 200 }),

  /** Optional description explaining when to use this template */
  description: text("description"),

  /**
   * Category for grouping in the form picker UI.
   * Values: "hr" | "admin" | "finance" | "project" | "general"
   */
  category: varchar("category", { length: 50 }).default("general"),

  /** Lucide icon name for UI rendering, e.g. "plane", "file-text", "wrench" */
  icon: varchar("icon", { length: 50 }),

  /** Tailwind color class for card/badge display, e.g. "blue-500", "emerald-600" */
  color: varchar("color", { length: 20 }),

  /**
   * Array of DynamicFormFieldDef objects defining every field in the form.
   * The frontend form renderer iterates this array to build the UI.
   *
   * Example:
   * [
   *   { name: "destination", label: "目的地", type: "text", required: true },
   *   { name: "startDate", label: "出发日期", type: "date", required: true },
   *   { name: "endDate", label: "返回日期", type: "date", required: true },
   *   { name: "reason", label: "出差事由", type: "textarea", required: true },
   *   { name: "budget", label: "预算金额", type: "number", validation: { min: 0 } }
   * ]
   */
  fields: jsonb("fields").$type<DynamicFormFieldDef[]>().notNull(),

  /**
   * Approval chain configuration — defines who approves and in what order.
   * Null means no approval needed (auto-approved on submission).
   */
  approvalFlow: jsonb("approval_flow").$type<ApprovalFlowConfig>(),

  /** Template version number — incremented on each edit */
  version: integer("version").default(1),

  /** Soft-disable flag — inactive templates don't appear in the form picker */
  isActive: boolean("is_active").default(true),

  /**
   * System templates are pre-seeded and cannot be deleted by users.
   * They can still be edited (fields, flow) but the template itself persists.
   */
  isSystem: boolean("is_system").default(false),

  /** FK → users.id — who created this template */
  createdBy: integer("created_by").references(() => users.id),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  index("oft_template_code_idx").on(table.templateCode),
  index("oft_category_idx").on(table.category),
  index("oft_is_active_idx").on(table.isActive),
]);

// ══════════════════════════════════════════════════════
// Table 2: oa_form_submissions — Filled-in Form Instances
//
// When a user fills out a form template and submits it, a submission
// record is created.  The `formData` JSONB column stores the actual
// field values keyed by field.name from the template definition.
//
// Key denormalized columns (templateCode, templateName, applicantName,
// departmentName) are snapshots at submission time — they survive
// template renames and user department transfers.
// ══════════════════════════════════════════════════════

export const oaFormSubmissions = pgTable("oa_form_submissions", {
  id: serial("id").primaryKey(),

  /**
   * Auto-generated unique submission code: "DF-YYYYMMDD-XXXX"
   * where XXXX is a zero-padded daily sequence number.
   */
  submissionCode: varchar("submission_code", { length: 50 }).unique(),

  /** FK → oa_form_templates.id — which template was used */
  templateId: integer("template_id")
    .references(() => oaFormTemplates.id)
    .notNull(),

  /** Denormalized template code for quick filtering without JOIN */
  templateCode: varchar("template_code", { length: 50 }),

  /** Denormalized template name — snapshot at submission time */
  templateName: varchar("template_name", { length: 200 }),

  /** FK → users.id — who submitted this form */
  applicantId: integer("applicant_id").references(() => users.id),

  /** Denormalized applicant display name */
  applicantName: varchar("applicant_name", { length: 100 }),

  /** Applicant's department at submission time */
  departmentId: integer("department_id"),

  /** Denormalized department name */
  departmentName: varchar("department_name", { length: 100 }),

  /** Human-readable summary line, e.g. "张三 — 出差申请（上海→北京）" */
  title: varchar("title", { length: 300 }).notNull(),

  /**
   * The actual filled-in values keyed by field.name from the template.
   * Example: { "destination": "北京", "startDate": "2026-03-01", "budget": 5000 }
   */
  formData: jsonb("form_data").$type<Record<string, unknown>>().notNull(),

  /** Optional FK → projects.id — ties this submission to a project */
  linkedProjectId: integer("linked_project_id"),

  /** Denormalized project name */
  linkedProjectName: varchar("linked_project_name", { length: 200 }),

  /**
   * Submission lifecycle status.
   * Values: "draft" | "pending" | "approved" | "rejected" | "cancelled" | "withdrawn"
   */
  status: varchar("status", { length: 30 }).default("draft").notNull(),

  /** FK → users.id — who currently needs to take action on this submission */
  currentApproverId: integer("current_approver_id").references(() => users.id),

  /** Denormalized current approver name */
  currentApproverName: varchar("current_approver_name", { length: 100 }),

  /** Which step (0-based) in the approval chain is currently active */
  currentApprovalStep: integer("current_approval_step").default(0),

  /** UTC timestamp when the final approval was granted */
  approvedAt: timestamp("approved_at", { mode: "string" }),

  /** UTC timestamp when the submission was rejected */
  rejectedAt: timestamp("rejected_at", { mode: "string" }),

  /** Free-text reason provided by the rejecting approver */
  rejectionReason: text("rejection_reason"),

  /**
   * Priority level: "normal" | "high" | "urgent"
   * High/urgent submissions may trigger faster notification cadence.
   */
  priority: varchar("priority", { length: 20 }).default("normal"),

  /** Optional deadline — the submission should be resolved by this date */
  dueDate: timestamp("due_date", { mode: "string" }),

  /** Whether DingTalk webhook notification was successfully sent */
  dingtalkNotified: boolean("dingtalk_notified").default(false),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ofs_submission_code_idx").on(table.submissionCode),
  index("ofs_template_id_idx").on(table.templateId),
  index("ofs_applicant_id_idx").on(table.applicantId),
  index("ofs_status_idx").on(table.status),
  index("ofs_current_approver_idx").on(table.currentApproverId),
  index("ofs_created_at_idx").on(table.createdAt),
]);

// ══════════════════════════════════════════════════════
// Table 3: oa_form_approval_records — Audit Trail per Step
//
// Every approval action (approve / reject / return / delegate) on a
// submission is recorded here.  This provides a complete audit trail
// required for compliance and dispute resolution.
//
// One submission may have multiple records — one per approval step
// that has been acted upon.
// ══════════════════════════════════════════════════════

export const oaFormApprovalRecords = pgTable("oa_form_approval_records", {
  id: serial("id").primaryKey(),

  /** FK → oa_form_submissions.id — which submission this record belongs to */
  submissionId: integer("submission_id")
    .references(() => oaFormSubmissions.id)
    .notNull(),

  /** Which step (0-based) in the approval chain this record represents */
  stepIndex: integer("step_index").notNull(),

  /** Display name of the step, e.g. "部门经理审批", "HR确认" */
  stepName: varchar("step_name", { length: 100 }),

  /** FK → users.id — who performed the action */
  approverId: integer("approver_id").references(() => users.id),

  /** Denormalized approver display name */
  approverName: varchar("approver_name", { length: 100 }),

  /**
   * The action taken at this step:
   *   "approve"  — Approved, moves to next step
   *   "reject"   — Rejected, submission status → rejected
   *   "return"   — Returned to submitter for correction
   *   "delegate" — Delegated to another user (see delegatedToId)
   */
  action: varchar("action", { length: 20 }).notNull(),

  /** Free-text comment from the approver */
  comment: text("comment"),

  /** FK → users.id — when action = "delegate", who it was delegated to */
  delegatedToId: integer("delegated_to_id"),

  /** Denormalized delegate name */
  delegatedToName: varchar("delegated_to_name", { length: 100 }),

  /** UTC timestamp when this action was taken */
  actionAt: timestamp("action_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("ofar_submission_id_idx").on(table.submissionId),
  index("ofar_approver_id_idx").on(table.approverId),
  index("ofar_action_at_idx").on(table.actionAt),
]);

// ══════════════════════════════════════════════════════
// Table 4: oa_form_template_versions — Version History Snapshots
//
// When a template is modified (fields added/removed, approval flow
// changed), the previous version is saved here before the update.
// This ensures existing submissions can be displayed with the field
// definitions that were active when they were created.
// ══════════════════════════════════════════════════════

export const oaFormTemplateVersions = pgTable("oa_form_template_versions", {
  id: serial("id").primaryKey(),

  /** FK → oa_form_templates.id — which template this version belongs to */
  templateId: integer("template_id")
    .references(() => oaFormTemplates.id)
    .notNull(),

  /** Version number at the time of this snapshot (matches template.version before bump) */
  version: integer("version").notNull(),

  /** Snapshot of the fields array at this version */
  fields: jsonb("fields").$type<DynamicFormFieldDef[]>().notNull(),

  /** Snapshot of the approval flow at this version */
  approvalFlow: jsonb("approval_flow").$type<ApprovalFlowConfig>(),

  /** FK → users.id — who made the change */
  changedBy: integer("changed_by").references(() => users.id),

  /** Free-text notes describing what changed in this version */
  changeNotes: text("change_notes"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  unique("oftv_template_version_uq").on(table.templateId, table.version),
  index("oftv_template_id_idx").on(table.templateId),
]);

// ══════════════════════════════════════════════════════
// Table 5: oa_form_favorites — User-Pinned Quick Access
//
// Users can pin frequently-used form templates to their dashboard
// for one-click access.  The `sortOrder` column allows drag-and-drop
// reordering in the UI.
// ══════════════════════════════════════════════════════

export const oaFormFavorites = pgTable("oa_form_favorites", {
  id: serial("id").primaryKey(),

  /** FK → users.id — which user pinned this template */
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),

  /** FK → oa_form_templates.id — which template was pinned */
  templateId: integer("template_id")
    .references(() => oaFormTemplates.id)
    .notNull(),

  /** Display order in the user's favorites list (lower = higher priority) */
  sortOrder: integer("sort_order").default(0),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  unique("off_user_template_uq").on(table.userId, table.templateId),
  index("off_user_id_idx").on(table.userId),
]);

// ══════════════════════════════════════════════════════
// Type Exports — Select (read) and Insert (write) models
// ══════════════════════════════════════════════════════

export type OaFormTemplate = InferSelectModel<typeof oaFormTemplates>;
export type InsertOaFormTemplate = InferInsertModel<typeof oaFormTemplates>;

export type OaFormSubmission = InferSelectModel<typeof oaFormSubmissions>;
export type InsertOaFormSubmission = InferInsertModel<typeof oaFormSubmissions>;

export type OaFormApprovalRecord = InferSelectModel<typeof oaFormApprovalRecords>;
export type InsertOaFormApprovalRecord = InferInsertModel<typeof oaFormApprovalRecords>;

export type OaFormTemplateVersion = InferSelectModel<typeof oaFormTemplateVersions>;

export type OaFormFavorite = InferSelectModel<typeof oaFormFavorites>;
