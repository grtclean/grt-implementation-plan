/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║       GRT Smart OA & Command Center — Drizzle ORM Schema        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                 ║
 * ║  Absorbs fragmented OA systems (DingTalk, Jiandaoyun) into     ║
 * ║  the unified GRT Digital Twin System.  DingTalk is demoted to  ║
 * ║  notification-only (webhook); all data logic stays in DB.      ║
 * ║                                                                 ║
 * ║  Tables:                                                        ║
 * ║    1. oa_workflows             — Universal OA Applications      ║
 * ║    2. company_events_meetings  — Recurring Meeting Definitions  ║
 * ║    3. meeting_agendas_actions  — Per-Meeting Agenda & Decisions ║
 * ║    4. business_trip_reports    — Post-Trip Technical Reports    ║
 * ║                                                                 ║
 * ║  FK Constraints (all explicit `.references()`):                 ║
 * ║    · oa_workflows.applicant_id          → users.id              ║
 * ║    · oa_workflows.approver_id           → users.id              ║
 * ║    · oa_workflows.linked_project_id     → projects.id           ║
 * ║    · company_events_meetings.organizer_id → users.id            ║
 * ║    · meeting_agendas_actions.meeting_id → company_events_meetings.id ║
 * ║    · meeting_agendas_actions.assigned_to → users.id             ║
 * ║    · business_trip_reports.employee_id  → users.id              ║
 * ║    · business_trip_reports.project_id   → projects.id           ║
 * ║    · business_trip_reports.reviewed_by  → users.id              ║
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
  date,
  json,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Parent table references (existing GRT core tables) ──
import { projects, users } from "./schema";

// ══════════════════════════════════════════════════════
// Enum value tuples (exported for reuse in Zod schemas)
// ══════════════════════════════════════════════════════

/**
 * Workflow types — migrated from Jiandaoyun "人事及OA管理系统" (8 modules, 36 forms):
 *   考勤管理 → LEAVE, OVERTIME, ATTENDANCE_FIX, OUTING
 *   车辆管理 → VEHICLE
 *   物资管理 → STATIONERY, PROCUREMENT
 *   会议管理 → (covered by company_events_meetings table)
 *   其他     → GIFT, SEAL, EXPENSE
 */
export const OA_WORKFLOW_TYPES = [
  "LEAVE",            // 请假申请 (考勤管理)
  "OVERTIME",         // 加班申请 (考勤管理)
  "ATTENDANCE_FIX",   // 补卡申请 (考勤管理)
  "OUTING",           // 外出申请 (考勤管理)
  "VEHICLE",          // 用车申请 (车辆管理)
  "STATIONERY",       // 文具领用 (物资管理)
  "PROCUREMENT",      // 采购申请 (物资管理)
  "EXPENSE",          // 报销申请 (薪酬/财务)
  "SEAL",             // 用印申请 (行政)
  "GIFT",             // 礼品申请 (行政)
] as const;
export const OA_WORKFLOW_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export const OA_AGENDA_STATUSES = ["open", "in_progress", "done", "cancelled"] as const;
export const OA_TRIP_REPORT_STATUSES = ["draft", "submitted", "reviewed"] as const;
export const OA_ANNOUNCEMENT_STATUSES = ["draft", "published", "archived"] as const;

export type OaWorkflowType = (typeof OA_WORKFLOW_TYPES)[number];
export type OaWorkflowStatus = (typeof OA_WORKFLOW_STATUSES)[number];
export type OaAgendaStatus = (typeof OA_AGENDA_STATUSES)[number];
export type OaTripReportStatus = (typeof OA_TRIP_REPORT_STATUSES)[number];
export type OaAnnouncementStatus = (typeof OA_ANNOUNCEMENT_STATUSES)[number];

// ══════════════════════════════════════════════════════
// Postgres Enums
// ══════════════════════════════════════════════════════

export const oaWorkflowTypeEnum = pgEnum("oa_workflow_type", OA_WORKFLOW_TYPES);
export const oaWorkflowStatusEnum = pgEnum("oa_workflow_status", OA_WORKFLOW_STATUSES);
export const oaAgendaStatusEnum = pgEnum("oa_agenda_status", OA_AGENDA_STATUSES);
export const oaTripReportStatusEnum = pgEnum("oa_trip_report_status", OA_TRIP_REPORT_STATUSES);
export const oaAnnouncementStatusEnum = pgEnum("oa_announcement_status", OA_ANNOUNCEMENT_STATUSES);

// ══════════════════════════════════════════════════════
// Shared JSONB Interfaces
// ══════════════════════════════════════════════════════

/** Auto-agenda generation config stored on `company_events_meetings` */
export interface AutoAgendaContext {
  /** Which data sources to pull from: "overdue_task" | "8d_report" | "quality_issue" */
  sourceTypes: string[];
  /** How many days back to search for relevant records */
  lookbackDays: number;
  /** Max items to generate per invocation */
  maxItems: number;
}

/** Single follow-up action on a business trip report */
export interface FollowUpAction {
  action: string;
  assignee: string;
  /** ISO date string YYYY-MM-DD */
  deadline: string;
}

/** File attachment metadata */
export interface TripAttachment {
  name: string;
  url: string;
  /** MIME type or category: "pdf" | "image" | "docx" etc. */
  type: string;
}

/**
 * Digitized Parts Cleaning Questionnaire (ISO 16232 / VDA 19)
 *
 * Captures customer cleaning requirements during field visits.
 * All fields optional — sales engineers fill what the customer provides.
 */
export interface TechnicalQuestionnaireData {
  // ── Part identification ──
  partName?: string;
  partNumber?: string;
  partDimensions?: { length: number; width: number; height: number; unit: string };
  partWeight?: { value: number; unit: string };
  partMaterial?: string;
  annualVolume?: number;

  // ── Cleanliness requirements ──
  /** e.g. "ISO 16232", "VDA 19" */
  cleanlinessStandard?: string;
  /** e.g. "Max 500μm" */
  particleRequirements?: string;
  residualContamination?: string;
  surfaceRequirements?: string;

  // ── Process parameters ──
  currentCleaningMethod?: string;
  /** e.g. ["oil", "chips", "dust", "emulsion"] */
  contaminantTypes?: string[];
  /** "water-based" | "solvent" | "hybrid" */
  mediaType?: string;
  dryingRequired?: boolean;
  /** Target cycle time in seconds */
  cycleTimeTarget?: number;

  // ── Equipment & infrastructure ──
  existingEquipment?: string;
  spaceConstraints?: string;
  /** Compressed air, water supply, power specs */
  utilityAvailability?: string;

  // ── Additional notes ──
  specialRequirements?: string;
  customerNotes?: string;
}

// ══════════════════════════════════════════════════════
// Table 1: oa_workflows — Universal OA Applications
//
// Single table for LEAVE / VEHICLE / STATIONERY / GIFT.
// Type-specific form fields live in the typed JSONB `content` column,
// avoiding table sprawl while keeping the DB schema flat.
// ══════════════════════════════════════════════════════

export const oaWorkflows = pgTable("oa_workflows", {
  id: serial("id").primaryKey(),

  /** FK → users.id — who submitted the request */
  applicantId: integer("applicant_id").references(() => users.id),

  /** Discriminator: LEAVE | VEHICLE | STATIONERY | GIFT */
  type: oaWorkflowTypeEnum("type").notNull(),

  /** State machine: PENDING → APPROVED / REJECTED / CANCELLED */
  status: oaWorkflowStatusEnum("status").default("PENDING").notNull(),

  /** Human-readable summary, e.g. "张三请假3天(2026-02-21~23)" */
  title: varchar("title", { length: 200 }).notNull(),

  /**
   * JSONB payload — form-specific data per workflow type.
   * Examples:
   *   LEAVE:           { startDate, endDate, leaveType, reason, totalDays }
   *   OVERTIME:        { date, startTime, endTime, hours, reason, compensationType }
   *   ATTENDANCE_FIX:  { date, originalTime, correctedTime, reason }
   *   OUTING:          { date, startTime, endTime, destination, reason }
   *   VEHICLE:         { date, destination, passengers, purpose, returnTime }
   *   STATIONERY:      { items: [{ name, qty, unit }] }
   *   PROCUREMENT:     { items: [{ name, spec, qty, unitPrice, totalPrice }], budgetSource }
   *   EXPENSE:         { items: [{ category, amount, date, receipt }], totalAmount, tripRequestId }
   *   SEAL:            { sealType, documentTitle, copies, usage, returnDate }
   *   GIFT:            { recipient, occasion, items, budget }
   */
  content: json("content").$type<Record<string, unknown>>(),

  /** Optional FK → projects.id — ties cost to a project */
  linkedProjectId: integer("linked_project_id").references(() => projects.id),

  /** FK → users.id — assigned approver (nullable for auto-routing) */
  approverId: integer("approver_id").references(() => users.id),

  /** UTC timestamp of approval/rejection action */
  approvedAt: timestamp("approved_at", { mode: "string" }),

  /** Free-text approval/rejection reason */
  approverComment: text("approver_comment"),

  /** Whether DingTalk webhook notification was successfully sent */
  dingtalkNotified: boolean("dingtalk_notified").default(false),

  /** Optimistic locking — incremented on every state transition */
  version: integer("version").default(1).notNull(),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("oa_workflows_type_idx").on(table.type),
  index("oa_workflows_status_idx").on(table.status),
  index("oa_workflows_applicant_idx").on(table.applicantId),
  index("oa_workflows_project_idx").on(table.linkedProjectId),
]);

// ══════════════════════════════════════════════════════
// Table 2: company_events_meetings — Recurring Meeting Definitions
//
// Separate from existing `meeting_schedules` which is tightly coupled
// to channel-based meetings. This table is purpose-built for OA
// recurring meetings with auto-agenda generation.
// ══════════════════════════════════════════════════════

export const companyEventsMeetings = pgTable("company_events_meetings", {
  id: serial("id").primaryKey(),

  /** e.g. "BU Weekly Morning Meeting" */
  title: varchar("title", { length: 200 }).notNull(),

  description: text("description"),

  /** Optional department scope (denormalized; no FK to keep schema self-contained) */
  departmentId: integer("department_id"),

  /** FK → users.id — meeting organizer */
  organizerId: integer("organizer_id").references(() => users.id),

  /** Start time HH:MM, e.g. "07:50" */
  startTime: varchar("start_time", { length: 20 }),

  /** End time HH:MM, e.g. "08:30" */
  endTime: varchar("end_time", { length: 20 }),

  /** Day of week: 0=Sun, 1=Mon, …, 6=Sat */
  dayOfWeek: integer("day_of_week"),

  /** iCal RRULE or simple pattern, e.g. "FREQ=WEEKLY;BYDAY=MO" */
  recurrenceRule: varchar("recurrence_rule", { length: 200 }),

  /** Physical or virtual location */
  location: varchar("location", { length: 200 }),

  /** Config for auto-generating agenda items from project/quality data */
  autoAgendaContext: json("auto_agenda_context").$type<AutoAgendaContext>(),

  /** Soft-delete flag — false hides from listing */
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("cem_department_idx").on(table.departmentId),
  index("cem_active_idx").on(table.isActive),
]);

// ══════════════════════════════════════════════════════
// Table 3: meeting_agendas_actions — Per-Meeting Agenda Items & Decisions
//
// Each row is one agenda topic for a specific occurrence date.
// Manager edits decision, assignee, and status inline during the meeting.
// ══════════════════════════════════════════════════════

export const meetingAgendasActions = pgTable("meeting_agendas_actions", {
  id: serial("id").primaryKey(),

  /** FK → company_events_meetings.id */
  meetingId: integer("meeting_id").references(() => companyEventsMeetings.id),

  /** Specific occurrence date (YYYY-MM-DD) — one meeting can have many dates */
  meetingDate: date("meeting_date", { mode: "string" }),

  /** The topic / issue text */
  agendaItem: text("agenda_item"),

  /** Origin of this item: "overdue_task" | "8d_report" | "quality_issue" | "manual" */
  sourceType: varchar("source_type", { length: 50 }),

  /** FK to source record (projectTasks.id or eightDReports.id); nullable for manual items */
  sourceId: integer("source_id"),

  /** In-meeting decision — editable by manager */
  decision: text("decision"),

  /** FK → users.id — person responsible for follow-up */
  assignedTo: integer("assigned_to").references(() => users.id),

  /** Follow-up deadline (YYYY-MM-DD) */
  deadline: date("deadline", { mode: "string" }),

  /** open → in_progress → done | cancelled */
  status: oaAgendaStatusEnum("status").default("open").notNull(),

  /** Display order within a single meeting occurrence */
  sortOrder: integer("sort_order").default(0),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("maa_meeting_date_idx").on(table.meetingId, table.meetingDate),
  index("maa_status_idx").on(table.status),
  index("maa_assigned_idx").on(table.assignedTo),
]);

// ══════════════════════════════════════════════════════
// Table 4: business_trip_reports — Post-Trip Reports
//   with technical questionnaire (Parts Cleaning)
// ══════════════════════════════════════════════════════

export const businessTripReports = pgTable("business_trip_reports", {
  id: serial("id").primaryKey(),

  /** FK → users.id — the travelling employee */
  employeeId: integer("employee_id").references(() => users.id),

  /** Optional FK → projects.id */
  projectId: integer("project_id").references(() => projects.id),

  /** Optional FK to existing trip_requests table (legacy link) */
  tripRequestId: integer("trip_request_id"),

  /** Optional — visited customer ID (denormalized, no FK) */
  customerId: integer("customer_id"),

  travelStartDate: date("travel_start_date", { mode: "string" }),
  travelEndDate: date("travel_end_date", { mode: "string" }),

  /** City / site name */
  destination: varchar("destination", { length: 200 }),

  /** Narrative report of the trip */
  tripSummary: text("trip_summary"),

  /** Technical findings & observations */
  keyFindings: text("key_findings"),

  /** Structured follow-up actions with assignee + deadline */
  followUpActions: json("follow_up_actions").$type<FollowUpAction[]>(),

  /** Digitized Parts Cleaning Questionnaire (ISO 16232 / VDA 19) */
  technicalQuestionnaireData: json("technical_questionnaire_data").$type<TechnicalQuestionnaireData>(),

  /** File attachment metadata */
  attachments: json("attachments").$type<TripAttachment[]>(),

  /** draft → submitted → reviewed */
  status: oaTripReportStatusEnum("status").default("draft").notNull(),

  /** UTC timestamp when employee clicked "Submit" */
  submittedAt: timestamp("submitted_at", { mode: "string" }),

  /** FK → users.id — manager who reviewed */
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("btr_employee_idx").on(table.employeeId),
  index("btr_project_idx").on(table.projectId),
  index("btr_status_idx").on(table.status),
  index("btr_travel_start_idx").on(table.travelStartDate),
]);

// ══════════════════════════════════════════════════════
// Table 5: oa_leave_balances — 假期余额 (from JDY 考勤管理)
//
// Tracks annual/sick/personal leave quota per employee per year.
// Decremented by approved LEAVE workflows.
// ══════════════════════════════════════════════════════

export const OA_LEAVE_TYPES = [
  "annual",        // 年假
  "sick",          // 病假
  "personal",      // 事假
  "maternity",     // 产假
  "paternity",     // 陪产假
  "marriage",      // 婚假
  "bereavement",   // 丧假
  "compensatory",  // 调休 (from approved overtime)
] as const;
export type OaLeaveType = (typeof OA_LEAVE_TYPES)[number];

export const oaLeaveBalances = pgTable("oa_leave_balances", {
  id: serial("id").primaryKey(),

  /** FK → users.id */
  employeeId: integer("employee_id").references(() => users.id).notNull(),

  /** Calendar year, e.g. 2026 */
  year: integer("year").notNull(),

  /** Leave category */
  leaveType: varchar("leave_type", { length: 30 }).notNull(),

  /** Total days allocated for the year */
  totalDays: integer("total_days").default(0).notNull(),

  /** Days already consumed (approved leaves) */
  usedDays: integer("used_days").default(0).notNull(),

  /** Days currently pending approval */
  pendingDays: integer("pending_days").default(0).notNull(),

  /** Carried over from previous year (if policy allows) */
  carriedOverDays: integer("carried_over_days").default(0),

  /** Expiry date for carried-over days */
  carryOverExpiry: date("carry_over_expiry", { mode: "string" }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("olb_employee_year_idx").on(table.employeeId, table.year),
  index("olb_leave_type_idx").on(table.leaveType),
]);

// ══════════════════════════════════════════════════════
// Table 6: oa_announcements — 公告通知 (from JDY 会议管理/通知)
//
// Company-wide or department-scoped announcements.
// Replaces ad-hoc DingTalk blasts with trackable, searchable notices.
// ══════════════════════════════════════════════════════

export const oaAnnouncements = pgTable("oa_announcements", {
  id: serial("id").primaryKey(),

  /** Human-readable title */
  title: varchar("title", { length: 300 }).notNull(),

  /** Rich-text or markdown content */
  content: text("content"),

  /** "notice" | "policy" | "event" | "hr" | "safety" | "general" */
  category: varchar("category", { length: 50 }).default("general"),

  /** Importance level: "normal" | "important" | "urgent" */
  priority: varchar("priority", { length: 20 }).default("normal"),

  /** FK → users.id — who published */
  authorId: integer("author_id").references(() => users.id),

  /** Optional department scope (null = company-wide) */
  departmentId: integer("department_id"),

  /** draft → published → archived */
  status: oaAnnouncementStatusEnum("status").default("draft").notNull(),

  /** When it becomes visible */
  publishedAt: timestamp("published_at", { mode: "string" }),

  /** Auto-archive after this date (null = never) */
  expiresAt: timestamp("expires_at", { mode: "string" }),

  /** Whether to send DingTalk notification on publish */
  notifyDingtalk: boolean("notify_dingtalk").default(false),

  /** Whether DingTalk was actually sent */
  dingtalkNotified: boolean("dingtalk_notified").default(false),

  /** File attachments */
  attachments: json("attachments").$type<TripAttachment[]>(),

  /** Pin to top of announcement list */
  isPinned: boolean("is_pinned").default(false),

  /** Read count (denormalized for dashboard) */
  viewCount: integer("view_count").default(0),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("oa_ann_status_idx").on(table.status),
  index("oa_ann_category_idx").on(table.category),
  index("oa_ann_author_idx").on(table.authorId),
  index("oa_ann_department_idx").on(table.departmentId),
  index("oa_ann_pinned_idx").on(table.isPinned),
]);

// ══════════════════════════════════════════════════════
// Type Exports — Select (read) and Insert (write) models
// ══════════════════════════════════════════════════════

export type OaWorkflow = InferSelectModel<typeof oaWorkflows>;
export type InsertOaWorkflow = InferInsertModel<typeof oaWorkflows>;

export type CompanyEventMeeting = InferSelectModel<typeof companyEventsMeetings>;
export type InsertCompanyEventMeeting = InferInsertModel<typeof companyEventsMeetings>;

export type MeetingAgendaAction = InferSelectModel<typeof meetingAgendasActions>;
export type InsertMeetingAgendaAction = InferInsertModel<typeof meetingAgendasActions>;

export type BusinessTripReport = InferSelectModel<typeof businessTripReports>;
export type InsertBusinessTripReport = InferInsertModel<typeof businessTripReports>;

export type OaLeaveBalance = InferSelectModel<typeof oaLeaveBalances>;
export type InsertOaLeaveBalance = InferInsertModel<typeof oaLeaveBalances>;

export type OaAnnouncement = InferSelectModel<typeof oaAnnouncements>;
export type InsertOaAnnouncement = InferInsertModel<typeof oaAnnouncements>;
