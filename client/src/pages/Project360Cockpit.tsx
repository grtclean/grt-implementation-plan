/**
 * Project 360 Cockpit — CEO-level single-page project dashboard
 *
 * M365 Light Theme — enterprise dashboard with:
 *   - KPI cards row (Financial Health, Schedule Variance, Overall Status)
 *   - Split view: Concurrent Debugging Status + AI Smart Suggestions
 *   - ECO Approval button (RBAC-gated, locked for non-managers)
 *   - T1-T15 production pipeline with engineer lock indicators
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import {
  LayoutDashboard,
  DollarSign,
  Clock,
  Activity,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Cpu,
  Wind,
  Droplets,
  Zap,
  ArrowRight,
  Bot,
  ShieldCheck,
  FileCheck2,
  TrendingUp,
  TrendingDown,
  Timer,
  Users,
  Wrench,
} from "lucide-react";

// ─── SAIC New Energy Cleaning Line — Demo Project Data ───────────────
// TODO: Replace DEMO_PROJECT with tRPC query: trpc.project.getById.useQuery(selectedProjectId)

const DEMO_PROJECT = {
  id: 1,
  name: "SAIC New Energy Cleaning Line",
  nameCn: "上汽新能源清洗线",
  customer: "SAIC Motor (上汽集团)",
  contractValue: 4200000,
  currentPhase: "M6",
  lifecycle: "M0-M12",
  startDate: "2025-09-15",
  targetDate: "2026-06-30",
  projectManager: "Yang Yong (杨勇)",
};

const KPI = {
  budget: 4200000,
  actualCost: 2310000,
  budgetVariance: -5.2, // % under budget (negative = good)
  scheduleVarianceDays: 3, // days behind
  overallStatus: "yellow" as "green" | "yellow" | "red",
  completionPercent: 52,
  milestonesDone: 6,
  milestonesTotal: 12,
};

// ─── Concurrent Debugging Status (双轨联调状态) ─────────────────────

interface SubSystem {
  id: string;
  name: string;
  nameCn: string;
  icon: typeof Cpu;
  status: "locked" | "idle" | "testing" | "passed";
  lockedBy?: string;
  lockedSince?: string;
  testProgress?: number;
}

const SUB_SYSTEMS: SubSystem[] = [
  { id: "ultrasonic", name: "Ultrasonic Module", nameCn: "超声波模块", icon: Activity, status: "locked", lockedBy: "Wu Weicheng (吴卫成)", lockedSince: "14:30", testProgress: 68 }, // demo
  { id: "drying", name: "Hot-Air Drying Unit", nameCn: "热风干燥单元", icon: Wind, status: "locked", lockedBy: "Dai Xiaoyan (戴晓燕)", lockedSince: "13:15", testProgress: 45 }, // demo
  { id: "conveyor", name: "Conveyor System", nameCn: "输送系统", icon: ArrowRight, status: "testing", testProgress: 82 },
  { id: "spray", name: "High-Pressure Spray", nameCn: "高压喷淋", icon: Droplets, status: "passed", testProgress: 100 },
  { id: "plc", name: "PLC Control Unit", nameCn: "PLC控制单元", icon: Cpu, status: "idle" },
  { id: "electrical", name: "Electrical Cabinet", nameCn: "电气控制柜", icon: Zap, status: "testing", testProgress: 55 },
];

// ─── AI Smart Suggestions (AI 智能建议) ──────────────────────────────

interface AiSuggestion {
  id: string;
  type: "warning" | "info" | "success" | "critical";
  title: string;
  detail: string;
  timestamp: string;
  source: string;
}

const AI_SUGGESTIONS: AiSuggestion[] = [
  {
    id: "s1", type: "warning",
    title: "Pump delivery delayed — adjust FAT schedule",
    detail: "Supplier #SP-0042 (Grundfos) reports 5-day delay on centrifugal pump shipment. Recommend rescheduling T12_FAT from Mar 15 → Mar 22 to avoid idle assembly crew cost (est. ¥18,000/day).",
    timestamp: "10 min ago", source: "Supply Chain AI",
  },
  {
    id: "s2", type: "critical",
    title: "Ultrasonic transducer RPN exceeds threshold",
    detail: "FMEA analysis detected RPN = 224 on transducer cavitation failure mode. Severity=8, Occurrence=4, Detection=7. Immediate CAPA required per IATF 16949 §10.2.3.",
    timestamp: "25 min ago", source: "Quality AI Engine",
  },
  {
    id: "s3", type: "info",
    title: "Wu Weicheng & Dai Xiaoyan running concurrent tests",
    detail: "Two engineers are currently holding locks on sub-systems in the same zone. Consider staggering test windows to avoid electromagnetic interference between ultrasonic and drying modules.",
    timestamp: "1 hr ago", source: "IoT Fleet Monitor",
  },
  {
    id: "s4", type: "success",
    title: "High-pressure spray module passed all 12 test cases",
    detail: "Spray coverage uniformity: 97.3% (target: 95%). Flow rate stability: ±1.2% (target: ±3%). Ready for integration testing.",
    timestamp: "2 hrs ago", source: "Test Automation",
  },
  {
    id: "s5", type: "warning",
    title: "Budget burn rate trending high for M6",
    detail: "Current monthly burn: ¥420K vs planned ¥380K. If trend continues, project will exceed budget by ¥126K at M12. Recommend reviewing T7 plumbing subcontractor costs.",
    timestamp: "3 hrs ago", source: "Finance AI",
  },
];

// ─── T-Pipeline Stages ───────────────────────────────────────────────

const T_STAGES = [
  { code: "T1", name: "Design Freeze", status: "done" },
  { code: "T2", name: "BOM Release", status: "done" },
  { code: "T3", name: "Procurement", status: "done" },
  { code: "T4", name: "Fabrication", status: "done" },
  { code: "T5", name: "Sub-Assembly", status: "done" },
  { code: "T6", name: "Main Assembly", status: "active" },
  { code: "T7", name: "Plumbing", status: "active" },
  { code: "T8", name: "Electrical", status: "pending" },
  { code: "T9", name: "PLC Programming", status: "pending" },
  { code: "T10", name: "Integration Test", status: "pending" },
  { code: "T11", name: "Cleaning Validation", status: "pending" },
  { code: "T12", name: "FAT (Internal)", status: "pending" },
  { code: "T13", name: "Packaging", status: "pending" },
  { code: "T14", name: "Shipping", status: "pending" },
  { code: "T15", name: "SAT (On-Site)", status: "pending" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `¥${(n / 1000).toFixed(1)}K`;
  return `¥${n}`;
}

const suggestionStyles = {
  warning:  { bg: "bg-amber-50", border: "border-l-amber-400", icon: AlertTriangle, iconColor: "text-amber-600" },
  critical: { bg: "bg-red-50",   border: "border-l-red-500",   icon: XCircle,       iconColor: "text-red-600" },
  info:     { bg: "bg-blue-50",  border: "border-l-blue-400",  icon: Lightbulb,     iconColor: "text-blue-600" },
  success:  { bg: "bg-green-50", border: "border-l-green-400", icon: CheckCircle2,  iconColor: "text-green-600" },
};

const lockStatusStyles = {
  locked:  { label: "Locked",  color: "bg-red-100 text-red-700", icon: Lock },
  idle:    { label: "Idle",    color: "bg-gray-100 text-gray-600", icon: Wrench },
  testing: { label: "Testing", color: "bg-blue-100 text-blue-700", icon: Activity },
  passed:  { label: "Passed",  color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

// ─── Main Component ──────────────────────────────────────────────────

export default function Project360Cockpit() {
  const { currentUserRole } = useUserProfile();
  const roleLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const canApproveECO = roleLevel >= 3; // dept_manager+

  const [dataSource] = useState<'demo' | 'live'>('demo');
  // TODO: when tRPC is connected, use: const { data: project } = trpc.project.getById.useQuery(selectedProjectId);
  const PROJECT = DEMO_PROJECT;

  const [ecoDialogOpen, setEcoDialogOpen] = useState(false);
  const [ecoSubmitted, setEcoSubmitted] = useState(false);

  const handleEcoApproval = () => {
    if (!canApproveECO) {
      setEcoDialogOpen(true);
      return;
    }
    setEcoSubmitted(true);
    setTimeout(() => setEcoSubmitted(false), 3000);
  };

  const budgetUsedPercent = Math.round((KPI.actualCost / KPI.budget) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Data Source Indicator ─── */}
      {dataSource === 'demo' && (
        <div className="mx-4 sm:mx-6 mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          数据来源: 演示数据 — 连接tRPC后将显示实时项目数据
        </div>
      )}
      {/* ─── Page Header ─── */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-600 rounded-lg shrink-0">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">项目 360 驾驶舱</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Project 360 Cockpit — M0-M12 Lifecycle</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 px-2 sm:px-3 py-1 text-xs">
              <Activity className="w-3.5 h-3.5 mr-1" />
              Live
            </Badge>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-700">{PROJECT.nameCn}</p>
              <p className="text-xs text-gray-500">{PROJECT.customer}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* ─── Project Banner ─── */}
        <div className="bg-white rounded-xl border px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{PROJECT.name}</h2>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              PM: {PROJECT.projectManager} &nbsp;|&nbsp; Phase: <span className="font-medium text-blue-700">{PROJECT.currentPhase}</span> &nbsp;|&nbsp; {PROJECT.lifecycle}
            </p>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{KPI.completionPercent}%</p>
              <p className="text-xs text-gray-500">Overall Progress</p>
            </div>
            <Badge className={`px-3 sm:px-4 py-2 text-sm font-medium ${
              KPI.overallStatus === "green" ? "bg-green-100 text-green-800 hover:bg-green-100" :
              KPI.overallStatus === "yellow" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" :
              "bg-red-100 text-red-800 hover:bg-red-100"
            }`}>
              {KPI.overallStatus === "green" ? "● Healthy" : KPI.overallStatus === "yellow" ? "● At Risk" : "● Critical"}
            </Badge>
          </div>
        </div>

        {/* ─── KPI Cards Row ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Financial Health */}
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Financial Health</span>
                </div>
                {KPI.budgetVariance < 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtCurrency(KPI.actualCost)}</p>
              <p className="text-xs text-gray-500 mt-1">of {fmtCurrency(KPI.budget)} budget</p>
              <div className="mt-3">
                <Progress value={budgetUsedPercent} className="h-2" />
              </div>
              <p className={`text-xs mt-2 font-medium ${KPI.budgetVariance < 0 ? "text-green-600" : "text-red-600"}`}>
                {KPI.budgetVariance < 0 ? "▼" : "▲"} {Math.abs(KPI.budgetVariance)}% vs plan
              </p>
            </CardContent>
          </Card>

          {/* Schedule Variance */}
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Schedule Variance</span>
                </div>
                <Timer className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">+{KPI.scheduleVarianceDays} days</p>
              <p className="text-xs text-gray-500 mt-1">behind schedule</p>
              <div className="mt-3">
                <Progress value={Math.max(0, 100 - KPI.scheduleVarianceDays * 5)} className="h-2" />
              </div>
              <p className="text-xs mt-2 text-amber-600 font-medium">
                Target: {PROJECT.targetDate}
              </p>
            </CardContent>
          </Card>

          {/* Milestone Progress */}
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Milestones</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{KPI.milestonesDone} / {KPI.milestonesTotal}</p>
              <p className="text-xs text-gray-500 mt-1">milestones completed</p>
              <div className="mt-3">
                <Progress value={Math.round((KPI.milestonesDone / KPI.milestonesTotal) * 100)} className="h-2" />
              </div>
              <p className="text-xs mt-2 text-blue-600 font-medium">
                {Math.round((KPI.milestonesDone / KPI.milestonesTotal) * 100)}% complete
              </p>
            </CardContent>
          </Card>

          {/* Quality Score */}
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Quality Score</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">87.3</p>
              <p className="text-xs text-gray-500 mt-1">overall quality index</p>
              <div className="mt-3">
                <Progress value={87.3} className="h-2" />
              </div>
              <p className="text-xs mt-2 text-purple-600 font-medium">
                2 open 8D &nbsp;|&nbsp; Max RPN: 224
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Middle Section: Split View ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Concurrent Debugging Status */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="pb-3 border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-blue-600" />
                双轨联调状态
                <span className="text-xs text-gray-400 font-normal ml-1">Concurrent Debugging Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {SUB_SYSTEMS.map((sys) => {
                  const style = lockStatusStyles[sys.status];
                  const IconComponent = sys.icon;
                  const StatusIcon = style.icon;
                  return (
                    <div key={sys.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <IconComponent className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{sys.nameCn}</p>
                        <p className="text-xs text-gray-500">{sys.name}</p>
                      </div>
                      {sys.status === "locked" && sys.lockedBy && (
                        <div className="text-right mr-2">
                          <p className="text-xs font-medium text-red-700">{sys.lockedBy}</p>
                          <p className="text-xs text-gray-400">since {sys.lockedSince}</p>
                        </div>
                      )}
                      {sys.testProgress !== undefined && sys.testProgress < 100 && (
                        <div className="w-16">
                          <Progress value={sys.testProgress} className="h-1.5" />
                          <p className="text-xs text-gray-400 text-center mt-0.5">{sys.testProgress}%</p>
                        </div>
                      )}
                      <Badge variant="outline" className={`text-xs gap-1 ${style.color} border-0`}>
                        <StatusIcon className="w-3 h-3" />
                        {style.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t text-xs text-gray-500 flex items-center gap-4">
                <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-red-500" /> 2 Locked</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-blue-500" /> 2 Testing</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> 1 Passed</span>
                <span className="flex items-center gap-1"><Wrench className="w-3 h-3 text-gray-400" /> 1 Idle</span>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel: AI Smart Suggestions */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="pb-3 border-b bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="w-5 h-5 text-violet-600" />
                AI 智能建议
                <span className="text-xs text-gray-400 font-normal ml-1">AI Smart Suggestions</span>
                <Badge variant="outline" className="ml-auto text-xs border-violet-200 text-violet-600 bg-violet-50">
                  {AI_SUGGESTIONS.length} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {AI_SUGGESTIONS.map((s) => {
                  const style = suggestionStyles[s.type];
                  const SIcon = style.icon;
                  return (
                    <div key={s.id} className={`px-5 py-3.5 border-l-4 ${style.border} ${style.bg} hover:brightness-[0.98] transition-all`}>
                      <div className="flex items-start gap-2.5">
                        <SIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{s.title}</p>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{s.detail}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">{s.timestamp}</span>
                            <Badge variant="outline" className="text-xs border-gray-200 text-gray-500 bg-white">
                              {s.source}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── T-Pipeline (T1-T15) ─── */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-blue-600" />
              Production Pipeline (T1 → T15)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-5 px-4 sm:px-6">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
              {T_STAGES.map((t, i) => (
                <div key={t.code} className="flex items-center">
                  <div className={`flex flex-col items-center min-w-[72px] ${
                    t.status === "done" ? "" : t.status === "active" ? "" : "opacity-50"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      t.status === "done"   ? "bg-green-500 border-green-500 text-white" :
                      t.status === "active" ? "bg-blue-500 border-blue-500 text-white animate-pulse" :
                      "bg-white border-gray-300 text-gray-400"
                    }`}>
                      {t.status === "done" ? "✓" : t.code.replace("T", "")}
                    </div>
                    <p className={`text-xs mt-1.5 text-center leading-tight ${
                      t.status === "done" ? "text-green-700 font-medium" :
                      t.status === "active" ? "text-blue-700 font-medium" :
                      "text-gray-400"
                    }`}>
                      {t.name}
                    </p>
                  </div>
                  {i < T_STAGES.length - 1 && (
                    <div className={`w-4 h-0.5 mt-[-16px] ${
                      t.status === "done" ? "bg-green-400" :
                      t.status === "active" ? "bg-blue-300" :
                      "bg-gray-200"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-4 pt-3 border-t text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500" /> Done: {T_STAGES.filter(t => t.status === "done").length}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" /> Active: {T_STAGES.filter(t => t.status === "active").length}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-gray-300" /> Pending: {T_STAGES.filter(t => t.status === "pending").length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ─── ECO Approval Section ─── */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                Engineering Change Order (ECO) Approval
              </CardTitle>
              <Badge variant="outline" className="text-xs border-orange-200 text-orange-600 bg-orange-50">
                Zero-Trust Gateway
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-5 px-4 sm:px-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-700">
                  ECO-2026-0047: Modify ultrasonic transducer mounting bracket (Revision B → C)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Submitted by Wu Weicheng (吴卫成) &nbsp;|&nbsp; Priority: High {/* demo */}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {ecoSubmitted && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Approval Submitted
                  </Badge>
                )}
                <Button
                  onClick={handleEcoApproval}
                  disabled={ecoSubmitted}
                  className={`gap-2 ${canApproveECO
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : "bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-100 cursor-not-allowed"
                  }`}
                  variant={canApproveECO ? "default" : "outline"}
                >
                  {canApproveECO ? (
                    <><Unlock className="w-4 h-4" /> Approve ECO</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Approve ECO 🔒</>
                  )}
                </Button>
              </div>
            </div>

            {/* Locked state dialog */}
            {ecoDialogOpen && !canApproveECO && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Authorization Required</p>
                    <p className="text-xs text-amber-700 mt-1">
                      ECO approval requires <strong>Manager</strong> level or above (current role: <code className="bg-amber-100 px-1 rounded">{currentUserRole}</code>).
                      This action is gated through the <strong>sys_approval_requests</strong> workflow. Please contact your department manager for clearance.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => setEcoDialogOpen(false)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Approval chain visualization */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 mb-3">Approval Chain (sys_approval_requests)</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { role: "Engineer", status: "done" },
                  { role: "Team Lead", status: "done" },
                  { role: "Dept Manager", status: "pending" },
                  { role: "Director", status: "locked" },
                ].map((step, i) => (
                  <div key={step.role} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      step.status === "done"    ? "bg-green-100 text-green-700" :
                      step.status === "pending" ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {step.status === "done" && <CheckCircle2 className="w-3 h-3" />}
                      {step.status === "pending" && <Clock className="w-3 h-3" />}
                      {step.status === "locked" && <Lock className="w-3 h-3" />}
                      {step.role}
                    </div>
                    {i < 3 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
