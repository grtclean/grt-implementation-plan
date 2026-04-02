/**
 * Budget Overrun Approval Schema
 *
 * Tracks budget overrun requests and their approval workflow.
 * Linked to projects — when actual cost exceeds budgeted amount,
 * a request is created for manager/director approval.
 */
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  real,
  serial,
} from "drizzle-orm/pg-core";

export const budgetOverrunRequests = pgTable("budget_overrun_requests", {
  id: serial("id").primaryKey(),
  /** Project ID reference */
  projectId: integer("project_id"),
  projectName: varchar("project_name", { length: 300 }),
  /** Requestor */
  requestorId: integer("requestor_id"),
  requestorName: varchar("requestor_name", { length: 200 }),
  /** Original budget amount */
  originalBudget: real("original_budget").notNull(),
  /** Requested additional amount */
  overrunAmount: real("overrun_amount").notNull(),
  /** New total budget if approved */
  newTotalBudget: real("new_total_budget").notNull(),
  /** Overrun percentage */
  overrunPercent: real("overrun_percent"),
  /** Reason / justification */
  reason: text("reason"),
  /** Category: material | labor | subcontract | travel | other */
  category: varchar("category", { length: 50 }).default("other"),
  /** Status: pending | approved | rejected | cancelled */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  /** Approver info */
  approverId: integer("approver_id"),
  approverName: varchar("approver_name", { length: 200 }),
  approverComment: text("approver_comment"),
  approvedAt: timestamp("approved_at"),
  /** BU scope */
  buCode: varchar("bu_code", { length: 50 }),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
