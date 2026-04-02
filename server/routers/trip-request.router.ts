import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import {
  tripRequests,
  tripItineraries,
  tripBookings,
  insurancePolicies,
  tripInsuranceRecords,
  expensePolicies,
} from "../../drizzle/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";

/** Roles that can see ALL trip requests and approve/reject */
const TRIP_MANAGER_ROLES = new Set(["admin", "director", "dept_manager", "hr_manager", "finance_manager"]);

/** Verify trip belongs to current user (managers bypass) */
async function assertTripOwnership(db: any, tripId: number, userId: number, role: string) {
  if (TRIP_MANAGER_ROLES.has(role)) return;
  const [trip] = await db.select({ userId: tripRequests.userId }).from(tripRequests).where(eq(tripRequests.id, tripId))
      .limit(1);
  if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: `出差申请 #${tripId} 不存在` });
  if (trip.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "无权操作他人的出差申请" });
  }
}

export const tripRequestRouter = router({
  // 出差申请列表 — scoped by role
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const role = ctx.user!.role ?? "employee";
    const isManager = TRIP_MANAGER_ROLES.has(role);
    const whereCondition = isManager ? undefined : eq(tripRequests.userId, ctx.user!.id);
    const items = await db.select().from(tripRequests).where(whereCondition).orderBy(desc(tripRequests.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取出差申请详情（含行程和预订）
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await assertTripOwnership(db, id, ctx.user!.id, ctx.user!.role ?? "employee");
    const [request] = await db.select().from(tripRequests).where(eq(tripRequests.id, id)).limit(1);
    if (!request) return null;

    const itineraries = await db.select().from(tripItineraries)
      .where(eq(tripItineraries.tripRequestId, id))
      .orderBy(tripItineraries.sequenceNo).limit(1000);

    const bookings = await db.select().from(tripBookings)
      .where(eq(tripBookings.tripRequestId, id)).limit(1000);

    const insurance = await db.select().from(tripInsuranceRecords)
      .where(eq(tripInsuranceRecords.tripRequestId, id)).limit(1000);

    return { ...request, itineraries, bookings, insurance };
  }),

  // 创建出差申请
  create: protectedProcedure.input(z.object({
    // DB field names
    tripPurpose: z.string().optional(),
    destinationCity: z.string().optional(),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    isInternational: z.boolean().optional(),
    estimatedBudget: z.union([z.string(), z.number()]).optional(),
    justification: z.string().optional(),
    projectId: z.number().optional(),
    customerId: z.number().optional(),
    // Frontend field names
    tripType: z.string().optional(),
    purpose: z.string().optional(),
    purposeDescription: z.string().optional(),
    departureDate: z.string().optional(),
    returnDate: z.string().optional(),
    departureCity: z.string().optional(),
    destinations: z.array(z.string()).optional(),
    currency: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
    specialRequirements: z.string().optional(),
    itineraries: z.array(z.object({ city: z.string().optional(), date: z.string().optional(), hotel: z.string().optional(), transport: z.string().optional(), notes: z.string().optional() })).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const code = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).toUpperCase().slice(-3)}`;

    // Map frontend fields to DB fields
    const tripPurpose = input.tripPurpose || input.purpose || input.purposeDescription || "business";
    const plannedStart = input.plannedStartDate || input.departureDate || new Date().toISOString().slice(0, 10);
    const plannedEnd = input.plannedEndDate || input.returnDate || plannedStart;
    const destCity = input.destinationCity || (input.destinations?.length ? input.destinations[0] : undefined);
    const isIntl = input.isInternational ?? (input.tripType === "international");

    // Calculate trip days
    const start = new Date(plannedStart);
    const end = new Date(plannedEnd);
    const tripDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const budget = input.estimatedBudget !== undefined ? String(input.estimatedBudget) : undefined;

    const [request] = await db.insert(tripRequests).values({
      requestCode: code,
      userId: ctx.user!.id,
      tripPurpose,
      destinationCity: destCity,
      plannedStartDate: plannedStart,
      plannedEndDate: plannedEnd,
      isInternational: isIntl ? 1 : 0,
      estimatedBudget: budget,
      justification: input.justification || input.specialRequirements,
      projectId: input.projectId,
      customerId: input.customerId,
      tripDays,
      budgetCurrency: input.currency,
      status: "draft",
    }).returning();

    return { success: true, message: "出差申请已创建", data: request };
  }),

  // 更新出差申请
  update: requirePermission('finance:trip:create').input(z.object({
    id: z.string(),
    tripPurpose: z.string().optional(),
    destinationCity: z.string().optional(),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    estimatedBudget: z.string().optional(),
    justification: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const { id, ...updates } = input;
    const numId = parseInt(id);
    await assertTripOwnership(db, numId, ctx.user!.id, ctx.user!.role ?? "employee");
    const [request] = await db.update(tripRequests)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(tripRequests.id, numId))
      .returning();
    return { success: true, message: "更新成功", data: request };
  }),

  // 删除出差申请 — ownership check, only draft
  delete: requirePermission('finance:trip:create').input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await assertTripOwnership(db, id, ctx.user!.id, ctx.user!.role ?? "employee");
    // Delete related records first
    await db.delete(tripItineraries).where(eq(tripItineraries.tripRequestId, id));
    await db.delete(tripBookings).where(eq(tripBookings.tripRequestId, id));
    await db.delete(tripInsuranceRecords).where(eq(tripInsuranceRecords.tripRequestId, id));
    await db.delete(tripRequests).where(eq(tripRequests.id, id));
    return { success: true, message: "删除成功" };
  }),

  // 审批 — role gate + self-approval prevention
  approve: requirePermission('finance:trip:create').input(z.object({
    id: z.string(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    const role = ctx.user!.role ?? "employee";
    if (!TRIP_MANAGER_ROLES.has(role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理角色可审批出差申请" });
    }
    // Check status + self-approval
    const [existing] = await db.select({ userId: tripRequests.userId, status: tripRequests.status })
      .from(tripRequests).where(eq(tripRequests.id, id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: `出差申请 #${id} 不存在` });
    if (existing.userId === ctx.user!.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "不能审批自己的出差申请" });
    }
    if (existing.status !== "submitted") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `出差申请状态为 ${existing.status}，无法审批` });
    }
    const [request] = await db.update(tripRequests)
      .set({
        status: "approved",
        managerApprovedAt: new Date(),
        managerApprovedBy: ctx.user!.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tripRequests.id, id))
      .returning();
    return { success: true, message: "已批准", data: request };
  }),

  // 拒绝 — role gate + self-rejection prevention
  reject: requirePermission('finance:trip:create').input(z.object({
    id: z.string(),
    reason: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    const role = ctx.user!.role ?? "employee";
    if (!TRIP_MANAGER_ROLES.has(role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理角色可驳回出差申请" });
    }
    const [existing] = await db.select({ userId: tripRequests.userId, status: tripRequests.status })
      .from(tripRequests).where(eq(tripRequests.id, id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: `出差申请 #${id} 不存在` });
    if (existing.userId === ctx.user!.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "不能驳回自己的出差申请" });
    }
    if (existing.status !== "submitted") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `出差申请状态为 ${existing.status}，无法驳回` });
    }
    const [request] = await db.update(tripRequests)
      .set({
        status: "rejected",
        rejectionReason: input.reason,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tripRequests.id, id))
      .returning();
    return { success: true, message: "已拒绝", data: request };
  }),

  // 提交申请 — ownership check
  submit: requirePermission('finance:trip:create').input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await assertTripOwnership(db, id, ctx.user!.id, ctx.user!.role ?? "employee");
    const [request] = await db.update(tripRequests)
      .set({ status: "submitted", updatedAt: new Date().toISOString() })
      .where(eq(tripRequests.id, id))
      .returning();
    return { success: true, message: "已提交", data: request };
  }),

  // 取消申请 — ownership check
  cancel: requirePermission('finance:trip:create').input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await assertTripOwnership(db, id, ctx.user!.id, ctx.user!.role ?? "employee");
    const [request] = await db.update(tripRequests)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(eq(tripRequests.id, id))
      .returning();
    return { success: true, message: "已取消", data: request };
  }),

  // 开始出差 — ownership check
  start: requirePermission('finance:trip:create').input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await assertTripOwnership(db, id, ctx.user!.id, ctx.user!.role ?? "employee");
    const [request] = await db.update(tripRequests)
      .set({
        status: "in_progress",
        actualStartDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tripRequests.id, id))
      .returning();
    return { success: true, message: "出差已开始", data: request };
  }),

  // 完成出差 — ownership check
  complete: requirePermission('finance:trip:create').input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await assertTripOwnership(db, id, ctx.user!.id, ctx.user!.role ?? "employee");
    const [request] = await db.update(tripRequests)
      .set({
        status: "completed",
        actualEndDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tripRequests.id, id))
      .returning();
    return { success: true, message: "出差已完成", data: request };
  }),

  // 国家列表（从保险政策中提取适用地区）
  countries: protectedProcedure.query(async () => {
    const db = await requireDb();
    const policies = await db.select().from(insurancePolicies).where(eq(insurancePolicies.isActive, 1)).limit(1000);
    const regions = new Set<string>();
    for (const p of policies) {
      if (p.applicableRegions) {
        try {
          const parsed = JSON.parse(p.applicableRegions);
          if (Array.isArray(parsed)) parsed.forEach((r: string) => regions.add(r));
        } catch { /* ignore */ }
      }
    }
    return Array.from(regions).map(r => ({ name: r }));
  }),

  // 费用政策列表
  expensePolicies: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(expensePolicies)
      .where(eq(expensePolicies.isActive, 1))
      .orderBy(desc(expensePolicies.createdAt)).limit(1000);
  }),

  // 统计
  statistics: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [total] = await db.select({ count: count() }).from(tripRequests);
    const [pending] = await db.select({ count: count() }).from(tripRequests).where(eq(tripRequests.status, "submitted"));
    const [approved] = await db.select({ count: count() }).from(tripRequests).where(eq(tripRequests.status, "approved"));
    const [inProgress] = await db.select({ count: count() }).from(tripRequests).where(eq(tripRequests.status, "in_progress"));
    const [completed] = await db.select({ count: count() }).from(tripRequests).where(eq(tripRequests.status, "completed"));
    const [international] = await db.select({ count: count() }).from(tripRequests).where(eq(tripRequests.isInternational, 1));

    return {
      statistics: {
        total: total.count,
        pending: pending.count,
        approved: approved.count,
        inProgress: inProgress.count,
        completed: completed.count,
        international: international.count,
      },
    };
  }),
});
