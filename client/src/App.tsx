import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import RequireAuth from "./components/RequireAuth";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Docs from "./pages/Docs";
import Home from "./pages/Home";
import Risks from "./pages/Risks";
import Roadmap from "./pages/Roadmap";
import Tools from "./pages/Tools";
import JiandaoyunAnalysis from "./pages/JiandaoyunAnalysis";
import GuideReader from "./pages/GuideReader";
import MigrationTasks from "./pages/MigrationTasks";
import ArchitecturePlan from "./pages/ArchitecturePlan";
import DevTaskBoard from "./pages/DevTaskBoard";
import CrmCustomers from "./pages/CrmCustomers";
import CrmOpportunities from "./pages/CrmOpportunities";
import CrmContacts from "./pages/CrmContacts";
import ProjectManagement from "./pages/ProjectManagement";
import CostManagement from "./pages/CostManagement";
import AgendaManagement from "./pages/AgendaManagement";
import TrainingManagement from "./pages/TrainingManagement";
import AnnualPlanning from "./pages/AnnualPlanning";
import WebhookManagement from "./pages/WebhookManagement";
import NamingRulesManagement from "./pages/NamingRulesManagement";
import HRMIntelligent from "./pages/HRMIntelligent";
import AuditLogViewer from "./pages/AuditLogViewer";
import GroupNotificationManagement from "./pages/GroupNotificationManagement";
import AIAssistantHub from "./pages/AIAssistantHub";
import AiAssistantHubPage from "./pages/AiAssistantHubPage";
import DigitalAssistants from "./pages/DigitalAssistants";
import AIEffectivenessTracking from "./pages/AIEffectivenessTracking";
import NotebookSearch from "./pages/NotebookSearch";
import SubsystemHelp from "./pages/SubsystemHelp";
import PublicHome from "./pages/PublicHome";
import Capabilities from "./pages/Capabilities";
import CustomerPortal from "./pages/CustomerPortal";
import DeadlockMonitor from "./pages/DeadlockMonitor";
import AIDiagnostic from "./pages/AIDiagnostic";
import CollaborationWorkspace from "./pages/CollaborationWorkspace";
import LiveDocumentManager from "./pages/LiveDocumentManager";
import SystemGuide from "./pages/SystemGuide";
import TranslationContribute from "./pages/TranslationContribute";
import HelpCenter from "./pages/HelpCenter";
import GeminiSpecification from "./pages/GeminiSpecification";
import DeploymentSpec from "./pages/DeploymentSpec";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import EmployeeTimeDetails from "./pages/EmployeeTimeDetails";
import IntelligentScheduling from "./pages/IntelligentScheduling";
import ComplianceRulesConfig from "./pages/ComplianceRulesConfig";
import ChangeManagement from "./pages/ChangeManagement";
import HRLifecycle from "./pages/HRLifecycle";
const RDVerificationCenter = React.lazy(() => import("./pages/RDVerificationCenter"));
const StageGateDashboard = React.lazy(() => import("./pages/StageGateDashboard"));
import Community from "./pages/Community";
import LeadManagement from "./pages/LeadManagement";
import SchedulerManagement from "./pages/SchedulerManagement";
import TripRequest from "./pages/TripRequest";
import SupervisorWorkbench from "./pages/SupervisorWorkbench";
import BudgetManagement from "./pages/BudgetManagement";
import ExpenseReport from "./pages/ExpenseReport";
import MobileLocationReport from "./pages/mobile/MobileLocationReport";
import MobileApproval from "./pages/mobile/MobileApproval";
import FieldEngineerDashboard from "./pages/mobile/FieldEngineerDashboard";
import TravelDashboard from "./pages/TravelDashboard";
import ExpenseComparison from "./pages/ExpenseComparison";
import BudgetOverrunApproval from "./pages/BudgetOverrunApproval";
import ExpenseForecast from "./pages/ExpenseForecast";
import ExpenseReportScheduler from "./pages/ExpenseReportScheduler";
import CapabilityOS from "./pages/CapabilityOS";
import CapabilityDashboard from "./pages/CapabilityDashboard";
import EvidenceSubmission from "./pages/EvidenceSubmission";
import RedBlueBoard from "./pages/RedBlueBoard";
import EvidenceReview from "./pages/EvidenceReview";
import CapabilityCertificates from "./pages/CapabilityCertificates";
import CapabilityPathRecommendation from "./pages/CapabilityPathRecommendation";
import TeamCapabilityAnalysis from "./pages/TeamCapabilityAnalysis";
import CertificateVerify from "./pages/CertificateVerify";
import CapabilityBadges from "./pages/CapabilityBadges";
import CapabilityLeaderboard from "./pages/CapabilityLeaderboard";
import GRTCleaningStrategy from "./pages/GRTCleaningStrategy";
import EngineerCheckpoints from "./pages/EngineerCheckpoints";
import ToothpasteTest from "./pages/ToothpasteTest";
import CleaningTrajectory3D from "./pages/CleaningTrajectory3D";
import ToothpasteTestHistory from "./pages/ToothpasteTestHistory";
import AgentUnitManagement from "./pages/AgentUnitManagement";
import ModelExplainabilityReport from "./pages/ModelExplainabilityReport";
import KnowledgeGraphApproval from "./pages/KnowledgeGraphApproval";
import ModelTrainingScheduler from "./pages/ModelTrainingScheduler";
import ModelPerformanceMonitor from "./pages/ModelPerformanceMonitor";
import WorkflowManagement from "./pages/WorkflowManagement";
import NotificationAggregationPreview from "./pages/NotificationAggregationPreview";
import NotificationAggregationConfig from "./pages/NotificationAggregationConfig";
import ProductionDashboard from "./pages/ProductionDashboard";
import ProductionCommandCenter from "./pages/ProductionCommandCenter";
import WorkerManagement from "./pages/WorkerManagement";
import QCManagement from "./pages/QCManagement";
import M1KickoffDashboard from "./pages/M1KickoffDashboard";
import M7M9DeliveryTrack from "./pages/M7M9DeliveryTrack";
import FATCoordination from "./pages/FATCoordination";
import UWBManagement from "./pages/UWBManagement";
import WorkerImport from "./pages/WorkerImport";
import CronMonitor from "./pages/CronMonitor";
import DeliveryManagement from "./pages/DeliveryManagement";
import WebhookSettings from "./pages/WebhookSettings";
import AITriggerSettings from "./pages/AITriggerSettings";
import GateChecklistSettings from "./pages/GateChecklistSettings";
import AfterSalesManagement from "./pages/AfterSalesManagement";
import AfterSalesAdvanced from "./pages/AfterSalesAdvanced";
import CustomerSignature from "./pages/CustomerSignature";
import PermissionManagement from "./pages/PermissionManagement";
import VisitorRequestForm from "./pages/VisitorRequestForm";
import MenuManagement from "./pages/MenuManagement";
import AIAssistantPage from "./pages/AIAssistantPage";
import CapabilityManagementPage from "./pages/CapabilityManagementPage";
import SystemDeployment from "./pages/SystemDeployment";
import SecurityDashboard from "./pages/SecurityDashboard";
import SocialCommunity from "./pages/SocialCommunity";
import LiquidWorkforce from "./pages/LiquidWorkforce";
import AISales from "./pages/AISales";
import PersonalAgent from "./pages/PersonalAgent";
import SocialCommunitySettings from "./pages/SocialCommunitySettings";
import SocialCommunityAnalytics from "./pages/SocialCommunityAnalytics";
import ErpConfiguration from "./pages/admin/ErpConfiguration";
import AdminWebhookManagement from "./pages/admin/WebhookManagement";
import CertificateTemplates from "./pages/admin/CertificateTemplates";
import SystemGuideBook from "./pages/SystemGuideBook";
import LiquidWorkforceHub from "./pages/LiquidWorkforceHub";
import AiSalesHub from "./pages/AiSalesHub";
import PersonalAgentHub from "./pages/PersonalAgentHub";
import ProjectHub from "./pages/ProjectHub";
import SocialCommunityHub from "./pages/SocialCommunityHub";
import LiquidWorkforceHubEnhanced from "./pages/LiquidWorkforceHubEnhanced";
import AiSalesHubEnhanced from "./pages/AiSalesHubEnhanced";
import PersonalAgentHubEnhanced from "./pages/PersonalAgentHubEnhanced";
import ProjectHubEnhanced from "./pages/ProjectHubEnhanced";
import SocialCommunityHubEnhanced from "./pages/SocialCommunityHubEnhanced";
import ErpConnectionManager from "./pages/admin/ErpConnectionManager";
import LoginSuccess from "./pages/LoginSuccess";
import LocalLogin from "./pages/LocalLogin";
import DingTalkSettings from "./pages/DingTalkSettings";
import NotificationSettings from "./pages/NotificationSettings";
import AISolutionAssistant from "./pages/ai/AISolutionAssistant";
import AIQuotationAssistant from "./pages/ai/AIQuotationAssistant";
import AIPlanningAssistant from "./pages/ai/AIPlanningAssistant";
import AIKPIAssistant from "./pages/ai/AIKPIAssistant";
import CapabilityEvidenceUpload from "./pages/capability/CapabilityEvidenceUpload";
import MicrosoftGraphSettings from "./pages/settings/MicrosoftGraphSettings";
import SocialPlatformSettings from "./pages/settings/SocialPlatformSettings";
import GRTOperationDashboard from "./pages/GRTOperationDashboard";
import CustomerQuestionnaire from "./pages/CustomerQuestionnaire";
import ProcessGanttChart from "./components/ProcessGanttChart";
import JiandaoyunIntegration from "./pages/JiandaoyunIntegration";
import CertificationManagement from "./pages/CertificationManagement";
import AnnualAgenda from "./pages/AnnualAgenda";
import CustomerValueView from "./pages/CustomerValueView";
import GlobalGrowthTracker from "./pages/GlobalGrowthTracker";
import ProductionExecutionView from "./pages/ProductionExecutionView";
import UWBDeviceManagement from "./pages/production/UWBDeviceManagement";
import MeetingIntelligence from "./pages/meeting/MeetingIntelligence";
import MeetingOwnerManagement from "./pages/meeting/MeetingOwnerManagement";
import NotificationChannelSettings from "./pages/production/NotificationChannelSettings";
import BUTeamManagement from "./pages/BUTeamManagement";
import BUPerformanceDashboard from "./pages/BUPerformanceDashboard";
import EmployeeManagement from "./pages/EmployeeManagement";
import EmployeeOffboarding from "./pages/EmployeeOffboarding";
import EmployeeIntelligentPerformance from "./pages/EmployeeIntelligentPerformance";
import UserProfileSettings from "./pages/UserProfileSettings";
import UserStatusManagement from "./pages/UserStatusManagement";
import SmartMeeting from "./pages/SmartMeeting";
import MeetingExecutive from "./pages/MeetingExecutive";
import AdminDashboard from "./pages/AdminDashboard";
import MonitoringDashboard from "./pages/MonitoringDashboard";
import ErrorLogViewer from "./pages/ErrorLogViewer";
import AIEarlyWarning from "./pages/AIEarlyWarning";
import { UserProfileProvider } from "./contexts/UserProfileContext";

// v1.4.5 项目型组织操作系统 (POS) 页面
import POSDashboard from "./pages/pos/Dashboard";
import POSProjects from "./pages/pos/Projects";
import POSProjectDetail from "./pages/pos/ProjectDetail";
import POSCustomers from "./pages/pos/Customers";
import StageM2Detail from "./pages/pos/StageM2Detail";
import StageReview from "./pages/pos/StageReview";
import POSVersions from "./pages/pos/Versions";
import POSProcurement from "./pages/pos/Procurement";
import POSMESSync from "./pages/pos/MESSync";
import POSConnectorConfig from "./pages/pos/ConnectorConfig";
import StageDetail from "./pages/pos/StageDetail";
import ProductionSteps from "./pages/ProductionSteps";
import ProcessProgressDashboard from "./pages/ProcessProgressDashboard";
import WorkerMobileView from "./pages/WorkerMobileView";
import AiAccuracyDashboard from "./pages/AiAccuracyDashboard";
import QualityCheckpoints from "./pages/QualityCheckpoints";
import MaterialFlowTracking from "./pages/MaterialFlowTracking";
import WorkerPerformanceLeaderboard from "./pages/WorkerPerformanceLeaderboard";
import QualityInterlock from "./pages/QualityInterlock";
import BomVerification from "./pages/BomVerification";
import SalaryBonus from "./pages/SalaryBonus";
import CcdIntegration from "./pages/CcdIntegration";
import BomImport from "./pages/BomImport";
import SalaryReport from "./pages/SalaryReport";
import CcdRealtime from "./pages/CcdRealtime";
import BomExcelImport from "./pages/BomExcelImport";
import SalaryApproval from "./pages/SalaryApproval";
import BusinessUnits from "./pages/BusinessUnits";
import AIProcessOptimization from "./pages/AIProcessOptimization";
import HROffboarding from "./pages/HROffboarding";
import Notifications from "./pages/Notifications";
import MyTasks from "./pages/MyTasks";

// ======== 新增模块页面 ========
// 研发设计 (TX-001~005)
import RequirementsAnalysis from "./pages/RequirementsAnalysis";
import SolutionDesign from "./pages/SolutionDesign";
import MechanicalDesign from "./pages/MechanicalDesign";
import ElectricalDesign from "./pages/ElectricalDesign";
import BomManagement from "./pages/BomManagement";
import TechDocuments from "./pages/TechDocuments";
// 客户服务 (TX-013~015 + 售后)
import FieldInstallation from "./pages/FieldInstallation";
import SatTesting from "./pages/SatTesting";
import FinalAcceptance from "./pages/FinalAcceptance";
import ServiceTickets from "./pages/ServiceTickets";
import CustomerFeedback from "./pages/CustomerFeedback";
import SpareParts from "./pages/SpareParts";
// 绩效分层
import MyPerformance from "./pages/MyPerformance";
import TeamPerformance from "./pages/TeamPerformance";
import DeptPerformance from "./pages/DeptPerformance";
// 销售扩展
import QuotationManagement from "./pages/QuotationManagement";
import ContractManagement from "./pages/ContractManagement";
import SalesAnalytics from "./pages/SalesAnalytics";
// 生产扩展
import ProcessManagement from "./pages/ProcessManagement";
import MaterialTracking from "./pages/MaterialTracking";
// HR扩展
import Recruitment from "./pages/Recruitment";
import Attendance from "./pages/Attendance";
import Compensation from "./pages/Compensation";
// 项目扩展
import GanttChart from "./pages/GanttChart";
// 系统管理
import OrganizationManagement from "./pages/OrganizationManagement";
// P3: 权限管理扩展
import TemporaryPermissions from "./pages/TemporaryPermissions";
import PermissionBlacklist from "./pages/PermissionBlacklist";
import MenuAnalytics from "./pages/MenuAnalytics";
import RoleDashboard from "./pages/RoleDashboard";
import Gamification from "./pages/Gamification";
import IoTDashboard from "./pages/IoTDashboard";
import RAGTrainingCenter from "./pages/RAGTrainingCenter";
import DelegationManagement from "./pages/DelegationManagement";
import PerformanceSalaryQuery from "./pages/PerformanceSalaryQuery";

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

// Protected route wrapper component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <RequireAuth>
      <Component />
    </RequireAuth>
  );
}

function Router() {
  return (
    <Switch>
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
      <Route path={"/ai-assistant"}>
        <ProtectedRoute component={AIAssistantHub} />
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
      {/* v1.3.94 定时任务管理 */}
      <Route path="/scheduler-management">
        <ProtectedRoute component={SchedulerManagement} />
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

      {/* RAG知识库训练中心 */}
      <Route path="/rag-training">
        <ProtectedRoute component={RAGTrainingCenter} />
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

      {/* Phase B: 代理职能 + 绩效薪资查询 */}
      <Route path="/delegation">
        <ProtectedRoute component={DelegationManagement} />
      </Route>
      <Route path="/perf-salary">
        <ProtectedRoute component={PerformanceSalaryQuery} />
      </Route>

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <UserProfileProvider defaultRole="employee">
          <ThemeProvider
            defaultTheme="dark"
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
