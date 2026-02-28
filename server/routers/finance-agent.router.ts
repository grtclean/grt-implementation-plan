/**
 * Finance Agent Router — AI 费用审核拦截引擎 tRPC procedures
 *
 * 9 procedures: submitForReview, getReviewStatus, getAiDiagnosticReport,
 * overrideAndApprove, listPendingReviews, getBudgetContext, getPolicyRules,
 * recentReviews, seedDemo
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { expenseClaims, aiTasks } from "../../drizzle/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { submitTask } from "../services/task-worker.service";
import {
  POLICY_RULES,
  fetchBuBudgetContext,
  type AiDiagnosticReport,
} from "../services/finance-agent.service";

export const financeAgentRouter = router({
  /**
   * submitForReview — Submit an expense claim for AI review
   * Sets status to ai_reviewing, creates async task
   */
  submitForReview: protectedProcedure
    .input(z.object({ claimId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // Verify claim exists and is in submitted status
      const [claim] = await db
        .select()
        .from(expenseClaims)
        .where(eq(expenseClaims.id, input.claimId));

      if (!claim) throw new Error("报销单不存在");
      if (claim.status !== "submitted" && claim.status !== "draft") {
        throw new Error(`报销单状态为 ${claim.status}, 无法提交AI审核`);
      }

      // Set status to ai_reviewing
      await db
        .update(expenseClaims)
        .set({ status: "ai_reviewing", updatedAt: new Date().toISOString() })
        .where(eq(expenseClaims.id, input.claimId));

      // Create async task
      const { taskId } = await submitTask(
        "FINANCE_AGENT_REVIEW",
        { claimId: input.claimId } as Record<string, unknown>,
        ctx.user?.name ?? "system",
      );

      return { taskId, claimId: input.claimId, status: "ai_reviewing" as const };
    }),

  /**
   * getReviewStatus — Poll by taskId or claimId for review progress
   */
  getReviewStatus: protectedProcedure
    .input(z.object({
      taskId: z.number().optional(),
      claimId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // If taskId provided, check ai_tasks
      if (input.taskId) {
        const [task] = await db
          .select()
          .from(aiTasks)
          .where(eq(aiTasks.id, input.taskId));

        if (!task) return { taskStatus: "not_found" as const, report: null, score: null };

        // If completed, also fetch the claim result
        if (task.status === "completed" && task.resultData) {
          const report = task.resultData as unknown as AiDiagnosticReport;
          return { taskStatus: "completed" as const, report, score: report.score };
        }
        if (task.status === "failed") {
          return { taskStatus: "failed" as const, report: null, score: null, error: task.errorMessage };
        }
        return { taskStatus: task.status as "pending" | "processing", report: null, score: null };
      }

      // If claimId provided, check expense_claims directly
      if (input.claimId) {
        const [claim] = await db
          .select()
          .from(expenseClaims)
          .where(eq(expenseClaims.id, input.claimId));

        if (!claim) return { taskStatus: "not_found" as const, report: null, score: null };

        if (claim.aiAuditResult) {
          const report = claim.aiAuditResult as unknown as AiDiagnosticReport;
          return {
            taskStatus: "completed" as const,
            report,
            score: claim.aiAuditScore,
            claimStatus: claim.status,
          };
        }

        if (claim.status === "ai_reviewing") {
          return { taskStatus: "processing" as const, report: null, score: null };
        }

        return { taskStatus: "completed" as const, report: null, score: null, claimStatus: claim.status };
      }

      throw new Error("需要提供 taskId 或 claimId");
    }),

  /**
   * getAiDiagnosticReport — Full diagnostic report from claim
   */
  getAiDiagnosticReport: protectedProcedure
    .input(z.object({ claimId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [claim] = await db
        .select()
        .from(expenseClaims)
        .where(eq(expenseClaims.id, input.claimId));

      if (!claim) throw new Error("报销单不存在");
      if (!claim.aiAuditResult) return null;

      return {
        report: claim.aiAuditResult as unknown as AiDiagnosticReport,
        score: claim.aiAuditScore,
        claimCode: claim.claimCode,
        claimTitle: claim.claimTitle,
        totalAmount: claim.totalAmount,
        status: claim.status,
      };
    }),

  /**
   * overrideAndApprove — Manager override intercept with justification
   */
  overrideAndApprove: protectedProcedure
    .input(z.object({
      claimId: z.number(),
      justification: z.string().min(10, "理由至少10个字符"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [claim] = await db
        .select()
        .from(expenseClaims)
        .where(eq(expenseClaims.id, input.claimId));

      if (!claim) throw new Error("报销单不存在");
      if (claim.status !== "ai_reviewing") {
        throw new Error("仅拦截中的报销单可以申请例外审批");
      }

      // Update existing report with override info
      const existingReport = (claim.aiAuditResult as unknown as AiDiagnosticReport) || {};
      const updatedReport = {
        ...existingReport,
        overridden: true,
        overriddenBy: ctx.user?.name ?? "unknown",
        overrideJustification: input.justification,
        overriddenAt: new Date().toISOString(),
      };

      await db
        .update(expenseClaims)
        .set({
          status: "pending_review",
          aiAuditResult: updatedReport,
          reviewNotes: `[例外审批] ${input.justification}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(expenseClaims.id, input.claimId));

      return { success: true, newStatus: "pending_review" };
    }),

  /**
   * listPendingReviews — Paginated claims in ai_reviewing or pending_review
   */
  listPendingReviews: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const offset = (input.page - 1) * input.pageSize;

      const rows = await db
        .select({
          id: expenseClaims.id,
          claimCode: expenseClaims.claimCode,
          claimTitle: expenseClaims.claimTitle,
          claimType: expenseClaims.claimType,
          totalAmount: expenseClaims.totalAmount,
          status: expenseClaims.status,
          aiAuditScore: expenseClaims.aiAuditScore,
          submittedAt: expenseClaims.submittedAt,
          createdAt: expenseClaims.createdAt,
        })
        .from(expenseClaims)
        .where(inArray(expenseClaims.status, ["ai_reviewing", "pending_review"]))
        .orderBy(desc(expenseClaims.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(expenseClaims)
        .where(inArray(expenseClaims.status, ["ai_reviewing", "pending_review"]));

      return { rows, total: Number(count), page: input.page, pageSize: input.pageSize };
    }),

  /**
   * getBudgetContext — BU expense ratio + quarter target/actual
   */
  getBudgetContext: protectedProcedure
    .input(z.object({ departmentId: z.number().nullable().default(null) }))
    .query(async ({ input }) => {
      return fetchBuBudgetContext(input.departmentId);
    }),

  /**
   * getPolicyRules — Return 5 hardcoded policy rules
   */
  getPolicyRules: protectedProcedure.query(() => {
    return POLICY_RULES;
  }),

  /**
   * recentReviews — Last 20 claims with AI results
   */
  recentReviews: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({
        id: expenseClaims.id,
        claimCode: expenseClaims.claimCode,
        claimTitle: expenseClaims.claimTitle,
        claimType: expenseClaims.claimType,
        totalAmount: expenseClaims.totalAmount,
        status: expenseClaims.status,
        aiAuditScore: expenseClaims.aiAuditScore,
        aiAuditResult: expenseClaims.aiAuditResult,
        submittedAt: expenseClaims.submittedAt,
        createdAt: expenseClaims.createdAt,
        updatedAt: expenseClaims.updatedAt,
      })
      .from(expenseClaims)
      .where(sql`${expenseClaims.aiAuditResult} IS NOT NULL`)
      .orderBy(desc(expenseClaims.updatedAt))
      .limit(20);

    return rows.map(r => ({
      ...r,
      decision: (r.aiAuditResult as unknown as AiDiagnosticReport)?.decision ?? null,
    }));
  }),

  /**
   * seedDemo — Create 5 demo claims with varied AI results
   */
  seedDemo: protectedProcedure.mutation(async () => {
    const db = await requireDb();
    const now = new Date().toISOString();

    const demoClaims = [
      {
        claimCode: `FA-DEMO-001`,
        submitterId: 1,
        claimType: "travel" as const,
        claimTitle: "华东区客户拜访差旅费",
        description: "上海/苏州客户拜访3天差旅",
        totalAmount: "8500.00",
        status: "pending_review" as const,
        aiAuditScore: 85,
        aiAuditResult: {
          decision: "pass", score: 85, buContext: { buName: "事业一部", quarterTarget: 12000000, quarterActual: 9000000, completionPct: 75, currentExpenseRatio: 3.2, redLineRatio: 5, projectedRatio: 3.8 },
          diagnosis: "费用申请合规, 事业一部费用率3.2%处于健康范围。", recommendations: ["建议保留完整行程单据"], policyViolations: [], source: "algorithmic" as const,
        },
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        claimCode: `FA-DEMO-002`,
        submitterId: 2,
        claimType: "equipment" as const,
        claimTitle: "测试设备采购",
        description: "清洗机检测探头采购",
        totalAmount: "62000.00",
        status: "ai_reviewing" as const,
        aiAuditScore: 35,
        aiAuditResult: {
          decision: "intercept", score: 35, interceptReason: "费用率达8.5%, 超出5%红线; 单笔超5万未预审批",
          buContext: { buName: "事业二部", quarterTarget: 10000000, quarterActual: 7000000, completionPct: 70, currentExpenseRatio: 7.2, redLineRatio: 5, projectedRatio: 8.5 },
          diagnosis: "当前事业二部Q1产值仅完成70%, 费用率8.5%已超出管控红线。经营能力(D)测评L2.0, 建议加强费用管控意识。",
          recommendations: ["请先提供订单转化证明补充附件", "将此申请拆分为两期提交", "设备采购建议走集中采购流程"],
          policyViolations: [
            { rule: "R001", detail: "费用率达8.5%, 超出5%红线", severity: "critical" as const },
            { rule: "R002", detail: "单笔金额62,000元, 超出5万元预审批线", severity: "critical" as const },
          ],
          source: "algorithmic" as const,
        },
        requiresManualReview: 1,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        claimCode: `FA-DEMO-003`,
        submitterId: 3,
        claimType: "meal" as const,
        claimTitle: "团队季度聚餐",
        description: "研发团队Q1季度聚餐 12人",
        totalAmount: "3600.00",
        status: "pending_review" as const,
        aiAuditScore: 68,
        aiAuditResult: {
          decision: "warn", score: 68, buContext: { buName: "事业三部", quarterTarget: 8000000, quarterActual: 6500000, completionPct: 81, currentExpenseRatio: 4.3, redLineRatio: 5, projectedRatio: 4.8 },
          diagnosis: "费用申请基本合规, 但事业三部费用率4.8%接近5%红线, 请注意后续费用控制。",
          recommendations: ["费用率接近红线, 建议控制后续支出", "餐费总额偏高, 建议控制在200元/人/天"],
          policyViolations: [{ rule: "R004", detail: "餐费总额3,600元, 可能超出200元/人/天标准", severity: "warning" as const }],
          source: "algorithmic" as const,
        },
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        claimCode: `FA-DEMO-004`,
        submitterId: 1,
        claimType: "daily" as const,
        claimTitle: "办公用品采购",
        description: "Q1办公文具及耗材",
        totalAmount: "1200.00",
        status: "ai_reviewing" as const,
        aiAuditScore: null,
        aiAuditResult: null,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        claimCode: `FA-DEMO-005`,
        submitterId: 2,
        claimType: "travel" as const,
        claimTitle: "海外展会出差",
        description: "德国汉诺威工业展参展费用",
        totalAmount: "45000.00",
        status: "pending_review" as const,
        aiAuditScore: 72,
        aiAuditResult: {
          decision: "warn", score: 72, interceptReason: undefined,
          buContext: { buName: "事业一部", quarterTarget: 12000000, quarterActual: 9000000, completionPct: 75, currentExpenseRatio: 3.2, redLineRatio: 5, projectedRatio: 4.1 },
          diagnosis: "差旅费用较高但在合理范围, 建议保留完整票据。",
          recommendations: ["差旅费用较高, 建议选择经济型出行方案", "保留完整的展会邀请函及参展证明"],
          policyViolations: [{ rule: "R003", detail: "差旅报销45,000元, 超出2万元标准", severity: "warning" as const }],
          source: "algorithmic" as const,
          overridden: true, overriddenBy: "张经理", overrideJustification: "海外展会为战略客户拓展需要, 已获BU总经理口头批准",
        },
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const inserted = [];
    for (const claim of demoClaims) {
      try {
        const [row] = await db.insert(expenseClaims).values(claim).returning({ id: expenseClaims.id });
        inserted.push(row);
      } catch (err) {
        console.warn("[Finance Agent] Seed insert error:", err);
      }
    }

    return { inserted: inserted.length, ids: inserted.map(r => r.id) };
  }),
});
