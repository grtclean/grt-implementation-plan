/**
 * 项目阶段门禁管理路由
 * M0-M12 阶段门禁管控
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

// M阶段定义
const M_STAGE_DEFINITIONS = [
  { code: "M0", nameZh: "项目启动", nameEn: "Project Initiation", category: "INITIATION", description: "项目立项、团队组建", requiredDeliverables: ["项目章程", "团队组建表", "初步预算"] },
  { code: "M1", nameZh: "启动会", nameEn: "Kickoff Meeting", category: "INITIATION", description: "项目启动会、需求确认", requiredDeliverables: ["启动会纪要", "需求确认书", "项目计划"] },
  { code: "M2", nameZh: "需求评审", nameEn: "Requirement Review", category: "PLANNING", description: "客户需求评审、技术方案", requiredDeliverables: ["需求规格书", "技术方案", "风险评估"] },
  { code: "M3", nameZh: "方案设计", nameEn: "Solution Design", category: "PLANNING", description: "详细设计、BOM确认", requiredDeliverables: ["详细设计图", "BOM清单", "成本估算"] },
  { code: "M4", nameZh: "设计评审", nameEn: "Design Review", category: "PLANNING", description: "设计评审、采购启动", requiredDeliverables: ["设计评审报告", "采购申请", "生产计划"] },
  { code: "M5", nameZh: "生产启动", nameEn: "Production Start", category: "EXECUTION", description: "生产启动、物料齐套", requiredDeliverables: ["生产工单", "物料齐套确认", "工艺文件"] },
  { code: "M6", nameZh: "生产完成", nameEn: "Production Complete", category: "EXECUTION", description: "生产完成、厂内调试", requiredDeliverables: ["生产完工报告", "调试记录", "质检报告"] },
  { code: "M7", nameZh: "FAT验收", nameEn: "Factory Acceptance Test", category: "VERIFICATION", description: "工厂验收测试", requiredDeliverables: ["FAT测试报告", "问题清单", "整改记录"] },
  { code: "M8", nameZh: "发货准备", nameEn: "Shipping Preparation", category: "DELIVERY", description: "包装发货准备", requiredDeliverables: ["包装清单", "发货通知", "运输方案"] },
  { code: "M9", nameZh: "现场到货", nameEn: "Site Arrival", category: "DELIVERY", description: "设备到达现场", requiredDeliverables: ["到货确认单", "开箱检验报告", "就位计划"] },
  { code: "M10", nameZh: "现场安装", nameEn: "Site Installation", category: "DELIVERY", description: "现场安装调试", requiredDeliverables: ["安装记录", "调试记录", "培训记录"] },
  { code: "M11", nameZh: "SAT验收", nameEn: "Site Acceptance Test", category: "VERIFICATION", description: "现场验收测试", requiredDeliverables: ["SAT测试报告", "验收签字", "遗留问题清单"] },
  { code: "M12", nameZh: "项目关闭", nameEn: "Project Closure", category: "CLOSURE", description: "项目关闭、经验总结", requiredDeliverables: ["项目总结报告", "经验教训", "客户满意度"] },
];

// 模拟项目阶段数据
const mockProjectStages = [
  {
    id: 1,
    projectId: 1,
    projectName: "IC-2000 工业清洗系统",
    projectNo: "PRJ-2026-001",
    currentStage: "M5",
    stageStatus: "IN_PROGRESS",
    stageProgress: 65,
    plannedStartDate: "2026-01-02",
    plannedEndDate: "2026-03-15",
    actualStartDate: "2026-01-02",
    actualEndDate: null,
    customerName: "某汽车零部件公司",
    customerTier: "TIER1",
    projectManager: "王工",
    stages: [
      { code: "M0", status: "COMPLETED", completedDate: "2026-01-02", score: 95 },
      { code: "M1", status: "COMPLETED", completedDate: "2026-01-05", score: 92 },
      { code: "M2", status: "COMPLETED", completedDate: "2026-01-10", score: 88 },
      { code: "M3", status: "COMPLETED", completedDate: "2026-01-15", score: 90 },
      { code: "M4", status: "COMPLETED", completedDate: "2026-01-18", score: 85 },
      { code: "M5", status: "IN_PROGRESS", completedDate: null, score: null },
      { code: "M6", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M7", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M8", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M9", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M10", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M11", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M12", status: "NOT_STARTED", completedDate: null, score: null },
    ],
  },
  {
    id: 2,
    projectId: 2,
    projectName: "UC-3000 超声波清洗机",
    projectNo: "PRJ-2026-002",
    currentStage: "M3",
    stageStatus: "IN_PROGRESS",
    stageProgress: 40,
    plannedStartDate: "2026-01-15",
    plannedEndDate: "2026-04-30",
    actualStartDate: "2026-01-15",
    actualEndDate: null,
    customerName: "精密机械有限公司",
    customerTier: "TIER2",
    projectManager: "李工",
    stages: [
      { code: "M0", status: "COMPLETED", completedDate: "2026-01-15", score: 90 },
      { code: "M1", status: "COMPLETED", completedDate: "2026-01-18", score: 88 },
      { code: "M2", status: "COMPLETED", completedDate: "2026-01-22", score: 92 },
      { code: "M3", status: "IN_PROGRESS", completedDate: null, score: null },
      { code: "M4", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M5", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M6", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M7", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M8", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M9", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M10", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M11", status: "NOT_STARTED", completedDate: null, score: null },
      { code: "M12", status: "NOT_STARTED", completedDate: null, score: null },
    ],
  },
];

// 模拟门禁检查项
const mockGateChecklist = [
  {
    id: 1,
    projectId: 1,
    stageCode: "M5",
    checkItem: "物料齐套确认",
    category: "MATERIAL",
    isRequired: true,
    status: "PASSED",
    checkedBy: "采购部",
    checkedAt: "2026-01-20",
    evidence: "物料齐套率100%",
  },
  {
    id: 2,
    projectId: 1,
    stageCode: "M5",
    checkItem: "生产工单下达",
    category: "PRODUCTION",
    isRequired: true,
    status: "PASSED",
    checkedBy: "生产部",
    checkedAt: "2026-01-20",
    evidence: "工单号WO-2026-001",
  },
  {
    id: 3,
    projectId: 1,
    stageCode: "M5",
    checkItem: "工艺文件齐全",
    category: "TECHNICAL",
    isRequired: true,
    status: "IN_PROGRESS",
    checkedBy: null,
    checkedAt: null,
    evidence: null,
  },
  {
    id: 4,
    projectId: 1,
    stageCode: "M5",
    checkItem: "质量控制计划",
    category: "QUALITY",
    isRequired: true,
    status: "NOT_STARTED",
    checkedBy: null,
    checkedAt: null,
    evidence: null,
  },
];

// 模拟红蓝对抗记录
const mockRedBlueRecords = [
  {
    id: 1,
    projectId: 1,
    stageCode: "M4",
    redTeamLeader: "张工",
    blueTeamLeader: "李工",
    scheduledDate: "2026-01-17",
    status: "COMPLETED",
    redTeamFindings: [
      "设计文档缺少边界条件说明",
      "BOM中部分物料交期风险",
      "客户特殊要求未完全体现",
    ],
    blueTeamResponses: [
      "已补充边界条件说明文档",
      "已联系备选供应商",
      "已更新设计方案",
    ],
    overallScore: 85,
    recommendation: "通过，但需跟踪物料交期风险",
  },
];

export const projectGateRouter = router({
  // 获取阶段定义列表
  getStageDefinitions: publicProcedure.query(() => {
    return M_STAGE_DEFINITIONS;
  }),

  // 获取项目阶段列表
  getProjectStages: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
      currentStage: z.string().optional(),
      customerTier: z.string().optional(),
    }).optional())
    .query(({ input }) => {
      let result = [...mockProjectStages];
      
      if (input?.projectId) {
        result = result.filter(p => p.projectId === input.projectId);
      }
      if (input?.currentStage) {
        result = result.filter(p => p.currentStage === input.currentStage);
      }
      if (input?.customerTier) {
        result = result.filter(p => p.customerTier === input.customerTier);
      }
      
      return result;
    }),

  // 获取项目阶段详情
  getProjectStageDetail: publicProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(({ input }) => {
      const project = mockProjectStages.find(p => p.projectId === input.projectId);
      if (!project) {
        throw new Error("项目不存在");
      }
      
      // 添加阶段定义信息
      const stagesWithDefinition = project.stages.map(stage => {
        const definition = M_STAGE_DEFINITIONS.find(d => d.code === stage.code);
        return {
          ...stage,
          nameZh: definition?.nameZh || "",
          nameEn: definition?.nameEn || "",
          category: definition?.category || "",
          description: definition?.description || "",
          requiredDeliverables: definition?.requiredDeliverables || [],
        };
      });
      
      return {
        ...project,
        stages: stagesWithDefinition,
      };
    }),

  // 获取门禁检查项
  getGateChecklist: publicProcedure
    .input(z.object({
      projectId: z.number(),
      stageCode: z.string(),
    }))
    .query(({ input }) => {
      return mockGateChecklist.filter(
        c => c.projectId === input.projectId && c.stageCode === input.stageCode
      );
    }),

  // 更新门禁检查项状态
  updateChecklistItem: protectedProcedure
    .input(z.object({
      checklistId: z.number(),
      status: z.enum(["NOT_STARTED", "IN_PROGRESS", "PASSED", "FAILED", "WAIVED"]),
      evidence: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: "检查项状态已更新",
      };
    }),

  // 申请阶段通过
  requestGatePass: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stageCode: z.string(),
      summary: z.string(),
      attachments: z.array(z.string()).optional(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        requestId: Date.now(),
        message: "门禁通过申请已提交",
      };
    }),

  // 审批阶段通过
  approveGatePass: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      approved: z.boolean(),
      score: z.number().min(0).max(100).optional(),
      comments: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: input.approved ? "门禁已批准通过" : "门禁申请已退回",
      };
    }),

  // 获取红蓝对抗记录
  getRedBlueRecords: publicProcedure
    .input(z.object({
      projectId: z.number(),
      stageCode: z.string().optional(),
    }))
    .query(({ input }) => {
      let result = mockRedBlueRecords.filter(r => r.projectId === input.projectId);
      if (input.stageCode) {
        result = result.filter(r => r.stageCode === input.stageCode);
      }
      return result;
    }),

  // 创建红蓝对抗
  createRedBlueSession: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stageCode: z.string(),
      redTeamLeader: z.string(),
      blueTeamLeader: z.string(),
      scheduledDate: z.string(),
      objectives: z.array(z.string()).optional(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        sessionId: Date.now(),
        message: "红蓝对抗会议已创建",
      };
    }),

  // 记录红蓝对抗结果
  recordRedBlueResult: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      redTeamFindings: z.array(z.string()),
      blueTeamResponses: z.array(z.string()),
      overallScore: z.number().min(0).max(100),
      recommendation: z.string(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: "红蓝对抗结果已记录",
      };
    }),

  // 获取项目阶段统计
  getStageStats: publicProcedure.query(() => {
    const stats = {
      totalProjects: mockProjectStages.length,
      byStage: M_STAGE_DEFINITIONS.map(def => ({
        code: def.code,
        nameZh: def.nameZh,
        count: mockProjectStages.filter(p => p.currentStage === def.code).length,
      })),
      byStatus: {
        onTrack: mockProjectStages.filter(p => p.stageStatus === "IN_PROGRESS" && p.stageProgress >= 50).length,
        atRisk: mockProjectStages.filter(p => p.stageStatus === "IN_PROGRESS" && p.stageProgress < 50).length,
        delayed: mockProjectStages.filter(p => p.stageStatus === "DELAYED").length,
        completed: mockProjectStages.filter(p => p.stageStatus === "COMPLETED").length,
      },
      tier1Projects: mockProjectStages.filter(p => p.customerTier === "TIER1").length,
      avgProgress: Math.round(mockProjectStages.reduce((sum, p) => sum + p.stageProgress, 0) / mockProjectStages.length),
    };
    
    return stats;
  }),

  // 获取即将到期的门禁
  getUpcomingGates: publicProcedure
    .input(z.object({
      days: z.number().default(7),
    }))
    .query(({ input }) => {
      // 模拟即将到期的门禁
      return [
        {
          projectId: 1,
          projectName: "IC-2000 工业清洗系统",
          currentStage: "M5",
          nextStage: "M6",
          dueDate: "2026-02-01",
          daysRemaining: 5,
          completionRate: 65,
          blockers: ["工艺文件待完成", "质量计划待审批"],
        },
      ];
    }),
});

export type ProjectGateRouter = typeof projectGateRouter;
