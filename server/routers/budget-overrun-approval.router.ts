/**
 * Budget Overrun Approval Router — real DB implementation
 *
 * Queries: budget_overrun_requests table
 *
 * Provides:
 *   - list: paginated overrun requests
 *   - getById: single request detail
 *   - create: submit new overrun request
 *   - approve / reject: workflow actions
 *   - getPendingApprovals: approver inbox
 *   - seedDemo: insert demo data
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { budgetOverrunRequests } from "../../drizzle/budget-overrun-schema";

/** Check optimistic lock version — throws CONFLICT if stale */
async function checkOverrunVersion(db: any, id: number, expectedVersion?: number) {
  if (expectedVersion === undefined) return;
  const [current] = await db.select({ version: budgetOverrunRequests.version }).from(budgetOverrunRequests).where(eq(budgetOverrunRequests.id, id));
  if (current && current.version !== expectedVersion) {
    throw new TRPCError({ code: "CONFLICT", message: "版本冲突：审批记录已被他人修改，请刷新后重试" });
  }
}

export const budgetOverrunApprovalRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      projectId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const conditions = [];
        if (input?.status) conditions.push(eq(budgetOverrunRequests.status, input.status));
        if (input?.projectId) conditions.push(eq(budgetOverrunRequests.projectId, input.projectId));

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const rows = await db.select().from(budgetOverrunRequests)
          .where(where)
          .orderBy(desc(budgetOverrunRequests.createdAt))
          .limit(input?.limit ?? 20)
          .offset(input?.offset ?? 0);
        const [total] = await db.select({ value: count() }).from(budgetOverrunRequests).where(where);

        return {
          items: rows,
          total: Number(total?.value ?? 0),
          page: Math.floor((input?.offset ?? 0) / (input?.limit ?? 20)) + 1,
          pageSize: input?.limit ?? 20,
        };
      } catch {
        return { items: [] as any[], total: 0, page: 1, pageSize: 20 };
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const numId = parseInt(input.id, 10);
        if (isNaN(numId)) return null;
        const [row] = await db.select().from(budgetOverrunRequests)
          .where(eq(budgetOverrunRequests.id, numId));
        return row ?? null;
      } catch {
        return null;
      }
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      projectName: z.string().optional(),
      requestorId: z.number().optional(),
      requestorName: z.string().optional(),
      originalBudget: z.number(),
      overrunAmount: z.number(),
      reason: z.string().optional(),
      category: z.enum(["material", "labor", "subcontract", "travel", "other"]).default("other"),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const newTotal = input.originalBudget + input.overrunAmount;
        const overrunPct = input.originalBudget > 0
          ? Math.round((input.overrunAmount / input.originalBudget) * 100 * 10) / 10
          : 0;

        const [inserted] = await db.insert(budgetOverrunRequests).values({
          projectId: input.projectId ?? null,
          projectName: input.projectName ?? null,
          requestorId: input.requestorId ?? null,
          requestorName: input.requestorName ?? null,
          originalBudget: input.originalBudget,
          overrunAmount: input.overrunAmount,
          newTotalBudget: newTotal,
          overrunPercent: overrunPct,
          reason: input.reason ?? null,
          category: input.category,
          buCode: input.buCode ?? null,
          status: "pending",
        }).returning();

        return { success: true, message: "超预算申请已提交", id: inserted?.id };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  approve: protectedProcedure
    .input(z.object({
      id: z.number(),
      expectedVersion: z.number().optional(),
      approverId: z.number().optional(),
      approverName: z.string().optional(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await checkOverrunVersion(db, input.id, input.expectedVersion);
      await db.update(budgetOverrunRequests).set({
        status: "approved",
        approverId: input.approverId ?? null,
        approverName: input.approverName ?? null,
        approverComment: input.comment ?? null,
        approvedAt: new Date(),
        updatedAt: new Date(),
        version: sql`${budgetOverrunRequests.version} + 1`,
      }).where(eq(budgetOverrunRequests.id, input.id));
      return { success: true, message: "已批准" };
    }),

  reject: protectedProcedure
    .input(z.object({
      id: z.number(),
      expectedVersion: z.number().optional(),
      approverId: z.number().optional(),
      approverName: z.string().optional(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await checkOverrunVersion(db, input.id, input.expectedVersion);
      await db.update(budgetOverrunRequests).set({
        status: "rejected",
        approverId: input.approverId ?? null,
        approverName: input.approverName ?? null,
        approverComment: input.comment ?? null,
        approvedAt: new Date(),
        updatedAt: new Date(),
        version: sql`${budgetOverrunRequests.version} + 1`,
      }).where(eq(budgetOverrunRequests.id, input.id));
      return { success: true, message: "已驳回" };
    }),

  getPendingApprovals: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();
      return db.select().from(budgetOverrunRequests)
        .where(eq(budgetOverrunRequests.status, "pending"))
        .orderBy(desc(budgetOverrunRequests.createdAt));
    } catch {
      return [];
    }
  }),

  /** Seed demo data */
  seedDemo: protectedProcedure.mutation(async () => {
    try {
      const db = await requireDb();
      const [existing] = await db.select({ value: count() }).from(budgetOverrunRequests);
      if (Number(existing?.value ?? 0) > 0) {
        return { ok: true, message: "Demo data already exists" };
      }

      const demos = [
        { projectName: "GRT-UC200 超声波清洗机", originalBudget: 850000, overrunAmount: 127500, category: "material" as const, reason: "特种不锈钢材料价格上涨15%", requestorName: "王五", buCode: "overseas", status: "pending" as const },
        { projectName: "GRT-SP100 喷淋清洗线", originalBudget: 1200000, overrunAmount: 96000, category: "labor" as const, reason: "现场安装工期延长，需增加人工", requestorName: "赵六", buCode: "commercial_vehicle", status: "approved" as const },
        { projectName: "BYD电池壳清洗设备", originalBudget: 2000000, overrunAmount: 400000, category: "subcontract" as const, reason: "客户变更设计方案，增加3个工位", requestorName: "李四", buCode: "passenger_vehicle", status: "pending" as const },
        { projectName: "半导体晶圆清洗系统", originalBudget: 5000000, overrunAmount: 250000, category: "material" as const, reason: "洁净室等级升级为Class100", requestorName: "孙九", buCode: "semiconductor", status: "rejected" as const },
      ];

      for (const d of demos) {
        const newTotal = d.originalBudget + d.overrunAmount;
        const pct = Math.round((d.overrunAmount / d.originalBudget) * 100 * 10) / 10;
        await db.insert(budgetOverrunRequests).values({
          ...d,
          newTotalBudget: newTotal,
          overrunPercent: pct,
          approverId: d.status === "approved" ? 1 : d.status === "rejected" ? 2 : null,
          approverName: d.status === "approved" ? "张总" : d.status === "rejected" ? "陈总监" : null,
          approverComment: d.status === "rejected" ? "建议重新评估方案可行性" : null,
          approvedAt: d.status !== "pending" ? new Date() : null,
        });
      }

      return { ok: true, count: demos.length };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  }),
});
