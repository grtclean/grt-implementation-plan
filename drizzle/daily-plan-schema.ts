/**
 * 每日计划收件箱 — 主管/客户指派任务
 * Used by daily plan 8-source aggregation system
 */
import { pgTable, serial, integer, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

export const dailyPlanInbox = pgTable("daily_plan_inbox", {
  id: serial("id").primaryKey(),
  targetUserId: integer("target_user_id").notNull(),
  assignedByName: varchar("assigned_by_name", { length: 100 }),
  category: varchar("category", { length: 30 }).default("supervisor"),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 10 }).default("P2"),
  sourceReference: varchar("source_reference", { length: 200 }),
  dueDate: varchar("due_date", { length: 20 }),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("daily_plan_inbox_user_status_idx").on(table.targetUserId, table.status),
]);
