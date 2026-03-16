/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Real Order Flow Router — 真实订单全流程管理                  ║
 * ║  苏州明志RW2000机器人清洗机端到端流程                          ║
 * ║  3 routes × 19 steps, event-bus sync to sandbox             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import { eventBus, SANDBOX_EVENTS } from "../events/event-bus";

const log = createChildLogger("real-order-flow");

// ── DA (Digital Assistant) Role Assignments ───────────────────
// 7 engineering roles → real GRT employees with DA designation

interface DAAssignment {
  role: string;
  roleName: string;
  employeeCode: string;
  employeeName: string;
  daName: string;
  department: string;
  buCode: string;
  skills: string[];
  stepIds: string[];  // which steps this DA handles
}

const SHUANGHUAN_DA_TEAM: DAAssignment[] = [
  {
    role: "sales_engineer", roleName: "销售工程师",
    employeeCode: "GRT004", employeeName: "戴晓燕", daName: "戴晓燕(DA)",
    department: "事业一部", buCode: "BU1",
    skills: ["客户需求分析", "报价策略优化", "合同风险评估", "CRM数据洞察", "竞品分析"],
    stepIds: ["create-project"],
  },
  {
    role: "mechanical_engineer", roleName: "机械设计工程师",
    employeeCode: "GRT006", employeeName: "洪香龙", daName: "洪香龙(DA)",
    department: "事业二部", buCode: "BU2",
    skills: ["3D建模辅助", "BOM生成", "公差分析", "FEA仿真建议", "图纸审核"],
    stepIds: ["mech-config"],
  },
  {
    role: "electrical_engineer", roleName: "电气工程师",
    employeeCode: "GRT007", employeeName: "孙坚", daName: "孙坚(DA)",
    department: "事业三部", buCode: "BU3",
    skills: ["PLC编程辅助", "电气原理图审查", "控制逻辑优化", "安全回路验证", "IO分配"],
    stepIds: ["mech-config", "quality-check"],
  },
  {
    role: "quality_engineer", roleName: "质量工程师",
    employeeCode: "GRT005", employeeName: "金晓锋", daName: "金晓锋(DA)",
    department: "事业一部", buCode: "BU1",
    skills: ["FMEA分析", "SPC监控", "NCR处理", "IQC/OQC检验", "8D报告"],
    stepIds: ["quality-check", "gate-check", "quality-plan", "process-inspect"],
  },
  {
    role: "procurement_engineer", roleName: "采购工程师",
    employeeCode: "GRT055", employeeName: "沈迎凤", daName: "沈迎凤(DA)",
    department: "事业三部", buCode: "BU3",
    skills: ["供应商评估", "采购成本优化", "交期跟踪", "物料替代方案", "合格供应商库"],
    stepIds: ["mech-config", "create-wo"],
  },
  {
    role: "production_leader", roleName: "生产班组长",
    employeeCode: "GRT038", employeeName: "马林山", daName: "马林山(DA)",
    department: "事业二部", buCode: "BU2",
    skills: ["排产优化", "工序调度", "人员分配", "产能分析", "异常上报"],
    stepIds: ["create-wo", "log-hours"],
  },
  {
    role: "commissioning_engineer", roleName: "调试工程师",
    employeeCode: "GRT045", employeeName: "杨勇", daName: "杨勇(DA)",
    department: "事业三部", buCode: "BU3",
    skills: ["现场调试", "参数优化", "故障诊断", "客户培训", "验收支持"],
    stepIds: ["gate-check", "acceptance", "customer-acceptance", "create-delivery"],
  },
];

// ── Flow Step Status (derived from DB) ────────────────────────

interface StepStatus {
  id: string;
  label: string;
  status: "pending" | "completed" | "in_progress";
  completedAt?: string;
  data?: Record<string, unknown>;
}

// ── Route A: 项目全生命周期 ───────────────────────────────────

const projectLifecycleRouter = router({
  /** Derive flow status from actual DB records */
  getStatus: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { projects, productionWorkOrders, workLogs } = await import("../../drizzle/schema");
      const { mechProjectSelections, mechAcceptanceRecords } = await import("../../drizzle/mechanical-config-schema");

      const [project] = await db.select().from(projects)
        .where(eq(projects.projectCode, input.projectCode)).limit(1);
      const [mechConfig] = await db.select().from(mechProjectSelections)
        .where(eq(mechProjectSelections.projectCode, input.projectCode)).limit(1);
      const workOrders = await db.select().from(productionWorkOrders)
        .where(eq(productionWorkOrders.projectId, project?.id ?? -1)).limit(5);
      const logs = project?.id
        ? await db.select({ count: sql<number>`count(*)::int` }).from(workLogs)
            .where(eq(workLogs.projectId, project.id))
        : [{ count: 0 }];
      const acceptanceRecords = await db.select({ count: sql<number>`count(*)::int` })
        .from(mechAcceptanceRecords)
        .where(eq(mechAcceptanceRecords.projectCode, input.projectCode));

      const steps: StepStatus[] = [
        { id: "create-project", label: "创建项目", status: project ? "completed" : "pending", data: project ? { id: project.id, name: project.name } : undefined },
        { id: "mech-config", label: "机械配置选型", status: mechConfig ? "completed" : project ? "in_progress" : "pending" },
        { id: "create-wo", label: "创建生产工单", status: workOrders.length > 0 ? "completed" : mechConfig ? "in_progress" : "pending", data: { count: workOrders.length } },
        { id: "log-hours", label: "工时登记", status: (logs[0]?.count ?? 0) > 0 ? "completed" : workOrders.length > 0 ? "in_progress" : "pending", data: { count: logs[0]?.count ?? 0 } },
        { id: "quality-check", label: "质量检查", status: (logs[0]?.count ?? 0) > 0 ? "in_progress" : "pending" },
        { id: "gate-check", label: "Gate检查", status: "pending" },
        { id: "acceptance", label: "客户验收", status: (acceptanceRecords[0]?.count ?? 0) > 0 ? "completed" : "pending", data: { count: acceptanceRecords[0]?.count ?? 0 } },
      ];
      const completedCount = steps.filter(s => s.status === "completed").length;
      return { projectCode: input.projectCode, steps, completedCount, totalSteps: steps.length, progressPct: Math.round((completedCount / steps.length) * 100) };
    }),
});

// ── Route B: 工时绩效闭环 ────────────────────────────────────

const workHoursPerfLoopRouter = router({
  getStatus: protectedProcedure
    .input(z.object({ employeeId: z.number().optional(), projectCode: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { workLogs } = await import("../../drizzle/schema");
      const { attendanceClockRecords } = await import("../../drizzle/attendance-clock-schema");

      const today = new Date().toISOString().split("T")[0];
      const empId = input.employeeId ?? ctx.user?.id ?? 0;

      // Check attendance today
      const [clockRecord] = await db.select().from(attendanceClockRecords)
        .where(and(eq(attendanceClockRecords.employeeId, empId), eq(attendanceClockRecords.clockDate, today))).limit(1);

      // Check work logs
      const logStats = await db.select({ total: sql<number>`count(*)::int`, approved: sql<number>`count(*) filter (where approval_status = 'approved')::int` })
        .from(workLogs).where(eq(workLogs.workerId, empId));

      const steps: StepStatus[] = [
        { id: "clock-in", label: "员工打卡", status: clockRecord ? "completed" : "in_progress", data: clockRecord ? { clockIn: clockRecord.clockInTime, clockOut: clockRecord.clockOutTime } : undefined },
        { id: "submit-hours", label: "工时提交", status: (logStats[0]?.total ?? 0) > 0 ? "completed" : clockRecord ? "in_progress" : "pending", data: { total: logStats[0]?.total ?? 0 } },
        { id: "approve-hours", label: "工时审批", status: (logStats[0]?.approved ?? 0) > 0 ? "completed" : (logStats[0]?.total ?? 0) > 0 ? "in_progress" : "pending", data: { approved: logStats[0]?.approved ?? 0 } },
        { id: "perf-evidence", label: "绩效证据采集", status: (logStats[0]?.approved ?? 0) > 0 ? "in_progress" : "pending" },
        { id: "kpi-score", label: "KPI评分", status: "pending" },
        { id: "perf-calibration", label: "绩效校准", status: "pending" },
      ];
      const completedCount = steps.filter(s => s.status === "completed").length;
      return { employeeId: empId, steps, completedCount, totalSteps: steps.length, progressPct: Math.round((completedCount / steps.length) * 100) };
    }),
});

// ── Route C: 质量交付反馈 ────────────────────────────────────

const qualityDeliveryRouter = router({
  getStatus: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { mechAcceptanceRecords } = await import("../../drizzle/mechanical-config-schema");

      const acceptanceRecords = await db.select({ count: sql<number>`count(*)::int` })
        .from(mechAcceptanceRecords).where(eq(mechAcceptanceRecords.projectCode, input.projectCode));

      const steps: StepStatus[] = [
        { id: "quality-plan", label: "质量计划", status: "in_progress" },
        { id: "process-inspect", label: "过程检验", status: "pending" },
        { id: "gate-check", label: "Gate检查", status: "pending" },
        { id: "create-delivery", label: "交付创建", status: "pending" },
        { id: "customer-acceptance", label: "客户验收评分", status: (acceptanceRecords[0]?.count ?? 0) > 0 ? "completed" : "pending", data: { count: acceptanceRecords[0]?.count ?? 0 } },
        { id: "satisfaction", label: "满意度分析", status: "pending" },
      ];
      const completedCount = steps.filter(s => s.status === "completed").length;
      return { projectCode: input.projectCode, steps, completedCount, totalSteps: steps.length, progressPct: Math.round((completedCount / steps.length) * 100) };
    }),
});

// ── Event Publishing Helper ──────────────────────────────────

const eventRouter = router({
  /** Publish a flow step event for sandbox sync */
  publishStep: protectedProcedure
    .input(z.object({
      route: z.enum(["lifecycle", "workHoursPerf", "qualityDelivery"]),
      stepId: z.string(),
      projectCode: z.string().optional(),
      payload: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const eventType = `realorder.${input.route}.${input.stepId}`;
      await eventBus.publish({
        type: eventType,
        sourceModule: "real-order-flow",
        targetModules: ["production-scheduling", "acceptance", "payroll", "performance"],
        payload: { route: input.route, step: input.stepId, projectCode: input.projectCode, ...input.payload },
        userId: ctx.user?.id ?? 0,
        timestamp: new Date(),
      });
      log.info({ eventType, step: input.stepId, route: input.route }, "Real order flow step event published");
      return { published: true, eventType };
    }),

  /** Get recent flow events */
  getRecentEvents: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { sandboxEventLog } = await import("../../drizzle/sandbox-event-schema");
      return db.select().from(sandboxEventLog)
        .where(eq(sandboxEventLog.sourceModule, "real-order-flow"))
        .orderBy(desc(sandboxEventLog.createdAt))
        .limit(input.limit);
    }),
});

// ── Scenario Initializer ─────────────────────────────────────

const scenarioRouter = router({
  /** Initialize 苏州明志 RW2000 scenario — creates project + customer config + work order */
  initSuzhouMingzhi: requirePermission("project:create")
    .mutation(async ({ ctx }) => {
      const db = await requireDb();
      const { projects, productionWorkOrders } = await import("../../drizzle/schema");
      const { mechCustomerConfigs, mechProjectSelections } = await import("../../drizzle/mechanical-config-schema");

      // 1. Create project
      const projectCode = `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const [project] = await db.insert(projects).values({
        projectCode,
        name: "苏州明志RW2000机器人清洗机",
        shortName: "RW2000",
        type: "key",
        priority: "high",
        status: "active",
        currentPhase: "M0",
        description: "苏州明志科技股份有限公司定制RW2000系列机器人清洗设备，全自动控制，组合清洗（超声+喷淋），年产量50000件。",
        budget: 680000,
        buCode: ctx.bu?.buCode ?? null,
      }).returning();

      // 2. Create customer config
      const [custConfig] = await db.insert(mechCustomerConfigs).values({
        customerName: "苏州明志科技股份有限公司",
        customerCode: "SZMZ",
        region: "华东",
        frameMaterial: "304不锈钢",
        surfaceFinish: "拉丝处理",
        weldingStandard: "EN ISO 3834-2",
        toleranceGrade: "IT7",
        ipRating: "IP65",
        pneumaticsBrand: "SMC",
        noiseLimit: "≤75dB(A)",
        safetyGuardSpec: "CE安全防护",
        paintColorCode: "RAL 7035",
        fastenerStandard: "DIN 912",
        packagingSpec: "木箱+防潮膜",
        specialRequirements: "铝合金缸体清洗，碎屑残留≤0.5mg，清洁度检测Ra≤1.6μm",
        createdBy: ctx.user!.id,
      }).returning();

      // 3. Create mechanical project selection
      await db.insert(mechProjectSelections).values({
        projectCode,
        projectName: "苏州明志RW2000机器人清洗机",
        customerConfigId: custConfig.id,
        applicablePhases: ["M0", "M1", "M2", "M3", "M4"],
        designBasis: {
          frameMaterial: "304不锈钢",
          surfaceFinish: "拉丝处理",
          toleranceGrade: "IT7",
          ipRating: "IP65",
          pneumaticsBrand: "SMC",
          safetyGuardSpec: "CE安全防护",
          paintColor: "RAL 7035",
          noiseLimit: "≤75dB(A)",
        },
        buCode: ctx.bu?.buCode ?? null,
        createdBy: ctx.user!.id,
      });

      // 4. Create production work order
      const [wo] = await db.insert(productionWorkOrders).values({
        workOrderCode: `WO-${projectCode.slice(4)}`,
        projectId: project.id,
        productName: "RW2000机器人清洗机",
        productModel: "RW2000-CB-FA",
        quantity: 1,
        priority: "high",
        status: "planned",
        plannedStartDate: new Date().toISOString().split("T")[0],
        plannedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        estimatedHours: "480",
        actualHours: "0",
        completionRate: "0.00",
        assignedTeam: "A班组",
        notes: "苏州明志定制，全自动组合清洗，超声+喷淋",
        createdBy: ctx.user?.id ?? null,
      }).returning();

      // 5. Publish event
      await eventBus.publish({
        type: SANDBOX_EVENTS.PROJECT_MILESTONE_HIT,
        sourceModule: "real-order-flow",
        targetModules: ["production-scheduling", "acceptance", "quoting-bom", "mechanical-config"],
        payload: { projectCode, projectId: project.id, workOrderId: wo.id, customerConfigId: custConfig.id, scenario: "苏州明志RW2000" },
        userId: ctx.user?.id ?? 0,
        timestamp: new Date(),
      });

      log.info({ projectCode, projectId: project.id }, "苏州明志RW2000 scenario initialized");
      return { projectCode, projectId: project.id, workOrderId: wo.id, customerConfigId: custConfig.id };
    }),

  /** Initialize 双环嘉兴通过式清洗机 scenario — with DA team assignments */
  initShuanghuanJiaxing: requirePermission("project:create")
    .mutation(async ({ ctx }) => {
      const db = await requireDb();
      const { projects, productionWorkOrders } = await import("../../drizzle/schema");
      const { mechCustomerConfigs, mechProjectSelections } = await import("../../drizzle/mechanical-config-schema");

      // 1. Create project
      const projectCode = `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const [project] = await db.insert(projects).values({
        projectCode,
        name: "双环嘉兴通过式清洗机",
        shortName: "SH-PT",
        type: "standard",
        priority: "high",
        status: "active",
        currentPhase: "M0",
        description: "双环传动（嘉兴）精密制造有限公司定制通过式清洗设备，连续通过式清洗（喷淋+风切干燥），齿轮传动零件清洗，年产量100000件。",
        budget: 520000,
        buCode: ctx.bu?.buCode ?? null,
      }).returning();

      // 2. Create customer config
      const [custConfig] = await db.insert(mechCustomerConfigs).values({
        customerName: "双环传动（嘉兴）精密制造有限公司",
        customerCode: "SHJX",
        region: "华东",
        frameMaterial: "Q235碳钢+喷塑",
        surfaceFinish: "喷塑处理",
        weldingStandard: "EN ISO 3834-3",
        toleranceGrade: "IT8",
        ipRating: "IP54",
        pneumaticsBrand: "FESTO",
        noiseLimit: "≤78dB(A)",
        safetyGuardSpec: "CE安全光栅",
        paintColorCode: "RAL 5015",
        fastenerStandard: "GB/T 70.1",
        packagingSpec: "钢架+缠绕膜",
        specialRequirements: "齿轮零件通过式清洗，清洁度≤2mg，节拍≤45s/件，风切干燥无残留水渍",
        createdBy: ctx.user!.id,
      }).returning();

      // 3. Create mechanical project selection
      // @ts-expect-error seed data type compat
      await db.insert(mechProjectSelections).values({
        projectCode,
        projectName: "双环嘉兴通过式清洗机",
        customerConfigId: custConfig.id,
        applicablePhases: ["M0", "M1", "M2", "M3", "M4", "M5"],
        designBasis: {
          frameMaterial: "Q235碳钢+喷塑",
          surfaceFinish: "喷塑处理",
          toleranceGrade: "IT8",
          ipRating: "IP54",
          pneumaticsBrand: "FESTO",
          safetyGuardSpec: "CE安全光栅",
          paintColor: "RAL 5015",
          noiseLimit: "≤78dB(A)",
          conveyorType: "通过式链条输送",
          cycleTime: "≤45s/件",
        },
        buCode: ctx.bu?.buCode ?? null,
        createdBy: ctx.user!.id,
      });

      // 4. Create production work order
      const [wo] = await db.insert(productionWorkOrders).values({
        workOrderCode: `WO-${projectCode.slice(4)}`,
        projectId: project.id,
        productName: "通过式清洗机",
        productModel: "SH-PT-CW-600",
        quantity: 1,
        priority: "high",
        status: "planned",
        plannedStartDate: new Date().toISOString().split("T")[0],
        plannedEndDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        estimatedHours: "360",
        actualHours: "0",
        completionRate: "0.00",
        assignedTeam: "B班组",
        notes: "双环嘉兴定制，通过式链条输送，喷淋+风切干燥，节拍≤45s/件",
        createdBy: ctx.user?.id ?? null,
      }).returning();

      // 5. Publish event
      await eventBus.publish({
        type: SANDBOX_EVENTS.PROJECT_MILESTONE_HIT,
        sourceModule: "real-order-flow",
        targetModules: ["production-scheduling", "acceptance", "quoting-bom", "mechanical-config"],
        payload: {
          projectCode, projectId: project.id, workOrderId: wo.id, customerConfigId: custConfig.id,
          scenario: "双环嘉兴通过式清洗机",
          daTeam: SHUANGHUAN_DA_TEAM.map(d => ({ role: d.roleName, da: d.daName, code: d.employeeCode })),
        },
        userId: ctx.user?.id ?? 0,
        timestamp: new Date(),
      });

      log.info({ projectCode, projectId: project.id, daTeamSize: SHUANGHUAN_DA_TEAM.length }, "双环嘉兴通过式清洗机 scenario initialized with DA team");
      return {
        projectCode, projectId: project.id, workOrderId: wo.id, customerConfigId: custConfig.id,
        daTeam: SHUANGHUAN_DA_TEAM,
      };
    }),
});

// ── DA Router ───────────────────────────────────────────────

const daRouter = router({
  /** Get DA team for a given scenario */
  getTeam: protectedProcedure
    .input(z.object({ scenario: z.enum(["suzhouMingzhi", "shuanghuanJiaxing"]) }))
    .query(({ input }) => {
      // 苏州明志 uses same DA team but without preset (legacy scenario)
      if (input.scenario === "suzhouMingzhi") {
        return { scenario: "苏州明志RW2000", team: SHUANGHUAN_DA_TEAM.map(d => ({ ...d, active: false })) };
      }
      return { scenario: "双环嘉兴通过式清洗机", team: SHUANGHUAN_DA_TEAM.map(d => ({ ...d, active: true })) };
    }),

  /** Get DA skill presets for a specific role */
  getSkillPresets: protectedProcedure
    .input(z.object({ role: z.string() }))
    .query(({ input }) => {
      const da = SHUANGHUAN_DA_TEAM.find(d => d.role === input.role);
      if (!da) return null;
      return { ...da, presetLoaded: true };
    }),

  /** Get step-to-DA attribution map */
  getStepAttribution: protectedProcedure
    .query(() => {
      const map: Record<string, DAAssignment[]> = {};
      for (const da of SHUANGHUAN_DA_TEAM) {
        for (const stepId of da.stepIds) {
          if (!map[stepId]) map[stepId] = [];
          map[stepId].push(da);
        }
      }
      return map;
    }),
});

// ── Main Router ─────────────────────────────────────────────

export const realOrderFlowRouter = router({
  lifecycle: projectLifecycleRouter,
  workHoursPerf: workHoursPerfLoopRouter,
  qualityDelivery: qualityDeliveryRouter,
  event: eventRouter,
  scenario: scenarioRouter,
  da: daRouter,
});
