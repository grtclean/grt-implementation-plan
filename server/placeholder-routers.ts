/**
 * 占位符路由 - 用于解决前端TypeScript错误
 * 这些路由返回空数据或模拟数据，后续可以逐步实现完整功能
 */

import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { projects } from "../drizzle/schema";
import { mockProjects, mockGateDefinitions, mockGateReviews, mockCustomers, mockOpportunities, mockCapabilityDomains, mockCapabilities, mockEmployeeCapabilities, mockPositions, mockCandidates, mockEmployees, mockCostCategories, mockProjectCosts, mockQCRecords, mockServiceTickets, mockTrainings } from "./mock-data";
import { getAllMigrationTasks, getMigrationTaskById, createMigrationTask, updateMigrationTask, deleteMigrationTask, initDefaultMigrationTasks } from "./db";

// 通用的空列表响应
const emptyListResponse = { items: [], total: 0, page: 1, pageSize: 10 };

// 通用的成功响应
const successResponse = { success: true, message: "操作成功" };

// 通用的空数组响应
const emptyArray: any[] = [];

// ==================== 能力操作系统路由 ====================
export const capabilityOsRouter = router({
  // 基础CRUD
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 能力评估
  getAssessmentReport: publicProcedure.input(z.any()).query(() => ({ report: { domains: mockCapabilityDomains, capabilities: mockCapabilities } })),
  getEmployeeCapabilities: publicProcedure.input(z.any()).query(({ input }) => {
    const emp = mockEmployeeCapabilities.find(e => e.employeeId === input?.employeeId);
    return emp?.capabilities || [];
  }),
  getDevelopmentPath: publicProcedure.input(z.any()).query(() => mockCapabilities.slice(0, 5)),
  getUpgradeRules: publicProcedure.query(() => [
    { id: 'RULE-001', fromLevel: 'L1', toLevel: 'L2', requiredEvidences: 3, description: 'L1升L2需要3个能力证据' },
    { id: 'RULE-002', fromLevel: 'L2', toLevel: 'L3', requiredEvidences: 5, description: 'L2升L3需要5个能力证据' },
    { id: 'RULE-003', fromLevel: 'L3', toLevel: 'L4', requiredEvidences: 8, description: 'L3升L4需要8个能力证据' },
    { id: 'RULE-004', fromLevel: 'L4', toLevel: 'L5', requiredEvidences: 12, description: 'L4升L5需要12个能力证据' }
  ]),
  upgradeCapability: protectedProcedure.input(z.any()).mutation(() => successResponse),
  listCapabilities: publicProcedure.query(() => mockCapabilities),
  
  // 能力域
  getDomains: publicProcedure.query(() => mockCapabilityDomains),
  getMyCapabilities: publicProcedure.query(() => []),
  getMyEvidences: publicProcedure.query(() => []),
  getEvidenceTypes: publicProcedure.query(() => []),
  submitEvidence: protectedProcedure.input(z.any()).mutation(() => successResponse),
  reviewEvidence: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getPendingEvidences: publicProcedure.query(() => []),
  getAllEvidences: publicProcedure.query(() => []),
  
  // 徽章系统
  getAllBadges: publicProcedure.query(() => []),
  getUserBadges: publicProcedure.input(z.any()).query(() => []),
  getBadgeLeaderboard: publicProcedure.query(() => []),
  getBadgeStatistics: publicProcedure.query(() => ({ statistics: {} })),
  updateBadgeDisplay: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 排行榜
  getDomainLeaderboard: publicProcedure.input(z.any()).query(() => []),
  getOverallLeaderboard: publicProcedure.query(() => []),
  getProgressLeaderboard: publicProcedure.query(() => []),
  getLeaderboardStats: publicProcedure.query(() => ({ stats: {} })),
  
  // 证书
  getMyCertificates: publicProcedure.query(() => []),
  checkCertificateEligibility: publicProcedure.input(z.any()).query(() => ({ eligible: false, requirements: [] })),
  generateCertificate: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),
  verifyCertificateByQR: publicProcedure.input(z.any()).query(() => ({ valid: false, certificate: null })),
  
  // 检查点
  getAllEngineerCheckpoints: publicProcedure.query(() => []),
  approveCheckpoint: protectedProcedure.input(z.any()).mutation(() => successResponse),
  rejectCheckpoint: protectedProcedure.input(z.any()).mutation(() => successResponse),
  completePhase: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 路径推荐
  getPathRecommendation: publicProcedure.input(z.any()).query(() => ({
    userId: "user1",
    currentCapabilities: {
      T: { level: 3, points: 450 },
      S: { level: 2, points: 180 },
      D: { level: 3, points: 380 },
      C: { level: 2, points: 150 },
      K: { level: 1, points: 60 },
      L: { level: 1, points: 40 },
    },
    weakestDomains: [
      { code: "K", name: "知识沉淀", level: 1, gap: 1.5 },
      { code: "L", name: "领导力", level: 1, gap: 1.5 },
      { code: "C", name: "客户价值", level: 2, gap: 0.5 },
    ],
    strongestDomains: [
      { code: "T", name: "技术能力", level: 3 },
      { code: "D", name: "交付能力", level: 3 },
    ],
    recommendedPath: {
      shortTerm: [
        { action: "完成知识沉淀基础培训课程", domain: "K", expectedPoints: 30 },
        { action: "参与1个知识沉淀相关的简单项目", domain: "K", expectedPoints: 50 },
        { action: "完成领导力基础培训课程", domain: "L", expectedPoints: 30 },
      ],
      midTerm: [
        { action: "独立完成2-3个知识沉淀相关项目", domain: "K", expectedPoints: 150 },
        { action: "获取知识沉淀领域的专业认证", domain: "K", expectedPoints: 100 },
        { action: "独立完成2-3个客户价值相关项目", domain: "C", expectedPoints: 150 },
      ],
      longTerm: [
        { action: "成为知识沉淀领域的内部专家", domain: "K", expectedPoints: 200 },
        { action: "指导新人在知识沉淀领域的成长", domain: "K", expectedPoints: 100 },
      ],
    },
    projectOpportunities: [
      { id: "k1", name: "技术文档编写", description: "编写技术文档和操作手册", requiredDomains: ["K"], requiredLevel: 1, potentialPoints: 30, difficulty: "easy" },
      { id: "c1", name: "客户需求调研", description: "参与客户需求调研和分析", requiredDomains: ["C"], requiredLevel: 1, potentialPoints: 40, difficulty: "easy" },
      { id: "l1", name: "项目协调角色", description: "担任项目协调角色，锻炼协调能力", requiredDomains: ["L"], requiredLevel: 2, potentialPoints: 60, difficulty: "medium" },
    ],
    trainingResources: [
      { id: "kr1", name: "技术写作课程", description: "学习技术文档写作规范", targetDomain: "K", targetLevel: 2, duration: "4小时", type: "online" },
      { id: "lr1", name: "团队管理基础课程", description: "学习团队管理基础知识", targetDomain: "L", targetLevel: 2, duration: "8小时", type: "online" },
      { id: "cr1", name: "客户沟通技巧课程", description: "学习专业的客户沟通技巧", targetDomain: "C", targetLevel: 2, duration: "6小时", type: "online" },
    ],
    aiAnalysis: "根据您的能力数据分析，您在技术能力(T)和交付能力(D)方面表现优秀，已达到L3等级。建议优先提升知识沉淀(K)和领导力(L)两个短板领域。可以通过编写技术文档、参与内部培训等方式积累知识沉淀积分；通过担任项目协调角色来锻炼领导力。预计3-6个月内可以将这两个领域提升至L2等级。",
    generatedAt: new Date().toISOString(),
  })),
  
  // Agent单元
  getAgentUnits: publicProcedure.query(() => []),
  createAgentUnit: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateAgentUnitStatus: protectedProcedure.input(z.any()).mutation(() => successResponse),
  batchImportAgentUnits: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getAgentUnitStatistics: publicProcedure.query(() => ({ statistics: {} })),
  getAgentUnitImportHistory: publicProcedure.query(() => []),
  
  // 审批链
  getApprovalChainConfigs: publicProcedure.query(() => []),
  createApprovalChainConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateApprovalChainConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
  deleteApprovalChainConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // UWB定位
  getAllUWBTags: publicProcedure.query(() => []),
  getPositionHistory: publicProcedure.input(z.any()).query(() => []),
  getWorkshopOverview: publicProcedure.query(() => ({ overview: {} })),
  
  // 校准
  executeCalibrationCheck: protectedProcedure.input(z.any()).mutation(() => successResponse),
  recordCalibrationData: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getCalibrationTrend: publicProcedure.input(z.any()).query(() => []),
  
  // 清洗策略
  getAllCleaningStrategies: publicProcedure.query(() => []),
  
  // 牙膏测试
  getToothpasteTestRecords: publicProcedure.query(() => []),
  getToothpasteTestStatistics: publicProcedure.query(() => ({ statistics: {} })),
  getToothpasteTestTrend: publicProcedure.query(() => []),
  getToothpasteTestCount: publicProcedure.query(() => ({ count: 0 })),
  getToothpasteFeatureTypeStats: publicProcedure.query(() => ({ stats: {} })),
  exportToothpasteTestReport: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),
  
  // 技术提案
  generateTechnicalProposal: protectedProcedure.input(z.any()).mutation(() => ({ proposal: "" })),
  generateIOList: protectedProcedure.input(z.any()).mutation(() => ({ ioList: [] })),
  analyzePartFeatures: protectedProcedure.input(z.any()).mutation(() => []),
});

// ==================== 售后服务路由 ====================
export const afterSalesRouter = router({
  list: publicProcedure.query(() => ({ items: mockServiceTickets, total: mockServiceTickets.length, page: 1, pageSize: 10 })),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => mockServiceTickets.find(t => t.id === input.id) || null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  getStatistics: publicProcedure.query(() => ({
    total: mockServiceTickets.length,
    pending: mockServiceTickets.filter(t => t.status === 'pending').length,
    completed: mockServiceTickets.filter(t => t.status === 'completed').length,
    inProgress: mockServiceTickets.filter(t => t.status === 'in_progress').length
  })),

  // 客户子路由
  clients: router({
    list: publicProcedure.input(z.any()).query(() => mockCustomers.map(c => ({
      id: c.id,
      name: c.name,
      tier: c.type === 'tier1' ? 'Strategic' as const : 'Standard' as const,
      status: c.status === 'active' ? 'Active' as const : 'Inactive' as const,
      contactPerson: c.contact,
      contactPhone: c.phone,
      contactEmail: c.email,
      industry: c.industry,
      region: c.region,
    }))),
    create: protectedProcedure.input(z.any()).mutation(() => successResponse),
    update: protectedProcedure.input(z.any()).mutation(() => successResponse),
    delete: protectedProcedure.input(z.any()).mutation(() => successResponse),
  }),

  // 设备子路由
  equipments: router({
    list: publicProcedure.input(z.any()).query(() => [
      { id: 1, serialNumber: 'SN2025001', modelName: 'USC-3000', equipmentType: '超声波清洗机', operationalStatus: 'Running', location: '苏州工厂A区', lastMaintenanceDate: '2025-11-15', nextDueDate: '2026-05-15', runningHours: 1200, manufacturer: 'GRT', department: '生产部' },
      { id: 2, serialNumber: 'SN2025002', modelName: 'BCL-5000', equipmentType: '电池清洗线', operationalStatus: 'Running', location: '上海总部B区', lastMaintenanceDate: '2025-10-20', nextDueDate: '2026-04-20', runningHours: 800, manufacturer: 'GRT', department: '生产部' },
      { id: 3, serialNumber: 'SN2025003', modelName: 'PCW-2000', equipmentType: '零部件清洗机', operationalStatus: 'Idle', location: '芜湖工厂C区', lastMaintenanceDate: '2025-12-01', nextDueDate: '2026-06-01', runningHours: 600, manufacturer: 'GRT', department: '生产部' }
    ]),
    getDueSoon: publicProcedure.input(z.any()).query(() => []),
    create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  }),

  // 服务工单子路由
  serviceLogs: router({
    list: publicProcedure.input(z.any()).query(() => [
      { id: 1, ticketId: 'SVC-001', serviceType: 'Maintenance', priority: 'Medium', status: 'Completed', issueDescription: '设备定期保养', assignedEngineerName: '刘洋', scheduledDate: '2026-01-25', completionDate: '2026-01-25', equipmentSerialNumber: 'SN2025001', clientName: '博世苏州' },
      { id: 2, ticketId: 'SVC-002', serviceType: 'Repair', priority: 'High', status: 'In_Progress', issueDescription: '清洗喷头堵塞', assignedEngineerName: '张伟', scheduledDate: '2026-01-28', completionDate: null, equipmentSerialNumber: 'SN2025002', clientName: '采埃孚上海' },
      { id: 3, ticketId: 'SVC-003', serviceType: 'Inspection', priority: 'Low', status: 'Pending', issueDescription: '季度巡检', assignedEngineerName: null, scheduledDate: '2026-02-01', completionDate: null, equipmentSerialNumber: 'SN2025003', clientName: '大陆芜湖' }
    ]),
    create: protectedProcedure.input(z.any()).mutation(() => successResponse),
    complete: protectedProcedure.input(z.any()).mutation(() => ({ ...successResponse, workflowResult: true })),
  }),

  // 定时任务子路由
  scheduler: router({
    getStatus: publicProcedure.query(() => ({
      config: { enabled: false, checkTime: '09:00' },
      lastRunTime: null as string | null,
      nextRunTime: null as string | null,
    })),
    getHistory: publicProcedure.input(z.any()).query(() => [] as { status: string; executedAt: string; details: string }[]),
    start: protectedProcedure.mutation(() => ({ success: true, message: '定时任务已启动' })),
    stop: protectedProcedure.mutation(() => ({ success: true, message: '定时任务已停止' })),
    executeNow: protectedProcedure.mutation(() => ({ success: true, equipmentCount: 0, webhooksSent: 0, errors: [] as string[] })),
  }),

  // 签字确认子路由
  signature: router({
    getPendingLogs: publicProcedure.query(() => [] as { id: number; ticketId: string; serviceType: string; clientName: string; equipmentSerialNumber: string; serviceDate: string }[]),
    generateUrl: protectedProcedure.input(z.any()).mutation(() => ({ success: true, url: '/signature/mock-token', expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), error: null as string | null })),
    sendReminder: protectedProcedure.input(z.any()).mutation(() => ({ success: true, message: '提醒已发送' })),
  }),

  // 报告子路由
  report: router({
    generateMultiLanguage: protectedProcedure.input(z.any()).mutation(() => ({
      success: true,
      reports: [] as { title: string; language: string; content: string; aiGenerated: boolean; generatedAt: string }[],
      error: null as string | null,
    })),
  }),

  // 提醒子路由
  reminder: router({
    previewWeChatMessage: publicProcedure.input(z.any()).query(() => ({ message: '暂无维护提醒', reminderCount: 0 })),
    sendReminders: protectedProcedure.mutation(() => ({ success: true, notificationsSent: 0, remindersFound: 0, errors: [] as string[] })),
  }),

  // 工作流子路由
  workflow: router({
    syncAll: protectedProcedure.mutation(() => ({ successCount: 0, failedCount: 0 })),
  }),

  // 种子数据子路由
  seed: router({
    seedAll: protectedProcedure.mutation(() => ({
      success: true,
      summary: { clientsCreated: 0, equipmentsCreated: 0, logsCreated: 0 },
      errors: [] as string[],
    })),
    seedClients: protectedProcedure.mutation(() => ({ success: true, clientsCreated: 0 })),
    seedEquipments: protectedProcedure.mutation(() => ({ success: true, equipmentsCreated: 0 })),
    seedServiceLogs: protectedProcedure.mutation(() => ({ success: true, logsCreated: 0 })),
  }),
});

// ==================== 合规管理路由 ====================
export const complianceRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 规则管理
  getRules: publicProcedure.query(() => []),
  createRule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateRule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  deleteRule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  toggleRuleEnabled: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getRuleStats: publicProcedure.query(() => ({ stats: {} })),
  
  // 模板管理
  getTemplates: publicProcedure.query(() => []),
  createTemplate: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateTemplate: protectedProcedure.input(z.any()).mutation(() => successResponse),
  deleteTemplate: protectedProcedure.input(z.any()).mutation(() => successResponse),
  toggleTemplateEnabled: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getTemplateStats: publicProcedure.query(() => ({ stats: {} })),
  
  // 合规检查
  checkCompliance: publicProcedure.input(z.any()).query(() => ({ compliant: true, issues: [] })),
  triggerComplianceCheck: protectedProcedure.input(z.any()).mutation(() => successResponse),
  runGermanDailyCheckNow: protectedProcedure.mutation(() => successResponse),
  runUSWeeklyCheckNow: protectedProcedure.mutation(() => successResponse),
  
  // 审计
  getAuditStatistics: publicProcedure.query(() => ({ total: 0, passed: 0, failed: 0 })),
  
  // 报告
  getReportHistory: publicProcedure.query(() => []),
  getReportStats: publicProcedure.query(() => ({ stats: {} })),
  deleteReport: protectedProcedure.input(z.any()).mutation(() => successResponse),
  exportReport: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),
  
  // 警报
  getAlerts: publicProcedure.query(() => []),
  getPendingAlertCount: publicProcedure.query(() => ({ count: 0 })),
  
  // 审批
  getApprovalQueue: publicProcedure.query(() => []),
  
  // 仪表盘
  getDashboardStats: publicProcedure.query(() => ({ stats: {} })),
  
  // 员工状态
  getEmployeeStatus: publicProcedure.input(z.any()).query(() => ({ status: null })),
  getEmployeeTimeDetails: publicProcedure.input(z.any()).query(() => []),
  
  // AI分析
  getGeminiAnalysis: publicProcedure.input(z.any()).query(() => ({ analysis: null })),
  
  // 调度器
  getSchedulerStatus: publicProcedure.query(() => ({ status: "stopped" })),
  startSchedulers: protectedProcedure.mutation(() => successResponse),
  stopSchedulers: protectedProcedure.mutation(() => successResponse),
  
  // 测试数据
  seedTestData: protectedProcedure.mutation(() => successResponse),
});

// ==================== Webhook管理路由 ====================
// 导入Webhook服务
import {
  getAllWebhooks,
  getWebhook,
  registerWebhook,
  updateWebhook as updateWebhookConfig,
  deleteWebhook as deleteWebhookConfig,
} from './webhook';
import {
  initializeDefaultWebhooks,
  testWebhookConnection,
  getWebhookStats,
  sendAlertToWebhooks,
  sendMeetingReminderToWebhooks,
} from './webhook-enhanced';

export const webhookRouter = router({
  // 获取所有Webhook
  list: publicProcedure.query(() => {
    const webhooks = getAllWebhooks();
    return {
      items: webhooks,
      total: webhooks.length,
      page: 1,
      pageSize: webhooks.length,
    };
  }),
  
  // 获取单个Webhook
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    return getWebhook(input.id) || null;
  }),
  
  // 创建Webhook
  create: protectedProcedure.input(z.object({
    name: z.string(),
    type: z.enum(['wecom', 'dingtalk', 'feishu', 'custom']),
    url: z.string().url(),
    secret: z.string().optional(),
    enabled: z.boolean().default(false),
    description: z.string().optional(),
  })).mutation(({ input }) => {
    const webhook = registerWebhook(input);
    return { success: true, message: '创建成功', data: webhook };
  }),
  
  // 更新Webhook
  update: protectedProcedure.input(z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().url().optional(),
    secret: z.string().optional(),
    enabled: z.boolean().optional(),
  })).mutation(({ input }) => {
    const { id, ...updates } = input;
    const webhook = updateWebhookConfig(id, updates);
    if (!webhook) {
      return { success: false, message: 'Webhook不存在' };
    }
    return { success: true, message: '更新成功', data: webhook };
  }),
  
  // 删除Webhook
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => {
    const success = deleteWebhookConfig(input.id);
    return { success, message: success ? '删除成功' : 'Webhook不存在' };
  }),
  
  // 测试Webhook连接
  test: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const result = await testWebhookConnection(input.id);
    return { success: result.success, response: result };
  }),
  
  // 获取Webhook日志
  getLogs: publicProcedure.input(z.any()).query(() => []),
  
  // 切换Webhook状态
  toggle: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => {
    const webhook = getWebhook(input.id);
    if (!webhook) {
      return { success: false, message: 'Webhook不存在' };
    }
    const updated = updateWebhookConfig(input.id, { enabled: !webhook.enabled });
    return { success: true, message: updated?.enabled ? '已启用' : '已禁用' };
  }),
  
  // 获取所有Webhook
  getAll: publicProcedure.query(() => {
    const webhooks = getAllWebhooks();
    return { webhooks };
  }),
  
  // 获取Webhook统计
  getStats: publicProcedure.query(() => {
    return getWebhookStats();
  }),
  
  // 发送告警到Webhook
  sendAlert: protectedProcedure.input(z.object({
    level: z.enum(['info', 'warning', 'critical', 'emergency']),
    title: z.string(),
    description: z.string(),
    source: z.string(),
    projectId: z.string().optional(),
    projectName: z.string().optional(),
  })).mutation(async ({ input }) => {
    const result = await sendAlertToWebhooks({
      ...input,
      timestamp: new Date(),
    });
    return result;
  }),
  
  // 发送会议提醒到Webhook
  sendMeetingReminder: protectedProcedure.input(z.object({
    id: z.string(),
    title: z.string(),
    startTime: z.string(),
    location: z.string(),
    organizer: z.string(),
    participants: z.array(z.string()),
    agenda: z.string().optional(),
    reminderMinutes: z.number().default(15),
  })).mutation(async ({ input }) => {
    const result = await sendMeetingReminderToWebhooks({
      ...input,
      startTime: new Date(input.startTime),
    });
    return result;
  }),
  
  // 模板
  getTemplates: publicProcedure.query(() => []),
  createTemplate: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateTemplate: protectedProcedure.input(z.any()).mutation(() => successResponse),
  deleteTemplate: protectedProcedure.input(z.any()).mutation(() => successResponse),
  previewTemplate: publicProcedure.input(z.any()).query(() => ({ preview: "" })),
  initTemplates: protectedProcedure.mutation(() => successResponse),
  
  // 初始化默认Webhook
  seedDefaultWebhooks: protectedProcedure.mutation(() => {
    initializeDefaultWebhooks();
    return { success: true, message: '默认Webhook已初始化' };
  }),
});

// ==================== 议程管理路由 ====================
import { seedTrainingData, clearTrainingData, getTrainingStats } from "./training-seed.service";
import { trainingPlans, trainingParticipants, trainingCertificates, trainingAssessments } from "../drizzle/schema";
import { requireDb } from "./db";

export const agendaRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  getUpcoming: publicProcedure.query(() => []),
  
  // 会议
  getMeetings: publicProcedure.query(() => []),
  createMeeting: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getMeetingTypes: publicProcedure.query(() => []),
  initMeetingTypes: protectedProcedure.mutation(() => successResponse),
  
  // 培训 - 真实数据查询
  getTrainings: publicProcedure.query(async () => {
    try {
      const db = await requireDb();
      const trainings = await db.select().from(trainingPlans);
      return { trainings };
    } catch (error) {
      console.error('Get trainings error:', error);
      return { trainings: [] };
    }
  }),
  createTraining: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 培训测试数据种子
  seedTrainingData: protectedProcedure.mutation(async () => {
    const result = await seedTrainingData();
    return result;
  }),
  clearTrainingData: protectedProcedure.mutation(async () => {
    const result = await clearTrainingData();
    return result;
  }),
  getTrainingStats: publicProcedure.query(async () => {
    const stats = await getTrainingStats();
    return stats;
  }),
  
  // 参与者
  getParticipants: publicProcedure.input(z.any()).query(() => []),
  addParticipant: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateParticipant: protectedProcedure.input(z.any()).mutation(() => successResponse),
  batchAddParticipants: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 年度计划
  getAnnualPlans: publicProcedure.query(() => []),
});

// ==================== 命名规则路由 ====================
export const namingRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  validate: publicProcedure.input(z.any()).query(() => ({ valid: true, suggestions: [] })),
  generate: publicProcedure.input(z.any()).query(() => ({ name: "" })),

  // 项目编号 (sub-router)
  projectNumbers: router({
    getCounter: publicProcedure.input(z.object({ prefix: z.string() })).query(({ input }) => ({
      prefix: input.prefix,
      currentMax: input.prefix === "T" ? 500 : 100,
      nextAvailable: input.prefix === "T" ? 501 : 101,
      formatDigits: input.prefix === "T" ? 3 : 3,
    })),
    getConversionHistory: publicProcedure.query(() => [] as Array<{ id: string; tempProjectCode: string; formalProjectCode: string; contractNo: string | null; conversionDate: string; numberingVersion: string }>),
    initCounters: protectedProcedure.mutation(() => successResponse),
    generateNext: protectedProcedure.input(z.object({ prefix: z.string() })).mutation(({ input }) => `${input.prefix}${(input.prefix === "T" ? 501 : 101).toString().padStart(3, '0')}`),
    convert: protectedProcedure.input(z.object({ tempCode: z.string(), contractNo: z.string().optional() })).mutation(({ input }) => ({ formalCode: `GRT${input.tempCode.replace(/^T/, '')}` })),
  }),

  // 变更请求 (sub-router)
  changeRequests: router({
    list: publicProcedure.input(z.object({ status: z.string() }).optional()).query(() => [] as Array<{ id: string; requestCode: string; ruleType: string; requestType: string; title: string; status: string; requestorName: string; requestDate: string }>),
    create: protectedProcedure.input(z.object({
      requestType: z.string(),
      ruleType: z.string(),
      title: z.string(),
      description: z.string(),
      reason: z.string(),
      impactScope: z.string().optional(),
    })).mutation(() => successResponse),
    approve: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
    reject: protectedProcedure.input(z.object({ id: z.string(), notes: z.string().optional() })).mutation(() => successResponse),
  }),

  // 设备型号 (sub-router)
  equipmentModels: router({
    list: publicProcedure.input(z.object({ search: z.string() }).optional()).query(() => [] as Array<{ id: string; numericCode: string; functionCode: string; fullName: string; chineseName: string; processType: string | null; configLevel: string | null; chamberCount: number | null; status: string; namingVersion: string }>),
    create: protectedProcedure.input(z.any()).mutation(() => successResponse),
    initSample: protectedProcedure.mutation(() => ({ created: 0 })),
  }),

  // 审批人 (sub-router)
  approvers: router({
    list: publicProcedure.query(() => [] as Array<{ id: string; userId: number; ruleType: string; changeType: string; approvalLevel: number; isActive: boolean; remark: string | null }>),
    create: protectedProcedure.input(z.object({
      userId: z.number(),
      ruleType: z.string(),
      changeType: z.string(),
      approvalLevel: z.number().optional(),
      remark: z.string().optional(),
    })).mutation(() => successResponse),
    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  }),

  // 版本 (sub-router)
  versions: router({
    list: publicProcedure.query(() => [] as Array<{ id: string; versionCode: string; versionName: string | null; ruleType: string; changeType: string; effectiveDate: string; isCurrent: boolean; changeDescription: string | null }>),
    initDefault: protectedProcedure.mutation(() => successResponse),
  }),
});

// ==================== HRM路由 ====================
export const hrmRouter = router({
  list: publicProcedure.query(() => ({ items: mockEmployees, total: mockEmployees.length, page: 1, pageSize: 10 })),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => mockEmployees.find(e => e.id === input.id) || null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 员工
  getEmployees: publicProcedure.query(() => mockEmployees),
  
  // 部门
  getDepartments: publicProcedure.query(() => [
    { id: 'DEPT-001', name: '研发部', headcount: 15, manager: '张伟' },
    { id: 'DEPT-002', name: '销售部', headcount: 8, manager: '李明' },
    { id: 'DEPT-003', name: '技术服务部', headcount: 12, manager: '刘洋' },
    { id: 'DEPT-004', name: '生产部', headcount: 25, manager: '陈强' },
    { id: 'DEPT-005', name: '品管部', headcount: 6, manager: '赵敏' },
    { id: 'DEPT-006', name: '财务部', headcount: 4, manager: '周婷' }
  ]),
  
  // 候选人
  getCandidates: publicProcedure.query(() => mockCandidates),
  
  // 薪资结构
  getSalaryStructures: publicProcedure.query(() => [
    { id: 'SAL-001', level: 'P1', department: '研发部', baseSalary: 6000, bonus: 1000, description: '初级工程师', baseSalaryRatioMin: '0.50', baseSalaryRatioMax: '0.60', performanceRatioMin: '0.20', performanceRatioMax: '0.30', bonusRatioMin: '0.10', bonusRatioMax: '0.15', benefitsRatioMin: '0.05', benefitsRatioMax: '0.10', status: 'active' as const },
    { id: 'SAL-002', level: 'P2', department: '研发部', baseSalary: 10000, bonus: 2000, description: '中级工程师', baseSalaryRatioMin: '0.45', baseSalaryRatioMax: '0.55', performanceRatioMin: '0.25', performanceRatioMax: '0.30', bonusRatioMin: '0.10', bonusRatioMax: '0.20', benefitsRatioMin: '0.05', benefitsRatioMax: '0.10', status: 'active' as const },
    { id: 'SAL-003', level: 'P3', department: '销售部', baseSalary: 15000, bonus: 3000, description: '高级工程师', baseSalaryRatioMin: '0.40', baseSalaryRatioMax: '0.50', performanceRatioMin: '0.25', performanceRatioMax: '0.35', bonusRatioMin: '0.15', bonusRatioMax: '0.25', benefitsRatioMin: '0.05', benefitsRatioMax: '0.10', status: 'active' as const },
    { id: 'SAL-004', level: 'P4', department: '技术服务部', baseSalary: 22000, bonus: 5000, description: '资深工程师', baseSalaryRatioMin: '0.35', baseSalaryRatioMax: '0.45', performanceRatioMin: '0.30', performanceRatioMax: '0.35', bonusRatioMin: '0.15', bonusRatioMax: '0.25', benefitsRatioMin: '0.05', benefitsRatioMax: '0.10', status: 'active' as const },
    { id: 'SAL-005', level: 'M1', department: '生产部', baseSalary: 18000, bonus: 4000, description: '主管', baseSalaryRatioMin: '0.40', baseSalaryRatioMax: '0.50', performanceRatioMin: '0.25', performanceRatioMax: '0.30', bonusRatioMin: '0.15', bonusRatioMax: '0.25', benefitsRatioMin: '0.05', benefitsRatioMax: '0.10', status: 'active' as const },
    { id: 'SAL-006', level: 'M2', department: '品管部', baseSalary: 28000, bonus: 8000, description: '经理', baseSalaryRatioMin: '0.35', baseSalaryRatioMax: '0.45', performanceRatioMin: '0.30', performanceRatioMax: '0.35', bonusRatioMin: '0.15', bonusRatioMax: '0.25', benefitsRatioMin: '0.05', benefitsRatioMax: '0.10', status: 'active' as const }
  ]),
  
  // 绩效等级
  getPerformanceGrades: publicProcedure.query(() => [
    { id: 'PG-001', grade: 'S', description: '卓越', bonusRate: 2.0 },
    { id: 'PG-002', grade: 'A', description: '优秀', bonusRate: 1.5 },
    { id: 'PG-003', grade: 'B', description: '良好', bonusRate: 1.2 },
    { id: 'PG-004', grade: 'C', description: '合格', bonusRate: 1.0 },
    { id: 'PG-005', grade: 'D', description: '待改进', bonusRate: 0.5 }
  ]),
  
  // 职位
  getPositions: publicProcedure.query(() => mockPositions),
  
  // 考勤
  getAttendance: publicProcedure.input(z.any()).query(() => [
    { employeeId: 'EMP-001', date: '2026-01-30', checkIn: '08:55', checkOut: '18:10', status: 'normal' },
    { employeeId: 'EMP-002', date: '2026-01-30', checkIn: '09:15', checkOut: '18:05', status: 'late' },
    { employeeId: 'EMP-003', date: '2026-01-30', checkIn: '08:50', checkOut: '17:30', status: 'early_leave' }
  ]),
  
  // 请假
  getLeaveRequests: publicProcedure.query(() => [
    { id: 'LV-001', employeeId: 'EMP-001', type: 'annual', startDate: '2026-02-10', endDate: '2026-02-12', status: 'approved', reason: '家庭事务' },
    { id: 'LV-002', employeeId: 'EMP-003', type: 'sick', startDate: '2026-01-28', endDate: '2026-01-28', status: 'approved', reason: '身体不适' }
  ]),
  
  // 培训记录
  getTrainingRecords: publicProcedure.query(() => mockTrainings),
  
  // 组织架构
  getOrgChart: publicProcedure.query(() => ({
    chart: {
      id: 'CEO',
      name: '总经理',
      children: [
        { id: 'DEPT-001', name: '研发部', headcount: 15 },
        { id: 'DEPT-002', name: '销售部', headcount: 8 },
        { id: 'DEPT-003', name: '技术服务部', headcount: 12 },
        { id: 'DEPT-004', name: '生产部', headcount: 25 },
        { id: 'DEPT-005', name: '品管部', headcount: 6 }
      ]
    }
  })),
  
  // 统计
  getStatistics: publicProcedure.query(() => ({
    statistics: {
      totalEmployees: mockEmployees.length,
      activeEmployees: mockEmployees.filter(e => e.status === 'active').length,
      openPositions: mockPositions.reduce((sum, p) => sum + (p.headcount - p.filled), 0),
      pendingCandidates: mockCandidates.filter(c => c.status === 'new' || c.status === 'interviewing').length,
      upcomingTrainings: mockTrainings.filter(t => t.status === 'scheduled').length
    }
  })),

  // 薪酬初始化
  initSalaryStructures: protectedProcedure.mutation(() => ({ created: 0 })),
  initPerformanceGrades: protectedProcedure.mutation(() => ({ created: 0 })),

  // 薪酬计算
  calculateSalary: publicProcedure.input(z.object({
    department: z.string(),
    baseSalary: z.number(),
    performanceGrade: z.string().optional(),
    projectBonus: z.number().optional(),
  })).query(({ input }) => ({
    baseSalary: input.baseSalary,
    performanceSalary: Math.round(input.baseSalary * 0.3),
    bonus: Math.round(input.baseSalary * 0.2) + (input.projectBonus || 0),
    benefits: Math.round(input.baseSalary * 0.1),
    monthlyTotal: Math.round(input.baseSalary * 1.6) + (input.projectBonus || 0),
    annualTotal: Math.round(input.baseSalary * 1.6 * 12) + (input.projectBonus || 0) * 12,
    breakdown: {} as Record<string, unknown>,
  })),
  createSalaryCalculation: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // 定时任务
  getScheduledTasks: publicProcedure.query(() => [] as Array<{ id: string; taskName: string; taskType: string; cronExpression: string; isEnabled: boolean; lastRunAt: string | null }>),
  createScheduledTask: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateScheduledTask: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // Teams面试
  getTeamsMeetings: publicProcedure.query(() => [] as Array<{ id: string; subject: string; startTime: string; durationMinutes: number; status: string }>),
  createTeamsMeeting: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateTeamsMeeting: protectedProcedure.input(z.any()).mutation(() => successResponse),

  // AI绩效自动评分
  calculatePerformanceScore: publicProcedure
    .input(z.object({
      userId: z.number(),
      projectId: z.number(),
      stageCode: z.string().optional(),
    }))
    .query(({ input }) => {
      // 使用确定性种子生成模拟数据，确保同一输入返回一致的结果
      const seed = input.userId * 1000 + input.projectId + (input.stageCode ? input.stageCode.length * 7 : 0);

      // 效率评分 (40%): 基于实际工时与计划工时比率
      const plannedHours = 100 + (seed % 60);
      const actualHours = plannedHours * (0.7 + ((seed * 13) % 60) / 100);
      const hoursRatio = plannedHours / Math.max(actualHours, 1);
      const efficiencyRaw = Math.min(hoursRatio * 100, 100);
      const efficiencyScore = Math.round(Math.max(0, Math.min(100, efficiencyRaw)));

      // 质量评分 (30%): 基于步骤完成率
      const totalSteps = 20 + (seed % 15);
      const completedSteps = Math.round(totalSteps * (0.6 + ((seed * 7) % 40) / 100));
      const completionRate = completedSteps / totalSteps;
      const qualityScore = Math.round(Math.max(0, Math.min(100, completionRate * 100)));

      // 创新评分 (15%): 基于AI预设采用率
      const totalPresets = 10 + (seed % 8);
      const adoptedPresets = Math.round(totalPresets * (0.3 + ((seed * 11) % 50) / 100));
      const adoptionRate = adoptedPresets / totalPresets;
      const innovationScore = Math.round(Math.max(0, Math.min(100, adoptionRate * 100)));

      // 协作评分 (15%): 基于互动次数
      const interactionCount = 5 + ((seed * 3) % 30);
      const collaborationScore = Math.round(Math.max(0, Math.min(100, Math.min(interactionCount / 25, 1) * 100)));

      // 总分 = 加权求和
      const overallScore = Math.round(
        efficiencyScore * 0.4 +
        qualityScore * 0.3 +
        innovationScore * 0.15 +
        collaborationScore * 0.15
      );

      // 映射到绩效等级
      const grade = overallScore >= 90 ? "A"
        : overallScore >= 80 ? "B"
        : overallScore >= 70 ? "C"
        : overallScore >= 60 ? "D"
        : "E";

      // 生成AI改进建议
      const recommendations: string[] = [];
      if (efficiencyScore < 80) {
        recommendations.push("建议优化工时分配，减少非核心任务的时间投入，提高交付效率");
      }
      if (qualityScore < 80) {
        recommendations.push("建议加强阶段交付物检查，确保每个步骤完整完成后再进入下一步");
      }
      if (innovationScore < 60) {
        recommendations.push("建议积极尝试AI预设工具，利用自动化提升工作产出质量");
      }
      if (collaborationScore < 70) {
        recommendations.push("建议增加与团队成员的沟通互动，参与评审和知识分享活动");
      }
      if (overallScore >= 90) {
        recommendations.push("表现卓越，建议担任导师角色，帮助团队其他成员提升绩效");
      }
      if (recommendations.length === 0) {
        recommendations.push("整体表现良好，保持当前工作节奏，关注持续改进");
      }

      return {
        overallScore,
        grade,
        dimensions: {
          efficiency: {
            score: efficiencyScore,
            detail: `计划工时 ${plannedHours}h, 实际工时 ${Math.round(actualHours)}h, 效率比 ${(hoursRatio * 100).toFixed(1)}%`,
          },
          quality: {
            score: qualityScore,
            detail: `总步骤 ${totalSteps}, 已完成 ${completedSteps}, 完成率 ${(completionRate * 100).toFixed(1)}%`,
          },
          innovation: {
            score: innovationScore,
            detail: `可用AI预设 ${totalPresets}, 已采用 ${adoptedPresets}, 采用率 ${(adoptionRate * 100).toFixed(1)}%`,
          },
          collaboration: {
            score: collaborationScore,
            detail: `团队互动 ${interactionCount} 次, 活跃度 ${Math.min(interactionCount / 25 * 100, 100).toFixed(1)}%`,
          },
        },
        recommendations,
      };
    }),
});

// ==================== 报表模板路由 ====================
export const reportTemplateRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  generate: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),
  
  // 导出导入
  export: protectedProcedure.input(z.any()).mutation(() => ({ data: "" })),
  import: protectedProcedure.input(z.any()).mutation(() => successResponse),
  validateImport: publicProcedure.input(z.any()).query(() => ({ valid: true, errors: [] })),
  importFromShare: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 发布
  publish: protectedProcedure.input(z.any()).mutation(() => successResponse),
  unpublish: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getPublic: publicProcedure.query(() => []),
  
  // 分享
  getShareData: publicProcedure.input(z.any()).query(() => ({ data: null })),
});

// ==================== 成本管理路由 ====================
export const costRouter = router({
  list: publicProcedure.query(() => ({ items: mockProjectCosts, total: mockProjectCosts.length, page: 1, pageSize: 10 })),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => mockProjectCosts.find(c => c.projectId === input.id) || null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  getBudget: publicProcedure.input(z.any()).query(({ input }) => {
    const project = mockProjects.find(p => p.id === input?.projectId);
    return { budget: project?.budget || 0, spent: project?.actualCost || 0, remaining: (project?.budget || 0) - (project?.actualCost || 0) };
  }),
  getStatistics: publicProcedure.query(() => ({
    total: mockProjectCosts.reduce((sum, c) => sum + c.actualAmount, 0),
    categories: mockCostCategories.map(cat => ({
      ...cat,
      total: mockProjectCosts.filter(c => c.categoryId === cat.id).reduce((sum, c) => sum + c.actualAmount, 0)
    }))
  })),
  
  // 预算
  getBudgets: publicProcedure.query(() => mockProjects.map(p => ({ projectId: p.id, projectName: p.name, budget: p.budget, spent: p.actualCost }))),
  createBudget: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 记录
  getRecords: publicProcedure.query(() => mockProjectCosts),
  createRecord: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 类别
  getCategories: publicProcedure.query(() => mockCostCategories),
  initCategories: protectedProcedure.mutation(() => successResponse),
  
  // 人工成本
  getLaborCosts: publicProcedure.query(() => [
    { id: 'LC-001', projectId: 'PRJ-001', employeeId: 'EMP-001', hours: 120, rate: 150, total: 18000, month: '2026-01' },
    { id: 'LC-002', projectId: 'PRJ-001', employeeId: 'EMP-002', hours: 80, rate: 120, total: 9600, month: '2026-01' },
    { id: 'LC-003', projectId: 'PRJ-002', employeeId: 'EMP-003', hours: 100, rate: 180, total: 18000, month: '2026-01' }
  ]),
  
  // 汇总
  getSummary: publicProcedure.query(() => ({
    summary: {
      totalBudget: mockProjects.reduce((sum, p) => sum + p.budget, 0),
      totalSpent: mockProjects.reduce((sum, p) => sum + p.actualCost, 0),
      byCategory: mockCostCategories.map(cat => ({
        category: cat.name,
        amount: mockProjectCosts.filter(c => c.categoryId === cat.id).reduce((sum, c) => sum + c.actualAmount, 0)
      }))
    }
  })),
});

// ==================== 社区路由 ====================
export const communityRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  getPosts: publicProcedure.query(() => []),
  like: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 统计
  getStats: publicProcedure.query(() => ({ stats: {} })),
  
  // 成员
  getMembers: publicProcedure.query(() => []),
  verifyMember: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 内容
  createContent: protectedProcedure.input(z.any()).mutation(() => successResponse),
  publishContent: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getPendingContent: publicProcedure.query(() => []),
  approveContent: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 敏感词
  getSensitiveWords: publicProcedure.query(() => []),
  addSensitiveWord: protectedProcedure.input(z.any()).mutation(() => successResponse),
  initDefaultSensitiveWords: protectedProcedure.mutation(() => successResponse),
  
  // 外发消息
  getPendingMessages: publicProcedure.query(() => []),
  approveOutboundMessage: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== M7M9路由 ====================
export const m7m9Router = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // Gate检查
  gateCheck: publicProcedure.input(z.any()).query(() => ({ passed: true, issues: [] })),
});

// ==================== 出差申请路由 ====================
export const tripRequestRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  approve: protectedProcedure.input(z.any()).mutation(() => successResponse),
  reject: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 提交和取消
  submit: protectedProcedure.input(z.any()).mutation(() => successResponse),
  cancel: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 开始和完成
  start: protectedProcedure.input(z.any()).mutation(() => successResponse),
  complete: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 国家和政策
  countries: publicProcedure.query(() => []),
  expensePolicies: publicProcedure.query(() => []),
  
  // 统计
  statistics: publicProcedure.query(() => ({ statistics: {} })),
});

// ==================== CRM路由 ====================
export const crmRouter = router({
  list: publicProcedure.query(() => ({ items: mockCustomers, total: mockCustomers.length, page: 1, pageSize: 10 })),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => mockCustomers.find(c => c.id === input.id) || null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  getCustomers: publicProcedure.query(() => mockCustomers),
  getLeads: publicProcedure.query(() => mockCustomers.filter(c => c.status === 'potential')),
  getOpportunities: publicProcedure.query(() => mockOpportunities),
  
  // 客户
  customers: publicProcedure.query(() => mockCustomers),
  
  // 联系人
  contacts: publicProcedure.query(() => [
    { id: 'CON-001', customerId: 'CUS-001', name: '李经理', title: '采购总监', phone: '13800138001', email: 'li@huawei.com', isPrimary: true },
    { id: 'CON-002', customerId: 'CUS-001', name: '王工', title: '技术经理', phone: '13800138011', email: 'wang@huawei.com', isPrimary: false },
    { id: 'CON-003', customerId: 'CUS-002', name: '王总监', title: '设备部总监', phone: '13800138002', email: 'wang@byd.com', isPrimary: true },
    { id: 'CON-004', customerId: 'CUS-003', name: '张经理', title: '采购经理', phone: '13800138003', email: 'zhang@catl.com', isPrimary: true },
    { id: 'CON-005', customerId: 'CUS-004', name: '陈总', title: '设备部总经理', phone: '13800138004', email: 'chen@smic.com', isPrimary: true }
  ]),
  
  // 商机
  opportunities: publicProcedure.query(() => mockOpportunities),
});

// ==================== 年度规划路由 ====================
export const annualPlanningRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  getGoals: publicProcedure.query(() => []),
  getProgress: publicProcedure.query(() => ({ progress: 0 })),
  
  // 配置
  getConfigs: publicProcedure.query(() => []),
  getActiveConfig: publicProcedure.query(() => ({ config: null })),
  createConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
  activateConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
  copyToNewYear: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 项目
  getItems: publicProcedure.query(() => []),
  createItem: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateItem: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 日志
  getUpdateLogs: publicProcedure.query(() => []),
  
  // 示例数据
  initSampleData: protectedProcedure.mutation(() => successResponse),
});

// ==================== 变更管理路由 ====================
export const changeManagementRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  getHistory: publicProcedure.input(z.any()).query(() => []),
  
  // 变更请求
  listChangeRequests: publicProcedure.query(() => []),
  createChangeRequest: protectedProcedure.input(z.any()).mutation(() => successResponse),
  submitChangeRequest: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 发布
  listReleases: publicProcedure.query(() => []),
  
  // 审批
  getMyPendingApprovals: publicProcedure.query(() => []),
  submitApprovalDecision: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // CAB成员
  getCABMembers: publicProcedure.query(() => []),
  
  // 统计
  getStats: publicProcedure.query(() => ({ stats: {} })),
  
  // 审计日志
  getAuditLogs: publicProcedure.query(() => []),
});

// ==================== 费用报销调度器路由 ====================
export const expenseReportSchedulerRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 调度
  getSchedules: publicProcedure.query(() => []),
  createSchedule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  updateSchedule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  deleteSchedule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  toggleSchedule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 执行
  triggerNow: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getExecutionHistory: publicProcedure.query(() => []),
});

// ==================== 成本预警路由 ====================
export const costAlertRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  acknowledge: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 活动规则
  getActiveRules: publicProcedure.query(() => []),
  
  // 项目日志
  getProjectLogs: publicProcedure.input(z.any()).query(() => []),
  
  // 批量导入
  batchImport: protectedProcedure.input(z.any()).mutation(() => successResponse),
  parseCSV: publicProcedure.input(z.any()).query(() => []),
  exportCSV: protectedProcedure.mutation(() => ({ url: "" })),
});

// ==================== 预警规则路由 ====================
export const alertRuleRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 确认
  acknowledge: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 切换启用
  toggleEnabled: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 历史
  listHistory: publicProcedure.query(() => []),
  
  // 统计
  getStatistics: publicProcedure.query(() => ({ statistics: {} })),
});

// ==================== 工人管理路由 ====================
import { getWorkers, getWorkerById, createWorker, updateWorker, deleteWorker, getWorkerRanking, getWorkHourAlerts, updateAlertStatus } from './db';

export const workerRouter = router({
  list: publicProcedure.input(z.object({
    page: z.number().optional(),
    pageSize: z.number().optional(),
    search: z.string().optional(),
    department: z.string().optional(),
    status: z.string().optional(),
    skillLevel: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const result = await getWorkers(input || {});
    return { items: result.workers, total: result.total, page: input?.page || 1, pageSize: input?.pageSize || 20 };
  }),
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return await getWorkerById(input.id);
  }),
  create: protectedProcedure.input(z.object({
    employeeCode: z.string().optional(),
    name: z.string(),
    department: z.string(),
    position: z.string(),
    skillLevel: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']).optional(),
    status: z.enum(['Active', 'Inactive', 'OnLeave']).optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    joinDate: z.string().optional(),
    uwbTagId: z.string().optional(),
  })).mutation(async ({ input }) => {
    const worker = await createWorker(input);
    return { success: true, data: worker };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    employeeCode: z.string().optional(),
    name: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    skillLevel: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']).optional(),
    status: z.enum(['Active', 'Inactive', 'OnLeave']).optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    joinDate: z.string().optional(),
    leaveDate: z.string().optional(),
    uwbTagId: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    const worker = await updateWorker(id, data);
    return { success: true, data: worker };
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const result = await deleteWorker(input.id);
    return { success: result };
  }),
  
  // 工人列表 - 兼容旧API
  getWorkers: publicProcedure.input(z.object({
    status: z.enum(['Active', 'Inactive', 'OnLeave']).optional(),
    search: z.string().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    department: z.string().optional(),
    skillLevel: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const result = await getWorkers(input || {});
    return { workers: result.workers, total: result.total };
  }),
  createWorker: protectedProcedure.input(z.object({
    name: z.string(),
    department: z.string(),
    position: z.string(),
    skillLevel: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']),
    phone: z.string().optional(),
    email: z.string().optional(),
  })).mutation(async ({ input }) => {
    const worker = await createWorker(input);
    return { success: true, data: worker };
  }),
  updateWorker: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    skillLevel: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']).optional(),
    status: z.enum(['Active', 'Inactive', 'OnLeave']).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    const worker = await updateWorker(id, data);
    return { success: true, data: worker };
  }),
  deleteWorker: protectedProcedure.input(z.object({
    id: z.number(),
  })).mutation(async ({ input }) => {
    const result = await deleteWorker(input.id);
    return { success: result };
  }),
  
  // 排名
  getWorkerRanking: publicProcedure.input(z.object({
    period: z.enum(['day', 'week', 'month']).optional(),
    limit: z.number().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    department: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const result = await getWorkerRanking({
      page: input?.page || 1,
      pageSize: input?.limit || input?.pageSize || 20,
      department: input?.department,
      startDate: input?.startDate,
      endDate: input?.endDate,
    });
    return result.rankings;
  }),
  
  // 工时警报
  getWorkHourAlerts: publicProcedure.input(z.object({
    status: z.enum(['Pending', 'Acknowledged', 'Resolved', 'Ignored']).optional(),
    limit: z.number().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    workerId: z.number().optional(),
    alertType: z.string().optional(),
    alertLevel: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const result = await getWorkHourAlerts({
      page: input?.page || 1,
      pageSize: input?.limit || input?.pageSize || 20,
      workerId: input?.workerId,
      alertType: input?.alertType,
      alertLevel: input?.alertLevel,
      status: input?.status,
    });
    return result.alerts;
  }),
  acknowledgeAlert: protectedProcedure.input(z.object({
    alertId: z.number(),
    action: z.enum(['acknowledge', 'resolve', 'ignore']),
    resolution: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const statusMap = {
      acknowledge: 'Acknowledged' as const,
      resolve: 'Resolved' as const,
      ignore: 'Ignored' as const,
    };
    const alert = await updateAlertStatus(input.alertId, {
      status: statusMap[input.action],
      userId: ctx.user.id,
      resolution: input.resolution,
    });
    return { success: true, data: alert };
  }),
});

// ==================== 报表调度器路由 ====================
export const reportSchedulerRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 调度
  getSchedules: publicProcedure.query(() => []),
  updateSchedule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 收件人
  addRecipient: protectedProcedure.input(z.any()).mutation(() => successResponse),
  removeRecipient: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 历史
  getHistory: publicProcedure.query(() => []),
  
  // 触发
  triggerSend: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 预览
  previewReport: publicProcedure.input(z.any()).query(() => ({ preview: "" })),
});

// ==================== 员工AI助手路由 ====================
export const employeeAiAssistantRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 聊天
  chat: protectedProcedure.input(z.any()).mutation(() => ({ response: "" })),
  
  // 建议
  getSuggestions: publicProcedure.query(() => []),
  
  // 任务
  getTasks: publicProcedure.query(() => []),
  completeTask: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 死锁监控路由 ====================
export const deadlockMonitorRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 监控
  getStatus: publicProcedure.query(() => ({ status: "ok" })),
  getDeadlocks: publicProcedure.query(() => []),
  resolveDeadlock: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 历史
  getHistory: publicProcedure.query(() => []),
});

// ==================== AI触发器路由 ====================
export const aiTriggerRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 切换
  toggle: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 执行
  execute: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getExecutionHistory: publicProcedure.query(() => []),
});

// ==================== 模板使用统计路由 ====================
export const templateUsageStatsRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  
  // 统计
  getSummary: publicProcedure.query(() => ({ summary: {} })),
  getTrends: publicProcedure.query(() => []),
  getPopularity: publicProcedure.query(() => []),
  getUserActivity: publicProcedure.query(() => []),
  getHourlyDistribution: publicProcedure.query(() => []),
  getReportTypeDistribution: publicProcedure.query(() => []),
});

// ==================== 调度器路由 ====================
export const schedulerRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 任务
  getTasks: publicProcedure.query(() => []),
  setTaskEnabled: protectedProcedure.input(z.any()).mutation(() => successResponse),
  triggerTask: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 日志
  getLogs: publicProcedure.query(() => []),
  
  // 提醒配置
  getReminderConfig: publicProcedure.query(() => ({ config: null })),
  updateReminderConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== HR生命周期路由 ====================
export const hrLifecycleRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 生命周期
  getStages: publicProcedure.query(() => []),
  getEmployeeLifecycle: publicProcedure.input(z.any()).query(() => ({ lifecycle: null })),
  updateStage: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 字段映射路由 ====================
export const fieldMappingRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 映射
  getMappings: publicProcedure.query(() => []),
  saveMappings: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 推荐
  getRecommendations: publicProcedure.input(z.any()).query(() => []),
});

// ==================== 员工DA路由 ====================
export const employeeDARouter = router({
  list: publicProcedure.query(() => []),
  listFunctional: publicProcedure.query(() => []),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  toggleStatus: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // DA
  getMyDA: publicProcedure.query(() => ({ da: null })),
  chat: protectedProcedure.input(z.any()).mutation(() => ({ response: "" })),
  getHistory: publicProcedure.query(() => []),
});

// ==================== 规则版本路由 ====================
export const ruleVersionRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 版本
  getAll: publicProcedure.query(() => []),
  compare: publicProcedure.input(z.any()).query(() => ({ comparison: null })),
  rollback: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 项目路由 ====================
// 项目模拟数据
// Mock data aligned with DB schema (projects table: serial id, varchar fields, integer budget, etc.)
const mockProjectList = [
  {
    id: 1,
    projectCode: "PRJ-2024-001",
    name: "GRT智能清洗系统升级项目",
    shortName: "GRT-2024",
    customerId: null,
    opportunityId: null,
    type: "strategic" as const,
    status: "active" as const,
    currentPhase: "M6",
    priority: "critical" as const,
    plannedStartDate: "2024-01-15",
    plannedEndDate: "2024-12-31",
    actualStartDate: "2024-01-15",
    actualEndDate: null,
    budget: 580,
    actualCost: 320,
    contractAmount: 600,
    managerId: 1,
    description: "全面升级GRT智能清洗系统，包括IoT集成、AI质检和自动化控制",
    objectives: null,
    scope: null,
    riskLevel: "medium" as const,
    healthStatus: "green" as const,
    completionPercent: 65,
    remark: null,
    jiandaoyunId: null,
    createdAt: "2024-01-10T00:00:00.000Z",
    updatedAt: "2024-06-15T00:00:00.000Z",
  },
  {
    id: 2,
    projectCode: "PRJ-2024-002",
    name: "客户关系管理系统实施",
    shortName: "CRM-IMPL",
    customerId: null,
    opportunityId: null,
    type: "key" as const,
    status: "active" as const,
    currentPhase: "M3",
    priority: "high" as const,
    plannedStartDate: "2024-02-01",
    plannedEndDate: "2024-08-31",
    actualStartDate: "2024-02-01",
    actualEndDate: null,
    budget: 280,
    actualCost: 150,
    contractAmount: 300,
    managerId: 2,
    description: "实施简道云CRM系统，整合销售、客户服务和市场营销流程",
    objectives: null,
    scope: null,
    riskLevel: "low" as const,
    healthStatus: "green" as const,
    completionPercent: 45,
    remark: null,
    jiandaoyunId: null,
    createdAt: "2024-01-20T00:00:00.000Z",
    updatedAt: "2024-04-15T00:00:00.000Z",
  },
  {
    id: 3,
    projectCode: "PRJ-2024-003",
    name: "生产线自动化改造",
    shortName: "AUTO-LINE",
    customerId: null,
    opportunityId: null,
    type: "strategic" as const,
    status: "draft" as const,
    currentPhase: "M0",
    priority: "high" as const,
    plannedStartDate: "2024-04-01",
    plannedEndDate: "2025-06-30",
    actualStartDate: null,
    actualEndDate: null,
    budget: 1200,
    actualCost: 50,
    contractAmount: null,
    managerId: 3,
    description: "对3条生产线进行自动化改造，引入机器人和智能传感器",
    objectives: null,
    scope: null,
    riskLevel: "high" as const,
    healthStatus: "yellow" as const,
    completionPercent: 10,
    remark: null,
    jiandaoyunId: null,
    createdAt: "2024-03-01T00:00:00.000Z",
    updatedAt: "2024-04-01T00:00:00.000Z",
  },
  {
    id: 4,
    projectCode: "PRJ-2023-004",
    name: "质量管理体系认证",
    shortName: "ISO-CERT",
    customerId: null,
    opportunityId: null,
    type: "standard" as const,
    status: "completed" as const,
    currentPhase: "M12",
    priority: "medium" as const,
    plannedStartDate: "2023-06-01",
    plannedEndDate: "2024-01-31",
    actualStartDate: "2023-06-01",
    actualEndDate: "2024-01-31",
    budget: 80,
    actualCost: 75,
    contractAmount: 80,
    managerId: 4,
    description: "完成ISO9001质量管理体系认证",
    objectives: null,
    scope: null,
    riskLevel: "low" as const,
    healthStatus: "green" as const,
    completionPercent: 100,
    remark: null,
    jiandaoyunId: null,
    createdAt: "2023-05-01T00:00:00.000Z",
    updatedAt: "2024-01-31T00:00:00.000Z",
  },
  {
    id: 5,
    projectCode: "PRJ-2024-005",
    name: "员工培训平台建设",
    shortName: "TRAIN-SYS",
    customerId: null,
    opportunityId: null,
    type: "standard" as const,
    status: "on_hold" as const,
    currentPhase: "M3",
    priority: "low" as const,
    plannedStartDate: "2024-01-01",
    plannedEndDate: "2024-09-30",
    actualStartDate: "2024-01-01",
    actualEndDate: null,
    budget: 120,
    actualCost: 30,
    contractAmount: 130,
    managerId: 5,
    description: "建设在线员工培训平台，支持课程管理和学习追踪",
    objectives: null,
    scope: null,
    riskLevel: "low" as const,
    healthStatus: "yellow" as const,
    completionPercent: 25,
    remark: null,
    jiandaoyunId: null,
    createdAt: "2023-12-01T00:00:00.000Z",
    updatedAt: "2024-03-15T00:00:00.000Z",
  },
];

export const projectRouter = router({
  list: publicProcedure.query(async () => {
    try {
      const db = await requireDb();
      const result = await db.select().from(projects).orderBy(desc(projects.createdAt));
      // 如果数据库为空，返回模拟数据
      if (result.length === 0) return mockProjectList;
      return result;
    } catch (error) {
      console.error('[projectRouter.list] Error:', error);
      return mockProjectList;
    }
  }),
  getById: publicProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).query(async ({ input }) => {
    const numId = typeof input.id === 'number' ? input.id : parseInt(input.id);
    try {
      const db = await requireDb();
      const result = await db.select().from(projects).where(eq(projects.id, numId));
      if (result.length > 0) return result[0];
      return mockProjectList.find(p => p.id === numId) || null;
    } catch (error) {
      return mockProjectList.find(p => p.id === numId) || null;
    }
  }),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    shortName: z.string().optional(),
    type: z.enum(["standard", "key", "strategic"]).default("standard"),
    priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
    budget: z.number().optional(),
    description: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const projectCode = `PRJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const result = await db.insert(projects).values({
      projectCode,
      name: input.name,
      shortName: input.shortName ?? null,
      type: input.type,
      priority: input.priority,
      budget: input.budget ?? null,
      description: input.description ?? null,
      status: "draft",
      currentPhase: "M0",
    }).returning({ id: projects.id });
    if (!result.length) {
      throw new Error("项目创建失败：数据库未返回记录");
    }
    return { success: true, message: "项目创建成功", id: result[0].id, projectCode };
  }),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.union([z.string(), z.number()]) })).mutation(() => successResponse),

  // 统计
  statistics: publicProcedure.query(async () => {
    const computeStats = (list: { status: string; type: string; priority: string; budget: number | null; actualCost: number | null; completionPercent: number | null }[]) => ({
      total: list.length,
      byStatus: {
        draft: list.filter(p => p.status === "draft").length,
        active: list.filter(p => p.status === "active").length,
        on_hold: list.filter(p => p.status === "on_hold").length,
        completed: list.filter(p => p.status === "completed").length,
        cancelled: list.filter(p => p.status === "cancelled").length,
      },
      byType: {
        standard: list.filter(p => p.type === "standard").length,
        key: list.filter(p => p.type === "key").length,
        strategic: list.filter(p => p.type === "strategic").length,
      },
      byPriority: {
        critical: list.filter(p => p.priority === "critical").length,
        high: list.filter(p => p.priority === "high").length,
        medium: list.filter(p => p.priority === "medium").length,
        low: list.filter(p => p.priority === "low").length,
      },
      totalBudget: list.reduce((sum, p) => sum + (p.budget ?? 0), 0),
      totalSpent: list.reduce((sum, p) => sum + (p.actualCost ?? 0), 0),
      averageProgress: list.length ? Math.round(list.reduce((sum, p) => sum + (p.completionPercent ?? 0), 0) / list.length) : 0,
    });
    try {
      const db = await requireDb();
      const result = await db.select().from(projects);
      if (result.length > 0) return computeStats(result);
      return computeStats(mockProjectList);
    } catch {
      return computeStats(mockProjectList);
    }
  }),
});

// ==================== 流程笔记本路由 ====================
export const processNotebookRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 笔记本
  getByProcess: publicProcedure.input(z.any()).query(() => ({ notebook: null })),
  getNotebookWithEntries: publicProcedure.input(z.any()).query(() => ({ notebook: null, entries: [] })),
  
  // 文件上传
  uploadFile: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),
});

// ==================== 聊天历史路由 ====================
export const chatHistoryRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 会话
  getSessions: publicProcedure.query(() => []),
  createSession: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 消息
  getMessages: publicProcedure.input(z.any()).query(() => []),
  addMessage: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 统计
  getStats: publicProcedure.query(() => ({ stats: {} })),
});

// ==================== AI执行模式路由 ====================
export const aiExecutionModeRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 模式配置
  getModeConfig: publicProcedure.query(() => ({ config: null })),
  
  // 执行
  execute: protectedProcedure.input(z.any()).mutation(() => ({ result: null })),
  
  // 日志
  getRecentLogs: publicProcedure.query(() => []),
  
  // 采纳
  recordAdoption: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 统计
  getEffectivenessStats: publicProcedure.query(() => ({ stats: {} })),
});

// ==================== 任务执行日志路由 ====================
export const taskExecutionLogRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 统计
  getStats: publicProcedure.query(() => ({ stats: {} })),
  
  // 导出
  exportCSV: protectedProcedure.mutation(() => ({ url: "" })),
  
  // 清理
  cleanup: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 规则模板路由 ====================
export const ruleTemplateRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 规则
  getAll: publicProcedure.query(() => []),
  createRule: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 模板
  saveAsTemplate: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 内置
  initBuiltin: protectedProcedure.mutation(() => successResponse),
});

// ==================== 规划依赖路由 ====================
export const planningDependencyRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 依赖
  getDependencies: publicProcedure.input(z.any()).query(() => []),
  addDependency: protectedProcedure.input(z.any()).mutation(() => successResponse),
  removeDependency: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 通知渠道测试路由 ====================
export const notificationChannelTestRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 测试
  testChannel: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  getTestHistory: publicProcedure.query(() => []),
});

// ==================== 线索分析路由 ====================
export const leadAnalyticsRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 分析
  getAnalytics: publicProcedure.query(() => ({ analytics: {} })),
  getConversionRate: publicProcedure.query(() => ({ rate: 0 })),
  getSourceDistribution: publicProcedure.query(() => []),
});

// ==================== 导入历史路由 ====================
export const importHistoryRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 历史
  getHistory: publicProcedure.query(() => []),
  getDetails: publicProcedure.input(z.any()).query(() => ({ details: null })),
});

// ==================== 开发任务路由 ====================
export const devTasksRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 任务
  getTasks: publicProcedure.query(() => []),
  assignTask: protectedProcedure.input(z.any()).mutation(() => successResponse),
  completeTask: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== AI建议路由 ====================
export const aiSuggestionRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 建议
  getSuggestions: publicProcedure.query(() => []),
  applySuggestion: protectedProcedure.input(z.any()).mutation(() => successResponse),
  recordFeedback: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== AI笔记本路由 ====================
export const aiNotebookRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 分析
  analyzeEntry: protectedProcedure.input(z.any()).mutation(() => ({ analysis: null })),
  
  // 建议
  getSuggestions: publicProcedure.query(() => []),
  acceptSuggestion: protectedProcedure.input(z.any()).mutation(() => successResponse),
  rejectSuggestion: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 培训证书路由 ====================
export const trainingCertificateRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 证书
  getByParticipant: publicProcedure.input(z.any()).query(() => []),
  issue: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 培训评估路由 ====================
export const trainingAssessmentRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 评估
  getByTraining: publicProcedure.input(z.any()).query(() => []),
});

// ==================== 红蓝对抗路由 ====================
export const redBlueRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 项目
  getProjects: publicProcedure.query(() => []),
  
  // Gate
  getGates: publicProcedure.query(() => []),
  
  // 任务
  getTasks: publicProcedure.query(() => []),
});

// ==================== 项目Gate路由 ====================
export const projectGateRouter = router({
  list: publicProcedure.query(() => ({ items: mockProjects, total: mockProjects.length, page: 1, pageSize: 10 })),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => mockProjects.find(p => p.id === input.id) || null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // Gate定义
  getGateDefinitions: publicProcedure.query(() => mockGateDefinitions),
  
  // Gate评审
  getGateReviews: publicProcedure.query(() => mockGateReviews),
  
  // 统计
  getGateStatistics: publicProcedure.query(() => ({
    statistics: {
      totalProjects: mockProjects.length,
      inProgress: mockProjects.filter(p => p.status === 'in_progress').length,
      completed: mockProjects.filter(p => p.status === 'completed').length,
      planning: mockProjects.filter(p => p.status === 'planning').length,
      tier1Projects: mockProjects.filter(p => p.type === 'tier1').length,
      totalBudget: mockProjects.reduce((sum, p) => sum + p.budget, 0),
      totalActualCost: mockProjects.reduce((sum, p) => sum + p.actualCost, 0)
    }
  })),
});

// ==================== 生产仪表盘路由 ====================
export const productionDashboardRouter = router({
  list: publicProcedure.query(() => ({ items: mockQCRecords, total: mockQCRecords.length, page: 1, pageSize: 10 })),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => mockQCRecords.find(r => r.id === input.id) || null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // QC记录
  getQCRecords: publicProcedure.query(() => mockQCRecords),
  createQCRecord: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 统计
  getQCStats: publicProcedure.query(() => ({
    stats: {
      totalRecords: mockQCRecords.length,
      passRate: (mockQCRecords.filter(r => r.result === 'pass').length / mockQCRecords.length * 100).toFixed(1) + '%',
      totalItems: mockQCRecords.reduce((sum, r) => sum + r.items, 0),
      totalPass: mockQCRecords.reduce((sum, r) => sum + r.passItems, 0),
      totalFail: mockQCRecords.reduce((sum, r) => sum + r.failItems, 0)
    }
  })),
});

// ==================== 新AI助手路由 ====================
export const newAiAssistantRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 聊天
  chat: protectedProcedure.input(z.any()).mutation(() => ({ response: "" })),
  
  // 配置
  getConfig: publicProcedure.query(() => ({ config: null })),
});

// ==================== 迁移路由 ====================
export const migrationRouter = router({
  list: protectedProcedure.query(async () => {
    try {
      return await getAllMigrationTasks();
    } catch (error) {
      console.error('[Migration] Failed to list tasks:', error);
      return [];
    }
  }),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      return await getMigrationTaskById(input.id);
    } catch (error) {
      console.error('[Migration] Failed to get task:', error);
      return null;
    }
  }),
  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    try {
      await createMigrationTask(input);
      return successResponse;
    } catch (error) {
      console.error('[Migration] Failed to create task:', error);
      return successResponse;
    }
  }),
  update: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    try {
      await updateMigrationTask(input.id, input);
      return successResponse;
    } catch (error) {
      console.error('[Migration] Failed to update task:', error);
      return successResponse;
    }
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    try {
      await deleteMigrationTask(input.id);
      return successResponse;
    } catch (error) {
      console.error('[Migration] Failed to delete task:', error);
      return successResponse;
    }
  }),
  
  // 初始化默认迁移任务
  init: protectedProcedure.mutation(async () => {
    try {
      await initDefaultMigrationTasks();
      return successResponse;
    } catch (error) {
      console.error('[Migration] Failed to init tasks:', error);
      return successResponse;
    }
  }),
  
  // 迁移
  getMigrations: publicProcedure.query(() => []),
  runMigration: protectedProcedure.input(z.any()).mutation(() => successResponse),
  rollbackMigration: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 线索导入路由 ====================
export const leadImportRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 导入
  importLeads: protectedProcedure.input(z.any()).mutation(() => successResponse),
  getImportHistory: publicProcedure.query(() => []),
});

// ==================== 线索自动跟进路由 ====================
export const leadAutoFollowRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 自动跟进
  getConfig: publicProcedure.query(() => ({ config: null })),
  updateConfig: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 费用报销路由 ====================
export const expenseReportRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  
  // 报销
  submit: protectedProcedure.input(z.any()).mutation(() => successResponse),
  approve: protectedProcedure.input(z.any()).mutation(() => successResponse),
  reject: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 费用预测路由 ====================
export const expenseForecastRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getForecast: publicProcedure.input(z.any()).query(() => []),
  
  // 预测
  generateForecast: protectedProcedure.input(z.any()).mutation(() => []),
});

// ==================== 费用对比路由 ====================
export const expenseComparisonRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  compare: publicProcedure.input(z.any()).query(() => []),
  expenseComparisonExport: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),
});

// ==================== 预算超支审批路由 ====================
export const budgetOverrunApprovalRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  approve: protectedProcedure.input(z.any()).mutation(() => successResponse),
  reject: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 待审批
  getPendingApprovals: publicProcedure.query(() => []),
});

// ==================== AI聊天路由 ====================
export const aiChatRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  chat: protectedProcedure.input(z.any()).mutation(() => ({ response: "" })),
  getHistory: publicProcedure.input(z.any()).query(() => []),
  
  // 快捷提示
  getQuickPrompts: publicProcedure.query(() => []),
  
  // 发送消息
  sendMessage: protectedProcedure.input(z.any()).mutation(() => ({ response: "" })),
});

// ==================== 知识库路由 ====================
export const knowledgeBaseRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse),
  search: publicProcedure.input(z.any()).query(() => []),
});

// ==================== 用户路由 ====================
export const usersRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(() => null),
  update: protectedProcedure.input(z.any()).mutation(() => successResponse),
  
  // 获取所有
  getAll: publicProcedure.query(() => []),
  
  // 搜索
  search: publicProcedure.input(z.any()).query(() => []),
});

// ==================== 认证路由 ====================
export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    // Return the current user from context (set by authenticateRequest in sdk.ts)
    return ctx.user || null;
  }),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Clear localStorage token on client side is handled by frontend
    // Server-side just returns success
    return successResponse;
  }),
  
  // 用户偏好设置API
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      return { language: 'zh', theme: 'dark', sidebarCollapsed: false, timezone: 'Asia/Shanghai' };
    }
    try {
      const { getUserPreferences } = await import("./db");
      const prefs = await getUserPreferences(ctx.user.id);
      if (prefs) {
        return {
          language: prefs.language,
          theme: prefs.theme,
          sidebarCollapsed: prefs.sidebarCollapsed,
          timezone: prefs.timezone,
          dateFormat: prefs.dateFormat,
          dashboardLayout: prefs.dashboardLayout,
          notificationSettings: prefs.notificationSettings,
        };
      }
      return { language: 'zh', theme: 'dark', sidebarCollapsed: false, timezone: 'Asia/Shanghai' };
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return { language: 'zh', theme: 'dark', sidebarCollapsed: false, timezone: 'Asia/Shanghai' };
    }
  }),
  
  updatePreferences: protectedProcedure
    .input(z.object({
      language: z.enum(['zh', 'en', 'de', 'fr']).optional(),
      theme: z.enum(['dark', 'light', 'system']).optional(),
      sidebarCollapsed: z.boolean().optional(),
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const { upsertUserPreferences } = await import("./db");
        const updated = await upsertUserPreferences(ctx.user.id, input);
        return { success: true, preferences: updated };
      } catch (error) {
        console.error('Failed to update user preferences:', error);
        return { success: false, error: 'Failed to update preferences' };
      }
    }),
  
  updateLanguagePreference: protectedProcedure
    .input(z.object({ language: z.enum(['zh', 'en', 'de', 'fr']) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const { upsertUserPreferences } = await import("./db");
        await upsertUserPreferences(ctx.user.id, { language: input.language });
        return { success: true, language: input.language };
      } catch (error) {
        console.error('Failed to update language preference:', error);
        return { success: false, error: 'Failed to update language preference' };
      }
    }),
    
  updateThemePreference: protectedProcedure
    .input(z.object({ theme: z.enum(['dark', 'light', 'system']) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const { upsertUserPreferences } = await import("./db");
        await upsertUserPreferences(ctx.user.id, { theme: input.theme });
        return { success: true, theme: input.theme };
      } catch (error) {
        console.error('Failed to update theme preference:', error);
        return { success: false, error: 'Failed to update theme preference' };
      }
    }),
  
  getLanguagePreference: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      return { language: 'zh' };
    }
    try {
      const { getUserPreferences } = await import("./db");
      const prefs = await getUserPreferences(ctx.user.id);
      return { language: prefs?.language || 'zh' };
    } catch (error) {
      console.error('Failed to get language preference:', error);
      return { language: 'zh' };
    }
  }),
  
  // 收藏菜单API
  getFavorites: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      return [];
    }
    try {
      const { getUserFavorites } = await import("./db");
      return await getUserFavorites(ctx.user.id);
    } catch (error) {
      console.error('Failed to get user favorites:', error);
      return [];
    }
  }),
  
  addFavorite: protectedProcedure
    .input(z.object({
      menuPath: z.string(),
      menuName: z.string(),
      menuNameEn: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const { addUserFavorite } = await import("./db");
        const favorite = await addUserFavorite({
          userId: ctx.user.id,
          menuPath: input.menuPath,
          menuName: input.menuName,
          menuNameEn: input.menuNameEn,
        });
        return { success: true, data: favorite };
      } catch (error: any) {
        console.error('Failed to add favorite:', error);
        return { success: false, error: error.message || 'Failed to add favorite' };
      }
    }),
  
  removeFavorite: protectedProcedure
    .input(z.object({ menuPath: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const { removeUserFavorite } = await import("./db");
        const result = await removeUserFavorite(ctx.user.id, input.menuPath);
        return { success: result };
      } catch (error) {
        console.error('Failed to remove favorite:', error);
        return { success: false, error: 'Failed to remove favorite' };
      }
    }),
  
  isFavorite: protectedProcedure
    .input(z.object({ menuPath: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return false;
      }
      try {
        const { isFavorite } = await import("./db");
        return await isFavorite(ctx.user.id, input.menuPath);
      } catch (error) {
        console.error('Failed to check favorite:', error);
        return false;
      }
    }),
  
  updateFavoriteOrder: protectedProcedure
    .input(z.object({
      menuPath: z.string(),
      newOrder: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const { updateFavoriteOrder } = await import("./db");
        const result = await updateFavoriteOrder(ctx.user.id, input.menuPath, input.newOrder);
        return { success: result };
      } catch (error) {
        console.error('Failed to update favorite order:', error);
        return { success: false, error: 'Failed to update favorite order' };
      }
    }),
  
  // 批量更新收藏菜单排序
  reorderFavorites: protectedProcedure
    .input(z.object({
      orders: z.array(z.object({
        menuPath: z.string(),
        newOrder: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const { updateFavoriteOrder } = await import("./db");
        for (const item of input.orders) {
          await updateFavoriteOrder(ctx.user.id, item.menuPath, item.newOrder);
        }
        return { success: true };
      } catch (error) {
        console.error('Failed to reorder favorites:', error);
        return { success: false, error: 'Failed to reorder favorites' };
      }
    }),
});

// ==================== 分析路由 ====================
export const analyticsRouter = router({
  getOverview: publicProcedure.query(() => ({ total: 0, charts: [] })),
  getDetails: publicProcedure.input(z.any()).query(() => []),
  
  // 追踪
  track: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 反馈路由 ====================
export const feedbackRouter = router({
  list: publicProcedure.query(() => emptyListResponse),
  create: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 出差仪表盘路由 ====================
export const travelDashboardRouter = router({
  getData: publicProcedure.query(() => ({ data: {} })),
});

// ==================== AI路由 ====================
export const aiRouter = router({
  chat: protectedProcedure.input(z.any()).mutation(() => ({ response: "" })),
});

// ==================== 费用对比导出路由 ====================
export const expenseComparisonExportRouter = router({
  export: protectedProcedure.input(z.any()).mutation(() => ({ url: "" })),
});

// ==================== DA集成路由 ====================
export const daIntegrationRouter = router({
  getStatus: publicProcedure.query(() => ({ status: "ok" })),
  sync: protectedProcedure.mutation(() => successResponse),
  getIntegrationStats: publicProcedure.input(z.any()).query(() => ({
    totalIntegrations: 0,
    activeIntegrations: 0,
    syncedRecords: 0,
    lastSyncTime: null,
    byAssistant: {},
  })),
});

// ==================== 字段映射推荐路由 ====================
export const fieldMappingRecommendRouter = router({
  getRecommendations: publicProcedure.input(z.any()).query(() => []),
  applyRecommendation: protectedProcedure.input(z.any()).mutation(() => successResponse),
});

// ==================== 翻译建议路由 ====================
export const translationRouter = router({
  // 获取统计数据
  getStats: publicProcedure.query(() => ({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    byLanguage: { zh: 0, en: 0, de: 0, fr: 0 }
  })),
  
  // 获取翻译建议列表
  list: publicProcedure.input(z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
    language: z.enum(['zh', 'en', 'de', 'fr', 'all']).optional(),
    page: z.number().optional(),
    pageSize: z.number().optional()
  }).optional()).query(() => ({ items: [], total: 0, page: 1, pageSize: 10 })),
  
  // 获取我的提交
  getMySubmissions: protectedProcedure.input(z.object({
    page: z.number().optional(),
    pageSize: z.number().optional()
  }).optional()).query(() => ({ items: [], total: 0, page: 1, pageSize: 10 })),
  
  // 提交翻译建议
  submit: protectedProcedure.input(z.object({
    translationKey: z.string(),
    language: z.enum(['zh', 'en', 'de', 'fr']),
    originalText: z.string().optional(),
    suggestedText: z.string()
  })).mutation(() => successResponse),
  
  // 审核翻译建议（管理员）
  review: protectedProcedure.input(z.object({
    id: z.string(),
    status: z.enum(['approved', 'rejected']),
    reviewNote: z.string().optional()
  })).mutation(() => successResponse),
  
  // 删除翻译建议
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(() => successResponse)
});

// ==================== Microsoft Graph API 路由 ====================
export const microsoftGraphRouter = router({
  // 获取今日日程
  getTodayEvents: protectedProcedure.query(async () => {
    // 返回模拟数据，待配置Microsoft Graph API后切换为真实数据
    const today = new Date();
    const formatTime = (hours: number, minutes: number = 0) => {
      const date = new Date(today);
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString();
    };
    return [
      {
        id: "event-1",
        title: "项目启动会议",
        startTime: formatTime(9, 0),
        endTime: formatTime(10, 0),
        location: "会议室A",
        type: "meeting",
        isAllDay: false,
        importance: "high",
      },
      {
        id: "event-2",
        title: "设计评审截止",
        startTime: formatTime(12, 0),
        endTime: formatTime(12, 0),
        type: "deadline",
        isAllDay: false,
        importance: "high",
      },
      {
        id: "event-3",
        title: "客户电话会议",
        startTime: formatTime(14, 0),
        endTime: formatTime(15, 0),
        location: "线上 - Teams",
        type: "meeting",
        isAllDay: false,
        importance: "normal",
      },
      {
        id: "event-4",
        title: "周报提交",
        startTime: formatTime(17, 0),
        endTime: formatTime(17, 0),
        type: "reminder",
        isAllDay: false,
        importance: "normal",
      },
    ];
  }),
  
  // 获取本周日程
  getWeekEvents: protectedProcedure.query(async () => {
    return [];
  }),
  
  // 获取Teams消息
  getTeamsMessages: protectedProcedure.input(z.object({
    limit: z.number().optional()
  }).optional()).query(async () => {
    const now = new Date();
    return [
      {
        id: "msg-1",
        chatId: "chat-1",
        chatName: "项目团队",
        chatType: "group",
        content: "请大家在下午3点前提交本周的工作进度报告",
        timestamp: new Date(now.getTime() - 30 * 60000).toISOString(),
        sender: { name: "王经理", id: "user-1" },
        importance: "high",
        isMention: true,
        isRead: false,
      },
      {
        id: "msg-2",
        chatId: "chat-2",
        chatName: "李四",
        chatType: "oneOnOne",
        content: "设计稿已经更新，请查收",
        timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
        sender: { name: "李四", id: "user-2" },
        importance: "normal",
        isMention: false,
        isRead: false,
        attachments: [{ id: "att-1", name: "设计稿v2.pdf", contentType: "application/pdf", url: "#" }],
      },
      {
        id: "msg-3",
        chatId: "chat-1",
        chatName: "项目团队",
        chatType: "group",
        content: "明天的会议改到上午10点",
        timestamp: new Date(now.getTime() - 2 * 60 * 60000).toISOString(),
        sender: { name: "张三", id: "user-3" },
        importance: "normal",
        isMention: false,
        isRead: true,
      },
    ];
  }),
  
  // 获取未读消息数量
  getUnreadCount: protectedProcedure.query(async () => {
    return { total: 2, mentions: 1 };
  }),
  
  // 检查Graph API配置状态
  getConfigStatus: protectedProcedure.query(() => {
    return {
      isConfigured: false,
      message: "Microsoft Graph API 未配置，当前使用模拟数据"
    };
  })
});

// ==================== 仪表盘布局路由 ====================
export const dashboardRouter = router({
  // 获取用户仪表盘布局
  getLayout: protectedProcedure.query(() => {
    return {
      widgets: [
        { id: 'live-dashboard', type: 'LIVE_DASHBOARD', visible: true, order: 0 },
        { id: 'daily-plan', type: 'DAILY_PLAN', visible: true, order: 1 },
        { id: 'agenda', type: 'AGENDA', visible: true, order: 2 },
        { id: 'news-info', type: 'NEWS_INFO', visible: true, order: 3 },
        { id: 'teams-messages', type: 'COPILOT_TEAMS', visible: true, order: 4 },
        { id: 'performance-gemini', type: 'PERFORMANCE_GEMINI', visible: true, order: 5 },
        { id: 'project-status', type: 'PROJECT_STATUS_12STEP', visible: true, order: 6 },
        { id: 'training-dashboard', type: 'TRAINING_DASHBOARD', visible: true, order: 7 },
        { id: 'hero-section', type: 'HERO_SECTION', visible: true, order: 8 },
        { id: 'key-metrics', type: 'KEY_METRICS', visible: true, order: 9 },
        { id: 'core-modules', type: 'CORE_MODULES', visible: true, order: 10 },
      ]
    };
  }),
  
  // 保存用户仪表盘布局
  saveLayout: protectedProcedure.input(z.object({
    widgets: z.array(z.object({
      id: z.string(),
      type: z.string(),
      visible: z.boolean(),
      order: z.number()
    }))
  })).mutation(() => successResponse),
  
  // 获取每日任务
  getDailyTasks: protectedProcedure.query(() => {
    return [
      {
        id: "task-1",
        title: "完成Q1销售报告",
        source: "ANNUAL_PLAN",
        priority: "HIGH",
        status: "COMPLETED",
        linkedArtifact: "report-q1-sales.pdf",
        aiSuggestion: "建议添加竞争对手分析部分"
      },
      {
        id: "task-2",
        title: "项目A设计评审",
        source: "PROJECT_CMS",
        priority: "HIGH",
        status: "IN_PROGRESS",
        aiSuggestion: "请确保所有设计文档已更新"
      },
      {
        id: "task-3",
        title: "回复客户邮件",
        source: "MEETING_ACTION",
        priority: "MEDIUM",
        status: "PENDING"
      },
      {
        id: "task-4",
        title: "准备周会材料",
        source: "AD_HOC",
        priority: "LOW",
        status: "PENDING"
      }
    ];
  }),
  
  // 更新任务状态
  updateTaskStatus: protectedProcedure.input(z.object({
    taskId: z.string(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
  })).mutation(() => successResponse),
  
  // 获取绩效数据 (使用Gemini AI评估)
  getPerformanceData: protectedProcedure.query(async () => {
    // 模拟今日工作数据
    const todayWorkData = {
      date: new Date().toISOString().split('T')[0],
      emailsSent: 15,
      emailsReceived: 32,
      documentsCreated: 2,
      documentsEdited: 5,
      meetingsAttended: 3,
      meetingsOrganized: 1,
      tasksCompleted: 4,
      tasksPending: 3,
      averageResponseTimeMinutes: 18
    };
    
    // 尝试使用Gemini AI评估
    try {
      const { evaluateDailyPerformance } = await import('./services/gemini-performance.service');
      const evaluation = await evaluateDailyPerformance(todayWorkData);
      return {
        date: evaluation.date,
        score: evaluation.score,
        feedback: evaluation.feedback,
        metrics: {
          emailQuality: evaluation.metrics.emailQuality,
          docQuality: evaluation.metrics.docQuality,
          meetingParticipation: evaluation.metrics.meetingParticipation
        },
        weeklyTrend: evaluation.weeklyTrend,
        weeklyChange: evaluation.weeklyChange,
        suggestions: evaluation.suggestions,
        strengths: evaluation.strengths,
        areasForImprovement: evaluation.areasForImprovement
      };
    } catch (error) {
      console.error('Gemini performance evaluation error:', error);
      // 返回默认数据
      return {
        date: new Date().toISOString().split('T')[0],
        score: 87,
        feedback: "今日工作效率较高，邮件质量优秀，建议继续保持。",
        metrics: {
          emailQuality: 92,
          docQuality: 85,
          meetingParticipation: 88
        },
        weeklyTrend: [82, 85, 83, 88, 87],
        weeklyChange: 2.0
      };
    }
  }),
  
  // 获取12步项目状态
  getProjectStatus12Step: protectedProcedure.query(() => {
    return [
      {
        id: "proj-1",
        name: "项目A - 客户X清洗线",
        currentStage: 4,
        stages: [
          { stage: 1, name: "M1启动", status: "completed" },
          { stage: 2, name: "M2设计", status: "completed" },
          { stage: 3, name: "M3机械", status: "completed" },
          { stage: 4, name: "M4电气", status: "in_progress" },
          { stage: 5, name: "M5采购", status: "pending" },
          { stage: 6, name: "M6 BOM", status: "pending" },
          { stage: 7, name: "M7装配", status: "pending" },
          { stage: 8, name: "M8调试", status: "pending" },
          { stage: 9, name: "M9验收", status: "pending" },
          { stage: 10, name: "M10发货", status: "pending" },
          { stage: 11, name: "M11安装", status: "pending" },
          { stage: 12, name: "M12结项", status: "pending" }
        ]
      },
      {
        id: "proj-2",
        name: "项目B - 客户Y超声波",
        currentStage: 7,
        stages: [
          { stage: 1, name: "M1启动", status: "completed" },
          { stage: 2, name: "M2设计", status: "completed" },
          { stage: 3, name: "M3机械", status: "completed" },
          { stage: 4, name: "M4电气", status: "completed" },
          { stage: 5, name: "M5采购", status: "completed" },
          { stage: 6, name: "M6 BOM", status: "completed" },
          { stage: 7, name: "M7装配", status: "in_progress" },
          { stage: 8, name: "M8调试", status: "pending" },
          { stage: 9, name: "M9验收", status: "pending" },
          { stage: 10, name: "M10发货", status: "pending" },
          { stage: 11, name: "M11安装", status: "pending" },
          { stage: 12, name: "M12结项", status: "pending" }
        ]
      },
      {
        id: "proj-3",
        name: "项目C - 客户Z喷淋线",
        currentStage: 2,
        stages: [
          { stage: 1, name: "M1启动", status: "completed" },
          { stage: 2, name: "M2设计", status: "in_progress" },
          { stage: 3, name: "M3机械", status: "pending" },
          { stage: 4, name: "M4电气", status: "pending" },
          { stage: 5, name: "M5采购", status: "pending" },
          { stage: 6, name: "M6 BOM", status: "pending" },
          { stage: 7, name: "M7装配", status: "pending" },
          { stage: 8, name: "M8调试", status: "pending" },
          { stage: 9, name: "M9验收", status: "pending" },
          { stage: 10, name: "M10发货", status: "pending" },
          { stage: 11, name: "M11安装", status: "pending" },
          { stage: 12, name: "M12结项", status: "pending" }
        ]
      }
    ];
  }),
  
  // 获取新闻资讯
  getNewsInfo: protectedProcedure.query(() => {
    return [
      {
        id: "news-1",
        title: "GRT智能系统V2.0正式发布",
        summary: "新版本包含能力操作系统、AI助手、多语言支持等重要功能...",
        category: "product",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isImportant: true,
        author: "产品团队"
      },
      {
        id: "news-2",
        title: "本周培训计划更新",
        summary: "新增了关于质量管理和客户服务的培训课程...",
        category: "company",
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isImportant: false,
        author: "HR部门"
      },
      {
        id: "news-3",
        title: "行业动态：清洗设备市场增长15%",
        summary: "据最新行业报告显示，工业清洗设备市场持续增长...",
        category: "industry",
        publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        isImportant: false,
        author: "市场部"
      }
    ];
  })
});

// 导出所有占位符路由
export const placeholderRouters = {
  capabilityOs: capabilityOsRouter,
  afterSales: afterSalesRouter,
  compliance: complianceRouter,
  webhook: webhookRouter,
  agenda: agendaRouter,
  naming: namingRouter,
  hrm: hrmRouter,
  reportTemplate: reportTemplateRouter,
  cost: costRouter,
  community: communityRouter,
  m7m9: m7m9Router,
  tripRequest: tripRequestRouter,
  crm: crmRouter,
  annualPlanning: annualPlanningRouter,
  changeManagement: changeManagementRouter,
  expenseReportScheduler: expenseReportSchedulerRouter,
  costAlert: costAlertRouter,
  alertRule: alertRuleRouter,
  worker: workerRouter,
  reportScheduler: reportSchedulerRouter,
  employeeAiAssistant: employeeAiAssistantRouter,
  deadlockMonitor: deadlockMonitorRouter,
  aiTrigger: aiTriggerRouter,
  templateUsageStats: templateUsageStatsRouter,
  scheduler: schedulerRouter,
  hrLifecycle: hrLifecycleRouter,
  fieldMapping: fieldMappingRouter,
  employeeDA: employeeDARouter,
  ruleVersion: ruleVersionRouter,
  project: projectRouter,
  processNotebook: processNotebookRouter,
  chatHistory: chatHistoryRouter,
  aiExecutionMode: aiExecutionModeRouter,
  taskExecutionLog: taskExecutionLogRouter,
  ruleTemplate: ruleTemplateRouter,
  planningDependency: planningDependencyRouter,
  notificationChannelTest: notificationChannelTestRouter,
  leadAnalytics: leadAnalyticsRouter,
  importHistory: importHistoryRouter,
  devTasks: devTasksRouter,
  aiSuggestion: aiSuggestionRouter,
  aiNotebook: aiNotebookRouter,
  trainingCertificate: trainingCertificateRouter,
  trainingAssessment: trainingAssessmentRouter,
  redBlue: redBlueRouter,
  projectGate: projectGateRouter,
  productionDashboard: productionDashboardRouter,
  newAiAssistant: newAiAssistantRouter,
  migration: migrationRouter,
  leadImport: leadImportRouter,
  leadAutoFollow: leadAutoFollowRouter,
  expenseReport: expenseReportRouter,
  expenseForecast: expenseForecastRouter,
  expenseComparison: expenseComparisonRouter,
  budgetOverrunApproval: budgetOverrunApprovalRouter,
  aiChat: aiChatRouter,
  knowledgeBase: knowledgeBaseRouter,
  users: usersRouter,
  auth: authRouter,
  analytics: analyticsRouter,
  feedback: feedbackRouter,
  travelDashboard: travelDashboardRouter,
  ai: aiRouter,
  expenseComparisonExport: expenseComparisonExportRouter,
  daIntegration: daIntegrationRouter,
  fieldMappingRecommend: fieldMappingRecommendRouter,
  translation: translationRouter,
  microsoftGraph: microsoftGraphRouter,
  dashboard: dashboardRouter,
};
