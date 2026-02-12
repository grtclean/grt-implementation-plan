/**
 * T1-T15 工序管理路由
 * 基于 生产与AI.txt 文档设计
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

// T工序定义
const T_PROCESS_DEFINITIONS = [
  { code: "T1", nameZh: "机加工", nameEn: "Machining", category: "MANUFACTURING", standardHours: 40, description: "零部件机械加工" },
  { code: "T2", nameZh: "冷作", nameEn: "Cold Work", category: "MANUFACTURING", standardHours: 24, description: "钣金、焊接等冷加工" },
  { code: "T3", nameZh: "机械部件装配", nameEn: "Sub-assembly", category: "MANUFACTURING", standardHours: 32, description: "子部件组装" },
  { code: "T4", nameZh: "机械装配", nameEn: "Mechanical Assembly", category: "MANUFACTURING", standardHours: 48, description: "机械系统组装" },
  { code: "T5", nameZh: "机械总装", nameEn: "Final Mechanical Assembly", category: "MANUFACTURING", standardHours: 56, description: "整机机械总装" },
  { code: "T6", nameZh: "电气装配", nameEn: "Electrical Assembly", category: "MANUFACTURING", standardHours: 40, description: "电气系统安装" },
  { code: "T7", nameZh: "设备调试", nameEn: "System Debugging", category: "MANUFACTURING", standardHours: 32, description: "整机调试测试" },
  { code: "T8", nameZh: "跑和", nameEn: "Running-in/Burn-in", category: "MANUFACTURING", standardHours: 24, description: "设备老化测试" },
  { code: "T9", nameZh: "包装", nameEn: "Packaging", category: "LOGISTICS", standardHours: 8, description: "设备包装" },
  { code: "T10", nameZh: "发货", nameEn: "Shipping", category: "LOGISTICS", standardHours: 4, description: "设备发运" },
  { code: "T11", nameZh: "卸车", nameEn: "Unloading", category: "SITE_DELIVERY", standardHours: 4, description: "现场卸货" },
  { code: "T12", nameZh: "就位", nameEn: "Positioning", category: "SITE_DELIVERY", standardHours: 8, description: "设备就位安装" },
  { code: "T13", nameZh: "水电气连接", nameEn: "Utility Connection", category: "SITE_DELIVERY", standardHours: 16, description: "水电气接入" },
  { code: "T14", nameZh: "现场调试", nameEn: "Site Debug/SAT", category: "SITE_DELIVERY", standardHours: 40, description: "现场调试验收" },
  { code: "T15", nameZh: "终验收", nameEn: "Final Acceptance", category: "SITE_DELIVERY", standardHours: 8, description: "最终验收签字" },
];

// 模拟项目工序实例数据
const mockProjectProcessInstances = [
  {
    id: 1,
    projectId: 1,
    projectName: "IC-2000 工业清洗系统",
    workOrderNo: "WO-2026-001",
    processCode: "T1",
    status: "COMPLETED",
    completionPercentage: 100,
    plannedHours: 40,
    actualHours: 38,
    assignedTeam: "A组",
    plannedStartDate: "2026-01-02",
    plannedEndDate: "2026-01-08",
    actualStartDate: "2026-01-02",
    actualEndDate: "2026-01-07",
  },
  {
    id: 2,
    projectId: 1,
    projectName: "IC-2000 工业清洗系统",
    workOrderNo: "WO-2026-001",
    processCode: "T2",
    status: "COMPLETED",
    completionPercentage: 100,
    plannedHours: 24,
    actualHours: 26,
    assignedTeam: "B组",
    plannedStartDate: "2026-01-08",
    plannedEndDate: "2026-01-11",
    actualStartDate: "2026-01-08",
    actualEndDate: "2026-01-12",
  },
  {
    id: 3,
    projectId: 1,
    projectName: "IC-2000 工业清洗系统",
    workOrderNo: "WO-2026-001",
    processCode: "T3",
    status: "IN_PROGRESS",
    completionPercentage: 75,
    plannedHours: 32,
    actualHours: 24,
    assignedTeam: "A组",
    plannedStartDate: "2026-01-12",
    plannedEndDate: "2026-01-16",
    actualStartDate: "2026-01-13",
    actualEndDate: null,
  },
  {
    id: 4,
    projectId: 1,
    projectName: "IC-2000 工业清洗系统",
    workOrderNo: "WO-2026-001",
    processCode: "T4",
    status: "NOT_STARTED",
    completionPercentage: 0,
    plannedHours: 48,
    actualHours: 0,
    assignedTeam: "A组",
    plannedStartDate: "2026-01-17",
    plannedEndDate: "2026-01-23",
    actualStartDate: null,
    actualEndDate: null,
  },
  {
    id: 5,
    projectId: 2,
    projectName: "UC-3000 超声波清洗机",
    workOrderNo: "WO-2026-002",
    processCode: "T1",
    status: "IN_PROGRESS",
    completionPercentage: 60,
    plannedHours: 36,
    actualHours: 22,
    assignedTeam: "C组",
    plannedStartDate: "2026-01-15",
    plannedEndDate: "2026-01-20",
    actualStartDate: "2026-01-15",
    actualEndDate: null,
  },
];

// 模拟M2关键信息标签
const mockM2Tags = [
  {
    id: 1,
    projectId: 1,
    tagCategory: "CUSTOMER_REQUIREMENT",
    tagName: "清洁度要求",
    tagValue: "ISO 16232 Class 12",
    relatedProcessCodes: ["T7", "T14"],
    priority: "HIGH",
    aiConfidence: 0.95,
    isVerified: true,
  },
  {
    id: 2,
    projectId: 1,
    tagCategory: "DELIVERY_CONSTRAINT",
    tagName: "交付时间约束",
    tagValue: "2026-02-28前必须完成FAT",
    relatedProcessCodes: ["T7", "T8"],
    priority: "CRITICAL",
    aiConfidence: 0.98,
    isVerified: true,
  },
  {
    id: 3,
    projectId: 1,
    tagCategory: "TECHNICAL_SPEC",
    tagName: "特殊工艺要求",
    tagValue: "采用改性醇清洗剂，真空干燥",
    relatedProcessCodes: ["T7", "T14"],
    priority: "HIGH",
    aiConfidence: 0.92,
    isVerified: false,
  },
  {
    id: 4,
    projectId: 1,
    tagCategory: "RISK_FACTOR",
    tagName: "供应商风险",
    tagValue: "真空泵供应商交期不稳定",
    relatedProcessCodes: ["T4", "T5"],
    priority: "MEDIUM",
    aiConfidence: 0.85,
    isVerified: true,
  },
];

// 模拟AI SOP推荐
const mockAiSopRecommendations = [
  {
    id: 1,
    processCode: "T7",
    sopCode: "SOP-T7-001",
    sopTitle: "IC系列设备调试标准流程",
    matchScore: 0.95,
    reason: "基于项目类型(IC-2000)和客户清洁度要求(ISO 16232)匹配",
    isAccepted: true,
  },
  {
    id: 2,
    processCode: "T14",
    sopCode: "SOP-T14-003",
    sopTitle: "Tier1客户现场调试规范",
    matchScore: 0.92,
    reason: "客户为Tier1级别，需执行增强版SAT流程",
    isAccepted: null,
  },
];

// 模拟风险预警
const mockRiskAlerts = [
  {
    id: 1,
    projectId: 1,
    processCode: "T3",
    riskType: "SCHEDULE_DELAY",
    severity: "MEDIUM",
    title: "T3工序进度延迟风险",
    description: "当前完成度75%，距离计划结束仅剩1天，存在延期风险",
    suggestedActions: ["增加人力支援", "安排加班", "与后续工序协调"],
    status: "OPEN",
  },
  {
    id: 2,
    projectId: 1,
    processCode: "T4",
    riskType: "SUPPLIER_RISK",
    severity: "HIGH",
    title: "关键部件供应风险",
    description: "真空泵供应商反馈可能延迟3天交货",
    suggestedActions: ["联系备选供应商", "调整生产计划", "与客户沟通"],
    status: "ACKNOWLEDGED",
  },
];

export const processManagementRouter = router({
  // 获取T工序定义列表
  getProcessDefinitions: publicProcedure.query(() => {
    return T_PROCESS_DEFINITIONS;
  }),

  // 获取项目工序实例列表
  getProjectProcessInstances: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
      workOrderNo: z.string().optional(),
      status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "BLOCKED"]).optional(),
    }).optional())
    .query(({ input }) => {
      let result = [...mockProjectProcessInstances];
      
      if (input?.projectId) {
        result = result.filter(p => p.projectId === input.projectId);
      }
      if (input?.workOrderNo) {
        result = result.filter(p => p.workOrderNo === input.workOrderNo);
      }
      if (input?.status) {
        result = result.filter(p => p.status === input.status);
      }
      
      // 添加工序定义信息
      return result.map(instance => {
        const definition = T_PROCESS_DEFINITIONS.find(d => d.code === instance.processCode);
        return {
          ...instance,
          processNameZh: definition?.nameZh || "",
          processNameEn: definition?.nameEn || "",
          category: definition?.category || "",
        };
      });
    }),

  // 获取项目工序甘特图数据
  getProcessGanttData: publicProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(({ input }) => {
      const instances = mockProjectProcessInstances.filter(p => p.projectId === input.projectId);
      
      return instances.map(instance => {
        const definition = T_PROCESS_DEFINITIONS.find(d => d.code === instance.processCode);
        return {
          id: instance.id,
          name: `${instance.processCode} ${definition?.nameZh || ""}`,
          start: instance.actualStartDate || instance.plannedStartDate,
          end: instance.actualEndDate || instance.plannedEndDate,
          progress: instance.completionPercentage,
          status: instance.status,
          dependencies: instance.processCode !== "T1" ? [`T${parseInt(instance.processCode.slice(1)) - 1}`] : [],
        };
      });
    }),

  // 获取M2关键信息标签
  getM2Tags: publicProcedure
    .input(z.object({
      projectId: z.number(),
      category: z.string().optional(),
      verified: z.boolean().optional(),
    }))
    .query(({ input }) => {
      let result = mockM2Tags.filter(t => t.projectId === input.projectId);
      
      if (input.category) {
        result = result.filter(t => t.tagCategory === input.category);
      }
      if (input.verified !== undefined) {
        result = result.filter(t => t.isVerified === input.verified);
      }
      
      return result;
    }),

  // 获取AI SOP推荐
  getAiSopRecommendations: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
      processCode: z.string().optional(),
    }))
    .query(({ input }) => {
      let result = [...mockAiSopRecommendations];
      
      if (input?.processCode) {
        result = result.filter(r => r.processCode === input.processCode);
      }
      
      return result;
    }),

  // 接受/拒绝AI SOP推荐
  respondToSopRecommendation: protectedProcedure
    .input(z.object({
      recommendationId: z.number(),
      accepted: z.boolean(),
      feedback: z.string().optional(),
    }))
    .mutation(({ input }) => {
      // 模拟更新
      return {
        success: true,
        message: input.accepted ? "已采纳SOP推荐" : "已拒绝SOP推荐",
      };
    }),

  // 获取风险预警列表
  getRiskAlerts: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
      processCode: z.string().optional(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      status: z.enum(["OPEN", "ACKNOWLEDGED", "MITIGATED", "CLOSED"]).optional(),
    }))
    .query(({ input }) => {
      let result = [...mockRiskAlerts];
      
      if (input?.projectId) {
        result = result.filter(r => r.projectId === input.projectId);
      }
      if (input?.processCode) {
        result = result.filter(r => r.processCode === input.processCode);
      }
      if (input?.severity) {
        result = result.filter(r => r.severity === input.severity);
      }
      if (input?.status) {
        result = result.filter(r => r.status === input.status);
      }
      
      return result;
    }),

  // 确认风险预警
  acknowledgeRiskAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: "风险预警已确认",
      };
    }),

  // 更新工序状态
  updateProcessStatus: protectedProcedure
    .input(z.object({
      instanceId: z.number(),
      status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "BLOCKED"]),
      completionPercentage: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return {
        success: true,
        message: `工序状态已更新为 ${input.status}`,
      };
    }),

  // 获取工序统计看板数据
  getProcessDashboardStats: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }))
    .query(({ input }) => {
      const instances = input?.projectId 
        ? mockProjectProcessInstances.filter(p => p.projectId === input.projectId)
        : mockProjectProcessInstances;
      
      const stats = {
        total: instances.length,
        notStarted: instances.filter(p => p.status === "NOT_STARTED").length,
        inProgress: instances.filter(p => p.status === "IN_PROGRESS").length,
        completed: instances.filter(p => p.status === "COMPLETED").length,
        onHold: instances.filter(p => p.status === "ON_HOLD").length,
        blocked: instances.filter(p => p.status === "BLOCKED").length,
        avgCompletionRate: Math.round(instances.reduce((sum, p) => sum + p.completionPercentage, 0) / instances.length),
        totalPlannedHours: instances.reduce((sum, p) => sum + p.plannedHours, 0),
        totalActualHours: instances.reduce((sum, p) => sum + p.actualHours, 0),
        onTimeRate: Math.round((instances.filter(p => {
          if (p.status !== "COMPLETED") return true;
          return new Date(p.actualEndDate!) <= new Date(p.plannedEndDate);
        }).length / instances.length) * 100),
      };
      
      // 按工序分组统计
      const byProcess = T_PROCESS_DEFINITIONS.map(def => {
        const processInstances = instances.filter(p => p.processCode === def.code);
        return {
          code: def.code,
          nameZh: def.nameZh,
          category: def.category,
          count: processInstances.length,
          completed: processInstances.filter(p => p.status === "COMPLETED").length,
          inProgress: processInstances.filter(p => p.status === "IN_PROGRESS").length,
        };
      });
      
      return {
        summary: stats,
        byProcess,
        riskCount: mockRiskAlerts.filter(r => r.status === "OPEN").length,
        pendingSopRecommendations: mockAiSopRecommendations.filter(r => r.isAccepted === null).length,
      };
    }),
});

export type ProcessManagementRouter = typeof processManagementRouter;
