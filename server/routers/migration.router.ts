import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { migrationTasks } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const migrationRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(migrationTasks).orderBy(desc(migrationTasks.createdAt)).limit(1000);
  }),

  init: requirePermission('system:data:migrate').input(z.object({
    moduleName: z.string(),
    sourceTable: z.string().optional(),
    targetTable: z.string().optional(),
    totalRecords: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const moduleId = `MIG-${Date.now().toString(36).toUpperCase()}`;
    const [task] = await db.insert(migrationTasks).values({
      moduleId,
      moduleName: input.moduleName,
      sourceTable: input.sourceTable,
      targetTable: input.targetTable,
      totalRecords: input.totalRecords || 0,
      status: "pending",
      priority: "medium",
      notes: input.notes,
    }).returning();
    return { success: true, data: task };
  }),

  update: requirePermission('system:data:migrate').input(z.object({
    id: z.union([z.string(), z.number()]),
    status: z.enum(["pending", "in_progress", "completed", "failed", "paused"]).optional(),
    migratedRecords: z.number().optional(),
    validatedRecords: z.number().optional(),
    errorRecords: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(rest)) { if (v !== undefined) updates[k] = v; }
    if (input.status === "in_progress") updates.startedAt = new Date().toISOString();
    if (input.status === "completed") updates.completedAt = new Date().toISOString();
    const [task] = await db.update(migrationTasks).set(updates).where(eq(migrationTasks.id, toNum(input.id))).returning();
    return { success: true, data: task };
  }),
});
