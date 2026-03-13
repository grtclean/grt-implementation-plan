/**
 * GRT Enterprise Governance Router — Control Tower APIs
 *
 * 20 procedures across 4 entity groups:
 *   Dictionaries      (6): list, get, create, update, delete (soft), getByCategory
 *   Workflow Defs+Nodes(6): listDefs, getDef, createDef, updateDef, addNode, updateNode, deleteNode
 *   Data Policies     (4): list, create, update, delete (soft)
 *   Audit Logs        (3): list (paginated), create, stats
 */
import { z } from "zod";
import { jsonValue } from "../../shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import {
  sysDictionaries,
  sysWorkflowDefinitions,
  sysWorkflowNodes,
  sysDataPolicies,
  sysAuditLogs,
  SYS_WORKFLOW_NODE_TYPES,
  SYS_AUDIT_ACTIONS,
} from "../../drizzle/governance-schema";
import { eq, and, desc, sql, asc, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

export const governanceRouter = router({
  // ══════════════════════════════════════════════════
  // Dictionaries — MDM (Master Data Management)
  // ══════════════════════════════════════════════════

  listDictionaries: protectedProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          isActive: z.boolean().optional(),
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input?.category)
        conditions.push(eq(sysDictionaries.category, input.category));
      if (input?.isActive !== undefined)
        conditions.push(eq(sysDictionaries.isActive, input.isActive));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(sysDictionaries)
          .where(where)
          .orderBy(asc(sysDictionaries.category), asc(sysDictionaries.sortOrder))
          .limit(input?.limit ?? 100)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(sysDictionaries).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  getDictionary: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .select()
        .from(sysDictionaries)
        .where(eq(sysDictionaries.id, toNum(input.id)));
      return item ?? null;
    }),

  createDictionary: protectedProcedure
    .input(
      z.object({
        category: z.string().min(1).max(100),
        code: z.string().min(1).max(100),
        label: z.string().min(1).max(200),
        labelZh: z.string().min(1).max(200),
        value: z.string().optional(),
        sortOrder: z.number().default(0),
        parentId: z.number().optional(),
        metadata: z.record(z.string(), jsonValue).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .insert(sysDictionaries)
        .values({
          category: input.category,
          code: input.code,
          label: input.label,
          labelZh: input.labelZh,
          value: input.value,
          sortOrder: input.sortOrder,
          parentId: input.parentId,
          metadata: input.metadata as Record<string, unknown> | undefined,
        })
        .returning();
      return item;
    }),

  updateDictionary: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        category: z.string().min(1).max(100).optional(),
        code: z.string().min(1).max(100).optional(),
        label: z.string().min(1).max(200).optional(),
        labelZh: z.string().min(1).max(200).optional(),
        value: z.string().optional(),
        sortOrder: z.number().optional(),
        parentId: z.number().nullable().optional(),
        metadata: z.record(z.string(), jsonValue).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...rest } = input;
      const setData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (rest.category !== undefined) setData.category = rest.category;
      if (rest.code !== undefined) setData.code = rest.code;
      if (rest.label !== undefined) setData.label = rest.label;
      if (rest.labelZh !== undefined) setData.labelZh = rest.labelZh;
      if (rest.value !== undefined) setData.value = rest.value;
      if (rest.sortOrder !== undefined) setData.sortOrder = rest.sortOrder;
      if (rest.parentId !== undefined) setData.parentId = rest.parentId;
      if (rest.metadata !== undefined) setData.metadata = rest.metadata;
      if (rest.isActive !== undefined) setData.isActive = rest.isActive;

      const [item] = await db
        .update(sysDictionaries)
        .set(setData)
        .where(eq(sysDictionaries.id, toNum(id)))
        .returning();
      if (!item) throw new Error(`Dictionary #${id} not found`);
      return item;
    }),

  deleteDictionary: requirePermission('system:compliance:manage')
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .update(sysDictionaries)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(sysDictionaries.id, toNum(input.id)))
        .returning();
      if (!item) throw new Error(`Dictionary #${input.id} not found`);
      return item;
    }),

  getDictionaryByCategory: protectedProcedure
    .input(z.object({ category: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(sysDictionaries)
        .where(
          and(
            eq(sysDictionaries.category, input.category),
            eq(sysDictionaries.isActive, true)
          )
        )
        .orderBy(asc(sysDictionaries.sortOrder));
      return { items, total: items.length };
    }),

  // ══════════════════════════════════════════════════
  // Workflow Definitions + Nodes
  // ══════════════════════════════════════════════════

  listWorkflowDefinitions: protectedProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
          isActive: z.boolean().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input?.entityType)
        conditions.push(
          eq(sysWorkflowDefinitions.entityType, input.entityType)
        );
      if (input?.isActive !== undefined)
        conditions.push(
          eq(sysWorkflowDefinitions.isActive, input.isActive)
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(sysWorkflowDefinitions)
          .where(where)
          .orderBy(desc(sysWorkflowDefinitions.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db
          .select({ value: count() })
          .from(sysWorkflowDefinitions)
          .where(where),
      ]);

      return { items, total: Number(total) };
    }),

  getWorkflowDefinition: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const numId = toNum(input.id);

      const [definition] = await db
        .select()
        .from(sysWorkflowDefinitions)
        .where(eq(sysWorkflowDefinitions.id, numId));
      if (!definition) return null;

      const nodes = await db
        .select()
        .from(sysWorkflowNodes)
        .where(eq(sysWorkflowNodes.workflowDefinitionId, numId))
        .orderBy(asc(sysWorkflowNodes.sortOrder));

      return { ...definition, nodes };
    }),

  createWorkflowDefinition: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(100),
        name: z.string().min(1).max(200),
        nameZh: z.string().min(1).max(200),
        description: z.string().optional(),
        entityType: z.string().max(100).optional(),
        triggerConditions: z
          .record(z.string(), jsonValue)
          .optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [item] = await db
        .insert(sysWorkflowDefinitions)
        .values({
          code: input.code,
          name: input.name,
          nameZh: input.nameZh,
          description: input.description,
          entityType: input.entityType,
          triggerConditions: input.triggerConditions as
            | Record<string, unknown>
            | undefined,
          isActive: input.isActive,
          createdBy: ctx.user.id,
        })
        .returning();
      return item;
    }),

  updateWorkflowDefinition: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        code: z.string().min(1).max(100).optional(),
        name: z.string().min(1).max(200).optional(),
        nameZh: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        entityType: z.string().max(100).optional(),
        triggerConditions: z
          .record(z.string(), jsonValue)
          .optional(),
        isActive: z.boolean().optional(),
        version: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...rest } = input;
      const setData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (rest.code !== undefined) setData.code = rest.code;
      if (rest.name !== undefined) setData.name = rest.name;
      if (rest.nameZh !== undefined) setData.nameZh = rest.nameZh;
      if (rest.description !== undefined)
        setData.description = rest.description;
      if (rest.entityType !== undefined)
        setData.entityType = rest.entityType;
      if (rest.triggerConditions !== undefined)
        setData.triggerConditions = rest.triggerConditions;
      if (rest.isActive !== undefined) setData.isActive = rest.isActive;
      if (rest.version !== undefined) setData.version = rest.version;

      const [item] = await db
        .update(sysWorkflowDefinitions)
        .set(setData)
        .where(eq(sysWorkflowDefinitions.id, toNum(id)))
        .returning();
      if (!item)
        throw new Error(`Workflow definition #${id} not found`);
      return item;
    }),

  addWorkflowNode: protectedProcedure
    .input(
      z.object({
        workflowDefinitionId: z.union([z.string(), z.number()]),
        nodeType: z.enum(SYS_WORKFLOW_NODE_TYPES),
        name: z.string().min(1).max(200),
        config: z.record(z.string(), jsonValue).optional(),
        nextNodeIds: z.array(z.number()).optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const defId = toNum(input.workflowDefinitionId);

      // Verify the workflow definition exists
      const [def] = await db
        .select()
        .from(sysWorkflowDefinitions)
        .where(eq(sysWorkflowDefinitions.id, defId));
      if (!def)
        throw new Error(
          `Workflow definition #${input.workflowDefinitionId} not found`
        );

      const [node] = await db
        .insert(sysWorkflowNodes)
        .values({
          workflowDefinitionId: defId,
          nodeType: input.nodeType,
          name: input.name,
          config: input.config as Record<string, unknown> | undefined,
          nextNodeIds: input.nextNodeIds,
          sortOrder: input.sortOrder,
        })
        .returning();
      return node;
    }),

  updateWorkflowNode: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        nodeType: z.enum(SYS_WORKFLOW_NODE_TYPES).optional(),
        name: z.string().min(1).max(200).optional(),
        config: z.record(z.string(), jsonValue).optional(),
        nextNodeIds: z.array(z.number()).optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...rest } = input;
      const setData: Record<string, unknown> = {};

      if (rest.nodeType !== undefined) setData.nodeType = rest.nodeType;
      if (rest.name !== undefined) setData.name = rest.name;
      if (rest.config !== undefined) setData.config = rest.config;
      if (rest.nextNodeIds !== undefined)
        setData.nextNodeIds = rest.nextNodeIds;
      if (rest.sortOrder !== undefined) setData.sortOrder = rest.sortOrder;

      if (Object.keys(setData).length === 0) {
        throw new Error("No fields to update");
      }

      const [node] = await db
        .update(sysWorkflowNodes)
        .set(setData)
        .where(eq(sysWorkflowNodes.id, toNum(id)))
        .returning();
      if (!node) throw new Error(`Workflow node #${id} not found`);
      return node;
    }),

  deleteWorkflowNode: requirePermission('system:compliance:manage')
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [deleted] = await db
        .delete(sysWorkflowNodes)
        .where(eq(sysWorkflowNodes.id, toNum(input.id)))
        .returning();
      if (!deleted)
        throw new Error(`Workflow node #${input.id} not found`);
      return { deleted: true, id: deleted.id };
    }),

  // ══════════════════════════════════════════════════
  // Data Policies — Row-Level Security
  // ══════════════════════════════════════════════════

  listDataPolicies: protectedProcedure
    .input(
      z
        .object({
          entityTable: z.string().optional(),
          isActive: z.boolean().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input?.entityTable)
        conditions.push(
          eq(sysDataPolicies.entityTable, input.entityTable)
        );
      if (input?.isActive !== undefined)
        conditions.push(eq(sysDataPolicies.isActive, input.isActive));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(sysDataPolicies)
          .where(where)
          .orderBy(desc(sysDataPolicies.priority))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(sysDataPolicies).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  createDataPolicy: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        entityTable: z.string().min(1).max(100),
        conditionExpression: z.string().min(1),
        allowedRoles: z.array(z.string()).optional(),
        allowedBus: z.array(z.string()).optional(),
        priority: z.number().default(0),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [item] = await db
        .insert(sysDataPolicies)
        .values({
          name: input.name,
          description: input.description,
          entityTable: input.entityTable,
          conditionExpression: input.conditionExpression,
          allowedRoles: input.allowedRoles,
          allowedBus: input.allowedBus,
          priority: input.priority,
          isActive: input.isActive,
          createdBy: ctx.user.id,
        })
        .returning();
      return item;
    }),

  updateDataPolicy: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        entityTable: z.string().min(1).max(100).optional(),
        conditionExpression: z.string().min(1).optional(),
        allowedRoles: z.array(z.string()).optional(),
        allowedBus: z.array(z.string()).optional(),
        priority: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...rest } = input;
      const setData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (rest.name !== undefined) setData.name = rest.name;
      if (rest.description !== undefined)
        setData.description = rest.description;
      if (rest.entityTable !== undefined)
        setData.entityTable = rest.entityTable;
      if (rest.conditionExpression !== undefined)
        setData.conditionExpression = rest.conditionExpression;
      if (rest.allowedRoles !== undefined)
        setData.allowedRoles = rest.allowedRoles;
      if (rest.allowedBus !== undefined)
        setData.allowedBus = rest.allowedBus;
      if (rest.priority !== undefined) setData.priority = rest.priority;
      if (rest.isActive !== undefined) setData.isActive = rest.isActive;

      const [item] = await db
        .update(sysDataPolicies)
        .set(setData)
        .where(eq(sysDataPolicies.id, toNum(id)))
        .returning();
      if (!item) throw new Error(`Data policy #${id} not found`);
      return item;
    }),

  deleteDataPolicy: requirePermission('system:compliance:manage')
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .update(sysDataPolicies)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(sysDataPolicies.id, toNum(input.id)))
        .returning();
      if (!item) throw new Error(`Data policy #${input.id} not found`);
      return item;
    }),

  // ══════════════════════════════════════════════════
  // Audit Logs — System-wide Audit Trail
  // ══════════════════════════════════════════════════

  listAuditLogs: protectedProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
          entityId: z.union([z.string(), z.number()]).optional(),
          actorId: z.union([z.string(), z.number()]).optional(),
          action: z.enum(SYS_AUDIT_ACTIONS).optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input?.entityType)
        conditions.push(eq(sysAuditLogs.entityType, input.entityType));
      if (input?.entityId)
        conditions.push(
          eq(sysAuditLogs.entityId, toNum(input.entityId))
        );
      if (input?.actorId)
        conditions.push(eq(sysAuditLogs.actorId, toNum(input.actorId)));
      if (input?.action)
        conditions.push(eq(sysAuditLogs.action, input.action));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(sysAuditLogs)
          .where(where)
          .orderBy(desc(sysAuditLogs.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(sysAuditLogs).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  createAuditLog: protectedProcedure
    .input(
      z.object({
        entityType: z.string().min(1).max(100),
        entityId: z.number().optional(),
        action: z.enum(SYS_AUDIT_ACTIONS),
        previousData: z.record(z.string(), jsonValue).optional(),
        newData: z.record(z.string(), jsonValue).optional(),
        ipAddress: z.string().max(45).optional(),
        userAgent: z.string().optional(),
        sessionId: z.string().max(100).optional(),
        metadata: z.record(z.string(), jsonValue).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [item] = await db
        .insert(sysAuditLogs)
        .values({
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          actorId: ctx.user.id,
          actorName: ctx.user.name ?? `User#${ctx.user.id}`,
          previousData: input.previousData as
            | Record<string, unknown>
            | undefined,
          newData: input.newData as Record<string, unknown> | undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          sessionId: input.sessionId,
          metadata: input.metadata as
            | Record<string, unknown>
            | undefined,
        })
        .returning();
      return item;
    }),

  getAuditLogStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().min(1), // ISO date string, e.g. "2026-01-01"
        endDate: z.string().min(1), // ISO date string, e.g. "2026-02-28"
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const rows = await db
        .select({
          action: sysAuditLogs.action,
          count: count(),
        })
        .from(sysAuditLogs)
        .where(
          and(
            sql`${sysAuditLogs.createdAt} >= ${input.startDate}`,
            sql`${sysAuditLogs.createdAt} <= ${input.endDate}`
          )
        )
        .groupBy(sysAuditLogs.action);

      const byAction: Record<string, number> = {};
      let totalCount = 0;
      for (const row of rows) {
        const c = Number(row.count);
        byAction[row.action] = c;
        totalCount += c;
      }

      return {
        byAction,
        totalCount,
        startDate: input.startDate,
        endDate: input.endDate,
      };
    }),
});
