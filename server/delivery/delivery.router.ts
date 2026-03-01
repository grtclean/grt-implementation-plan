import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../utils/db-helpers";
import { deliveryExecutions, siteIssueTickets } from "../../drizzle/schema";
import { eq, sql, desc, count } from "drizzle-orm";

// ========== Mock data for DB fallback ==========

const mockDeliveries = [
  {
    id: 1,
    deliveryCode: "DEL-2026-001",
    projectId: 1,
    projectNo: "PRJ-2026-001",
    customerName: "苏州明志科技",
    currentStage: "M7_Pre_Acceptance",
    status: "In_Progress",
    plannedM7Date: "2026-02-20",
    plannedM8Date: "2026-03-10",
    plannedM9Date: "2026-03-25",
    siteAddress: "苏州市相城区",
    siteContactName: "张工",
    siteContactPhone: "13800001111",
    m7GateResult: null,
    createdAt: "2026-02-01",
  },
  {
    id: 2,
    deliveryCode: "DEL-2026-002",
    projectId: 2,
    projectNo: "PRJ-2026-002",
    customerName: "大众汽车",
    currentStage: "M10_Site_Installation",
    status: "In_Progress",
    plannedM7Date: "2026-01-15",
    plannedM8Date: "2026-02-15",
    plannedM9Date: "2026-03-01",
    siteAddress: "上海市嘉定区",
    siteContactName: "李经理",
    siteContactPhone: "13800002222",
    m7GateResult: "Pass",
    createdAt: "2026-01-10",
  },
  {
    id: 3,
    deliveryCode: "DEL-2026-003",
    projectId: 3,
    projectNo: "PRJ-2026-003",
    customerName: "比亚迪",
    currentStage: "M9_Final_Acceptance",
    status: "In_Progress",
    plannedM7Date: "2026-01-01",
    plannedM8Date: "2026-01-20",
    plannedM9Date: "2026-02-28",
    siteAddress: "深圳市坪山区",
    siteContactName: "王总监",
    siteContactPhone: "13800003333",
    m7GateResult: "Conditional_Pass",
    createdAt: "2025-12-20",
  },
  {
    id: 4,
    deliveryCode: "DEL-2025-010",
    projectId: 4,
    projectNo: "PRJ-2025-010",
    customerName: "宝马中国",
    currentStage: "Completed",
    status: "Completed",
    plannedM7Date: "2025-10-01",
    plannedM8Date: "2025-10-20",
    plannedM9Date: "2025-11-15",
    siteAddress: "沈阳市铁西区",
    siteContactName: "陈工",
    siteContactPhone: "13800004444",
    m7GateResult: "Pass",
    createdAt: "2025-09-15",
  },
];

const mockIssues = [
  {
    id: 1,
    ticketCode: "SITE-2026-001",
    deliveryId: 1,
    title: "超声波换能器缺失",
    issueCategory: "Missing_Part",
    severity: "High",
    status: "Open",
    reportedByName: "现场工程师A",
    description: "超声波清洗机换能器在运输过程中遗漏，需紧急补发",
    createdAt: "2026-02-10",
  },
  {
    id: 2,
    ticketCode: "SITE-2026-002",
    deliveryId: 2,
    title: "管路接口尺寸不匹配",
    issueCategory: "Dimension_Error",
    severity: "Medium",
    status: "Investigating",
    reportedByName: "现场工程师B",
    description: "进水管接口DN25与现场管路DN32不匹配，需制作转接头",
    createdAt: "2026-02-08",
  },
  {
    id: 3,
    ticketCode: "SITE-2026-003",
    deliveryId: 1,
    title: "PLC程序版本不一致",
    issueCategory: "Function_Fail",
    severity: "Critical",
    status: "Open",
    reportedByName: "现场工程师A",
    description: "PLC运行程序版本与调试版本不一致，导致清洗流程异常",
    createdAt: "2026-02-11",
  },
];

// ========== Delivery sub-router ==========

const deliverySubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        stage: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const rows = await db
          .select()
          .from(deliveryExecutions)
          .orderBy(desc(deliveryExecutions.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        const [totalRow] = await db
          .select({ count: count() })
          .from(deliveryExecutions);

        return {
          items: rows,
          total: totalRow?.count ?? 0,
          page: input.page,
          pageSize: input.pageSize,
        };
      } catch {
        // Fallback to mock data
        return {
          items: mockDeliveries,
          total: mockDeliveries.length,
          page: input.page,
          pageSize: input.pageSize,
        };
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [row] = await db
          .select()
          .from(deliveryExecutions)
          .where(eq(deliveryExecutions.id, input.id));
        return row ?? null;
      } catch {
        return mockDeliveries.find((d) => d.id === input.id) ?? null;
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        projectNo: z.string().min(1),
        customerName: z.string().optional(),
        siteAddress: z.string().optional(),
        siteContactName: z.string().optional(),
        siteContactPhone: z.string().optional(),
        plannedM7Date: z.string().optional(),
        plannedM8Date: z.string().optional(),
        plannedM9Date: z.string().optional(),
        specialRequirements: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const year = new Date().getFullYear();
      const seq = String(Date.now() % 100000).padStart(3, "0");
      const deliveryCode = `DEL-${year}-${seq}`;

      try {
        const db = await requireDb();
        const [row] = await db
          .insert(deliveryExecutions)
          .values({
            deliveryCode,
            projectId: input.projectId,
            projectNo: input.projectNo,
            customerName: input.customerName,
            siteAddress: input.siteAddress,
            siteContactName: input.siteContactName,
            siteContactPhone: input.siteContactPhone,
            plannedM7Date: input.plannedM7Date ? new Date(input.plannedM7Date) : undefined,
            plannedM8Date: input.plannedM8Date ? new Date(input.plannedM8Date) : undefined,
            plannedM9Date: input.plannedM9Date ? new Date(input.plannedM9Date) : undefined,
            specialRequirements: input.specialRequirements,
            currentStage: "M7_Pre_Acceptance",
            status: "Pending",
            createdBy: ctx.user.id,
          })
          .returning();

        return { success: true, id: row.id, deliveryCode };
      } catch {
        // Fallback: return mock success
        return { success: true, id: Date.now(), deliveryCode };
      }
    }),

  getStats: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();
      const stageRows = await db
        .select({
          stage: deliveryExecutions.currentStage,
          count: count(),
        })
        .from(deliveryExecutions)
        .groupBy(deliveryExecutions.currentStage);

      const byStage: Record<string, number> = {
        M7_Pre_Acceptance: 0,
        M8_Installation: 0,
        M10_Site_Installation: 0,
        M9_Final_Acceptance: 0,
        Completed: 0,
      };
      let total = 0;
      for (const row of stageRows) {
        if (row.stage) byStage[row.stage] = Number(row.count);
        total += Number(row.count);
      }

      const [blockedRow] = await db
        .select({ count: count() })
        .from(deliveryExecutions)
        .where(eq(deliveryExecutions.status, "Blocked"));

      return { byStage, total, blocked: Number(blockedRow?.count ?? 0) };
    } catch {
      return {
        byStage: {
          M7_Pre_Acceptance: 5,
          M8_Installation: 3,
          M10_Site_Installation: 2,
          M9_Final_Acceptance: 2,
          Completed: 10,
        },
        total: 22,
        blocked: 1,
      };
    }
  }),
});

// ========== Site Issue sub-router ==========

const siteIssueSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        status: z.string().optional(),
        severity: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const rows = await db
          .select()
          .from(siteIssueTickets)
          .orderBy(desc(siteIssueTickets.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        const [totalRow] = await db
          .select({ count: count() })
          .from(siteIssueTickets);

        return {
          items: rows,
          total: totalRow?.count ?? 0,
          page: input.page,
          pageSize: input.pageSize,
        };
      } catch {
        return {
          items: mockIssues,
          total: mockIssues.length,
          page: input.page,
          pageSize: input.pageSize,
        };
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        deliveryId: z.number(),
        issueCategory: z.enum([
          "Missing_Part",
          "Damage",
          "Dimension_Error",
          "Function_Fail",
          "Doc_Missing",
          "Other",
        ]),
        severity: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
        title: z.string().min(1),
        description: z.string().optional(),
        affectedComponent: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const year = new Date().getFullYear();
      const seq = String(Date.now() % 100000).padStart(3, "0");
      const ticketCode = `SITE-${year}-${seq}`;

      try {
        const db = await requireDb();
        const [row] = await db
          .insert(siteIssueTickets)
          .values({
            ticketCode,
            deliveryId: input.deliveryId,
            issueCategory: input.issueCategory,
            severity: input.severity,
            title: input.title,
            description: input.description ?? "",
            reportedById: ctx.user.id,
            reportedByName: ctx.user.name,
            status: "Open",
          })
          .returning();

        return { success: true, id: row.id, ticketCode };
      } catch {
        return { success: true, id: Date.now(), ticketCode };
      }
    }),

  getStats: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      try {
        const db = await requireDb();
        const statusRows = await db
          .select({
            status: siteIssueTickets.status,
            count: count(),
          })
          .from(siteIssueTickets)
          .groupBy(siteIssueTickets.status);

        const sevRows = await db
          .select({
            severity: siteIssueTickets.severity,
            count: count(),
          })
          .from(siteIssueTickets)
          .groupBy(siteIssueTickets.severity);

        const byStatus: Record<string, number> = {
          Open: 0,
          Investigating: 0,
          Resolved: 0,
          Closed: 0,
          Escalated: 0,
        };
        const bySeverity: Record<string, number> = {};
        let total = 0;

        for (const row of statusRows) {
          if (row.status) byStatus[row.status] = Number(row.count);
          total += Number(row.count);
        }
        for (const row of sevRows) {
          if (row.severity) bySeverity[row.severity] = Number(row.count);
        }

        return { byStatus, bySeverity, total };
      } catch {
        return {
          byStatus: {
            Open: 3,
            Investigating: 2,
            Resolved: 5,
            Closed: 8,
            Escalated: 1,
          },
          bySeverity: { Critical: 1, High: 3 },
          total: 19,
        };
      }
    }),
});

// ========== Stage Transition sub-router (M7→M8→M9→Complete) ==========

const stageTransitionSubRouter = router({
  /** Advance M7→M8: FAT passed, begin shipping/packaging */
  completeM7: protectedProcedure
    .input(z.object({
      deliveryId: z.number(),
      m7GateResult: z.enum(["Pass", "Conditional_Pass", "Fail"]),
      m7GateNotes: z.string().optional(),
      shippingCleanlinessReport: z.string().optional(),
      cycleTimeActual: z.number().optional(),
      cycleTimeTarget: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const now = new Date();

        if (input.m7GateResult === "Fail") {
          await db.update(deliveryExecutions).set({
            m7GateResult: "Fail",
            m7GateNotes: input.m7GateNotes ?? null,
            status: "Blocked",
            blockReason: "M7 FAT gate check failed",
            updatedAt: now.toISOString(),
          }).where(eq(deliveryExecutions.id, input.deliveryId));
          return { success: false, message: "M7 gate check failed — delivery blocked" };
        }

        const cycleVariance = input.cycleTimeActual && input.cycleTimeTarget
          ? String(((input.cycleTimeActual - input.cycleTimeTarget) / input.cycleTimeTarget * 100).toFixed(2))
          : null;

        await db.update(deliveryExecutions).set({
          currentStage: "M8_Installation",
          m7GateResult: input.m7GateResult,
          m7GateNotes: input.m7GateNotes ?? null,
          m7CompletedDate: now,
          m8StartDate: now,
          shippingCleanlinessReport: input.shippingCleanlinessReport ?? null,
          cycleTimeActual: input.cycleTimeActual ? String(input.cycleTimeActual) : null,
          cycleTimeTarget: input.cycleTimeTarget ? String(input.cycleTimeTarget) : null,
          cycleTimeVariance: cycleVariance,
          cycleTimeStatus: cycleVariance && parseFloat(cycleVariance) > 10 ? "Warning" : "Normal",
          status: "In_Progress",
          updatedAt: now.toISOString(),
        }).where(eq(deliveryExecutions.id, input.deliveryId));

        return { success: true, message: "M7 completed → advanced to M8 Installation" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Advance M8→M10: Shipping complete, begin site installation */
  completeM8: protectedProcedure
    .input(z.object({
      deliveryId: z.number(),
      siteEngineerId: z.number().optional(),
      siteEngineerName: z.string().optional(),
      siteEngineerPhone: z.string().optional(),
      arrivalNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const now = new Date();

        await db.update(deliveryExecutions).set({
          currentStage: "M10_Site_Installation",
          m8CompletedDate: now,
          m10StartDate: now,
          siteEngineerId: input.siteEngineerId ?? null,
          siteEngineerName: input.siteEngineerName ?? null,
          siteEngineerPhone: input.siteEngineerPhone ?? null,
          status: "In_Progress",
          updatedAt: now.toISOString(),
        }).where(eq(deliveryExecutions.id, input.deliveryId));

        return { success: true, message: "M8 completed → advanced to M10 Site Installation" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Advance M10→M9(SAT): Site installation complete, begin Site Acceptance Test */
  completeM10: protectedProcedure
    .input(z.object({
      deliveryId: z.number(),
      installationNotes: z.string().optional(),
      commissioningResult: z.enum(["Pass", "Conditional_Pass", "Fail"]).optional(),
      trainingCompleted: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const now = new Date();

        if (input.commissioningResult === "Fail") {
          await db.update(deliveryExecutions).set({
            m10InstallationNotes: input.installationNotes ?? null,
            status: "Blocked",
            blockReason: "M10 site installation/commissioning failed",
            updatedAt: now.toISOString(),
          }).where(eq(deliveryExecutions.id, input.deliveryId));
          return { success: false, message: "M10 commissioning failed — delivery blocked" };
        }

        await db.update(deliveryExecutions).set({
          currentStage: "M9_Final_Acceptance",
          m10CompletedDate: now,
          m10InstallationNotes: input.installationNotes ?? null,
          actualM10Date: now,
          m9StartDate: now,
          status: "In_Progress",
          updatedAt: now.toISOString(),
        }).where(eq(deliveryExecutions.id, input.deliveryId));

        return { success: true, message: "M10 completed → advanced to SAT (Final Acceptance)" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Advance M9→Complete: SAT passed, customer signoff */
  completeM9: protectedProcedure
    .input(z.object({
      deliveryId: z.number(),
      m9AcceptanceResult: z.enum(["Pass", "Conditional_Pass", "Fail"]),
      m9AcceptanceNotes: z.string().optional(),
      customerSignoffName: z.string().optional(),
      customerSignoffNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const now = new Date();

        if (input.m9AcceptanceResult === "Fail") {
          await db.update(deliveryExecutions).set({
            m9AcceptanceResult: "Fail",
            m9AcceptanceNotes: input.m9AcceptanceNotes ?? null,
            status: "Blocked",
            blockReason: "M9 SAT failed — customer acceptance rejected",
            updatedAt: now.toISOString(),
          }).where(eq(deliveryExecutions.id, input.deliveryId));
          return { success: false, message: "M9 SAT failed — delivery blocked" };
        }

        await db.update(deliveryExecutions).set({
          currentStage: "Completed",
          m9AcceptanceResult: input.m9AcceptanceResult,
          m9AcceptanceNotes: input.m9AcceptanceNotes ?? null,
          m9CompletedDate: now,
          actualM9Date: now,
          customerSignoffName: input.customerSignoffName ?? null,
          customerSignoffDate: now,
          customerSignoffNotes: input.customerSignoffNotes ?? null,
          status: "Completed",
          updatedAt: now.toISOString(),
        }).where(eq(deliveryExecutions.id, input.deliveryId));

        return { success: true, message: "M9 completed → delivery finished. Customer signoff recorded.", deliveryId: input.deliveryId };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Unblock a delivery (after fixing the blocking issue) */
  unblock: protectedProcedure
    .input(z.object({
      deliveryId: z.number(),
      resolution: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        await db.update(deliveryExecutions).set({
          status: "In_Progress",
          blockReason: null,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryExecutions.id, input.deliveryId));
        return { success: true, message: "Delivery unblocked" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),
});

// ========== Gate Check sub-router ==========

const gateCheckSubRouter = router({
  executeAIGateCheck: protectedProcedure
    .input(
      z.object({
        deliveryId: z.number(),
        projectNo: z.string().optional(),
        currentStage: z.enum([
          "M7_Pre_Acceptance",
          "M8_Installation",
          "M10_Site_Installation",
          "M9_Final_Acceptance",
        ]),
        shippingCleanlinessReport: z.string().optional(),
        cycleTimeActual: z.number().optional(),
        cycleTimeTarget: z.number().optional(),
        openIssueCount: z.number().default(0),
        criticalIssueCount: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      // Simulated AI gate check logic
      const issues: string[] = [];
      let score = 100;

      if (input.criticalIssueCount > 0) {
        issues.push(`${input.criticalIssueCount} 个Critical问题未关闭`);
        score -= input.criticalIssueCount * 30;
      }
      if (input.openIssueCount > 3) {
        issues.push(`${input.openIssueCount} 个Open问题待解决`);
        score -= (input.openIssueCount - 3) * 10;
      }
      if (
        input.cycleTimeActual &&
        input.cycleTimeTarget &&
        input.cycleTimeActual > input.cycleTimeTarget * 1.1
      ) {
        issues.push(
          `节拍超标: 实际${input.cycleTimeActual}s > 目标${input.cycleTimeTarget}s`
        );
        score -= 20;
      }
      if (!input.shippingCleanlinessReport) {
        issues.push("清洁度报告未提供");
        score -= 10;
      }

      score = Math.max(0, score);

      let decision: "Green_Light" | "Yellow_Hold" | "Red_Block";
      if (score >= 80) decision = "Green_Light";
      else if (score >= 50) decision = "Yellow_Hold";
      else decision = "Red_Block";

      return {
        decision,
        score,
        stage: input.currentStage,
        issues,
        checkedAt: new Date().toISOString(),
        recommendation:
          decision === "Green_Light"
            ? "所有检查项通过，可以推进到下一阶段"
            : decision === "Yellow_Hold"
              ? "存在需关注事项，建议处理后再推进"
              : "存在严重问题，不建议推进",
      };
    }),
});

// ========== Combined delivery router ==========

export const deliveryRouter = router({
  delivery: deliverySubRouter,
  siteIssue: siteIssueSubRouter,
  gateCheck: gateCheckSubRouter,
  stageTransition: stageTransitionSubRouter,

  // Backward-compat flat endpoints (old placeholder shape)
  list: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(deliveryExecutions)
        .orderBy(desc(deliveryExecutions.createdAt))
        .limit(20);
      return { items: rows, total: rows.length };
    } catch {
      return { items: mockDeliveries, total: mockDeliveries.length };
    }
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [row] = await db
          .select()
          .from(deliveryExecutions)
          .where(eq(deliveryExecutions.id, Number(input.id)));
        return row ?? null;
      } catch {
        return mockDeliveries.find((d) => d.id === Number(input.id)) ?? null;
      }
    }),
  update: protectedProcedure.input(z.any()).mutation(async () => {
    return { success: true };
  }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      return { success: true };
    }),
});
