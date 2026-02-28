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

// Import delivery management router (replaces m7m9 placeholder)
import { deliveryRouter } from "./delivery/delivery.router";

// Import real DB-backed routers (replacing placeholders)
import { orgRouter } from "./routers/org.router";
import { mesRouter } from "./routers/mes.router";
import { complianceRouter } from "./routers/compliance.router";
import { hrmRouter } from "./routers/hrm.router";
import { costRouter } from "./routers/cost.router";
import { costAlertRouter } from "./routers/cost-alert.router";
import { annualPlanningRouter } from "./routers/annual-planning.router";
import { webhookRouter as realWebhookRouter } from "./routers/webhook.router";
import { namingRouter as realNamingRouter } from "./routers/naming.router";
import { communityRouter as realCommunityRouter } from "./routers/community.router";
import { tripRequestRouter as realTripRequestRouter } from "./routers/trip-request.router";
import { reportTemplateRouter as realReportTemplateRouter } from "./routers/report-template.router";
import { importHistoryRouter as realImportHistoryRouter } from "./routers/import-history.router";
import { chatHistoryRouter as realChatHistoryRouter } from "./routers/chat-history.router";
import { taskExecutionLogRouter as realTaskExecutionLogRouter } from "./routers/task-execution-log.router";
import { trainingCertificateRouter as realTrainingCertificateRouter } from "./routers/training-certificate.router";
import { trainingAssessmentRouter as realTrainingAssessmentRouter } from "./routers/training-assessment.router";
import { processNotebookRouter as realProcessNotebookRouter } from "./routers/process-notebook.router";
import { feedbackRouter as realFeedbackRouter } from "./routers/feedback.router";
import { analyticsRouter as realAnalyticsRouter } from "./routers/analytics.router";
import { expenseReportRouter as realExpenseReportRouter } from "./routers/expense-report.router";
import { expenseComparisonRouter as realExpenseComparisonRouter } from "./routers/expense-comparison.router";
import { projectRouter as realProjectRouter } from "./routers/project.router";
import { aiPlanningRouter } from "./routers/ai-planning.router";
import { fmeaRouter } from "./routers/fmea.router";
import { controlPlanRouter } from "./routers/control-plan.router";
import { taskBoardRouter } from "./routers/task-board.router";
import { ppapRouter } from "./routers/ppap.router";
import { msaRouter } from "./routers/msa.router";
import { eightDCapaRouter } from "./routers/eight-d-capa.router";
import { sopDbRouter } from "./routers/sop-db.router";
import { safetyRuleRouter } from "./routers/safety-rule.router";
import { workerRouter as realWorkerRouter } from "./routers/worker.router";
import { agendaRouter as realAgendaRouter } from "./routers/agenda.router";
import { planningDependencyRouter as realPlanningDependencyRouter } from "./routers/planning-dependency.router";
import { migrationRouter as realMigrationRouter } from "./routers/migration.router";
import { leadImportRouter as realLeadImportRouter } from "./routers/lead-import.router";
import { aiChatRouter as realAiChatRouter } from "./routers/ai-chat.router";
import { usersRouter as realUsersRouter } from "./routers/users.router";
import { aiSuggestionRouter as realAiSuggestionRouter } from "./routers/ai-suggestion.router";
import { aiNotebookRouter as realAiNotebookRouter } from "./routers/ai-notebook.router";
import { redBlueRouter } from "./routers/red-blue.router";
import { alertRuleRouter as realAlertRuleRouter } from "./routers/alert-rule.router";
import { authRouter as realAuthRouter } from "./routers/auth.router";
import { travelDashboardRouter as realTravelDashboardRouter } from "./routers/travel-dashboard.router";
import { ruleTemplateRouter as realRuleTemplateRouter } from "./routers/rule-template.router";

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
import { aiTriggerRouter as realAiTriggerRouter } from "./routers/ai-trigger.router";
import { expenseReportSchedulerRouter as realExpenseReportSchedulerRouter } from "./routers/expense-report-scheduler.router";
import { reportSchedulerRouter as realReportSchedulerRouter } from "./routers/report-scheduler.router";
import { deadlockMonitorRouter as realDeadlockMonitorRouter } from "./routers/deadlock-monitor.router";
import { templateUsageStatsRouter as realTemplateUsageStatsRouter } from "./routers/template-usage-stats.router";
import { hrLifecycleRouter as realHrLifecycleRouter } from "./routers/hr-lifecycle.router";
import { fieldMappingRouter as realFieldMappingRouter } from "./routers/field-mapping.router";
import { employeeDARouter as realEmployeeDARouter } from "./routers/employee-da.router";
import { ruleVersionRouter as realRuleVersionRouter } from "./routers/rule-version.router";
import { notificationChannelTestRouter as realNotificationChannelTestRouter } from "./routers/notification-channel-test.router";
import { leadAnalyticsRouter as realLeadAnalyticsRouter } from "./routers/lead-analytics.router";
import { newAiAssistantRouter as realNewAiAssistantRouter } from "./routers/new-ai-assistant.router";
import { leadAutoFollowRouter as realLeadAutoFollowRouter } from "./routers/lead-auto-follow.router";
import { expenseForecastRouter as realExpenseForecastRouter } from "./routers/expense-forecast.router";
import { budgetOverrunApprovalRouter as realBudgetOverrunApprovalRouter } from "./routers/budget-overrun-approval.router";
import { expenseComparisonExportRouter as realExpenseComparisonExportRouter } from "./routers/expense-comparison-export.router";
import { daIntegrationRouter as realDaIntegrationRouter } from "./routers/da-integration.router";
import { fieldMappingRecommendRouter as realFieldMappingRecommendRouter } from "./routers/field-mapping-recommend.router";
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
import { contractRouter } from "./contract/contract.router";
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

// Phase D: AI项目智能 (知识问答/相似项目/变更影响/风险预测)
import { projectIntelligenceRouter } from "./project-intelligence/projectIntelligence.router";

// Phase E: 供应链与质量智能 (供应商评估/库存优化/质量预测/生产效率)
import { operationsIntelligenceRouter } from "./operations-intelligence/operationsIntelligence.router";

// Phase F: HR与人才智能 (人才评估/培训推荐/薪酬分析/人力规划)
import { hrIntelligenceRouter } from "./hr-intelligence/hrIntelligence.router";

// Phase G: 销售与财务智能 (销售预测/客户流失/预算异常/成本优化)
import { salesFinanceIntelligenceRouter } from "./sales-finance-intelligence/salesFinanceIntelligence.router";

// Phase H: 研发与客服智能 (需求分析/设计审查/故障诊断/预防维护)
import { rdServiceIntelligenceRouter } from "./rd-service-intelligence/rdServiceIntelligence.router";

// Phase 21 P0: 清洁度质检/交接班/SOP工艺卡/客户报修
import { cleanlinessQcRouter } from "./cleanliness-qc/cleanlinessQc.router";
import { shiftHandoverRouter } from "./shift-handover/shiftHandover.router";
import { sopEditorRouter } from "./sop-editor/sopEditor.router";
import { customerRepairRouter } from "./customer-repair/customerRepair.router";

// Phase 21 P1: 质量高级/生产高级/服务销售高级
import { qualityAdvancedRouter } from "./quality-advanced/qualityAdvanced.router";
import { productionAdvancedRouter } from "./production-advanced/productionAdvanced.router";
import { serviceSalesAdvancedRouter } from "./service-sales-advanced/serviceSalesAdvanced.router";

// Phase 21 P2: 工单→知识库/NPS/评审→报价/质量月报/BOM冻结/验收通知
import { p2AutomationRouter } from "./p2-automation/p2Automation.router";

// Phase I: 区域合规与本地化 (CN劳动法/五险一金/认证/工作日/VAT/本地化)
import { regionalComplianceRouter } from "./regional-compliance/regionalCompliance.router";

// HR & KPI Performance Management (岗位KPI/指标库/目标/技能矩阵/月度绩效/军令状)
import { kpiPerformanceRouter } from "./kpi-performance/kpiPerformance.router";

// Workshop Kiosk (IATF 16949 / VDA 6.3 compliance)
import { kioskRouter } from "./routers/kiosk.router";
import { capabilityOsRouter as realCapabilityOsRouter } from "./routers/capability-os.router";
import { taskCockpitRouter } from "./routers/task-cockpit.router";
import { testEngineRouter } from "./routers/test-engine.router";
import { plmRouter } from "./routers/plm.router";
import { digitalTwinRouter } from "./routers/digital-twin.router";
import { oaRouter } from "./routers/oa.router";
import { oaFormsRouter } from "./routers/oa-forms.router";
import { competencyRouter as realCompetencyRouter } from "./routers/competency.router";
import { governanceRouter } from "./routers/governance.router";
import { aiSecurityGovernanceRouter } from "./routers/ai-security-governance.router";
import { campaignRouter } from "./routers/campaign.router";
import { collaborationDocsRouter } from "./routers/collaboration-docs.router";
import { concurrentCommandRouter } from "./routers/concurrent-command.router";
import { genesisRouter } from "./routers/genesis.router";
import { helpRouter } from "./routers/help.router";
import { supplyChainRouter } from "./routers/supply-chain.router";
import { p2pLifecycleRouter } from "./routers/p2p-lifecycle.router";
import { aiAgentFleetRouter } from "./routers/ai-agent-fleet.router";
import { reportCenterRouter } from "./routers/report-center.router";
import { visionDashboardRouter } from "./routers/vision-dashboard.router";
import { cicdRouter } from "./routers/cicd.router";
import { smartMeetingRouter } from "./routers/smart-meeting.router";
import { aiPerformanceRouter } from "./routers/ai-performance.router";
import { syncDispatchRouter } from "./routers/sync-dispatch.router";
import { dataMigrationRouter } from "./routers/data-migration.router";
import { aiCanvasRouter } from "./routers/ai-canvas.router";
import { okrRouter } from "./routers/okr.router";
import { excellenceCultureRouter } from "./routers/excellence-culture.router";
import { capabilitySystemRouter } from "./routers/capability-system.router";
import { cleaningProjectRouter } from "./routers/cleaning-project.router";
import { roleAgentRouter } from "./routers/role-agent.router";
import { automationRouter } from "./routers/automation.router";
import { aiTaskRouter } from "./routers/ai-task.router";
import { hrSandboxRouter } from "./routers/hr-sandbox.router";
import { violationEventRouter } from "./routers/violation-event.router";
import { performanceRecordRouter } from "./routers/performance-record.router";

// GRT Value Chain Enhancement — 非标清洗设备全价值链
import { equipmentComplianceRouter } from "./routers/equipment-compliance.router";
import { processTrialRouter } from "./routers/process-trial.router";
import { customerNdaRouter } from "./routers/customer-nda.router";
import { salesMaterialsRouter } from "./routers/sales-materials.router";
import { projectDrawingsRouter } from "./routers/project-drawings.router";
import { vaultRouter } from "./routers/vault.router";
import { project360Router } from "./routers/project360.router";
import { sopInterlockRouter } from "./routers/sop-interlock.router";
import { oeeDashboardRouter } from "./routers/oee-dashboard.router";
import { complianceCalendarRouter } from "./routers/compliance-calendar.router";
import { ecoImpactRouter } from "./routers/eco-impact.router";
import { supplierRiskRouter } from "./routers/supplier-risk.router";
import { employeeProfileRouter } from "./routers/employee-profile.router";
import { fmeaDynamicRouter } from "./routers/fmea-dynamic.router";
import { aiInterventionRouter } from "./routers/ai-intervention.router";
import { smartSchedulerRouter } from "./routers/smart-scheduler.router";
import { smartInventoryRouter } from "./routers/smart-inventory.router";
import { carbonFootprintRouter } from "./routers/carbon-footprint.router";
import { digitalThreadRouter } from "./routers/digital-thread.router";
import { strategyGoalsRouter } from "./routers/strategy-goals.router";
import { buSalesTargetRouter } from "./routers/bu-sales-target.router";

/**
 * This is the primary router for the tRPC API.
 * All application routes are registered here.
 */
export const appRouter = router({
  // Organization
  org: orgRouter,
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
  capabilityOs: realCapabilityOsRouter,
  afterSales: realAfterSalesRouter,
  compliance: complianceRouter,
  webhook: realWebhookRouter,
  agenda: realAgendaRouter,
  naming: realNamingRouter,
  hrm: hrmRouter,
  reportTemplate: realReportTemplateRouter,
  cost: costRouter,
  community: realCommunityRouter,
  m7m9: deliveryRouter,
  tripRequest: realTripRequestRouter,
  crm: crmRouter,
  contract: contractRouter,
  annualPlanning: annualPlanningRouter,
  changeManagement: realChangeManagementRouter,
  expenseReportScheduler: realExpenseReportSchedulerRouter,
  costAlert: costAlertRouter,
  alertRule: realAlertRuleRouter,
  worker: realWorkerRouter,
  reportScheduler: realReportSchedulerRouter,
  employeeAiAssistant: employeeAiAssistantRouter,
  skillRecommendation: skillRecommendationRouter,
  permissionManagement: permissionManagementRouter,
  deadlockMonitor: realDeadlockMonitorRouter,
  aiTrigger: realAiTriggerRouter,
  templateUsageStats: realTemplateUsageStatsRouter,
  hrLifecycle: realHrLifecycleRouter,
  fieldMapping: realFieldMappingRouter,
  employeeDA: realEmployeeDARouter,
  ruleVersion: realRuleVersionRouter,
  project: realProjectRouter,
  processNotebook: realProcessNotebookRouter,
  chatHistory: realChatHistoryRouter,
  aiExecutionMode: aiExecutionModeRouter,
  taskExecutionLog: realTaskExecutionLogRouter,
  ruleTemplate: realRuleTemplateRouter,
  planningDependency: realPlanningDependencyRouter,
  notificationChannelTest: realNotificationChannelTestRouter,
  leadAnalytics: realLeadAnalyticsRouter,
  importHistory: realImportHistoryRouter,
  devTasks: realDevTasksRouter,
  aiSuggestion: realAiSuggestionRouter,
  aiNotebook: realAiNotebookRouter,
  trainingCertificate: realTrainingCertificateRouter,
  trainingAssessment: realTrainingAssessmentRouter,
  redBlue: redBlueRouter,
  projectGate: projectGateRouter,
  productionDashboard: productionRouter,
  processManagement: processManagementRouter,
  questionnaire: questionnaireRouter,
  newAiAssistant: realNewAiAssistantRouter,
  migration: realMigrationRouter,
  leadImport: realLeadImportRouter,
  leadAutoFollow: realLeadAutoFollowRouter,
  expenseReport: realExpenseReportRouter,
  expenseForecast: realExpenseForecastRouter,
  expenseComparison: realExpenseComparisonRouter,
  budgetOverrunApproval: realBudgetOverrunApprovalRouter,
  aiChat: realAiChatRouter,
  knowledgeBase: realKnowledgeBaseRouter,
  users: realUsersRouter,
  auth: realAuthRouter,
  analytics: realAnalyticsRouter,
  feedback: realFeedbackRouter,
  
  // 钉钉通知集成
  dingtalk: dingtalkRouter,
  ai: aiRouter,
  aiPlanning: aiPlanningRouter,
  fmea: fmeaRouter,
  controlPlan: controlPlanRouter,
  taskBoard: taskBoardRouter,
  ppap: ppapRouter,
  msa: msaRouter,
  eightDCapa: eightDCapaRouter,
  safetyRule: safetyRuleRouter,

  // AI服务和能力证据
  aiServices: aiServicesRouter,
  microsoftGraph: microsoftGraphRouter,
  capabilityEvidence: capabilityEvidenceRouter,
  socialPlatformConfig: socialPlatformConfigRouter,
  workspace: workspaceRouter,
  collaborationDocs: collaborationDocsRouter,
  concurrentCommand: concurrentCommandRouter,
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
  travelDashboard: realTravelDashboardRouter,
  expenseComparisonExport: realExpenseComparisonExportRouter,
  daIntegration: realDaIntegrationRouter,
  fieldMappingRecommend: realFieldMappingRecommendRouter,

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
  // SOP Template Library (DB-backed, replaces in-memory service)
  sop: sopDbRouter,

  // 成本标准与产品配置
  costStandards: costStandardsRouter,

  // AI助手模块 (采购助手、质量助手、服务助手)
  purchaseAssistant: purchaseAssistantRouter,
  qualityAssistant: qualityAssistantRouter,
  serviceAssistant: serviceAssistantRouter,

  // Phase D: AI项目智能 (知识问答/相似项目/变更影响/风险预测)
  projectIntelligence: projectIntelligenceRouter,

  // Phase E: 供应链与质量智能 (供应商评估/库存优化/质量预测/生产效率)
  operationsIntelligence: operationsIntelligenceRouter,

  // Phase F: HR与人才智能 (人才评估/培训推荐/薪酬分析/人力规划)
  hrIntelligence: hrIntelligenceRouter,

  // Phase G: 销售与财务智能 (销售预测/客户流失/预算异常/成本优化)
  salesFinanceIntelligence: salesFinanceIntelligenceRouter,

  // Phase H: 研发与客服智能 (需求分析/设计审查/故障诊断/预防维护)
  rdServiceIntelligence: rdServiceIntelligenceRouter,

  // Phase 21 P0: 清洁度质检/交接班/SOP工艺卡/客户报修
  cleanlinessQc: cleanlinessQcRouter,
  shiftHandover: shiftHandoverRouter,
  sopEditor: sopEditorRouter,
  customerRepair: customerRepairRouter,

  // Phase 21 P1: 质量高级/生产高级/服务销售高级
  qualityAdvanced: qualityAdvancedRouter,
  productionAdvanced: productionAdvancedRouter,
  serviceSalesAdvanced: serviceSalesAdvancedRouter,

  // Phase 21 P2: 工单→知识库/NPS/评审→报价/质量月报/BOM冻结/验收通知
  p2Automation: p2AutomationRouter,

  // Phase I: 区域合规与本地化
  regionalCompliance: regionalComplianceRouter,

  // HR & KPI Performance Management
  kpiPerformance: kpiPerformanceRouter,

  // Smart Cockpit (任务驾驶舱 — 时间追踪、前置条件、分类任务管理)
  taskCockpit: taskCockpitRouter,

  // Testing & Template Engine (Software UAT, PLC, FAT/SAT, custom)
  testEngine: testEngineRouter,

  // Light-PLM: Document Management (SolidWorks, EPLAN, versioning, design reviews)
  plm: plmRouter,

  // Digital Twin Hub — IATF 16949 compliant 3D asset management
  digitalTwin: digitalTwinRouter,

  // Smart OA & Command Center (请假/用车/文具/礼品审批 + 晨会看板 + 出差报告)
  oa: oaRouter,
  // OA Dynamic Forms Engine (templates, submissions, multi-step approvals)
  oaForms: oaFormsRouter,

  // Workshop Kiosk (IATF 16949 / VDA 6.3 compliance)
  kiosk: kioskRouter,

  // HR Competency Assessment (TSDCKL六大能力矩阵)
  competency: realCompetencyRouter,
  mes: mesRouter,

  // System Control Tower — Enterprise Governance (MDM, BPMN, RLS, Audit)
  governance: governanceRouter,

  // Zero-Trust Security & Governance Gateway (OTP-gated destructive ops)
  aiSecurityGovernance: aiSecurityGovernanceRouter,

  // Strategic Campaigns — Global Rollover Engine
  campaign: campaignRouter,

  // AI Knowledge Genesis — Document Ingestion & Proposal Engine
  genesis: genesisRouter,

  // Context-Aware Help — Route-based help articles & empowerment overlay
  help: helpRouter,

  // Supply Chain Traceability & Quality Control (IATF 16949)
  supplyChain: supplyChainRouter,

  // P2P (Procure-to-Pay) Lifecycle — Framework Agreements, RFQ, Delivery, Payment Workflows
  p2p: p2pLifecycleRouter,

  // AI Agent Fleet — L1-L5 Multi-Agent Legion + G-Token Ledger
  aiAgentFleet: aiAgentFleetRouter,

  // Live Executive Briefing Center (动态汇报中枢)
  reportCenter: reportCenterRouter,

  // GRT Vision — Large-Screen Dashboards (Lobby / Shopfloor / BU / Service)
  visionDashboard: visionDashboardRouter,

  // CI/CD Pipeline Matrix (Dual-AI: Gemini strategist + Claude executor)
  cicd: cicdRouter,

  // Smart Meeting & AI Engagement Hub (智能会议与互动中枢)
  smartMeeting: smartMeetingRouter,

  // AI Performance Engine (AI绩效引擎 — 4-dimension meeting scores)
  aiPerformance: aiPerformanceRouter,

  // Office 365 Encrypted Email Ferry — Cross-Border Data Sync (US → China)
  syncDispatch: syncDispatchRouter,

  // Data Cleansing & Migration Hub (Legacy import with AI field mapping + sandbox isolation)
  dataMigration: dataMigrationRouter,

  // AI Canvas — Workflow Parser & Action Router (Req 9a: ubiquitous AI input)
  aiCanvas: aiCanvasRouter,
  aiTask: aiTaskRouter,

  // HR Sandbox Capability Model — ai_tasks queue-driven parsing
  hrSandbox: hrSandboxRouter,

  // HR Performance & Risk Control (绩效冻结 + 红线事件总线)
  violationEvent: violationEventRouter,
  performanceRecord: performanceRecordRouter,

  // OKR Engine — Objectives & Key Results (Strategy Hub)
  okr: okrRouter,

  // Excellence Culture Model — Strategy Compass & Capability Matrix
  excellenceCulture: excellenceCultureRouter,
  capabilitySystem: capabilitySystemRouter,

  // Cleaning Machine Project Wizard (M0→M2 lifecycle + T1-T15 milestones)
  cleaningProject: cleaningProjectRouter,

  // Role-Based AI Agent (role-specific quick actions + suggestions)
  roleAgent: roleAgentRouter,

  // Automation Hooks — Management Rhythm (OKR → Meetings closed-loop)
  automation: automationRouter,

  // GRT Value Chain Enhancement — 非标清洗设备全价值链
  equipmentCompliance: equipmentComplianceRouter,
  processTrial: processTrialRouter,
  customerNda: customerNdaRouter,
  salesMaterials: salesMaterialsRouter,
  projectDrawings: projectDrawingsRouter,

  // Digital Thread — Cloud Vault & Engineering Change Orders
  vault: vaultRouter,

  // Project 360 Cockpit — cross-module aggregation
  project360: project360Router,

  // Phase 1.2: SOP + Role Quality Interlock (machine access control)
  sopInterlock: sopInterlockRouter,

  // Phase 1.3: OEE Dashboard (IATF 16949 compliance)
  oeeDashboard: oeeDashboardRouter,

  // Phase 1.4: Compliance Calendar & Auto-Reminder
  complianceCalendar: complianceCalendarRouter,

  // Phase 2.1: ECO Cost Impact Analysis (PLM × WMS × ERP fusion)
  ecoImpact: ecoImpactRouter,

  // Phase 2.2: Supplier Risk Rating (IQC × SCM real-time interlock)
  supplierRisk: supplierRiskRouter,

  // Phase 2.3: Employee Digital Profile (HR × AI × Meeting × Cert fusion)
  employeeProfile: employeeProfileRouter,

  // Phase 2.4: Dynamic FMEA RPN (Shop Floor QC × Engineering FMEA fusion)
  fmeaDynamic: fmeaDynamicRouter,

  // Phase 3.1: AI Training Closed-Loop (AI-Driven Intervention + Interlock)
  aiIntervention: aiInterventionRouter,

  // Phase 3.2: Smart Scheduler (Equipment Health & Auto-Scheduling)
  smartScheduler: smartSchedulerRouter,

  // Phase 3.3: Smart Inventory (Dynamic Safety Stock & Cash Flow)
  smartInventory: smartInventoryRouter,

  // Phase 3.4: Carbon Footprint & CBAM Compliance
  carbonFootprint: carbonFootprintRouter,

  // Phase 4: Ultimate Digital Thread & Executive Cockpit
  digitalThread: digitalThreadRouter,

  // 2026 CEO Strategic Goals & Division Performance
  strategyGoals: strategyGoalsRouter,

  // BU Sales Target Planner — 事业部年度目标分解
  buSalesTarget: buSalesTargetRouter,

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
