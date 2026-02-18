/**
 * v1.3.75 生产执行模块 - T1-T15工作流程可视化（增强版）
 * Production Execution View - T1-T15 Workflow Visualization (Enhanced)
 * 
 * Features:
 * - Horizontal scrollable timeline (T1-T15)
 * - Context-aware detail view with AI insights
 * - Role-based authorization (Gray-out logic)
 * - Integration signals (Copilot 365 / WeCom)
 * - Time Tracking Panel integration
 * - Stage Approval Panel integration
 * - Real-time data from tRPC API
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight,
  Clock, FileText, Lock, MessageSquare, Zap, Layout,
  Calendar, ShieldAlert, UserCircle, Play, Settings,
  Wrench, Cpu, Cog, Package, TestTube, Truck, Target,
  Timer, ClipboardCheck, RefreshCw, Loader2, Filter, X
} from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import TimeTrackingPanel, { TimeRecord } from '@/components/production/TimeTrackingPanel';
import StageApprovalPanel, { ApprovalRecord, ApprovalRule } from '@/components/production/StageApprovalPanel';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type StageStatus = 'Pending' | 'In_Progress' | 'Completed' | 'Alert' | 'Blocked';

type UserRole = 
  | 'PROJECT_MANAGER'
  | 'MECHANICAL'
  | 'ELECTRICAL'
  | 'ASSEMBLY'
  | 'QC'
  | 'SERVICE'
  | 'ADMIN';

interface TStage {
  id: string;
  name: string;
  nameZh: string;
  role: UserRole;
  duration: number;
  status: StageStatus;
  dbId?: number; // Database ID for API calls
  plannedHours?: number;
  actualHours?: number;
  startDate?: string;
  endDate?: string;
}

interface AIKnowledge {
  sop: string;
  risk: string;
  files: string[];
}

// ============================================================================
// ROLE-BASED VIEW FILTER DEFINITIONS
// ============================================================================

type StepFilterPreset = 'all' | 'mechanical' | 'electrical' | 'custom';

interface StepFilterConfig {
  preset: StepFilterPreset;
  label: string;
  labelZh: string;
  steps: string[];  // empty means show all
  badgeColor: string;
}

const STEP_FILTER_PRESETS: Record<StepFilterPreset, StepFilterConfig> = {
  all: {
    preset: 'all',
    label: 'All Steps',
    labelZh: '全部工序',
    steps: [],
    badgeColor: 'bg-slate-600 text-slate-100',
  },
  mechanical: {
    preset: 'mechanical',
    label: 'Mechanical (T3-T5)',
    labelZh: '机械工序 (T3-T5)',
    steps: ['T3', 'T4', 'T5'],
    badgeColor: 'bg-amber-600 text-amber-100',
  },
  electrical: {
    preset: 'electrical',
    label: 'Electrical (T6-T8)',
    labelZh: '电气工序 (T6-T8)',
    steps: ['T6', 'T7', 'T8'],
    badgeColor: 'bg-cyan-600 text-cyan-100',
  },
  custom: {
    preset: 'custom',
    label: 'Custom',
    labelZh: '自定义',
    steps: [],
    badgeColor: 'bg-purple-600 text-purple-100',
  },
};

/**
 * Maps the auth system role (bu_mech, bu_elec, etc.) to a default step filter preset.
 * admin and bu_pm see all steps; engineers see their relevant steps by default.
 */
function getDefaultFilterForRole(role?: string): StepFilterPreset {
  if (!role) return 'all';
  const r = role.toLowerCase();
  if (r === 'bu_mech') return 'mechanical';
  if (r === 'bu_elec') return 'electrical';
  // admin, bu_pm, and all other roles: show all
  return 'all';
}

// ============================================================================
// DEFAULT MOCK DATA: T1-T15 Definitions (fallback when API unavailable)
// ============================================================================

const DEFAULT_T_STAGES: TStage[] = [
  { id: 'T1', name: 'Machining', nameZh: '机加工', role: 'MECHANICAL', duration: 40, status: 'Completed' },
  { id: 'T2', name: 'Sheet Metal', nameZh: '钣金', role: 'MECHANICAL', duration: 32, status: 'Completed' },
  { id: 'T3', name: 'Welding', nameZh: '焊接', role: 'MECHANICAL', duration: 24, status: 'Completed' },
  { id: 'T4', name: 'Surface Treatment', nameZh: '表面处理', role: 'MECHANICAL', duration: 16, status: 'Completed' },
  { id: 'T5', name: 'Mech Assembly', nameZh: '机械装配', role: 'ASSEMBLY', duration: 48, status: 'Completed' },
  { id: 'T6', name: 'Elec Assembly', nameZh: '电气装配', role: 'ELECTRICAL', duration: 40, status: 'In_Progress' },
  { id: 'T7', name: 'Piping', nameZh: '管路安装', role: 'ASSEMBLY', duration: 24, status: 'Pending' },
  { id: 'T8', name: 'Debugging', nameZh: '调试', role: 'ELECTRICAL', duration: 32, status: 'Pending' },
  { id: 'T9', name: 'QC Inspection', nameZh: '质检', role: 'QC', duration: 16, status: 'Pending' },
  { id: 'T10', name: 'FAT', nameZh: '出厂测试', role: 'QC', duration: 24, status: 'Pending' },
  { id: 'T11', name: 'Packaging', nameZh: '包装', role: 'ASSEMBLY', duration: 8, status: 'Pending' },
  { id: 'T12', name: 'Shipping', nameZh: '发运', role: 'PROJECT_MANAGER', duration: 4, status: 'Pending' },
  { id: 'T13', name: 'Installation', nameZh: '现场安装', role: 'SERVICE', duration: 40, status: 'Pending' },
  { id: 'T14', name: 'SAT', nameZh: '现场验收', role: 'SERVICE', duration: 24, status: 'Pending' },
  { id: 'T15', name: 'Final Acceptance', nameZh: '终验收', role: 'PROJECT_MANAGER', duration: 8, status: 'Pending' },
];

// ============================================================================
// MOCK DATA: AI Knowledge Base (Simulating M2 Data Flow)
// ============================================================================

const AI_KNOWLEDGE_BASE: Record<string, AIKnowledge> = {
  T1: {
    sop: "机加工阶段：所有精密零件需按照ISO 2768-mK公差标准加工。推荐使用五轴加工中心确保复杂曲面精度。",
    risk: "注意：客户要求Ra 0.8表面粗糙度，需使用精加工刀具并控制切削参数。",
    files: ['M2-Kickoff-Report.pdf', 'BOM-v2.3.xlsx', 'Machining-Specs.pdf']
  },
  T2: {
    sop: "钣金加工阶段：激光切割路径已优化，预计材料利用率提升12%。所有折弯需使用模具校准。",
    risk: "提醒：部分钣金件需要电解抛光处理，请提前安排外协加工周期。",
    files: ['Sheet-Metal-Specs.pdf', 'Laser-Cut-Program.nc']
  },
  T3: {
    sop: "焊接阶段：采用TIG焊接工艺，焊缝需符合AWS D1.1标准。焊后需进行X射线探伤检测。",
    risk: "高风险：部分焊接位置需要预热处理，防止冷裂纹产生。",
    files: ['Welding-WPS.pdf', 'NDT-Report-Template.xlsx']
  },
  T4: {
    sop: "表面处理阶段：根据客户要求，外观件采用粉末喷涂，内部件采用达克罗处理。",
    risk: "注意：喷涂前需确保表面清洁度达到Sa 2.5级，否则影响附着力。",
    files: ['Surface-Treatment-Spec.pdf', 'Color-Sample-RAL7035.jpg']
  },
  T5: {
    sop: "机械装配阶段：按照装配图纸顺序进行，所有螺栓需使用扭矩扳手并记录扭矩值。",
    risk: "注意：传动部件装配需特别注意同轴度，偏差不得超过0.02mm。",
    files: ['Assembly-Drawing.pdf', 'Torque-Spec.xlsx']
  },
  T6: {
    sop: "电气装配阶段：按照电气原理图和接线图进行，所有线缆需标记线号。控制柜内走线需整齐美观。",
    risk: "高风险：客户要求Class 100洁净室环境，电气元件需提前除尘处理。",
    files: ['Electrical-Schematic.pdf', 'PLC-Program-v2.1.zip', 'Wiring-Diagram.dwg']
  },
  T7: {
    sop: "管路安装阶段：按照P&ID图进行管路连接，所有焊接管路需进行气密性测试。",
    risk: "提醒：高压管路需使用指定等级的管件，禁止使用替代品。",
    files: ['P&ID-Drawing.pdf', 'Pipe-Spec.xlsx']
  },
  T8: {
    sop: "调试阶段：按照调试手册逐项进行，记录所有参数设置。PLC程序需备份至服务器。",
    risk: "高风险：调试过程中需注意安全联锁功能验证，确保急停有效。",
    files: ['Debug-Manual.pdf', 'Parameter-Sheet.xlsx', 'Safety-Checklist.pdf']
  },
  T9: {
    sop: "质检阶段：按照QC检查表逐项检查，不合格项需记录并跟踪整改。",
    risk: "注意：外观检查需在标准光源下进行，避免色差判断失误。",
    files: ['QC-Checklist.xlsx', 'Inspection-Report-Template.docx']
  },
  T10: {
    sop: "FAT阶段：按照FAT协议执行测试，客户代表需全程见证。测试数据需实时记录。",
    risk: "高风险：FAT测试前需确认所有安全装置已安装并测试通过。",
    files: ['FAT-Protocol.pdf', 'Test-Data-Template.xlsx']
  },
  T11: {
    sop: "包装阶段：按照包装规范进行，易损件需加强防护。包装清单需与发货清单核对。",
    risk: "提醒：海运包装需考虑防潮防锈处理，内陆运输可简化。",
    files: ['Packing-Spec.pdf', 'Packing-List-Template.xlsx']
  },
  T12: {
    sop: "发运阶段：确认运输方式和路线，办理相关运输手续。跟踪物流信息直至到达。",
    risk: "注意：超宽超重件需提前办理特种运输许可证。",
    files: ['Shipping-Document.pdf', 'Transport-Route.pdf']
  },
  T13: {
    sop: "现场安装阶段：按照安装图纸进行设备就位和连接。与客户确认安装位置和接口。",
    risk: "高风险：现场施工需遵守客户安全规定，办理作业许可证。",
    files: ['Installation-Drawing.pdf', 'Site-Safety-Rules.pdf']
  },
  T14: {
    sop: "SAT阶段：按照SAT协议执行现场验收测试，确保设备性能达到合同要求。",
    risk: "注意：SAT测试需使用客户提供的工艺介质，提前确认准备情况。",
    files: ['SAT-Protocol.pdf', 'Acceptance-Criteria.pdf']
  },
  T15: {
    sop: "终验收阶段：整理所有交付文件，与客户确认验收单签署。办理质保期开始手续。",
    risk: "提醒：确保所有培训已完成，操作手册已移交客户。",
    files: ['Handover-Checklist.pdf', 'Warranty-Certificate.pdf', 'Training-Record.pdf']
  },
  DEFAULT: {
    sop: "请选择具体阶段查看SOP指导。",
    risk: "暂无风险提示。",
    files: []
  }
};

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

const StatusBadge = ({ status }: { status: StageStatus }) => {
  const config: Record<StageStatus, { bg: string; text: string; label: string }> = {
    Pending: { bg: 'bg-slate-700/50', text: 'text-slate-400', label: '待开始' },
    In_Progress: { bg: 'bg-orange-900/50', text: 'text-orange-400', label: '进行中' },
    Completed: { bg: 'bg-emerald-900/50', text: 'text-emerald-400', label: '已完成' },
    Alert: { bg: 'bg-red-900/50', text: 'text-red-400', label: '异常' },
    Blocked: { bg: 'bg-purple-900/50', text: 'text-purple-400', label: '阻塞' },
  };
  
  const { bg, text, label } = config[status];
  
  return (
    <span className={`${bg} ${text} text-[10px] px-2 py-0.5 rounded font-medium`}>
      {label}
    </span>
  );
};

// ============================================================================
// MAIN VIEW COMPONENT
// ============================================================================

export default function ProductionExecutionView() {
  const [activeStageId, setActiveStageId] = useState('T6');
  const [activeTab, setActiveTab] = useState('details');
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1); // Demo project ID
  const { t, language } = useLanguage();
  const { user } = useAuth();
  
  // 当前用户角色 (从认证获取或使用默认值)
  const CURRENT_USER_ROLE: UserRole = (user?.role?.toUpperCase() as UserRole) || 'ELECTRICAL';
  const CURRENT_USER_ID = user?.id || 1;
  const CURRENT_USER_NAME = user?.name || 'Demo User';

  // ==========================================================================
  // Role-based Step Filter State
  // ==========================================================================
  const [stepFilterPreset, setStepFilterPreset] = useState<StepFilterPreset>(() =>
    getDefaultFilterForRole(user?.role)
  );

  // Reinitialize the filter when the user's role becomes available (async auth)
  useEffect(() => {
    if (user?.role) {
      setStepFilterPreset(getDefaultFilterForRole(user.role));
    }
  }, [user?.role]);
  
  // ==========================================================================
  // tRPC Queries
  // ==========================================================================
  
  // 获取阶段定义
  const { data: stageDefinitionsData, isLoading: isLoadingDefinitions } = 
    trpc.productionExecution.getStageDefinitions.useQuery();
  
  // 获取项目阶段数据
  const { data: projectStagesData, isLoading: isLoadingStages, refetch: refetchStages } = 
    trpc.productionExecution.getProjectStages.useQuery(
      { projectId: selectedProjectId },
      { enabled: selectedProjectId > 0 }
    );
  
  // 获取工时记录
  const { data: timeRecordsData, isLoading: isLoadingTimeRecords, refetch: refetchTimeRecords } =
    (trpc.productionExecution.getTimeRecords as any).useQuery(
      { projectId: selectedProjectId, stageCode: activeStageId },
      { enabled: selectedProjectId > 0 }
    );
  
  // 获取审批记录
  const { data: approvalsData, isLoading: isLoadingApprovals, refetch: refetchApprovals } = 
    trpc.productionExecution.getApprovals.useQuery(
      { projectId: selectedProjectId },
      { enabled: selectedProjectId > 0 }
    );
  
  // 获取审批规则
  const { data: approvalRulesData } =
    (trpc.productionExecution as any).getApprovalRules.useQuery(
      { stageCode: activeStageId },
      { enabled: !!activeStageId }
    );
  
  // 获取集成状态
  const { data: integrationStatusData } =
    (trpc.productionExecution as any).getIntegrationStatus.useQuery();
  
  // ==========================================================================
  // tRPC Mutations
  // ==========================================================================
  
  const createTimeRecordMutation = trpc.productionExecution.createTimeRecord.useMutation({
    onSuccess: () => {
      refetchTimeRecords();
    },
  });
  
  const createApprovalMutation = trpc.productionExecution.createApprovalRequest.useMutation({
    onSuccess: () => {
      refetchApprovals();
    },
  });
  
  const processApprovalMutation = trpc.productionExecution.processApproval.useMutation({
    onSuccess: () => {
      refetchApprovals();
      refetchStages();
    },
  });
  
  // ==========================================================================
  // Data Processing
  // ==========================================================================
  
  // 合并API数据和默认数据 (all stages, unfiltered)
  const ALL_T_STAGES: TStage[] = useMemo(() => {
    if (projectStagesData?.data?.stages && projectStagesData.data.stages.length > 0) {
      return projectStagesData.data.stages.map((stage: any) => ({
        id: stage.stageCode,
        name: stage.stageName || stage.stageCode,
        nameZh: stage.stageNameZh || stage.stageName || stage.stageCode,
        role: (stage.responsibleRole || 'MECHANICAL') as UserRole,
        duration: stage.plannedHours || 40,
        status: stage.status as StageStatus,
        dbId: stage.id,
        plannedHours: stage.plannedHours,
        actualHours: stage.actualHours,
        startDate: stage.startDate,
        endDate: stage.endDate,
      }));
    }
    return DEFAULT_T_STAGES;
  }, [projectStagesData]);

  // Apply the role-based step filter
  const activeFilterConfig = STEP_FILTER_PRESETS[stepFilterPreset];
  const T_STAGES: TStage[] = useMemo(() => {
    if (stepFilterPreset === 'all' || activeFilterConfig.steps.length === 0) {
      return ALL_T_STAGES;
    }
    return ALL_T_STAGES.filter(stage => activeFilterConfig.steps.includes(stage.id));
  }, [ALL_T_STAGES, stepFilterPreset, activeFilterConfig]);

  // When filter changes, ensure activeStageId still points to a visible stage
  useEffect(() => {
    if (T_STAGES.length > 0 && !T_STAGES.find(s => s.id === activeStageId)) {
      setActiveStageId(T_STAGES[0].id);
    }
  }, [T_STAGES, activeStageId]);

  const activeStage = useMemo(() =>
    T_STAGES.find(s => s.id === activeStageId) || T_STAGES[0],
    [activeStageId, T_STAGES]
  );
  
  const aiData = useMemo(() => 
    AI_KNOWLEDGE_BASE[activeStageId] || AI_KNOWLEDGE_BASE.DEFAULT,
    [activeStageId]
  );
  
  const activeStageIndex = T_STAGES.findIndex(s => s.id === activeStageId);
  
  // 转换工时记录数据
  const timeRecords: TimeRecord[] = useMemo(() => {
    if (timeRecordsData?.data) {
      return timeRecordsData.data.map((record: any) => ({
        id: record.id,
        userId: record.userId,
        userName: record.userName || 'Unknown',
        projectId: record.projectId,
        stageCode: record.stageCode,
        recordDate: record.recordDate,
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration || 0,
        sourceType: record.sourceType,
        workType: record.workType || 'REGULAR',
        isVerified: record.isVerified || false,
        description: record.description,
      }));
    }
    return [];
  }, [timeRecordsData]);
  
  // 转换审批记录数据
  const approvals: ApprovalRecord[] = useMemo(() => {
    if (approvalsData?.data) {
      return approvalsData.data
        .filter((a: any) => a.stageCode === activeStageId)
        .map((approval: any) => ({
          id: approval.id,
          productionStageId: approval.productionStageId,
          projectId: approval.projectId,
          stageCode: approval.stageCode,
          requestedBy: approval.requestedBy,
          requestedByName: approval.requestedByName || 'Unknown',
          requestedAt: approval.requestedAt,
          approverId: approval.approverId,
          approverName: approval.approverName,
          approverRole: approval.approverRole,
          status: approval.status,
          approvalType: approval.approvalType,
          comments: approval.comments,
          rejectionReason: approval.rejectionReason,
          approvedAt: approval.approvedAt,
        }));
    }
    return [];
  }, [approvalsData, activeStageId]);
  
  // 转换审批规则数据
  const approvalRules: ApprovalRule[] = useMemo(() => {
    if (approvalRulesData?.data) {
      return approvalRulesData.data.map((rule: any) => ({
        id: rule.id,
        stageCode: rule.stageCode,
        approvalType: rule.approvalType,
        requiredRole: rule.requiredRole,
        autoApproveConditions: rule.autoApproveConditions,
        escalationHours: rule.escalationHours || 24,
      }));
    }
    return [];
  }, [approvalRulesData]);
  
  // 集成状态
  const integrationStatus = useMemo(() => {
    if (integrationStatusData?.data) {
      return integrationStatusData.data;
    }
    return [
      { serviceName: 'Copilot 365', isConnected: true, lastSyncAt: new Date().toISOString() },
      { serviceName: 'WeCom', isConnected: true, lastSyncAt: new Date().toISOString() },
      { serviceName: 'Manus AI', isConnected: true, lastSyncAt: new Date().toISOString() },
    ];
  }, [integrationStatusData]);

  // 获取角色显示名称
  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      PROJECT_MANAGER: '项目经理',
      MECHANICAL: '机械工程师',
      ELECTRICAL: '电气工程师',
      ASSEMBLY: '装配技师',
      QC: '质检员',
      SERVICE: '服务工程师',
      ADMIN: '管理员',
    };
    return labels[role];
  };
  
  // 检查用户是否有权限操作当前阶段
  const hasPermission = activeStage.role === CURRENT_USER_ROLE || CURRENT_USER_ROLE === 'ADMIN';
  
  // ==========================================================================
  // Event Handlers
  // ==========================================================================
  
  const handleTimeRecordCreate = async (record: Partial<TimeRecord>) => {
    if (!activeStage.dbId) return;
    
    await createTimeRecordMutation.mutateAsync({
      projectId: selectedProjectId,
      productionStageId: activeStage.dbId,
      stageCode: activeStageId,
      recordDate: record.recordDate || new Date().toISOString().split('T')[0],
      startTime: record.startTime || undefined,
      endTime: record.endTime || undefined,
      duration: record.duration,
      sourceType: record.sourceType || 'MANUAL',
      workType: record.workType || 'REGULAR',
      description: record.description,
    });
  };
  
  const handleApprovalCreate = async (data: Partial<ApprovalRecord>) => {
    if (!activeStage.dbId) return;
    
    await createApprovalMutation.mutateAsync({
      productionStageId: activeStage.dbId,
      projectId: selectedProjectId,
      stageCode: activeStageId,
      approvalType: data.approvalType || 'STAGE_COMPLETE',
      comments: data.comments || undefined,
    });
  };
  
  const handleApprovalProcess = async (id: number, status: 'APPROVED' | 'REJECTED', comments?: string) => {
    await processApprovalMutation.mutateAsync({
      approvalId: id,
      status,
      comments,
      rejectionReason: status === 'REJECTED' ? comments : undefined,
    });
  };
  
  const handleRefresh = () => {
    refetchStages();
    refetchTimeRecords();
    refetchApprovals();
  };

  // ==========================================================================
  // Loading State
  // ==========================================================================
  
  const isLoading = isLoadingDefinitions || isLoadingStages;

  return (
      <div className="flex flex-col h-full bg-[#0B1120] text-slate-200 font-sans p-6 overflow-hidden min-h-screen">
        
        {/* HEADER */}
        <PageHeader
          icon={Activity}
          title={language === 'zh' ? '项目执行指挥舱' : 'Project Execution Command'}
          description={`Project: GRT-2026-X1 · ${integrationStatus.map((s: any) => `${s.serviceName}: ${s.isConnected ? '✓' : '✗'}`).join(' · ')}`}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="border-slate-700 text-slate-400 hover:text-white"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span className="ml-1">{language === 'zh' ? '刷新' : 'Refresh'}</span>
              </Button>
              <div className="text-right">
                <div className="text-xs text-slate-400">{language === 'zh' ? '当前视角' : 'Current View'}</div>
                <div className="text-sm font-bold text-orange-500">{getRoleLabel(CURRENT_USER_ROLE)}</div>
              </div>
              <UserCircle size={32} className="text-slate-600" />
            </div>
          }
        />

        {/* ROLE-BASED STEP FILTER BAR */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-slate-500" />
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              {language === 'zh' ? '工序筛选' : 'Step Filter'}
            </span>
            <Select
              value={stepFilterPreset}
              onValueChange={(value: string) => setStepFilterPreset(value as StepFilterPreset)}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs bg-slate-900/80 border-slate-700 text-slate-300 focus:ring-orange-500/30">
                <SelectValue placeholder={language === 'zh' ? '选择筛选' : 'Select filter'} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-slate-300 text-xs focus:bg-slate-800">
                  {language === 'zh' ? '全部工序 (T1-T15)' : 'All Steps (T1-T15)'}
                </SelectItem>
                <SelectItem value="mechanical" className="text-slate-300 text-xs focus:bg-slate-800">
                  {language === 'zh' ? '机械工序 (T3-T5)' : 'Mechanical (T3-T5)'}
                </SelectItem>
                <SelectItem value="electrical" className="text-slate-300 text-xs focus:bg-slate-800">
                  {language === 'zh' ? '电气工序 (T6-T8)' : 'Electrical (T6-T8)'}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Active filter badge indicator */}
            {stepFilterPreset !== 'all' && (
              <Badge
                className={`${activeFilterConfig.badgeColor} text-[10px] px-2 py-0.5 font-medium flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setStepFilterPreset('all')}
              >
                <Filter size={10} />
                {language === 'zh' ? activeFilterConfig.labelZh : activeFilterConfig.label}
                <X size={10} className="ml-0.5" />
              </Badge>
            )}
          </div>

          <div className="text-xs text-slate-500">
            {language === 'zh'
              ? `显示 ${T_STAGES.length} / ${ALL_T_STAGES.length} 工序`
              : `Showing ${T_STAGES.length} / ${ALL_T_STAGES.length} steps`
            }
          </div>
        </div>

        {/* PIPELINE VISUALIZATION (filtered T-stages) */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex items-center px-2" style={{ minWidth: `${Math.max(T_STAGES.length * 80, 400)}px` }}>
            {T_STAGES.map((stage, idx) => {
              const isActive = stage.id === activeStageId;
              const isPast = idx < activeStageIndex;
              const isInProgress = stage.status === 'In_Progress';
              const isCompleted = stage.status === 'Completed';
              
              return (
                <div key={stage.id} className="flex-1 flex items-center relative">
                  {/* Connector Line */}
                  {idx !== T_STAGES.length - 1 && (
                    <div className={`absolute left-1/2 w-full h-[2px] top-4 -z-10 ${
                      isPast || isCompleted ? 'bg-orange-600' : 'bg-slate-800'
                    }`} />
                  )}
                  
                  <button 
                    onClick={() => setActiveStageId(stage.id)}
                    className={`flex flex-col items-center group w-full focus:outline-none transition-all duration-300 ${
                      isActive ? 'scale-110' : 'hover:opacity-80'
                    }`}
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 mb-2 transition-all
                      ${isActive 
                        ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]' 
                        : isCompleted
                          ? 'bg-[#0B1120] border-emerald-600 text-emerald-400'
                          : isInProgress
                            ? 'bg-[#0B1120] border-orange-600 text-orange-400'
                            : 'bg-[#0B1120] border-slate-700 text-slate-600'
                      }
                    `}>
                      {isCompleted && !isActive ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        stage.id
                      )}
                    </div>
                    <span className={`text-[10px] font-medium truncate max-w-[80px] ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}>
                      {language === 'zh' ? stage.nameZh : stage.name}
                    </span>
                    <StatusBadge status={stage.status} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-12 gap-6 flex-1">
          
          {/* LEFT: Stage Execution Panel with Tabs */}
          <div className="col-span-8 bg-[#111827] rounded-xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {activeStage.id} - {language === 'zh' ? activeStage.nameZh : activeStage.name}
                </h2>
                <div className="flex gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <UserCircle size={14}/> 
                    {language === 'zh' ? '责任人' : 'Owner'}: {getRoleLabel(activeStage.role)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14}/> 
                    {language === 'zh' ? '计划工时' : 'Planned'}: {activeStage.plannedHours || activeStage.duration}h
                  </span>
                  {activeStage.actualHours !== undefined && (
                    <span className="flex items-center gap-1">
                      <Timer size={14}/> 
                      {language === 'zh' ? '实际工时' : 'Actual'}: {activeStage.actualHours}h
                    </span>
                  )}
                </div>
              </div>
              
              {/* Authorization Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                hasPermission 
                  ? 'bg-emerald-900/20 border-emerald-600/30 text-emerald-400'
                  : 'bg-slate-900/50 border-slate-700 text-slate-500'
              }`}>
                {hasPermission ? (
                  <>
                    <ShieldAlert size={16} />
                    <span className="text-xs font-medium">
                      {language === 'zh' ? '已授权操作' : 'Authorized'}
                    </span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span className="text-xs font-medium">
                      {language === 'zh' ? '仅查看权限' : 'View Only'}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Tabs for different panels */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border border-slate-800">
                <TabsTrigger value="details" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-400">
                  <FileText size={14} className="mr-1" />
                  {language === 'zh' ? '阶段详情' : 'Details'}
                </TabsTrigger>
                <TabsTrigger value="timeTracking" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
                  <Timer size={14} className="mr-1" />
                  {language === 'zh' ? '工时采集' : 'Time Tracking'}
                </TabsTrigger>
                <TabsTrigger value="approval" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
                  <ClipboardCheck size={14} className="mr-1" />
                  {language === 'zh' ? '阶段审批' : 'Approval'}
                </TabsTrigger>
              </TabsList>
              
              {/* Details Tab */}
              <TabsContent value="details" className="mt-4">
                <div className="space-y-4">
                  {/* Action Buttons */}
                  <div className="flex gap-3 mb-6">
                    <Button 
                      className={`flex-1 ${hasPermission 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      }`}
                      disabled={!hasPermission}
                    >
                      <Play size={14} className="mr-2" /> 
                      {language === 'zh' ? '开始阶段' : 'Start Stage'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`flex-1 ${hasPermission 
                        ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-600/10' 
                        : 'border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                      }`}
                      disabled={!hasPermission}
                    >
                      <CheckCircle2 size={14} className="mr-2" /> 
                      {language === 'zh' ? '完成阶段' : 'Complete Stage'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`${hasPermission 
                        ? 'border-red-600 text-red-400 hover:bg-red-600/10' 
                        : 'border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                      }`}
                      disabled={!hasPermission}
                    >
                      <AlertTriangle size={14} className="mr-2" /> 
                      {language === 'zh' ? '报告异常' : 'Report Issue'}
                    </Button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{language === 'zh' ? '阶段进度' : 'Stage Progress'}</span>
                      <span>{activeStage.status === 'Completed' ? '100%' : activeStage.status === 'In_Progress' ? '65%' : '0%'}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          activeStage.status === 'Completed' 
                            ? 'bg-emerald-500 w-full' 
                            : activeStage.status === 'In_Progress'
                              ? 'bg-orange-500 w-[65%]'
                              : 'bg-slate-700 w-0'
                        }`}
                      />
                    </div>
                  </div>
                  
                  {/* Stage Info Cards */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                      <div className="text-xs text-slate-500 mb-1">{language === 'zh' ? '开始日期' : 'Start Date'}</div>
                      <div className="text-sm text-white">{activeStage.startDate || '-'}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                      <div className="text-xs text-slate-500 mb-1">{language === 'zh' ? '预计完成' : 'Expected End'}</div>
                      <div className="text-sm text-white">{activeStage.endDate || '-'}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Time Tracking Tab */}
              <TabsContent value="timeTracking" className="mt-4">
                <TimeTrackingPanel
                  projectId={selectedProjectId}
                  stageCode={activeStageId}
                  stageName={language === 'zh' ? activeStage.nameZh : activeStage.name}
                  currentUserId={CURRENT_USER_ID}
                  currentUserName={CURRENT_USER_NAME}
                  records={timeRecords}
                  onRecordCreate={handleTimeRecordCreate}
                  isLoading={isLoadingTimeRecords || createTimeRecordMutation.isPending}
                />
              </TabsContent>
              
              {/* Approval Tab */}
              <TabsContent value="approval" className="mt-4">
                <StageApprovalPanel
                  projectId={selectedProjectId}
                  stageId={activeStage.dbId || 0}
                  stageCode={activeStageId}
                  stageName={language === 'zh' ? activeStage.nameZh : activeStage.name}
                  currentUserId={CURRENT_USER_ID}
                  currentUserName={CURRENT_USER_NAME}
                  currentUserRole={CURRENT_USER_ROLE}
                  stageStatus={activeStage.status}
                  approvals={approvals}
                  rules={approvalRules}
                  onApprovalCreate={handleApprovalCreate}
                  onApprovalProcess={handleApprovalProcess}
                  isLoading={isLoadingApprovals || createApprovalMutation.isPending || processApprovalMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: AI Recommendation Engine */}
          <div className="col-span-4 space-y-4">
            
            {/* AI Insight Card */}
            <div className="bg-gradient-to-b from-[#1e1b4b] to-[#111827] rounded-xl p-1 border border-indigo-500/30">
              <div className="bg-[#0B1120]/90 p-5 rounded-lg h-full">
                <div className="flex items-center gap-2 mb-4 text-indigo-400">
                  <Zap className="animate-pulse" size={18} />
                  <h3 className="font-bold text-sm">Manus AI Insights</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Context from M2 */}
                  <div className="p-3 bg-indigo-900/20 rounded border border-indigo-500/20">
                    <div className="text-[10px] text-indigo-300 uppercase mb-1 font-bold">
                      {language === 'zh' ? '来自 M2 启动会' : 'From M2 Kick-off'}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiData.sop}
                    </p>
                  </div>

                  {/* Risk Warning */}
                  <div className="p-3 bg-red-900/10 rounded border border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={12} className="text-red-500" />
                      <span className="text-[10px] text-red-400 uppercase font-bold">
                        {language === 'zh' ? '风险检测' : 'Risk Detected'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiData.risk}
                    </p>
                  </div>

                  {/* Related Files */}
                  <div className="p-3 bg-slate-900/50 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase mb-2 font-bold">
                      {language === 'zh' ? '相关文档' : 'Related Documents'}
                    </div>
                    <div className="space-y-1">
                      {aiData.files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                          <FileText size={12} />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800">
                  <button className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs rounded border border-indigo-600/30 flex items-center justify-center gap-2 transition-colors">
                    <FileText size={12} /> 
                    {language === 'zh' 
                      ? `生成${activeStage.id}日报并发送至WeCom`
                      : `Generate ${activeStage.id} Report & Send to WeCom`
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Agenda / Outlook Integration */}
            <div className="bg-[#111827] rounded-xl border border-slate-800 p-5">
              <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                <Calendar size={14}/> 
                {language === 'zh' ? '相关日程 (Outlook)' : 'Related Events (Outlook)'}
              </h3>
              <div className="space-y-2">
                <div className="text-xs p-2 border-l-2 border-orange-500 bg-slate-900/50 rounded-r">
                  <div className="text-white">
                    14:00 - {language === 'zh' ? `${activeStage.nameZh} 评审会` : `${activeStage.name} Review Meeting`}
                  </div>
                  <div className="text-slate-500">Meeting Room 302</div>
                </div>
                <div className="text-xs p-2 border-l-2 border-blue-500 bg-slate-900/50 rounded-r">
                  <div className="text-white">
                    16:30 - {language === 'zh' ? '项目周例会' : 'Weekly Project Meeting'}
                  </div>
                  <div className="text-slate-500">Teams Online</div>
                </div>
              </div>
            </div>

            {/* Integration Status */}
            <div className="bg-[#111827] rounded-xl border border-slate-800 p-5">
              <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                <Settings size={14}/> 
                {language === 'zh' ? '集成状态' : 'Integration Status'}
              </h3>
              <div className="space-y-3">
                {integrationStatus.map((status: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <div className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {status.serviceName}
                    </div>
                    <span className={`text-[10px] ${status.isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                      {status.isConnected 
                        ? (language === 'zh' ? '已同步' : 'Synced')
                        : (language === 'zh' ? '未连接' : 'Disconnected')
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
  );
}
