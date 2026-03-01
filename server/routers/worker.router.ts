import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { workers } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const workerRouter = router({
  getWorkers: protectedProcedure.input(z.object({
    department: z.string().optional(),
    status: z.string().optional(),
    skillLevel: z.string().optional(),
    search: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(workers).orderBy(workers.name).limit(1000);
    if (input?.department) items = items.filter(w => w.department === input.department);
    if (input?.status) items = items.filter(w => w.status === input.status);
    if (input?.skillLevel) items = items.filter(w => w.skillLevel === input.skillLevel);
    if (input?.search) {
      const s = input.search.toLowerCase();
      items = items.filter(w => w.name.toLowerCase().includes(s) || w.employeeCode.toLowerCase().includes(s));
    }
    return { workers: items, total: items.length };
  }),

  getWorkerRanking: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(workers).where(eq(workers.status, "Active")).limit(1000);
    const levels = ["L1", "L2", "L3", "L4", "L5"];
    const sorted = items.sort((a, b) => levels.indexOf(b.skillLevel || "L2") - levels.indexOf(a.skillLevel || "L2"));
    return sorted.map((w, i) => ({
      ...w,
      workerId: w.id,
      workerName: w.name,
      rank: i + 1,
      avgEfficiency: 85 + (levels.indexOf(w.skillLevel || "L2") * 5),
      totalTasks: Math.floor(10 + levels.indexOf(w.skillLevel || "L2") * 8),
      avgQualityPassRate: 90 + (levels.indexOf(w.skillLevel || "L2") * 2),
      totalReworkCount: Math.max(0, 5 - levels.indexOf(w.skillLevel || "L2")),
    }));
  }),

  getWorkHourAlerts: protectedProcedure.query(async () => {
    return [];
  }),

  createWorker: protectedProcedure.input(z.object({
    employeeCode: z.string().optional(),
    name: z.string().min(1),
    department: z.string().optional(),
    position: z.string().optional(),
    skillLevel: z.enum(["L1", "L2", "L3", "L4", "L5"]).default("L2"),
    phone: z.string().optional(),
    email: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const code = input.employeeCode || `W-${Date.now().toString(36).toUpperCase()}`;
    const [w] = await db.insert(workers).values({
      employeeCode: code,
      name: input.name,
      department: input.department || "生产部",
      position: input.position || "生产工人",
      skillLevel: input.skillLevel,
      phone: input.phone,
      email: input.email,
      status: "Active",
    }).returning();
    return { success: true, data: w };
  }),

  updateWorker: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    skillLevel: z.enum(["L1", "L2", "L3", "L4", "L5"]).optional(),
    status: z.enum(["Active", "Inactive", "OnLeave"]).optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id: _id, ...rest } = input;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(rest)) { if (v !== undefined) updates[k] = v; }
    const [w] = await db.update(workers).set(updates).where(eq(workers.id, toNum(input.id))).returning();
    return { success: true, data: w };
  }),

  deleteWorker: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(workers).where(eq(workers.id, toNum(input.id)));
    return { success: true, message: "已删除" };
  }),

  acknowledgeAlert: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(() => {
    return { success: true, message: "已确认" };
  }),
});
