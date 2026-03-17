/**
 * 薪资沙盘试算 — Payroll Sandbox (CEO 6-Zone Layout)
 *
 * Zone 1: 周期与范围 — Cycle selector + status + KPI summary
 * Zone 2: 输入完整性 — Data completeness progress bars
 * Zone 3: 绩效联动区 — Evidence + AI suggest + supervisor confirm + freeze
 * Zone 4: 试算对比区 — Calc engine + Excel comparison + dept breakdown + perf wage
 * Zone 5: 异常与待处理区 — Anomalies by category + resolve actions
 * Zone 6: 审批与锁账区 — 4-stage approval + lock controls + post-payout metrics
 */

import { useState, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useSandboxPageEnhancements } from "@/components/Sandbox/useSandboxPageEnhancements";
import ShortcutOverlay from "@/components/Sandbox/ShortcutOverlay";
import SandboxEventFlowPanel from "@/components/Sandbox/SandboxEventFlowPanel";
import SandboxFileImport from "@/components/Sandbox/SandboxFileImport";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  FlaskConical, Users, Calculator, DollarSign, ShieldCheck,
  CheckCircle, AlertTriangle, Play, RefreshCw, TrendingUp,
  Building2, Lock, Unlock, ChevronDown, ChevronUp, Brain,
  FileCheck, ClipboardCheck, Snowflake, AlertCircle, Info,
  BarChart3, ArrowRight, Shield, Receipt, Banknote, XCircle,
  Plus, Zap, ArrowDownToLine,
} from "lucide-react";

// ─── Status Config ───────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  importing: "bg-blue-100 text-blue-800",
  imported: "bg-cyan-100 text-cyan-800",
  calculating: "bg-yellow-100 text-yellow-800",
  calculated: "bg-green-100 text-green-800",
  reviewing: "bg-purple-100 text-purple-800",
  approved: "bg-emerald-100 text-emerald-800",
  locked: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "草稿", importing: "导入中", imported: "已导入",
  calculating: "计算中", calculated: "已计算", reviewing: "审核中",
  approved: "已审批", locked: "已锁定",
};

const anomalyCategoryLabels: Record<string, string> = {
  evidence_insufficient: "举证不足",
  perf_quality_conflict: "绩效质量冲突",
  allowance_no_basis: "补贴无依据",
  social_fund_mismatch: "社保基数不匹配",
  tax_bracket_anomaly: "税率档次异常",
  net_pay_volatility: "实发波动异常",
};

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  critical: "bg-red-100 text-red-800",
};

const approvalStageLabels: Record<string, string> = {
  hr_initial: "HR初审",
  finance_review: "财务复核",
  dept_manager_confirm: "部门确认",
  exec_approve: "总经办批准",
};

const approvalActionColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800",
};

const approvalActionLabels: Record<string, string> = {
  pending: "待处理", approved: "已通过", rejected: "已驳回", returned: "已退回",
};

const lockTypeLabels: Record<string, string> = {
  performance: "绩效快照", salary: "薪资结果", tax: "个税快照",
  adjustment: "调整记录", full: "全部锁定",
};

const bonusTierLabels: Record<string, string> = {
  tier_s: "S(150%)", tier_a: "A(120%)", tier_b: "B(100%)",
  tier_c: "C(80%)", tier_d: "D(60%)", tier_zero: "不发",
};

const reviewStatusLabels: Record<string, string> = {
  pending_evidence: "待举证", ai_suggested: "AI已建议",
  supervisor_confirmed: "主管已确认", frozen: "已冻结", disputed: "有争议",
};

const reviewStatusColors: Record<string, string> = {
  pending_evidence: "bg-gray-100 text-gray-800",
  ai_suggested: "bg-blue-100 text-blue-800",
  supervisor_confirmed: "bg-green-100 text-green-800",
  frozen: "bg-cyan-100 text-cyan-800",
  disputed: "bg-red-100 text-red-800",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: string | number | null | undefined): string {
  if (v == null) return "\u2014";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Collapsible Zone Wrapper ────────────────────────────────────────────────

function Zone({
  title, icon, defaultOpen = true, children,
}: {
  title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none flex flex-row items-center justify-between py-3"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PayrollSandbox() {
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const { toast } = useToast();

  // ── Sandbox enhancements: shortcuts + auto-save + file import ──
  const { shortcutOverlayOpen, setShortcutOverlayOpen, shortcuts, lastSaved, isSaving } = useSandboxPageEnhancements({
    sandboxShortcuts: [
      { key: "ctrl+r", label: "试算运行", labelEn: "Run trial calc", action: () => toast({ title: "试算已触发" }) },
    ],
    autoSave: {
      data: { selectedCycleId },
      onSave: async (d) => { localStorage.setItem("grt-sb-payroll", JSON.stringify(d)); },
    },
  });

  // ── Supervisor confirm dialog state ──
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; employeeId: number | null; employeeName: string;
  }>({ open: false, employeeId: null, employeeName: "" });
  const [supervisorScore, setSupervisorScore] = useState("");
  const [supervisorComment, setSupervisorComment] = useState("");

  // ── Smart create dialog state ──
  const [smartCreateOpen, setSmartCreateOpen] = useState(false);
  const [smartCreateForm, setSmartCreateForm] = useState({
    period: "",
    workDays: 22,
    name: "",
    carryForwardSocial: true,
    carryForwardAllowance: true,
    autoGenerateTax: true,
  });

  // ── Carry-forward result badges ──
  const [socialCarryCount, setSocialCarryCount] = useState<number | null>(null);
  const [allowanceCarryCount, setAllowanceCarryCount] = useState<number | null>(null);
  const [taxAutoCount, setTaxAutoCount] = useState<number | null>(null);

  // ── Zone 3 tab state ──
  const [zone3Tab, setZone3Tab] = useState("evidence");
  // ── Zone 4 tab state ──
  const [zone4Tab, setZone4Tab] = useState("attendance");
  // ── Zone 6 tab state ──
  const [zone6Tab, setZone6Tab] = useState("approval");

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  const cyclesQuery = trpc.payrollSandbox.cycle.list.useQuery();
  const selectedCycle = cyclesQuery.data?.find((c: any) => c.id === selectedCycleId);

  // Auto-select first cycle
  if (!selectedCycleId && cyclesQuery.data?.length) {
    setSelectedCycleId(cyclesQuery.data[0].id);
  }

  // Zone 1: Overview + summary
  const overviewQuery = trpc.payrollSandbox.dashboard.overview.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const summaryQuery = trpc.payrollSandbox.cycle.getSummary.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );

  // Zone 2: Input completeness counts
  const attendanceQuery = trpc.payrollSandbox.attendance.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const performanceQuery = trpc.payrollSandbox.performance.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const allowanceQuery = trpc.payrollSandbox.allowance.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const socialQuery = trpc.payrollSandbox.socialFund.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const taxQuery = trpc.payrollSandbox.taxSnapshot.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );

  // Zone 3: Evidence + PerfReview
  const evidenceQuery = trpc.payrollSandbox.evidence.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const perfReviewQuery = trpc.payrollSandbox.perfReview.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );

  // Zone 4: Calc results + dept breakdown + perf wage
  const calcResultsQuery = trpc.payrollSandbox.calc.listResults.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const finalResultsQuery = trpc.payrollSandbox.result.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const deptBreakdownQuery = trpc.payrollSandbox.dashboard.deptBreakdown.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const perfWageQuery = trpc.payrollSandbox.dashboard.perfWageAnalysis.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );

  // Zone 5: Anomalies
  const anomalyQuery = trpc.payrollSandbox.anomaly.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const anomalyStatsQuery = trpc.payrollSandbox.anomaly.stats.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );

  // Zone 6: Approval + Lock + Metrics
  const approvalQuery = trpc.payrollSandbox.approval.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const currentStageQuery = trpc.payrollSandbox.approval.currentStage.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const lockQuery = trpc.payrollSandbox.lock.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );
  const metricsQuery = trpc.payrollSandbox.metrics.list.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId },
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const importAllMut = trpc.payrollSandbox.cycle.importAll.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "汇总导入完成", description: `共导入 ${data.total ?? 0} 条记录` });
      refetchAll();
    },
    onError: (err: any) => toast({ title: "汇总失败", description: err.message, variant: "destructive" }),
  });

  const runCalcMut = trpc.payrollSandbox.calc.run.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "计算完成", description: `已计算 ${data.calculated ?? 0} 名员工` });
      refetchAll();
    },
    onError: (err: any) => toast({ title: "计算失败", description: err.message, variant: "destructive" }),
  });

  const aiSuggestMut = trpc.payrollSandbox.perfReview.aiSuggest.useMutation({
    onSuccess: () => {
      toast({ title: "AI建议已生成" });
      perfReviewQuery.refetch();
    },
    onError: (err: any) => toast({ title: "AI建议失败", description: err.message, variant: "destructive" }),
  });

  const supervisorConfirmMut = trpc.payrollSandbox.perfReview.supervisorConfirm.useMutation({
    onSuccess: () => {
      toast({ title: "主管确认完成" });
      perfReviewQuery.refetch();
      setConfirmDialog({ open: false, employeeId: null, employeeName: "" });
      setSupervisorScore("");
      setSupervisorComment("");
    },
    onError: (err: any) => toast({ title: "确认失败", description: err.message, variant: "destructive" }),
  });

  const freezeMut = trpc.payrollSandbox.perfReview.freeze.useMutation({
    onSuccess: () => {
      toast({ title: "已冻结" });
      perfReviewQuery.refetch();
    },
    onError: (err: any) => toast({ title: "冻结失败", description: err.message, variant: "destructive" }),
  });

  const batchFreezeMut = trpc.payrollSandbox.perfReview.batchFreeze.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "批量冻结完成", description: `已冻结 ${data.frozen ?? 0} 条记录` });
      perfReviewQuery.refetch();
    },
    onError: (err: any) => toast({ title: "批量冻结失败", description: err.message, variant: "destructive" }),
  });

  const resolveAnomalyMut = trpc.payrollSandbox.anomaly.resolve.useMutation({
    onSuccess: () => {
      toast({ title: "异常已标记解决" });
      anomalyQuery.refetch();
      anomalyStatsQuery.refetch();
    },
    onError: (err: any) => toast({ title: "操作失败", description: err.message, variant: "destructive" }),
  });

  const approveMut = trpc.payrollSandbox.approval.approve.useMutation({
    onSuccess: () => {
      toast({ title: "审批通过" });
      approvalQuery.refetch();
      currentStageQuery.refetch();
    },
    onError: (err: any) => toast({ title: "审批失败", description: err.message, variant: "destructive" }),
  });

  const rejectMut = trpc.payrollSandbox.approval.reject.useMutation({
    onSuccess: () => {
      toast({ title: "已驳回" });
      approvalQuery.refetch();
      currentStageQuery.refetch();
    },
    onError: (err: any) => toast({ title: "驳回失败", description: err.message, variant: "destructive" }),
  });

  const initFlowMut = trpc.payrollSandbox.approval.initFlow.useMutation({
    onSuccess: () => {
      toast({ title: "审批流已发起" });
      approvalQuery.refetch();
      currentStageQuery.refetch();
    },
    onError: (err: any) => toast({ title: "发起失败", description: err.message, variant: "destructive" }),
  });

  const lockMut = trpc.payrollSandbox.lock.lock.useMutation({
    onSuccess: () => {
      toast({ title: "已锁定" });
      lockQuery.refetch();
    },
    onError: (err: any) => toast({ title: "锁定失败", description: err.message, variant: "destructive" }),
  });

  const unlockMut = trpc.payrollSandbox.lock.unlock.useMutation({
    onSuccess: () => {
      toast({ title: "已解锁" });
      lockQuery.refetch();
    },
    onError: (err: any) => toast({ title: "解锁失败", description: err.message, variant: "destructive" }),
  });

  const generateMetricsMut = trpc.payrollSandbox.metrics.generate.useMutation({
    onSuccess: () => {
      toast({ title: "复盘指标已生成" });
      metricsQuery.refetch();
    },
    onError: (err: any) => toast({ title: "生成失败", description: err.message, variant: "destructive" }),
  });

  // ── Smart create mutation ──
  const smartCreateMut = trpc.payrollSandbox.cycle.smartCreate.useMutation({
    onSuccess: (data: any) => {
      toast({
        title: "智能创建成功",
        description: `周期 ${data.name ?? data.period} 已创建 | 结转社保: ${data.carriedSocial ?? 0}条, 补贴: ${data.carriedAllowance ?? 0}条, 个税快照: ${data.generatedTax ?? 0}条`,
      });
      setSmartCreateOpen(false);
      cyclesQuery.refetch();
      if (data.id) setSelectedCycleId(data.id);
      refetchAll();
    },
    onError: (err: any) => toast({ title: "创建失败", description: err.message, variant: "destructive" }),
  });

  // ── Flow reviews to performance input ──
  const flowToInputMut = trpc.payrollSandbox.perfReview.flowToInput.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "评审结果已流入", description: `${data.flowed ?? 0}名员工绩效数据已流入` });
      performanceQuery.refetch();
      perfReviewQuery.refetch();
    },
    onError: (err: any) => toast({ title: "流入失败", description: err.message, variant: "destructive" }),
  });

  // ── Carry-forward mutations ──
  const socialCarryMut = trpc.payrollSandbox.socialFund.carryForward.useMutation({
    onSuccess: (data: any) => {
      const count = data.carried ?? data.count ?? 0;
      setSocialCarryCount(count);
      toast({ title: "社保结转完成", description: `已结转 ${count} 条` });
      socialQuery.refetch();
    },
    onError: (err: any) => toast({ title: "结转失败", description: err.message, variant: "destructive" }),
  });

  const allowanceCarryMut = trpc.payrollSandbox.allowance.carryForward.useMutation({
    onSuccess: (data: any) => {
      const count = data.carried ?? data.count ?? 0;
      setAllowanceCarryCount(count);
      toast({ title: "补贴结转完成", description: `已结转 ${count} 条` });
      allowanceQuery.refetch();
    },
    onError: (err: any) => toast({ title: "结转失败", description: err.message, variant: "destructive" }),
  });

  const taxAutoGenMut = trpc.payrollSandbox.taxSnapshot.autoGenerate.useMutation({
    onSuccess: (data: any) => {
      const count = data.generated ?? data.count ?? 0;
      setTaxAutoCount(count);
      toast({ title: "个税快照已生成", description: `已生成 ${count} 条` });
      taxQuery.refetch();
    },
    onError: (err: any) => toast({ title: "生成失败", description: err.message, variant: "destructive" }),
  });

  // ── Refetch helper ──
  const refetchAll = useCallback(() => {
    cyclesQuery.refetch();
    overviewQuery.refetch();
    summaryQuery.refetch();
    calcResultsQuery.refetch();
    finalResultsQuery.refetch();
    deptBreakdownQuery.refetch();
    perfWageQuery.refetch();
    anomalyQuery.refetch();
    anomalyStatsQuery.refetch();
  }, []);

  // ── Derived data ──
  const overview = overviewQuery.data;
  const totalEmployees = Number(overview?.cycle?.totalEmployees ?? 0);
  const attendanceCount = attendanceQuery.data?.length ?? 0;
  const performanceCount = performanceQuery.data?.length ?? 0;
  const allowanceCount = allowanceQuery.data?.length ?? 0;
  const socialCount = socialQuery.data?.length ?? 0;
  const taxCount = taxQuery.data?.length ?? 0;
  const allReady = totalEmployees > 0
    && attendanceCount >= totalEmployees
    && performanceCount >= totalEmployees
    && socialCount >= totalEmployees;

  function completenessPercent(count: number): number {
    if (totalEmployees <= 0) return 0;
    return Math.min(100, Math.round((count / totalEmployees) * 100));
  }

  // ── Smart create: auto-suggest next month ──
  function suggestNextMonth(): { period: string; name: string } {
    const latest = cyclesQuery.data?.[0]?.period;
    if (latest) {
      const [y, m] = latest.split("-").map(Number);
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      const period = `${nextY}-${String(nextM).padStart(2, "0")}`;
      return { period, name: `${nextY}年${nextM}月工资` };
    }
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return { period, name: `${now.getFullYear()}年${now.getMonth() + 1}月工资` };
  }

  function openSmartCreate() {
    const suggestion = suggestNextMonth();
    setSmartCreateForm({
      period: suggestion.period,
      workDays: 22,
      name: suggestion.name,
      carryForwardSocial: true,
      carryForwardAllowance: true,
      autoGenerateTax: true,
    });
    setSmartCreateOpen(true);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="p-6 space-y-4">
      <ShortcutOverlay open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} commonShortcuts={shortcuts.commonShortcuts} sandboxShortcuts={shortcuts.sandboxShortcuts} sandboxTitle="薪酬沙盘" />
      <SandboxEventFlowPanel sandboxId="payroll-attendance" className="mb-2" />
      {/* ── Sticky Header: Cycle Selector ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b pb-3 -mx-6 px-6 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold">薪资沙盘试算</h1>
            {selectedCycle && (
              <Badge className={statusColors[selectedCycle.status] ?? ""}>
                {statusLabels[selectedCycle.status] ?? selectedCycle.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedCycleId?.toString() ?? ""}
              onValueChange={(v) => setSelectedCycleId(Number(v))}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="选择工资周期" />
              </SelectTrigger>
              <SelectContent>
                {cyclesQuery.data?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name} ({c.period})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCycle && (
              <span className="text-sm text-muted-foreground">
                工作日: {selectedCycle.workDays ?? "\u2014"}天
              </span>
            )}
            <Button variant="outline" size="sm" onClick={openSmartCreate}>
              <Zap className="h-4 w-4 mr-1" />智能创建下一月
            </Button>
            <SandboxFileImport
              accept=".csv"
              label="导入考勤"
              onImport={(rows, fileName) => { toast({ title: `已导入 ${rows.length} 行考勤数据`, description: fileName }); }}
            />
          </div>
        </div>
      </div>

      {/* ── Smart Create Dialog ── */}
      <Dialog open={smartCreateOpen} onOpenChange={setSmartCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>智能创建周期</DialogTitle>
            <DialogDescription>自动结转上月数据并创建新的工资周期</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>周期 (YYYY-MM)</Label>
                <Input
                  value={smartCreateForm.period}
                  onChange={(e) => setSmartCreateForm((f) => ({ ...f, period: e.target.value }))}
                  placeholder="2026-03"
                />
              </div>
              <div>
                <Label>工作日</Label>
                <Input
                  type="number" min={15} max={28}
                  value={smartCreateForm.workDays}
                  onChange={(e) => setSmartCreateForm((f) => ({ ...f, workDays: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>周期名称</Label>
              <Input
                value={smartCreateForm.name}
                onChange={(e) => setSmartCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="2026年3月工资"
              />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="carry-social"
                  checked={smartCreateForm.carryForwardSocial}
                  onCheckedChange={(v) => setSmartCreateForm((f) => ({ ...f, carryForwardSocial: !!v }))}
                />
                <Label htmlFor="carry-social" className="text-sm cursor-pointer">自动结转社保公积金</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="carry-allowance"
                  checked={smartCreateForm.carryForwardAllowance}
                  onCheckedChange={(v) => setSmartCreateForm((f) => ({ ...f, carryForwardAllowance: !!v }))}
                />
                <Label htmlFor="carry-allowance" className="text-sm cursor-pointer">自动结转补贴</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-tax"
                  checked={smartCreateForm.autoGenerateTax}
                  onCheckedChange={(v) => setSmartCreateForm((f) => ({ ...f, autoGenerateTax: !!v }))}
                />
                <Label htmlFor="auto-tax" className="text-sm cursor-pointer">自动生成个税快照</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button
              disabled={!smartCreateForm.period || !smartCreateForm.name || smartCreateMut.isPending}
              onClick={() => {
                smartCreateMut.mutate({
                  period: smartCreateForm.period,
                  workDays: smartCreateForm.workDays,
                  name: smartCreateForm.name,
                  carryForwardSocial: smartCreateForm.carryForwardSocial,
                  carryForwardAllowance: smartCreateForm.carryForwardAllowance,
                  autoGenerateTax: smartCreateForm.autoGenerateTax,
                });
              }}
            >
              {smartCreateMut.isPending ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />创建中...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" />智能创建</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 1: 周期与范围 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Zone title="Zone 1 \u2014 周期与范围" icon={<BarChart3 className="h-5 w-5 text-blue-600" />}>
        {!selectedCycleId ? (
          <p className="text-muted-foreground text-center py-8">请先选择工资周期</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label="员工数" value={String(totalEmployees)} icon={<Users className="h-4 w-4" />} />
            <KpiCard
              label="应发总额" color="text-blue-600"
              value={fmt(overview?.calcStats?.totalGross)}
              icon={<Banknote className="h-4 w-4" />}
            />
            <KpiCard
              label="实发总额" color="text-green-600"
              value={fmt(overview?.calcStats?.totalNet)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              label="个税总额" color="text-orange-600"
              value={fmt(overview?.calcStats?.totalTax)}
              icon={<Receipt className="h-4 w-4" />}
            />
            <KpiCard
              label="社保总额"
              value={fmt(overview?.calcStats?.totalSocial)}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <KpiCard
              label="待审调整" color="text-red-600"
              value={String(overview?.pendingAdjustments ?? 0)}
              icon={<AlertCircle className="h-4 w-4" />}
            />
          </div>
        )}
      </Zone>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 2: 输入完整性 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Zone title="Zone 2 \u2014 输入完整性" icon={<ClipboardCheck className="h-5 w-5 text-cyan-600" />}>
        {!selectedCycleId ? (
          <p className="text-muted-foreground text-center py-8">请先选择工资周期</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <CompletenessBar label="考勤" count={attendanceCount} total={totalEmployees} pct={completenessPercent(attendanceCount)} />
              <CompletenessBar label="绩效" count={performanceCount} total={totalEmployees} pct={completenessPercent(performanceCount)} />
              <div>
                <CompletenessBar label="补贴" count={allowanceCount} total={totalEmployees} pct={completenessPercent(allowanceCount)} />
                <div className="flex items-center gap-1 mt-1">
                  <Button
                    size="sm" variant="ghost" className="h-6 px-2 text-xs"
                    disabled={!selectedCycleId || allowanceCarryMut.isPending}
                    onClick={() => selectedCycleId && allowanceCarryMut.mutate({ cycleId: selectedCycleId })}
                  >
                    <ArrowDownToLine className="h-3 w-3 mr-1" />从上月结转
                  </Button>
                  {allowanceCarryCount != null && (
                    <Badge variant="secondary" className="text-[10px]">已结转 {allowanceCarryCount} 条</Badge>
                  )}
                </div>
              </div>
              <div>
                <CompletenessBar label="社保公积金" count={socialCount} total={totalEmployees} pct={completenessPercent(socialCount)} />
                <div className="flex items-center gap-1 mt-1">
                  <Button
                    size="sm" variant="ghost" className="h-6 px-2 text-xs"
                    disabled={!selectedCycleId || socialCarryMut.isPending}
                    onClick={() => selectedCycleId && socialCarryMut.mutate({ cycleId: selectedCycleId })}
                  >
                    <ArrowDownToLine className="h-3 w-3 mr-1" />从上月结转
                  </Button>
                  {socialCarryCount != null && (
                    <Badge variant="secondary" className="text-[10px]">已结转 {socialCarryCount} 条</Badge>
                  )}
                </div>
              </div>
              <div>
                <CompletenessBar label="个税快照" count={taxCount} total={totalEmployees} pct={completenessPercent(taxCount)} />
                <div className="flex items-center gap-1 mt-1">
                  <Button
                    size="sm" variant="ghost" className="h-6 px-2 text-xs"
                    disabled={!selectedCycleId || taxAutoGenMut.isPending}
                    onClick={() => selectedCycleId && taxAutoGenMut.mutate({ cycleId: selectedCycleId })}
                  >
                    <Zap className="h-3 w-3 mr-1" />自动生成
                  </Button>
                  {taxAutoCount != null && (
                    <Badge variant="secondary" className="text-[10px]">已生成 {taxAutoCount} 条</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {allReady ? (
                  <Badge className="bg-green-100 text-green-800">数据就绪</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">数据不足</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  基准: {totalEmployees} 名员工
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => selectedCycleId && importAllMut.mutate({ cycleId: selectedCycleId })}
                disabled={!selectedCycleId || importAllMut.isPending}
              >
                {importAllMut.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />汇总中...</>
                ) : (
                  <><ClipboardCheck className="h-4 w-4 mr-2" />汇总检查</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Zone>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 3: 绩效联动区 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Zone title="Zone 3 \u2014 绩效联动区" icon={<TrendingUp className="h-5 w-5 text-purple-600" />}>
        {!selectedCycleId ? (
          <p className="text-muted-foreground text-center py-8">请先选择工资周期</p>
        ) : (
          <Tabs value={zone3Tab} onValueChange={setZone3Tab}>
            <TabsList>
              <TabsTrigger value="evidence">证据列表</TabsTrigger>
              <TabsTrigger value="review">评审结论</TabsTrigger>
              <TabsTrigger value="actions">操作</TabsTrigger>
            </TabsList>

            {/* Tab: Evidence */}
            <TabsContent value="evidence">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>员工</TableHead>
                      <TableHead>得分</TableHead>
                      <TableHead>来源</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evidenceQuery.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          暂无绩效证据
                        </TableCell>
                      </TableRow>
                    )}
                    {evidenceQuery.data?.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Badge variant="outline">{row.type ?? row.evidenceType ?? "\u2014"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{row.title ?? "\u2014"}</TableCell>
                        <TableCell>{row.employeeName ?? "\u2014"}</TableCell>
                        <TableCell className="font-mono">{row.score ?? "\u2014"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.source ?? "\u2014"}</TableCell>
                        <TableCell className="text-xs">{row.createdAt ? new Date(row.createdAt).toLocaleDateString("zh-CN") : "\u2014"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab: Review */}
            <TabsContent value="review">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>AI分数</TableHead>
                      <TableHead>主管分数</TableHead>
                      <TableHead>最终分数</TableHead>
                      <TableHead>奖金档位</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perfReviewQuery.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          暂无评审数据
                        </TableCell>
                      </TableRow>
                    )}
                    {perfReviewQuery.data?.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.employeeName ?? "\u2014"}</TableCell>
                        <TableCell className="font-mono">{row.aiScore ?? "\u2014"}</TableCell>
                        <TableCell className="font-mono">{row.supervisorScore ?? "\u2014"}</TableCell>
                        <TableCell className="font-mono font-bold">{row.finalScore ?? "\u2014"}</TableCell>
                        <TableCell>
                          {row.bonusTier ? (
                            <Badge variant="outline">{bonusTierLabels[row.bonusTier] ?? row.bonusTier}</Badge>
                          ) : "\u2014"}
                        </TableCell>
                        <TableCell>
                          <Badge className={reviewStatusColors[row.status] ?? "bg-gray-100 text-gray-800"}>
                            {reviewStatusLabels[row.status] ?? row.status ?? "\u2014"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab: Actions */}
            <TabsContent value="actions">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => selectedCycleId && (aiSuggestMut.mutate as (input: unknown) => void)({ cycleId: selectedCycleId })}
                    disabled={!selectedCycleId || aiSuggestMut.isPending}
                  >
                    {aiSuggestMut.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />生成中...</>
                    ) : (
                      <><Brain className="h-4 w-4 mr-2" />AI建议</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => selectedCycleId && batchFreezeMut.mutate({ cycleId: selectedCycleId })}
                    disabled={!selectedCycleId || batchFreezeMut.isPending}
                  >
                    {batchFreezeMut.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />冻结中...</>
                    ) : (
                      <><Snowflake className="h-4 w-4 mr-2" />批量冻结</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => selectedCycleId && flowToInputMut.mutate({ cycleId: selectedCycleId })}
                    disabled={!selectedCycleId || flowToInputMut.isPending || !(perfReviewQuery.data?.some((r: any) => r.status === "frozen"))}
                  >
                    {flowToInputMut.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />流入中...</>
                    ) : (
                      <><ArrowRight className="h-4 w-4 mr-2" />评审结果→绩效输入</>
                    )}
                  </Button>
                </div>

                <CardDescription>选择员工进行主管确认或单独冻结:</CardDescription>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>员工</TableHead>
                        <TableHead>AI分数</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perfReviewQuery.data?.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.employeeName ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{row.aiScore ?? "\u2014"}</TableCell>
                          <TableCell>
                            <Badge className={reviewStatusColors[row.status] ?? "bg-gray-100 text-gray-800"}>
                              {reviewStatusLabels[row.status] ?? row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm" variant="outline"
                                disabled={row.status === "supervisor_confirmed" || row.status === "frozen"}
                                onClick={() => setConfirmDialog({
                                  open: true,
                                  employeeId: row.employeeId ?? row.id,
                                  employeeName: row.employeeName ?? "",
                                })}
                              >
                                主管确认
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                disabled={row.status === "frozen" || freezeMut.isPending}
                                onClick={() => (freezeMut.mutate as (input: unknown) => void)({
                                  cycleId: selectedCycleId!,
                                  reviewId: row.id,
                                  employeeId: row.employeeId ?? row.id,
                                })}
                              >
                                <Snowflake className="h-3 w-3 mr-1" />冻结
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Zone>

      {/* Supervisor Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, employeeId: null, employeeName: "" });
            setSupervisorScore("");
            setSupervisorComment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>主管确认 \u2014 {confirmDialog.employeeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">主管评分</label>
              <Input
                type="number" min={0} max={100} step={0.1}
                placeholder="0 ~ 100"
                value={supervisorScore}
                onChange={(e) => setSupervisorScore(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">评语(可选)</label>
              <Input
                placeholder="简要评语"
                value={supervisorComment}
                onChange={(e) => setSupervisorComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button
              disabled={!supervisorScore || supervisorConfirmMut.isPending}
              onClick={() => {
                if (!selectedCycleId || !confirmDialog.employeeId) return;
                (supervisorConfirmMut.mutate as (input: unknown) => void)({
                  cycleId: selectedCycleId,
                  reviewId: confirmDialog.employeeId,
                  supervisorScore: Number(supervisorScore),
                  supervisorName: "supervisor",
                  supervisorComment: supervisorComment || undefined,
                });
              }}
            >
              {supervisorConfirmMut.isPending ? "提交中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 4: 试算对比区 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Zone title="Zone 4 \u2014 试算对比区" icon={<Calculator className="h-5 w-5 text-green-600" />}>
        {!selectedCycleId ? (
          <p className="text-muted-foreground text-center py-8">请先选择工资周期</p>
        ) : (
          <Tabs value={zone4Tab} onValueChange={setZone4Tab}>
            <div className="flex items-center justify-between mb-2">
              <TabsList>
                <TabsTrigger value="attendance">考勤扣款表</TabsTrigger>
                <TabsTrigger value="perfbonus">绩效奖金计算表</TabsTrigger>
                <TabsTrigger value="social">社保公积金表</TabsTrigger>
                <TabsTrigger value="tax">个税计算表</TabsTrigger>
                <TabsTrigger value="summary">薪资汇总表</TabsTrigger>
              </TabsList>
              <Button
                onClick={() => selectedCycleId && runCalcMut.mutate({ cycleId: selectedCycleId })}
                disabled={!selectedCycleId || runCalcMut.isPending}
              >
                {runCalcMut.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />计算中...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />执行计算</>
                )}
              </Button>
            </div>

            {/* Tab 1: 考勤扣款表 */}
            <TabsContent value="attendance">
              <div className="text-sm text-muted-foreground mb-2">
                考勤与扣款明细: {attendanceQuery.data?.length ?? 0} 条考勤 / {calcResultsQuery.data?.length ?? 0} 条计算结果
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>应出勤天</TableHead>
                      <TableHead>实际出勤</TableHead>
                      <TableHead>事假(h)</TableHead>
                      <TableHead>病假(h)</TableHead>
                      <TableHead>事假扣款</TableHead>
                      <TableHead>病假扣款</TableHead>
                      <TableHead>平时加班(h)</TableHead>
                      <TableHead>周末加班(h)</TableHead>
                      <TableHead>节假日加班(h)</TableHead>
                      <TableHead>加班费</TableHead>
                      <TableHead>全勤奖</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!attendanceQuery.data || attendanceQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                          暂无考勤数据
                        </TableCell>
                      </TableRow>
                    )}
                    {attendanceQuery.data?.map((att: any) => {
                      const calc: any = calcResultsQuery.data?.find(
                        (c: any) => c.employeeId === att.employeeId || c.employeeName === att.employeeName
                      );
                      return (
                        <TableRow key={att.id}>
                          <TableCell className="font-medium whitespace-nowrap">{att.employeeName ?? "\u2014"}</TableCell>
                          <TableCell>{att.department ?? calc?.department ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{att.scheduledDays ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{att.actualDays ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{att.personalLeaveHours ?? att.sickLeaveHours != null ? att.personalLeaveHours ?? 0 : "\u2014"}</TableCell>
                          <TableCell className="font-mono">{att.sickLeaveHours ?? 0}</TableCell>
                          <TableCell className="font-mono text-red-600">{fmt(calc?.personalLeaveDeduction ?? calc?.leaveDeduction)}</TableCell>
                          <TableCell className="font-mono text-red-600">{fmt(calc?.sickLeaveDeduction)}</TableCell>
                          <TableCell className="font-mono">{att.weekdayOtHours ?? att.regularOtHours ?? 0}</TableCell>
                          <TableCell className="font-mono">{att.weekendOtHours ?? 0}</TableCell>
                          <TableCell className="font-mono">{att.holidayOtHours ?? 0}</TableCell>
                          <TableCell className="font-mono text-green-600">{fmt(calc?.overtimePay)}</TableCell>
                          <TableCell className="font-mono">{fmt(calc?.fullAttendanceBonus ?? calc?.attendanceBonus)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 2: 绩效奖金计算表 */}
            <TabsContent value="perfbonus">
              <div className="text-sm text-muted-foreground mb-2">
                三档绩效工资计算明细 ({calcResultsQuery.data?.length ?? 0} 名员工)
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>月度评分</TableHead>
                      <TableHead>2024均分</TableHead>
                      <TableHead>2025均分</TableHead>
                      <TableHead>绩效1基数</TableHead>
                      <TableHead>系数1</TableHead>
                      <TableHead>绩效工资1</TableHead>
                      <TableHead>绩效2基数</TableHead>
                      <TableHead>系数2</TableHead>
                      <TableHead>绩效工资2</TableHead>
                      <TableHead>绩效3基数</TableHead>
                      <TableHead>系数3</TableHead>
                      <TableHead>绩效工资3</TableHead>
                      <TableHead>绩效调整合计</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!calcResultsQuery.data || calcResultsQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                          尚未执行计算
                        </TableCell>
                      </TableRow>
                    )}
                    {calcResultsQuery.data?.map((row: any) => {
                      const perf: any = performanceQuery.data?.find(
                        (p: any) => p.employeeId === row.employeeId || p.employeeName === row.employeeName
                      );
                      const coeffColor = (c: number | string | null | undefined) => {
                        const v = Number(c);
                        if (v === 1) return "text-green-600 font-bold";
                        if (v === 0.5) return "text-yellow-600 font-bold";
                        if (v === 0) return "text-red-600";
                        return "";
                      };
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium whitespace-nowrap">{row.employeeName}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell className="font-mono">{perf?.score ?? row.perfScore ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono text-xs">{perf?.avg2024 ?? row.avg2024 ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono text-xs">{perf?.avg2025 ?? row.avg2025 ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono text-xs">{fmt(row.perfWage1Base ?? row.perfBase1)}</TableCell>
                          <TableCell className={`font-mono ${coeffColor(row.perfCoeff1)}`}>{row.perfCoeff1 ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{fmt(row.perfWage1)}</TableCell>
                          <TableCell className="font-mono text-xs">{fmt(row.perfWage2Base ?? row.perfBase2)}</TableCell>
                          <TableCell className={`font-mono ${coeffColor(row.perfCoeff2)}`}>{row.perfCoeff2 ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{fmt(row.perfWage2)}</TableCell>
                          <TableCell className="font-mono text-xs">{fmt(row.perfWage3Base ?? row.perfBase3)}</TableCell>
                          <TableCell className={`font-mono ${coeffColor(row.perfCoeff3)}`}>{row.perfCoeff3 ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{fmt(row.perfWage3)}</TableCell>
                          <TableCell className="font-mono font-bold">
                            {fmt(Number(row.perfWage1 ?? 0) + Number(row.perfWage2 ?? 0) + Number(row.perfWage3 ?? 0))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 3: 社保公积金表 */}
            <TabsContent value="social">
              <div className="text-sm text-muted-foreground mb-2">
                社保公积金: {socialQuery.data?.length ?? 0} 条记录
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>入职日</TableHead>
                      <TableHead>社保(个人)</TableHead>
                      <TableHead>公积金(个人)</TableHead>
                      <TableHead>合计</TableHead>
                      <TableHead>数据来源</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!socialQuery.data || socialQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          暂无社保公积金数据
                        </TableCell>
                      </TableRow>
                    )}
                    {socialQuery.data?.map((row: any) => {
                      const socialAmt = Number(row.socialInsurance ?? row.socialPersonal ?? 0);
                      const fundAmt = Number(row.housingFund ?? row.fundPersonal ?? 0);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium whitespace-nowrap">{row.employeeName ?? "\u2014"}</TableCell>
                          <TableCell>{row.department ?? "\u2014"}</TableCell>
                          <TableCell className="text-xs">{row.hireDate ? new Date(row.hireDate).toLocaleDateString("zh-CN") : "\u2014"}</TableCell>
                          <TableCell className="font-mono">{fmt(socialAmt)}</TableCell>
                          <TableCell className="font-mono">{fmt(fundAmt)}</TableCell>
                          <TableCell className="font-mono font-bold">{fmt(socialAmt + fundAmt)}</TableCell>
                          <TableCell>
                            {row.dataSource === "carry_forward" ? (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">结转</Badge>
                            ) : row.dataSource === "import" ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">导入</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">{row.dataSource ?? "手工"}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 4: 个税计算表 */}
            <TabsContent value="tax">
              <div className="text-sm text-muted-foreground mb-2">
                个税累计预扣: {taxQuery.data?.length ?? 0} 条快照
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>月序</TableHead>
                      <TableHead>本月应纳税所得</TableHead>
                      <TableHead>累计收入(前)</TableHead>
                      <TableHead>累计减除(前)</TableHead>
                      <TableHead>累计已缴税(前)</TableHead>
                      <TableHead>专项附加扣除</TableHead>
                      <TableHead>本月个税</TableHead>
                      <TableHead>税率档</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!taxQuery.data || taxQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          暂无个税快照数据
                        </TableCell>
                      </TableRow>
                    )}
                    {taxQuery.data?.map((row: any) => {
                      const calc = calcResultsQuery.data?.find(
                        (c: any) => c.employeeId === row.employeeId || c.employeeName === row.employeeName
                      );
                      const bracket = Number(row.taxBracket ?? row.bracket ?? 0);
                      const bracketColor =
                        bracket <= 1 ? "bg-green-100 text-green-800" :
                        bracket <= 3 ? "bg-blue-100 text-blue-800" :
                        bracket <= 5 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800";
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium whitespace-nowrap">{row.employeeName ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{row.monthIndex ?? row.monthSeq ?? "\u2014"}</TableCell>
                          <TableCell className="font-mono">{fmt(row.taxableIncome ?? row.monthlyTaxable)}</TableCell>
                          <TableCell className="font-mono text-xs">{fmt(row.cumulativeIncome ?? row.priorCumIncome)}</TableCell>
                          <TableCell className="font-mono text-xs">{fmt(row.cumulativeDeduction ?? row.priorCumDeduction)}</TableCell>
                          <TableCell className="font-mono text-xs">{fmt(row.cumulativeTaxPaid ?? row.priorCumTax)}</TableCell>
                          <TableCell className="font-mono text-xs">{fmt(row.specialDeduction ?? row.additionalDeduction)}</TableCell>
                          <TableCell className="font-mono font-bold">{fmt(calc?.incomeTax ?? row.monthlyTax)}</TableCell>
                          <TableCell>
                            <Badge className={`${bracketColor} text-xs`}>
                              {bracket > 0 ? `${bracket}档` : "\u2014"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 5: 薪资汇总表 */}
            <TabsContent value="summary">
              <div className="text-sm text-muted-foreground mb-2">
                薪资汇总: {calcResultsQuery.data?.length ?? 0} 名员工
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>综合工资</TableHead>
                      <TableHead>绩效调整</TableHead>
                      <TableHead>考勤扣款</TableHead>
                      <TableHead>加班费</TableHead>
                      <TableHead>补贴</TableHead>
                      <TableHead>应发</TableHead>
                      <TableHead>社保公积金</TableHead>
                      <TableHead>个税</TableHead>
                      <TableHead>其它</TableHead>
                      <TableHead>实发</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!calcResultsQuery.data || calcResultsQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                          尚未执行计算
                        </TableCell>
                      </TableRow>
                    )}
                    {calcResultsQuery.data?.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium whitespace-nowrap">{row.employeeName}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell className="font-mono">{fmt(row.baseSalary ?? row.compositeSalary)}</TableCell>
                        <TableCell className="font-mono">
                          {fmt(Number(row.perfWage1 ?? 0) + Number(row.perfWage2 ?? 0) + Number(row.perfWage3 ?? 0))}
                        </TableCell>
                        <TableCell className="font-mono text-red-600">
                          {fmt(Number(row.personalLeaveDeduction ?? row.leaveDeduction ?? 0) + Number(row.sickLeaveDeduction ?? 0))}
                        </TableCell>
                        <TableCell className="font-mono">{fmt(row.overtimePay)}</TableCell>
                        <TableCell className="font-mono">{fmt(row.allowance ?? row.totalAllowance)}</TableCell>
                        <TableCell className="font-mono font-bold">{fmt(row.grossPay)}</TableCell>
                        <TableCell className="font-mono">{fmt(row.socialInsurance ?? row.socialFund)}</TableCell>
                        <TableCell className="font-mono">{fmt(row.incomeTax)}</TableCell>
                        <TableCell className="font-mono">{fmt(row.otherDeduction ?? row.other)}</TableCell>
                        <TableCell className="font-mono font-bold text-green-600">{fmt(row.netPay)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Footer totals row */}
                    {calcResultsQuery.data && calcResultsQuery.data.length > 0 && (() => {
                      const totals: Record<string, number> = (calcResultsQuery.data as unknown as Record<string, unknown>[]).reduce((acc: Record<string, number>, row: Record<string, unknown>) => ({
                        composite: acc.composite + Number(row.baseSalary ?? row.compositeSalary ?? 0),
                        perf: acc.perf + Number(row.perfWage1 ?? 0) + Number(row.perfWage2 ?? 0) + Number(row.perfWage3 ?? 0),
                        deductions: acc.deductions + Number(row.personalLeaveDeduction ?? row.leaveDeduction ?? 0) + Number(row.sickLeaveDeduction ?? 0),
                        ot: acc.ot + Number(row.overtimePay ?? 0),
                        allowance: acc.allowance + Number(row.allowance ?? row.totalAllowance ?? 0),
                        gross: acc.gross + Number(row.grossPay ?? 0),
                        social: acc.social + Number(row.socialInsurance ?? row.socialFund ?? 0),
                        tax: acc.tax + Number(row.incomeTax ?? 0),
                        other: acc.other + Number(row.otherDeduction ?? row.other ?? 0),
                        net: acc.net + Number(row.netPay ?? 0),
                      }), { composite: 0, perf: 0, deductions: 0, ot: 0, allowance: 0, gross: 0, social: 0, tax: 0, other: 0, net: 0 });
                      return (
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                          <TableCell>合计</TableCell>
                          <TableCell>{calcResultsQuery.data.length}人</TableCell>
                          <TableCell className="font-mono">{fmt(totals.composite)}</TableCell>
                          <TableCell className="font-mono">{fmt(totals.perf)}</TableCell>
                          <TableCell className="font-mono text-red-600">{fmt(totals.deductions)}</TableCell>
                          <TableCell className="font-mono">{fmt(totals.ot)}</TableCell>
                          <TableCell className="font-mono">{fmt(totals.allowance)}</TableCell>
                          <TableCell className="font-mono">{fmt(totals.gross)}</TableCell>
                          <TableCell className="font-mono">{fmt(totals.social)}</TableCell>
                          <TableCell className="font-mono">{fmt(totals.tax)}</TableCell>
                          <TableCell className="font-mono">{fmt(totals.other)}</TableCell>
                          <TableCell className="font-mono text-green-600">{fmt(totals.net)}</TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Zone>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 5: 异常与待处理区 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Zone title="Zone 5 \u2014 异常与待处理区" icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />} defaultOpen={true}>
        {!selectedCycleId ? (
          <p className="text-muted-foreground text-center py-8">请先选择工资周期</p>
        ) : (
          <div className="space-y-4">
            {/* Category stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(anomalyCategoryLabels).map(([cat, label]) => {
                const count = Array.isArray(anomalyStatsQuery.data)
                  ? (anomalyStatsQuery.data as unknown as Array<Record<string, unknown>>).find((s) => s.category === cat)?.count ?? 0
                  : (anomalyStatsQuery.data as unknown as Record<string, unknown> | undefined)?.[cat] ?? 0;
                return (
                  <Card key={cat} className={Number(count) > 0 ? "border-yellow-300" : ""}>
                    <CardContent className="pt-3 pb-3">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className={`text-xl font-bold ${Number(count) > 0 ? "text-yellow-600" : "text-green-600"}`}>
                        {String(count)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Anomaly table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>严重度</TableHead>
                    <TableHead>类别</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>建议措施</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!anomalyQuery.data || anomalyQuery.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                        暂无待处理异常
                      </TableCell>
                    </TableRow>
                  )}
                  {anomalyQuery.data?.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge className={severityColors[row.severity] ?? "bg-gray-100 text-gray-800"}>
                          {row.severity === "info" ? "提示" : row.severity === "warning" ? "警告" : row.severity === "critical" ? "严重" : row.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {anomalyCategoryLabels[row.category] ?? row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{row.title ?? "\u2014"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{row.description ?? "\u2014"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{row.suggestedAction ?? "\u2014"}</TableCell>
                      <TableCell>
                        {row.resolvedAt ? (
                          <Badge className="bg-green-100 text-green-800">已解决</Badge>
                        ) : (
                          <Button
                            size="sm" variant="outline"
                            disabled={resolveAnomalyMut.isPending}
                            onClick={() => resolveAnomalyMut.mutate({ id: row.id, resolution: "手动标记已解决" })}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />标记已解决
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Zone>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 6: 审批与锁账区 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Zone title="Zone 6 \u2014 审批与锁账区" icon={<Shield className="h-5 w-5 text-red-600" />} defaultOpen={true}>
        {!selectedCycleId ? (
          <p className="text-muted-foreground text-center py-8">请先选择工资周期</p>
        ) : (
          <Tabs value={zone6Tab} onValueChange={setZone6Tab}>
            <TabsList>
              <TabsTrigger value="approval">审批流</TabsTrigger>
              <TabsTrigger value="lock">锁定控制</TabsTrigger>
              <TabsTrigger value="metrics">发薪后复盘</TabsTrigger>
              <TabsTrigger value="regulatory">法规参数</TabsTrigger>
            </TabsList>

            {/* Tab: Approval Flow */}
            <TabsContent value="approval">
              <div className="space-y-4">
                {/* 4-step horizontal stepper */}
                <div className="flex items-center justify-center gap-0 py-4">
                  {(["hr_initial", "finance_review", "dept_manager_confirm", "exec_approve"] as const).map((stage, idx, arr) => {
                    const stageData = Array.isArray(approvalQuery.data)
                      ? (approvalQuery.data as unknown as Array<Record<string, unknown>>).find((a) => a.stage === stage)
                      : null;
                    const stageStatus = (stageData?.status as string) ?? "pending";
                    const isCurrent = (currentStageQuery.data as unknown as Record<string, unknown> | undefined)?.stage === stage;

                    return (
                      <div key={stage} className="flex items-center">
                        <div className={`flex flex-col items-center ${isCurrent ? "scale-110" : ""}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            stageStatus === "approved"
                              ? "bg-green-500 border-green-500 text-white"
                              : stageStatus === "rejected"
                                ? "bg-red-500 border-red-500 text-white"
                                : isCurrent
                                  ? "bg-blue-100 border-blue-500 text-blue-700"
                                  : "bg-gray-100 border-gray-300 text-gray-400"
                          }`}>
                            {stageStatus === "approved" ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : stageStatus === "rejected" ? (
                              <XCircle className="h-5 w-5" />
                            ) : (
                              <span className="text-sm font-bold">{idx + 1}</span>
                            )}
                          </div>
                          <div className={`text-xs mt-1 text-center whitespace-nowrap ${isCurrent ? "font-bold text-blue-700" : "text-muted-foreground"}`}>
                            {approvalStageLabels[stage]}
                          </div>
                          {stageData && (
                            <Badge className={`mt-1 text-[10px] ${approvalActionColors[stageStatus]}`}>
                              {approvalActionLabels[stageStatus] ?? stageStatus}
                            </Badge>
                          )}
                        </div>
                        {idx < arr.length - 1 && (
                          <ArrowRight className={`h-4 w-4 mx-3 ${stageStatus === "approved" ? "text-green-500" : "text-gray-300"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-3">
                  {!approvalQuery.data?.length && (
                    <Button
                      onClick={() => selectedCycleId && initFlowMut.mutate({ cycleId: selectedCycleId })}
                      disabled={initFlowMut.isPending}
                    >
                      {initFlowMut.isPending ? "发起中..." : "发起审批流"}
                    </Button>
                  )}
                  {(() => {
                    const currentStage = currentStageQuery.data as unknown as Record<string, unknown> | undefined;
                    return currentStage?.stage ? (
                    <>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => selectedCycleId && (approveMut.mutate as (input: unknown) => void)({
                          flowId: currentStage?.id,
                          cycleId: selectedCycleId,
                          stage: currentStage?.stage,
                        })}
                        disabled={approveMut.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approveMut.isPending ? "审批中..." : "审批通过"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => selectedCycleId && (rejectMut.mutate as (input: unknown) => void)({
                          flowId: currentStage?.id,
                          comment: "驳回",
                          cycleId: selectedCycleId,
                          stage: currentStage?.stage,
                        })}
                        disabled={rejectMut.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {rejectMut.isPending ? "驳回中..." : "驳回"}
                      </Button>
                    </>
                  ) : null;
                  })()}
                </div>

                {/* Approval history table */}
                {Array.isArray(approvalQuery.data) && approvalQuery.data.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>阶段</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>审批人</TableHead>
                        <TableHead>审批时间</TableHead>
                        <TableHead>备注</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(approvalQuery.data as unknown as Array<{ stage: string; status: string; approverName?: string; approvedAt?: string; comment?: string }>).map((row, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {approvalStageLabels[row.stage] ?? row.stage}
                          </TableCell>
                          <TableCell>
                            <Badge className={approvalActionColors[row.status] ?? ""}>
                              {approvalActionLabels[row.status] ?? row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.approverName ?? "\u2014"}</TableCell>
                          <TableCell className="text-xs">
                            {row.approvedAt ? new Date(row.approvedAt).toLocaleString("zh-CN") : "\u2014"}
                          </TableCell>
                          <TableCell className="text-sm">{row.comment ?? "\u2014"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Tab: Lock Controls */}
            <TabsContent value="lock">
              <div className="space-y-4">
                <CardDescription>锁定后该类数据不可修改，需解锁后方可调整。</CardDescription>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {(["performance", "salary", "tax", "adjustment", "full"] as const).map((lockType) => {
                    const lockData = Array.isArray(lockQuery.data)
                      ? (lockQuery.data as unknown as Array<{ id?: number; lockType: string; isLocked?: boolean; locked?: boolean }>).find((l) => l.lockType === lockType)
                      : null;
                    const isLocked = lockData?.isLocked ?? lockData?.locked ?? false;

                    return (
                      <Card key={lockType} className={isLocked ? "border-red-300 bg-red-50" : ""}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{lockTypeLabels[lockType]}</span>
                            {isLocked ? (
                              <Lock className="h-4 w-4 text-red-600" />
                            ) : (
                              <Unlock className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <Badge className={isLocked ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}>
                            {isLocked ? "已锁定" : "未锁定"}
                          </Badge>
                          <div className="mt-3">
                            {isLocked ? (
                              <Button
                                size="sm" variant="outline" className="w-full"
                                disabled={unlockMut.isPending}
                                onClick={() => selectedCycleId && (unlockMut.mutate as (input: unknown) => void)({
                                  lockId: lockData?.id,
                                  cycleId: selectedCycleId,
                                  lockType,
                                })}
                              >
                                <Unlock className="h-3 w-3 mr-1" />解锁
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="destructive" className="w-full"
                                disabled={lockMut.isPending}
                                onClick={() => selectedCycleId && lockMut.mutate({
                                  cycleId: selectedCycleId,
                                  lockType,
                                })}
                              >
                                <Lock className="h-3 w-3 mr-1" />锁定
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Post-Payout Metrics */}
            <TabsContent value="metrics">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <CardDescription>发薪后复盘指标 \u2014 对比预算/历史/合规率</CardDescription>
                  <Button
                    variant="outline"
                    onClick={() => selectedCycleId && generateMetricsMut.mutate({ cycleId: selectedCycleId })}
                    disabled={generateMetricsMut.isPending}
                  >
                    {generateMetricsMut.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />生成中...</>
                    ) : (
                      <><BarChart3 className="h-4 w-4 mr-2" />生成复盘指标</>
                    )}
                  </Button>
                </div>

                {(!metricsQuery.data || (Array.isArray(metricsQuery.data) && metricsQuery.data.length === 0)) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>尚未生成复盘指标。完成发薪后点击"生成复盘指标"。</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>指标名称</TableHead>
                          <TableHead>数值</TableHead>
                          <TableHead>部门</TableHead>
                          <TableHead>说明</TableHead>
                          <TableHead>生成时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Array.isArray(metricsQuery.data) ? metricsQuery.data : [metricsQuery.data]).map((row: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.metricName ?? row.name ?? "\u2014"}</TableCell>
                            <TableCell className="font-mono font-bold">{row.value != null ? fmt(row.value) : "\u2014"}</TableCell>
                            <TableCell>{row.department ?? "全公司"}</TableCell>
                            <TableCell className="text-sm">{row.description ?? "\u2014"}</TableCell>
                            <TableCell className="text-xs">
                              {row.createdAt ? new Date(row.createdAt).toLocaleString("zh-CN") : "\u2014"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Regulatory Params */}
            <TabsContent value="regulatory">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>法规公式参数 (可更新)</CardTitle>
                    <CardDescription>
                      法规更新时在此管理新版本。计算引擎自动使用默认值，DB覆盖优先。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Tax brackets */}
                    <div>
                      <h4 className="font-semibold mb-2">个人所得税阶梯 — 《个人所得税法》2019年修正</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>累计应纳税所得额(年)</TableHead>
                            <TableHead>税率</TableHead>
                            <TableHead>速算扣除数</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { range: "0 ~ 36,000", rate: "3%", qd: "0" },
                            { range: "36,000 ~ 144,000", rate: "10%", qd: "2,520" },
                            { range: "144,000 ~ 300,000", rate: "20%", qd: "16,920" },
                            { range: "300,000 ~ 420,000", rate: "25%", qd: "31,920" },
                            { range: "420,000 ~ 660,000", rate: "30%", qd: "52,920" },
                            { range: "660,000 ~ 960,000", rate: "35%", qd: "85,920" },
                            { range: "960,000+", rate: "45%", qd: "181,920" },
                          ].map((b, i) => (
                            <TableRow key={i}>
                              <TableCell>{b.range}</TableCell>
                              <TableCell className="font-mono">{b.rate}</TableCell>
                              <TableCell className="font-mono">{b.qd}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <p className="text-xs text-muted-foreground mt-1">每月基本减除费用: 5,000元 | 来源: 《个税法》第6条</p>
                    </div>

                    {/* GRT internal formulas */}
                    <div>
                      <h4 className="font-semibold mb-2">GRT内部公式 (不变量)</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>公式编号</TableHead>
                            <TableHead>公式</TableHead>
                            <TableHead>来源</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { id: "F-1", formula: "事假扣款 = 事假小时 × (基本工资 / 116)", source: "GRT内部制度" },
                            { id: "F-2", formula: "病假扣款 = 病假小时 × 时薪 × 0.1962", source: "上海市标准" },
                            { id: "F-3", formula: "加班费 = 时薪 × 倍数 (1.5/2.0/3.0)", source: "《劳动法》第44条" },
                            { id: "F-4", formula: "绩效1系数 = IF(分<75,0,IF(分>avg24+3 OR 分>avg25,1,0))", source: "CEO审定" },
                            { id: "F-5", formula: "绩效2系数 = IF(分≥avg25,1,IF(avg25-分≤3,0.5,0))", source: "CEO审定" },
                            { id: "F-6", formula: "绩效3系数 = 手动(CEO审批), 默认0", source: "CEO审定" },
                            { id: "F-7", formula: "个税: 累计预扣法 7级超额累进", source: "《个税法》2019" },
                          ].map((f, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{f.id}</TableCell>
                              <TableCell className="text-sm">{f.formula}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{f.source}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Invariants */}
                    <div>
                      <h4 className="font-semibold mb-2">不变量 (Invariants)</h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex gap-2"><Badge variant="secondary" className="text-xs">I-1</Badge> 货币精度: 内部整数(分), DB边界 DECIMAL(14,2)</div>
                        <div className="flex gap-2"><Badge variant="secondary" className="text-xs">I-2</Badge> 综合工资 = 基本工资 + 岗位工资 + 技能补贴 + 周六固定</div>
                        <div className="flex gap-2"><Badge variant="secondary" className="text-xs">I-3</Badge> 应发 = 综合工资 + 绩效调整 - 事假扣 - 病假扣 + 加班费 + 全勤奖 + 考核奖金</div>
                        <div className="flex gap-2"><Badge variant="secondary" className="text-xs">I-4</Badge> 实发 = 应发 + 其它 - 社保 - 公积金 - 个税</div>
                        <div className="flex gap-2"><Badge variant="secondary" className="text-xs">I-5</Badge> 包薪制(CEO/CFO): 应发=综合工资, 无组件拆分</div>
                        <div className="flex gap-2"><Badge variant="secondary" className="text-xs">I-6</Badge> 202601种子数据: 47社保+9绩效+35现金补贴+16出差车补+9个税快照</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Zone>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
          {icon}
          {label}
        </div>
        <div className={`text-2xl font-bold ${color ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function CompletenessBar({ label, count, total, pct }: { label: string; count: number; total: number; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} 已导入</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="text-xs text-muted-foreground text-right">{pct}% ({count}/{total})</div>
    </div>
  );
}

function DiffCell({ value }: { value: number }) {
  return (
    <TableCell className={`font-mono text-xs ${value !== 0 ? "text-red-600 font-bold" : ""}`}>
      {fmt(value)}
    </TableCell>
  );
}
