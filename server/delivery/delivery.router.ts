import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../utils/db-helpers";
import {
  deliveryExecutions,
  siteIssueTickets,
  deliveryShipments,
  deliveryInstallations,
  deliverySatRecords,
  gateChecklistItems,
} from "../../drizzle/schema";
import { eq, sql, desc, and, count, asc } from "drizzle-orm";

// No mock data — all procedures are DB-backed

// ========== Helpers ==========

function generateCode(prefix: string): string {
  const year = new Date().getFullYear();
  const seq = String(Date.now() % 100000).padStart(3, "0");
  return `${prefix}-${year}-${seq}`;
}

/** Default M8 packing list template */
function defaultPackingListItems(): object[] {
  return [
    { seq: 1, itemName: "主机设备", partNo: "", qty: 1, weight: 0, boxNo: "BOX-01", remarks: "", checked: false },
    { seq: 2, itemName: "电气控制柜", partNo: "", qty: 1, weight: 0, boxNo: "BOX-02", remarks: "", checked: false },
    { seq: 3, itemName: "管路附件包", partNo: "", qty: 1, weight: 0, boxNo: "BOX-03", remarks: "", checked: false },
    { seq: 4, itemName: "紧固件/密封件", partNo: "", qty: 1, weight: 0, boxNo: "BOX-04", remarks: "", checked: false },
    { seq: 5, itemName: "技术文件包", partNo: "", qty: 1, weight: 0, boxNo: "DOC-01", remarks: "含操作手册/维护手册/电气图纸", checked: false },
    { seq: 6, itemName: "随机工具", partNo: "", qty: 1, weight: 0, boxNo: "TOOL-01", remarks: "", checked: false },
    { seq: 7, itemName: "备件包", partNo: "", qty: 1, weight: 0, boxNo: "SPARE-01", remarks: "首年备件", checked: false },
  ];
}

/** Default M9 installation checklist template */
function defaultInstallationChecklist(): object[] {
  return [
    // 基础验证
    { seq: 1, category: "基础条件", item: "地基/安装面检查", description: "确认安装面平整度、承重满足要求", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 2, category: "基础条件", item: "电源接入验证", description: "确认电源电压/频率/容量满足设备需求", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 3, category: "基础条件", item: "气源/水源接入", description: "压缩空气压力、流量；冷却水温度、流量", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 4, category: "基础条件", item: "排废系统对接", description: "废液/废气排放管路连接", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    // 设备安装
    { seq: 5, category: "机械安装", item: "设备就位及找平", description: "设备放置到位，水平度调整", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 6, category: "机械安装", item: "管路连接", description: "进出水管、气管、油管连接", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 7, category: "机械安装", item: "防护装置安装", description: "安全门、光栅、急停按钮", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    // 电气调试
    { seq: 8, category: "电气调试", item: "电气接线检查", description: "主回路/控制回路接线正确性", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 9, category: "电气调试", item: "PLC程序加载", description: "PLC程序版本确认及上传", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 10, category: "电气调试", item: "HMI界面验证", description: "触摸屏画面、参数设定", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 11, category: "电气调试", item: "传感器标定", description: "各传感器信号标定及验证", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    // 功能验证
    { seq: 12, category: "功能验证", item: "手动模式测试", description: "逐站手动操作验证", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 13, category: "功能验证", item: "自动模式空运行", description: "自动模式无工件运行", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 14, category: "功能验证", item: "首件试运行", description: "加载工件进行首件加工验证", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 15, category: "功能验证", item: "安全功能测试", description: "急停/安全门/光栅联锁验证", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    // 文档
    { seq: 16, category: "文档交接", item: "操作手册交付", description: "纸质+电子版操作维护手册", required: true, result: null, notes: "", completedBy: null, completedAt: null },
    { seq: 17, category: "文档交接", item: "电气图纸交付", description: "最终版电气接线图、PLC I/O表", required: true, result: null, notes: "", completedBy: null, completedAt: null },
  ];
}

/** Default M10 SAT test report template */
function defaultSatTestItems(): object[] {
  return [
    // 性能测试
    { seq: 1, testName: "节拍时间验证", category: "性能", acceptance: "≤合同节拍", method: "连续运行30件取平均", target: "", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    { seq: 2, testName: "连续运行测试", category: "性能", acceptance: "连续8小时无故障", method: "连续自动运行≥8小时", target: "8h", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    { seq: 3, testName: "产品合格率验证", category: "质量", acceptance: "≥合同良率", method: "连续100件统计", target: "", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    { seq: 4, testName: "清洁度验证", category: "质量", acceptance: "≤客户清洁度标准", method: "取样检测", target: "", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    // 安全测试
    { seq: 5, testName: "急停功能测试", category: "安全", acceptance: "所有急停按钮有效", method: "逐个触发验证", target: "100%", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    { seq: 6, testName: "安全门联锁测试", category: "安全", acceptance: "开门即停", method: "运行中打开安全门", target: "100%", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    { seq: 7, testName: "过载保护测试", category: "安全", acceptance: "过载自动断电", method: "模拟过载", target: "100%", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    // 功能测试
    { seq: 8, testName: "全自动循环验证", category: "功能", acceptance: "全程序自动运行", method: "自动模式连续5个循环", target: "5 cycles", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    { seq: 9, testName: "报警及恢复测试", category: "功能", acceptance: "报警准确，恢复正常", method: "模拟各种故障", target: "100%", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    { seq: 10, testName: "数据记录功能", category: "功能", acceptance: "生产数据完整记录", method: "检查PLC/SCADA数据", target: "100%", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    // 环境
    { seq: 11, testName: "噪音测试", category: "环境", acceptance: "≤85dB(A)", method: "1m距离测量", target: "85dB(A)", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
    { seq: 12, testName: "泄漏检查", category: "环境", acceptance: "无泄漏", method: "目视+试纸检测", target: "0", actual: "", result: null, notes: "", testedBy: null, testedAt: null },
  ];
}

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
      const db = await requireDb();
      const conditions = [];
      if (input.stage) {
        conditions.push(eq(deliveryExecutions.currentStage, input.stage));
      }
      if (input.status) {
        conditions.push(eq(deliveryExecutions.status, input.status));
      }

      const rows = await db
        .select()
        .from(deliveryExecutions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(deliveryExecutions.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      const [totalRow] = await db
        .select({ count: count() })
        .from(deliveryExecutions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items: rows,
        total: totalRow?.count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(deliveryExecutions)
        .where(eq(deliveryExecutions.id, input.id));
      return row ?? null;
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
      const deliveryCode = generateCode("DEL");
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
    }),

  /** Update delivery execution fields */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        customerName: z.string().optional(),
        siteAddress: z.string().optional(),
        siteContactName: z.string().optional(),
        siteContactPhone: z.string().optional(),
        plannedM7Date: z.string().optional(),
        plannedM8Date: z.string().optional(),
        plannedM9Date: z.string().optional(),
        plannedM10Date: z.string().optional(),
        specialRequirements: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;
      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };

      if (fields.customerName !== undefined) updates.customerName = fields.customerName;
      if (fields.siteAddress !== undefined) updates.siteAddress = fields.siteAddress;
      if (fields.siteContactName !== undefined) updates.siteContactName = fields.siteContactName;
      if (fields.siteContactPhone !== undefined) updates.siteContactPhone = fields.siteContactPhone;
      if (fields.plannedM7Date !== undefined) updates.plannedM7Date = new Date(fields.plannedM7Date);
      if (fields.plannedM8Date !== undefined) updates.plannedM8Date = new Date(fields.plannedM8Date);
      if (fields.plannedM9Date !== undefined) updates.plannedM9Date = new Date(fields.plannedM9Date);
      if (fields.plannedM10Date !== undefined) updates.plannedM10Date = new Date(fields.plannedM10Date);
      if (fields.specialRequirements !== undefined) updates.specialRequirements = fields.specialRequirements;

      await db.update(deliveryExecutions).set(updates).where(eq(deliveryExecutions.id, id));
      return { success: true, message: "Delivery updated" };
    }),

  /** Delete a delivery execution (soft: sets status to Cancelled) */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(deliveryExecutions).set({
        status: "Cancelled",
        updatedAt: new Date().toISOString(),
      }).where(eq(deliveryExecutions.id, input.id));
      return { success: true, message: "Delivery cancelled" };
    }),

  getStats: protectedProcedure.query(async () => {
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
  }),

  /** Get delivery timeline with all sub-record summaries for a single delivery */
  getTimeline: protectedProcedure
    .input(z.object({ deliveryId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [delivery] = await db
        .select()
        .from(deliveryExecutions)
        .where(eq(deliveryExecutions.id, input.deliveryId));

      if (!delivery) return null;

      // Gather shipment, installation, SAT summaries in parallel
      const [shipments, installations, satRecords] = await Promise.all([
        db.select().from(deliveryShipments).where(eq(deliveryShipments.deliveryId, input.deliveryId)).limit(1000),
        db.select().from(deliveryInstallations).where(eq(deliveryInstallations.deliveryId, input.deliveryId)).limit(1000),
        db.select().from(deliverySatRecords).where(eq(deliverySatRecords.deliveryId, input.deliveryId)).limit(1000),
      ]);

      return {
        delivery,
        m8: {
          shipmentCount: shipments.length,
          allReceived: shipments.length > 0 && shipments.every(s => s.status === "received" || s.status === "verified"),
          shipments: shipments.map(s => ({ id: s.id, code: s.shipmentCode, status: s.status, carrier: s.carrier })),
        },
        m9: {
          hasInstallation: installations.length > 0,
          installation: installations[0] ? {
            id: installations[0].id,
            code: installations[0].installationCode,
            status: installations[0].status,
            checklistProgress: installations[0].checklistTotalCount && installations[0].checklistTotalCount > 0
              ? Math.round(((installations[0].checklistCompletedCount ?? 0) / installations[0].checklistTotalCount) * 100)
              : 0,
            openIssues: installations[0].openIssueCount ?? 0,
            commissioned: !!installations[0].commissioningResult,
          } : null,
        },
        m10: {
          hasSat: satRecords.length > 0,
          sat: satRecords[0] ? {
            id: satRecords[0].id,
            code: satRecords[0].satCode,
            status: satRecords[0].status,
            overallResult: satRecords[0].overallTestResult,
            approvalStatus: satRecords[0].approvalStatus,
            testPass: satRecords[0].testPassCount ?? 0,
            testFail: satRecords[0].testFailCount ?? 0,
            testTotal: satRecords[0].testTotalCount ?? 0,
            punchListOpen: satRecords[0].punchListOpenCount ?? 0,
          } : null,
        },
      };
    }),
});

// ========== Site Issue sub-router ==========

const siteIssueSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        deliveryId: z.number().optional(),
        status: z.string().optional(),
        severity: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.deliveryId) {
        conditions.push(eq(siteIssueTickets.deliveryId, input.deliveryId));
      }
      if (input.status) {
        conditions.push(eq(siteIssueTickets.status, input.status));
      }
      if (input.severity) {
        conditions.push(eq(siteIssueTickets.severity, input.severity));
      }

      const rows = await db
        .select()
        .from(siteIssueTickets)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(siteIssueTickets.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      const [totalRow] = await db
        .select({ count: count() })
        .from(siteIssueTickets)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items: rows,
        total: totalRow?.count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /** Get a single site issue ticket by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(siteIssueTickets)
        .where(eq(siteIssueTickets.id, input.id));
      return row ?? null;
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
        targetResolutionDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ticketCode = generateCode("SITE");
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
          targetResolutionDate: input.targetResolutionDate ? new Date(input.targetResolutionDate) : undefined,
          status: "Open",
        })
        .returning();

      return { success: true, id: row.id, ticketCode };
    }),

  /** Update a site issue ticket */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        severity: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
        priority: z.string().optional(),
        assignedToId: z.number().optional(),
        assignedToName: z.string().optional(),
        status: z.enum(["Open", "Investigating", "Resolved", "Closed", "Escalated"]).optional(),
        description: z.string().optional(),
        targetResolutionDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;
      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };

      if (fields.severity !== undefined) updates.severity = fields.severity;
      if (fields.priority !== undefined) updates.priority = fields.priority;
      if (fields.assignedToId !== undefined) updates.assignedToId = fields.assignedToId;
      if (fields.assignedToName !== undefined) updates.assignedToName = fields.assignedToName;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.description !== undefined) updates.description = fields.description;
      if (fields.targetResolutionDate !== undefined) {
        updates.targetResolutionDate = new Date(fields.targetResolutionDate);
      }

      await db.update(siteIssueTickets).set(updates).where(eq(siteIssueTickets.id, id));
      return { success: true, message: "Issue ticket updated" };
    }),

  /** Resolve a site issue ticket with root cause analysis */
  resolve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        actualResolution: z.string().min(1),
        rootCause: z.string().optional(),
        preventiveMeasure: z.string().optional(),
        actualCost: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date();

      await db.update(siteIssueTickets).set({
        status: "Resolved",
        actualResolution: input.actualResolution,
        rootCause: input.rootCause ?? null,
        preventiveMeasure: input.preventiveMeasure ?? null,
        actualCost: input.actualCost ? String(input.actualCost) : null,
        actualResolutionDate: now,
        updatedAt: now.toISOString(),
      }).where(eq(siteIssueTickets.id, input.id));

      return { success: true, message: "Issue resolved" };
    }),

  /** Escalate a site issue ticket */
  escalate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(siteIssueTickets).set({
        status: "Escalated",
        updatedAt: new Date().toISOString(),
      }).where(eq(siteIssueTickets.id, input.id));
      return { success: true, message: "Issue escalated" };
    }),

  getStats: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
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
    }),
});

// ========== Stage Transition sub-router (M7->M8->M9->M10->Complete) ==========

const stageTransitionSubRouter = router({
  /** Advance M7->M8: FAT passed, begin shipping/packaging */
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

        return { success: true, message: "M7 completed -> advanced to M8 Shipment" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Advance M8->M9: Shipping complete, begin site installation */
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

        // Verify all shipments for this delivery are in received/verified state
        const shipments = await db
          .select()
          .from(deliveryShipments)
          .where(eq(deliveryShipments.deliveryId, input.deliveryId))
          .limit(1000);

        if (shipments.length > 0) {
          const unreceivedShipments = shipments.filter(
            (s) => s.status !== "received" && s.status !== "verified"
          );
          if (unreceivedShipments.length > 0) {
            return {
              success: false,
              message: `${unreceivedShipments.length} shipment(s) not yet received. Complete receiving before advancing to M9.`,
              unreceived: unreceivedShipments.map((s) => s.shipmentCode),
            };
          }
        }

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

        return { success: true, message: "M8 completed -> advanced to M10 Site Installation" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Advance M10->M9(SAT): Site installation complete, begin Site Acceptance Test */
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

        // Check installation record completeness
        const installations = await db
          .select()
          .from(deliveryInstallations)
          .where(eq(deliveryInstallations.deliveryId, input.deliveryId))
          .limit(1000);

        if (installations.length > 0) {
          const activeInstall = installations[0];
          if (activeInstall.criticalIssueCount && activeInstall.criticalIssueCount > 0) {
            return {
              success: false,
              message: `${activeInstall.criticalIssueCount} critical installation issue(s) still open. Resolve before advancing.`,
            };
          }
        }

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

        return { success: true, message: "M10 completed -> advanced to SAT (Final Acceptance)" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Advance M9->Complete: SAT passed, customer signoff */
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

        // Verify SAT record exists and is approved
        const satRecords = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.deliveryId, input.deliveryId))
          .limit(1000);

        if (satRecords.length > 0) {
          const activeSat = satRecords[0];
          if (activeSat.punchListOpenCount && activeSat.punchListOpenCount > 0 && input.m9AcceptanceResult === "Pass") {
            return {
              success: false,
              message: `${activeSat.punchListOpenCount} punch list item(s) still open. Resolve or use Conditional_Pass.`,
            };
          }
        }

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

        return { success: true, message: "M9 completed -> delivery finished. Customer signoff recorded.", deliveryId: input.deliveryId };
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

      // Stage-specific checks
      if (input.currentStage === "M8_Installation") {
        // M8: Check shipment status
        try {
          const db = await requireDb();
          const shipments = await db
            .select()
            .from(deliveryShipments)
            .where(eq(deliveryShipments.deliveryId, input.deliveryId))
            .limit(1000);
          if (shipments.length === 0) {
            issues.push("M8: 尚未创建发货记录");
            score -= 15;
          } else {
            const unshipped = shipments.filter((s) => s.status === "preparing");
            if (unshipped.length > 0) {
              issues.push(`M8: ${unshipped.length} 个发货批次尚未发出`);
              score -= unshipped.length * 10;
            }
          }
        } catch {
          // DB unavailable — skip this check
        }
      }

      if (input.currentStage === "M10_Site_Installation") {
        // M10: Check installation checklist completion
        try {
          const db = await requireDb();
          const installs = await db
            .select()
            .from(deliveryInstallations)
            .where(eq(deliveryInstallations.deliveryId, input.deliveryId))
            .limit(1000);
          if (installs.length === 0) {
            issues.push("M10: 尚未创建安装记录");
            score -= 15;
          } else {
            const inst = installs[0];
            const completionRate = inst.checklistTotalCount && inst.checklistTotalCount > 0
              ? (inst.checklistCompletedCount ?? 0) / inst.checklistTotalCount
              : 0;
            if (completionRate < 1.0) {
              issues.push(`M10: 安装清单完成率 ${(completionRate * 100).toFixed(0)}% (需100%)`);
              score -= Math.round((1 - completionRate) * 40);
            }
            if ((inst.openIssueCount ?? 0) > 0) {
              issues.push(`M10: ${inst.openIssueCount} 个安装问题未关闭`);
              score -= (inst.openIssueCount ?? 0) * 10;
            }
          }
        } catch {
          // DB unavailable — skip
        }
      }

      if (input.currentStage === "M9_Final_Acceptance") {
        // M9/SAT: Check SAT test results and punch list
        try {
          const db = await requireDb();
          const sats = await db
            .select()
            .from(deliverySatRecords)
            .where(eq(deliverySatRecords.deliveryId, input.deliveryId))
            .limit(1000);
          if (sats.length === 0) {
            issues.push("SAT: 尚未创建验收测试记录");
            score -= 20;
          } else {
            const sat = sats[0];
            if ((sat.testFailCount ?? 0) > 0) {
              issues.push(`SAT: ${sat.testFailCount} 项测试未通过`);
              score -= (sat.testFailCount ?? 0) * 15;
            }
            if ((sat.punchListOpenCount ?? 0) > 0) {
              issues.push(`SAT: ${sat.punchListOpenCount} 项Punch List待解决`);
              score -= (sat.punchListOpenCount ?? 0) * 8;
            }
          }
        } catch {
          // DB unavailable — skip
        }
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

  /** Get configurable gate checklist items by stage */
  getChecklistItems: protectedProcedure
    .input(z.object({
      gateStage: z.enum(["M7", "M8", "M9"]),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(gateChecklistItems)
        .where(eq(gateChecklistItems.gateStage, input.gateStage))
        .orderBy(asc(gateChecklistItems.sortOrder), asc(gateChecklistItems.id))
        .limit(1000);
      return rows;
    }),

  /** Create a gate checklist item */
  createChecklistItem: protectedProcedure
    .input(z.object({
      gateStage: z.enum(["M7", "M8", "M9"]),
      category: z.string().min(1),
      item: z.string().min(1),
      criteria: z.string().optional(),
      weight: z.number().min(0).max(100).default(5),
      required: z.boolean().default(false),
      sortOrder: z.number().default(0),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .insert(gateChecklistItems)
        .values({
          gateStage: input.gateStage,
          category: input.category,
          item: input.item,
          criteria: input.criteria ?? null,
          weight: input.weight,
          required: input.required ? 1 : 0,
          sortOrder: input.sortOrder,
          isActive: input.isActive ? 1 : 0,
        })
        .returning();
      return { success: true, id: row.id };
    }),

  /** Update a gate checklist item */
  updateChecklistItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      category: z.string().optional(),
      item: z.string().optional(),
      criteria: z.string().optional(),
      weight: z.number().min(0).max(100).optional(),
      required: z.boolean().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;
      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };

      if (fields.category !== undefined) updates.category = fields.category;
      if (fields.item !== undefined) updates.item = fields.item;
      if (fields.criteria !== undefined) updates.criteria = fields.criteria;
      if (fields.weight !== undefined) updates.weight = fields.weight;
      if (fields.required !== undefined) updates.required = fields.required ? 1 : 0;
      if (fields.sortOrder !== undefined) updates.sortOrder = fields.sortOrder;
      if (fields.isActive !== undefined) updates.isActive = fields.isActive ? 1 : 0;

      await db.update(gateChecklistItems).set(updates).where(eq(gateChecklistItems.id, id));
      return { success: true, message: "Checklist item updated" };
    }),

  /** Delete a gate checklist item */
  deleteChecklistItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(gateChecklistItems).where(eq(gateChecklistItems.id, input.id));
      return { success: true, message: "Checklist item deleted" };
    }),

  /** Import template items for a gate stage (bulk insert) */
  importTemplate: protectedProcedure
    .input(z.object({
      gateStage: z.enum(["M7", "M8", "M9"]),
      items: z.array(z.object({
        category: z.string(),
        item: z.string(),
        criteria: z.string().optional(),
        weight: z.number().optional(),
        required: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const values = input.items.map((item, idx) => ({
        gateStage: input.gateStage as "M7" | "M8" | "M9",
        category: item.category,
        item: item.item,
        criteria: item.criteria ?? null,
        weight: item.weight ?? 5,
        required: item.required ? 1 : 0,
        sortOrder: item.sortOrder ?? idx,
        isActive: 1,
      }));

      if (values.length > 0) {
        await db.insert(gateChecklistItems).values(values);
      }

      return { success: true, imported: values.length };
    }),
});

// ========== M8 Shipment sub-router ==========

const shipmentSubRouter = router({
  /** Create a shipment record for M8 */
  create: protectedProcedure
    .input(
      z.object({
        deliveryId: z.number(),
        carrier: z.string().optional(),
        carrierContact: z.string().optional(),
        carrierPhone: z.string().optional(),
        transportMode: z.enum(["truck", "rail", "sea", "air"]).default("truck"),
        trackingNumber: z.string().optional(),
        vehiclePlate: z.string().optional(),
        estimatedArrival: z.string().optional(),
        totalBoxes: z.number().optional(),
        totalWeight: z.number().optional(),
        totalVolume: z.number().optional(),
        packingListItems: z.array(z.object({
          itemName: z.string(),
          partNo: z.string().optional(),
          qty: z.number().default(1),
          weight: z.number().optional(),
          boxNo: z.string().optional(),
          remarks: z.string().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const shipmentCode = generateCode("SHP");
      const packingItems = input.packingListItems ?? defaultPackingListItems();

      try {
        const db = await requireDb();
        const [row] = await db
          .insert(deliveryShipments)
          .values({
            deliveryId: input.deliveryId,
            shipmentCode,
            carrier: input.carrier ?? null,
            carrierContact: input.carrierContact ?? null,
            carrierPhone: input.carrierPhone ?? null,
            transportMode: input.transportMode,
            trackingNumber: input.trackingNumber ?? null,
            vehiclePlate: input.vehiclePlate ?? null,
            estimatedArrival: input.estimatedArrival ?? null,
            totalBoxes: input.totalBoxes ?? packingItems.length,
            totalWeight: input.totalWeight ? String(input.totalWeight) : null,
            totalVolume: input.totalVolume ? String(input.totalVolume) : null,
            packingListItems: JSON.stringify(packingItems),
            status: "preparing",
            createdBy: ctx.user.id,
          })
          .returning();

        return { success: true, id: row.id, shipmentCode };
      } catch (e: any) {
        return { success: false, message: e.message, id: null, shipmentCode };
      }
    }),

  /** List shipments for a delivery */
  listByDelivery: protectedProcedure
    .input(z.object({ deliveryId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const rows = await db
          .select()
          .from(deliveryShipments)
          .where(eq(deliveryShipments.deliveryId, input.deliveryId))
          .orderBy(desc(deliveryShipments.createdAt))
          .limit(1000);
        return { items: rows, total: rows.length };
      } catch {
        return { items: [], total: 0 };
      }
    }),

  /** Get a single shipment by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [row] = await db
          .select()
          .from(deliveryShipments)
          .where(eq(deliveryShipments.id, input.id));
        return row ?? null;
      } catch {
        return null;
      }
    }),

  /** Update packing list items */
  updatePackingList: protectedProcedure
    .input(
      z.object({
        shipmentId: z.number(),
        packingListItems: z.array(z.object({
          seq: z.number().optional(),
          itemName: z.string(),
          partNo: z.string().optional(),
          qty: z.number().default(1),
          weight: z.number().optional(),
          boxNo: z.string().optional(),
          remarks: z.string().optional(),
          checked: z.boolean().optional(),
        })),
        totalBoxes: z.number().optional(),
        totalWeight: z.number().optional(),
        totalVolume: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const numberedItems = input.packingListItems.map((item, idx) => ({
          ...item,
          seq: item.seq ?? idx + 1,
        }));

        await db.update(deliveryShipments).set({
          packingListItems: JSON.stringify(numberedItems),
          totalBoxes: input.totalBoxes ?? numberedItems.length,
          totalWeight: input.totalWeight ? String(input.totalWeight) : undefined,
          totalVolume: input.totalVolume ? String(input.totalVolume) : undefined,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryShipments.id, input.shipmentId));

        return { success: true, message: "Packing list updated" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Approve packing list */
  approvePackingList: protectedProcedure
    .input(z.object({ shipmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        await db.update(deliveryShipments).set({
          packingListApprovedBy: ctx.user.id,
          packingListApprovedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryShipments.id, input.shipmentId));
        return { success: true, message: "Packing list approved" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Mark shipment as dispatched (in transit) */
  dispatch: protectedProcedure
    .input(z.object({
      shipmentId: z.number(),
      trackingNumber: z.string().optional(),
      carrier: z.string().optional(),
      vehiclePlate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const now = new Date().toISOString();
        await db.update(deliveryShipments).set({
          status: "in_transit",
          shippedAt: now,
          trackingNumber: input.trackingNumber ?? undefined,
          carrier: input.carrier ?? undefined,
          vehiclePlate: input.vehiclePlate ?? undefined,
          updatedAt: now,
        }).where(eq(deliveryShipments.id, input.shipmentId));
        return { success: true, message: "Shipment dispatched — now in transit" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Mark shipment as delivered */
  markDelivered: protectedProcedure
    .input(z.object({ shipmentId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        await db.update(deliveryShipments).set({
          status: "delivered",
          actualArrival: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryShipments.id, input.shipmentId));
        return { success: true, message: "Shipment marked as delivered" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Record receiving inspection */
  recordReceiving: protectedProcedure
    .input(z.object({
      shipmentId: z.number(),
      receivingResult: z.enum(["pass", "partial_damage", "major_damage"]),
      receivingNotes: z.string().optional(),
      damageReport: z.array(z.object({
        boxNo: z.string(),
        description: z.string(),
        photoUrl: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const now = new Date().toISOString();
        const newStatus = input.receivingResult === "major_damage" ? "delivered" : "verified";

        await db.update(deliveryShipments).set({
          status: newStatus,
          receivedBy: ctx.user.id,
          receivedByName: ctx.user.name,
          receivedAt: now,
          receivingResult: input.receivingResult,
          receivingNotes: input.receivingNotes ?? null,
          damageReport: input.damageReport ? JSON.stringify(input.damageReport) : null,
          updatedAt: now,
        }).where(eq(deliveryShipments.id, input.shipmentId));

        if (input.receivingResult === "major_damage") {
          return {
            success: true,
            message: "Major damage reported — shipment remains in 'delivered' status pending resolution. Create site issue tickets for damaged items.",
            requiresAction: true,
          };
        }

        return { success: true, message: "Receiving inspection recorded" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Get shipment statistics for a delivery */
  getStats: protectedProcedure
    .input(z.object({ deliveryId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const shipments = await db
          .select()
          .from(deliveryShipments)
          .where(eq(deliveryShipments.deliveryId, input.deliveryId))
          .limit(1000);

        const byStatus: Record<string, number> = {
          preparing: 0,
          in_transit: 0,
          delivered: 0,
          received: 0,
          verified: 0,
        };
        let totalWeight = 0;
        let totalBoxes = 0;

        for (const s of shipments) {
          if (s.status) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
          totalWeight += Number(s.totalWeight ?? 0);
          totalBoxes += Number(s.totalBoxes ?? 0);
        }

        return {
          total: shipments.length,
          byStatus,
          totalWeight,
          totalBoxes,
          allReceived: shipments.length > 0 && shipments.every(
            (s) => s.status === "received" || s.status === "verified"
          ),
        };
      } catch {
        return {
          total: 0,
          byStatus: {},
          totalWeight: 0,
          totalBoxes: 0,
          allReceived: false,
        };
      }
    }),
});

// ========== M9 Installation sub-router ==========

const installationSubRouter = router({
  /** Create an installation record with default checklist */
  create: protectedProcedure
    .input(
      z.object({
        deliveryId: z.number(),
        leadEngineerName: z.string().optional(),
        leadEngineerId: z.number().optional(),
        teamMembers: z.array(z.object({
          id: z.number().optional(),
          name: z.string(),
          role: z.string().optional(),
        })).optional(),
        targetCompletionDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const installationCode = generateCode("INST");
      const checklist = defaultInstallationChecklist();

      try {
        const db = await requireDb();
        const [row] = await db
          .insert(deliveryInstallations)
          .values({
            deliveryId: input.deliveryId,
            installationCode,
            leadEngineerId: input.leadEngineerId ?? null,
            leadEngineerName: input.leadEngineerName ?? null,
            teamMembers: input.teamMembers ? JSON.stringify(input.teamMembers) : null,
            checklist: JSON.stringify(checklist),
            checklistCompletedCount: 0,
            checklistTotalCount: checklist.length,
            openIssueCount: 0,
            criticalIssueCount: 0,
            targetCompletionDate: input.targetCompletionDate ?? null,
            startDate: new Date().toISOString(),
            status: "in_progress",
            createdBy: ctx.user.id,
          })
          .returning();

        return { success: true, id: row.id, installationCode };
      } catch (e: any) {
        return { success: false, message: e.message, id: null, installationCode };
      }
    }),

  /** Get installation record for a delivery */
  getByDelivery: protectedProcedure
    .input(z.object({ deliveryId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const rows = await db
          .select()
          .from(deliveryInstallations)
          .where(eq(deliveryInstallations.deliveryId, input.deliveryId))
          .orderBy(desc(deliveryInstallations.createdAt))
          .limit(1000);
        return rows[0] ?? null;
      } catch {
        return null;
      }
    }),

  /** Get installation by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [row] = await db
          .select()
          .from(deliveryInstallations)
          .where(eq(deliveryInstallations.id, input.id));
        return row ?? null;
      } catch {
        return null;
      }
    }),

  /** Update a checklist item result */
  updateChecklistItem: protectedProcedure
    .input(
      z.object({
        installationId: z.number(),
        seq: z.number(),
        result: z.enum(["pass", "fail", "na"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const [installation] = await db
          .select()
          .from(deliveryInstallations)
          .where(eq(deliveryInstallations.id, input.installationId));

        if (!installation) {
          return { success: false, message: "Installation record not found" };
        }

        const checklist: any[] = installation.checklist
          ? JSON.parse(installation.checklist)
          : [];

        const itemIdx = checklist.findIndex((c) => c.seq === input.seq);
        if (itemIdx === -1) {
          return { success: false, message: `Checklist item seq=${input.seq} not found` };
        }

        checklist[itemIdx] = {
          ...checklist[itemIdx],
          result: input.result,
          notes: input.notes ?? checklist[itemIdx].notes,
          completedBy: ctx.user.name,
          completedAt: new Date().toISOString(),
        };

        const completedCount = checklist.filter(
          (c) => c.result === "pass" || c.result === "fail" || c.result === "na"
        ).length;

        await db.update(deliveryInstallations).set({
          checklist: JSON.stringify(checklist),
          checklistCompletedCount: completedCount,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryInstallations.id, input.installationId));

        return {
          success: true,
          message: `Checklist item #${input.seq} updated to ${input.result}`,
          completedCount,
          totalCount: checklist.length,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Bulk update multiple checklist items */
  updateChecklistBulk: protectedProcedure
    .input(
      z.object({
        installationId: z.number(),
        updates: z.array(z.object({
          seq: z.number(),
          result: z.enum(["pass", "fail", "na"]),
          notes: z.string().optional(),
        })),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const [installation] = await db
          .select()
          .from(deliveryInstallations)
          .where(eq(deliveryInstallations.id, input.installationId));

        if (!installation) {
          return { success: false, message: "Installation record not found" };
        }

        const checklist: any[] = installation.checklist
          ? JSON.parse(installation.checklist)
          : [];

        for (const update of input.updates) {
          const itemIdx = checklist.findIndex((c) => c.seq === update.seq);
          if (itemIdx !== -1) {
            checklist[itemIdx] = {
              ...checklist[itemIdx],
              result: update.result,
              notes: update.notes ?? checklist[itemIdx].notes,
              completedBy: ctx.user.name,
              completedAt: new Date().toISOString(),
            };
          }
        }

        const completedCount = checklist.filter(
          (c) => c.result === "pass" || c.result === "fail" || c.result === "na"
        ).length;

        await db.update(deliveryInstallations).set({
          checklist: JSON.stringify(checklist),
          checklistCompletedCount: completedCount,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryInstallations.id, input.installationId));

        return {
          success: true,
          message: `${input.updates.length} checklist items updated`,
          completedCount,
          totalCount: checklist.length,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Add an installation issue */
  addIssue: protectedProcedure
    .input(
      z.object({
        installationId: z.number(),
        title: z.string().min(1),
        severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const [installation] = await db
          .select()
          .from(deliveryInstallations)
          .where(eq(deliveryInstallations.id, input.installationId));

        if (!installation) {
          return { success: false, message: "Installation record not found" };
        }

        const issues: any[] = installation.issues
          ? JSON.parse(installation.issues)
          : [];

        const newIssue = {
          id: issues.length + 1,
          title: input.title,
          severity: input.severity,
          description: input.description ?? "",
          resolution: null,
          status: "open",
          reportedAt: new Date().toISOString(),
          resolvedAt: null,
        };
        issues.push(newIssue);

        const openCount = issues.filter((i) => i.status === "open").length;
        const criticalCount = issues.filter(
          (i) => i.severity === "critical" && i.status === "open"
        ).length;

        await db.update(deliveryInstallations).set({
          issues: JSON.stringify(issues),
          openIssueCount: openCount,
          criticalIssueCount: criticalCount,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryInstallations.id, input.installationId));

        return {
          success: true,
          message: `Issue "${input.title}" added`,
          issueId: newIssue.id,
          openCount,
          criticalCount,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Resolve an installation issue */
  resolveIssue: protectedProcedure
    .input(
      z.object({
        installationId: z.number(),
        issueId: z.number(),
        resolution: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const [installation] = await db
          .select()
          .from(deliveryInstallations)
          .where(eq(deliveryInstallations.id, input.installationId));

        if (!installation) {
          return { success: false, message: "Installation record not found" };
        }

        const issues: any[] = installation.issues
          ? JSON.parse(installation.issues)
          : [];

        const issueIdx = issues.findIndex((i) => i.id === input.issueId);
        if (issueIdx === -1) {
          return { success: false, message: `Issue #${input.issueId} not found` };
        }

        issues[issueIdx] = {
          ...issues[issueIdx],
          resolution: input.resolution,
          status: "resolved",
          resolvedAt: new Date().toISOString(),
        };

        const openCount = issues.filter((i) => i.status === "open").length;
        const criticalCount = issues.filter(
          (i) => i.severity === "critical" && i.status === "open"
        ).length;

        await db.update(deliveryInstallations).set({
          issues: JSON.stringify(issues),
          openIssueCount: openCount,
          criticalIssueCount: criticalCount,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryInstallations.id, input.installationId));

        return {
          success: true,
          message: `Issue #${input.issueId} resolved`,
          openCount,
          criticalCount,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Record commissioning result */
  recordCommissioning: protectedProcedure
    .input(
      z.object({
        installationId: z.number(),
        result: z.enum(["pass", "conditional_pass", "fail"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const newStatus = input.result === "fail" ? "blocked" : "commissioning";

        await db.update(deliveryInstallations).set({
          commissioningResult: input.result,
          commissioningNotes: input.notes ?? null,
          commissioningDate: new Date().toISOString(),
          status: newStatus,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryInstallations.id, input.installationId));

        return {
          success: true,
          message: input.result === "fail"
            ? "Commissioning failed — installation blocked"
            : `Commissioning result: ${input.result}`,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Record training completion */
  recordTraining: protectedProcedure
    .input(
      z.object({
        installationId: z.number(),
        topics: z.array(z.object({
          topic: z.string(),
          duration: z.string().optional(),
          attendees: z.array(z.string()).optional(),
          date: z.string().optional(),
        })),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        await db.update(deliveryInstallations).set({
          trainingCompleted: true,
          trainingTopics: JSON.stringify(input.topics),
          status: "training",
          updatedAt: new Date().toISOString(),
        }).where(eq(deliveryInstallations.id, input.installationId));

        return { success: true, message: "Training completion recorded" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Record customer sign-off for installation */
  recordSignoff: protectedProcedure
    .input(
      z.object({
        installationId: z.number(),
        customerName: z.string().min(1),
        notes: z.string().optional(),
        signoffFile: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const now = new Date().toISOString();

        await db.update(deliveryInstallations).set({
          customerSignoffName: input.customerName,
          customerSignoffDate: now,
          customerSignoffNotes: input.notes ?? null,
          customerSignoffFile: input.signoffFile ?? null,
          status: "completed",
          actualCompletionDate: now,
          updatedAt: now,
        }).where(eq(deliveryInstallations.id, input.installationId));

        return { success: true, message: "Installation sign-off recorded. Installation complete." };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Get installation progress summary */
  getProgress: protectedProcedure
    .input(z.object({ deliveryId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [inst] = await db
          .select()
          .from(deliveryInstallations)
          .where(eq(deliveryInstallations.deliveryId, input.deliveryId));

        if (!inst) {
          return {
            exists: false,
            checklistProgress: 0,
            openIssues: 0,
            criticalIssues: 0,
            commissioned: false,
            trained: false,
            signedOff: false,
            status: "none",
          };
        }

        const checklistProgress = inst.checklistTotalCount && inst.checklistTotalCount > 0
          ? Math.round(((inst.checklistCompletedCount ?? 0) / inst.checklistTotalCount) * 100)
          : 0;

        return {
          exists: true,
          installationId: inst.id,
          installationCode: inst.installationCode,
          checklistProgress,
          checklistCompleted: inst.checklistCompletedCount ?? 0,
          checklistTotal: inst.checklistTotalCount ?? 0,
          openIssues: inst.openIssueCount ?? 0,
          criticalIssues: inst.criticalIssueCount ?? 0,
          commissioned: !!inst.commissioningResult,
          commissioningResult: inst.commissioningResult,
          trained: inst.trainingCompleted ?? false,
          signedOff: !!inst.customerSignoffName,
          status: inst.status ?? "pending",
        };
      } catch {
        return {
          exists: false,
          checklistProgress: 0,
          openIssues: 0,
          criticalIssues: 0,
          commissioned: false,
          trained: false,
          signedOff: false,
          status: "error",
        };
      }
    }),
});

// ========== M10 SAT (Site Acceptance Test) sub-router ==========

const satSubRouter = router({
  /** Create a SAT record with default test template */
  create: protectedProcedure
    .input(
      z.object({
        deliveryId: z.number(),
        cycleTimeTarget: z.number().optional(),
        uptimeTarget: z.number().optional(),
        qualityYieldTarget: z.number().optional(),
        testReportItems: z.array(z.object({
          seq: z.number().optional(),
          testName: z.string(),
          category: z.string().optional(),
          acceptance: z.string().optional(),
          method: z.string().optional(),
          target: z.string().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const satCode = generateCode("SAT");
      const testItems = input.testReportItems ?? defaultSatTestItems();

      try {
        const db = await requireDb();
        const [row] = await db
          .insert(deliverySatRecords)
          .values({
            deliveryId: input.deliveryId,
            satCode,
            testReportItems: JSON.stringify(testItems),
            testPassCount: 0,
            testFailCount: 0,
            testTotalCount: testItems.length,
            overallTestResult: null,
            punchListItems: JSON.stringify([]),
            punchListOpenCount: 0,
            punchListTotalCount: 0,
            cycleTimeTarget: input.cycleTimeTarget ? String(input.cycleTimeTarget) : null,
            uptimeTarget: input.uptimeTarget ? String(input.uptimeTarget) : null,
            qualityYieldTarget: input.qualityYieldTarget ? String(input.qualityYieldTarget) : null,
            status: "testing",
            createdBy: ctx.user.id,
          })
          .returning();

        return { success: true, id: row.id, satCode };
      } catch (e: any) {
        return { success: false, message: e.message, id: null, satCode };
      }
    }),

  /** Get SAT record for a delivery */
  getByDelivery: protectedProcedure
    .input(z.object({ deliveryId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const rows = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.deliveryId, input.deliveryId))
          .orderBy(desc(deliverySatRecords.createdAt))
          .limit(1000);
        return rows[0] ?? null;
      } catch {
        return null;
      }
    }),

  /** Get SAT by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [row] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.id, input.id));
        return row ?? null;
      } catch {
        return null;
      }
    }),

  /** Record a single test result */
  recordTestResult: protectedProcedure
    .input(
      z.object({
        satId: z.number(),
        seq: z.number(),
        actual: z.string(),
        result: z.enum(["pass", "fail", "na"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const [sat] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.id, input.satId));

        if (!sat) {
          return { success: false, message: "SAT record not found" };
        }

        const testItems: any[] = sat.testReportItems
          ? JSON.parse(sat.testReportItems)
          : [];

        const itemIdx = testItems.findIndex((t) => t.seq === input.seq);
        if (itemIdx === -1) {
          return { success: false, message: `Test item seq=${input.seq} not found` };
        }

        testItems[itemIdx] = {
          ...testItems[itemIdx],
          actual: input.actual,
          result: input.result,
          notes: input.notes ?? testItems[itemIdx].notes,
          testedBy: ctx.user.name,
          testedAt: new Date().toISOString(),
        };

        const passCount = testItems.filter((t) => t.result === "pass").length;
        const failCount = testItems.filter((t) => t.result === "fail").length;

        await db.update(deliverySatRecords).set({
          testReportItems: JSON.stringify(testItems),
          testPassCount: passCount,
          testFailCount: failCount,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliverySatRecords.id, input.satId));

        return {
          success: true,
          message: `Test #${input.seq} recorded: ${input.result}`,
          passCount,
          failCount,
          totalCount: testItems.length,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Bulk record test results */
  recordTestResultsBulk: protectedProcedure
    .input(
      z.object({
        satId: z.number(),
        results: z.array(z.object({
          seq: z.number(),
          actual: z.string(),
          result: z.enum(["pass", "fail", "na"]),
          notes: z.string().optional(),
        })),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const [sat] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.id, input.satId));

        if (!sat) {
          return { success: false, message: "SAT record not found" };
        }

        const testItems: any[] = sat.testReportItems
          ? JSON.parse(sat.testReportItems)
          : [];

        for (const result of input.results) {
          const itemIdx = testItems.findIndex((t) => t.seq === result.seq);
          if (itemIdx !== -1) {
            testItems[itemIdx] = {
              ...testItems[itemIdx],
              actual: result.actual,
              result: result.result,
              notes: result.notes ?? testItems[itemIdx].notes,
              testedBy: ctx.user.name,
              testedAt: new Date().toISOString(),
            };
          }
        }

        const passCount = testItems.filter((t) => t.result === "pass").length;
        const failCount = testItems.filter((t) => t.result === "fail").length;

        await db.update(deliverySatRecords).set({
          testReportItems: JSON.stringify(testItems),
          testPassCount: passCount,
          testFailCount: failCount,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliverySatRecords.id, input.satId));

        return {
          success: true,
          message: `${input.results.length} test results recorded`,
          passCount,
          failCount,
          totalCount: testItems.length,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Record performance verification (cycle time, uptime, quality yield) */
  recordPerformance: protectedProcedure
    .input(
      z.object({
        satId: z.number(),
        cycleTimeResult: z.number().optional(),
        uptimeHours: z.number().optional(),
        qualityYieldResult: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const [sat] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.id, input.satId));

        if (!sat) {
          return { success: false, message: "SAT record not found" };
        }

        const updates: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };

        const verdicts: { metric: string; pass: boolean; actual: string; target: string }[] = [];

        if (input.cycleTimeResult !== undefined) {
          const target = Number(sat.cycleTimeTarget ?? 0);
          const pass = target > 0 ? input.cycleTimeResult <= target : true;
          updates.cycleTimeResult = String(input.cycleTimeResult);
          updates.cycleTimePass = pass;
          verdicts.push({ metric: "cycleTime", pass, actual: String(input.cycleTimeResult), target: String(target) });
        }

        if (input.uptimeHours !== undefined) {
          const target = Number(sat.uptimeTarget ?? 0);
          const pass = target > 0 ? input.uptimeHours >= target : true;
          updates.uptimeHours = String(input.uptimeHours);
          updates.uptimePass = pass;
          verdicts.push({ metric: "uptime", pass, actual: String(input.uptimeHours), target: String(target) });
        }

        if (input.qualityYieldResult !== undefined) {
          const target = Number(sat.qualityYieldTarget ?? 0);
          const pass = target > 0 ? input.qualityYieldResult >= target : true;
          updates.qualityYieldResult = String(input.qualityYieldResult);
          updates.qualityYieldPass = pass;
          verdicts.push({ metric: "qualityYield", pass, actual: String(input.qualityYieldResult), target: String(target) });
        }

        await db.update(deliverySatRecords).set(updates)
          .where(eq(deliverySatRecords.id, input.satId));

        const allPassed = verdicts.every((v) => v.pass);

        return {
          success: true,
          message: allPassed
            ? "All performance metrics passed"
            : "Some performance metrics did not meet targets",
          verdicts,
          allPassed,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Add a punch list item */
  addPunchItem: protectedProcedure
    .input(
      z.object({
        satId: z.number(),
        title: z.string().min(1),
        severity: z.enum(["minor", "major", "critical"]).default("minor"),
        category: z.string().optional(),
        description: z.string().optional(),
        assignee: z.string().optional(),
        targetDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const [sat] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.id, input.satId));

        if (!sat) {
          return { success: false, message: "SAT record not found" };
        }

        const punchItems: any[] = sat.punchListItems
          ? JSON.parse(sat.punchListItems)
          : [];

        const newItem = {
          seq: punchItems.length + 1,
          title: input.title,
          severity: input.severity,
          category: input.category ?? "general",
          description: input.description ?? "",
          assignee: input.assignee ?? null,
          targetDate: input.targetDate ?? null,
          status: "open",
          resolvedAt: null,
          evidence: null,
        };
        punchItems.push(newItem);

        const openCount = punchItems.filter((p) => p.status === "open").length;

        await db.update(deliverySatRecords).set({
          punchListItems: JSON.stringify(punchItems),
          punchListOpenCount: openCount,
          punchListTotalCount: punchItems.length,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliverySatRecords.id, input.satId));

        return {
          success: true,
          message: `Punch list item "${input.title}" added`,
          punchItemSeq: newItem.seq,
          openCount,
          totalCount: punchItems.length,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Resolve a punch list item */
  resolvePunchItem: protectedProcedure
    .input(
      z.object({
        satId: z.number(),
        seq: z.number(),
        evidence: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const [sat] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.id, input.satId));

        if (!sat) {
          return { success: false, message: "SAT record not found" };
        }

        const punchItems: any[] = sat.punchListItems
          ? JSON.parse(sat.punchListItems)
          : [];

        const itemIdx = punchItems.findIndex((p) => p.seq === input.seq);
        if (itemIdx === -1) {
          return { success: false, message: `Punch list item #${input.seq} not found` };
        }

        punchItems[itemIdx] = {
          ...punchItems[itemIdx],
          status: "resolved",
          resolvedAt: new Date().toISOString(),
          evidence: input.evidence ?? null,
        };

        const openCount = punchItems.filter((p) => p.status === "open").length;

        await db.update(deliverySatRecords).set({
          punchListItems: JSON.stringify(punchItems),
          punchListOpenCount: openCount,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliverySatRecords.id, input.satId));

        return {
          success: true,
          message: `Punch list item #${input.seq} resolved`,
          openCount,
          totalCount: punchItems.length,
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Calculate overall test result */
  calculateOverallResult: protectedProcedure
    .input(z.object({ satId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const [sat] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.id, input.satId));

        if (!sat) {
          return { success: false, message: "SAT record not found" };
        }

        const testItems: any[] = sat.testReportItems
          ? JSON.parse(sat.testReportItems)
          : [];

        const passCount = testItems.filter((t) => t.result === "pass").length;
        const failCount = testItems.filter((t) => t.result === "fail").length;
        const naCount = testItems.filter((t) => t.result === "na").length;
        const untestedCount = testItems.length - passCount - failCount - naCount;

        // Performance checks
        const cycleTimeOk = sat.cycleTimePass !== false;
        const uptimeOk = sat.uptimePass !== false;
        const qualityOk = sat.qualityYieldPass !== false;
        const performanceAllPassed = cycleTimeOk && uptimeOk && qualityOk;

        const openPunchItems = sat.punchListOpenCount ?? 0;

        let overallResult: string;
        if (failCount === 0 && untestedCount === 0 && performanceAllPassed && openPunchItems === 0) {
          overallResult = "pass";
        } else if (failCount > 0 && failCount <= 2 && performanceAllPassed) {
          overallResult = "conditional_pass";
        } else if (openPunchItems > 0 && failCount === 0) {
          overallResult = "conditional_pass";
        } else {
          overallResult = "fail";
        }

        await db.update(deliverySatRecords).set({
          overallTestResult: overallResult,
          testPassCount: passCount,
          testFailCount: failCount,
          status: overallResult === "fail" ? "testing" : "punch_review",
          updatedAt: new Date().toISOString(),
        }).where(eq(deliverySatRecords.id, input.satId));

        return {
          success: true,
          overallResult,
          summary: {
            pass: passCount,
            fail: failCount,
            na: naCount,
            untested: untestedCount,
            total: testItems.length,
            performanceAllPassed,
            openPunchItems,
          },
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Submit SAT for final approval */
  submitForApproval: protectedProcedure
    .input(z.object({
      satId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const [sat] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.id, input.satId));

        if (!sat) {
          return { success: false, message: "SAT record not found" };
        }

        // Block submission if overall result is fail
        if (sat.overallTestResult === "fail") {
          return {
            success: false,
            message: "Cannot submit for approval — overall SAT result is FAIL. Resolve failing tests first.",
          };
        }

        await db.update(deliverySatRecords).set({
          status: "approval",
          approvalNotes: input.notes ?? null,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliverySatRecords.id, input.satId));

        return { success: true, message: "SAT submitted for final approval" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Final approval for SAT */
  approve: protectedProcedure
    .input(z.object({
      satId: z.number(),
      approvalStatus: z.enum(["approved", "conditional", "rejected"]),
      notes: z.string().optional(),
      conditionalItems: z.array(z.string()).optional(),
      warrantyMonths: z.number().default(12),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const now = new Date();
        const warrantyEnd = new Date(now);
        warrantyEnd.setMonth(warrantyEnd.getMonth() + input.warrantyMonths);

        const updates: Record<string, any> = {
          approvalStatus: input.approvalStatus,
          approvedBy: ctx.user.id,
          approvedByName: ctx.user.name,
          approvedAt: now.toISOString(),
          approvalNotes: input.notes ?? null,
          updatedAt: now.toISOString(),
        };

        if (input.approvalStatus === "rejected") {
          updates.status = "testing";
        } else {
          updates.status = "completed";
          updates.warrantyStartDate = now.toISOString();
          updates.warrantyEndDate = warrantyEnd.toISOString();
          if (input.conditionalItems && input.conditionalItems.length > 0) {
            updates.conditionalItems = JSON.stringify(input.conditionalItems);
          }
        }

        await db.update(deliverySatRecords).set(updates)
          .where(eq(deliverySatRecords.id, input.satId));

        if (input.approvalStatus === "rejected") {
          return { success: true, message: "SAT approval rejected — returned to testing phase" };
        }

        return {
          success: true,
          message: `SAT ${input.approvalStatus}. Warranty: ${now.toISOString().slice(0, 10)} to ${warrantyEnd.toISOString().slice(0, 10)}`,
          warrantyStart: now.toISOString(),
          warrantyEnd: warrantyEnd.toISOString(),
        };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Record customer final signoff on SAT */
  recordCustomerSignoff: protectedProcedure
    .input(z.object({
      satId: z.number(),
      customerName: z.string().min(1),
      signoffFile: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        await db.update(deliverySatRecords).set({
          customerFinalSignoffName: input.customerName,
          customerFinalSignoffDate: new Date().toISOString(),
          customerFinalSignoffFile: input.signoffFile ?? null,
          updatedAt: new Date().toISOString(),
        }).where(eq(deliverySatRecords.id, input.satId));

        return { success: true, message: "Customer final signoff recorded on SAT" };
      } catch (e: any) {
        return { success: false, message: e.message };
      }
    }),

  /** Get SAT progress summary */
  getProgress: protectedProcedure
    .input(z.object({ deliveryId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [sat] = await db
          .select()
          .from(deliverySatRecords)
          .where(eq(deliverySatRecords.deliveryId, input.deliveryId));

        if (!sat) {
          return {
            exists: false,
            testProgress: 0,
            punchListOpen: 0,
            overallResult: null,
            approvalStatus: null,
            status: "none",
          };
        }

        const tested = (sat.testPassCount ?? 0) + (sat.testFailCount ?? 0);
        const testProgress = sat.testTotalCount && sat.testTotalCount > 0
          ? Math.round((tested / sat.testTotalCount) * 100)
          : 0;

        return {
          exists: true,
          satId: sat.id,
          satCode: sat.satCode,
          testProgress,
          testPass: sat.testPassCount ?? 0,
          testFail: sat.testFailCount ?? 0,
          testTotal: sat.testTotalCount ?? 0,
          punchListOpen: sat.punchListOpenCount ?? 0,
          punchListTotal: sat.punchListTotalCount ?? 0,
          overallResult: sat.overallTestResult,
          approvalStatus: sat.approvalStatus,
          cycleTimePass: sat.cycleTimePass,
          uptimePass: sat.uptimePass,
          qualityYieldPass: sat.qualityYieldPass,
          customerSignedOff: !!sat.customerFinalSignoffName,
          status: sat.status ?? "pending",
        };
      } catch {
        return {
          exists: false,
          testProgress: 0,
          punchListOpen: 0,
          overallResult: null,
          approvalStatus: null,
          status: "error",
        };
      }
    }),
});

// ========== Combined delivery router ==========

export const deliveryRouter = router({
  delivery: deliverySubRouter,
  siteIssue: siteIssueSubRouter,
  gateCheck: gateCheckSubRouter,
  stageTransition: stageTransitionSubRouter,
  shipment: shipmentSubRouter,
  installation: installationSubRouter,
  sat: satSubRouter,

  // Backward-compat flat endpoints (old placeholder shape — now DB-backed)
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(deliveryExecutions)
      .orderBy(desc(deliveryExecutions.createdAt))
      .limit(20);
    const [totalRow] = await db.select({ count: count() }).from(deliveryExecutions);
    return { items: rows, total: totalRow?.count ?? rows.length };
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(deliveryExecutions)
        .where(eq(deliveryExecutions.id, Number(input.id)));
      return row ?? null;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        customerName: z.string().optional(),
        siteAddress: z.string().optional(),
        siteContactName: z.string().optional(),
        siteContactPhone: z.string().optional(),
        plannedM7Date: z.string().optional(),
        plannedM8Date: z.string().optional(),
        plannedM9Date: z.string().optional(),
        specialRequirements: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;
      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };

      if (fields.customerName !== undefined) updates.customerName = fields.customerName;
      if (fields.siteAddress !== undefined) updates.siteAddress = fields.siteAddress;
      if (fields.siteContactName !== undefined) updates.siteContactName = fields.siteContactName;
      if (fields.siteContactPhone !== undefined) updates.siteContactPhone = fields.siteContactPhone;
      if (fields.plannedM7Date !== undefined) updates.plannedM7Date = new Date(fields.plannedM7Date);
      if (fields.plannedM8Date !== undefined) updates.plannedM8Date = new Date(fields.plannedM8Date);
      if (fields.plannedM9Date !== undefined) updates.plannedM9Date = new Date(fields.plannedM9Date);
      if (fields.specialRequirements !== undefined) updates.specialRequirements = fields.specialRequirements;
      if (fields.status !== undefined) updates.status = fields.status;

      await db.update(deliveryExecutions).set(updates).where(eq(deliveryExecutions.id, Number(id)));
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(deliveryExecutions).set({
        status: "Cancelled",
        updatedAt: new Date().toISOString(),
      }).where(eq(deliveryExecutions.id, Number(input.id)));
      return { success: true };
    }),

  /** Cross-cutting: Get full M8-M10 dashboard stats */
  getDashboardStats: protectedProcedure.query(async () => {
    const db = await requireDb();

    // Delivery stage breakdown
    const stageRows = await db
      .select({ stage: deliveryExecutions.currentStage, count: count() })
      .from(deliveryExecutions)
      .groupBy(deliveryExecutions.currentStage);

    const byStage: Record<string, number> = {};
    let totalDeliveries = 0;
    for (const row of stageRows) {
      if (row.stage) byStage[row.stage] = Number(row.count);
      totalDeliveries += Number(row.count);
    }

    // Open site issues
    const [issueRow] = await db
      .select({ count: count() })
      .from(siteIssueTickets)
      .where(eq(siteIssueTickets.status, "Open"));

    // Active shipments (in_transit)
    const [shipmentRow] = await db
      .select({ count: count() })
      .from(deliveryShipments)
      .where(eq(deliveryShipments.status, "in_transit"));

    // Active installations (in_progress)
    const [installRow] = await db
      .select({ count: count() })
      .from(deliveryInstallations)
      .where(eq(deliveryInstallations.status, "in_progress"));

    // Pending SAT approvals
    const [satRow] = await db
      .select({ count: count() })
      .from(deliverySatRecords)
      .where(eq(deliverySatRecords.status, "approval"));

    return {
      deliveries: { byStage, total: totalDeliveries },
      openIssues: Number(issueRow?.count ?? 0),
      activeShipments: Number(shipmentRow?.count ?? 0),
      activeInstallations: Number(installRow?.count ?? 0),
      pendingSatApprovals: Number(satRow?.count ?? 0),
    };
  }),
});
