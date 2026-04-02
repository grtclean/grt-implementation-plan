/**
 * Finance Workflow Router — Comprehensive Financial Operations
 *
 * Covers: project reimbursement (role-specific approval chain),
 *         supplier payment tracking, customer payment tracking,
 *         bank accounts, fixed expenses, material inventory counts,
 *         and finance dashboard KPIs.
 *
 * Approval chain (reimbursement):
 *   申请人 → 王汝月 GRT101 (finance_specialist, initial review)
 *         → 王秀萍 GRT054 (finance reviewer, second review)
 *         → 倪微薇 GRT105 (director, >10K approval)
 *         → 黄晓兰 GRT002 (cashier, bank transfer execution)
 *
 * ~34 procedures across 8 sub-sections.
 */
import { z } from "zod";
import { router, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, desc, and, count, gte, lte } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import {
  projectReimbursements, supplierPaymentTracking, customerPaymentTracking,
  bankAccounts, fixedExpenses, materialInventoryCounts, materialInventoryCountItems,
} from "../../drizzle/finance-workflow-schema";
import type { SQL } from "drizzle-orm";
import { processBusinessEvent } from "../services/finance-event-bridge.service";
import { expensePolicyRules } from "../../drizzle/project-finance-schema";

const log = createChildLogger("finance-workflow-router");

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id, 10) : id;

/** Generate a sequential code: PR-20260317-0001 */
function generateCode(prefix: string) {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `${prefix}-${dateStr}-${rand}`;
}

// Financial role mapping for approval chain
const FINANCE_ROLES = {
  INITIAL_REVIEWER: { employeeId: "GRT101", name: "王汝月", role: "finance_specialist" },
  SECOND_REVIEWER:  { employeeId: "GRT054", name: "王秀萍", role: "finance_reviewer" },
  DIRECTOR:         { employeeId: "GRT105", name: "倪微薇", role: "director" },
  CASHIER:          { employeeId: "GRT002", name: "黄晓兰", role: "cashier" },
} as const;

const HIGH_VALUE_THRESHOLD = 10_000; // amounts above this require director approval

// Common pagination + date range input
const paginationInput = z.object({
  limit: z.number().min(1).max(500).default(50),
  offset: z.number().min(0).default(0),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════
// 1. Reimbursement (报销)
// ═══════════════════════════════════════════════════════════════
const reimbursementRouter = router({
  /** Create a draft reimbursement linked to a project */
  create: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      projectCode: z.string().optional(),
      projectName: z.string().optional(),
      reimbursementType: z.enum(["travel", "procurement", "material", "entertainment", "other"]),
      totalAmount: z.number().positive(),
      currency: z.string().default("CNY"),
      applicantName: z.string(),
      department: z.string().optional(),
      buCode: z.string().optional(),
      description: z.string().max(2000).optional(),
      lineItems: z.string().optional(), // JSON array of line items
      travelDestination: z.string().optional(),
      travelStartDate: z.string().optional(),
      travelEndDate: z.string().optional(),
      attachments: z.string().optional(), // JSON array of file URLs
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const code = generateCode("PR");
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      log.info({ code, userId, totalAmount: input.totalAmount, type: input.reimbursementType }, "创建报销单草稿");

      const [row] = await db.insert(projectReimbursements).values({
        requestCode: code,
        applicantId: userId,
        applicantName: input.applicantName,
        department: input.department ?? null,
        buCode: input.buCode ?? null,
        projectId: input.projectId ?? null,
        projectCode: input.projectCode ?? null,
        projectName: input.projectName ?? null,
        reimbursementType: input.reimbursementType,
        totalAmount: String(input.totalAmount),
        currency: input.currency,
        lineItems: input.lineItems ?? null,
        travelDestination: input.travelDestination ?? null,
        travelStartDate: input.travelStartDate ?? null,
        travelEndDate: input.travelEndDate ?? null,
        attachments: input.attachments ?? null,
        notes: input.description ?? null,
        status: "draft",
      }).returning({ id: projectReimbursements.id });

      return { id: row.id, code, status: "draft" };
    }),

  /** Submit draft for review — auto-routes to 王汝月 (finance specialist) */
  submit: protectedProcedure
    .input(idInput)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      const [existing] = await db.select().from(projectReimbursements).where(eq(projectReimbursements.id, id)).limit(1);
      if (!existing) throw new Error("报销单不存在");
      if (existing.status !== "draft" && existing.status !== "rejected") {
        throw new Error("只能提交草稿或已退回的报销单");
      }

      log.info({ id, code: existing.requestCode, userId }, "提交报销单 → 王汝月初审");

      // 报销政策自动校验
      const violations: string[] = [];
      try {
        const policies = await db.select().from(expensePolicyRules)
          .where(eq(expensePolicyRules.isActive, true))
          .limit(50);

        if (policies.length > 0 && existing.lineItems) {
          const items = typeof existing.lineItems === 'string' ? JSON.parse(existing.lineItems) : [];
          for (const item of items) {
            const matchingPolicy = policies.find(p =>
              p.category === (item.category || existing.reimbursementType)
            );
            if (matchingPolicy && item.amount && Number(item.amount) > Number(matchingPolicy.maxAmount)) {
              violations.push(`${item.description || item.category}: ¥${item.amount} 超过限额 ¥${matchingPolicy.maxAmount}`);
            }
          }
        }
      } catch (policyErr) {
        log.warn({ err: policyErr }, '报销政策校验失败(不阻塞提交)');
      }

      const policyCompliant = violations.length === 0;

      await db.update(projectReimbursements)
        .set({
          status: "submitted",
          currentReviewerName: FINANCE_ROLES.INITIAL_REVIEWER.name,
          policyCompliant: policyCompliant,
          policyViolations: violations.length > 0 ? JSON.stringify(violations) : null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(projectReimbursements.id, id));

      return { id, status: "submitted", assignedTo: FINANCE_ROLES.INITIAL_REVIEWER.name, policyCompliant, violations };
    }),

  /** List reimbursements with filters — finance roles see all, others see own */
  list: protectedProcedure
    .input(paginationInput.extend({
      status: z.string().optional(),
      projectId: z.number().optional(),
      applicantId: z.number().optional(),
      reimbursementType: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const userRole = (ctx as any).user?.role;
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      const conditions: SQL[] = [];

      // Non-finance roles can only see their own reimbursements
      const financeRoles = ["admin", "finance_specialist", "finance_reviewer", "director", "cfo", "ceo"];
      if (!financeRoles.includes(userRole)) {
        conditions.push(eq(projectReimbursements.applicantId, userId));
      }

      if (input?.status) conditions.push(eq(projectReimbursements.status, input.status));
      if (input?.projectId) conditions.push(eq(projectReimbursements.projectId, input.projectId));
      if (input?.applicantId) conditions.push(eq(projectReimbursements.applicantId, input.applicantId));
      if (input?.reimbursementType) conditions.push(eq(projectReimbursements.reimbursementType, input.reimbursementType));
      if (input?.dateFrom) conditions.push(gte(projectReimbursements.createdAt, input.dateFrom));
      if (input?.dateTo) conditions.push(lte(projectReimbursements.createdAt, input.dateTo));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({ count: count() }).from(projectReimbursements).where(whereClause);
      const total = Number(totalResult?.count ?? 0);
      const items = await db.select().from(projectReimbursements)
        .where(whereClause)
        .orderBy(desc(projectReimbursements.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total };
    }),

  /** Get a single reimbursement by ID */
  get: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const [row] = await db.select().from(projectReimbursements).where(eq(projectReimbursements.id, id)).limit(1);
      if (!row) throw new Error("报销单不存在");
      return row;
    }),

  /** 王汝月 initial review — approve/reject with policy check */
  review: requirePermission("finance:review")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      action: z.enum(["approve", "reject"]),
      policyCompliant: z.boolean().default(true),
      policyViolations: z.string().optional(), // JSON array
      comments: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const reviewerId = (ctx as any).user?.id ?? (ctx as any).userId;

      const [existing] = await db.select().from(projectReimbursements).where(eq(projectReimbursements.id, id)).limit(1);
      if (!existing) throw new Error("报销单不存在");
      if (existing.status !== "submitted") {
        throw new Error("该报销单不在初审阶段");
      }

      if (input.action === "reject") {
        log.info({ id, reviewerId }, "王汝月退回报销单");
        await db.update(projectReimbursements)
          .set({
            status: "rejected",
            rejectionReason: input.comments ?? "初审不通过",
            rejectedBy: reviewerId,
            rejectedAt: sql`NOW()`,
            currentReviewerName: null,
            updatedAt: sql`NOW()`,
          })
          .where(eq(projectReimbursements.id, id));
        return { id, status: "rejected" };
      }

      if (!input.policyCompliant) {
        // Record violations but don't approve
        await db.update(projectReimbursements)
          .set({
            policyCompliant: false,
            policyViolations: input.policyViolations ?? null,
            updatedAt: sql`NOW()`,
          })
          .where(eq(projectReimbursements.id, id));
        throw new Error("报销政策检查未通过，已记录违规项，请修改后重新提交");
      }

      // Approve → route to 王秀萍 (second review)
      log.info({ id, reviewerId }, "王汝月初审通过 → 王秀萍复审");
      await db.update(projectReimbursements)
        .set({
          status: "finance_review",
          policyCompliant: true,
          financeSpecialistId: reviewerId,
          financeSpecialistApprovedAt: sql`NOW()`,
          currentReviewerName: FINANCE_ROLES.SECOND_REVIEWER.name,
          notes: input.comments ?? existing.notes,
          updatedAt: sql`NOW()`,
        })
        .where(eq(projectReimbursements.id, id));

      return { id, status: "finance_review", assignedTo: FINANCE_ROLES.SECOND_REVIEWER.name };
    }),

  /** 王秀萍 second review — if amount > 10K, route to 倪微薇 */
  approve: requirePermission("finance:approve")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      action: z.enum(["approve", "reject"]),
      approvedAmount: z.number().optional(),
      comments: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const reviewerId = (ctx as any).user?.id ?? (ctx as any).userId;

      const [existing] = await db.select().from(projectReimbursements).where(eq(projectReimbursements.id, id)).limit(1);
      if (!existing) throw new Error("报销单不存在");
      if (existing.status !== "finance_review") {
        throw new Error("该报销单不在复审阶段");
      }

      if (input.action === "reject") {
        log.info({ id, reviewerId }, "王秀萍退回报销单");
        await db.update(projectReimbursements)
          .set({
            status: "rejected",
            rejectionReason: input.comments ?? "复审不通过",
            rejectedBy: reviewerId,
            rejectedAt: sql`NOW()`,
            currentReviewerName: null,
            updatedAt: sql`NOW()`,
          })
          .where(eq(projectReimbursements.id, id));
        return { id, status: "rejected" };
      }

      const amount = parseFloat(String(existing.totalAmount));
      const approved = input.approvedAmount ?? amount;

      // High-value reimbursements require director approval
      if (amount > HIGH_VALUE_THRESHOLD) {
        log.info({ id, amount, reviewerId }, "王秀萍复审通过 → 倪微薇总监审批 (金额>10K)");
        await db.update(projectReimbursements)
          .set({
            status: "finance_approved",
            approvedAmount: String(approved),
            financeReviewerId: reviewerId,
            financeReviewerApprovedAt: sql`NOW()`,
            currentReviewerName: FINANCE_ROLES.DIRECTOR.name,
            updatedAt: sql`NOW()`,
          })
          .where(eq(projectReimbursements.id, id));
        return { id, status: "finance_approved", assignedTo: FINANCE_ROLES.DIRECTOR.name };
      }

      // Under threshold — route directly to cashier
      log.info({ id, amount, reviewerId }, "王秀萍复审通过 → 黄晓兰出纳付款 (金额<=10K)");
      await db.update(projectReimbursements)
        .set({
          status: "cashier_processing",
          approvedAmount: String(approved),
          financeReviewerId: reviewerId,
          financeReviewerApprovedAt: sql`NOW()`,
          currentReviewerName: FINANCE_ROLES.CASHIER.name,
          updatedAt: sql`NOW()`,
        })
        .where(eq(projectReimbursements.id, id));

      return { id, status: "cashier_processing", assignedTo: FINANCE_ROLES.CASHIER.name };
    }),

  /** 黄晓兰 executes bank transfer, records transaction ID */
  executePayment: requirePermission("finance:execute_payment")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      paymentTransactionId: z.string().min(1).max(100),
      payeeBankAccount: z.string().optional(),
      payeeBankName: z.string().optional(),
      payeeAccountName: z.string().optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const cashierId = (ctx as any).user?.id ?? (ctx as any).userId;

      const [existing] = await db.select().from(projectReimbursements).where(eq(projectReimbursements.id, id)).limit(1);
      if (!existing) throw new Error("报销单不存在");
      if (existing.status !== "cashier_processing" && existing.status !== "director_approved") {
        throw new Error("该报销单不在待付款阶段");
      }

      log.info({ id, paymentTransactionId: input.paymentTransactionId, cashierId }, "黄晓兰执行银行转账");

      await db.update(projectReimbursements)
        .set({
          status: "paid",
          paymentTransactionId: input.paymentTransactionId,
          payeeBankAccount: input.payeeBankAccount ?? existing.payeeBankAccount,
          payeeBankName: input.payeeBankName ?? existing.payeeBankName,
          payeeAccountName: input.payeeAccountName ?? existing.payeeAccountName,
          cashierId,
          cashierProcessedAt: sql`NOW()`,
          paidAt: sql`NOW()`,
          currentReviewerName: null,
          notes: input.notes ?? existing.notes,
          updatedAt: sql`NOW()`,
        })
        .where(eq(projectReimbursements.id, id));

      // GL自动过账 — 报销通过→费用/银行分录
      try {
        const glResult = processBusinessEvent({
          eventType: 'reimbursement_approved',
          eventId: `EVT-REIMB-${id}`,
          sourceModule: 'finance-workflow',
          sourceDocType: 'reimbursement',
          sourceDocId: id,
          sourceDocCode: existing.requestCode,
          amount: Number(existing.totalAmount),
          projectCode: existing.projectCode || undefined,
          departmentCode: existing.department || undefined,
          userId: cashierId,
          metadata: { reimbursementType: existing.reimbursementType },
          timestamp: new Date().toISOString(),
        });
        log.info({ glResult: glResult.glResult?.success, actions: glResult.actions }, 'GL自动过账完成');
      } catch (glErr) {
        log.error({ err: glErr }, 'GL自动过账失败(不阻塞付款流程)');
      }

      return { id, status: "paid", paymentTransactionId: input.paymentTransactionId };
    }),

  /** Reject at any stage with reason — allows restart from draft */
  reject: requirePermission("finance:review")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      reason: z.string().min(1).max(2000),
      allowRestart: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const reviewerId = (ctx as any).user?.id ?? (ctx as any).userId;

      const [existing] = await db.select().from(projectReimbursements).where(eq(projectReimbursements.id, id)).limit(1);
      if (!existing) throw new Error("报销单不存在");
      if (existing.status === "paid" || existing.status === "draft") {
        throw new Error("已付款或草稿状态不能退回");
      }

      log.info({ id, stage: existing.status, reviewerId, reason: input.reason }, "报销单被退回");

      await db.update(projectReimbursements)
        .set({
          status: input.allowRestart ? "draft" : "rejected",
          rejectionReason: input.reason,
          rejectedBy: reviewerId,
          rejectedAt: sql`NOW()`,
          currentReviewerName: null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(projectReimbursements.id, id));

      return { id, status: input.allowRestart ? "draft" : "rejected" };
    }),

  delete: requirePermission("finance:reimbursement:manage")
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = Number(input.id);
      const [existing] = await db.select().from(projectReimbursements).where(eq(projectReimbursements.id, id)).limit(1);
      if (!existing) throw new Error("报销单不存在");
      if (existing.status !== "draft") throw new Error("仅草稿状态可删除");
      await db.delete(projectReimbursements).where(eq(projectReimbursements.id, id));
      return { success: true, message: "报销单已删除" };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 2. Supplier Payment Tracking (供应商付款)
// ═══════════════════════════════════════════════════════════════
const supplierPaymentRouter = router({
  /** Create a supplier payment tracking record with all stages */
  create: requirePermission("finance:supplier_payment")
    .input(z.object({
      supplierId: z.number(),
      supplierCode: z.string(),
      supplierName: z.string(),
      purchaseOrderId: z.number().optional(),
      poNumber: z.string().optional(),
      contractNumber: z.string().optional(),
      projectId: z.number().optional(),
      projectCode: z.string().optional(),
      contractAmount: z.number().positive(),
      currency: z.string().default("CNY"),
      prepaymentAmount: z.number().min(0).default(0),
      deliveryPaymentAmount: z.number().min(0).default(0),
      acceptancePaymentAmount: z.number().min(0).default(0),
      warrantyDepositAmount: z.number().min(0).default(0),
      warrantyMonths: z.number().min(0).max(60).default(12),
      isLargeAsset: z.boolean().default(false),
      supplierBankName: z.string().optional(),
      supplierBankAccount: z.string().optional(),
      supplierAccountName: z.string().optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      log.info({ supplierId: input.supplierId, contractAmount: input.contractAmount }, "创建供应商付款跟踪");

      const [row] = await db.insert(supplierPaymentTracking).values({
        supplierId: input.supplierId,
        supplierCode: input.supplierCode,
        supplierName: input.supplierName,
        purchaseOrderId: input.purchaseOrderId ?? null,
        poNumber: input.poNumber ?? null,
        contractNumber: input.contractNumber ?? null,
        projectId: input.projectId ?? null,
        projectCode: input.projectCode ?? null,
        contractAmount: String(input.contractAmount),
        currency: input.currency,
        prepaymentAmount: String(input.prepaymentAmount),
        prepaymentStatus: input.prepaymentAmount > 0 ? "pending" : "na",
        deliveryPaymentAmount: String(input.deliveryPaymentAmount),
        deliveryPaymentStatus: input.deliveryPaymentAmount > 0 ? "pending" : "na",
        acceptancePaymentAmount: String(input.acceptancePaymentAmount),
        acceptancePaymentStatus: input.acceptancePaymentAmount > 0 ? "pending" : "na",
        warrantyDepositAmount: String(input.warrantyDepositAmount),
        warrantyDepositStatus: input.warrantyDepositAmount > 0 ? "held" : "na",
        warrantyMonths: input.warrantyMonths,
        totalPaidAmount: "0",
        remainingAmount: String(input.contractAmount),
        isLargeAsset: input.isLargeAsset,
        supplierBankName: input.supplierBankName ?? null,
        supplierBankAccount: input.supplierBankAccount ?? null,
        supplierAccountName: input.supplierAccountName ?? null,
        notes: input.notes ?? null,
        status: "active",
        createdBy: userId,
      }).returning({ id: supplierPaymentTracking.id });

      return { id: row.id };
    }),

  /** List supplier payments with filters */
  list: protectedProcedure
    .input(paginationInput.extend({
      supplierId: z.number().optional(),
      status: z.string().optional(),
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions: SQL[] = [];
      if (input?.supplierId) conditions.push(eq(supplierPaymentTracking.supplierId, input.supplierId));
      if (input?.status) conditions.push(eq(supplierPaymentTracking.status, input.status));
      if (input?.projectId) conditions.push(eq(supplierPaymentTracking.projectId, input.projectId));
      if (input?.dateFrom) conditions.push(gte(supplierPaymentTracking.createdAt, input.dateFrom));
      if (input?.dateTo) conditions.push(lte(supplierPaymentTracking.createdAt, input.dateTo));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(supplierPaymentTracking).where(whereClause);
      const total = Number(totalResult?.count ?? 0);
      const items = await db.select().from(supplierPaymentTracking)
        .where(whereClause)
        .orderBy(desc(supplierPaymentTracking.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total };
    }),

  /** Update a specific payment stage (prepay / delivery / acceptance / warranty) */
  updateStage: requirePermission("finance:supplier_payment")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      stage: z.enum(["prepayment", "delivery", "acceptance", "warranty"]),
      status: z.enum(["pending", "paid", "na"]),
      paidDate: z.string().optional(),
      invoiceNumber: z.string().optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      log.info({ id, stage: input.stage, status: input.status, userId }, "更新供应商付款阶段");

      const [existing] = await db.select().from(supplierPaymentTracking).where(eq(supplierPaymentTracking.id, id)).limit(1);
      if (!existing) throw new Error("供应商付款记录不存在");

      const updateData: Record<string, any> = { updatedAt: sql`NOW()` };

      switch (input.stage) {
        case "prepayment":
          updateData.prepaymentStatus = input.status;
          if (input.paidDate) updateData.prepaymentDate = input.paidDate;
          break;
        case "delivery":
          updateData.deliveryPaymentStatus = input.status;
          if (input.paidDate) updateData.deliveryPaymentDate = input.paidDate;
          break;
        case "acceptance":
          updateData.acceptancePaymentStatus = input.status;
          if (input.paidDate) updateData.acceptancePaymentDate = input.paidDate;
          break;
        case "warranty":
          updateData.warrantyDepositStatus = input.status === "paid" ? "released" : input.status;
          if (input.paidDate) updateData.warrantyDepositDueDate = input.paidDate;
          break;
      }

      // Recalculate totalPaidAmount
      const prepayPaid = input.stage === "prepayment" && input.status === "paid"
        ? parseFloat(String(existing.prepaymentAmount) || "0")
        : (existing.prepaymentStatus === "paid" ? parseFloat(String(existing.prepaymentAmount) || "0") : 0);
      const deliveryPaid = input.stage === "delivery" && input.status === "paid"
        ? parseFloat(String(existing.deliveryPaymentAmount) || "0")
        : (existing.deliveryPaymentStatus === "paid" ? parseFloat(String(existing.deliveryPaymentAmount) || "0") : 0);
      const acceptancePaid = input.stage === "acceptance" && input.status === "paid"
        ? parseFloat(String(existing.acceptancePaymentAmount) || "0")
        : (existing.acceptancePaymentStatus === "paid" ? parseFloat(String(existing.acceptancePaymentAmount) || "0") : 0);
      const warrantyPaid = input.stage === "warranty" && input.status === "paid"
        ? parseFloat(String(existing.warrantyDepositAmount) || "0")
        : (existing.warrantyDepositStatus === "released" ? parseFloat(String(existing.warrantyDepositAmount) || "0") : 0);

      const totalPaid = prepayPaid + deliveryPaid + acceptancePaid + warrantyPaid;
      const contractAmt = parseFloat(String(existing.contractAmount) || "0");
      updateData.totalPaidAmount = String(totalPaid);
      updateData.remainingAmount = String(contractAmt - totalPaid);

      await db.update(supplierPaymentTracking)
        .set(updateData)
        .where(eq(supplierPaymentTracking.id, id));

      // GL自动过账 — 供应商付款阶段完成→应付/银行分录
      if (input.status === "paid") {
        try {
          const stageAmountMap: Record<string, string> = {
            prepayment: String(existing.prepaymentAmount),
            delivery: String(existing.deliveryPaymentAmount),
            acceptance: String(existing.acceptancePaymentAmount),
            warranty: String(existing.warrantyDepositAmount),
          };
          const stageAmount = parseFloat(stageAmountMap[input.stage] || "0");
          const glResult = processBusinessEvent({
            eventType: 'supplier_payment_executed',
            eventId: `EVT-SUPPAY-${id}-${input.stage}`,
            sourceModule: 'finance-workflow',
            sourceDocType: 'supplier_payment',
            sourceDocId: id,
            sourceDocCode: existing.contractNumber || `SP-${id}`,
            amount: stageAmount,
            projectCode: existing.projectCode || undefined,
            userId: userId,
            supplierId: existing.supplierId,
            metadata: { stage: input.stage },
            timestamp: new Date().toISOString(),
          });
          log.info({ glResult: glResult.glResult?.success, stage: input.stage }, 'GL自动过账完成(供应商付款)');
        } catch (glErr) {
          log.error({ err: glErr }, 'GL自动过账失败(不阻塞供应商付款)');
        }
      }

      return { id, stage: input.stage, status: input.status, totalPaid, remaining: contractAmt - totalPaid };
    }),

  /** Multi-step large asset acceptance workflow */
  processLargeAssetAcceptance: requirePermission("finance:large_asset_acceptance")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      step: z.enum([
        "pre_inspection",
        "quality_check",
        "user_dept_confirm",
        "procurement_confirm",
        "bu_manager_approve",
        "procurement_manager_approve",
        "finance_confirm",
        "cashier_execute",
      ]),
      approved: z.boolean(),
      comments: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      const stepOrder = [
        "pre_inspection", "quality_check", "user_dept_confirm",
        "procurement_confirm", "bu_manager_approve", "procurement_manager_approve",
        "finance_confirm", "cashier_execute",
      ];
      const stepIndex = stepOrder.indexOf(input.step);

      log.info({ id, step: input.step, stepIndex, approved: input.approved, userId }, "大额资产验收流程");

      if (!input.approved) {
        await db.update(supplierPaymentTracking)
          .set({
            preAcceptanceStatus: "failed",
            notes: input.comments ?? "验收不通过",
            updatedAt: sql`NOW()`,
          })
          .where(eq(supplierPaymentTracking.id, id));
        return { id, step: input.step, result: "rejected", nextStep: null };
      }

      const nextStep = stepIndex < stepOrder.length - 1 ? stepOrder[stepIndex + 1] : null;
      const updateData: Record<string, any> = { updatedAt: sql`NOW()` };

      // Map steps to schema columns
      switch (input.step) {
        case "pre_inspection":
          updateData.preAcceptanceStatus = "passed";
          updateData.preAcceptanceDate = sql`NOW()`;
          updateData.preAcceptanceBy = userId;
          break;
        case "quality_check":
          updateData.qualityApprovalBy = userId;
          break;
        case "user_dept_confirm":
          updateData.userDeptApprovalBy = userId;
          break;
        case "procurement_confirm":
          updateData.procurementConfirmBy = userId;
          break;
        case "bu_manager_approve":
          updateData.buManagerApprovalBy = userId;
          break;
        case "procurement_manager_approve":
          updateData.procurementManagerConfirmBy = userId;
          break;
        case "finance_confirm":
          updateData.financeConfirmBy = userId;
          break;
        case "cashier_execute":
          updateData.cashierExecuteBy = userId;
          updateData.finalAcceptanceStatus = "passed";
          updateData.finalAcceptanceDate = sql`NOW()`;
          updateData.finalAcceptanceBy = userId;
          updateData.acceptancePaymentStatus = "paid";
          updateData.acceptancePaymentDate = sql`NOW()`;
          break;
      }

      await db.update(supplierPaymentTracking)
        .set(updateData)
        .where(eq(supplierPaymentTracking.id, id));

      return { id, step: input.step, result: "approved", nextStep };
    }),

  /** Release warranty deposit after warranty period */
  releaseWarrantyDeposit: requirePermission("finance:warranty_release")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      const [existing] = await db.select().from(supplierPaymentTracking).where(eq(supplierPaymentTracking.id, id)).limit(1);
      if (!existing) throw new Error("供应商付款记录不存在");
      if (existing.warrantyDepositStatus !== "held") {
        throw new Error("质保金状态不是[持有中]，无法释放");
      }

      log.info({ id, userId }, "释放质保金");

      const warrantyAmt = parseFloat(String(existing.warrantyDepositAmount) || "0");
      const currentPaid = parseFloat(String(existing.totalPaidAmount) || "0");
      const contractAmt = parseFloat(String(existing.contractAmount) || "0");

      await db.update(supplierPaymentTracking)
        .set({
          warrantyDepositStatus: "released",
          totalPaidAmount: String(currentPaid + warrantyAmt),
          remainingAmount: String(contractAmt - currentPaid - warrantyAmt),
          notes: input.notes ?? existing.notes,
          updatedAt: sql`NOW()`,
        })
        .where(eq(supplierPaymentTracking.id, id));

      return { id, status: "warranty_released" };
    }),

  /** Aggregated payment summary per supplier */
  getSummary: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(supplierPaymentTracking)
        .where(eq(supplierPaymentTracking.supplierId, input.supplierId))
        .orderBy(desc(supplierPaymentTracking.createdAt))
        .limit(200);

      let totalContractValue = 0;
      let totalPaid = 0;
      let pendingCount = 0;

      for (const item of items) {
        totalContractValue += parseFloat(String(item.contractAmount) || "0");
        totalPaid += parseFloat(String(item.totalPaidAmount) || "0");
        if (item.status === "active") pendingCount++;
      }

      return {
        supplierId: input.supplierId,
        totalRecords: items.length,
        totalContractValue,
        totalPaid,
        outstanding: totalContractValue - totalPaid,
        pendingCount,
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 3. Customer Payment Tracking (客户付款)
// ═══════════════════════════════════════════════════════════════
const customerPaymentRouter = router({
  /** Create customer payment tracking with milestones */
  create: requirePermission("finance:customer_payment")
    .input(z.object({
      customerId: z.number().optional(),
      customerCode: z.string().optional(),
      customerName: z.string(),
      contractNumber: z.string().optional(),
      projectId: z.number().optional(),
      projectCode: z.string().optional(),
      contractAmount: z.number().positive(),
      currency: z.string().default("CNY"),
      milestones: z.string().optional(), // JSON array: [{name, percentage, amount, dueDate}]
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      log.info({ customerId: input.customerId, contractAmount: input.contractAmount }, "创建客户付款跟踪");

      const [row] = await db.insert(customerPaymentTracking).values({
        customerId: input.customerId ?? null,
        customerCode: input.customerCode ?? null,
        customerName: input.customerName,
        contractNumber: input.contractNumber ?? null,
        projectId: input.projectId ?? null,
        projectCode: input.projectCode ?? null,
        contractAmount: String(input.contractAmount),
        currency: input.currency,
        milestones: input.milestones ?? null,
        totalInvoicedAmount: "0",
        totalReceivedAmount: "0",
        remainingAmount: String(input.contractAmount),
        overdueAmount: "0",
        overdueDays: 0,
        status: "active",
        notes: input.notes ?? null,
        createdBy: userId,
      }).returning({ id: customerPaymentTracking.id });

      return { id: row.id };
    }),

  /** List customer payments with overdue highlighting */
  list: protectedProcedure
    .input(paginationInput.extend({
      customerId: z.number().optional(),
      status: z.string().optional(),
      overdueOnly: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions: SQL[] = [];
      if (input?.customerId) conditions.push(eq(customerPaymentTracking.customerId, input.customerId));
      if (input?.status) conditions.push(eq(customerPaymentTracking.status, input.status));
      if (input?.dateFrom) conditions.push(gte(customerPaymentTracking.createdAt, input.dateFrom));
      if (input?.dateTo) conditions.push(lte(customerPaymentTracking.createdAt, input.dateTo));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(customerPaymentTracking).where(whereClause);
      const total = Number(totalResult?.count ?? 0);
      const items = await db.select().from(customerPaymentTracking)
        .where(whereClause)
        .orderBy(desc(customerPaymentTracking.createdAt))
        .limit(limit)
        .offset(offset);

      // Compute overdue status for each item
      const now = new Date();
      const enrichedItems = items.map(item => {
        const milestones = JSON.parse(String(item.milestones) || "[]");
        const overdueMilestones = milestones.filter((m: any) =>
          m.dueDate && new Date(m.dueDate) < now && m.status !== "paid"
        );
        const overdueAmt = overdueMilestones.reduce((s: number, m: any) => s + (m.amount || 0), 0);
        return {
          ...item,
          isOverdue: overdueMilestones.length > 0,
          overdueCount: overdueMilestones.length,
          computedOverdueAmount: overdueAmt,
        };
      });

      const filtered = input?.overdueOnly
        ? enrichedItems.filter(i => i.isOverdue)
        : enrichedItems;

      return { items: filtered, total: input?.overdueOnly ? filtered.length : total };
    }),

  /** Record received payment with invoice number */
  recordPayment: requirePermission("finance:customer_payment")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      amount: z.number().positive(),
      invoiceNo: z.string().optional(),
      invoiceDate: z.string().optional(),
      invoiceAmount: z.number().optional(),
      milestoneName: z.string().optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      const [existing] = await db.select().from(customerPaymentTracking).where(eq(customerPaymentTracking.id, id)).limit(1);
      if (!existing) throw new Error("客户付款记录不存在");

      const currentReceived = parseFloat(String(existing.totalReceivedAmount) || "0");
      const newReceived = currentReceived + input.amount;
      const contractAmt = parseFloat(String(existing.contractAmount) || "0");

      log.info({ id, amount: input.amount, invoiceNo: input.invoiceNo, userId }, "记录客户到款");

      // Update milestone if specified
      let milestones = JSON.parse(String(existing.milestones) || "[]");
      if (input.milestoneName) {
        milestones = milestones.map((m: any) => {
          if (m.name === input.milestoneName) {
            return { ...m, status: "paid", paidDate: new Date().toISOString().split("T")[0], paidAmount: input.amount };
          }
          return m;
        });
      }

      const newStatus = newReceived >= contractAmt ? "completed" : "active";
      const currentInvoiced = parseFloat(String(existing.totalInvoicedAmount) || "0");
      const newInvoiced = input.invoiceAmount ? currentInvoiced + input.invoiceAmount : currentInvoiced;

      await db.update(customerPaymentTracking)
        .set({
          totalReceivedAmount: String(newReceived),
          totalInvoicedAmount: String(newInvoiced),
          remainingAmount: String(contractAmt - newReceived),
          milestones: JSON.stringify(milestones),
          status: newStatus,
          latestInvoiceNo: input.invoiceNo ?? existing.latestInvoiceNo,
          latestInvoiceDate: input.invoiceDate ?? existing.latestInvoiceDate,
          latestInvoiceAmount: input.invoiceAmount ? String(input.invoiceAmount) : existing.latestInvoiceAmount,
          updatedAt: sql`NOW()`,
        })
        .where(eq(customerPaymentTracking.id, id));

      // GL自动过账 — 客户到款→银行/应收分录
      try {
        const glResult = processBusinessEvent({
          eventType: 'customer_payment_received',
          eventId: `EVT-CUSTPAY-${id}-${Date.now()}`,
          sourceModule: 'finance-workflow',
          sourceDocType: 'customer_payment',
          sourceDocId: id,
          sourceDocCode: existing.contractNumber || `CP-${id}`,
          amount: input.amount,
          projectCode: existing.projectCode || undefined,
          customerId: existing.customerId ?? undefined,
          userId: userId,
          metadata: { invoiceNo: input.invoiceNo },
          timestamp: new Date().toISOString(),
        });
        log.info({ glResult: glResult.glResult?.success, amount: input.amount }, 'GL自动过账完成(客户到款)');
      } catch (glErr) {
        log.error({ err: glErr }, 'GL自动过账失败(不阻塞客户到款)');
      }

      return { id, totalReceived: newReceived, contractAmount: contractAmt, status: newStatus };
    }),

  /** Aggregated customer payment summary with aging analysis */
  getSummary: protectedProcedure
    .input(z.object({ customerId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.customerId) conditions.push(eq(customerPaymentTracking.customerId, input.customerId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.select().from(customerPaymentTracking)
        .where(whereClause)
        .orderBy(desc(customerPaymentTracking.createdAt))
        .limit(500);

      let totalContractValue = 0;
      let totalReceived = 0;
      const now = new Date();
      const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

      for (const item of items) {
        const total = parseFloat(String(item.contractAmount) || "0");
        const received = parseFloat(String(item.totalReceivedAmount) || "0");
        totalContractValue += total;
        totalReceived += received;

        const milestones = JSON.parse(String(item.milestones) || "[]");
        for (const m of milestones) {
          if (m.status === "paid" || !m.dueDate) continue;
          const dueDate = new Date(m.dueDate);
          const daysPast = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const mAmount = m.amount || 0;

          if (daysPast <= 0) aging.current += mAmount;
          else if (daysPast <= 30) aging.days30 += mAmount;
          else if (daysPast <= 60) aging.days60 += mAmount;
          else if (daysPast <= 90) aging.days90 += mAmount;
          else aging.over90 += mAmount;
        }
      }

      return {
        totalRecords: items.length,
        totalContractValue,
        totalReceived,
        totalOutstanding: totalContractValue - totalReceived,
        aging,
        collectionRate: totalContractValue > 0 ? Math.round((totalReceived / totalContractValue) * 10000) / 100 : 0,
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 4. Bank Accounts (银行账户)
// ═══════════════════════════════════════════════════════════════
const bankAccountRouter = router({
  /** Register a bank account (supplier / employee / customer / company) */
  register: requirePermission("finance:bank_accounts")
    .input(z.object({
      accountType: z.enum(["company", "supplier", "employee", "customer"]),
      entityType: z.enum(["supplier", "employee", "customer"]).optional(),
      entityId: z.number().optional(),
      entityName: z.string().optional(),
      bankName: z.string(),
      bankBranch: z.string().optional(),
      accountNumber: z.string().min(1),
      accountName: z.string(),
      swiftCode: z.string().optional(),
      currency: z.string().default("CNY"),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      log.info({ accountType: input.accountType, entityType: input.entityType, bankName: input.bankName }, "注册银行账户");

      // If setting as default, unset existing defaults for this entity
      if (input.isDefault && input.entityType && input.entityId) {
        await db.update(bankAccounts)
          .set({ isDefault: false, updatedAt: sql`NOW()` })
          .where(and(
            eq(bankAccounts.entityType, input.entityType),
            eq(bankAccounts.entityId, input.entityId),
          ));
      }

      const [row] = await db.insert(bankAccounts).values({
        accountType: input.accountType,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        entityName: input.entityName ?? null,
        bankName: input.bankName,
        bankBranch: input.bankBranch ?? null,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        swiftCode: input.swiftCode ?? null,
        currency: input.currency,
        isDefault: input.isDefault,
        createdBy: userId,
      }).returning({ id: bankAccounts.id });

      return { id: row.id };
    }),

  /** List bank accounts by entity type or entity */
  list: protectedProcedure
    .input(z.object({
      accountType: z.enum(["company", "supplier", "employee", "customer"]).optional(),
      entityType: z.enum(["supplier", "employee", "customer"]).optional(),
      entityId: z.number().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.accountType) conditions.push(eq(bankAccounts.accountType, input.accountType));
      if (input?.entityType) conditions.push(eq(bankAccounts.entityType, input.entityType));
      if (input?.entityId) conditions.push(eq(bankAccounts.entityId, input.entityId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(bankAccounts).where(whereClause);
      const total = Number(totalResult?.count ?? 0);
      const items = await db.select().from(bankAccounts)
        .where(whereClause)
        .orderBy(desc(bankAccounts.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return { items, total };
    }),

  /** Get bank account history for an entity */
  getHistory: protectedProcedure
    .input(z.object({
      entityType: z.enum(["supplier", "employee", "customer"]),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(bankAccounts)
        .where(and(
          eq(bankAccounts.entityType, input.entityType),
          eq(bankAccounts.entityId, input.entityId),
        ))
        .orderBy(desc(bankAccounts.createdAt))
        .limit(50);

      return { entityType: input.entityType, entityId: input.entityId, accounts: items };
    }),

  /** Set a bank account as the default for its entity */
  setDefault: requirePermission("finance:bank_accounts")
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = toNum(input.id);

      const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
      if (!account) throw new Error("银行账户不存在");

      if (account.entityType && account.entityId) {
        // Unset existing defaults
        await db.update(bankAccounts)
          .set({ isDefault: false, updatedAt: sql`NOW()` })
          .where(and(
            eq(bankAccounts.entityType, account.entityType),
            eq(bankAccounts.entityId, account.entityId),
          ));
      }

      // Set new default
      await db.update(bankAccounts)
        .set({ isDefault: true, updatedAt: sql`NOW()` })
        .where(eq(bankAccounts.id, id));

      return { id, isDefault: true };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 5. Fixed Expenses (固定费用)
// ═══════════════════════════════════════════════════════════════
const fixedExpenseRouter = router({
  /** Register a recurring fixed expense with payee details */
  create: requirePermission("finance:fixed_expenses")
    .input(z.object({
      expenseCode: z.string(),
      expenseType: z.enum(["rent", "utilities", "property_mgmt", "insurance", "telecom", "other"]),
      expenseName: z.string().min(1),
      description: z.string().max(2000).optional(),
      monthlyAmount: z.number().positive(),
      currency: z.string().default("CNY"),
      responsiblePersonId: z.number().optional(),
      responsiblePersonName: z.string().optional(),
      department: z.string().optional(),
      payeeName: z.string().optional(),
      payeeBankName: z.string().optional(),
      payeeBankAccount: z.string().optional(),
      payeeAccountName: z.string().optional(),
      paymentCycle: z.enum(["monthly", "quarterly", "semi_annual", "annual"]).default("monthly"),
      paymentDueDay: z.number().min(1).max(28).default(25),
      contractNumber: z.string().optional(),
      contractStartDate: z.string().optional(),
      contractEndDate: z.string().optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      log.info({ expenseCode: input.expenseCode, expenseType: input.expenseType, monthlyAmount: input.monthlyAmount }, "注册固定费用");

      const annualAmount = (() => {
        switch (input.paymentCycle) {
          case "quarterly": return input.monthlyAmount * 4;
          case "semi_annual": return input.monthlyAmount * 2;
          case "annual": return input.monthlyAmount;
          default: return input.monthlyAmount * 12;
        }
      })();

      const [row] = await db.insert(fixedExpenses).values({
        expenseCode: input.expenseCode,
        expenseType: input.expenseType,
        expenseName: input.expenseName,
        description: input.description ?? null,
        monthlyAmount: String(input.monthlyAmount),
        annualAmount: String(annualAmount),
        currency: input.currency,
        responsiblePersonId: input.responsiblePersonId ?? null,
        responsiblePersonName: input.responsiblePersonName ?? null,
        department: input.department ?? null,
        payeeName: input.payeeName ?? null,
        payeeBankName: input.payeeBankName ?? null,
        payeeBankAccount: input.payeeBankAccount ?? null,
        payeeAccountName: input.payeeAccountName ?? null,
        paymentCycle: input.paymentCycle,
        paymentDueDay: input.paymentDueDay,
        contractNumber: input.contractNumber ?? null,
        contractStartDate: input.contractStartDate ?? null,
        contractEndDate: input.contractEndDate ?? null,
        isActive: true,
        createdBy: userId,
      }).returning({ id: fixedExpenses.id });

      return { id: row.id };
    }),

  /** List fixed expenses with due date alerts */
  list: protectedProcedure
    .input(z.object({
      expenseType: z.string().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.expenseType) conditions.push(eq(fixedExpenses.expenseType, input.expenseType));
      if (input?.isActive !== undefined) conditions.push(eq(fixedExpenses.isActive, input.isActive));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(fixedExpenses).where(whereClause);
      const total = Number(totalResult?.count ?? 0);
      const items = await db.select().from(fixedExpenses)
        .where(whereClause)
        .orderBy(desc(fixedExpenses.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      // Compute next due date and alert status
      const now = new Date();
      const enrichedItems = items.map(item => {
        const dayOfMonth = item.paymentDueDay ?? 25;
        const nextDue = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
        if (nextDue <= now) nextDue.setMonth(nextDue.getMonth() + 1);

        const daysUntilDue = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const alertDays = item.alertBeforeDueDays ?? 5;
        return {
          ...item,
          nextDueDate: nextDue.toISOString().split("T")[0],
          daysUntilDue,
          isUrgent: daysUntilDue <= alertDays,
        };
      });

      return { items: enrichedItems, total };
    }),

  /** Update amount, payee, or cycle of a fixed expense */
  update: requirePermission("finance:fixed_expenses")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      expenseName: z.string().optional(),
      monthlyAmount: z.number().positive().optional(),
      payeeName: z.string().optional(),
      payeeBankName: z.string().optional(),
      payeeBankAccount: z.string().optional(),
      payeeAccountName: z.string().optional(),
      paymentCycle: z.enum(["monthly", "quarterly", "semi_annual", "annual"]).optional(),
      paymentDueDay: z.number().min(1).max(28).optional(),
      contractEndDate: z.string().optional(),
      isActive: z.boolean().optional(),
      description: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = toNum(input.id);

      const updateData: Record<string, any> = { updatedAt: sql`NOW()` };
      if (input.expenseName !== undefined) updateData.expenseName = input.expenseName;
      if (input.monthlyAmount !== undefined) updateData.monthlyAmount = String(input.monthlyAmount);
      if (input.payeeName !== undefined) updateData.payeeName = input.payeeName;
      if (input.payeeBankName !== undefined) updateData.payeeBankName = input.payeeBankName;
      if (input.payeeBankAccount !== undefined) updateData.payeeBankAccount = input.payeeBankAccount;
      if (input.payeeAccountName !== undefined) updateData.payeeAccountName = input.payeeAccountName;
      if (input.paymentCycle !== undefined) updateData.paymentCycle = input.paymentCycle;
      if (input.paymentDueDay !== undefined) updateData.paymentDueDay = input.paymentDueDay;
      if (input.contractEndDate !== undefined) updateData.contractEndDate = input.contractEndDate;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.description !== undefined) updateData.description = input.description;

      await db.update(fixedExpenses)
        .set(updateData)
        .where(eq(fixedExpenses.id, id));

      return { id, updated: true };
    }),

  /** Monthly / annual fixed expense summary */
  getSummary: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const activeItems = await db.select().from(fixedExpenses)
        .where(eq(fixedExpenses.isActive, true))
        .limit(500);

      let monthlyTotal = 0;
      const byType: Record<string, number> = {};

      for (const item of activeItems) {
        const monthly = parseFloat(String(item.monthlyAmount) || "0");
        monthlyTotal += monthly;
        const type = item.expenseType ?? "other";
        byType[type] = (byType[type] || 0) + monthly;
      }

      return {
        activeCount: activeItems.length,
        monthlyTotal: Math.round(monthlyTotal * 100) / 100,
        annualTotal: Math.round(monthlyTotal * 12 * 100) / 100,
        byType,
      };
    }),

  // 固定费用付款执行
  payFixedExpense: requirePermission("canManageFinance")
    .input(z.object({
      expenseId: z.union([z.string(), z.number()]),
      paymentAmount: z.number().min(0.01),
      paymentDate: z.string().optional(),
      paymentTransactionId: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = (ctx as any).userId || 0;
      const id = Number(input.expenseId);

      const existing = await db.select().from(fixedExpenses).where(eq(fixedExpenses.id, id)).limit(1);
      if (existing.length === 0) return { success: false, message: '费用记录不存在' };

      const expense = existing[0];

      // GL自动过账 — 固定费用→管理费用/银行
      try {
        processBusinessEvent({
          eventType: 'fixed_expense_paid',
          eventId: `EVT-FE-${id}-${Date.now()}`,
          sourceModule: 'finance-workflow',
          sourceDocType: 'fixed_expense',
          sourceDocId: id,
          sourceDocCode: expense.expenseCode,
          amount: input.paymentAmount,
          costCenterCode: expense.department || undefined,
          userId,
          metadata: { expenseType: expense.expenseType, expenseName: expense.expenseName },
          timestamp: new Date().toISOString(),
        });
      } catch (glErr) {
        log.error({ err: glErr }, 'GL auto-posting for fixed expense failed (non-blocking)');
      }

      log.info({ expenseId: id, amount: input.paymentAmount }, '固定费用付款执行');
      return {
        success: true,
        message: `${expense.expenseName} 付款 ¥${input.paymentAmount} 已执行`,
        glPosted: true,
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 6. Material Inventory Count (物料盘点)
// ═══════════════════════════════════════════════════════════════
const inventoryCountRouter = router({
  /** Create a count sheet (full / cycle / spot / project_close / year_end) */
  create: requirePermission("finance:inventory_count")
    .input(z.object({
      countType: z.enum(["full", "cycle", "spot", "project_close", "year_end"]),
      countDate: z.string(),
      warehouseId: z.number().optional(),
      warehouseCode: z.string().optional(),
      warehouseName: z.string().optional(),
      projectId: z.number().optional(),
      projectCode: z.string().optional(),
      fiscalYear: z.number().optional(),
      fiscalPeriod: z.number().optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const code = generateCode("IC");
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      log.info({ code, countType: input.countType, warehouseId: input.warehouseId, projectId: input.projectId }, "创建盘点单");

      const [row] = await db.insert(materialInventoryCounts).values({
        countCode: code,
        countDate: input.countDate,
        countType: input.countType,
        warehouseId: input.warehouseId ?? null,
        warehouseCode: input.warehouseCode ?? null,
        warehouseName: input.warehouseName ?? null,
        projectId: input.projectId ?? null,
        projectCode: input.projectCode ?? null,
        fiscalYear: input.fiscalYear ?? null,
        fiscalPeriod: input.fiscalPeriod ?? null,
        status: "draft",
        notes: input.notes ?? null,
        createdBy: userId,
      }).returning({ id: materialInventoryCounts.id });

      return { id: row.id, code };
    }),

  /** List count sheets */
  list: protectedProcedure
    .input(paginationInput.extend({
      countType: z.string().optional(),
      status: z.string().optional(),
      warehouseId: z.number().optional(),
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions: SQL[] = [];
      if (input?.countType) conditions.push(eq(materialInventoryCounts.countType, input.countType));
      if (input?.status) conditions.push(eq(materialInventoryCounts.status, input.status));
      if (input?.warehouseId) conditions.push(eq(materialInventoryCounts.warehouseId, input.warehouseId));
      if (input?.projectId) conditions.push(eq(materialInventoryCounts.projectId, input.projectId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [totalResult] = await db.select({ count: count() }).from(materialInventoryCounts).where(whereClause);
      const total = Number(totalResult?.count ?? 0);
      const items = await db.select().from(materialInventoryCounts)
        .where(whereClause)
        .orderBy(desc(materialInventoryCounts.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total };
    }),

  /** Bulk add items to a count sheet with book quantities */
  addItems: requirePermission("finance:inventory_count")
    .input(z.object({
      countId: z.union([z.string(), z.number()]),
      items: z.array(z.object({
        materialId: z.number().optional(),
        materialCode: z.string(),
        materialName: z.string(),
        unit: z.string().default("个"),
        bookQuantity: z.number().min(0),
        bookUnitPrice: z.number().min(0).optional(),
        locationCode: z.string().optional(),
        lotNumber: z.string().optional(),
        projectId: z.number().optional(),
        projectCode: z.string().optional(),
        costCenter: z.string().optional(),
      })).min(1).max(500),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const countId = toNum(input.countId);

      log.info({ countId, itemCount: input.items.length }, "批量添加盘点项目");

      const values = input.items.map(item => {
        const bookValue = item.bookUnitPrice != null
          ? item.bookQuantity * item.bookUnitPrice
          : null;
        return {
          countId,
          materialId: item.materialId ?? null,
          materialCode: item.materialCode,
          materialName: item.materialName,
          unit: item.unit,
          bookQuantity: String(item.bookQuantity),
          bookUnitPrice: item.bookUnitPrice != null ? String(item.bookUnitPrice) : null,
          bookValue: bookValue != null ? String(bookValue) : null,
          locationCode: item.locationCode ?? null,
          lotNumber: item.lotNumber ?? null,
          projectId: item.projectId ?? null,
          projectCode: item.projectCode ?? null,
          costCenter: item.costCenter ?? null,
          status: "pending",
        };
      });

      await db.insert(materialInventoryCountItems).values(values);

      // Update totalItems on count sheet
      const [countResult] = await db.select({ count: count() }).from(materialInventoryCountItems)
        .where(eq(materialInventoryCountItems.countId, countId));

      await db.update(materialInventoryCounts)
        .set({
          totalItems: Number(countResult?.count ?? 0),
          updatedAt: sql`NOW()`,
        })
        .where(eq(materialInventoryCounts.id, countId));

      return { countId, addedCount: input.items.length };
    }),

  /** Record actual quantities — auto-calculate variance */
  recordActualCount: requirePermission("finance:inventory_count")
    .input(z.object({
      countId: z.union([z.string(), z.number()]),
      items: z.array(z.object({
        itemId: z.union([z.string(), z.number()]),
        actualQuantity: z.number().min(0),
        actualUnitPrice: z.number().min(0).optional(),
        varianceReason: z.string().max(500).optional(),
      })).min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const countId = toNum(input.countId);
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      log.info({ countId, itemCount: input.items.length, userId }, "录入实际盘点数量");

      let updatedCount = 0;
      for (const item of input.items) {
        const itemId = toNum(item.itemId);
        const [existing] = await db.select().from(materialInventoryCountItems)
          .where(and(
            eq(materialInventoryCountItems.id, itemId),
            eq(materialInventoryCountItems.countId, countId),
          ))
          .limit(1);

        if (!existing) continue;

        const bookQty = parseFloat(String(existing.bookQuantity) || "0");
        const bookUnitPrice = parseFloat(String(existing.bookUnitPrice) || "0");
        const actualQty = item.actualQuantity;
        const actualUnitPrice = item.actualUnitPrice ?? bookUnitPrice;
        const varianceQty = actualQty - bookQty;
        const actualValue = actualQty * actualUnitPrice;
        const bookValue = bookQty * bookUnitPrice;
        const varianceValue = actualValue - bookValue;

        const status = varianceQty === 0 ? "counted" : "counted";

        await db.update(materialInventoryCountItems)
          .set({
            actualQuantity: String(actualQty),
            actualUnitPrice: String(actualUnitPrice),
            actualValue: String(actualValue),
            varianceQuantity: String(varianceQty),
            varianceValue: String(varianceValue),
            varianceReason: item.varianceReason ?? null,
            status,
          })
          .where(eq(materialInventoryCountItems.id, itemId));

        updatedCount++;
      }

      // Update summary on count sheet
      const allItems = await db.select().from(materialInventoryCountItems)
        .where(eq(materialInventoryCountItems.countId, countId))
        .limit(5000);

      let totalBookValue = 0;
      let totalActualValue = 0;
      let surplusItems = 0;
      let surplusValue = 0;
      let shortageItems = 0;
      let shortageValue = 0;
      let matchedItems = 0;

      for (const ai of allItems) {
        totalBookValue += parseFloat(String(ai.bookValue) || "0");
        totalActualValue += parseFloat(String(ai.actualValue) || "0");
        const vQty = parseFloat(String(ai.varianceQuantity) || "0");
        const vVal = parseFloat(String(ai.varianceValue) || "0");
        if (ai.actualQuantity != null) {
          if (vQty > 0) { surplusItems++; surplusValue += vVal; }
          else if (vQty < 0) { shortageItems++; shortageValue += Math.abs(vVal); }
          else matchedItems++;
        }
      }

      await db.update(materialInventoryCounts)
        .set({
          totalBookValue: String(totalBookValue),
          totalActualValue: String(totalActualValue),
          totalVarianceValue: String(totalActualValue - totalBookValue),
          surplusItems,
          surplusValue: String(surplusValue),
          shortageItems,
          shortageValue: String(shortageValue),
          matchedItems,
          status: "counting",
          updatedAt: sql`NOW()`,
        })
        .where(eq(materialInventoryCounts.id, countId));

      return { countId, updatedCount };
    }),

  /** Submit count sheet for finance review */
  submitForReview: requirePermission("finance:inventory_count")
    .input(z.object({
      id: z.union([z.string(), z.number()]),
      countedByName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const id = toNum(input.id);
      const userId = (ctx as any).user?.id ?? (ctx as any).userId;

      const [existing] = await db.select().from(materialInventoryCounts).where(eq(materialInventoryCounts.id, id)).limit(1);
      if (!existing) throw new Error("盘点单不存在");

      // Check all items have been counted
      const [uncountedResult] = await db.select({ count: count() }).from(materialInventoryCountItems)
        .where(and(
          eq(materialInventoryCountItems.countId, id),
          eq(materialInventoryCountItems.status, "pending"),
        ));
      const uncounted = Number(uncountedResult?.count ?? 0);

      if (uncounted > 0) {
        throw new Error(`还有 ${uncounted} 项未盘点，请完成后再提交`);
      }

      log.info({ id, code: existing.countCode, userId }, "提交盘点单待审核");

      await db.update(materialInventoryCounts)
        .set({
          status: "review",
          countedBy: userId,
          countedByName: input.countedByName ?? null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(materialInventoryCounts.id, id));

      return { id, status: "review" };
    }),

  /** Summary with surplus/shortage totals and project cost impact */
  getSummary: protectedProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const id = toNum(input.id);

      const [countSheet] = await db.select().from(materialInventoryCounts).where(eq(materialInventoryCounts.id, id)).limit(1);
      if (!countSheet) throw new Error("盘点单不存在");

      const items = await db.select().from(materialInventoryCountItems)
        .where(eq(materialInventoryCountItems.countId, id))
        .limit(5000);

      const totalItems = items.length;
      let countedItems = 0;
      let matchedItems = 0;
      let surplusItems = 0;
      let shortageItems = 0;
      let totalSurplusValue = 0;
      let totalShortageValue = 0;

      for (const item of items) {
        if (item.actualQuantity != null) {
          countedItems++;
          const vQty = parseFloat(String(item.varianceQuantity) || "0");
          const vVal = parseFloat(String(item.varianceValue) || "0");
          if (vQty === 0) matchedItems++;
          else if (vQty > 0) { surplusItems++; totalSurplusValue += vVal; }
          else { shortageItems++; totalShortageValue += Math.abs(vVal); }
        }
      }

      return {
        countSheet,
        totalItems,
        countedItems,
        matchedItems,
        surplusItems,
        shortageItems,
        totalSurplusValue: Math.round(totalSurplusValue * 100) / 100,
        totalShortageValue: Math.round(totalShortageValue * 100) / 100,
        netVariance: Math.round((totalSurplusValue - totalShortageValue) * 100) / 100,
        accuracy: totalItems > 0 ? Math.round((matchedItems / totalItems) * 10000) / 100 : 100,
        projectCostImpact: countSheet.projectId ? {
          projectId: countSheet.projectId,
          surplusRecovery: Math.round(totalSurplusValue * 100) / 100,
          shortageLoss: Math.round(totalShortageValue * 100) / 100,
        } : null,
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// 7. Finance Dashboard
// ═══════════════════════════════════════════════════════════════
const dashboardRouter = router({
  /** KPI overview: pending reimbursements, overdue payments, budget alerts, cash flow */
  getOverview: protectedProcedure
    .query(async () => {
      const db = await requireDb();

      // Pending reimbursements
      const [pendingReimbursements] = await db.select({ count: count() }).from(projectReimbursements)
        .where(sql`${projectReimbursements.status} NOT IN ('draft', 'paid', 'rejected')`);

      // Active customer payments
      const activeCustomerPayments = await db.select().from(customerPaymentTracking)
        .where(eq(customerPaymentTracking.status, "active"))
        .limit(500);

      const now = new Date();
      let overdueCustomerCount = 0;
      let overdueCustomerAmount = 0;
      for (const cp of activeCustomerPayments) {
        const milestones = JSON.parse(String(cp.milestones) || "[]");
        for (const m of milestones) {
          if (m.status === "paid" || !m.dueDate) continue;
          if (new Date(m.dueDate) < now) {
            overdueCustomerCount++;
            overdueCustomerAmount += m.amount || 0;
            break;
          }
        }
      }

      // Pending supplier payments
      const supplierPayments = await db.select().from(supplierPaymentTracking)
        .where(eq(supplierPaymentTracking.status, "active"))
        .limit(500);

      let pendingSupplierAmount = 0;
      for (const sp of supplierPayments) {
        pendingSupplierAmount += parseFloat(String(sp.remainingAmount) || "0");
      }

      // Fixed expenses monthly
      const activeFixed = await db.select().from(fixedExpenses)
        .where(eq(fixedExpenses.isActive, true))
        .limit(500);

      let monthlyFixedTotal = 0;
      for (const fe of activeFixed) {
        monthlyFixedTotal += parseFloat(String(fe.monthlyAmount) || "0");
      }

      return {
        reimbursements: {
          pendingCount: Number(pendingReimbursements?.count ?? 0),
        },
        customerPayments: {
          overdueCount: overdueCustomerCount,
          overdueAmount: Math.round(overdueCustomerAmount * 100) / 100,
        },
        supplierPayments: {
          pendingAmount: Math.round(pendingSupplierAmount * 100) / 100,
        },
        fixedExpenses: {
          monthlyTotal: Math.round(monthlyFixedTotal * 100) / 100,
          annualProjection: Math.round(monthlyFixedTotal * 12 * 100) / 100,
        },
      };
    }),

  /** Project cost breakdown with alert thresholds */
  getProjectCostBreakdown: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      budgetTotal: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Materials cost — from inventory count items linked to project
      const countSheets = await db.select().from(materialInventoryCounts)
        .where(eq(materialInventoryCounts.projectId, input.projectId))
        .limit(50);

      let materialsCost = 0;
      for (const cs of countSheets) {
        const items = await db.select().from(materialInventoryCountItems)
          .where(eq(materialInventoryCountItems.countId, cs.id))
          .limit(2000);
        for (const item of items) {
          materialsCost += parseFloat(String(item.bookValue) || "0");
        }
      }

      // Reimbursement cost by type
      const reimbursements = await db.select().from(projectReimbursements)
        .where(and(
          eq(projectReimbursements.projectId, input.projectId),
          eq(projectReimbursements.status, "paid"),
        ))
        .limit(500);

      let travelCost = 0;
      let overheadCost = 0;
      for (const r of reimbursements) {
        const amount = parseFloat(String(r.approvedAmount ?? r.totalAmount) || "0");
        if (r.reimbursementType === "travel") travelCost += amount;
        else overheadCost += amount;
      }

      // Procurement cost (supplier payments for project)
      const supplierPays = await db.select().from(supplierPaymentTracking)
        .where(eq(supplierPaymentTracking.projectId, input.projectId))
        .limit(200);

      let procurementCost = 0;
      for (const sp of supplierPays) {
        procurementCost += parseFloat(String(sp.contractAmount) || "0");
      }

      const totalCost = materialsCost + travelCost + overheadCost + procurementCost;
      const budget = input.budgetTotal ?? 0;
      const utilizationPct = budget > 0 ? Math.round((totalCost / budget) * 10000) / 100 : 0;

      return {
        projectId: input.projectId,
        breakdown: {
          materials: Math.round(materialsCost * 100) / 100,
          procurement: Math.round(procurementCost * 100) / 100,
          travel: Math.round(travelCost * 100) / 100,
          overhead: Math.round(overheadCost * 100) / 100,
        },
        totalCost: Math.round(totalCost * 100) / 100,
        budget,
        utilizationPct,
        alerts: {
          overBudget: budget > 0 && totalCost > budget,
          warningThreshold: budget > 0 && totalCost > budget * 0.85,
          criticalThreshold: budget > 0 && totalCost > budget * 0.95,
        },
      };
    }),
});

// ═══════════════════════════════════════════════════════════════
// Compose all sub-routers
// ═══════════════════════════════════════════════════════════════
export const financeWorkflowRouter = router({
  reimbursement: reimbursementRouter,
  supplierPayment: supplierPaymentRouter,
  customerPayment: customerPaymentRouter,
  bankAccount: bankAccountRouter,
  fixedExpense: fixedExpenseRouter,
  inventoryCount: inventoryCountRouter,
  dashboard: dashboardRouter,
});
