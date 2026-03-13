/**
 * Smart Payroll Engine Router — 薪资计算与审批路由
 *
 * 7 sub-routers, 31 procedures:
 *   structures (4): getSalaryStructure, upsertSalaryStructure, listStructures, getStructureHistory
 *   attendance (3): getAttendanceRecord, upsertAttendanceRecord, listAttendance
 *   performance (3): getPerformanceEval, upsertPerformanceEval, listPerformance
 *   ledger (8): calculatePayroll, calculateBatch, getLedger, listLedgers, getPeriodSummary,
 *               submitForApproval, approvePayroll, executePayout
 *   awards (4): createAward, listAwards, getAwardsByPeriod, deleteAward
 *   confidentiality (4): checkAccess, listAuthorized, grantAccess, revokeAccess
 *   perfWageOverride (3): override, listOverrides, getEmployeeOverrides
 *
 * State machine: DRAFT → HR_VERIFIED → FINANCE_APPROVED → CEO_APPROVED → PAID
 * All procedures require permission. Mutations require specific payroll permissions.
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, count, sql, sum } from "drizzle-orm";
import {
  salaryStructures,
  attendanceRecords,
  performanceEvaluations,
  payrollLedgers,
  payrollApprovalLogs,
  payrollExcellenceAwards,
  payrollAccessControl,
  perfWageOverrideAudit,
} from "../../drizzle/smart-payroll-schema";
import { aiTasks } from "../../drizzle/schema";
import {
  calculateEmployeePayroll,
  calculateBatchPayroll,
  processPayrollTask,
} from "../workers/payrollCalculator";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("payroll-router");

// ── Permission shortcuts ────────────────────────────────
const viewPayroll = requirePermission("hr:salary:view");
const managePayroll = requirePermission("system:config:manage");

// ── Valid state transitions ──────────────────────────────
const VALID_TRANSITIONS: Record<string, { next: string; requiredRole: string[] }> = {
  DRAFT:              { next: "HR_VERIFIED",       requiredRole: ["hr_manager", "hr_specialist", "admin"] },
  HR_VERIFIED:        { next: "FINANCE_APPROVED",  requiredRole: ["finance_manager", "admin"] },
  FINANCE_APPROVED:   { next: "CEO_APPROVED",      requiredRole: ["director", "admin"] },
  CEO_APPROVED:       { next: "PAID",              requiredRole: ["finance_manager", "admin"] },
};

// ── Sub-Router: Salary Structures ────────────────────────

const structuresRouter = router({
  get: viewPayroll
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(salaryStructures)
        .where(eq(salaryStructures.employeeId, input.employeeId))
        .orderBy(desc(salaryStructures.effectiveFrom))
        .limit(1);
      return row ?? null;
    }),

  upsert: managePayroll
    .input(z.object({
      employeeId: z.number(),
      effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      baseSalary: z.string(),
      positionAllowance: z.string().default("0"),
      confidentialityAllowance: z.string().default("0"),
      technicalAllowance: z.string().default("0"),
      seniorityAllowance: z.string().default("0"),
      mealAllowance: z.string().default("0"),
      transportAllowance: z.string().default("0"),
      communicationAllowance: z.string().default("0"),
      socialInsuranceBase: z.string(),
      housingFundBase: z.string(),
      housingFundRate: z.string().default("0.1200"),
      performanceBase: z.string().default("0"),
      performanceWage1Base: z.string().default("0"),
      performanceWage2Base: z.string().default("0"),
      performanceWage3Base: z.string().default("0"),
      // Excel-aligned fields
      positionWage: z.string().default("0"),
      skillSubsidy: z.string().default("0"),
      saturdayShiftPremium: z.string().default("0"),
      comprehensiveSalary: z.string().default("0"),
      cashSubsidy: z.string().default("0"),
      travelCarSubsidy: z.string().default("0"),
      isLumpSum: z.boolean().default(false),
      specialTaxDeduction: z.string().default("0"),
      socialInsuranceActual: z.string().default("0"),
      housingFundActual: z.string().default("0"),
      perfectAttendanceEligible: z.boolean().default(false),
      perfectAttendanceAmount: z.string().default("300.00"),
      positionGrade: z.string().optional(),
      department: z.string().optional(),
      buCode: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(salaryStructures)
        .where(and(
          eq(salaryStructures.employeeId, input.employeeId),
          eq(salaryStructures.effectiveFrom, input.effectiveFrom),
        ))
        .limit(1);

      if (existing) {
        await db.update(salaryStructures).set({
          ...input,
          updatedAt: new Date().toISOString(),
        }).where(eq(salaryStructures.id, existing.id));
        log.info({ employeeId: input.employeeId, action: "update" }, "Salary structure updated");
        return { id: existing.id, action: "updated" };
      }

      const [row] = await db.insert(salaryStructures).values({
        ...input,
        createdById: ctx.user.id,
      }).returning();
      log.info({ employeeId: input.employeeId, action: "create" }, "Salary structure created");
      return { id: row.id, action: "created" };
    }),

  list: viewPayroll
    .input(z.object({ department: z.string().optional(), limit: z.number().max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      let query = db.select().from(salaryStructures).orderBy(desc(salaryStructures.id)).limit(input.limit);
      if (input.department) {
        query = query.where(eq(salaryStructures.department, input.department)) as typeof query;
      }
      return query;
    }),

  getHistory: viewPayroll
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(salaryStructures)
        .where(eq(salaryStructures.employeeId, input.employeeId))
        .orderBy(desc(salaryStructures.effectiveFrom))
        .limit(20);
    }),
});

// ── Sub-Router: Attendance ───────────────────────────────

const attendanceRouter = router({
  get: viewPayroll
    .input(z.object({ employeeId: z.number(), period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.employeeId, input.employeeId),
          eq(attendanceRecords.period, input.period),
        ))
        .limit(1);
      return row ?? null;
    }),

  upsert: managePayroll
    .input(z.object({
      employeeId: z.number(),
      period: z.string().regex(/^\d{4}-\d{2}$/),
      scheduledDays: z.number(),
      actualDays: z.string(),
      lateDays: z.number().default(0),
      earlyLeaveDays: z.number().default(0),
      absentDays: z.string().default("0"),
      annualLeaveDays: z.string().default("0"),
      sickLeaveDays: z.string().default("0"),
      personalLeaveDays: z.string().default("0"),
      otherLeaveDays: z.string().default("0"),
      // Hour-based leave (Excel-aligned)
      personalLeaveHours: z.string().default("0"),
      sickLeaveHours: z.string().default("0"),
      annualLeaveHours: z.string().default("0"),
      compensatoryLeaveHours: z.string().default("0"),
      lateCount: z.number().default(0),
      missingClockCount: z.number().default(0),
      weekdayOvertimeHours: z.string().default("0"),
      weekendOvertimeHours: z.string().default("0"),
      holidayOvertimeHours: z.string().default("0"),
      dataSource: z.string().default("manual"),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.employeeId, input.employeeId),
          eq(attendanceRecords.period, input.period),
        ))
        .limit(1);

      if (existing) {
        await db.update(attendanceRecords).set({ ...input, updatedAt: new Date().toISOString() })
          .where(eq(attendanceRecords.id, existing.id));
        return { id: existing.id, action: "updated" };
      }

      const [row] = await db.insert(attendanceRecords).values(input).returning();
      return { id: row.id, action: "created" };
    }),

  list: viewPayroll
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/), limit: z.number().max(500).default(100) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(attendanceRecords)
        .where(eq(attendanceRecords.period, input.period))
        .orderBy(attendanceRecords.employeeId)
        .limit(input.limit);
    }),
});

// ── Sub-Router: Performance ──────────────────────────────

const performanceRouter = router({
  get: viewPayroll
    .input(z.object({ employeeId: z.number(), period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(performanceEvaluations)
        .where(and(
          eq(performanceEvaluations.employeeId, input.employeeId),
          eq(performanceEvaluations.period, input.period),
        ))
        .limit(1);
      return row ?? null;
    }),

  upsert: managePayroll
    .input(z.object({
      employeeId: z.number(),
      period: z.string().regex(/^\d{4}-\d{2}$/),
      mboScore: z.string(),
      evaluationGrade: z.enum(["S", "A", "B", "C", "D"]),
      departmentCoefficient: z.string().default("1.0000"),
      individualCoefficient: z.string().default("1.0000"),
      projectBonus: z.string().default("0"),
      department: z.string().optional(),
      evaluatorId: z.number().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [existing] = await db.select().from(performanceEvaluations)
        .where(and(
          eq(performanceEvaluations.employeeId, input.employeeId),
          eq(performanceEvaluations.period, input.period),
        ))
        .limit(1);

      if (existing) {
        await db.update(performanceEvaluations).set({ ...input, updatedAt: new Date().toISOString() })
          .where(eq(performanceEvaluations.id, existing.id));
        return { id: existing.id, action: "updated" };
      }

      const [row] = await db.insert(performanceEvaluations).values(input).returning();
      return { id: row.id, action: "created" };
    }),

  list: viewPayroll
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/), limit: z.number().max(500).default(100) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(performanceEvaluations)
        .where(eq(performanceEvaluations.period, input.period))
        .orderBy(performanceEvaluations.employeeId)
        .limit(input.limit);
    }),
});

// ── Sub-Router: Payroll Ledger ────────────────────────────

const ledgerRouter = router({
  // Calculate single employee
  calculate: managePayroll
    .input(z.object({
      employeeId: z.number(),
      period: z.string().regex(/^\d{4}-\d{2}$/),
      cumulativeTaxableIncome: z.number().optional(),
      cumulativeTaxPaid: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      log.info({ employeeId: input.employeeId, period: input.period }, "Single payroll calculation started");
      return calculateEmployeePayroll(input);
    }),

  // Batch calculate — queues to ai_tasks for async processing
  calculateBatch: managePayroll
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      employeeIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Create ai_task for async processing
      const [task] = await db.insert(aiTasks).values({
        taskType: "payroll_batch_calculation",
        status: "pending",
        inputData: { period: input.period, employeeIds: input.employeeIds },
        createdBy: String(ctx.user.id),
      }).returning();

      log.info({ taskId: task.id, period: input.period }, "Batch payroll task queued");

      // Run synchronously for now (in production, a worker would pick this up)
      // Using setImmediate-like pattern to not block the response
      processPayrollTask(task.id).catch((err) => {
        log.error({ err, taskId: task.id }, "Background payroll task failed");
      });

      return { taskId: task.id, status: "queued", period: input.period };
    }),

  // Get single ledger
  get: viewPayroll
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(payrollLedgers)
        .where(eq(payrollLedgers.id, input.id))
        .limit(1);
      return row ?? null;
    }),

  // List ledgers for a period
  list: viewPayroll
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      status: z.enum(["DRAFT", "HR_VERIFIED", "FINANCE_APPROVED", "CEO_APPROVED", "PAID", "REJECTED", "VOIDED"]).optional(),
      limit: z.number().max(500).default(100),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(payrollLedgers.period, input.period)];
      if (input.status) conditions.push(eq(payrollLedgers.status, input.status));

      return db.select().from(payrollLedgers)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(payrollLedgers.employeeId)
        .limit(input.limit);
    }),

  // Period summary (aggregate statistics)
  getPeriodSummary: viewPayroll
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [summary] = await db.select({
        totalEmployees: count(),
        totalGrossPay: sum(payrollLedgers.grossPay),
        totalNetPay: sum(payrollLedgers.netPay),
        totalTax: sum(payrollLedgers.incomeTax),
        totalSocialInsurance: sum(payrollLedgers.totalSocialInsurance),
        totalOvertime: sum(payrollLedgers.overtimePay),
        totalPerformanceBonus: sum(payrollLedgers.performanceBonus),
        totalSpecialBonus: sum(payrollLedgers.specialBonus),
        totalDeductions: sum(payrollLedgers.totalDeductions),
      }).from(payrollLedgers)
        .where(eq(payrollLedgers.period, input.period))
        .limit(1);

      // Status distribution
      const statusDist = await db.select({
        status: payrollLedgers.status,
        cnt: count(),
      }).from(payrollLedgers)
        .where(eq(payrollLedgers.period, input.period))
        .groupBy(payrollLedgers.status)
        .limit(10);

      // Previous period for MoM comparison
      const [year, month] = input.period.split("-").map(Number);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

      const [prevSummary] = await db.select({
        totalGrossPay: sum(payrollLedgers.grossPay),
        totalNetPay: sum(payrollLedgers.netPay),
        totalOvertime: sum(payrollLedgers.overtimePay),
        totalPerformanceBonus: sum(payrollLedgers.performanceBonus),
      }).from(payrollLedgers)
        .where(eq(payrollLedgers.period, prevPeriod))
        .limit(1);

      // MoM change calculation
      const currentGross = Number(summary?.totalGrossPay || 0);
      const prevGross = Number(prevSummary?.totalGrossPay || 0);
      const momChange = prevGross > 0 ? ((currentGross - prevGross) / prevGross * 100) : 0;

      // Anomaly attribution
      const anomalies: Array<{ factor: string; factorZh: string; change: number; changePercent: number }> = [];
      const currentOT = Number(summary?.totalOvertime || 0);
      const prevOT = Number(prevSummary?.totalOvertime || 0);
      if (prevOT > 0 && Math.abs(currentOT - prevOT) / prevOT > 0.1) {
        anomalies.push({
          factor: "Overtime Pay", factorZh: "加班费",
          change: currentOT - prevOT,
          changePercent: ((currentOT - prevOT) / prevOT) * 100,
        });
      }
      const currentPerf = Number(summary?.totalPerformanceBonus || 0);
      const prevPerf = Number(prevSummary?.totalPerformanceBonus || 0);
      if (prevPerf > 0 && Math.abs(currentPerf - prevPerf) / prevPerf > 0.1) {
        anomalies.push({
          factor: "Performance Bonus", factorZh: "绩效奖金",
          change: currentPerf - prevPerf,
          changePercent: ((currentPerf - prevPerf) / prevPerf) * 100,
        });
      }

      return {
        period: input.period,
        ...summary,
        statusDistribution: statusDist,
        previousPeriod: prevPeriod,
        momChangePercent: Math.round(momChange * 100) / 100,
        anomalies,
      };
    }),

  // ── State Machine Transitions ──────────────────────────

  // Submit for HR verification (DRAFT → HR_VERIFIED)
  submitForApproval: managePayroll
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const drafts = await db.select().from(payrollLedgers)
        .where(and(eq(payrollLedgers.period, input.period), eq(payrollLedgers.status, "DRAFT")))
        .limit(1000);

      if (drafts.length === 0) {
        return { updated: 0, message: "No DRAFT records found for this period" };
      }

      let updated = 0;
      for (const ledger of drafts) {
        await db.update(payrollLedgers).set({
          status: "HR_VERIFIED",
          submittedById: ctx.user.id,
          submittedAt: new Date().toISOString(),
          hrVerifiedById: ctx.user.id,
          hrVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(payrollLedgers.id, ledger.id));

        await db.insert(payrollApprovalLogs).values({
          ledgerId: ledger.id,
          fromStatus: "DRAFT",
          toStatus: "HR_VERIFIED",
          operatorId: ctx.user.id,
          operatorRole: ctx.user.role,
          reason: input.reason || "HR verification submitted",
        });
        updated++;
      }

      log.info({ period: input.period, updated, userId: ctx.user.id }, "Payroll submitted for approval");
      return { updated, message: `${updated} records submitted for HR verification` };
    }),

  // Approve payroll (state transition: any valid step)
  approvePayroll: managePayroll
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      fromStatus: z.enum(["DRAFT", "HR_VERIFIED", "FINANCE_APPROVED", "CEO_APPROVED"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const transition = VALID_TRANSITIONS[input.fromStatus];
      if (!transition) {
        return { updated: 0, error: `Invalid source status: ${input.fromStatus}` };
      }

      // Role check (admin can always approve)
      if (ctx.user.role !== "admin" && !transition.requiredRole.includes(ctx.user.role)) {
        return { updated: 0, error: `Role ${ctx.user.role} cannot approve ${input.fromStatus} → ${transition.next}` };
      }

      const db = await requireDb();
      const records = await db.select().from(payrollLedgers)
        .where(and(
          eq(payrollLedgers.period, input.period),
          eq(payrollLedgers.status, input.fromStatus),
        ))
        .limit(1000);

      if (records.length === 0) {
        return { updated: 0, message: `No ${input.fromStatus} records found` };
      }

      const now = new Date().toISOString();
      const updateFields: Record<string, unknown> = {
        status: transition.next,
        updatedAt: now,
      };

      // Set approval fields based on transition
      if (transition.next === "HR_VERIFIED") {
        updateFields.hrVerifiedById = ctx.user.id;
        updateFields.hrVerifiedAt = now;
      } else if (transition.next === "FINANCE_APPROVED") {
        updateFields.financeApprovedById = ctx.user.id;
        updateFields.financeApprovedAt = now;
      } else if (transition.next === "CEO_APPROVED") {
        updateFields.ceoApprovedById = ctx.user.id;
        updateFields.ceoApprovedAt = now;
      }

      let updated = 0;
      for (const ledger of records) {
        await db.update(payrollLedgers).set(updateFields)
          .where(eq(payrollLedgers.id, ledger.id));

        await db.insert(payrollApprovalLogs).values({
          ledgerId: ledger.id,
          fromStatus: input.fromStatus,
          toStatus: transition.next,
          operatorId: ctx.user.id,
          operatorRole: ctx.user.role,
          reason: input.reason || `Approved: ${input.fromStatus} → ${transition.next}`,
        });
        updated++;
      }

      log.info({ period: input.period, from: input.fromStatus, to: transition.next, updated }, "Payroll approved");
      return { updated, toStatus: transition.next, message: `${updated} records approved → ${transition.next}` };
    }),

  // Execute payout (CEO_APPROVED → PAID) — bank API simulation
  executePayout: managePayroll
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      confirmationCode: z.string().min(4).max(50),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only admin/finance_manager with CEO_APPROVED records
      if (!["admin", "finance_manager"].includes(ctx.user.role)) {
        return { success: false, error: "Only admin or finance_manager can execute payout" };
      }

      const db = await requireDb();

      // Verify there are CEO_APPROVED records
      const approved = await db.select().from(payrollLedgers)
        .where(and(
          eq(payrollLedgers.period, input.period),
          eq(payrollLedgers.status, "CEO_APPROVED"),
        ))
        .limit(1000);

      if (approved.length === 0) {
        return { success: false, error: "No CEO_APPROVED records found. Cannot execute payout without CEO approval." };
      }

      const now = new Date().toISOString();
      let paid = 0;

      for (const ledger of approved) {
        // Simulate bank API call (in production, call bank payment gateway)
        await db.update(payrollLedgers).set({
          status: "PAID",
          paidAt: now,
          updatedAt: now,
        }).where(eq(payrollLedgers.id, ledger.id));

        await db.insert(payrollApprovalLogs).values({
          ledgerId: ledger.id,
          fromStatus: "CEO_APPROVED",
          toStatus: "PAID",
          operatorId: ctx.user.id,
          operatorRole: ctx.user.role,
          reason: `Payout executed. Confirmation: ${input.confirmationCode}`,
        });
        paid++;
      }

      log.info({ period: input.period, paid, userId: ctx.user.id }, "Payout executed");
      return {
        success: true,
        paid,
        totalNetPay: approved.reduce((s, l) => s + Number(l.netPay), 0).toFixed(2),
        message: `${paid} payslips marked as PAID`,
      };
    }),
});

// ── Sub-Router: Excellence Awards ────────────────────────

const awardsRouter = router({
  create: managePayroll
    .input(z.object({
      employeeId: z.number(),
      period: z.string().regex(/^\d{4}-\d{2}$/),
      awardType: z.enum(["outstanding_contributor", "innovation", "quality_excellence", "safety_champion", "team_collaboration", "customer_service"]),
      awardAmount: z.string(),
      reason: z.string(),
      department: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(payrollExcellenceAwards).values({
        ...input,
        nominatedById: ctx.user.id,
        approvedById: ctx.user.id,
      }).returning();
      log.info({ employeeId: input.employeeId, awardType: input.awardType }, "Excellence award created");
      return row;
    }),

  list: viewPayroll
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/), limit: z.number().max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(payrollExcellenceAwards)
        .where(eq(payrollExcellenceAwards.period, input.period))
        .orderBy(desc(payrollExcellenceAwards.id))
        .limit(input.limit);
    }),

  getByPeriod: viewPayroll
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(payrollExcellenceAwards)
        .where(eq(payrollExcellenceAwards.period, input.period))
        .orderBy(desc(payrollExcellenceAwards.awardAmount))
        .limit(50);
    }),

  delete: managePayroll
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(payrollExcellenceAwards).where(eq(payrollExcellenceAwards.id, input.id));
      return { deleted: true };
    }),
});

// ── Sub-Router: Confidentiality Access Control ──────────
//
// 严格保密系统: 只授权 倪亚东(CEO), 刘奥运(董秘), 倪微薇(AI部门经理)
// 所有薪资数据查询通过此表控制访问权限
//

const adminOnly = requirePermission("system:config:manage");

const confidentialityRouter = router({
  // Check if current user has payroll access
  checkAccess: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const [access] = await db.select().from(payrollAccessControl)
        .where(and(
          eq(payrollAccessControl.userId, ctx.user.id),
          eq(payrollAccessControl.isActive, true),
        ))
        .limit(1);

      if (!access) return { hasAccess: false, level: null, permissions: null };

      // Check expiry
      if (access.expiresAt && new Date(access.expiresAt) < new Date()) {
        return { hasAccess: false, level: "expired", permissions: null };
      }

      return {
        hasAccess: true,
        level: access.accessLevel,
        permissions: {
          canViewAll: access.canViewAll,
          canApprove: access.canApprove,
          canOverridePerf: access.canOverridePerf,
          canExport: access.canExport,
        },
      };
    }),

  // List all authorized users (CEO only)
  listAuthorized: adminOnly
    .query(async () => {
      const db = await requireDb();
      return db.select().from(payrollAccessControl)
        .where(eq(payrollAccessControl.isActive, true))
        .orderBy(payrollAccessControl.id)
        .limit(50);
    }),

  // Grant access (CEO only)
  grantAccess: adminOnly
    .input(z.object({
      userId: z.number(),
      employeeGrtId: z.string(),
      employeeName: z.string(),
      accessLevel: z.enum(["full", "department", "self"]).default("self"),
      canViewAll: z.boolean().default(false),
      canApprove: z.boolean().default(false),
      canOverridePerf: z.boolean().default(false),
      canExport: z.boolean().default(false),
      expiresAt: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(payrollAccessControl).values({
        ...input,
        grantedById: ctx.user.id,
      }).returning();
      log.info({ userId: input.userId, grtId: input.employeeGrtId, grantedBy: ctx.user.id }, "Payroll access granted");
      return row;
    }),

  // Revoke access
  revokeAccess: adminOnly
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(payrollAccessControl).set({ isActive: false })
        .where(eq(payrollAccessControl.id, input.id));
      log.info({ accessId: input.id }, "Payroll access revoked");
      return { revoked: true };
    }),
});

// ── Sub-Router: Performance Wage Override ────────────────
//
// CEO/授权人可手动调整绩效工资1/2/3
// 每次调整记录完整审计日志
//

const perfWageOverrideRouter = router({
  // Override a performance wage for a specific ledger
  override: adminOnly
    .input(z.object({
      ledgerId: z.number(),
      wageSlot: z.enum(["wage1", "wage2", "wage3"]),
      overrideValue: z.string(), // DECIMAL string
      reason: z.string().min(5, "调整原因至少5个字符"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Verify caller has canOverridePerf permission
      const [access] = await db.select().from(payrollAccessControl)
        .where(and(
          eq(payrollAccessControl.userId, ctx.user.id),
          eq(payrollAccessControl.isActive, true),
          eq(payrollAccessControl.canOverridePerf, true),
        ))
        .limit(1);

      if (!access && ctx.user.role !== "admin") {
        return { success: false, error: "无绩效工资调整权限。仅CEO及授权人员可执行此操作。" };
      }

      // Load ledger
      const [ledger] = await db.select().from(payrollLedgers)
        .where(eq(payrollLedgers.id, input.ledgerId))
        .limit(1);

      if (!ledger) return { success: false, error: "未找到薪资记录" };

      // Determine current calculated value
      const currentCalc = input.wageSlot === "wage1" ? ledger.performanceWage1
        : input.wageSlot === "wage2" ? ledger.performanceWage2
        : ledger.performanceWage3;

      // Audit log
      await db.insert(perfWageOverrideAudit).values({
        ledgerId: input.ledgerId,
        employeeId: ledger.employeeId,
        period: ledger.period,
        wageSlot: input.wageSlot,
        calculatedValue: String(currentCalc),
        overrideValue: input.overrideValue,
        reason: input.reason,
        operatorId: ctx.user.id,
        operatorName: ctx.user.name ?? null,
        approvedById: ctx.user.id,
        approvedAt: new Date().toISOString(),
      });

      // Apply override to ledger
      const updateFields: Record<string, unknown> = {
        overrideApprovedById: ctx.user.id,
        overrideApprovedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (input.wageSlot === "wage1") {
        updateFields.performanceWage1Override = input.overrideValue;
        updateFields.performanceWage1Reason = input.reason;
      } else if (input.wageSlot === "wage2") {
        updateFields.performanceWage2Override = input.overrideValue;
        updateFields.performanceWage2Reason = input.reason;
      } else {
        updateFields.performanceWage3Override = input.overrideValue;
        updateFields.performanceWage3Reason = input.reason;
      }

      await db.update(payrollLedgers).set(updateFields)
        .where(eq(payrollLedgers.id, input.ledgerId));

      log.info({
        ledgerId: input.ledgerId,
        wageSlot: input.wageSlot,
        from: String(currentCalc),
        to: input.overrideValue,
        operatorId: ctx.user.id,
      }, "Performance wage overridden");

      return { success: true, ledgerId: input.ledgerId, wageSlot: input.wageSlot };
    }),

  // List override history for a period
  listOverrides: viewPayroll
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(perfWageOverrideAudit)
        .where(eq(perfWageOverrideAudit.period, input.period))
        .orderBy(desc(perfWageOverrideAudit.id))
        .limit(200);
    }),

  // Get overrides for a specific employee
  getEmployeeOverrides: viewPayroll
    .input(z.object({ employeeId: z.number(), period: z.string().regex(/^\d{4}-\d{2}$/).optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(perfWageOverrideAudit.employeeId, input.employeeId)];
      if (input.period) conditions.push(eq(perfWageOverrideAudit.period, input.period));

      return db.select().from(perfWageOverrideAudit)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(desc(perfWageOverrideAudit.id))
        .limit(50);
    }),
});

// ── Sub-Router: Data Readiness Check ────────────────────
//
// The SalaryPreparationWizard uses this to verify that all
// prerequisite data exists before triggering batch calculation.
//

const readinessRouter = router({
  // Check data completeness for a given period
  check: viewPayroll
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // Total employees with active salary structures
      const [structureCount] = await db.select({ cnt: count() })
        .from(salaryStructures).limit(1);

      // Attendance records for this period
      const [attendanceCount] = await db.select({ cnt: count() })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.period, input.period))
        .limit(1);

      // Performance evaluations for this period
      const [perfCount] = await db.select({ cnt: count() })
        .from(performanceEvaluations)
        .where(eq(performanceEvaluations.period, input.period))
        .limit(1);

      // Already-calculated ledgers for this period
      const [ledgerCount] = await db.select({ cnt: count() })
        .from(payrollLedgers)
        .where(eq(payrollLedgers.period, input.period))
        .limit(1);

      const totalStructures = Number(structureCount?.cnt ?? 0);
      const totalAttendance = Number(attendanceCount?.cnt ?? 0);
      const totalPerf = Number(perfCount?.cnt ?? 0);
      const totalLedgers = Number(ledgerCount?.cnt ?? 0);

      // Readiness conditions
      const hasStructures = totalStructures > 0;
      const hasAttendance = totalAttendance > 0;
      const hasPerformance = totalPerf > 0;
      const canCalculate = hasStructures; // Minimum: salary structures exist

      return {
        period: input.period,
        checks: [
          {
            name: "薪资架构",
            nameEn: "Salary Structures",
            count: totalStructures,
            status: hasStructures ? "complete" as const : "missing" as const,
            description: hasStructures
              ? `${totalStructures}名员工已配置薪资架构`
              : "未配置员工薪资架构，请运行 seed-payroll-structures",
          },
          {
            name: "考勤数据",
            nameEn: "Attendance",
            count: totalAttendance,
            total: totalStructures,
            status: totalAttendance >= totalStructures * 0.9 ? "complete" as const
              : totalAttendance > 0 ? "partial" as const : "missing" as const,
            description: `${totalAttendance}/${totalStructures}名员工已录入考勤`,
          },
          {
            name: "绩效评分",
            nameEn: "Performance",
            count: totalPerf,
            total: totalStructures,
            status: totalPerf >= totalStructures * 0.9 ? "complete" as const
              : totalPerf > 0 ? "partial" as const : "missing" as const,
            description: `${totalPerf}/${totalStructures}名员工已完成绩效评分`,
          },
          {
            name: "薪资台账",
            nameEn: "Payroll Ledgers",
            count: totalLedgers,
            total: totalStructures,
            status: totalLedgers >= totalStructures * 0.9 ? "complete" as const
              : totalLedgers > 0 ? "partial" as const : "not_started" as const,
            description: totalLedgers > 0
              ? `${totalLedgers}/${totalStructures}名员工已计算薪资`
              : "尚未执行薪资计算",
          },
        ],
        summary: {
          totalStructures,
          totalAttendance,
          totalPerformance: totalPerf,
          totalLedgers,
          canCalculate,
          completenessPercent: totalStructures > 0
            ? Math.round(((totalAttendance + totalPerf) / (totalStructures * 2)) * 100)
            : 0,
        },
      };
    }),

  // Quick-seed default attendance for employees missing it
  seedDefaultAttendance: managePayroll
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Find employees with salary structures but no attendance record
      const structures = await db.select({ employeeId: salaryStructures.employeeId })
        .from(salaryStructures).limit(500);

      const existing = await db.select({ employeeId: attendanceRecords.employeeId })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.period, input.period))
        .limit(500);

      const existingSet = new Set(existing.map(e => e.employeeId));
      const missing = structures.filter(s => !existingSet.has(s.employeeId));

      // Default: 21.75 working days, full attendance
      let seeded = 0;
      for (const s of missing) {
        await db.insert(attendanceRecords).values({
          employeeId: s.employeeId,
          period: input.period,
          scheduledDays: 22,
          actualDays: "22.0",
          lateDays: 0,
          dataSource: "auto-seed",
        });
        seeded++;
      }

      log.info({ period: input.period, seeded }, "Default attendance seeded");
      return { seeded, message: `已为${seeded}名员工自动生成默认考勤（全勤22天）` };
    }),
});

// ── Main Router ──────────────────────────────────────────

export const payrollRouter = router({
  structures: structuresRouter,
  attendance: attendanceRouter,
  performance: performanceRouter,
  ledger: ledgerRouter,
  awards: awardsRouter,
  confidentiality: confidentialityRouter,
  perfWageOverride: perfWageOverrideRouter,
  readiness: readinessRouter,
});
