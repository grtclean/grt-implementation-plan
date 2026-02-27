/**
 * 并行调试指挥中心 Schema — Real DB tables
 * Dual-Track Concurrent Debugging Architecture:
 *   Track 1 — Software dev sandboxes with AI agents
 *   Track 2 — Hardware equipment commissioning (FAT/SAT)
 *   Audit — Activity log
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  index,
} from 'drizzle-orm/pg-core';

// ─── Track 1: Software Dev Sandboxes ──────────────────────────
export const cccSandboxes = pgTable('ccc_sandboxes', {
  id: serial('id').primaryKey(),
  moduleName: varchar('module_name', { length: 100 }).notNull(),
  assignedAiAgent: varchar('assigned_ai_agent', { length: 100 }).notNull(),
  branchName: varchar('branch_name', { length: 200 }).notNull(),
  branchStatus: varchar('branch_status', { length: 30 }).notNull().default('ISOLATED'),
  managerApproved: boolean('manager_approved').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

// ─── Track 2: Equipment Commissioning Rooms ───────────────────
export const cccRooms = pgTable('ccc_rooms', {
  id: serial('id').primaryKey(),
  projectName: varchar('project_name', { length: 200 }).notNull(),
  subSystem: varchar('sub_system', { length: 100 }).notNull(),
  engineerAssigned: varchar('engineer_assigned', { length: 100 }),
  testStatus: varchar('test_status', { length: 30 }).notNull().default('IDLE'),
  testNotes: text('test_notes'),
  reportApproved: boolean('report_approved').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

// ─── Activity Log ─────────────────────────────────────────────
export const cccActivities = pgTable('ccc_activities', {
  id: serial('id').primaryKey(),
  action: varchar('action', { length: 100 }).notNull(),
  target: varchar('target', { length: 200 }).notNull(),
  userName: varchar('user_name', { length: 100 }).notNull(),
  extraData: json('extra_data'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('ccc_activities_created_at_idx').on(table.createdAt),
]);

// Type exports
export type CccSandbox = typeof cccSandboxes.$inferSelect;
export type CccRoom = typeof cccRooms.$inferSelect;
export type CccActivity = typeof cccActivities.$inferSelect;
