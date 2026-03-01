/**
 * Architecture Service
 *
 * Service layer for schema architecture improvements.
 * Tasks #63 (Unified Projects), #64 (FK Constraint Registry),
 * #65 (JSON Normalization), #67 (Customer Master), #77 (Extended Checklist).
 */

import { requireDb } from "../db";
import { eq, desc, and, or, like, asc, sql, count } from "drizzle-orm";
import {
  projects,
  projectsV2,
  projectStagesV2,
  crmCustomers,
  crmCustomersV2,
  customersV2,
  afterSalesClients,
  unifiedProjects,
  fkConstraintRegistry,
  projectStageTasks,
  projectStageAuditLogs,
  customerMaster,
  gateChecklistItemsExtended,
} from "../../drizzle/schema";

// ============================================================
// Type Definitions
// ============================================================

export interface UnifiedProjectFilters {
  sourceTable?: "v1" | "v2";
  status?: string;
  currentStage?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FKConstraintInput {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  constraintName?: string;
  isEnforced?: boolean;
}

export interface CustomerMasterFilters {
  search?: string;
  tier?: string;
  industry?: string;
  region?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ExtendedChecklistInput {
  stageCode: string;
  category: string;
  itemName: string;
  description?: string;
  weight?: number;
  isRequired?: boolean;
  passCriteria?: string;
  applicableEquipmentTypes?: string;
  sortOrder?: number;
}

export interface ExtendedChecklistUpdateInput {
  stageCode?: string;
  category?: string;
  itemName?: string;
  description?: string;
  weight?: number;
  isRequired?: boolean;
  passCriteria?: string;
  applicableEquipmentTypes?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ============================================================
// Task #63 - Unified Projects
// ============================================================

export async function syncUnifiedProjects(): Promise<{ synced: number; errors: string[] }> {
  const db = await requireDb();
  let synced = 0;
  const errors: string[] = [];

  try {
    const v1Projects = await db.select().from(projects).limit(1000);
    for (const p of v1Projects) {
      try {
        const existing = await db.select().from(unifiedProjects)
          .where(and(eq(unifiedProjects.sourceTable, "v1"), eq(unifiedProjects.sourceId, p.id)));
        const data = {
          sourceTable: "v1" as const, sourceId: p.id,
          projectCode: p.projectCode ?? null, name: p.name,
          status: p.status ?? null, currentStage: p.currentPhase ?? null,
          customerId: p.customerId ?? null,
          customerName: null as string | null,
          projectManager: null as string | null,
          startDate: p.plannedStartDate ? new Date(p.plannedStartDate) : null,
          targetEndDate: p.plannedEndDate ? new Date(p.plannedEndDate) : null,
          syncedAt: new Date(),
        };
        if (existing.length > 0) {
          await db.update(unifiedProjects).set({ ...data, updatedAt: new Date() }).where(eq(unifiedProjects.id, existing[0].id));
        } else {
          await db.insert(unifiedProjects).values(data);
        }
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push("V1 project " + p.id + ": " + msg);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push("V1 bulk read: " + msg);
  }

  try {
    const v2Projects = await db.select().from(projectsV2).limit(1000);
    for (const p of v2Projects) {
      try {
        const existing = await db.select().from(unifiedProjects)
          .where(and(eq(unifiedProjects.sourceTable, "v2"), eq(unifiedProjects.sourceId, p.id)));
        const data = {
          sourceTable: "v2" as const, sourceId: p.id,
          projectCode: p.projectCode ?? null, name: p.projectName,
          status: p.status ?? null, currentStage: p.currentStage ?? null,
          customerId: p.customerId ?? null,
          customerName: null as string | null,
          projectManager: null as string | null,
          startDate: p.plannedStartDate ? new Date(p.plannedStartDate) : null,
          targetEndDate: p.plannedEndDate ? new Date(p.plannedEndDate) : null,
          syncedAt: new Date(),
        };
        if (existing.length > 0) {
          await db.update(unifiedProjects).set({ ...data, updatedAt: new Date() }).where(eq(unifiedProjects.id, existing[0].id));
        } else {
          await db.insert(unifiedProjects).values(data);
        }
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push("V2 project " + p.id + ": " + msg);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push("V2 bulk read: " + msg);
  }

  return { synced, errors };
}

export async function listUnifiedProjects(filters: UnifiedProjectFilters = {}) {
  const db = await requireDb();
  const conditions = [];
  if (filters.sourceTable) { conditions.push(eq(unifiedProjects.sourceTable, filters.sourceTable)); }
  if (filters.status) { conditions.push(eq(unifiedProjects.status, filters.status)); }
  if (filters.currentStage) { conditions.push(eq(unifiedProjects.currentStage, filters.currentStage)); }
  if (filters.search) {
    const pattern = "%" + filters.search + "%";
    conditions.push(or(
      like(unifiedProjects.name, pattern),
      like(unifiedProjects.projectCode, pattern),
      like(unifiedProjects.customerName, pattern)
    ));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const results = await db.select().from(unifiedProjects).where(whereClause)
    .orderBy(desc(unifiedProjects.syncedAt)).limit(limit).offset(offset);
  const countResult = await db.select({ total: count() })
    .from(unifiedProjects).where(whereClause);
  return { items: results, total: Number(countResult[0]?.total ?? 0), limit, offset };
}

// ============================================================
// Task #64 - FK Constraint Registry
// ============================================================

export async function registerFKConstraint(input: FKConstraintInput) {
  const db = await requireDb();
  const result = await db.insert(fkConstraintRegistry).values({
    sourceTable: input.sourceTable, sourceColumn: input.sourceColumn,
    targetTable: input.targetTable, targetColumn: input.targetColumn,
    constraintName: input.constraintName ?? null,
    isEnforced: input.isEnforced ?? false,
  }).returning();
  return result[0];
}

export async function listFKConstraints(filters?: { sourceTable?: string; targetTable?: string }) {
  const db = await requireDb();
  const conditions = [];
  if (filters?.sourceTable) { conditions.push(eq(fkConstraintRegistry.sourceTable, filters.sourceTable)); }
  if (filters?.targetTable) { conditions.push(eq(fkConstraintRegistry.targetTable, filters.targetTable)); }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(fkConstraintRegistry).where(whereClause)
    .orderBy(asc(fkConstraintRegistry.sourceTable), asc(fkConstraintRegistry.sourceColumn))
    .limit(1000);
}

// ============================================================
// Task #65 - JSON Normalization
// ============================================================

interface TaskJsonEntry {
  taskName?: string; name?: string; assignee?: string;
  status?: string; dueDate?: string; completedAt?: string; sortOrder?: number;
}

interface AuditLogJsonEntry {
  action?: string; actor?: string; details?: string; timestamp?: string;
}

export async function migrateJsonTasks(stageId: number): Promise<{ migrated: number; errors: string[] }> {
  const db = await requireDb();
  const errors: string[] = [];
  let migrated = 0;
  const stageRows = await db.select().from(projectStagesV2).where(eq(projectStagesV2.id, stageId));
  if (stageRows.length === 0) return { migrated: 0, errors: ["Stage not found"] };
  const stage = stageRows[0];
  if (!stage.tasksJson) return { migrated: 0, errors: ["No tasksJson data in this stage"] };
  let tasks: TaskJsonEntry[];
  try { tasks = JSON.parse(stage.tasksJson) as TaskJsonEntry[]; }
  catch { return { migrated: 0, errors: ["Failed to parse tasksJson"] }; }
  if (!Array.isArray(tasks)) return { migrated: 0, errors: ["tasksJson is not an array"] };
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    try {
      await db.insert(projectStageTasks).values({
        stageId: stage.id, projectId: stage.projectId,
        taskName: task.taskName ?? task.name ?? ("Task " + (i + 1)),
        assignee: task.assignee ?? null, status: task.status ?? "pending",
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        sortOrder: task.sortOrder ?? i,
      });
      migrated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("Task " + i + ": " + msg);
    }
  }
  return { migrated, errors };
}

export async function migrateJsonAuditLog(stageId: number): Promise<{ migrated: number; errors: string[] }> {
  const db = await requireDb();
  const errors: string[] = [];
  let migrated = 0;
  const stageRows = await db.select().from(projectStagesV2).where(eq(projectStagesV2.id, stageId));
  if (stageRows.length === 0) return { migrated: 0, errors: ["Stage not found"] };
  const stage = stageRows[0];
  if (!stage.auditLog) return { migrated: 0, errors: ["No auditLog data in this stage"] };
  let logs: AuditLogJsonEntry[];
  try { logs = JSON.parse(stage.auditLog) as AuditLogJsonEntry[]; }
  catch { return { migrated: 0, errors: ["Failed to parse auditLog"] }; }
  if (!Array.isArray(logs)) return { migrated: 0, errors: ["auditLog is not an array"] };
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    try {
      await db.insert(projectStageAuditLogs).values({
        stageId: stage.id, projectId: stage.projectId,
        action: log.action ?? "unknown", actor: log.actor ?? null,
        details: log.details ?? null,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
      });
      migrated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push("Log " + i + ": " + msg);
    }
  }
  return { migrated, errors };
}

// ============================================================
// Task #67 - Customer Master
// ============================================================

export async function syncCustomerMaster(): Promise<{ synced: number; errors: string[] }> {
  const db = await requireDb();
  let synced = 0;
  const errors: string[] = [];

  try {
    const rows = await db.select().from(crmCustomers).limit(1000);
    for (const c of rows) {
      try {
        const existing = await db.select().from(customerMaster).where(eq(customerMaster.sourceCrmV1Id, c.id));
        const data = {
          externalCode: c.customerCode ?? null, name: c.name, tier: c.level ?? null,
          industry: c.industry ?? null,
          region: c.province ? (c.province + (c.city ? "/" + c.city : "")) : null,
          country: null as string | null, address: c.address ?? null,
          primaryContact: c.legalPerson ?? null, contactPhone: c.phone ?? null,
          contactEmail: c.email ?? null, sourceCrmV1Id: c.id, isActive: c.status === "active",
        };
        if (existing.length > 0) {
          await db.update(customerMaster).set({ ...data, updatedAt: new Date() }).where(eq(customerMaster.id, existing[0].id));
        } else { await db.insert(customerMaster).values(data); }
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push("crmV1 " + c.id + ": " + msg);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push("crmV1 bulk: " + msg);
  }

  try {
    const rows = await db.select().from(crmCustomersV2).limit(1000);
    for (const c of rows) {
      try {
        const existing = await db.select().from(customerMaster).where(eq(customerMaster.sourceCrmV2Id, c.id));
        const data = {
          externalCode: c.code ?? null, name: c.name, tier: c.level ?? null,
          industry: c.industry ?? null, region: c.region ?? null,
          address: c.address ?? null, contactPhone: c.phone ?? null,
          contactEmail: c.email ?? null, sourceCrmV2Id: c.id, isActive: c.status === "active",
        };
        if (existing.length > 0) {
          await db.update(customerMaster).set({ ...data, updatedAt: new Date() }).where(eq(customerMaster.id, existing[0].id));
        } else { await db.insert(customerMaster).values(data); }
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push("crmV2 " + c.id + ": " + msg);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push("crmV2 bulk: " + msg);
  }

  try {
    const rows = await db.select().from(customersV2).limit(1000);
    for (const c of rows) {
      try {
        const existing = await db.select().from(customerMaster).where(eq(customerMaster.sourceCustomersV2Id, c.id));
        const data = {
          externalCode: c.customerCode ?? null, name: c.customerName,
          tier: c.customerLevel ?? null, industry: c.industry ?? null,
          address: c.address ?? null, sourceCustomersV2Id: c.id, isActive: true,
        };
        if (existing.length > 0) {
          await db.update(customerMaster).set({ ...data, updatedAt: new Date() }).where(eq(customerMaster.id, existing[0].id));
        } else { await db.insert(customerMaster).values(data); }
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push("custV2 " + c.id + ": " + msg);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push("custV2 bulk: " + msg);
  }

  try {
    const rows = await db.select().from(afterSalesClients).limit(1000);
    for (const c of rows) {
      try {
        const existing = await db.select().from(customerMaster).where(eq(customerMaster.sourceAfterSalesId, c.id));
        const data = {
          name: c.name, tier: c.tier ?? null, industry: c.industry ?? null,
          region: c.region ?? null, address: c.address ?? null,
          primaryContact: c.contactPerson ?? null, contactPhone: c.contactPhone ?? null,
          contactEmail: c.contactEmail ?? null, sourceAfterSalesId: c.id,
          isActive: c.status === "Active",
        };
        if (existing.length > 0) {
          await db.update(customerMaster).set({ ...data, updatedAt: new Date() }).where(eq(customerMaster.id, existing[0].id));
        } else { await db.insert(customerMaster).values(data); }
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push("afterSales " + c.id + ": " + msg);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push("afterSales bulk: " + msg);
  }

  return { synced, errors };
}

export async function listCustomerMaster(filters: CustomerMasterFilters = {}) {
  const db = await requireDb();
  const conditions = [];
  if (filters.search) {
    const pattern = "%" + filters.search + "%";
    conditions.push(or(
      like(customerMaster.name, pattern),
      like(customerMaster.externalCode, pattern),
      like(customerMaster.primaryContact, pattern),
      like(customerMaster.contactEmail, pattern)
    ));
  }
  if (filters.tier) { conditions.push(eq(customerMaster.tier, filters.tier)); }
  if (filters.industry) { conditions.push(eq(customerMaster.industry, filters.industry)); }
  if (filters.region) { conditions.push(eq(customerMaster.region, filters.region)); }
  if (filters.isActive !== undefined) { conditions.push(eq(customerMaster.isActive, filters.isActive)); }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const results = await db.select().from(customerMaster).where(whereClause)
    .orderBy(asc(customerMaster.name)).limit(limit).offset(offset);
  const countResult = await db.select({ total: count() })
    .from(customerMaster).where(whereClause);
  return { items: results, total: Number(countResult[0]?.total ?? 0), limit, offset };
}

// ============================================================
// Task #77 - Extended Checklist
// ============================================================

export async function listExtendedChecklist(stageCode?: string) {
  const db = await requireDb();
  const conditions = [eq(gateChecklistItemsExtended.isActive, true)];
  if (stageCode) { conditions.push(eq(gateChecklistItemsExtended.stageCode, stageCode)); }
  return db.select().from(gateChecklistItemsExtended).where(and(...conditions))
    .orderBy(asc(gateChecklistItemsExtended.stageCode), asc(gateChecklistItemsExtended.sortOrder))
    .limit(1000);
}

export async function createExtendedChecklistItem(data: ExtendedChecklistInput) {
  const db = await requireDb();
  const result = await db.insert(gateChecklistItemsExtended).values({
    stageCode: data.stageCode, category: data.category, itemName: data.itemName,
    description: data.description ?? null, weight: data.weight ?? 5,
    isRequired: data.isRequired ?? false, passCriteria: data.passCriteria ?? null,
    applicableEquipmentTypes: data.applicableEquipmentTypes ?? null,
    sortOrder: data.sortOrder ?? 0, isActive: true,
  }).returning();
  return result[0];
}

export async function updateExtendedChecklistItem(id: number, data: ExtendedChecklistUpdateInput) {
  const db = await requireDb();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.stageCode !== undefined) updateData.stageCode = data.stageCode;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.itemName !== undefined) updateData.itemName = data.itemName;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
  if (data.passCriteria !== undefined) updateData.passCriteria = data.passCriteria;
  if (data.applicableEquipmentTypes !== undefined) updateData.applicableEquipmentTypes = data.applicableEquipmentTypes;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  const result = await db.update(gateChecklistItemsExtended).set(updateData)
    .where(eq(gateChecklistItemsExtended.id, id)).returning();
  return result[0] ?? null;
}

export async function deleteExtendedChecklistItem(id: number) {
  const db = await requireDb();
  const result = await db.update(gateChecklistItemsExtended)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(gateChecklistItemsExtended.id, id)).returning();
  return result[0] ?? null;
}
