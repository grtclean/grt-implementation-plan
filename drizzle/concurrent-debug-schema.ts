/**
 * 并行调试指挥中心 Schema
 * Dual-Track Concurrent Debugging Architecture:
 *   Track 1 — Software dev sandboxes with AI agents
 *   Track 2 — Hardware equipment commissioning (FAT/SAT)
 *
 * Documentation-only schema — not pushed to DB.
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Track 1: Software Dev Sandboxes
 * Each row = one GRT module branch being debugged by an AI agent
 */
export const softwareDevSandboxes = pgTable('grt_software_dev_sandboxes', {
  id: serial().primaryKey(),
  moduleName: varchar('module_name', { length: 100 }).notNull(),
  assignedAiAgent: varchar('assigned_ai_agent', { length: 100 }).notNull(),
  branchName: varchar('branch_name', { length: 200 }).notNull(),
  branchStatus: varchar('branch_status', { length: 30 }).notNull().default('ISOLATED'),
  managerApproved: boolean('manager_approved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Track 2: Equipment Commissioning Rooms
 * Each row = one sub-system undergoing FAT/SAT debugging
 */
export const equipmentCommissioningRooms = pgTable('grt_equipment_commissioning_rooms', {
  id: serial().primaryKey(),
  projectName: varchar('project_name', { length: 200 }).notNull(),
  subSystem: varchar('sub_system', { length: 100 }).notNull(),
  engineerAssigned: varchar('engineer_assigned', { length: 100 }),
  testStatus: varchar('test_status', { length: 30 }).notNull().default('IDLE'),
  testNotes: text('test_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type SoftwareDevSandbox = typeof softwareDevSandboxes.$inferSelect;
export type EquipmentCommissioningRoom = typeof equipmentCommissioningRooms.$inferSelect;
