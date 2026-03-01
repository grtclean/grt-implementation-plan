import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import RequireAuth from "./components/RequireAuth";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
const Docs = React.lazy(() => import("./pages/Docs"));
import Home from "./pages/Home";
const Risks = React.lazy(() => import("./pages/Risks"));
const Roadmap = React.lazy(() => import("./pages/Roadmap"));
const Tools = React.lazy(() => import("./pages/Tools"));
const JiandaoyunAnalysis = React.lazy(() => import("./pages/JiandaoyunAnalysis"));
const GuideReader = React.lazy(() => import("./pages/GuideReader"));
const MigrationTasks = React.lazy(() => import("./pages/MigrationTasks"));
const ArchitecturePlan = React.lazy(() => import("./pages/ArchitecturePlan"));
const DevTaskBoard = React.lazy(() => import("./pages/DevTaskBoard"));
const CrmCustomers = React.lazy(() => import("./pages/CrmCustomers"));
const CrmOpportunities = React.lazy(() => import("./pages/CrmOpportunities"));
const CrmContacts = React.lazy(() => import("./pages/CrmContacts"));
const ProjectManagement = React.lazy(() => import("./pages/ProjectManagement"));
const CostManagement = React.lazy(() => import("./pages/CostManagement"));
const AgendaManagement = React.lazy(() => import("./pages/AgendaManagement"));
const TrainingManagement = React.lazy(() => import("./pages/TrainingManagement"));
const AnnualPlanning = React.lazy(() => import("./pages/AnnualPlanning"));
const WebhookManagement = React.lazy(() => import("./pages/WebhookManagement"));
const NamingRulesManagement = React.lazy(() => import("./pages/NamingRulesManagement"));
const HRMIntelligent = React.lazy(() => import("./pages/HRMIntelligent"));
const AuditLogViewer = React.lazy(() => import("./pages/AuditLogViewer"));
const GroupNotificationManagement = React.lazy(() => import("./pages/GroupNotificationManagement"));
const AiAssistantHubPage = React.lazy(() => import("./pages/AiAssistantHubPage"));
const DigitalAssistants = React.lazy(() => import("./pages/DigitalAssistants"));
const AIEffectivenessTracking = React.lazy(() => import("./pages/AIEffectivenessTracking"));
const NotebookSearch = React.lazy(() => import("./pages/NotebookSearch"));
const SubsystemHelp = React.lazy(() => import("./pages/SubsystemHelp"));
import PublicHome from "./pages/PublicHome";
const Capabilities = React.lazy(() => import("./pages/Capabilities"));
const CustomerPortal = React.lazy(() => import("./pages/CustomerPortal"));
const DeadlockMonitor = React.lazy(() => import("./pages/DeadlockMonitor"));
const AIDiagnostic = React.lazy(() => import("./pages/AIDiagnostic"));
const CollaborationWorkspace = React.lazy(() => import("./pages/CollaborationWorkspace"));
const LiveDocumentManager = React.lazy(() => import("./pages/LiveDocumentManager"));
const SystemGuide = React.lazy(() => import("./pages/SystemGuide"));
const TranslationContribute = React.lazy(() => import("./pages/TranslationContribute"));
const HelpCenter = React.lazy(() => import("./pages/HelpCenter"));
const GeminiSpecification = React.lazy(() => import("./pages/GeminiSpecification"));
const DeploymentSpec = React.lazy(() => import("./pages/DeploymentSpec"));
const ComplianceDashboard = React.lazy(() => import("./pages/ComplianceDashboard"));
const EmployeeTimeDetails = React.lazy(() => import("./pages/EmployeeTimeDetails"));
const IntelligentScheduling = React.lazy(() => import("./pages/IntelligentScheduling"));
const ComplianceRulesConfig = React.lazy(() => import("./pages/ComplianceRulesConfig"));
const ChangeManagement = React.lazy(() => import("./pages/ChangeManagement"));
const HRLifecycle = React.lazy(() => import("./pages/HRLifecycle"));
const RDVerificationCenter = React.lazy(() => import("./pages/RDVerificationCenter"));
const StageGateDashboard = React.lazy(() => import("./pages/StageGateDashboard"));
const Community = React.lazy(() => import("./pages/Community"));
const LeadManagement = React.lazy(() => import("./pages/LeadManagement"));
const SchedulerManagement = React.lazy(() => import("./pages/SchedulerManagement"));
const TripRequest = React.lazy(() => import("./pages/TripRequest"));
const SupervisorWorkbench = React.lazy(() => import("./pages/SupervisorWorkbench"));
const BudgetManagement = React.lazy(() => import("./pages/BudgetManagement"));
const ExpenseReport = React.lazy(() => import("./pages/ExpenseReport"));
const MobileLocationReport = React.lazy(() => import("./pages/mobile/MobileLocationReport"));
const MobileApproval = React.lazy(() => import("./pages/mobile/MobileApproval"));
const FieldEngineerDashboard = React.lazy(() => import("./pages/mobile/FieldEngineerDashboard"));
const TravelDashboard = React.lazy(() => import("./pages/TravelDashboard"));
const ExpenseComparison = React.lazy(() => import("./pages/ExpenseComparison"));
const BudgetOverrunApproval = React.lazy(() => import("./pages/BudgetOverrunApproval"));
const ExpenseForecast = React.lazy(() => import("./pages/ExpenseForecast"));
const ExpenseReportScheduler = React.lazy(() => import("./pages/ExpenseReportScheduler"));
const CapabilityOS = React.lazy(() => import("./pages/CapabilityOS"));
const CapabilityDashboard = React.lazy(() => import("./pages/CapabilityDashboard"));
const EvidenceSubmission = React.lazy(() => import("./pages/EvidenceSubmission"));
const RedBlueBoard = React.lazy(() => import("./pages/RedBlueBoard"));
const EvidenceReview = React.lazy(() => import("./pages/EvidenceReview"));
const CapabilityCertificates = React.lazy(() => import("./pages/CapabilityCertificates"));
const CapabilityPathRecommendation = React.lazy(() => import("./pages/CapabilityPathRecommendation"));
const TeamCapabilityAnalysis = React.lazy(() => import("./pages/TeamCapabilityAnalysis"));
const CertificateVerify = React.lazy(() => import("./pages/CertificateVerify"));
const CapabilityBadges = React.lazy(() => import("./pages/CapabilityBadges"));
const CapabilityLeaderboard = React.lazy(() => import("./pages/CapabilityLeaderboard"));
const GRTCleaningStrategy = React.lazy(() => import("./pages/GRTCleaningStrategy"));
const EngineerCheckpoints = React.lazy(() => import("./pages/EngineerCheckpoints"));
const ToothpasteTest = React.lazy(() => import("./pages/ToothpasteTest"));
const CleaningTrajectory3D = React.lazy(() => import("./pages/CleaningTrajectory3D"));
const ToothpasteTestHistory = React.lazy(() => import("./pages/ToothpasteTestHistory"));
const AgentUnitManagement = React.lazy(() => import("./pages/AgentUnitManagement"));
const ModelExplainabilityReport = React.lazy(() => import("./pages/ModelExplainabilityReport"));
const KnowledgeGraphApproval = React.lazy(() => import("./pages/KnowledgeGraphApproval"));
const ModelTrainingScheduler = React.lazy(() => import("./pages/ModelTrainingScheduler"));
const ModelPerformanceMonitor = React.lazy(() => import("./pages/ModelPerformanceMonitor"));
const WorkflowManagement = React.lazy(() => import("./pages/WorkflowManagement"));
const NotificationAggregationPreview = React.lazy(() => import("./pages/NotificationAggregationPreview"));
const NotificationAggregationConfig = React.lazy(() => import("./pages/NotificationAggregationConfig"));
const ProductionDashboard = React.lazy(() => import("./pages/ProductionDashboard"));
const ProductionCommandCenter = React.lazy(() => import("./pages/ProductionCommandCenter"));
const WorkerManagement = React.lazy(() => import("./pages/WorkerManagement"));
const QCManagement = React.lazy(() => import("./pages/QCManagement"));
const M1KickoffDashboard = React.lazy(() => import("./pages/M1KickoffDashboard"));
const M7M9DeliveryTrack = React.lazy(() => import("./pages/M7M9DeliveryTrack"));
const FATCoordination = React.lazy(() => import("./pages/FATCoordination"));
const UWBManagement = React.lazy(() => import("./pages/UWBManagement"));
const WorkerImport = React.lazy(() => import("./pages/WorkerImport"));
const CronMonitor = React.lazy(() => import("./pages/CronMonitor"));
const DeliveryManagement = React.lazy(() => import("./pages/DeliveryManagement"));
const WebhookSettings = React.lazy(() => import("./pages/WebhookSettings"));
const AITriggerSettings = React.lazy(() => import("./pages/AITriggerSettings"));
const GateChecklistSettings = React.lazy(() => import("./pages/GateChecklistSettings"));
const AfterSalesManagement = React.lazy(() => import("./pages/AfterSalesManagement"));
const AfterSalesAdvanced = React.lazy(() => import("./pages/AfterSalesAdvanced"));
const CustomerSignature = React.lazy(() => import("./pages/CustomerSignature"));
const PermissionManagement = React.lazy(() => import("./pages/PermissionManagement"));
const VisitorRequestForm = React.lazy(() => import("./pages/VisitorRequestForm"));
const MenuManagement = React.lazy(() => import("./pages/MenuManagement"));
const AIAssistantPage = React.lazy(() => import("./pages/AIAssistantPage"));
const CapabilityManagementPage = React.lazy(() => import("./pages/CapabilityManagementPage"));
const SystemDeployment = React.lazy(() => import("./pages/SystemDeployment"));
const SecurityDashboard = React.lazy(() => import("./pages/SecurityDashboard"));
const SocialCommunity = React.lazy(() => import("./pages/SocialCommunity"));
const LiquidWorkforce = React.lazy(() => import("./pages/LiquidWorkforce"));
const AISales = React.lazy(() => import("./pages/AISales"));
const PersonalAgent = React.lazy(() => import("./pages/PersonalAgent"));
const SocialCommunitySettings = React.lazy(() => import("./pages/SocialCommunitySettings"));
const SocialCommunityAnalytics = React.lazy(() => import("./pages/SocialCommunityAnalytics"));
const ErpConfiguration = React.lazy(() => import("./pages/admin/ErpConfiguration"));
const AdminWebhookManagement = React.lazy(() => import("./pages/admin/WebhookManagement"));
const CertificateTemplates = React.lazy(() => import("./pages/admin/CertificateTemplates"));
const SystemGuideBook = React.lazy(() => import("./pages/SystemGuideBook"));
const LiquidWorkforceHub = React.lazy(() => import("./pages/LiquidWorkforceHub"));
const AiSalesHub = React.lazy(() => import("./pages/AiSalesHub"));
const PersonalAgentHub = React.lazy(() => import("./pages/PersonalAgentHub"));
const ProjectHub = React.lazy(() => import("./pages/ProjectHub"));
const SocialCommunityHub = React.lazy(() => import("./pages/SocialCommunityHub"));
const LiquidWorkforceHubEnhanced = React.lazy(() => import("./pages/LiquidWorkforceHubEnhanced"));
const AiSalesHubEnhanced = React.lazy(() => import("./pages/AiSalesHubEnhanced"));
const PersonalAgentHubEnhanced = React.lazy(() => import("./pages/PersonalAgentHubEnhanced"));
const ProjectHubEnhanced = React.lazy(() => import("./pages/ProjectHubEnhanced"));
const SocialCommunityHubEnhanced = React.lazy(() => import("./pages/SocialCommunityHubEnhanced"));
const ErpConnectionManager = React.lazy(() => import("./pages/admin/ErpConnectionManager"));
const LoginSuccess = React.lazy(() => import("./pages/LoginSuccess"));
const LocalLogin = React.lazy(() => import("./pages/LocalLogin"));
const DingTalkSettings = React.lazy(() => import("./pages/DingTalkSettings"));
const NotificationSettings = React.lazy(() => import("./pages/NotificationSettings"));
const AISolutionAssistant = React.lazy(() => import("./pages/ai/AISolutionAssistant"));
const AIQuotationAssistant = React.lazy(() => import("./pages/ai/AIQuotationAssistant"));
const AIPlanningAssistant = React.lazy(() => import("./pages/ai/AIPlanningAssistant"));
const AIKPIAssistant = React.lazy(() => import("./pages/ai/AIKPIAssistant"));
const CapabilityEvidenceUpload = React.lazy(() => import("./pages/capability/CapabilityEvidenceUpload"));
const MicrosoftGraphSettings = React.lazy(() => import("./pages/settings/MicrosoftGraphSettings"));
const SocialPlatformSettings = React.lazy(() => import("./pages/settings/SocialPlatformSettings"));
const GRTOperationDashboard = React.lazy(() => import("./pages/GRTOperationDashboard"));
const CustomerQuestionnaire = React.lazy(() => import("./pages/CustomerQuestionnaire"));
const ProcessGanttChart = React.lazy(() => import("./components/ProcessGanttChart"));
const JiandaoyunIntegration = React.lazy(() => import("./pages/JiandaoyunIntegration"));
const JiandaoyunFullImport = React.lazy(() => import("./pages/JiandaoyunFullImport"));
const JiandaoyunFormBrowser = React.lazy(() => import("./pages/JiandaoyunFormBrowser"));
const JiandaoyunWorkflowViewer = React.lazy(() => import("./pages/JiandaoyunWorkflowViewer"));
const JiandaoyunKnowledgeViewer = React.lazy(() => import("./pages/JiandaoyunKnowledgeViewer"));
const OrgTreePage = React.lazy(() => import("./pages/OrgTreePage"));
const CertificationManagement = React.lazy(() => import("./pages/CertificationManagement"));
const AnnualAgenda = React.lazy(() => import("./pages/AnnualAgenda"));
const CustomerValueView = React.lazy(() => import("./pages/CustomerValueView"));
const GlobalGrowthTracker = React.lazy(() => import("./pages/GlobalGrowthTracker"));
const ProductionExecutionView = React.lazy(() => import("./pages/ProductionExecutionView"));
const UWBDeviceManagement = React.lazy(() => import("./pages/production/UWBDeviceManagement"));
const MeetingIntelligence = React.lazy(() => import("./pages/meeting/MeetingIntelligence"));
const MeetingOwnerManagement = React.lazy(() => import("./pages/meeting/MeetingOwnerManagement"));
const NotificationChannelSettings = React.lazy(() => import("./pages/production/NotificationChannelSettings"));
const BUTeamManagement = React.lazy(() => import("./pages/BUTeamManagement"));
const BUPerformanceDashboard = React.lazy(() => import("./pages/BUPerformanceDashboard"));
const EmployeeManagement = React.lazy(() => import("./pages/EmployeeManagement"));
const EmployeeOffboarding = React.lazy(() => import("./pages/EmployeeOffboarding"));
const EmployeeIntelligentPerformance = React.lazy(() => import("./pages/EmployeeIntelligentPerformance"));
const UserProfileSettings = React.lazy(() => import("./pages/UserProfileSettings"));
const UserStatusManagement = React.lazy(() => import("./pages/UserStatusManagement"));
const SmartMeeting = React.lazy(() => import("./pages/SmartMeeting"));
const MeetingExecutive = React.lazy(() => import("./pages/MeetingExecutive"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const MonitoringDashboard = React.lazy(() => import("./pages/MonitoringDashboard"));
const ErrorLogViewer = React.lazy(() => import("./pages/ErrorLogViewer"));
const AIEarlyWarning = React.lazy(() => import("./pages/AIEarlyWarning"));
import { UserProfileProvider } from "./contexts/UserProfileContext";

// v1.4.5 项目型组织操作系统 (POS) 页面
const POSDashboard = React.lazy(() => import("./pages/pos/Dashboard"));

const POSProjectDetail = React.lazy(() => import("./pages/pos/ProjectDetail"));
const POSCustomers = React.lazy(() => import("./pages/pos/Customers"));
const StageM2Detail = React.lazy(() => import("./pages/pos/StageM2Detail"));
const StageReview = React.lazy(() => import("./pages/pos/StageReview"));
const POSVersions = React.lazy(() => import("./pages/pos/Versions"));
const POSProcurement = React.lazy(() => import("./pages/pos/Procurement"));
const POSMESSync = React.lazy(() => import("./pages/pos/MESSync"));
const POSConnectorConfig = React.lazy(() => import("./pages/pos/ConnectorConfig"));
const StageDetail = React.lazy(() => import("./pages/pos/StageDetail"));
const ProductionSteps = React.lazy(() => import("./pages/ProductionSteps"));
const ProcessProgressDashboard = React.lazy(() => import("./pages/ProcessProgressDashboard"));
const WorkerMobileView = React.lazy(() => import("./pages/WorkerMobileView"));
const AiAccuracyDashboard = React.lazy(() => import("./pages/AiAccuracyDashboard"));
const QualityCheckpoints = React.lazy(() => import("./pages/QualityCheckpoints"));
const MaterialFlowTracking = React.lazy(() => import("./pages/MaterialFlowTracking"));
const WorkerPerformanceLeaderboard = React.lazy(() => import("./pages/WorkerPerformanceLeaderboard"));
const QualityInterlock = React.lazy(() => import("./pages/QualityInterlock"));
const BomVerification = React.lazy(() => import("./pages/BomVerification"));
const SalaryBonus = React.lazy(() => import("./pages/SalaryBonus"));
const CcdIntegration = React.lazy(() => import("./pages/CcdIntegration"));
const BomImport = React.lazy(() => import("./pages/BomImport"));
const SalaryReport = React.lazy(() => import("./pages/SalaryReport"));
const CcdRealtime = React.lazy(() => import("./pages/CcdRealtime"));
const BomExcelImport = React.lazy(() => import("./pages/BomExcelImport"));
const SalaryApproval = React.lazy(() => import("./pages/SalaryApproval"));
const FinanceAgentWorkbench = React.lazy(() => import("./pages/FinanceAgentWorkbench"));
const BusinessUnits = React.lazy(() => import("./pages/BusinessUnits"));
const AIProcessOptimization = React.lazy(() => import("./pages/AIProcessOptimization"));
const HROffboarding = React.lazy(() => import("./pages/HROffboarding"));
const Notifications = React.lazy(() => import("./pages/Notifications"));
const MyTasks = React.lazy(() => import("./pages/MyTasks"));

// ======== 新增模块页面 ========
// 研发设计 (TX-001~005)
const RequirementsAnalysis = React.lazy(() => import("./pages/RequirementsAnalysis"));
const SolutionDesign = React.lazy(() => import("./pages/SolutionDesign"));
const MechanicalDesign = React.lazy(() => import("./pages/MechanicalDesign"));
const ElectricalDesign = React.lazy(() => import("./pages/ElectricalDesign"));
const BomManagement = React.lazy(() => import("./pages/BomManagement"));
const TechDocuments = React.lazy(() => import("./pages/TechDocuments"));
// 客户服务 (TX-013~015 + 售后)
const FieldInstallation = React.lazy(() => import("./pages/FieldInstallation"));
const SatTesting = React.lazy(() => import("./pages/SatTesting"));
const FinalAcceptance = React.lazy(() => import("./pages/FinalAcceptance"));
const ServiceTickets = React.lazy(() => import("./pages/ServiceTickets"));
const CustomerFeedback = React.lazy(() => import("./pages/CustomerFeedback"));
const SpareParts = React.lazy(() => import("./pages/SpareParts"));
// 绩效分层
const MyPerformance = React.lazy(() => import("./pages/MyPerformance"));
const TeamPerformance = React.lazy(() => import("./pages/TeamPerformance"));
const DeptPerformance = React.lazy(() => import("./pages/DeptPerformance"));
// 销售扩展
const QuotationManagement = React.lazy(() => import("./pages/QuotationManagement"));
const ContractManagement = React.lazy(() => import("./pages/ContractManagement"));
const SalesAnalytics = React.lazy(() => import("./pages/SalesAnalytics"));
// 生产扩展
const ProcessManagement = React.lazy(() => import("./pages/ProcessManagement"));
const MaterialTracking = React.lazy(() => import("./pages/MaterialTracking"));
// HR扩展
const Recruitment = React.lazy(() => import("./pages/Recruitment"));
const Attendance = React.lazy(() => import("./pages/Attendance"));
const Compensation = React.lazy(() => import("./pages/Compensation"));
// 项目扩展
const GanttChart = React.lazy(() => import("./pages/GanttChart"));
// 系统管理
const OrganizationManagement = React.lazy(() => import("./pages/OrganizationManagement"));
// P3: 权限管理扩展
const TemporaryPermissions = React.lazy(() => import("./pages/TemporaryPermissions"));
const PermissionBlacklist = React.lazy(() => import("./pages/PermissionBlacklist"));
const MenuAnalytics = React.lazy(() => import("./pages/MenuAnalytics"));
const RoleDashboard = React.lazy(() => import("./pages/RoleDashboard"));
const TaskCockpitPage = React.lazy(() => import("./pages/TaskCockpitPage"));
const Gamification = React.lazy(() => import("./pages/Gamification"));
const IoTDashboard = React.lazy(() => import("./pages/IoTDashboard"));
const IoTFleetDashboard = React.lazy(() => import("./pages/IoTFleetDashboard"));
const DigitalCloudHall = React.lazy(() => import("./pages/DigitalCloudHall"));
const ServiceDashboardAdmin = React.lazy(() => import("./pages/ServiceDashboardAdmin"));
const RAGTrainingCenter = React.lazy(() => import("./pages/RAGTrainingCenter"));
const DelegationManagement = React.lazy(() => import("./pages/DelegationManagement"));
const PerformanceSalaryQuery = React.lazy(() => import("./pages/PerformanceSalaryQuery"));
const KioskWorkshop = React.lazy(() => import("./pages/KioskWorkshop"));
const KioskQrConfirm = React.lazy(() => import("./pages/KioskQrConfirm"));
const TestExecutionDashboard = React.lazy(() => import("./pages/TestExecutionDashboard"));
const ProjectVault = React.lazy(() => import("./pages/ProjectVault"));
const DigitalTwinHub = React.lazy(() => import("./pages/DigitalTwinHub"));
const OADashboard = React.lazy(() => import("./pages/OADashboard"));
const PreSalesQuestionnaireForm = React.lazy(() => import("./pages/PreSalesQuestionnaireForm"));
const MorningMeetingBoard = React.lazy(() => import("./pages/MorningMeetingBoard"));
const CapabilityMatrixBoard = React.lazy(() => import("./pages/CapabilityMatrixBoard"));
const ShopfloorTerminal = React.lazy(() => import("./pages/ShopfloorTerminal"));
const SimulatorDashboard = React.lazy(() => import("./pages/SimulatorDashboard"));
const PLMWorkbench = React.lazy(() => import("./pages/PLMWorkbench"));
const AIGenesisWorkspace = React.lazy(() => import("./pages/AIGenesisWorkspace"));
const AiAssistantProvisioning = React.lazy(() => import("./pages/AiAssistantProvisioning"));
const AIAgentFleetDashboard = React.lazy(() => import("./pages/AIAgentFleetDashboard"));
const SystemControlTower = React.lazy(() => import("./pages/SystemControlTower"));
const ERPIntegration = React.lazy(() => import("./pages/ErpIntegration"));
const MaterialManagement = React.lazy(() => import("./pages/MaterialManagement"));
const ProcurementManagement = React.lazy(() => import("./pages/ProcurementManagement"));
const SupplyChainWorkbench = React.lazy(() => import("./pages/SupplyChainWorkbench"));
const ProcurementWorkbench = React.lazy(() => import("./pages/ProcurementWorkbench"));
const SupplyChainPlanning = React.lazy(() => import("./pages/SupplyChainPlanning"));
const SupplyChainRFQKanban = React.lazy(() => import("./pages/SupplyChainRFQKanban"));
const PPAPManagement = React.lazy(() => import("./pages/PPAPManagement"));
const FMEAManagement = React.lazy(() => import("./pages/FMEAManagement"));
const ControlPlanManagement = React.lazy(() => import("./pages/ControlPlanManagement"));
const QualityWorkbench = React.lazy(() => import("./pages/QualityWorkbench"));
const SalesCRMWorkbench = React.lazy(() => import("./pages/SalesCRMWorkbench"));
const AfterSalesWorkbench = React.lazy(() => import("./pages/AfterSalesWorkbench"));
const MSAManagement = React.lazy(() => import("./pages/MSAManagement"));
const SafetyRuleManagement = React.lazy(() => import("./pages/SafetyRuleManagement"));
const OADynamicFormTest = React.lazy(() => import("./pages/OADynamicFormTest"));
const OAFormWorkbench = React.lazy(() => import("./pages/OAFormWorkbench"));
const MPhaseFormDirectory = React.lazy(() => import("./pages/MPhaseFormDirectory"));
const FormDetailPage = React.lazy(() => import("./pages/FormDetailPage"));
const FatSatExecutionDashboard = React.lazy(() => import("./pages/FatSatExecutionDashboard"));
const MorningMeetingPresentation = React.lazy(() => import("./pages/MorningMeetingPresentation"));
const ReportCenter = React.lazy(() => import("./pages/ReportCenter"));
const ReportPresent = React.lazy(() => import("./pages/ReportPresent"));
const LobbyGlobalScreen = React.lazy(() => import("./pages/LobbyGlobalScreen"));
const ShopfloorMasterBoard = React.lazy(() => import("./pages/ShopfloorMasterBoard"));

// GRT Cloud Showcase Portal (全球数字云展厅)
const ShowcasePortal = React.lazy(() => import("./pages/showcase/ShowcasePortal"));

const DualAIMatrix = React.lazy(() => import("./pages/DualAIMatrix"));
const MeetingHub = React.lazy(() => import("./pages/MeetingHub"));
const PerformanceReviewMeeting = React.lazy(() => import("./pages/PerformanceReviewMeeting"));
const CrossBorderSync = React.lazy(() => import("./pages/CrossBorderSync"));
const UniversalWorkspace = React.lazy(() => import("./pages/UniversalWorkspace"));
// PersonalizedPortal removed — superseded by MeEngine at /me
const DataMigrationHub = React.lazy(() => import("./pages/DataMigrationHub"));
const CustomerDigitalTwinPortal = React.lazy(() => import("./pages/CustomerDigitalTwinPortal"));

// Cleaning Machine Project Wizard (M0→M2 + T1-T15)
const NewProjectWizard = React.lazy(() => import("./pages/NewProjectWizard"));

// ======== V2.0 Five Core Engines ========
const MeEngine = React.lazy(() => import("./pages/engines/MeEngine"));
const StrategyEngine = React.lazy(() => import("./pages/engines/StrategyEngine"));
const OperationsEngine = React.lazy(() => import("./pages/engines/OperationsEngine"));
const ResourcesEngine = React.lazy(() => import("./pages/engines/ResourcesEngine"));
const OKRMatrixPage = React.lazy(() => import("./pages/OKRMatrixPage"));
const BUSalesTargetPlanner = React.lazy(() => import("./pages/BUSalesTargetPlanner"));

// KPI绩效管理
const KpiPerformance = React.lazy(() => import("./pages/KpiPerformance"));

// Project 360 Cockpit — cross-module aggregation
const Project360Cockpit = React.lazy(() => import("./pages/Project360Cockpit"));

// Capability System — TSDCKL 6-pillar model
const My360Profile = React.lazy(() => import("./pages/My360Profile"));
const CapabilitySystemMatrix = React.lazy(() => import("./pages/CapabilitySystemMatrix"));
const HRSandboxCapability = React.lazy(() => import("./pages/HRSandboxCapability"));

// Phase 1.2: Shop Floor Machine Login (SOP + Role Interlock)
const ShopFloorMachineLogin = React.lazy(() => import("./pages/ShopFloorMachineLogin"));

// Phase 1.3: OEE Dashboard (IATF 16949)
const OEEDashboard = React.lazy(() => import("./pages/OEEDashboard"));

// Phase 1.4: Compliance Calendar & Auto-Reminder
const ComplianceCalendar = React.lazy(() => import("./pages/ComplianceCalendar"));

// Phase 2.1: ECO Cost Impact Analysis (Cross-Domain Fusion)
const EcoReviewDashboard = React.lazy(() => import("./pages/EcoReviewDashboard"));

// Phase 2.2: Supplier Risk Radar (IQC × SCM Fusion)
const SupplierRiskRadar = React.lazy(() => import("./pages/SupplierRiskRadar"));

// Phase 2.3: Employee Digital Profile (HR × AI × Meeting × Cert Fusion)
const EmployeeProfile = React.lazy(() => import("./pages/EmployeeProfile"));

// Phase 2.4: Dynamic FMEA RPN (Shop Floor QC × Engineering FMEA Fusion)
const FmeaLiveRiskMatrix = React.lazy(() => import("./pages/FmeaLiveRiskMatrix"));

// Phase 3.1: AI Training Closed-Loop (AI HR Intervention Dashboard)
const AiInterventionDashboard = React.lazy(() => import("./pages/AiInterventionDashboard"));

// Phase 3.2: Equipment Health & Auto-Scheduling (Smart APS Dashboard)
const SmartScheduleDashboard = React.lazy(() => import("./pages/SmartScheduleDashboard"));

// Phase 3.3: Smart Inventory (Dynamic Safety Stock & Cash Flow Optimization)
const SmartInventoryDashboard = React.lazy(() => import("./pages/SmartInventoryDashboard"));

// Phase 3.4: Carbon Footprint & CBAM Compliance
const CbamDashboard = React.lazy(() => import("./pages/CbamDashboard"));

// Phase 4: Ultimate Digital Thread & Executive Cockpit
const CeoExecutiveCockpit = React.lazy(() => import("./pages/CeoExecutiveCockpit"));

// GRT Value Chain Enhancement — 非标清洗设备全价值链
const EquipmentComplianceTracker = React.lazy(() => import("./pages/EquipmentComplianceTracker"));
const ProcessTrialWorkbench = React.lazy(() => import("./pages/ProcessTrialWorkbench"));
const NDAManagement = React.lazy(() => import("./pages/NDAManagement"));
const SalesMaterialsLibrary = React.lazy(() => import("./pages/SalesMaterialsLibrary"));
const DrawingLibrary = React.lazy(() => import("./pages/DrawingLibrary"));

// v2.6.0 新增页面
const QuotationCreate = React.lazy(() => import("./pages/QuotationCreate"));
const ProjectDigitalTwin = React.lazy(() => import("./pages/ProjectDigitalTwin"));
const OperationsAnalytics = React.lazy(() => import("./pages/OperationsAnalytics"));
const HistoricalCases = React.lazy(() => import("./pages/HistoricalCases"));

// 仓库管理 / 库存看板 / 成本标准
const WarehouseManagement = React.lazy(() => import("./pages/WarehouseManagement"));
const InventoryDashboard = React.lazy(() => import("./pages/InventoryDashboard"));
const CostStandards = React.lazy(() => import("./pages/CostStandards"));

// SOP模板库 / 阶段文档管理 / AI采购助手 / AI质量助手 / AI服务助手
const SOPLibrary = React.lazy(() => import("./pages/SOPLibrary"));
const ProjectPhaseDocuments = React.lazy(() => import("./pages/ProjectPhaseDocuments"));
const AIPurchaseAssistant = React.lazy(() => import("./pages/ai/AIPurchaseAssistant"));
const AIQualityAssistant = React.lazy(() => import("./pages/ai/AIQualityAssistant"));
const AIServiceAssistant = React.lazy(() => import("./pages/ai/AIServiceAssistant"));

// Phase D: AI项目智能 (知识问答/变更影响/风险预测)
const ProjectKnowledgeQA = React.lazy(() => import("./pages/ProjectKnowledgeQA"));
const ChangeImpactAnalysis = React.lazy(() => import("./pages/ChangeImpactAnalysis"));
const ProjectRiskPrediction = React.lazy(() => import("./pages/ProjectRiskPrediction"));

// Phase E: 供应链与质量智能 (供应商评估/库存优化/质量预测/生产效率)
const SupplierAssessment = React.lazy(() => import("./pages/SupplierAssessment"));
const InventoryOptimization = React.lazy(() => import("./pages/InventoryOptimization"));
const QualityPrediction = React.lazy(() => import("./pages/QualityPrediction"));
const ProductionEfficiency = React.lazy(() => import("./pages/ProductionEfficiency"));

// Phase F: HR与人才智能 (人才评估/培训推荐/薪酬分析/人力规划)
const AITalentAssessment = React.lazy(() => import("./pages/AITalentAssessment"));
const AITrainingRecommender = React.lazy(() => import("./pages/AITrainingRecommender"));
const AICompensationAnalysis = React.lazy(() => import("./pages/AICompensationAnalysis"));
const AIWorkforcePlanning = React.lazy(() => import("./pages/AIWorkforcePlanning"));

// Phase G: 销售与财务智能 (销售预测/客户流失/预算异常/成本优化)
const AISalesForecast = React.lazy(() => import("./pages/AISalesForecast"));
const AICustomerChurn = React.lazy(() => import("./pages/AICustomerChurn"));
const AIBudgetAnalysis = React.lazy(() => import("./pages/AIBudgetAnalysis"));
const AICostOptimization = React.lazy(() => import("./pages/AICostOptimization"));

// Phase H: 研发与客服智能 (需求分析/设计审查/故障诊断/预防维护)
const AIRequirementsAnalysis = React.lazy(() => import("./pages/AIRequirementsAnalysis"));
const AIDesignReview = React.lazy(() => import("./pages/AIDesignReview"));
const AIFaultDiagnosis = React.lazy(() => import("./pages/AIFaultDiagnosis"));
const AIMaintenancePlan = React.lazy(() => import("./pages/AIMaintenancePlan"));

// Phase I: 区域合规与本地化 (CN劳动法/五险一金/认证/工作日/VAT/内容本地化)
const CNLaborCompliance = React.lazy(() => import("./pages/CNLaborCompliance"));
const AISocialInsurance = React.lazy(() => import("./pages/AISocialInsurance"));
const RegionalCertificationTracker = React.lazy(() => import("./pages/RegionalCertificationTracker"));
const WorkingDaysCalculator = React.lazy(() => import("./pages/WorkingDaysCalculator"));
const AIVATCalculator = React.lazy(() => import("./pages/AIVATCalculator"));
const AIContentLocalizer = React.lazy(() => import("./pages/AIContentLocalizer"));

// Phase 21 P0: 清洁度质检/交接班/SOP工艺卡/客户报修
const CleanlinessInspection = React.lazy(() => import("./pages/CleanlinessInspection"));
const ShiftHandover = React.lazy(() => import("./pages/ShiftHandover"));
const SOPProcessCardEditor = React.lazy(() => import("./pages/SOPProcessCardEditor"));
const CustomerRepairPortal = React.lazy(() => import("./pages/CustomerRepairPortal"));

// Phase 21 P1: 质量高级/生产高级/服务销售高级/工时对账
const ProductCertificate = React.lazy(() => import("./pages/ProductCertificate"));
const SPCControlCharts = React.lazy(() => import("./pages/SPCControlCharts"));
const NCRWorkflow = React.lazy(() => import("./pages/NCRWorkflow"));
const MaterialShortageAlert = React.lazy(() => import("./pages/MaterialShortageAlert"));
const WorkstationRequisition = React.lazy(() => import("./pages/WorkstationRequisition"));
const ProductionExceptionReport = React.lazy(() => import("./pages/ProductionExceptionReport"));
const ProductionDailyReport = React.lazy(() => import("./pages/ProductionDailyReport"));
const RemoteAssistance = React.lazy(() => import("./pages/RemoteAssistance"));
const ServiceSLADashboard = React.lazy(() => import("./pages/ServiceSLADashboard"));
const OpportunityConversion = React.lazy(() => import("./pages/OpportunityConversion"));
const AfterSalesDesignFeedback = React.lazy(() => import("./pages/AfterSalesDesignFeedback"));
const TimeReconciliationDashboard = React.lazy(() => import("./pages/TimeReconciliationDashboard"));

// Phase 21 P2: 3D模型/工单→KB/NPS/评审→报价/质量月报/BOM冻结/QC验收
const ModelViewer3D = React.lazy(() => import("./pages/ModelViewer3D"));
const TicketToKnowledgeBase = React.lazy(() => import("./pages/TicketToKnowledgeBase"));
const NPSSurveyAutomation = React.lazy(() => import("./pages/NPSSurveyAutomation"));
const ReviewToQuotation = React.lazy(() => import("./pages/ReviewToQuotation"));
const QualityMonthlyReport = React.lazy(() => import("./pages/QualityMonthlyReport"));
const BOMFreezeAutomation = React.lazy(() => import("./pages/BOMFreezeAutomation"));
const QCPassNotification = React.lazy(() => import("./pages/QCPassNotification"));
const AISecurityGovernance = React.lazy(() => import("./pages/AISecurityGovernance"));

// Concurrent Command Center — Dual-Track Debugging
const ConcurrentCommandCenter = React.lazy(() => import("./pages/ConcurrentCommandCenter"));

// 2026 CEO Strategic Command Center
const CeoStrategy2026 = React.lazy(() => import("./pages/CeoStrategy2026"));

// Collaboration Drive & Smart Spreadsheet
const CollaborationDocs = React.lazy(() => import("./pages/CollaborationDocs"));
const SpreadsheetViewer = React.lazy(() => import("./pages/SpreadsheetViewer"));
const ProjectAgentDashboard = React.lazy(() => import("./pages/ProjectAgentDashboard"));

// Protected route wrapper component — ErrorBoundary auto-resets on navigation
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [loc] = useLocation();
  return (
    <RequireAuth>
      <ErrorBoundary level="page" resetKeys={[loc]}>
        <Component />
      </ErrorBoundary>
    </RequireAuth>
  );
}

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

// Standalone routes that should NOT have sidebar layout
const STANDALONE_PATHS = ['/login', '/login-success', '/public', '/worker-mobile', '/kiosk', '/404', '/oa-test', '/morning-meeting', '/shop-floor/machine-login'];
const STANDALONE_PREFIXES = ['/signature/', '/m/', '/kiosk/', '/report-center/', '/vision/', '/shop-floor/', '/showcase/'];

function Router() {
  const [location] = useLocation();
  const isStandalone = STANDALONE_PATHS.includes(location)
    || STANDALONE_PREFIXES.some(p => location.startsWith(p));

  const routes = (
    <Suspense fallback={<LazyFallback />}>
    <Switch>
      {/* GRT Cloud Showcase Portal (全球数字云展厅) */}
      <Route path={"/showcase/:industry"} component={ShowcasePortal} />
      {/* Public routes */}
      <Route path={"/"} component={Home} />
      <Route path={"/roadmap"} component={Roadmap} />
      <Route path={"/tools"} component={Tools} />
      <Route path={"/risks"} component={Risks} />
      <Route path={"/smart-meeting"} component={SmartMeeting} />
      <Route path={"/meeting-executive"} component={MeetingExecutive} />
      <Route path={"/admin-dashboard"} component={AdminDashboard} />
      <Route path={"/monitoring"} component={MonitoringDashboard} />
      <Route path={"/jiandaoyun"} component={JiandaoyunAnalysis} />
      <Route path={"/jiandaoyun-integration"} component={JiandaoyunIntegration} />
      <Route path={"/jiandaoyun-import"}>
        <ProtectedRoute component={JiandaoyunFullImport} />
      </Route>
      <Route path={"/jiandaoyun-forms"} component={JiandaoyunFormBrowser} />
      <Route path={"/jiandaoyun-workflows"} component={JiandaoyunWorkflowViewer} />
      <Route path={"/jiandaoyun-knowledge"} component={JiandaoyunKnowledgeViewer} />
      <Route path={"/public"} component={PublicHome} />
      <Route path={"/capabilities"} component={Capabilities} />
      <Route path={"/capability-os"} component={CapabilityOS} />
      <Route path={"/grt-cleaning-strategy"} component={GRTCleaningStrategy} />
      <Route path={"/engineer-checkpoints"} component={EngineerCheckpoints} />
      <Route path={"/toothpaste-test"} component={ToothpasteTest} />
      <Route path={"/toothpaste-test-history"} component={ToothpasteTestHistory} />
      <Route path={"/cleaning-trajectory-3d"} component={CleaningTrajectory3D} />
      <Route path={"/agent-unit-management"} component={AgentUnitManagement} />
      <Route path={"/capability-dashboard"} component={CapabilityDashboard} />
      <Route path={"/evidence-submission"} component={EvidenceSubmission} />
      <Route path={"/red-blue-board"} component={RedBlueBoard} />
      <Route path={"/certificate-verify"} component={CertificateVerify} />
      <Route path={"/certificate-verify/:certificateNumber"} component={CertificateVerify} />
      <Route path={"/capability-badges"} component={CapabilityBadges} />
      <Route path={"/capability-leaderboard"} component={CapabilityLeaderboard} />
      <Route path={"/evidence-review"} component={EvidenceReview} />
      <Route path={"/capability-certificates"} component={CapabilityCertificates} />
      <Route path={"/capability-path"} component={CapabilityPathRecommendation} />
      <Route path={"/team-capability-analysis"} component={TeamCapabilityAnalysis} />
      <Route path={"/capability-matrix-board"} component={CapabilityMatrixBoard} />
      <Route path={"/hr-matrix"} component={CapabilityMatrixBoard} />
      <Route path={"/shopfloor-terminal"} component={ShopfloorTerminal} />
      <Route path={"/simulator"} component={SimulatorDashboard} />
      <Route path={"/plm"} component={PLMWorkbench} />
      <Route path={"/sales-crm"} component={SalesCRMWorkbench} />
      <Route path={"/after-sales-workbench"} component={AfterSalesWorkbench} />
      <Route path={"/ai-genesis"} component={AIGenesisWorkspace} />
      <Route path={"/ai-security-governance"} component={AISecurityGovernance} />
      <Route path={"/ai-assistant-provisioning"} component={AiAssistantProvisioning} />
      <Route path={"/ai-agent-fleet"} component={AIAgentFleetDashboard} />
      <Route path={"/system-control-tower"} component={SystemControlTower} />
      {/* ══════ V2.0 Five Core Engine Routes ══════ */}
      <Route path={"/me"}>
        <ProtectedRoute component={MeEngine} />
      </Route>
      <Route path={"/strategy/excellence"}>
        <ProtectedRoute component={StrategyEngine} />
      </Route>
      <Route path={"/strategy/okr-matrix"}>
        <ProtectedRoute component={OKRMatrixPage} />
      </Route>
      <Route path={"/bu-sales-target"}>
        <ProtectedRoute component={BUSalesTargetPlanner} />
      </Route>
      <Route path={"/strategy"}>
        <ProtectedRoute component={StrategyEngine} />
      </Route>
      <Route path={"/operations/new-project"}>
        <ProtectedRoute component={NewProjectWizard} />
      </Route>
      <Route path={"/operations"}>
        <ProtectedRoute component={OperationsEngine} />
      </Route>
      <Route path={"/resources"}>
        <ProtectedRoute component={ResourcesEngine} />
      </Route>

      <Route path={"/my-workspace"}><ProtectedRoute component={MeEngine} /></Route>
      <Route path={"/workspace"} component={UniversalWorkspace} />
      <Route path={"/data-migration"} component={DataMigrationHub} />
      <Route path={"/customer-digital-twin"} component={CustomerDigitalTwinPortal} />
      <Route path={"/customer-portal"} component={CustomerPortal} />
      <Route path={"/login"} component={LocalLogin} />
      <Route path={"/login-success"} component={LoginSuccess} />
      
      {/* Protected routes - require login */}
      <Route path={"/docs"}>
        <ProtectedRoute component={Docs} />
      </Route>
      <Route path={"/docs/guide"}>
        <ProtectedRoute component={GuideReader} />
      </Route>
      <Route path={"/migration"}>
        <ProtectedRoute component={MigrationTasks} />
      </Route>
      <Route path={"/business-units"}>
        <ProtectedRoute component={BusinessUnits} />
      </Route>
      <Route path={"/architecture"}>
        <ProtectedRoute component={ArchitecturePlan} />
      </Route>
      <Route path={"/tasks"}>
        <ProtectedRoute component={DevTaskBoard} />
      </Route>
      <Route path={"/crm"}>
        <ProtectedRoute component={CrmCustomers} />
      </Route>
      <Route path={"/crm/customers"}>
        <ProtectedRoute component={CrmCustomers} />
      </Route>
      <Route path={"/crm/opportunities"}>
        <ProtectedRoute component={CrmOpportunities} />
      </Route>
      <Route path={"/crm/contacts"}>
        <ProtectedRoute component={CrmContacts} />
      </Route>
      <Route path={"/projects"}>
        <ProtectedRoute component={ProjectManagement} />
      </Route>
      <Route path={"/cost"}>
        <ProtectedRoute component={CostManagement} />
      </Route>
      <Route path={"/agenda"}>
        <ProtectedRoute component={AgendaManagement} />
      </Route>
      <Route path={"/training"}>
        <ProtectedRoute component={TrainingManagement} />
      </Route>
      <Route path={"/annual-planning"}>
        <ProtectedRoute component={AnnualPlanning} />
      </Route>
      <Route path={"/webhook"}>
        <ProtectedRoute component={WebhookManagement} />
      </Route>
      <Route path={"/naming-rules"}>
        <ProtectedRoute component={NamingRulesManagement} />
      </Route>
      <Route path={"/hrm-intelligent"}>
        <ProtectedRoute component={HRMIntelligent} />
      </Route>
      <Route path={"/audit-logs"}>
        <ProtectedRoute component={AuditLogViewer} />
      </Route>
      <Route path={"/group-notifications"}>
        <ProtectedRoute component={GroupNotificationManagement} />
      </Route>
      <Route path={"/ai-hub"}>
        <ProtectedRoute component={AiAssistantHubPage} />
      </Route>
      <Route path={"/digital-assistants"}>
        <ProtectedRoute component={DigitalAssistants} />
      </Route>
      <Route path={"/ai-effectiveness"}>
        <ProtectedRoute component={AIEffectivenessTracking} />
      </Route>
      <Route path={"/notebook-search"}>
        <ProtectedRoute component={NotebookSearch} />
      </Route>
      <Route path={"/subsystem-help"}>
        <ProtectedRoute component={SubsystemHelp} />
      </Route>
      <Route path={"/deadlock-monitor"}>
        <ProtectedRoute component={DeadlockMonitor} />
      </Route>
      <Route path={"/ai-diagnostic"}>
        <ProtectedRoute component={AIDiagnostic} />
      </Route>
      <Route path={"/concurrent-command-center"}>
        <ProtectedRoute component={ConcurrentCommandCenter} />
      </Route>
      <Route path={"/collaboration-docs/spreadsheet/:id"}>
        <ProtectedRoute component={SpreadsheetViewer} />
      </Route>
      <Route path={"/collaboration-docs"}>
        <ProtectedRoute component={CollaborationDocs} />
      </Route>
      <Route path={"/collaboration"}>
        <ProtectedRoute component={CollaborationWorkspace} />
      </Route>
      <Route path={"/live-documents"}>
        <ProtectedRoute component={LiveDocumentManager} />
      </Route>
      <Route path={"/system-guide"}>
        <ProtectedRoute component={SystemGuide} />
      </Route>
      <Route path={"/help"}>
        <ProtectedRoute component={HelpCenter} />
      </Route>
      <Route path={"/gemini-spec"}>
        <ProtectedRoute component={GeminiSpecification} />
      </Route>
      <Route path={"/deployment-spec"}>
        <ProtectedRoute component={DeploymentSpec} />
      </Route>
      <Route path={"/compliance-dashboard"}>
        <ProtectedRoute component={ComplianceDashboard} />
      </Route>
      <Route path={"/compliance/employee/:id"}>
        <ProtectedRoute component={EmployeeTimeDetails} />
      </Route>
      <Route path={"/compliance/rules-config"}>
        <ProtectedRoute component={ComplianceRulesConfig} />
      </Route>
      <Route path={"/change-management"}>
        <ProtectedRoute component={ChangeManagement} />
      </Route>
      <Route path={"/hr-lifecycle"}>
        <ProtectedRoute component={HRLifecycle} />
      </Route>
      {/* 研发验证中心 */}
      <Route path={"/rd-verification"}>
        <ProtectedRoute component={RDVerificationCenter} />
      </Route>
      {/* 门径管理 */}
      <Route path={"/stage-gate"}>
        <ProtectedRoute component={StageGateDashboard} />
      </Route>
      <Route path={"/community"}>
        <ProtectedRoute component={Community} />
      </Route>
      <Route path={"/leads"}>
        <ProtectedRoute component={LeadManagement} />
      </Route>
      <Route path={"/scheduler"}>
        <ProtectedRoute component={SchedulerManagement} />
      </Route>
      <Route path={"/trip-request"}>
        <ProtectedRoute component={TripRequest} />
      </Route>
      <Route path={"/supervisor-workbench"}>
        <ProtectedRoute component={SupervisorWorkbench} />
      </Route>
      <Route path={"/budget-management"}>
        <ProtectedRoute component={BudgetManagement} />
      </Route>
      <Route path={"/expense-report"}>
        <ProtectedRoute component={ExpenseReport} />
      </Route>
      <Route path={"/travel-dashboard"}>
        <ProtectedRoute component={TravelDashboard} />
      </Route>
      <Route path={"/expense-comparison"}>
        <ProtectedRoute component={ExpenseComparison} />
      </Route>
      <Route path={"/budget-overrun-approval"}>
        <ProtectedRoute component={BudgetOverrunApproval} />
      </Route>
      <Route path={"/expense-forecast"}>
        <ProtectedRoute component={ExpenseForecast} />
      </Route>
      <Route path={"/expense-report-scheduler"}>
        <ProtectedRoute component={ExpenseReportScheduler} />
      </Route>
      
      {/* v2.5.7 新功能页面 */}
      <Route path={"/model-explainability"}>
        <ProtectedRoute component={ModelExplainabilityReport} />
      </Route>
      <Route path={"/knowledge-graph-approval"}>
        <ProtectedRoute component={KnowledgeGraphApproval} />
      </Route>
      
      {/* v2.5.8 新功能页面 */}
      <Route path={"/model-training-scheduler"}>
        <ProtectedRoute component={ModelTrainingScheduler} />
      </Route>
      
      {/* v2.5.9 新功能页面 */}
      <Route path={"/model-performance-monitor"}>
        <ProtectedRoute component={ModelPerformanceMonitor} />
      </Route>
      
      {/* v2.5.12 工作流管理页面 */}
      <Route path={"/workflow-management"}>
        <ProtectedRoute component={WorkflowManagement} />
      </Route>
      
      {/* v2.5.15 消息聚合可视化页面 */}
      <Route path={"/notification-aggregation"}>
        <ProtectedRoute component={NotificationAggregationPreview} />
      </Route>
      
      {/* v2.5.16 消息聚合规则配置页面 */}
      <Route path={"/notification-aggregation-config"}>
        <ProtectedRoute component={NotificationAggregationConfig} />
      </Route>
      
      {/* 生产指挥中心 */}
      <Route path={"/production-command-center"}>
        <ProtectedRoute component={ProductionCommandCenter} />
      </Route>

      {/* v2.5.26 M5生产看板页面 */}
      <Route path={"/production-dashboard"}>
        <ProtectedRoute component={ProductionDashboard} />
      </Route>
      
      {/* v1.3.23 客户需求问卷页面 */}
      <Route path={"/customer-questionnaire"}>
        <ProtectedRoute component={CustomerQuestionnaire} />
      </Route>
      
      {/* v1.3.23 T工序甘特图页面 */}
      <Route path={"/process-gantt"}>
        <ProtectedRoute component={ProcessGanttChart} />
      </Route>
      
      {/* v2.5.28 工人管理页面 */}
      <Route path={"/worker-management"}>
        <ProtectedRoute component={WorkerManagement} />
      </Route>
      
      {/* v2.5.27 质检管理页面 */}
      <Route path={"/qc-management"}>
        <ProtectedRoute component={QCManagement} />
      </Route>
      
      {/* v2.5.31 UWB管理页面 */}
      <Route path={"/uwb-management"}>
        <ProtectedRoute component={UWBManagement} />
      </Route>
      
      {/* v2.5.31 工人导入页面 */}
      <Route path={"/worker-import"}>
        <ProtectedRoute component={WorkerImport} />
      </Route>
      
      {/* v2.5.31 定时任务监控页面 */}
      <Route path={"/cron-monitor"}>
        <ProtectedRoute component={CronMonitor} />
      </Route>
      
      {/* v2.5.34 M1启动会仪表盘 */}
      <Route path={"/m1-kickoff"}>
        <ProtectedRoute component={M1KickoffDashboard} />
      </Route>
      
      {/* v2.5.34 M7-M9交付跟踪 */}
      <Route path={"/m7-m9-delivery"}>
        <ProtectedRoute component={M7M9DeliveryTrack} />
      </Route>

      {/* M8 FAT协调工作台 */}
      <Route path={"/fat-coordination"}>
        <ProtectedRoute component={FATCoordination} />
      </Route>

      {/* M7-M8 FAT/SAT执行仪表板 */}
      <Route path={"/fat-sat-execution"}>
        <ProtectedRoute component={FatSatExecutionDashboard} />
      </Route>
      
      {/* v2.5.36 M7-M9交付管理 */}
      <Route path={"/delivery-management"}>
        <ProtectedRoute component={DeliveryManagement} />
      </Route>
      
      {/* v2.5.37 Webhook配置管理 */}
      <Route path={"/webhook-settings"}>
        <ProtectedRoute component={WebhookSettings} />
      </Route>
      
      {/* v2.5.37 AI触发器配置 */}
      <Route path={"/ai-trigger-settings"}>
        <ProtectedRoute component={AITriggerSettings} />
      </Route>
      
      {/* v2.5.37 Gate检查清单配置 */}
      <Route path={"/gate-checklist-settings"}>
        <ProtectedRoute component={GateChecklistSettings} />
      </Route>
      
      {/* v2.5.43 售后服务管理 */}
      <Route path={"/after-sales"}>
        <ProtectedRoute component={AfterSalesManagement} />
      </Route>
      
      {/* v2.5.45 售后服务高级功能 */}
      <Route path={"/after-sales-advanced"}>
        <ProtectedRoute component={AfterSalesAdvanced} />
      </Route>
      
      {/* v2.5.46 H5客户签字确认页面 (公开访问) */}
      <Route path="/signature/:token" component={CustomerSignature} />
      
      {/* Permission & Access Management */}
      <Route path="/permissions">
        <ProtectedRoute component={PermissionManagement} />
      </Route>
      <Route path="/visitor-request">
        <ProtectedRoute component={VisitorRequestForm} />
      </Route>
      <Route path="/org-tree">
        <ProtectedRoute component={OrgTreePage} />
      </Route>
      <Route path="/menu-management">
        <ProtectedRoute component={MenuManagement} />
      </Route>
      <Route path="/ai-assistant">
        <ProtectedRoute component={AIAssistantPage} />
      </Route>
      <Route path="/capability-management">
        <ProtectedRoute component={CapabilityManagementPage} />
      </Route>
      <Route path="/system-deployment">
        <ProtectedRoute component={SystemDeployment} />
      </Route>
      <Route path="/security">
        <ProtectedRoute component={SecurityDashboard} />
      </Route>
      
      {/* v1.3.39 GRT智能运营系统仪表盘 */}
      <Route path="/grt-operation">
        <ProtectedRoute component={GRTOperationDashboard} />
      </Route>
      
      {/* 5大新模块路由 */}
      <Route path="/social-community">
        <ProtectedRoute component={SocialCommunity} />
      </Route>
      <Route path="/liquid-workforce">
        <ProtectedRoute component={LiquidWorkforce} />
      </Route>
      <Route path="/ai-sales">
        <ProtectedRoute component={AISales} />
      </Route>
      <Route path="/personal-agent">
        <ProtectedRoute component={PersonalAgent} />
      </Route>
      
      {/* 社群管理增强功能路由 */}
      <Route path="/social-community-settings">
        <ProtectedRoute component={SocialCommunitySettings} />
      </Route>
      <Route path="/social-community-analytics">
        <ProtectedRoute component={SocialCommunityAnalytics} />
      </Route>
      
      {/* 管理后台路由 */}
      <Route path="/admin/erp-configuration">
        <ProtectedRoute component={ErpConfiguration} />
      </Route>
      <Route path="/admin/webhooks">
        <ProtectedRoute component={AdminWebhookManagement} />
      </Route>
      <Route path="/admin/certificates">
        <ProtectedRoute component={CertificateTemplates} />
      </Route>
      
      <Route path="/admin/dingtalk-settings">
        <DingTalkSettings />
      </Route>
      <Route path="/admin/notification-settings">
        <NotificationSettings />
      </Route>
      {/* v4.8.4 Hub中心页面路由 */}
      <Route path="/liquid-workforce-hub">
        <ProtectedRoute component={LiquidWorkforceHub} />
      </Route>
      <Route path="/ai-sales-hub">
        <ProtectedRoute component={AiSalesHub} />
      </Route>
      <Route path="/personal-agent-hub">
        <ProtectedRoute component={PersonalAgentHub} />
      </Route>
      <Route path="/project-hub">
        <ProtectedRoute component={ProjectHub} />
      </Route>
      <Route path="/social-community-hub">
        <ProtectedRoute component={SocialCommunityHub} />
      </Route>
      {/* v4.8.5 增强版Hub页面路由 */}
      <Route path="/liquid-workforce-enhanced">
        <ProtectedRoute component={LiquidWorkforceHubEnhanced} />
      </Route>
      <Route path="/ai-sales-enhanced">
        <ProtectedRoute component={AiSalesHubEnhanced} />
      </Route>
      <Route path="/personal-agent-enhanced">
        <ProtectedRoute component={PersonalAgentHubEnhanced} />
      </Route>
      <Route path="/project-enhanced">
        <ProtectedRoute component={ProjectHubEnhanced} />
      </Route>
      <Route path="/social-community-enhanced">
        <ProtectedRoute component={SocialCommunityHubEnhanced} />
      </Route>
      <Route path="/admin/erp-connection">
        <ProtectedRoute component={ErpConnectionManager} />
      </Route>

      {/* 使用指南路由 */}
      <Route path="/guide">
        <ProtectedRoute component={SystemGuideBook} />
      </Route>
      
      {/* 翻译贡献页面 */}
      <Route path="/translation-contribute">
        <ProtectedRoute component={TranslationContribute} />
      </Route>

      {/* v1.3.21 AI服务页面路由 */}
      <Route path="/ai/solution-assistant">
        <ProtectedRoute component={AISolutionAssistant} />
      </Route>
      <Route path="/ai/quotation-assistant">
        <ProtectedRoute component={AIQuotationAssistant} />
      </Route>
      <Route path="/ai/planning-assistant">
        <ProtectedRoute component={AIPlanningAssistant} />
      </Route>
      <Route path="/ai/kpi-assistant">
        <ProtectedRoute component={AIKPIAssistant} />
      </Route>
      <Route path="/capability/evidence-upload">
        <ProtectedRoute component={CapabilityEvidenceUpload} />
      </Route>
      <Route path="/settings/microsoft-graph">
        <ProtectedRoute component={MicrosoftGraphSettings} />
      </Route>
      <Route path="/settings/social-platform">
        <ProtectedRoute component={SocialPlatformSettings} />
      </Route>
      <Route path="/intelligent-scheduling">
        <ProtectedRoute component={IntelligentScheduling} />
      </Route>

      {/* v1.3.63 资质管理中心 */}
      <Route path="/certification-management">
        <ProtectedRoute component={CertificationManagement} />
      </Route>

      {/* v1.3.64 Gemini设计功能页面 */}
      <Route path="/annual-agenda">
        <ProtectedRoute component={AnnualAgenda} />
      </Route>

      {/* v1.3.73 生产执行视图 T1-T15 */}
      <Route path="/production-execution">
        <ProtectedRoute component={ProductionExecutionView} />
      </Route>

      {/* v1.3.76 生产执行模块配置页面 */}
      <Route path="/production/uwb-devices">
        <ProtectedRoute component={UWBDeviceManagement} />
      </Route>
      <Route path="/meeting-intelligence">
        <ProtectedRoute component={MeetingIntelligence} />
      </Route>
      {/* v1.4.3 Meeting Owner管理 */}
      <Route path="/meeting-owner-management">
        <ProtectedRoute component={MeetingOwnerManagement} />
      </Route>
      <Route path="/production/notification-channels">
        <ProtectedRoute component={NotificationChannelSettings} />
      </Route>
      {/* v1.3.89 BU事业部人员管理 */}
      <Route path="/bu-team-management">
        <ProtectedRoute component={BUTeamManagement} />
      </Route>
      {/* v1.3.90 BU事业部绩效看板 */}
      <Route path="/bu-performance">
        <ProtectedRoute component={BUPerformanceDashboard} />
      </Route>
      {/* 员工智能绩效 */}
      <Route path="/employee-performance">
        <ProtectedRoute component={EmployeeIntelligentPerformance} />
      </Route>
      {/* v1.3.92 员工管理 */}
      <Route path="/employee-management">
        <ProtectedRoute component={EmployeeManagement} />
      </Route>
      {/* v1.5.0 员工离职数据管理 */}
      <Route path="/offboarding">
        <ProtectedRoute component={EmployeeOffboarding} />
      </Route>
      {/* v1.3.92 用户Profile设置 */}
      <Route path="/user-profile">
        <ProtectedRoute component={UserProfileSettings} />
      </Route>
      {/* v1.3.94 用户状态管理 */}
      <Route path="/user-status-management">
        <ProtectedRoute component={UserStatusManagement} />
      </Route>
      <Route path="/customer-value-view">
        <ProtectedRoute component={CustomerValueView} />
      </Route>
      <Route path="/global-growth-tracker">
        <ProtectedRoute component={GlobalGrowthTracker} />
      </Route>

      {/* v1.4.5 项目型组织操作系统 (POS) 路由 */}
      <Route path="/pos">
        <ProtectedRoute component={POSDashboard} />
      </Route>
      <Route path="/pos/dashboard">
        <ProtectedRoute component={POSDashboard} />
      </Route>
      <Route path="/pos/customers">
        <ProtectedRoute component={POSCustomers} />
      </Route>
      <Route path="/pos/projects">
        <ProtectedRoute component={ProjectManagement} />
      </Route>
      <Route path="/pos/projects/:id">
        <ProtectedRoute component={POSProjectDetail} />
      </Route>
      <Route path="/pos/projects/:id/stage/m2">
        <ProtectedRoute component={StageM2Detail} />
      </Route>
      <Route path="/pos/projects/:id/stage/:stage">
        <ProtectedRoute component={StageReview} />
      </Route>
      <Route path="/pos/projects/:id/versions">
        <ProtectedRoute component={POSVersions} />
      </Route>
      <Route path="/pos/procurement">
        <ProtectedRoute component={POSProcurement} />
      </Route>
      <Route path="/pos/mes">
        <ProtectedRoute component={POSMESSync} />
      </Route>
      <Route path="/pos/connectors">
        <ProtectedRoute component={POSConnectorConfig} />
      </Route>
      <Route path="/production-steps">
        <ProtectedRoute component={ProductionSteps} />
      </Route>
      <Route path="/process-progress">
        <ProtectedRoute component={ProcessProgressDashboard} />
      </Route>
      <Route path="/worker-mobile">
        <ProtectedRoute component={WorkerMobileView} />
      </Route>
      {/* Workshop Kiosk Terminal (IATF 16949 / VDA 6.3) */}
      <Route path="/kiosk/qr-confirm" component={KioskQrConfirm} />
      <Route path="/kiosk" component={KioskWorkshop} />
      {/* Phase 1.2: Shop Floor Machine Login (SOP + Role Interlock) */}
      <Route path="/shop-floor/machine-login" component={ShopFloorMachineLogin} />
      {/* Phase 1.3: OEE Dashboard (IATF 16949) */}
      <Route path="/shop-floor/oee-dashboard" component={OEEDashboard} />
      <Route path="/test-execution-dashboard">
        <ProtectedRoute component={TestExecutionDashboard} />
      </Route>
      <Route path="/project-vault">
        <ProtectedRoute component={ProjectVault} />
      </Route>
      <Route path="/digital-twin">
        <ProtectedRoute component={DigitalTwinHub} />
      </Route>
      <Route path="/oa-dashboard">
        <ProtectedRoute component={OADashboard} />
      </Route>
      <Route path="/oa-test">
        <ProtectedRoute component={OADynamicFormTest} />
      </Route>
      <Route path="/oa-forms">
        <ProtectedRoute component={OAFormWorkbench} />
      </Route>
      <Route path="/form-directory/:id">
        <ProtectedRoute component={FormDetailPage} />
      </Route>
      <Route path="/form-directory">
        <ProtectedRoute component={MPhaseFormDirectory} />
      </Route>
      <Route path="/pre-sales-questionnaire">
        <ProtectedRoute component={PreSalesQuestionnaireForm} />
      </Route>
      {/* Live Executive Briefing Center (动态汇报中枢) */}
      <Route path="/report-center/:id/present" component={ReportPresent} />
      <Route path="/report-center">
        <ProtectedRoute component={ReportCenter} />
      </Route>
      {/* GRT Vision — Large-Screen Dashboards (standalone, no sidebar) */}
      <Route path="/vision/lobby" component={LobbyGlobalScreen} />
      <Route path="/vision/shopfloor" component={ShopfloorMasterBoard} />
      <Route path="/morning-meeting" component={MorningMeetingPresentation} />
      <Route path="/morning-meeting-board">
        <ProtectedRoute component={MorningMeetingBoard} />
      </Route>
      <Route path="/ai-accuracy">
        <ProtectedRoute component={AiAccuracyDashboard} />
      </Route>
      <Route path="/quality-checkpoints">
        <ProtectedRoute component={QualityCheckpoints} />
      </Route>
      <Route path="/material-flow">
        <ProtectedRoute component={MaterialFlowTracking} />
      </Route>
      <Route path="/worker-performance">
        <ProtectedRoute component={WorkerPerformanceLeaderboard} />
      </Route>
      <Route path="/quality-interlock">
        <ProtectedRoute component={QualityInterlock} />
      </Route>
      <Route path="/bom-verification">
        <ProtectedRoute component={BomVerification} />
      </Route>
      <Route path="/salary-bonus">
        <ProtectedRoute component={SalaryBonus} />
      </Route>
      <Route path="/ccd-integration">
        <ProtectedRoute component={CcdIntegration} />
      </Route>
      <Route path="/bom-import">
        <ProtectedRoute component={BomImport} />
      </Route>
      <Route path="/salary-report">
        <ProtectedRoute component={SalaryReport} />
      </Route>
      <Route path="/ccd-realtime">
        <ProtectedRoute component={CcdRealtime} />
      </Route>
      <Route path="/bom-excel-import">
        <ProtectedRoute component={BomExcelImport} />
      </Route>
      <Route path="/salary-approval">
        <ProtectedRoute component={SalaryApproval} />
      </Route>
      <Route path="/pos/projects/:projectId/stages/:stageCode">
        <ProtectedRoute component={StageDetail} />
      </Route>

      {/* 新增页面路由 */}
      <Route path={"/my-tasks"}>
        <ProtectedRoute component={MyTasks} />
      </Route>
      <Route path={"/notifications"}>
        <ProtectedRoute component={Notifications} />
      </Route>
      <Route path={"/ai/process-optimization"}>
        <ProtectedRoute component={AIProcessOptimization} />
      </Route>
      <Route path={"/ai/optimization/hr"}>
        <ProtectedRoute component={AIProcessOptimization} />
      </Route>
      <Route path={"/ai/optimization/procurement"}>
        <ProtectedRoute component={AIProcessOptimization} />
      </Route>
      <Route path={"/ai/optimization/delivery"}>
        <ProtectedRoute component={AIProcessOptimization} />
      </Route>
      <Route path={"/ai/analytics"}>
        <ProtectedRoute component={AIProcessOptimization} />
      </Route>
      <Route path={"/hr/offboarding-new"}>
        <ProtectedRoute component={HROffboarding} />
      </Route>
      {/* ======== 新增模块路由 ======== */}
      {/* 研发设计 (TX-001~005) */}
      <Route path="/requirements-analysis">
        <ProtectedRoute component={RequirementsAnalysis} />
      </Route>
      <Route path="/solution-design">
        <ProtectedRoute component={SolutionDesign} />
      </Route>
      <Route path="/mechanical-design">
        <ProtectedRoute component={MechanicalDesign} />
      </Route>
      <Route path="/electrical-design">
        <ProtectedRoute component={ElectricalDesign} />
      </Route>
      <Route path="/bom-management">
        <ProtectedRoute component={BomManagement} />
      </Route>
      <Route path="/tech-documents">
        <ProtectedRoute component={TechDocuments} />
      </Route>
      {/* 客户服务 (TX-013~015 + 售后) */}
      <Route path="/field-installation">
        <ProtectedRoute component={FieldInstallation} />
      </Route>
      <Route path="/sat-testing">
        <ProtectedRoute component={SatTesting} />
      </Route>
      <Route path="/final-acceptance">
        <ProtectedRoute component={FinalAcceptance} />
      </Route>
      <Route path="/service-tickets">
        <ProtectedRoute component={ServiceTickets} />
      </Route>
      <Route path="/customer-feedback">
        <ProtectedRoute component={CustomerFeedback} />
      </Route>
      <Route path="/spare-parts">
        <ProtectedRoute component={SpareParts} />
      </Route>
      {/* 绩效分层 */}
      <Route path="/my-performance">
        <ProtectedRoute component={MyPerformance} />
      </Route>
      <Route path="/team-performance">
        <ProtectedRoute component={TeamPerformance} />
      </Route>
      <Route path="/dept-performance">
        <ProtectedRoute component={DeptPerformance} />
      </Route>
      {/* 销售扩展 */}
      <Route path="/quotation-management">
        <ProtectedRoute component={QuotationManagement} />
      </Route>
      <Route path="/contract-management">
        <ProtectedRoute component={ContractManagement} />
      </Route>
      <Route path="/sales-analytics">
        <ProtectedRoute component={SalesAnalytics} />
      </Route>
      {/* 生产扩展 */}
      <Route path="/process-management">
        <ProtectedRoute component={ProcessManagement} />
      </Route>
      <Route path="/material-tracking">
        <ProtectedRoute component={MaterialTracking} />
      </Route>
      {/* HR扩展 */}
      <Route path="/recruitment">
        <ProtectedRoute component={Recruitment} />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={Attendance} />
      </Route>
      <Route path="/compensation">
        <ProtectedRoute component={Compensation} />
      </Route>
      {/* 项目扩展 */}
      <Route path="/gantt">
        <ProtectedRoute component={GanttChart} />
      </Route>
      {/* 系统管理 */}
      <Route path="/organization-management">
        <ProtectedRoute component={OrganizationManagement} />
      </Route>
      {/* P3: 权限管理扩展 */}
      <Route path="/temporary-permissions">
        <ProtectedRoute component={TemporaryPermissions} />
      </Route>
      <Route path="/permission-blacklist">
        <ProtectedRoute component={PermissionBlacklist} />
      </Route>
      <Route path="/menu-analytics">
        <ProtectedRoute component={MenuAnalytics} />
      </Route>
      {/* 任务驾驶舱 */}
      <Route path="/task-cockpit">
        <ProtectedRoute component={TaskCockpitPage} />
      </Route>
      {/* 角色智能工作台 */}
      <Route path="/dashboard">
        <ProtectedRoute component={RoleDashboard} />
      </Route>
      {/* 新增模块路由结束 */}

      {/* Platform Capability Enhancements */}
      <Route path="/gamification">
        <ProtectedRoute component={Gamification} />
      </Route>
      <Route path="/iot-dashboard">
        <ProtectedRoute component={IoTDashboard} />
      </Route>
      <Route path="/iot-fleet">
        <ProtectedRoute component={IoTFleetDashboard} />
      </Route>

      {/* Digital Cloud Hall — 数字云厅 (视讯交互大厅) */}
      <Route path="/digital-cloud-hall">
        <ProtectedRoute component={DigitalCloudHall} />
      </Route>

      {/* 客服系统参数管理 */}
      <Route path="/service-dashboard-admin">
        <ProtectedRoute component={ServiceDashboardAdmin} />
      </Route>

      {/* RAG知识库训练中心 */}
      <Route path="/rag-training">
        <ProtectedRoute component={RAGTrainingCenter} />
      </Route>

      {/* Finance Agent — AI 费用审核拦截引擎 */}
      <Route path="/finance-agent">
        <ProtectedRoute component={FinanceAgentWorkbench} />
      </Route>

      {/* Mobile H5 routes */}
      <Route path={"/m/location"}>
        <ProtectedRoute component={MobileLocationReport} />
      </Route>
      <Route path={"/m/approval"}>
        <ProtectedRoute component={MobileApproval} />
      </Route>
      <Route path={"/m/field-dashboard"}>
        <ProtectedRoute component={FieldEngineerDashboard} />
      </Route>
                  {/* AI Early Warning Center */}
      <Route path="/ai-early-warning">
        <ProtectedRoute component={AIEarlyWarning} />
      </Route>
      {/* Error Log Viewer */}
      <Route path={"/error-logs"}>
        <ProtectedRoute component={ErrorLogViewer} />
      </Route>
      
      {/* v2.6.0 报价生成 / 数字孪生 / 运营分析 / 历史案例 */}
      <Route path="/quotation-create">
        <ProtectedRoute component={QuotationCreate} />
      </Route>
      <Route path="/project-digital-twin">
        <ProtectedRoute component={ProjectDigitalTwin} />
      </Route>
      <Route path="/operations-analytics">
        <ProtectedRoute component={OperationsAnalytics} />
      </Route>
      <Route path="/historical-cases">
        <ProtectedRoute component={HistoricalCases} />
      </Route>

      {/* 仓库管理 / 库存看板 / 成本标准 */}
      <Route path="/warehouse-management">
        <ProtectedRoute component={WarehouseManagement} />
      </Route>
      <Route path="/inventory-dashboard">
        <ProtectedRoute component={InventoryDashboard} />
      </Route>
      <Route path="/cost-standards">
        <ProtectedRoute component={CostStandards} />
      </Route>

      {/* SOP模板库 & 阶段文档管理 */}
      <Route path="/sop-library">
        <ProtectedRoute component={SOPLibrary} />
      </Route>
      <Route path="/project-phase-documents">
        <ProtectedRoute component={ProjectPhaseDocuments} />
      </Route>
      {/* AI采购助手 / AI质量助手 / AI服务助手 */}
      <Route path="/ai-purchase">
        <ProtectedRoute component={AIPurchaseAssistant} />
      </Route>
      <Route path="/ai-quality">
        <ProtectedRoute component={AIQualityAssistant} />
      </Route>
      <Route path="/ai-service">
        <ProtectedRoute component={AIServiceAssistant} />
      </Route>

      {/* Phase D: AI项目智能 */}
      <Route path="/knowledge-qa">
        <ProtectedRoute component={ProjectKnowledgeQA} />
      </Route>
      <Route path="/change-impact">
        <ProtectedRoute component={ChangeImpactAnalysis} />
      </Route>
      <Route path="/ai-risk-prediction">
        <ProtectedRoute component={ProjectRiskPrediction} />
      </Route>

      {/* Phase E: 供应链与质量智能 */}
      <Route path="/supplier-assessment">
        <ProtectedRoute component={SupplierAssessment} />
      </Route>
      <Route path="/inventory-optimization">
        <ProtectedRoute component={InventoryOptimization} />
      </Route>
      <Route path="/quality-prediction">
        <ProtectedRoute component={QualityPrediction} />
      </Route>
      <Route path="/production-efficiency">
        <ProtectedRoute component={ProductionEfficiency} />
      </Route>

      {/* Phase F: HR与人才智能 */}
      <Route path="/ai-talent-assessment">
        <ProtectedRoute component={AITalentAssessment} />
      </Route>
      <Route path="/ai-training-recommender">
        <ProtectedRoute component={AITrainingRecommender} />
      </Route>
      <Route path="/ai-compensation-analysis">
        <ProtectedRoute component={AICompensationAnalysis} />
      </Route>
      <Route path="/ai-workforce-planning">
        <ProtectedRoute component={AIWorkforcePlanning} />
      </Route>

      {/* Phase G: 销售与财务智能 */}
      <Route path="/ai-sales-forecast">
        <ProtectedRoute component={AISalesForecast} />
      </Route>
      <Route path="/ai-customer-churn">
        <ProtectedRoute component={AICustomerChurn} />
      </Route>
      <Route path="/ai-budget-analysis">
        <ProtectedRoute component={AIBudgetAnalysis} />
      </Route>
      <Route path="/ai-cost-optimization">
        <ProtectedRoute component={AICostOptimization} />
      </Route>

      {/* Phase H: 研发与客服智能 */}
      <Route path="/ai-requirements-analysis">
        <ProtectedRoute component={AIRequirementsAnalysis} />
      </Route>
      <Route path="/ai-design-review">
        <ProtectedRoute component={AIDesignReview} />
      </Route>
      <Route path="/ai-fault-diagnosis">
        <ProtectedRoute component={AIFaultDiagnosis} />
      </Route>
      <Route path="/ai-maintenance-plan">
        <ProtectedRoute component={AIMaintenancePlan} />
      </Route>

      {/* Phase 21 P0: 清洁度质检/交接班/SOP工艺卡/客户报修 */}
      <Route path="/cleanliness-inspection">
        <ProtectedRoute component={CleanlinessInspection} />
      </Route>
      <Route path="/shift-handover">
        <ProtectedRoute component={ShiftHandover} />
      </Route>
      <Route path="/sop-process-card">
        <ProtectedRoute component={SOPProcessCardEditor} />
      </Route>
      <Route path="/customer-repair">
        <ProtectedRoute component={CustomerRepairPortal} />
      </Route>

      {/* Phase 21 P1: 质量高级/生产高级/服务销售高级/工时对账 */}
      <Route path="/product-certificate">
        <ProtectedRoute component={ProductCertificate} />
      </Route>
      <Route path="/spc-charts">
        <ProtectedRoute component={SPCControlCharts} />
      </Route>
      <Route path="/ncr-workflow">
        <ProtectedRoute component={NCRWorkflow} />
      </Route>
      <Route path="/material-shortage-alert">
        <ProtectedRoute component={MaterialShortageAlert} />
      </Route>
      <Route path="/workstation-requisition">
        <ProtectedRoute component={WorkstationRequisition} />
      </Route>
      <Route path="/production-exception-report">
        <ProtectedRoute component={ProductionExceptionReport} />
      </Route>
      <Route path="/production-daily-report">
        <ProtectedRoute component={ProductionDailyReport} />
      </Route>
      <Route path="/remote-assistance">
        <ProtectedRoute component={RemoteAssistance} />
      </Route>
      <Route path="/service-sla">
        <ProtectedRoute component={ServiceSLADashboard} />
      </Route>
      <Route path="/opportunity-conversion">
        <ProtectedRoute component={OpportunityConversion} />
      </Route>
      <Route path="/aftersales-design-feedback">
        <ProtectedRoute component={AfterSalesDesignFeedback} />
      </Route>
      <Route path="/time-reconciliation">
        <ProtectedRoute component={TimeReconciliationDashboard} />
      </Route>

      {/* Phase 21 P2: 3D模型/工单→KB/NPS/评审→报价/质量月报/BOM冻结/QC验收 */}
      <Route path="/model-viewer-3d">
        <ProtectedRoute component={ModelViewer3D} />
      </Route>
      <Route path="/ticket-to-kb">
        <ProtectedRoute component={TicketToKnowledgeBase} />
      </Route>
      <Route path="/nps-survey">
        <ProtectedRoute component={NPSSurveyAutomation} />
      </Route>
      <Route path="/review-to-quotation">
        <ProtectedRoute component={ReviewToQuotation} />
      </Route>
      <Route path="/quality-monthly-report">
        <ProtectedRoute component={QualityMonthlyReport} />
      </Route>
      <Route path="/bom-freeze-automation">
        <ProtectedRoute component={BOMFreezeAutomation} />
      </Route>
      <Route path="/qc-pass-notification">
        <ProtectedRoute component={QCPassNotification} />
      </Route>

      {/* Phase I: 区域合规与本地化 */}
      <Route path="/cn-labor-compliance">
        <ProtectedRoute component={CNLaborCompliance} />
      </Route>
      <Route path="/ai-social-insurance">
        <ProtectedRoute component={AISocialInsurance} />
      </Route>
      <Route path="/regional-certification">
        <ProtectedRoute component={RegionalCertificationTracker} />
      </Route>
      <Route path="/working-days-calculator">
        <ProtectedRoute component={WorkingDaysCalculator} />
      </Route>
      <Route path="/ai-vat-calculator">
        <ProtectedRoute component={AIVATCalculator} />
      </Route>
      <Route path="/ai-content-localizer">
        <ProtectedRoute component={AIContentLocalizer} />
      </Route>

      {/* Phase B: 代理职能 + 绩效薪资查询 + KPI绩效管理 */}
      <Route path="/kpi-management">
        <ProtectedRoute component={KpiPerformance} />
      </Route>
      <Route path="/delegation">
        <ProtectedRoute component={DelegationManagement} />
      </Route>
      <Route path="/perf-salary">
        <ProtectedRoute component={PerformanceSalaryQuery} />
      </Route>

      {/* Supply Chain Traceability & Quality Control */}
      <Route path="/supply-chain">
        <ProtectedRoute component={SupplyChainWorkbench} />
      </Route>
      <Route path="/erp-integration">
        <ProtectedRoute component={ERPIntegration} />
      </Route>
      <Route path="/material-management">
        <ProtectedRoute component={MaterialManagement} />
      </Route>
      <Route path="/procurement-management">
        <ProtectedRoute component={ProcurementManagement} />
      </Route>
      <Route path="/procurement-workbench">
        <ProtectedRoute component={ProcurementWorkbench} />
      </Route>
      <Route path="/supply-chain-planning">
        <ProtectedRoute component={SupplyChainPlanning} />
      </Route>
      <Route path="/supply-chain-rfq">
        <ProtectedRoute component={SupplyChainRFQKanban} />
      </Route>
      <Route path="/ppap">
        <ProtectedRoute component={PPAPManagement} />
      </Route>
      <Route path="/fmea">
        <ProtectedRoute component={FMEAManagement} />
      </Route>
      <Route path="/control-plan">
        <ProtectedRoute component={ControlPlanManagement} />
      </Route>
      <Route path="/8d-capa">
        <ProtectedRoute component={QualityWorkbench} />
      </Route>
      <Route path="/msa">
        <ProtectedRoute component={MSAManagement} />
      </Route>
      <Route path="/safety-rules">
        <ProtectedRoute component={SafetyRuleManagement} />
      </Route>

      {/* Dual-AI Collaboration Matrix (Gemini → CEO → Claude) */}
      <Route path="/dual-ai-matrix">
        <ProtectedRoute component={DualAIMatrix} />
      </Route>
      {/* GRT Smart Meeting & AI Engagement Hub (智能会议与互动中枢) */}
      <Route path="/meeting-hub">
        <ProtectedRoute component={MeetingHub} />
      </Route>
      {/* 述职报告智能会议 (Performance Review Meeting) */}
      <Route path="/performance-review">
        <ProtectedRoute component={PerformanceReviewMeeting} />
      </Route>
      {/* Office 365 Encrypted Email Ferry — Cross-Border Data Sync */}
      <Route path="/cross-border-sync">
        <ProtectedRoute component={CrossBorderSync} />
      </Route>

      {/* GRT Value Chain Enhancement — 非标清洗设备全价值链 */}
      <Route path="/equipment-compliance">
        <ProtectedRoute component={EquipmentComplianceTracker} />
      </Route>
      <Route path="/process-trials">
        <ProtectedRoute component={ProcessTrialWorkbench} />
      </Route>
      <Route path="/nda-management">
        <ProtectedRoute component={NDAManagement} />
      </Route>
      <Route path="/sales-materials">
        <ProtectedRoute component={SalesMaterialsLibrary} />
      </Route>
      <Route path="/drawing-library">
        <ProtectedRoute component={DrawingLibrary} />
      </Route>
      <Route path="/project-360-cockpit">
        <ProtectedRoute component={Project360Cockpit} />
      </Route>
      <Route path="/my-360-profile">
        <ProtectedRoute component={My360Profile} />
      </Route>
      <Route path="/capability-system">
        <ProtectedRoute component={CapabilitySystemMatrix} />
      </Route>
      <Route path="/hr-sandbox-capability">
        <ProtectedRoute component={HRSandboxCapability} />
      </Route>
      <Route path="/admin/compliance-calendar">
        <ProtectedRoute component={ComplianceCalendar} />
      </Route>
      <Route path="/engineering/eco-review/:id">
        <ProtectedRoute component={EcoReviewDashboard} />
      </Route>
      <Route path="/engineering/eco-review">
        <ProtectedRoute component={EcoReviewDashboard} />
      </Route>
      <Route path="/supply-chain/risk-radar">
        <ProtectedRoute component={SupplierRiskRadar} />
      </Route>
      <Route path="/my-workspace/profile/:userId">
        <ProtectedRoute component={EmployeeProfile} />
      </Route>
      <Route path="/quality/fmea-live">
        <ProtectedRoute component={FmeaLiveRiskMatrix} />
      </Route>
      <Route path="/hr/ai-interventions">
        <ProtectedRoute component={AiInterventionDashboard} />
      </Route>
      <Route path="/production/smart-schedule">
        <ProtectedRoute component={SmartScheduleDashboard} />
      </Route>
      <Route path="/supply-chain/smart-inventory">
        <ProtectedRoute component={SmartInventoryDashboard} />
      </Route>
      <Route path="/esg/cbam-dashboard">
        <ProtectedRoute component={CbamDashboard} />
      </Route>
      <Route path="/ceo/executive-cockpit">
        <ProtectedRoute component={CeoExecutiveCockpit} />
      </Route>
      <Route path="/ceo/strategy-2026">
        <ProtectedRoute component={CeoStrategy2026} />
      </Route>
      <Route path="/project-agent">
        <ProtectedRoute component={ProjectAgentDashboard} />
      </Route>

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );

  // Standalone pages render without sidebar; all others get persistent Layout
  return isStandalone ? routes : <Layout>{routes}</Layout>;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary level="page">
      <LanguageProvider>
        <UserProfileProvider defaultRole="employee">
          <ThemeProvider
            defaultTheme="light"
            switchable
          >
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </UserProfileProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
// Build timestamp: 20260202100527
