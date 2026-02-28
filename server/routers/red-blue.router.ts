/**
 * 红蓝对抗 (Red-Blue Confrontation) Router
 *
 * Provides CRUD for red-blue confrontation configs and execution records.
 * Replaces the placeholder redBlue router with real Drizzle ORM persistence.
 *
 * Tables: grt_red_blue_configs, grt_red_blue_executions
 * Frontend consumer: RedBlueBoard.tsx (getProjects, getGates, getTasks)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  redBlueConfigs,
  redBlueExecutions,
} from "../../drizzle/approval-engine-schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Accept string or number id from the frontend and coerce to number. */
const idInput = z.object({ id: z.union([z.string(), z.number()]).transform(Number) });

function generateConfigCode(): string {
  return `RB-${Date.now().toString(36).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const createConfigSchema = z.object({
  configCode: z.string().max(64).optional(),
  configName: z.string().min(1).max(128),

  projectId: z.number().int().optional(),
  projectCode: z.string().max(64).optional(),
  projectName: z.string().max(256).optional(),

  customerId: z.number().int().optional(),
  customerName: z.string().max(256).optional(),
  customerTier: z.string().max(50).optional(),

  redTeamLeaderId: z.number().int().optional(),
  redTeamLeaderName: z.string().max(128).optional(),
  redTeamMembers: z.any().optional(),
  redTeamObjectives: z.string().optional(),
  redTeamScenarios: z.any().optional(),

  blueTeamLeaderId: z.number().int().optional(),
  blueTeamLeaderName: z.string().max(128).optional(),
  blueTeamMembers: z.any().optional(),
  blueTeamObjectives: z.string().optional(),
  blueTeamResources: z.any().optional(),

  schedule: z.any().optional(),
  evaluationCriteria: z.any().optional(),
  triggerConditions: z.any().optional(),

  createdBy: z.number().int().optional(),
  createdByName: z.string().max(128).optional(),
});

const updateConfigSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(Number),

  configName: z.string().min(1).max(128).optional(),
  projectId: z.number().int().nullable().optional(),
  projectCode: z.string().max(64).nullable().optional(),
  projectName: z.string().max(256).nullable().optional(),

  customerId: z.number().int().nullable().optional(),
  customerName: z.string().max(256).nullable().optional(),
  customerTier: z.string().max(50).nullable().optional(),

  redTeamLeaderId: z.number().int().nullable().optional(),
  redTeamLeaderName: z.string().max(128).nullable().optional(),
  redTeamMembers: z.any().optional(),
  redTeamObjectives: z.string().nullable().optional(),
  redTeamScenarios: z.any().optional(),

  blueTeamLeaderId: z.number().int().nullable().optional(),
  blueTeamLeaderName: z.string().max(128).nullable().optional(),
  blueTeamMembers: z.any().optional(),
  blueTeamObjectives: z.string().nullable().optional(),
  blueTeamResources: z.any().optional(),

  schedule: z.any().optional(),
  evaluationCriteria: z.any().optional(),
  triggerConditions: z.any().optional(),

  status: z.string().max(50).optional(),
  results: z.any().optional(),
  lessonsLearned: z.string().nullable().optional(),
  improvementActions: z.any().optional(),
});

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
  status: z.string().optional(),
  projectId: z.number().int().optional(),
  customerId: z.number().int().optional(),
}).optional();

const createExecutionSchema = z.object({
  configId: z.number().int(),
  configCode: z.string().max(64),
  phase: z.string().max(64),
  phaseName: z.string().max(128),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  status: z.string().max(50).optional(),
});

const updateExecutionSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(Number),
  actualStart: z.string().datetime().nullable().optional(),
  actualEnd: z.string().datetime().nullable().optional(),
  redTeamActions: z.any().optional(),
  redTeamFindings: z.string().nullable().optional(),
  blueTeamResponses: z.any().optional(),
  blueTeamPerformance: z.string().nullable().optional(),
  redTeamScore: z.union([z.string(), z.number()]).optional(),
  blueTeamScore: z.union([z.string(), z.number()]).optional(),
  issuesFound: z.any().optional(),
  status: z.string().max(50).optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const redBlueRouter = router({
  // -----------------------------------------------------------------------
  // Config CRUD
  // -----------------------------------------------------------------------

  /** List configs with optional filtering and pagination. */
  list: protectedProcedure
    .input(listInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 50;

      const conditions: ReturnType<typeof eq>[] = [];
      if (input?.status) conditions.push(eq(redBlueConfigs.status, input.status));
      if (input?.projectId) conditions.push(eq(redBlueConfigs.projectId, input.projectId));
      if (input?.customerId) conditions.push(eq(redBlueConfigs.customerId, input.customerId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, totalResult] = await Promise.all([
        db
          .select()
          .from(redBlueConfigs)
          .where(whereClause)
          .orderBy(desc(redBlueConfigs.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ count: sql<number>`count(*)` })
          .from(redBlueConfigs)
          .where(whereClause),
      ]);

      const total = Number(totalResult[0]?.count ?? 0);

      return { items, total, page, pageSize };
    }),

  /** Get a single config by id. */
  getById: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(redBlueConfigs)
        .where(eq(redBlueConfigs.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),

  /** Create a new red-blue confrontation config. */
  create: protectedProcedure
    .input(createConfigSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const code = input.configCode || generateConfigCode();

      const [config] = await db
        .insert(redBlueConfigs)
        .values({
          configCode: code,
          configName: input.configName,

          projectId: input.projectId,
          projectCode: input.projectCode,
          projectName: input.projectName,

          customerId: input.customerId,
          customerName: input.customerName,
          customerTier: input.customerTier ?? "other",

          redTeamLeaderId: input.redTeamLeaderId,
          redTeamLeaderName: input.redTeamLeaderName,
          redTeamMembers: input.redTeamMembers,
          redTeamObjectives: input.redTeamObjectives,
          redTeamScenarios: input.redTeamScenarios,

          blueTeamLeaderId: input.blueTeamLeaderId,
          blueTeamLeaderName: input.blueTeamLeaderName,
          blueTeamMembers: input.blueTeamMembers,
          blueTeamObjectives: input.blueTeamObjectives,
          blueTeamResources: input.blueTeamResources,

          schedule: input.schedule,
          evaluationCriteria: input.evaluationCriteria,
          triggerConditions: input.triggerConditions,

          status: "draft",
          createdBy: input.createdBy ?? ctx.user?.id ?? 1,
          createdByName: input.createdByName ?? ctx.user?.name,
        })
        .returning();

      return { success: true, message: "红蓝对抗配置已创建", data: config };
    }),

  /** Update an existing config. */
  update: protectedProcedure
    .input(updateConfigSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;

      // Only include explicitly-provided fields in the update payload.
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      const rows = await db
        .update(redBlueConfigs)
        .set(updates)
        .where(eq(redBlueConfigs.id, id))
        .returning();

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "配置不存在" });
      }

      return { success: true, message: "红蓝对抗配置已更新", data: rows[0] };
    }),

  /** Delete a config and all its execution records. */
  delete: protectedProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Verify the config exists before deleting.
      const existing = await db
        .select({ id: redBlueConfigs.id })
        .from(redBlueConfigs)
        .where(eq(redBlueConfigs.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "配置不存在" });
      }

      // Delete child execution records first, then the config.
      await db.delete(redBlueExecutions).where(eq(redBlueExecutions.configId, input.id));
      await db.delete(redBlueConfigs).where(eq(redBlueConfigs.id, input.id));

      return { success: true, message: "红蓝对抗配置已删除" };
    }),

  // -----------------------------------------------------------------------
  // Endpoints consumed by RedBlueBoard.tsx
  // -----------------------------------------------------------------------

  /**
   * getProjects - returns a lightweight project summary list derived from
   * configs. The frontend RedBlueBoard.tsx calls this to populate the
   * projects panel.
   */
  getProjects: protectedProcedure.query(async () => {
    const db = await requireDb();
    const configs = await db
      .select()
      .from(redBlueConfigs)
      .orderBy(desc(redBlueConfigs.createdAt));

    return configs.map(c => ({
      ...c,
      // Aliases expected by RedBlueBoard.tsx
      name: c.configName || c.projectName || "",
      tier: c.customerTier || "other",
      customer: c.customerName || "",
      startDate: c.createdAt,
      targetDate: c.updatedAt || c.createdAt,
      redTeamLead: c.redTeamLeaderName || "",
      blueTeamLead: c.blueTeamLeaderName || "",
      progress: 0,
      currentGate: "",
    }));
  }),

  /**
   * getGates - returns all execution records (phases/gates) across configs.
   * The frontend uses this to render gate progress.
   */
  getGates: protectedProcedure.query(async () => {
    const db = await requireDb();
    const executions = await db
      .select()
      .from(redBlueExecutions)
      .orderBy(desc(redBlueExecutions.createdAt));

    return executions;
  }),

  /**
   * getTasks - returns scheduled execution records (upcoming tasks).
   * The frontend uses this for the tasks panel.
   */
  getTasks: protectedProcedure.query(async () => {
    const db = await requireDb();
    const executions = await db
      .select()
      .from(redBlueExecutions)
      .where(eq(redBlueExecutions.status, "scheduled"))
      .orderBy(redBlueExecutions.scheduledStart);

    return executions;
  }),

  // -----------------------------------------------------------------------
  // Execution CRUD
  // -----------------------------------------------------------------------

  /** List executions for a given config. */
  listExecutions: protectedProcedure
    .input(z.object({ configId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db
        .select()
        .from(redBlueExecutions)
        .where(eq(redBlueExecutions.configId, input.configId))
        .orderBy(redBlueExecutions.scheduledStart);

      return { items, total: items.length };
    }),

  /** Get a single execution record by id. */
  getExecution: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(redBlueExecutions)
        .where(eq(redBlueExecutions.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),

  /** Create an execution record (a phase/gate for a config). */
  createExecution: protectedProcedure
    .input(createExecutionSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [execution] = await db
        .insert(redBlueExecutions)
        .values({
          configId: input.configId,
          configCode: input.configCode,
          phase: input.phase,
          phaseName: input.phaseName,
          scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : undefined,
          scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : undefined,
          status: input.status ?? "scheduled",
        })
        .returning();

      return { success: true, message: "执行阶段已创建", data: execution };
    }),

  /** Update an execution record (scores, findings, status, etc.). */
  updateExecution: protectedProcedure
    .input(updateExecutionSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          // Convert ISO date strings to Date objects for timestamp columns.
          if ((key === "actualStart" || key === "actualEnd") && typeof value === "string") {
            updates[key] = new Date(value);
          } else {
            updates[key] = value;
          }
        }
      }

      const rows = await db
        .update(redBlueExecutions)
        .set(updates)
        .where(eq(redBlueExecutions.id, id))
        .returning();

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "执行记录不存在" });
      }

      return { success: true, message: "执行记录已更新", data: rows[0] };
    }),

  /** Delete an execution record. */
  deleteExecution: protectedProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const existing = await db
        .select({ id: redBlueExecutions.id })
        .from(redBlueExecutions)
        .where(eq(redBlueExecutions.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "执行记录不存在" });
      }

      await db.delete(redBlueExecutions).where(eq(redBlueExecutions.id, input.id));

      return { success: true, message: "执行记录已删除" };
    }),
});
