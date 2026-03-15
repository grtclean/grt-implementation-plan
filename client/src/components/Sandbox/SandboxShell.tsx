/**
 * SandboxShell — Persistent three-column dark layout for all sandbox routes.
 *
 * Left  (20%): SOP Stepper — context-aware per-sandbox steps
 * Center(60%): Route outlet — lazy-loaded sandbox page component
 * Right (20%): Agent Copilot — AI agent control panel
 *
 * The center renders based on the current URL path — this is the "route outlet"
 * that was previously missing, causing empty sandbox pages.
 */
import React, { useState, useCallback, useMemo, Suspense, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Calendar,
  Wallet,
  Award,
  Users,
  FolderKanban,
  FileSpreadsheet,
  Cog,
  Zap,
  Contact,
  ClipboardCheck,
  Factory,
  ClipboardList,
  BarChart3,
  CheckCircle2,
  FileText,
  Search,
  Settings,
  Shield,
  Target,
  TrendingUp,
  UserCheck,
  Wrench,
  Activity,
  ArrowLeft,
  Bot,
  Loader2,
  Heart,
  Sparkles,
  Gift,
  Truck,
  Brain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SandboxContext, type SandboxStep } from "./useSandboxContext";
import SopStepper from "./SopStepper";
import AgentCopilotPanel from "./AgentCopilotPanel";
import SandboxStatusBar from "./SandboxStatusBar";
import ShortcutOverlay from "./ShortcutOverlay";
import { useSandboxShortcuts } from "./useSandboxShortcuts";

// ── Placeholder step component ──────────────────────────
function StepPlaceholder() {
  const [location] = useLocation();
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="text-center">
        <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Step content — coming soon</p>
        <p className="text-xs mt-1 opacity-50">{location}</p>
      </div>
    </div>
  );
}

// ── SOP step definitions per sandbox ────────────────────
interface SandboxConfig {
  title: string;
  titleEn: string;
  agentId: string;
  steps: SandboxStep[];
}

function makeSteps(
  defs: Array<{ key: string; label: string; labelEn?: string; icon: LucideIcon }>
): SandboxStep[] {
  return defs.map((d) => ({ ...d, component: StepPlaceholder }));
}

const SANDBOX_CONFIGS: Record<string, SandboxConfig> = {
  "annual-planning": {
    title: "年度规划与预算沙盘",
    titleEn: "Annual Planning & Budget",
    agentId: "agent-annual-planner",
    steps: makeSteps([
      { key: "goal-setting", label: "战略目标设定", labelEn: "Goal Setting", icon: Target },
      { key: "budget-draft", label: "预算编制", labelEn: "Budget Draft", icon: FileSpreadsheet },
      { key: "headcount", label: "编制规划", labelEn: "Headcount Planning", icon: Users },
      { key: "review", label: "审批评审", labelEn: "Review & Approve", icon: CheckCircle2 },
      { key: "publish", label: "发布执行", labelEn: "Publish & Execute", icon: Activity },
    ]),
  },
  "payroll-attendance": {
    title: "薪酬与打卡异常沙盘",
    titleEn: "Payroll & Attendance",
    agentId: "agent-payroll-calc",
    steps: makeSteps([
      { key: "cycle-select", label: "周期选择", labelEn: "Cycle Selection", icon: Calendar },
      { key: "data-check", label: "数据完整性", labelEn: "Data Completeness", icon: Search },
      { key: "perf-link", label: "绩效关联", labelEn: "Performance Link", icon: Award },
      { key: "trial-calc", label: "试算对比", labelEn: "Trial Calculation", icon: BarChart3 },
      { key: "anomaly", label: "异常检测", labelEn: "Anomaly Detection", icon: Shield },
      { key: "approval", label: "审批锁定", labelEn: "Approval & Lock", icon: CheckCircle2 },
    ]),
  },
  "performance-points": {
    title: "绩效与积分奖惩沙盘",
    titleEn: "Performance & Points",
    agentId: "agent-perf-coach",
    steps: makeSteps([
      { key: "kpi-input", label: "KPI录入", labelEn: "KPI Input", icon: Target },
      { key: "scoring", label: "评分校准", labelEn: "Scoring Calibration", icon: BarChart3 },
      { key: "points", label: "积分计算", labelEn: "Points Calculation", icon: Award },
      { key: "evidence", label: "证据收集", labelEn: "Evidence Collection", icon: FileText },
      { key: "calibration", label: "校准会议", labelEn: "Calibration Meeting", icon: Users },
      { key: "finalize", label: "结果确认", labelEn: "Finalize Results", icon: CheckCircle2 },
    ]),
  },
  "hr-lifecycle": {
    title: "HR员工全生命周期沙盘",
    titleEn: "HR Employee Lifecycle",
    agentId: "agent-hr-lifecycle",
    steps: makeSteps([
      { key: "recruit", label: "招聘入职", labelEn: "Recruitment & Onboarding", icon: UserCheck },
      { key: "probation", label: "试用管理", labelEn: "Probation Management", icon: ClipboardList },
      { key: "development", label: "培养发展", labelEn: "Development", icon: TrendingUp },
      { key: "transfer", label: "异动调配", labelEn: "Transfer & Rotation", icon: Users },
      { key: "offboarding", label: "离职管理", labelEn: "Offboarding", icon: FileText },
    ]),
  },
  "project-lifecycle": {
    title: "项目M0-M12全生命周期沙盘",
    titleEn: "Project M0-M12 Lifecycle",
    agentId: "agent-project-pm",
    steps: makeSteps([
      { key: "m0-initiate", label: "M0 项目立项", labelEn: "M0 Initiation", icon: FolderKanban },
      { key: "m1-plan", label: "M1 计划评审", labelEn: "M1 Planning Review", icon: ClipboardList },
      { key: "m3-design", label: "M3 设计完成", labelEn: "M3 Design Complete", icon: Cog },
      { key: "m6-proto", label: "M6 样机验证", labelEn: "M6 Prototype", icon: Wrench },
      { key: "m9-pilot", label: "M9 小批试产", labelEn: "M9 Pilot Run", icon: Factory },
      { key: "m12-sop", label: "M12 量产SOP", labelEn: "M12 Mass Production", icon: CheckCircle2 },
    ]),
  },
  "quoting-bom": {
    title: "智能报价与BOM梳理沙盘",
    titleEn: "Quoting & BOM",
    agentId: "agent-quoting",
    steps: makeSteps([
      { key: "customer-req", label: "客户需求", labelEn: "Customer Requirements", icon: Contact },
      { key: "bom-build", label: "BOM搭建", labelEn: "BOM Building", icon: FileSpreadsheet },
      { key: "cost-calc", label: "成本核算", labelEn: "Cost Calculation", icon: BarChart3 },
      { key: "quote-gen", label: "报价生成", labelEn: "Quote Generation", icon: FileText },
      { key: "quote-review", label: "报价审批", labelEn: "Quote Review", icon: CheckCircle2 },
    ]),
  },
  "mechanical-standards": {
    title: "机械配置标准治理沙盘",
    titleEn: "Mechanical Standards",
    agentId: "agent-mech-validator",
    steps: makeSteps([
      { key: "standard-lib", label: "标准库管理", labelEn: "Standard Library", icon: FileText },
      { key: "config-check", label: "配置校验", labelEn: "Config Validation", icon: Shield },
      { key: "conflict-detect", label: "冲突检测", labelEn: "Conflict Detection", icon: Search },
      { key: "bom-verify", label: "BOM验证", labelEn: "BOM Verification", icon: CheckCircle2 },
    ]),
  },
  "electrical-standards": {
    title: "电气规范治理沙盘",
    titleEn: "Electrical Standards",
    agentId: "agent-elec-validator",
    steps: makeSteps([
      { key: "spec-lib", label: "规范库管理", labelEn: "Spec Library", icon: FileText },
      { key: "io-check", label: "IO点检查", labelEn: "IO Check", icon: Zap },
      { key: "plc-verify", label: "PLC验证", labelEn: "PLC Verification", icon: Settings },
      { key: "safety-check", label: "安全合规", labelEn: "Safety Compliance", icon: Shield },
    ]),
  },
  "customer-config": {
    title: "客户配置与档案库沙盘",
    titleEn: "Customer Config & Archives",
    agentId: "agent-customer-insight",
    steps: makeSteps([
      { key: "profile", label: "客户档案", labelEn: "Customer Profile", icon: Contact },
      { key: "config-history", label: "配置历史", labelEn: "Config History", icon: ClipboardList },
      { key: "preference", label: "偏好分析", labelEn: "Preference Analysis", icon: BarChart3 },
      { key: "recommendation", label: "推荐配置", labelEn: "Recommendation", icon: Target },
    ]),
  },
  "acceptance-tracking": {
    title: "验收追踪与满意度沙盘",
    titleEn: "Acceptance Tracking",
    agentId: "agent-acceptance",
    steps: makeSteps([
      { key: "trust-crystal", label: "互信结晶", labelEn: "Trust & Velocity", icon: Sparkles },
      { key: "over-delivery", label: "超预期奉献实录", labelEn: "Value Over-Delivery", icon: Heart },
      { key: "lifetime-passport", label: "终生保障启航", labelEn: "Lifetime Guardianship", icon: Shield },
      { key: "evidence-vault", label: "物证资料库", labelEn: "Evidence Vault", icon: FileText },
      { key: "vip-gifts", label: "VIP专属赠礼", labelEn: "VIP Gifts", icon: Gift },
    ]),
  },
  "site-delivery": {
    title: "设备现场交付与联调共创沙盘",
    titleEn: "Site Delivery & Joint Commissioning",
    agentId: "agent-site-delivery",
    steps: makeSteps([
      { key: "alliance", label: "联合指挥部结盟", labelEn: "Alliance Formation", icon: Users },
      { key: "pre-site", label: "进场前置条件", labelEn: "Pre-Site Conditions", icon: ClipboardCheck },
      { key: "physical-setup", label: "物理就位与硬装", labelEn: "Physical Setup", icon: Truck },
      { key: "commissioning", label: "带料联调", labelEn: "Joint Commissioning", icon: Activity },
      { key: "capability-arm", label: "能力武装与交钥匙", labelEn: "Capability & Handover", icon: Award },
      { key: "final-acceptance", label: "M12终局验收", labelEn: "Final Acceptance", icon: CheckCircle2 },
    ]),
  },
  "production-scheduling": {
    title: "生产智慧排产与任务报工沙盘",
    titleEn: "Production Scheduling & Labor",
    agentId: "agent-scheduling",
    steps: makeSteps([
      { key: "bom-hours", label: "BOM工时分解", labelEn: "BOM Work Hours", icon: FileSpreadsheet },
      { key: "resource-plan", label: "资源排程", labelEn: "Resource Scheduling", icon: Calendar },
      { key: "labor-report", label: "任务报工", labelEn: "Labor Reporting", icon: ClipboardList },
      { key: "category-stats", label: "分类工时统计", labelEn: "Category Statistics", icon: BarChart3 },
      { key: "cost-rollup", label: "项目成本核算", labelEn: "Cost Rollup", icon: Wallet },
    ]),
  },
  "ai-process-twin": {
    title: "AI 工艺编排与孪生沙盘",
    titleEn: "AI Process Orchestration & Digital Twin",
    agentId: "agent-process-twin",
    steps: makeSteps([
      { key: "fmea-mine", label: "FMEA 历史雷区扫描", labelEn: "FMEA Risk Mining", icon: Shield },
      { key: "sop-slice", label: "Agent 一键 SOP 切片", labelEn: "SOP Auto-Slicing", icon: Brain },
      { key: "bom-bind", label: "工序 BOM 绑定", labelEn: "Process BOM Binding", icon: FileSpreadsheet },
      { key: "twin-preview", label: "数字孪生预演", labelEn: "Digital Twin Preview", icon: Activity },
      { key: "tv-deploy", label: "车间大屏推送部署", labelEn: "TV Kiosk Deployment", icon: Target },
      { key: "feedback-loop", label: "现场反馈闭环", labelEn: "Field Feedback Loop", icon: TrendingUp },
    ]),
  },
};

// ── Lazy-loaded sandbox page components ─────────────────
const SandboxOverview = React.lazy(() => import("./SandboxOverview"));

/** Map sandbox ID → lazy page component for center column.
 *  Every sandbox now wired to a real page with real backend router. */
const SANDBOX_PAGES: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  "annual-planning":       React.lazy(() => import("@/pages/AnnualPlanningSystem")),
  "payroll-attendance":    React.lazy(() => import("@/pages/PayrollSandbox")),
  "performance-points":   React.lazy(() => import("@/pages/EmployeePointsCenter")),
  "hr-lifecycle":          React.lazy(() => import("@/pages/HRLifecycle")),
  "project-lifecycle":     React.lazy(() => import("@/pages/ProjectManagement")),
  "quoting-bom":           React.lazy(() => import("@/pages/QuotationCreate")),
  "mechanical-standards":  React.lazy(() => import("@/pages/MechanicalConfigWorkbench")),
  "electrical-standards":  React.lazy(() => import("@/pages/ElectricalStandardsWorkbench")),
  "customer-config":       React.lazy(() => import("@/pages/CustomerConfigSandbox")),
  "acceptance-tracking":   React.lazy(() => import("@/pages/AcceptanceSandbox")),
  "site-delivery":         React.lazy(() => import("@/pages/SiteDeliverySandbox")),
  "production-scheduling": React.lazy(() => import("@/pages/SmartProductionScheduling")),
  "ai-process-twin":       React.lazy(() => import("@/pages/AiProcessTwinSandbox")),
};

// ── Loading spinner ─────────────────────────────────────
function CenterLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-500/60" />
    </div>
  );
}

// ── Default placeholder for sandboxes without a page yet ─
function SandboxPlaceholder({ sandboxId, config }: { sandboxId: string; config: SandboxConfig }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
          <Bot className="h-8 w-8 text-cyan-500/60" />
        </div>
        <h2 className="text-lg font-semibold text-gray-200 mb-1">{config.title}</h2>
        <p className="text-sm text-gray-500 mb-4">{config.titleEn}</p>
        <p className="text-xs text-gray-600">
          Sandbox workspace under construction. Use the SOP steps on the left to navigate.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          <Activity className="h-3 w-3" />
          Agent: {config.agentId}
        </div>
      </div>
    </div>
  );
}

// ── Shortcut Overlay Wrapper (needs SandboxContext) ────
function ShortcutOverlayWrapper({
  open,
  onClose,
  onShowHelp,
  sandboxTitle,
}: {
  open: boolean;
  onClose: () => void;
  onShowHelp: () => void;
  sandboxTitle: string;
}) {
  const { commonShortcuts, sandboxShortcuts } = useSandboxShortcuts({
    onShowHelp,
  });
  return (
    <ShortcutOverlay
      open={open}
      onClose={onClose}
      commonShortcuts={commonShortcuts}
      sandboxShortcuts={sandboxShortcuts}
      sandboxTitle={sandboxTitle}
    />
  );
}

// ── Main Shell ──────────────────────────────────────────
export default function SandboxShell() {
  const [location, navigate] = useLocation();

  // Extract sandbox ID: /sandbox/foo-bar → "foo-bar", /sandbox → ""
  const sandboxId = useMemo(() => {
    const match = location.match(/^\/sandbox\/([a-z0-9-]+)/);
    return match ? match[1] : "";
  }, [location]);

  // If at /sandbox root, show the overview card grid (no three-column shell)
  if (!sandboxId) {
    return (
      <Suspense fallback={<CenterLoading />}>
        <SandboxOverview />
      </Suspense>
    );
  }

  const config = SANDBOX_CONFIGS[sandboxId];
  if (!config) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Unknown sandbox: {sandboxId}</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/sandbox")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sandbox Center
          </Button>
        </div>
      </div>
    );
  }

  // Get the page component or placeholder
  const PageComponent = SANDBOX_PAGES[sandboxId];

  return (
    <SandboxShellInner
      sandboxId={sandboxId}
      config={config}
      PageComponent={PageComponent}
      onBack={() => navigate("/sandbox")}
    />
  );
}

// ── Inner component (for stable hook order) ─────────────
function SandboxShellInner({
  sandboxId,
  config,
  PageComponent,
  onBack,
}: {
  sandboxId: string;
  config: SandboxConfig;
  PageComponent?: React.LazyExoticComponent<React.ComponentType>;
  onBack: () => void;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => new Set());
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);

  const markStepCompleted = useCallback((key: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      sandboxId,
      currentStepIndex,
      setCurrentStepIndex,
      steps: config.steps,
      completedSteps,
      markStepCompleted,
    }),
    [sandboxId, currentStepIndex, config.steps, completedSteps, markStepCompleted]
  );

  // Escape key closes overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && shortcutOverlayOpen) {
        setShortcutOverlayOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcutOverlayOpen]);

  return (
    <SandboxContext.Provider value={contextValue}>
      <ShortcutOverlayWrapper
        open={shortcutOverlayOpen}
        onClose={() => setShortcutOverlayOpen(false)}
        onShowHelp={() => setShortcutOverlayOpen((v) => !v)}
        sandboxTitle={config.title}
      />
      <div className="flex flex-col h-[calc(100vh-48px)] w-full bg-[#0a0f18] -m-3 sm:-m-6 lg:-m-8">
        {/* Shell header */}
        <div className="flex items-center h-10 px-3 border-b border-gray-800 bg-[#0d1321] shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-gray-400 hover:text-gray-200 hover:bg-gray-800 mr-2"
            onClick={onBack}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Sandbox</span>
          </Button>
          <div className="h-4 w-px bg-gray-700 mx-2" />
          <h1 className="text-sm font-semibold text-gray-200 truncate">{config.title}</h1>
          <span className="text-xs text-gray-500 ml-2 hidden sm:inline">{config.titleEn}</span>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setLeftOpen((v) => !v)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                leftOpen ? "text-cyan-400 bg-cyan-500/10" : "text-gray-500 hover:text-gray-300"
              )}
            >
              SOP
            </button>
            <button
              onClick={() => setRightOpen((v) => !v)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                rightOpen ? "text-cyan-400 bg-cyan-500/10" : "text-gray-500 hover:text-gray-300"
              )}
            >
              Agent
            </button>
          </div>
        </div>

        {/* Three-column body */}
        <div className="flex flex-1 min-h-0">
          {/* Left (20%): SOP Stepper */}
          {leftOpen && (
            <aside className="w-1/5 min-w-[200px] max-w-[280px] border-r border-gray-800 bg-[#0d1321] overflow-y-auto shrink-0 dark-sop-stepper">
              <SopStepper />
            </aside>
          )}

          {/* Center (60%): Route Outlet — the core workspace */}
          <main className="flex-1 relative bg-[#080c14] overflow-y-auto">
            <Suspense fallback={<CenterLoading />}>
              {PageComponent ? (
                <PageComponent />
              ) : (
                <SandboxPlaceholder sandboxId={sandboxId} config={config} />
              )}
            </Suspense>
          </main>

          {/* Right (20%): Agent Copilot Control Tower */}
          {rightOpen && (
            <aside className="w-1/5 min-w-[200px] max-w-[320px] border-l border-gray-800 bg-[#0d1321] overflow-hidden shrink-0 dark-agent-panel">
              <AgentCopilotPanel agentId={config.agentId} sandboxId={sandboxId} />
            </aside>
          )}
        </div>

        {/* Bottom status bar */}
        <SandboxStatusBar />
      </div>
    </SandboxContext.Provider>
  );
}
