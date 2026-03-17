/**
 * Payroll Agent Router — 薪资通知智能代理
 *
 * 4 sub-routers, 11 procedures:
 *   orchestration (6): getStatus, calculate, run, calculateAndNotify, preview, history
 *   templates (2): getEmailTemplate, testEmail
 *   goals (2): generateGoals, batchGenerateGoals
 *   config (1): getCalcFormulas
 *
 * Orchestrates AI-powered payroll notifications:
 * - Generates per-employee performance summaries
 * - Composes salary notification emails with goals
 * - Supports dry-run preview before CEO approval
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, count } from "drizzle-orm";
import { payrollSandboxCycles } from "../../drizzle/payroll-sandbox-schema";
import { hrmEmployees } from "../../drizzle/schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("payroll-agent");

// ── Permission shortcuts ────────────────────────────────
const viewAgent = requirePermission("hr:salary:view");
const manageAgent = requirePermission("system:config:manage");

// ── Sub-Router: Orchestration ───────────────────────────

const orchestrationRouter = router({
  getStatus: viewAgent
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const { getAgentStatus } = await import("../services/payroll-agent.service");
      return getAgentStatus(input.cycleId);
    }),

  calculate: manageAgent
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const { executePayrollCalculation } = await import("../services/payroll-agent.service");
      log.info({ cycleId: input.cycleId }, "Agent triggering payroll calculation");
      return executePayrollCalculation(input.cycleId);
    }),

  run: manageAgent
    .input(
      z.object({
        cycleId: z.number(),
        dryRun: z.boolean().default(false),
        includeGoals: z.boolean().default(true),
        employeeFilter: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { orchestratePayrollNotifications } = await import(
        "../services/payroll-agent.service"
      );

      log.info(
        { cycleId: input.cycleId, dryRun: input.dryRun },
        "Starting payroll agent orchestration",
      );

      return orchestratePayrollNotifications(input.cycleId, {
        dryRun: input.dryRun,
        includeGoals: input.includeGoals,
        employeeFilter: input.employeeFilter,
      });
    }),

  calculateAndNotify: manageAgent
    .input(
      z.object({
        cycleId: z.number(),
        dryRun: z.boolean().default(true),
        includeGoals: z.boolean().default(true),
        employeeFilter: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { executePayrollCalculation, orchestratePayrollNotifications } =
        await import("../services/payroll-agent.service");

      // Step 1: Calculate
      const calcResult = await executePayrollCalculation(input.cycleId);
      log.info({ calcResult }, "Calculation complete, starting notifications");

      // Step 2: Notify
      const notifyResult = await orchestratePayrollNotifications(input.cycleId, {
        dryRun: input.dryRun,
        includeGoals: input.includeGoals,
        employeeFilter: input.employeeFilter,
      });

      return { calculation: calcResult, notification: notifyResult };
    }),

  preview: manageAgent
    .input(
      z.object({
        cycleId: z.number(),
        employeeName: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { generatePerformanceSummary, composeSalaryNotification } =
        await import("../services/payroll-agent.service");

      const perfSummary = await generatePerformanceSummary(
        input.cycleId,
        input.employeeName,
      );

      if (!perfSummary) {
        return {
          subject: null,
          html: null,
          perfSummary: null,
          error: `Employee not found in cycle`,
        };
      }

      const notification = await composeSalaryNotification(
        input.cycleId,
        input.employeeName,
        perfSummary,
      );

      return {
        subject: notification.subject,
        html: notification.html,
        perfSummary,
      };
    }),

  history: viewAgent
    .input(
      z.object({
        cycleId: z.number().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      // Query past orchestration runs from a simple log approach
      // We track runs via the payroll sandbox cycles that have been notified
      const query = db
        .select()
        .from(payrollSandboxCycles)
        .orderBy(desc(payrollSandboxCycles.id))
        .limit(Math.min(input.limit, 100));

      const rows = input.cycleId
        ? await db
            .select()
            .from(payrollSandboxCycles)
            .where(eq(payrollSandboxCycles.id, input.cycleId))
            .limit(1)
        : await query;

      return rows.map((r: any) => ({
        cycleId: r.id,
        period: r.period,
        status: r.status,
        name: r.name,
      }));
    }),
});

// ── Sub-Router: Templates ───────────────────────────────

const templateRouter = router({
  getEmailTemplate: viewAgent.query(async () => {
    return {
      sections: [
        {
          key: "header",
          label: "薪资通知标题",
          description: "Employee name + period",
        },
        {
          key: "salaryDetail",
          label: "薪资明细",
          description:
            "Base salary, position wage, performance wages, deductions, net pay",
        },
        {
          key: "perfSummary",
          label: "绩效总结",
          description:
            "AI-generated performance summary with strengths and improvement areas",
        },
        {
          key: "goals",
          label: "下期目标",
          description: "AI-suggested goals for next period",
        },
        {
          key: "footer",
          label: "页脚",
          description: "Confidentiality notice + contact info",
        },
      ],
      format: "html",
      supportedLanguages: ["zh-CN"],
    };
  }),

  testEmail: manageAgent
    .input(
      z.object({
        email: z.string().email(),
        cycleId: z.number(),
        employeeName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { generatePerformanceSummary, composeSalaryNotification } =
        await import("../services/payroll-agent.service");
      const { sendEmail } = await import("../services/email.service");

      const perfSummary = await generatePerformanceSummary(
        input.cycleId,
        input.employeeName,
      );

      const notification = await composeSalaryNotification(
        input.cycleId,
        input.employeeName,
        perfSummary as any,
      );

      await sendEmail({
        to: input.email,
        subject: notification.subject,
        html: notification.html,
      });

      log.info(
        { email: input.email, employee: input.employeeName },
        "Test payroll email sent",
      );

      return { sent: true, to: input.email, subject: notification.subject };
    }),
});

// ── Sub-Router: Goals ───────────────────────────────────

const goalsRouter = router({
  generateGoals: manageAgent
    .input(
      z.object({
        cycleId: z.number(),
        employeeName: z.string(),
        additionalContext: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { generatePerformanceSummary } = await import(
        "../services/payroll-agent.service"
      );

      const summary = await generatePerformanceSummary(
        input.cycleId,
        input.employeeName,
        input.additionalContext,
      );

      return {
        employeeName: input.employeeName,
        goals: summary?.goals ?? summary?.nextMonthGoals ?? [],
        perfScore: summary?.perfScore ?? null,
      };
    }),

  batchGenerateGoals: manageAgent
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ input }) => {
      const { generatePerformanceSummary } = await import(
        "../services/payroll-agent.service"
      );
      const db = await requireDb();

      const employees = await db
        .select({ name: hrmEmployees.name })
        .from(hrmEmployees)
        .limit(500);

      let generated = 0;
      let failed = 0;
      const results: Array<{ employeeName: string; goals: string[] }> = [];

      for (const emp of employees) {
        try {
          const summary = await generatePerformanceSummary(
            input.cycleId,
            emp.name,
          );
          if (summary?.goals?.length) {
            generated++;
            results.push({
              employeeName: emp.name,
              goals: summary.goals,
            });
          } else {
            failed++;
            results.push({ employeeName: emp.name, goals: [] });
          }
        } catch (err) {
          failed++;
          log.warn({ employee: emp.name, err }, "Goal generation failed");
          results.push({ employeeName: emp.name, goals: [] });
        }
      }

      return { generated, failed, results };
    }),
});

// ── Sub-Router: Config ──────────────────────────────────

const configRouter = router({
  getCalcFormulas: viewAgent.query(async () => {
    return {
      invariants: [
        { id: "I-1", desc: "货币精度: 内部用整数(分/cents)，DB边界转 DECIMAL(14,2)" },
        { id: "I-2", desc: "综合工资 = 基本工资 + 岗位工资 + 技能补贴 + 周六加班固定" },
        { id: "I-3", desc: "应发 = 综合工资 + 绩效调整 - 事假扣款 - 病假扣款 + 加班费 + 全勤奖 + 考核奖金" },
        { id: "I-4", desc: "实发 = 应发 + 其它收入 - 社保(个人) - 公积金(个人) - 个税" },
        { id: "I-5", desc: "包薪制员工(CEO/CFO): 应发 = 综合工资，无组件拆分" },
      ],
      formulas: [
        { id: "F-1", desc: "事假扣款 = 事假小时 × (基本工资 / 116)", source: "GRT内部制度" },
        { id: "F-2", desc: "病假扣款 = 病假小时 × (综合工资 / 应出勤天 / 8) × 0.1962", source: "上海市标准" },
        { id: "F-3", desc: "加班费 = 时薪 × 倍数 (平时1.5x, 周末2x, 节假日3x)", source: "《劳动法》第44条" },
        { id: "F-4", desc: "绩效工资1系数 = IF(score<75, 0, IF(score>avg2024+3 OR score>avg2025, 1, 0))", source: "GRT绩效制度" },
        { id: "F-5", desc: "绩效工资2系数 = IF(score>=avg2025, 1, IF(avg2025-score<=3, 0.5, 0))", source: "GRT绩效制度" },
        { id: "F-6", desc: "绩效工资3系数 = 手动(CEO审批), 默认0", source: "GRT绩效制度" },
        { id: "F-7", desc: "个人所得税: 累计预扣法 (7级超额累进税率)", source: "《个人所得税法》2019年修正" },
      ],
    };
  }),
});

// ── Export ───────────────────────────────────────────────

export const payrollAgentRouter = router({
  orchestration: orchestrationRouter,
  templates: templateRouter,
  goals: goalsRouter,
  config: configRouter,
});
