import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";

// Import core module routers
import { permissionRouter } from "./permission-management/permission.router";
import { permissionRouter as rolePermissionRouter } from "./permissions/permission.router";
import { menuRouter } from "./menu-management/menu.router";
import { visitorRouter } from "./visitor-management/visitor.router";
import { aiAssistantRouter } from "./ai-assistants/ai-assistant.router";
import { capabilityRouter } from "./capability-management/capability.router";

// Import placeholder routers for TypeScript compatibility
import { placeholderRouters } from "./placeholder-routers";

// Import delivery management router (replaces m7m9 placeholder)
import { deliveryRouter } from "./delivery/delivery.router";

// Import real implementation routers
import { changeManagementRouter as realChangeManagementRouter } from "./deployment/changeManagement.router";
import { securityRouter } from "./security/securityRouter";
import { erpRouter } from "./erp/erp.router";
import { materialRouter } from "./materials/material.router";
import { procurementRouter } from "./procurement/procurement.router";
import { approvalRouter } from "./approval/approval.router";
import { tiansiERPRouter } from "./erp/tiansi-erp.router";
import { dingtalkRouter } from "./dingtalk/dingtalk.router";
import { aiRouter } from "./ai/ai.router";
import { employeeAiAssistantRouter } from "./routers/employee-ai-assistant.router";
import { skillRecommendationRouter } from "./routers/skill-recommendation.router";
import { permissionManagementRouter } from "./routers/permission-management.router";


// Import AI services and capability evidence routers
import { aiServicesRouter } from "./ai-services/ai-services.router";
import { microsoftGraphRouter } from "./services/microsoft-graph.router";
import { capabilityEvidenceRouter } from "./capability-evidence/capability-evidence.router";
import { socialPlatformConfigRouter } from "./routers/socialPlatformConfig.router";
import { workspaceRouter } from "./routers/workspace.router";
import { schedulingRouter } from "./routers/scheduling.router";
import { uwbRouter } from "./routers/uwb.router";
import { devTasksRouter as realDevTasksRouter } from "./routers/devTasks.router";
import { productionRouter } from "./routers/production.router";
import { processManagementRouter } from "./routers/processManagement.router";
import { questionnaireRouter } from "./routers/questionnaire.router";
import { projectGateRouter } from "./routers/projectGate.router";
import { jiandaoyunRouter } from "./routers/jiandaoyun.router";
import { buMappingRouter } from "./routers/bu-mapping.router";
import { employeeRouter } from "./routers/employee.router";
import { userProfileRouter } from "./routers/user-profile.router";
import { certificationRouter } from "./certification/certification.router";
import { annualAgendaRouter } from "./annual-agenda/annual-agenda.router";
import { aiExecutionModeRouter } from "./routers/ai-execution-mode.router";
import { schedulerRouter } from "./routers/scheduler.router";
import { monitoringRouter } from "./monitoring/monitoring.router";

// Import 5 major Gemini modules
import { socialCommunityRouter } from "./modules/socialCommunity.router";
import { liquidWorkforceRouter } from "./modules/liquidWorkforce.router";
import { aiSalesRouter } from "./modules/aiSales.router";
import { stageGateRouter } from "./modules/stageGate.router";
import { personalAgentRouter } from "./modules/personalAgent.router";
import { socialCommunityEnhancedRouter } from "./modules/socialCommunityEnhanced.router";
import { liquidWorkforceEnhancedRouter } from "./modules/liquidWorkforceEnhanced.router";
import { aiSalesEnhancedRouter } from "./modules/aiSalesEnhanced.router";
import { stageGateEnhancedRouter } from "./modules/stageGateEnhanced.router";
import { personalAgentEnhancedRouter } from "./modules/personalAgentEnhanced.router";
import { securityEnhancedRouter } from "./modules/securityEnhanced.router";
import { trainingEnhancedRouter } from "./modules/trainingEnhanced.router";
import { geminiIntegrationRouter } from "./modules/geminiIntegration.router";
import { productionExecutionRouter } from "./production-execution/production-execution.router";
import { meetingRouter } from "./meeting-intelligence/meeting.router";
import { meetingTaskLoopRouter } from "./meeting-intelligence/meeting-task-loop.router";
import { customerSolutionMeetingRouter } from "./meeting-intelligence/customer-solution-meeting.router";
import { webhookConfigRouter } from "./meeting-intelligence/webhook-config.router";
import { caseLibraryRouter } from "./meeting-intelligence/case-library.router";
import { lifecycleRouter } from "./lifecycle/lifecycle.router";
import { aiAdapterRouter } from "./ai-adapter/ai-adapter.router";
import { syncRouter } from "./sync/sync.router";
import { posRouter } from "./pos/pos.router";
import { offboardingRouter } from "./offboarding/offboarding.router";
import { processStepsRouter } from "./production-steps/processSteps.router";
import { qualityMaterialPerformanceRouter } from "./production-steps/qualityMaterialPerformance.router";
import { qualityInterlockRouter } from "./production-steps/qualityInterlock.router";
import { bomVerificationRouter } from "./production-steps/bomVerification.router";
import { salaryBonusRouter } from "./production-steps/salaryBonus.router";
import { ccdIntegrationRouter } from "./production-steps/ccdIntegration.router";
import { bomImportRouter } from "./production-steps/bomImport.router";
import { salaryReportRouter } from "./production-steps/salaryReport.router";
import { ccdWebSocketRouter } from "./production-steps/ccdWebSocket.router";
import { bomExcelImportRouter } from "./production-steps/bomExcelImport.router";
import { salaryApprovalRouter } from "./production-steps/salaryApproval.router";
import { buRouter } from "./routers/bu.router";
import { bomRouter } from "./routers/bom.router";
import { warehouseRouter } from "./routers/warehouse.router";
import { docIntelligenceRouter } from "./doc-intelligence/doc-intelligence.router";
import { crmRouter } from "./crm/crm.router";
import { changeEventRouter } from "./modules/changeEvent.router";
import { knowledgeBaseRouter as realKnowledgeBaseRouter } from "./modules/knowledge-base.router";
import { timeReconciliationRouter } from "./services/time-reconciliation.router";
import { fatSatRouter } from "./services/fat-sat.router";
import { fieldServiceRouter } from "./services/field-service.router";
import { o365SyncRouter } from "./services/o365-sync.router";
import { vectorSearchRouter } from "./services/vector-search.router";
import { gamificationRouter } from "./services/gamification.router";
import { performanceTraceRouter } from "./services/performance-trace.router";
import { iotDigitalTwinRouter } from "./services/iot-digital-twin.router";

import { afterSalesRouter as realAfterSalesRouter } from "./services/after-sales.router";
import { architectureRouter } from "./services/architecture.router";
import { aiEarlyWarningRouter } from "./services/ai-early-warning.router";
import { sopRouter } from "./services/sop.router";
import { costStandardsRouter } from "./services/cost-standards.router";
import { imeRouter } from "./ime/ime.router";
import { dailyPlanRouter } from "./daily-plan/daily-plan.router";
import { delegationRouter } from "./delegation/delegation.router";
import { perfSalaryRouter } from "./perf-salary/perfSalary.router";
import { customerTicketRouter } from "./customer-ticket/customerTicket.router";
import { customerCommRouter } from "./customer-ticket/customerComm.router";

// AI Assistant modules (Purchase, Quality, Service)
import { purchaseAssistantRouter } from "./ai-assistants/purchaseRoutes";
import { qualityAssistantRouter } from "./ai-assistants/qualityRoutes";
import { serviceAssistantRouter } from "./ai-assistants/serviceRoutes";

/**
 * This is the primary router for the tRPC API.
 * All application routes are registered here.
 */
export const appRouter = router({
  // System and authentication
  system: systemRouter,
  security: securityRouter,
  erp: erpRouter,
  tiansiERP: tiansiERPRouter,
  materials: materialRouter,
  procurement: procurementRouter,
  approval: approvalRouter,

  // 5 Major Gemini Modules
  socialCommunity: socialCommunityRouter,
  liquidWorkforce: liquidWorkforceRouter,
  aiSales: aiSalesRouter,
  stageGate: stageGateRouter,
  personalAgent: personalAgentRouter,
  socialCommunityEnhanced: socialCommunityEnhancedRouter,
  liquidWorkforceEnhanced: liquidWorkforceEnhancedRouter,
  aiSalesEnhanced: aiSalesEnhancedRouter,
  stageGateEnhanced: stageGateEnhancedRouter,
  personalAgentEnhanced: personalAgentEnhancedRouter,
  securityEnhanced: securityEnhancedRouter,
  trainingEnhanced: trainingEnhancedRouter,

  // Gemini代码整合模块（液态用工、AI销售、门径管理、个人智能体、核心业务、社群管理、ERP连接）
  gemini: geminiIntegrationRouter,

  // Core business modules
  permission: permissionRouter,
  rolePermission: rolePermissionRouter,
  menu: menuRouter,
  visitor: visitorRouter,
  aiAssistant: aiAssistantRouter,
  capability: capabilityRouter,

  // Business Unit Management
  bu: buRouter,

  // Placeholder routers for TypeScript compatibility
  // These return empty/mock data and can be replaced with real implementations
  capabilityOs: placeholderRouters.capabilityOs,
  afterSales: realAfterSalesRouter,
  compliance: placeholderRouters.compliance,
  webhook: placeholderRouters.webhook,
  agenda: placeholderRouters.agenda,
  naming: placeholderRouters.naming,
  hrm: placeholderRouters.hrm,
  reportTemplate: placeholderRouters.reportTemplate,
  cost: placeholderRouters.cost,
  community: placeholderRouters.community,
  m7m9: deliveryRouter,
  tripRequest: placeholderRouters.tripRequest,
  crm: crmRouter,
  annualPlanning: placeholderRouters.annualPlanning,
  changeManagement: realChangeManagementRouter,
  expenseReportScheduler: placeholderRouters.expenseReportScheduler,
  costAlert: placeholderRouters.costAlert,
  alertRule: placeholderRouters.alertRule,
  worker: placeholderRouters.worker,
  reportScheduler: placeholderRouters.reportScheduler,
  employeeAiAssistant: employeeAiAssistantRouter,
  skillRecommendation: skillRecommendationRouter,
  permissionManagement: permissionManagementRouter,
  deadlockMonitor: placeholderRouters.deadlockMonitor,
  aiTrigger: placeholderRouters.aiTrigger,
  templateUsageStats: placeholderRouters.templateUsageStats,
  hrLifecycle: placeholderRouters.hrLifecycle,
  fieldMapping: placeholderRouters.fieldMapping,
  employeeDA: placeholderRouters.employeeDA,
  ruleVersion: placeholderRouters.ruleVersion,
  project: placeholderRouters.project,
  processNotebook: placeholderRouters.processNotebook,
  chatHistory: placeholderRouters.chatHistory,
  aiExecutionMode: aiExecutionModeRouter,
  taskExecutionLog: placeholderRouters.taskExecutionLog,
  ruleTemplate: placeholderRouters.ruleTemplate,
  planningDependency: placeholderRouters.planningDependency,
  notificationChannelTest: placeholderRouters.notificationChannelTest,
  leadAnalytics: placeholderRouters.leadAnalytics,
  importHistory: placeholderRouters.importHistory,
  devTasks: realDevTasksRouter,
  aiSuggestion: placeholderRouters.aiSuggestion,
  aiNotebook: placeholderRouters.aiNotebook,
  trainingCertificate: placeholderRouters.trainingCertificate,
  trainingAssessment: placeholderRouters.trainingAssessment,
  redBlue: placeholderRouters.redBlue,
  projectGate: projectGateRouter,
  productionDashboard: productionRouter,
  processManagement: processManagementRouter,
  questionnaire: questionnaireRouter,
  newAiAssistant: placeholderRouters.newAiAssistant,
  migration: placeholderRouters.migration,
  leadImport: placeholderRouters.leadImport,
  leadAutoFollow: placeholderRouters.leadAutoFollow,
  expenseReport: placeholderRouters.expenseReport,
  expenseForecast: placeholderRouters.expenseForecast,
  expenseComparison: placeholderRouters.expenseComparison,
  budgetOverrunApproval: placeholderRouters.budgetOverrunApproval,
  aiChat: placeholderRouters.aiChat,
  knowledgeBase: realKnowledgeBaseRouter,
  users: placeholderRouters.users,
  auth: placeholderRouters.auth,
  analytics: placeholderRouters.analytics,
  feedback: placeholderRouters.feedback,
  
  // 钉钉通知集成
  dingtalk: dingtalkRouter,
  ai: aiRouter,
  
  // AI服务和能力证据
  aiServices: aiServicesRouter,
  microsoftGraph: microsoftGraphRouter,
  capabilityEvidence: capabilityEvidenceRouter,
  socialPlatformConfig: socialPlatformConfigRouter,
  workspace: workspaceRouter,
  scheduling: schedulingRouter,
  uwb: uwbRouter,
  
  // 简道云集成
  jiandaoyun: jiandaoyunRouter,

  // BU事业部映射
  buMapping: buMappingRouter,

  // 员工管理
  employee: employeeRouter,

  // 用户Profile设置
  userProfile: userProfileRouter,

  // 定时任务调度
  scheduler: schedulerRouter,

  // 监控仪表板
  monitoring: monitoringRouter,

  // 资质管理
  certification: certificationRouter,

  // 年度企业日程
  annualAgenda: annualAgendaRouter,

  // 生产执行模块 (T1-T15工作流程、工时采集、阶段审批)
  productionExecution: productionExecutionRouter,
  meeting: meetingRouter,
  meetingTaskLoop: meetingTaskLoopRouter,

  // G-IME: 参会者贡献分析与会议效能 (Intelligent Meeting Executive)
  ime: imeRouter,

  // 每日工作计划推送 (AI-driven daily work plan)
  dailyPlan: dailyPlanRouter,

  // Phase B: 代理职能 + 绩效薪资查询
  delegation: delegationRouter,
  perfSalary: perfSalaryRouter,
  customerSolutionMeeting: customerSolutionMeetingRouter,
  taskNotification: webhookConfigRouter,
  caseLibrary: caseLibraryRouter,

  // Phase C: 客户需求工单系统 + 沟通记录归档
  customerTicket: customerTicketRouter,
  customerComm: customerCommRouter,

  // M0-M12项目生命周期状态机
  lifecycle: lifecycleRouter,

  // AI适配器模式 (OpenAI/DeepSeek/Ollama)
  aiAdapter: aiAdapterRouter,

  // 跨节点数据同步
  sync: syncRouter,

  // 项目型组织操作系统 (POS)
  pos: posRouter,

  // 员工离职数据管理
  offboarding: offboardingRouter,
  processSteps: processStepsRouter,
  qualityMaterialPerformance: qualityMaterialPerformanceRouter,

  // v1.7.0 生产制造高级联动功能
  qualityInterlock: qualityInterlockRouter,
  bomVerification: bomVerificationRouter,
  salaryBonus: salaryBonusRouter,

  // v1.7.1 生产制造联动增强功能
  ccdIntegration: ccdIntegrationRouter,
  bomImport: bomImportRouter,
  salaryReport: salaryReportRouter,

  // v1.7.2 生产制造联动深度增强
  ccdWebSocket: ccdWebSocketRouter,
  bomExcelImport: bomExcelImportRouter,
  salaryApproval: salaryApprovalRouter,

  // BOM管理 (BOM主表、明细行、版本管理、成本卷积)
  bom: bomRouter,

  // 仓库管理 (仓库、库位、入库、出库、盘点、批次、序列号)
  warehouse: warehouseRouter,

  // Phase A: 工程文档AI推荐系统 (语义搜索、阶段文档推荐、完备性检查)
  docIntelligence: docIntelligenceRouter,

  // 设计变更 → BOM → PO 联动通知 (变更链追溯)
  changeEvent: changeEventRouter,

  // 三套工时对账 (UWB / BOM步骤 / 生产执行 工时对比)
  timeReconciliation: timeReconciliationRouter,

  // FAT/SAT (Factory/Site Acceptance Test) persistence
  fatSat: fatSatRouter,

  // Field Service (Tasks #60, #61, #62: KB recommend, quality escalation, spare parts)
  fieldService: fieldServiceRouter,

  // Additional placeholder routers
  travelDashboard: placeholderRouters.travelDashboard,
  expenseComparisonExport: placeholderRouters.expenseComparisonExport,
  daIntegration: placeholderRouters.daIntegration,
  fieldMappingRecommend: placeholderRouters.fieldMappingRecommend,

  // AI Early Warning System (3-layer: Health Scanner, Risk Scorer, LLM Narrative)
  aiEarlyWarning: aiEarlyWarningRouter,

  // Schema architecture improvements (Tasks #63, #64, #65, #67, #77)
  architecture: architectureRouter,

    
  // Platform Capability Enhancements (Tasks #66, #74, #75, #76, #78)
  o365Sync: o365SyncRouter,
  vectorSearch: vectorSearchRouter,
  gamification: gamificationRouter,
  performanceTrace: performanceTraceRouter,
  iotDigitalTwin: iotDigitalTwinRouter,
  // SOP Template Library
  sop: sopRouter,

  // 成本标准与产品配置
  costStandards: costStandardsRouter,

  // AI助手模块 (采购助手、质量助手、服务助手)
  purchaseAssistant: purchaseAssistantRouter,
  qualityAssistant: qualityAssistantRouter,
  serviceAssistant: serviceAssistantRouter,

  // Health check endpoint
  health: publicProcedure.query(async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "4.4.5",
    };
  }),

  // Echo endpoint for testing
  echo: publicProcedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => {
      return {
        echo: input.message,
        timestamp: new Date().toISOString(),
      };
    }),
});

export type AppRouter = typeof appRouter;
