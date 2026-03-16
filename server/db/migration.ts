/**
 * Migration tasks CRUD + initialization
 * Auto-decomposed from server/db.ts
 */
import { eq, desc } from "drizzle-orm";
import { requireDb } from "./connection";
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("db");
import {
  migrationTasks, InsertMigrationTask, MigrationTask,
} from "../../drizzle/schema";

// ============= Migration Tasks Functions =============

export async function createMigrationTask(data: InsertMigrationTask) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot create migration task: database not available");
    return null;
  }

  try {
    const result = await db.insert(migrationTasks).values(data);
    return { id: result[0].insertId };
  } catch (error) {
    log.error({ err: error }, "Failed to create migration task");
    throw error;
  }
}

export async function getAllMigrationTasks() {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get migration tasks: database not available");
    return [];
  }

  return db.select().from(migrationTasks).orderBy(desc(migrationTasks.createdAt)).limit(1000);
}

export async function getMigrationTaskById(id: number) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot get migration task: database not available");
    return null;
  }

  const result = await db.select().from(migrationTasks).where(eq(migrationTasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateMigrationTask(
  id: number,
  data: Partial<Omit<MigrationTask, "id" | "createdAt" | "updatedAt">>
) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot update migration task: database not available");
    return null;
  }

  await db.update(migrationTasks).set(data).where(eq(migrationTasks.id, id));
  return { success: true };
}

export async function deleteMigrationTask(id: number) {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot delete migration task: database not available");
    return null;
  }

  await db.delete(migrationTasks).where(eq(migrationTasks.id, id));
  return { success: true };
}

export async function initDefaultMigrationTasks() {
  const db = await requireDb();
  if (!db) {
    log.warn("Cannot init migration tasks: database not available");
    return null;
  }

  // Check if tasks already exist
  const existing = await db.select().from(migrationTasks).limit(1);
  if (existing.length > 0) {
    return { success: true, message: "Tasks already initialized" };
  }

  // Default migration tasks based on External Sync data
  const defaultTasks: InsertMigrationTask[] = [
    {
      moduleId: "crm_customers",
      moduleName: "客户管理",
      sourceTable: "M0-1_客户管理",
      targetTable: "customers",
      totalRecords: 350,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "high",
    },
    {
      moduleId: "crm_opportunities",
      moduleName: "商机管理",
      sourceTable: "M0-2_商机管理",
      targetTable: "opportunities",
      totalRecords: 280,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "high",
    },
    {
      moduleId: "contracts",
      moduleName: "合同管理",
      sourceTable: "M3-1_合同管理",
      targetTable: "contracts",
      totalRecords: 420,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "high",
    },
    {
      moduleId: "procurement",
      moduleName: "采购订单",
      sourceTable: "M5-1_采购订单",
      targetTable: "purchase_orders",
      totalRecords: 380,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "medium",
    },
    {
      moduleId: "employees",
      moduleName: "员工档案",
      sourceTable: "HR_员工档案",
      targetTable: "employees",
      totalRecords: 320,
      migratedRecords: 0,
      validatedRecords: 0,
      errorRecords: 0,
      status: "pending",
      priority: "medium",
    },
  ];

  for (const task of defaultTasks) {
    await db.insert(migrationTasks).values(task);
  }

  return { success: true, message: "Default tasks initialized" };
}
