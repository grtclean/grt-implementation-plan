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
  integer,
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

// ─── Improvement Lifecycle (6-step closed-loop) ──────────────────
export const cccImprovements = pgTable('ccc_improvements', {
  id: serial('id').primaryKey(),
  role: varchar('role', { length: 50 }).notNull(),
  area: varchar('area', { length: 100 }).notNull(),
  requirement: text('requirement').notNull(),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  status: varchar('status', { length: 20 }).notNull().default('submitted'),
  steps: json('steps'),
  estimatedDays: varchar('estimated_days', { length: 20 }),
  assignedTo: varchar('assigned_to', { length: 100 }),
  dueDate: varchar('due_date', { length: 30 }),
  completionPct: integer('completion_pct').notNull().default(0),
  resultSummary: text('result_summary'),
  resultEvidence: json('result_evidence'),
  verifiedBy: varchar('verified_by', { length: 100 }),
  verifiedAt: timestamp('verified_at', { mode: 'string' }),
  createdBy: varchar('created_by', { length: 100 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('ccc_improvements_role_idx').on(table.role),
  index('ccc_improvements_status_idx').on(table.status),
]);

export const cccImprovementUpdates = pgTable('ccc_improvement_updates', {
  id: serial('id').primaryKey(),
  improvementId: integer('improvement_id').notNull(),
  stepNumber: integer('step_number').notNull().default(0),
  action: varchar('action', { length: 30 }).notNull(),
  content: text('content'),
  evidenceData: json('evidence_data'),
  userName: varchar('user_name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('ccc_improvement_updates_imp_idx').on(table.improvementId),
]);

// Type exports
export type CccSandbox = typeof cccSandboxes.$inferSelect;
export type CccRoom = typeof cccRooms.$inferSelect;
export type CccActivity = typeof cccActivities.$inferSelect;
export type CccImprovement = typeof cccImprovements.$inferSelect;
export type CccImprovementUpdate = typeof cccImprovementUpdates.$inferSelect;
