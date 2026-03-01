import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { annualPlanningDependencies } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const planningDependencyRouter = router({
  getAll: protectedProcedure.input(z.object({ configId: z.number().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    if (input?.configId) {
      return await db.select().from(annualPlanningDependencies).where(eq(annualPlanningDependencies.configId, input.configId)).limit(1000);
    }
    return await db.select().from(annualPlanningDependencies).limit(1000);
  }),

  add: protectedProcedure.input(z.object({
    configId: z.number(),
    sourceItemId: z.number(),
    targetItemId: z.number(),
    dependencyType: z.string().default("finish_to_start"),
    lagDays: z.number().default(0),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [dep] = await db.insert(annualPlanningDependencies).values({
      configId: input.configId,
      sourceItemId: input.sourceItemId,
      targetItemId: input.targetItemId,
      dependencyType: input.dependencyType,
      lagDays: input.lagDays,
    }).returning();
    return { success: true, data: dep };
  }),

  remove: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(annualPlanningDependencies).where(eq(annualPlanningDependencies.id, toNum(input.id)));
    return { success: true };
  }),

  calculateCriticalPath: protectedProcedure.input(z.object({ configId: z.number() })).query(async ({ input }) => {
    const db = await requireDb();
    const deps = await db.select().from(annualPlanningDependencies).where(eq(annualPlanningDependencies.configId, input.configId)).limit(1000);
    return { dependencies: deps, criticalPath: [], totalDuration: 0 };
  }),
});
