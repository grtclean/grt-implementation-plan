import { useState, useMemo, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useLanguage } from "../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  Plus,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
  Send,
  ShieldCheck,
  Crown,
  ArrowRight,
  AlertTriangle,
  Snowflake,
  Wrench,
  Zap,
  Eye,
  Radar,
  Activity,
  Brain,
  MessageSquare,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────

const DEPARTMENTS = [
  { id: "bu2", name: "事业二部", nameEn: "BU-2" },
  { id: "bu3", name: "事业三部", nameEn: "BU-3" },
  { id: "bu4", name: "事业四部", nameEn: "BU-4" },
  { id: "bu5", name: "事业五部", nameEn: "BU-5" },
  { id: "overseas", name: "海外事业部", nameEn: "Overseas BU" },
];

const STATUS_MAP: Record<string, { label: string; labelEn: string; color: string }> = {
  draft: { label: "草稿", labelEn: "Draft", color: "bg-gray-100 text-gray-700" },
  submitted: { label: "已提交", labelEn: "Submitted", color: "bg-blue-100 text-blue-700" },
  finance_approved: { label: "财务已审", labelEn: "Finance OK", color: "bg-cyan-100 text-cyan-700" },
  approved: { label: "已审批", labelEn: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "已驳回", labelEn: "Rejected", color: "bg-red-100 text-red-700" },
  pending: { label: "待审批", labelEn: "Pending", color: "bg-yellow-100 text-yellow-700" },
};

const EXCEPTION_TAGS = [
  { id: "spring_festival", name: "春节", nameEn: "Spring Festival", icon: Snowflake },
  { id: "equipment_overhaul", name: "设备大修", nameEn: "Equipment Overhaul", icon: Wrench },
  { id: "market_shock", name: "市场冲击", nameEn: "Market Shock", icon: Zap },
  { id: "policy_change", name: "政策变动", nameEn: "Policy Change", icon: AlertTriangle },
];

const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const MONTH_LABELS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Six capability dimensions for radar chart
const CAPABILITY_DIMS = [
  { key: "leadership", zh: "领导力", en: "Leadership" },
  { key: "execution", zh: "执行力", en: "Execution" },
  { key: "innovation", zh: "创新力", en: "Innovation" },
  { key: "collaboration", zh: "协作力", en: "Collaboration" },
  { key: "learning", zh: "学习力", en: "Learning" },
  { key: "resilience", zh: "抗压力", en: "Resilience" },
];

// ── Main Component ─────────────────────────────────────────

export default function BUSalesTargetPlanner() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // View state
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "finetune" | "approval" | "capability">("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [reviewDialogId, setReviewDialogId] = useState<number | null>(null);
  const [reviewStep, setReviewStep] = useState<"finance" | "ceo">("finance");
  const [reviewComment, setReviewComment] = useState("");
  const [editingDetailId, setEditingDetailId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Fine-tuning workbench state
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"normal" | "exception">("normal");
  const [exceptionTag, setExceptionTag] = useState("");
  const [draftChanges, setDraftChanges] = useState<Record<number, { salesTarget: number; outputTarget: number }>>({});

  // AI sandbox state
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);

  // Form state for creation
  const [formYear, setFormYear] = useState(2026);
  const [formDept, setFormDept] = useState("bu2");
  const [formSalesTarget, setFormSalesTarget] = useState("10000000");
  const [formOutputTarget, setFormOutputTarget] = useState("8000000");
  const [formG1, setFormG1] = useState("20");
  const [formG2, setFormG2] = useState("20");
  const [formG3, setFormG3] = useState("10");

  // ── Queries ──
  const dashboardQuery = trpc.buSalesTarget.dashboard.useQuery();
  const listQuery = trpc.buSalesTarget.list.useQuery();
  const detailQuery = trpc.buSalesTarget.getById.useQuery(
    { id: selectedPlanId! },
    { enabled: selectedPlanId !== null }
  );
  const pendingReviewsQuery = trpc.buSalesTarget.pendingReviews.useQuery();

  // ── Mutations (with error alerts) ──
  const onErr = (e: { message: string }) => { alert(e.message); };
  const createMutation = trpc.buSalesTarget.create.useMutation({
    onSuccess: () => { setCreateOpen(false); listQuery.refetch(); dashboardQuery.refetch(); },
    onError: onErr,
  });
  const updateDetailMutation = trpc.buSalesTarget.updateDetail.useMutation({
    onSuccess: () => { setEditingDetailId(null); setEditValues({}); detailQuery.refetch(); },
    onError: onErr,
  });
  const submitPlanMutation = trpc.buSalesTarget.submitPlan.useMutation({
    onSuccess: () => { detailQuery.refetch(); listQuery.refetch(); },
    onError: onErr,
  });
  const submitAdjustmentMutation = trpc.buSalesTarget.submitAdjustment.useMutation({
    onSuccess: () => {
      setAdjustOpen(false); setAdjustReason(""); setDraftChanges({});
      detailQuery.refetch(); pendingReviewsQuery.refetch();
    },
    onError: onErr,
  });
  const financeReviewMutation = trpc.buSalesTarget.financeReview.useMutation({
    onSuccess: () => { setReviewDialogId(null); setReviewComment(""); detailQuery.refetch(); pendingReviewsQuery.refetch(); listQuery.refetch(); },
    onError: onErr,
  });
  const ceoReviewMutation = trpc.buSalesTarget.ceoReview.useMutation({
    onSuccess: () => { setReviewDialogId(null); setReviewComment(""); detailQuery.refetch(); pendingReviewsQuery.refetch(); listQuery.refetch(); },
    onError: onErr,
  });
  const deleteMutation = trpc.buSalesTarget.delete.useMutation({
    onSuccess: () => { setSelectedPlanId(null); listQuery.refetch(); dashboardQuery.refetch(); },
    onError: onErr,
  });

  // ── Derived data (with safe fallbacks) ──
  const queryError = dashboardQuery.error || listQuery.error || detailQuery.error || pendingReviewsQuery.error;
  const dashboard = dashboardQuery.data;
  const plans = listQuery.data?.items ?? [];
  const detail = detailQuery.data;
  const pendingReviews = pendingReviewsQuery.data ?? [];

  const deptName = (id: string) => {
    const d = DEPARTMENTS.find((x) => x.id === id);
    return d ? (isZh ? d.name : d.nameEn) : id;
  };

  const statusBadge = (s: string) => {
    const info = STATUS_MAP[s] ?? STATUS_MAP.draft;
    return <Badge className={info.color}>{isZh ? info.label : info.labelEn}</Badge>;
  };

  // ── Zero-sum computation ──
  const originalTotals = useMemo(() => {
    if (!detail?.details) return { sales: 0, output: 0 };
    return {
      sales: detail.details.reduce((s, d) => s + Number(d.salesTarget ?? 0), 0),
      output: detail.details.reduce((s, d) => s + Number(d.outputTarget ?? 0), 0),
    };
  }, [detail?.details]);

  const draftTotals = useMemo(() => {
    if (!detail?.details) return { sales: 0, output: 0 };
    return {
      sales: detail.details.reduce((s, d) => {
        const override = draftChanges[d.id];
        return s + (override ? override.salesTarget : Number(d.salesTarget ?? 0));
      }, 0),
      output: detail.details.reduce((s, d) => {
        const override = draftChanges[d.id];
        return s + (override ? override.outputTarget : Number(d.outputTarget ?? 0));
      }, 0),
    };
  }, [detail?.details, draftChanges]);

  const salesDelta = draftTotals.sales - originalTotals.sales;
  const outputDelta = draftTotals.output - originalTotals.output;
  const isZeroSum = adjustType === "exception" || (Math.abs(salesDelta) < 0.01 && Math.abs(outputDelta) < 0.01);
  const hasDraftChanges = Object.keys(draftChanges).length > 0;

  // ── Handlers ──
  const handleCreate = () => {
    createMutation.mutate({
      year: formYear, departmentId: formDept,
      totalSalesTarget: Number(formSalesTarget), totalOutputTarget: Number(formOutputTarget),
      growthRules: { Q2_vs_Q1: Number(formG1) / 100, Q3_vs_Q2: Number(formG2) / 100, Q4_vs_Q3: Number(formG3) / 100 },
    });
  };

  const handleSaveDetail = (detailId: number) => {
    updateDetailMutation.mutate({
      detailId,
      salesTarget: editValues.salesTarget ? Number(editValues.salesTarget) : undefined,
      outputTarget: editValues.outputTarget ? Number(editValues.outputTarget) : undefined,
      kpiTarget: editValues.kpiTarget ? Number(editValues.kpiTarget) : undefined,
      capabilityLevel: editValues.capabilityLevel ? Number(editValues.capabilityLevel) : undefined,
    });
  };

  const handleSubmitAdjustment = () => {
    if (!selectedPlanId || !adjustReason.trim() || !detail?.details) return;
    const originalDetails = detail.details.map((d) => ({
      detailId: d.id, month: d.periodValue ?? 0,
      salesTarget: Number(d.salesTarget ?? 0), outputTarget: Number(d.outputTarget ?? 0),
      kpiTarget: Number(d.kpiTarget ?? 0), capabilityLevel: Number(d.capabilityLevel ?? 0),
    }));
    const proposedDetails = detail.details.map((d) => {
      const override = draftChanges[d.id];
      return {
        detailId: d.id, month: d.periodValue ?? 0,
        salesTarget: override ? override.salesTarget : Number(d.salesTarget ?? 0),
        outputTarget: override ? override.outputTarget : Number(d.outputTarget ?? 0),
        kpiTarget: Number(d.kpiTarget ?? 0), capabilityLevel: Number(d.capabilityLevel ?? 0),
      };
    });
    submitAdjustmentMutation.mutate({
      buSalesPlanId: selectedPlanId, applicantId: "current-user",
      adjustmentReason: adjustReason, adjustmentType: adjustType,
      exceptionTag: adjustType === "exception" ? exceptionTag : undefined,
      originalDetails, proposedDetails,
    });
  };

  const handleAiSend = useCallback(() => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setAiInput("");
    // Mock AI response based on keywords
    setTimeout(() => {
      let response: string;
      if (/radar|雷达|能力/.test(userMsg)) {
        response = isZh
          ? "当前事业部经理六大能力评估：领导力 L2.8、执行力 L3.1、创新力 L2.5、协作力 L2.9、学习力 L3.0、抗压力 L2.7。整体低于Q3目标 L2.75，建议加强创新力和抗压力培训。"
          : "Current BU manager six capability assessment: Leadership L2.8, Execution L3.1, Innovation L2.5, Collaboration L2.9, Learning L3.0, Resilience L2.7. Overall below Q3 target L2.75, recommend strengthening innovation and resilience training.";
      } else if (/预测|forecast|趋势|trend/.test(userMsg)) {
        response = isZh
          ? "基于当前增长曲线，Q3销售达成率预计87%，建议：1) 海外订单增补15%弥补国内春节缺口；2) Q2提前储备产能应对Q3旺季。"
          : "Based on current growth curve, Q3 sales achievement rate estimated 87%. Suggest: 1) Supplement overseas orders by 15% to cover Spring Festival gap; 2) Pre-stock Q2 capacity for Q3 peak season.";
      } else if (/风险|risk|exception|例外/.test(userMsg)) {
        response = isZh
          ? "识别到2个风险因素：1) 2月春节影响产值约-18%（可申请例外标签）；2) 5月设备大修计划导致Q2产值下降。建议提前申请例外调整，将Q1/Q2缺口分摊至Q3/Q4。"
          : "2 risk factors identified: 1) Feb Spring Festival impacts output ~-18% (exception tag available); 2) May equipment overhaul reduces Q2 output. Suggest filing exception adjustment to redistribute Q1/Q2 gaps to Q3/Q4.";
      } else {
        response = isZh
          ? "我可以帮助分析目标达成趋势、能力评估雷达图、风险预警等。请输入具体问题，如「预测Q3达成率」或「分析能力差距」。"
          : "I can help analyze target achievement trends, capability radar, risk alerts, etc. Please ask specific questions like 'forecast Q3 achievement' or 'analyze capability gaps'.";
      }
      setAiMessages((prev) => [...prev, { role: "ai", text: response }]);
    }, 800);
  }, [aiInput, isZh]);

  // ── SVG helpers ──
  const maxSales = Math.max(...(detail?.details ?? []).map((d) => Number(d.salesTarget ?? 0)), 1);
  const maxOutput = Math.max(...(detail?.details ?? []).map((d) => Number(d.outputTarget ?? 0)), 1);
  const barW = 36;
  const chartH = 150;
  const chartW = 12 * (barW + 10) + 20;

  // Radar chart geometry
  const radarR = 80;
  const radarCx = 100;
  const radarCy = 100;
  const radarAngle = (i: number) => (Math.PI * 2 * i) / 6 - Math.PI / 2;
  const radarPoint = (i: number, val: number) => {
    const a = radarAngle(i);
    const r = (val / 5) * radarR;
    return { x: radarCx + r * Math.cos(a), y: radarCy + r * Math.sin(a) };
  };

  // Mock capability data per quarter
  const capabilityData = [
    { q: "Q1", actual: [2.1, 2.4, 1.8, 2.2, 2.5, 2.0], target: [2.25, 2.25, 2.25, 2.25, 2.25, 2.25] },
    { q: "Q2", actual: [2.5, 2.7, 2.1, 2.6, 2.8, 2.3], target: [2.50, 2.50, 2.50, 2.50, 2.50, 2.50] },
    { q: "Q3", actual: [2.8, 3.1, 2.5, 2.9, 3.0, 2.7], target: [2.75, 2.75, 2.75, 2.75, 2.75, 2.75] },
    { q: "Q4", actual: [3.1, 3.3, 2.8, 3.2, 3.2, 3.0], target: [3.00, 3.00, 3.00, 3.00, 3.00, 3.00] },
  ];
  const [selectedQuarter, setSelectedQuarter] = useState(0);

  // Trend line chart data (6 dims × 4 quarters)
  const trendChartW = 360;
  const trendChartH = 140;

  // ── Tabs ──
  const tabs = [
    { id: "overview" as const, label: isZh ? "月度总览" : "Monthly Overview", icon: Eye },
    { id: "finetune" as const, label: isZh ? "目标微调" : "Fine-tune", icon: Target },
    { id: "approval" as const, label: isZh ? "审批流转" : "Approvals", icon: ShieldCheck },
    { id: "capability" as const, label: isZh ? "能力看板" : "Capability", icon: Radar },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Query error inline banner — never crashes, never redirects */}
      {queryError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-semibold text-red-700">{isZh ? "数据加载异常（页面功能可能受限）" : "Data loading error (page may have limited functionality)"}</p>
          <p className="mt-1 text-red-600 font-mono text-xs">{queryError.message}</p>
          <button onClick={() => { dashboardQuery.refetch(); listQuery.refetch(); }} className="mt-2 rounded bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200">
            {isZh ? "重新加载" : "Retry"}
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{isZh ? "事业部目标分解" : "BU Target Breakdown"}</h1>
          <p className="text-sm text-muted-foreground">
            {isZh ? "年度销售/产值目标按月分解 · 零和微调 · 审批流转 · 能力动态看板" : "Annual target monthly breakdown · Zero-sum fine-tuning · Approval workflow · Capability dashboard"}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "计划总数" : "Total Plans"}</p>
              <p className="text-2xl font-bold">{dashboard?.totalPlans ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "销售目标合计" : "Total Sales Target"}</p>
              <p className="text-2xl font-bold">
                ¥{((dashboard?.totalSalesTarget ?? 0) / 10000).toFixed(0)}{isZh ? "万" : "w"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BarChart3 className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "产值目标合计" : "Total Output Target"}</p>
              <p className="text-2xl font-bold">
                ¥{((dashboard?.totalOutputTarget ?? 0) / 10000).toFixed(0)}{isZh ? "万" : "w"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldCheck className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "待审批" : "Pending Reviews"}</p>
              <p className="text-2xl font-bold">{dashboard?.pendingApprovals ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan List + Create */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{isZh ? "目标计划" : "Target Plans"}</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />{isZh ? "新建计划" : "New Plan"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{isZh ? "新建目标计划" : "Create Target Plan"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{isZh ? "年份" : "Year"}</Label>
                <Input type="number" value={formYear} onChange={(e) => setFormYear(Number(e.target.value))} />
              </div>
              <div>
                <Label>{isZh ? "事业部" : "Department"}</Label>
                <select className="w-full rounded border px-3 py-2 text-sm" value={formDept} onChange={(e) => setFormDept(e.target.value)}>
                  {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{isZh ? d.name : d.nameEn}</option>)}
                </select>
              </div>
              <div>
                <Label>{isZh ? "年度销售目标 (¥)" : "Annual Sales Target (¥)"}</Label>
                <Input value={formSalesTarget} onChange={(e) => setFormSalesTarget(e.target.value)} />
              </div>
              <div>
                <Label>{isZh ? "年度产值目标 (¥)" : "Annual Output Target (¥)"}</Label>
                <Input value={formOutputTarget} onChange={(e) => setFormOutputTarget(e.target.value)} />
              </div>
              <Separator />
              <p className="text-sm font-medium">{isZh ? "季度增长率 (%)" : "Quarterly Growth Rate (%)"}</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Q2 vs Q1</Label><Input value={formG1} onChange={(e) => setFormG1(e.target.value)} /></div>
                <div><Label className="text-xs">Q3 vs Q2</Label><Input value={formG2} onChange={(e) => setFormG2(e.target.value)} /></div>
                <div><Label className="text-xs">Q4 vs Q3</Label><Input value={formG3} onChange={(e) => setFormG3(e.target.value)} /></div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? (isZh ? "创建中..." : "Creating...") : (isZh ? "创建并分解" : "Create & Decompose")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {isZh ? "暂无目标计划，点击上方「新建计划」开始" : "No plans yet. Click \"New Plan\" to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer transition hover:shadow-md ${selectedPlanId === p.id ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => { setSelectedPlanId(p.id); setDraftChanges({}); }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{deptName(p.departmentId)}</span>
                  {statusBadge(p.status ?? "draft")}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.year} {isZh ? "年" : ""}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{isZh ? "销售" : "Sales"}: </span>
                    <span className="font-medium">¥{(Number(p.totalSalesTarget ?? 0) / 10000).toFixed(0)}{isZh ? "万" : "w"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "产值" : "Output"}: </span>
                    <span className="font-medium">¥{(Number(p.totalOutputTarget ?? 0) / 10000).toFixed(0)}{isZh ? "万" : "w"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════ Selected Plan Detail ═══════════ */}
      {selectedPlanId && detail && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {deptName(detail.plan.departmentId)} — {detail.plan.year}{isZh ? " 年" : ""}
            </h2>
            <div className="flex items-center gap-2">
              {detail.plan.status === "draft" && (
                <Button size="sm" variant="outline" onClick={() => submitPlanMutation.mutate({ planId: selectedPlanId, submittedBy: "current-user" })}>
                  <Send className="mr-1 h-4 w-4" />{isZh ? "提交审批" : "Submit"}
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => { if (confirm(isZh ? "确定删除此计划？" : "Delete this plan?")) deleteMutation.mutate({ id: selectedPlanId }); }}>
                <Trash2 className="mr-1 h-4 w-4" />{isZh ? "删除" : "Delete"}
              </Button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${activeTab === t.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <t.icon className="h-4 w-4" />{t.label}
              </button>
            ))}
          </div>

          {/* ─── Tab: Overview ─── */}
          {activeTab === "overview" && (
            <>
              {/* Bar Charts */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      {isZh ? "月度销售目标分布" : "Monthly Sales Target"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <svg width={chartW} height={chartH + 30} className="block">
                      {detail.details.map((d, i) => {
                        const val = Number(d.salesTarget ?? 0);
                        const h = (val / maxSales) * chartH;
                        const x = i * (barW + 10) + 10;
                        const quarter = Math.floor(i / 3);
                        const colors = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
                        return (
                          <g key={d.id}>
                            <rect x={x} y={chartH - h} width={barW} height={h} fill={colors[quarter]} rx={3} opacity={d.isAdjusted ? 1 : 0.75} />
                            <text x={x + barW / 2} y={chartH - h - 4} textAnchor="middle" className="text-[9px] fill-muted-foreground">{(val / 10000).toFixed(0)}</text>
                            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" className="text-[10px] fill-muted-foreground">{isZh ? MONTH_LABELS[i] : MONTH_LABELS_EN[i]}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      {isZh ? "月度产值目标分布" : "Monthly Output Target"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <svg width={chartW} height={chartH + 30} className="block">
                      {detail.details.map((d, i) => {
                        const val = Number(d.outputTarget ?? 0);
                        const h = (val / maxOutput) * chartH;
                        const x = i * (barW + 10) + 10;
                        const quarter = Math.floor(i / 3);
                        const colors = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];
                        return (
                          <g key={d.id}>
                            <rect x={x} y={chartH - h} width={barW} height={h} fill={colors[quarter]} rx={3} opacity={d.isAdjusted ? 1 : 0.75} />
                            <text x={x + barW / 2} y={chartH - h - 4} textAnchor="middle" className="text-[9px] fill-muted-foreground">{(val / 10000).toFixed(0)}</text>
                            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" className="text-[10px] fill-muted-foreground">{isZh ? MONTH_LABELS[i] : MONTH_LABELS_EN[i]}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </CardContent>
                </Card>
              </div>

              {/* Detail Table */}
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left">{isZh ? "月份" : "Month"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "销售目标" : "Sales"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "产值目标" : "Output"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "KPI基线" : "KPI"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "能力等级" : "Cap Lv"}</th>
                        <th className="px-3 py-2 text-center">{isZh ? "状态" : "Status"}</th>
                        <th className="px-3 py-2 text-center">{isZh ? "操作" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.details.map((d) => {
                        const isEditing = editingDetailId === d.id;
                        const mLabel = isZh ? MONTH_LABELS[(d.periodValue ?? 1) - 1] : MONTH_LABELS_EN[(d.periodValue ?? 1) - 1];
                        return (
                          <tr key={d.id} className="border-b hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium">{mLabel}</td>
                            <td className="px-3 py-2 text-right">
                              {isEditing ? (
                                <Input className="h-7 w-28 text-right" defaultValue={d.salesTarget ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, salesTarget: e.target.value }))} />
                              ) : `¥${Number(d.salesTarget ?? 0).toLocaleString()}`}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {isEditing ? (
                                <Input className="h-7 w-28 text-right" defaultValue={d.outputTarget ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, outputTarget: e.target.value }))} />
                              ) : `¥${Number(d.outputTarget ?? 0).toLocaleString()}`}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {isEditing ? (
                                <Input className="h-7 w-20 text-right" defaultValue={d.kpiTarget ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, kpiTarget: e.target.value }))} />
                              ) : d.kpiTarget ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {isEditing ? (
                                <Input className="h-7 w-20 text-right" defaultValue={d.capabilityLevel ?? ""} onChange={(e) => setEditValues((v) => ({ ...v, capabilityLevel: e.target.value }))} />
                              ) : d.capabilityLevel ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {d.isAdjusted && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">{isZh ? "已微调" : "Adjusted"}</Badge>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleSaveDetail(d.id)}><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingDetailId(null); setEditValues({}); }}><AlertCircle className="h-4 w-4 text-gray-400" /></Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingDetailId(d.id); setEditValues({}); }}><Pencil className="h-4 w-4" /></Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── Tab: Fine-tune (Phase 2) ─── */}
          {activeTab === "finetune" && (
            <>
              {/* Zero-sum status bar */}
              <Card className={`border-2 ${isZeroSum ? "border-green-300 bg-green-50/50" : "border-red-300 bg-red-50/50"}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {isZeroSum ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">{isZh ? "零和约束状态" : "Zero-Sum Constraint"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isZh
                          ? `销售差额: ${salesDelta >= 0 ? "+" : ""}${salesDelta.toFixed(2)} | 产值差额: ${outputDelta >= 0 ? "+" : ""}${outputDelta.toFixed(2)}`
                          : `Sales delta: ${salesDelta >= 0 ? "+" : ""}${salesDelta.toFixed(2)} | Output delta: ${outputDelta >= 0 ? "+" : ""}${outputDelta.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                  {adjustType === "exception" && (
                    <Badge className="bg-amber-100 text-amber-700">{isZh ? "例外模式 - 允许非零和" : "Exception Mode"}</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Adjustment type toggle + exception tags */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg border p-1">
                  <button
                    onClick={() => setAdjustType("normal")}
                    className={`rounded-md px-3 py-1 text-sm ${adjustType === "normal" ? "bg-blue-500 text-white" : "text-muted-foreground"}`}
                  >
                    {isZh ? "常规微调" : "Normal"}
                  </button>
                  <button
                    onClick={() => setAdjustType("exception")}
                    className={`rounded-md px-3 py-1 text-sm ${adjustType === "exception" ? "bg-amber-500 text-white" : "text-muted-foreground"}`}
                  >
                    {isZh ? "例外调整" : "Exception"}
                  </button>
                </div>
                {adjustType === "exception" && (
                  <div className="flex gap-2">
                    {EXCEPTION_TAGS.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setExceptionTag(tag.id)}
                        className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${exceptionTag === tag.id ? "border-amber-400 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:border-amber-300"}`}
                      >
                        <tag.icon className="h-3 w-3" />
                        {isZh ? tag.name : tag.nameEn}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Editable fine-tune table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{isZh ? "目标认领与微调工作台" : "Target Claim & Fine-tune Workbench"}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left">{isZh ? "月份" : "Month"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "原销售目标" : "Orig Sales"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "调整后销售" : "New Sales"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "原产值目标" : "Orig Output"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "调整后产值" : "New Output"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "销售差额" : "Sales Δ"}</th>
                        <th className="px-3 py-2 text-right">{isZh ? "产值差额" : "Output Δ"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.details.map((d) => {
                        const origSales = Number(d.salesTarget ?? 0);
                        const origOutput = Number(d.outputTarget ?? 0);
                        const override = draftChanges[d.id];
                        const newSales = override ? override.salesTarget : origSales;
                        const newOutput = override ? override.outputTarget : origOutput;
                        const sDelta = newSales - origSales;
                        const oDelta = newOutput - origOutput;
                        const mLabel = isZh ? MONTH_LABELS[(d.periodValue ?? 1) - 1] : MONTH_LABELS_EN[(d.periodValue ?? 1) - 1];

                        return (
                          <tr key={d.id} className={`border-b hover:bg-muted/30 ${override ? "bg-blue-50/50" : ""}`}>
                            <td className="px-3 py-2 font-medium">{mLabel}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">¥{origSales.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                className="h-7 w-28 text-right inline-block"
                                value={override ? override.salesTarget : origSales}
                                onChange={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  setDraftChanges((prev) => ({
                                    ...prev,
                                    [d.id]: { salesTarget: v, outputTarget: prev[d.id]?.outputTarget ?? origOutput },
                                  }));
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">¥{origOutput.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                className="h-7 w-28 text-right inline-block"
                                value={override ? override.outputTarget : origOutput}
                                onChange={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  setDraftChanges((prev) => ({
                                    ...prev,
                                    [d.id]: { salesTarget: prev[d.id]?.salesTarget ?? origSales, outputTarget: v },
                                  }));
                                }}
                              />
                            </td>
                            <td className={`px-3 py-2 text-right font-mono text-xs ${sDelta > 0 ? "text-green-600" : sDelta < 0 ? "text-red-600" : "text-gray-400"}`}>
                              {sDelta !== 0 ? `${sDelta > 0 ? "+" : ""}${sDelta.toLocaleString()}` : "—"}
                            </td>
                            <td className={`px-3 py-2 text-right font-mono text-xs ${oDelta > 0 ? "text-green-600" : oDelta < 0 ? "text-red-600" : "text-gray-400"}`}>
                              {oDelta !== 0 ? `${oDelta > 0 ? "+" : ""}${oDelta.toLocaleString()}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr className="border-t-2 font-semibold bg-muted/30">
                        <td className="px-3 py-2">{isZh ? "合计" : "Total"}</td>
                        <td className="px-3 py-2 text-right">¥{originalTotals.sales.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">¥{draftTotals.sales.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">¥{originalTotals.output.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">¥{draftTotals.output.toLocaleString()}</td>
                        <td className={`px-3 py-2 text-right font-mono ${Math.abs(salesDelta) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                          {salesDelta !== 0 ? `${salesDelta > 0 ? "+" : ""}${salesDelta.toFixed(2)}` : "0"}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${Math.abs(outputDelta) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                          {outputDelta !== 0 ? `${outputDelta > 0 ? "+" : ""}${outputDelta.toFixed(2)}` : "0"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Submit adjustment */}
              <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!hasDraftChanges || (!isZeroSum && adjustType === "normal")} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    {isZh ? "提交微调申请（进入审批流程）" : "Submit Adjustment (Enters Approval Flow)"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{isZh ? "确认微调提交" : "Confirm Adjustment Submission"}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    {/* Approval flow diagram */}
                    <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        <Send className="h-3 w-3" />{isZh ? "提交" : "Submit"}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-1.5 rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
                        <ShieldCheck className="h-3 w-3" />{isZh ? "财务/PMO初审" : "Finance/PMO"}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        <Crown className="h-3 w-3" />{isZh ? "CEO终审" : "CEO Final"}
                      </div>
                    </div>

                    {adjustType === "exception" && exceptionTag && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-medium text-amber-700">
                          {isZh ? "例外标签" : "Exception Tag"}: {EXCEPTION_TAGS.find((t) => t.id === exceptionTag)?.[isZh ? "name" : "nameEn"]}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          {isZh ? "该调整不要求零和平衡，但需额外审核理由" : "This adjustment bypasses zero-sum but requires extra review justification"}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label>{isZh ? "微调原因说明" : "Adjustment Reason"}</Label>
                      <Textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder={isZh ? "说明微调原因，例如：春节期间2月产能下降，需将15%产值转移至3月..." : "Explain reason, e.g.: Feb capacity drops during Spring Festival, need to shift 15% output to March..."} rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded border p-2">
                        <p className="text-xs text-muted-foreground">{isZh ? "销售目标差额" : "Sales Delta"}</p>
                        <p className={`font-mono font-semibold ${Math.abs(salesDelta) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                          {salesDelta >= 0 ? "+" : ""}{salesDelta.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded border p-2">
                        <p className="text-xs text-muted-foreground">{isZh ? "产值目标差额" : "Output Delta"}</p>
                        <p className={`font-mono font-semibold ${Math.abs(outputDelta) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                          {outputDelta >= 0 ? "+" : ""}{outputDelta.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <Button className="w-full" onClick={handleSubmitAdjustment} disabled={submitAdjustmentMutation.isPending || !adjustReason.trim()}>
                      {submitAdjustmentMutation.isPending ? (isZh ? "提交中..." : "Submitting...") : (isZh ? "确认提交" : "Confirm Submit")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* ─── Tab: Approval (Phase 1) ─── */}
          {activeTab === "approval" && (
            <>
              {/* Approval flow diagram */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{isZh ? "审批流转" : "Approval Workflow"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-4 py-4">
                    <div className="text-center">
                      <div className={`mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full ${detail.plan.status !== "draft" ? "bg-green-100" : "bg-gray-100"}`}>
                        <Send className={`h-5 w-5 ${detail.plan.status !== "draft" ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <p className="text-xs">{isZh ? "事业部提交" : "BU Submit"}</p>
                    </div>
                    <div className={`h-0.5 w-12 ${detail.plan.status !== "draft" ? "bg-green-400" : "bg-gray-200"}`} />
                    <div className="text-center">
                      <div className={`mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full ${detail.plan.status === "finance_approved" || detail.plan.status === "approved" ? "bg-cyan-100" : detail.plan.status === "submitted" ? "bg-cyan-100 ring-2 ring-cyan-400 animate-pulse" : "bg-gray-100"}`}>
                        <ShieldCheck className={`h-5 w-5 ${detail.plan.status === "finance_approved" || detail.plan.status === "approved" ? "text-cyan-600" : detail.plan.status === "submitted" ? "text-cyan-600" : "text-gray-400"}`} />
                      </div>
                      <p className="text-xs">{isZh ? "财务/PMO初审" : "Finance/PMO"}</p>
                    </div>
                    <div className={`h-0.5 w-12 ${detail.plan.status === "finance_approved" || detail.plan.status === "approved" ? "bg-cyan-400" : "bg-gray-200"}`} />
                    <div className="text-center">
                      <div className={`mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full ${detail.plan.status === "approved" ? "bg-green-100" : detail.plan.status === "finance_approved" ? "bg-amber-100 ring-2 ring-amber-400 animate-pulse" : "bg-gray-100"}`}>
                        <Crown className={`h-5 w-5 ${detail.plan.status === "approved" ? "text-green-600" : detail.plan.status === "finance_approved" ? "text-amber-600" : "text-gray-400"}`} />
                      </div>
                      <p className="text-xs">{isZh ? "CEO终审" : "CEO Final"}</p>
                    </div>
                    <div className={`h-0.5 w-12 ${detail.plan.status === "approved" ? "bg-green-400" : "bg-gray-200"}`} />
                    <div className="text-center">
                      <div className={`mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full ${detail.plan.status === "approved" ? "bg-green-100" : "bg-gray-100"}`}>
                        <CheckCircle className={`h-5 w-5 ${detail.plan.status === "approved" ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <p className="text-xs">{isZh ? "正式基线" : "Official Baseline"}</p>
                    </div>
                  </div>
                  {detail.plan.status === "approved" && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700">
                      {isZh ? "该计划已通过终审，当前数据为年度正式考核基线。" : "This plan has passed final review. Current data is the official annual assessment baseline."}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Adjustment history with review actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{isZh ? "微调审批记录" : "Adjustment Approval History"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {(detail.adjustments ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{isZh ? "暂无微调记录" : "No adjustments yet"}</p>
                  ) : (
                    <div className="space-y-3">
                      {detail.adjustments.map((a) => (
                        <div key={a.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{a.adjustmentReason}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{a.applicantId}</span>
                                <span>·</span>
                                <span>{a.createdAt}</span>
                                {a.adjustmentType === "exception" && a.exceptionTag && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs">{EXCEPTION_TAGS.find((t) => t.id === a.exceptionTag)?.[isZh ? "name" : "nameEn"] ?? a.exceptionTag}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {statusBadge(a.approvalStatus ?? "pending")}
                            </div>
                          </div>

                          {/* Review steps detail */}
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${a.financePmoStatus === "approved" ? "bg-green-100 text-green-700" : a.financePmoStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                              <ShieldCheck className="h-3 w-3" />
                              {isZh ? "财务/PMO" : "Finance"}: {a.financePmoStatus ?? (isZh ? "待审" : "Pending")}
                            </span>
                            <ArrowRight className="h-3 w-3 text-gray-300" />
                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${a.ceoStatus === "approved" ? "bg-green-100 text-green-700" : a.ceoStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                              <Crown className="h-3 w-3" />
                              {isZh ? "CEO" : "CEO"}: {a.ceoStatus ?? (isZh ? "待审" : "Pending")}
                            </span>
                          </div>

                          {/* Review comments */}
                          {a.financePmoComment && (
                            <p className="mt-1 text-xs text-cyan-700 bg-cyan-50 rounded px-2 py-1">{isZh ? "财务意见" : "Finance comment"}: {a.financePmoComment}</p>
                          )}
                          {a.ceoComment && (
                            <p className="mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{isZh ? "CEO意见" : "CEO comment"}: {a.ceoComment}</p>
                          )}

                          {/* Review action buttons */}
                          {a.approvalStatus === "pending" && a.reviewStep === "finance_pmo" && (
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setReviewDialogId(a.id); setReviewStep("finance"); }}>
                                <ShieldCheck className="mr-1 h-3 w-3" />{isZh ? "财务/PMO审批" : "Finance Review"}
                              </Button>
                            </div>
                          )}
                          {(a.approvalStatus === "finance_approved") && a.reviewStep === "ceo" && (
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setReviewDialogId(a.id); setReviewStep("ceo"); }}>
                                <Crown className="mr-1 h-3 w-3" />{isZh ? "CEO终审" : "CEO Review"}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Review Dialog */}
              <Dialog open={reviewDialogId !== null} onOpenChange={(open) => { if (!open) { setReviewDialogId(null); setReviewComment(""); } }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {reviewStep === "finance"
                        ? (isZh ? "财务/PMO初审" : "Finance/PMO Review")
                        : (isZh ? "CEO终审" : "CEO Final Review")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      {reviewStep === "finance"
                        ? (isZh ? "请核对财务逻辑和排产可行性" : "Please verify financial logic and production scheduling feasibility")
                        : (isZh ? "审批通过后，调整数据将覆盖原数据并成为正式考核基线" : "After approval, adjusted data will overwrite originals and become the official assessment baseline")}
                    </div>
                    <div>
                      <Label>{isZh ? "审批意见" : "Review Comment"}</Label>
                      <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder={isZh ? "填写审批意见（可选）..." : "Add review comment (optional)..."} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        variant="destructive"
                        onClick={() => {
                          if (!reviewDialogId) return;
                          if (reviewStep === "finance") {
                            financeReviewMutation.mutate({ adjustmentId: reviewDialogId, reviewerId: "finance-user", approved: false, comment: reviewComment });
                          } else {
                            ceoReviewMutation.mutate({ adjustmentId: reviewDialogId, reviewerId: "ceo-user", approved: false, comment: reviewComment });
                          }
                        }}
                        disabled={financeReviewMutation.isPending || ceoReviewMutation.isPending}
                      >
                        {isZh ? "驳回" : "Reject"}
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          if (!reviewDialogId) return;
                          if (reviewStep === "finance") {
                            financeReviewMutation.mutate({ adjustmentId: reviewDialogId, reviewerId: "finance-user", approved: true, comment: reviewComment });
                          } else {
                            ceoReviewMutation.mutate({ adjustmentId: reviewDialogId, reviewerId: "ceo-user", approved: true, comment: reviewComment });
                          }
                        }}
                        disabled={financeReviewMutation.isPending || ceoReviewMutation.isPending}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        {reviewStep === "finance" ? (isZh ? "通过初审" : "Approve") : (isZh ? "通过终审（生效基线）" : "Approve (Apply Baseline)")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* ─── Tab: Capability (Phase 3) ─── */}
          {activeTab === "capability" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Radar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radar className="h-4 w-4 text-indigo-500" />
                    {isZh ? "六大能力雷达图" : "Six Capability Radar"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Quarter selector */}
                  <div className="mb-3 flex gap-1">
                    {capabilityData.map((cd, qi) => (
                      <button
                        key={qi}
                        onClick={() => setSelectedQuarter(qi)}
                        className={`rounded px-3 py-1 text-xs font-medium ${selectedQuarter === qi ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"}`}
                      >
                        {cd.q}
                      </button>
                    ))}
                  </div>
                  <svg viewBox="0 0 200 200" className="mx-auto w-full max-w-[300px]">
                    {/* Grid rings */}
                    {[1, 2, 3, 4, 5].map((lv) => (
                      <polygon
                        key={lv}
                        points={Array.from({ length: 6 }, (_, i) => {
                          const p = radarPoint(i, lv);
                          return `${p.x},${p.y}`;
                        }).join(" ")}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={0.5}
                      />
                    ))}
                    {/* Axis lines */}
                    {Array.from({ length: 6 }, (_, i) => {
                      const p = radarPoint(i, 5);
                      return <line key={i} x1={radarCx} y1={radarCy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth={0.5} />;
                    })}
                    {/* Target polygon (dashed) */}
                    <polygon
                      points={capabilityData[selectedQuarter].target.map((v, i) => {
                        const p = radarPoint(i, v);
                        return `${p.x},${p.y}`;
                      }).join(" ")}
                      fill="rgba(234,179,8,0.1)"
                      stroke="#eab308"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                    {/* Actual polygon */}
                    <polygon
                      points={capabilityData[selectedQuarter].actual.map((v, i) => {
                        const p = radarPoint(i, v);
                        return `${p.x},${p.y}`;
                      }).join(" ")}
                      fill="rgba(99,102,241,0.15)"
                      stroke="#6366f1"
                      strokeWidth={2}
                    />
                    {/* Actual dots */}
                    {capabilityData[selectedQuarter].actual.map((v, i) => {
                      const p = radarPoint(i, v);
                      return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />;
                    })}
                    {/* Labels */}
                    {CAPABILITY_DIMS.map((dim, i) => {
                      const p = radarPoint(i, 5.6);
                      return (
                        <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-foreground font-medium">
                          {isZh ? dim.zh : dim.en}
                        </text>
                      );
                    })}
                  </svg>
                  {/* Legend */}
                  <div className="mt-2 flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-4 rounded bg-indigo-500" />
                      <span>{isZh ? "实际评测值" : "Actual"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-4 rounded border-2 border-dashed border-yellow-500 bg-yellow-50" />
                      <span>{isZh ? "目标L级别" : "Target L-level"}</span>
                    </div>
                  </div>
                  {/* Dimension scores */}
                  <div className="mt-3 grid grid-cols-3 gap-1 text-xs">
                    {CAPABILITY_DIMS.map((dim, i) => {
                      const actual = capabilityData[selectedQuarter].actual[i];
                      const target = capabilityData[selectedQuarter].target[i];
                      const gap = actual - target;
                      return (
                        <div key={dim.key} className="rounded border p-1.5 text-center">
                          <p className="font-medium">{isZh ? dim.zh : dim.en}</p>
                          <p className="font-mono">L{actual.toFixed(2)}</p>
                          <p className={`text-[10px] ${gap >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {gap >= 0 ? "+" : ""}{gap.toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Trend Line Chart — capability growth vs business growth */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    {isZh ? "能力成长 vs 业务增长曲线" : "Capability Growth vs Business Growth"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <svg viewBox={`0 0 ${trendChartW} ${trendChartH + 30}`} className="w-full">
                    {/* Grid */}
                    {[0, 1, 2, 3, 4].map((i) => {
                      const y = 10 + (trendChartH / 4) * i;
                      return (
                        <g key={i}>
                          <line x1={40} y1={y} x2={trendChartW - 10} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
                          <text x={36} y={y + 3} textAnchor="end" className="text-[8px] fill-muted-foreground">{(5 - i).toFixed(0)}</text>
                        </g>
                      );
                    })}
                    {/* Quarter labels */}
                    {capabilityData.map((cd, qi) => {
                      const x = 40 + qi * ((trendChartW - 50) / 3);
                      return <text key={qi} x={x} y={trendChartH + 24} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">{cd.q}</text>;
                    })}
                    {/* Target L-level line (dashed yellow) */}
                    <polyline
                      points={capabilityData.map((cd, qi) => {
                        const x = 40 + qi * ((trendChartW - 50) / 3);
                        const avgTarget = cd.target.reduce((s, v) => s + v, 0) / 6;
                        const y = 10 + trendChartH - (avgTarget / 5) * trendChartH;
                        return `${x},${y}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#eab308"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                    />
                    {/* Actual average capability line (indigo) */}
                    <polyline
                      points={capabilityData.map((cd, qi) => {
                        const x = 40 + qi * ((trendChartW - 50) / 3);
                        const avgActual = cd.actual.reduce((s, v) => s + v, 0) / 6;
                        const y = 10 + trendChartH - (avgActual / 5) * trendChartH;
                        return `${x},${y}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth={2}
                    />
                    {/* Business growth line (green, normalized from detail sales) */}
                    {detail.details.length >= 12 && (() => {
                      const qSales = [0, 1, 2, 3].map((qi) => {
                        const mStart = qi * 3;
                        return [mStart, mStart + 1, mStart + 2].reduce((s, mi) => s + Number(detail.details[mi]?.salesTarget ?? 0), 0);
                      });
                      const maxQ = Math.max(...qSales, 1);
                      return (
                        <polyline
                          points={qSales.map((qs, qi) => {
                            const x = 40 + qi * ((trendChartW - 50) / 3);
                            const norm = (qs / maxQ) * 4 + 1; // scale to 1-5
                            const y = 10 + trendChartH - (norm / 5) * trendChartH;
                            return `${x},${y}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={2}
                        />
                      );
                    })()}
                    {/* Dots for actual capability */}
                    {capabilityData.map((cd, qi) => {
                      const x = 40 + qi * ((trendChartW - 50) / 3);
                      const avgActual = cd.actual.reduce((s, v) => s + v, 0) / 6;
                      const y = 10 + trendChartH - (avgActual / 5) * trendChartH;
                      return <circle key={qi} cx={x} cy={y} r={3} fill="#6366f1" />;
                    })}
                  </svg>
                  {/* Legend */}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1"><div className="h-2 w-4 rounded bg-indigo-500" /><span>{isZh ? "能力均值" : "Capability Avg"}</span></div>
                    <div className="flex items-center gap-1"><div className="h-2 w-4 rounded border-2 border-dashed border-yellow-500 bg-yellow-50" /><span>{isZh ? "目标L级别" : "Target L-level"}</span></div>
                    <div className="flex items-center gap-1"><div className="h-2 w-4 rounded bg-emerald-500" /><span>{isZh ? "业务增长" : "Business Growth"}</span></div>
                  </div>
                  {/* Insight summary */}
                  <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs">
                    <p className="font-medium mb-1">{isZh ? "拟合度分析" : "Fit Analysis"}</p>
                    <p className="text-muted-foreground">
                      {isZh
                        ? "当前能力成长曲线整体追平目标L级别，Q3开始超越。但创新力(L2.5)和抗压力(L2.7)持续低于目标，建议针对性培训提升。业务增长曲线稳步上升，能力-业务拟合度约87%。"
                        : "Capability growth curve is tracking target L-level, exceeding from Q3. Innovation (L2.5) and Resilience (L2.7) remain below target — recommend targeted training. Business growth steady uptrend, capability-business fit ~87%."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* AI Agent Interaction Box */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-500" />
                    {isZh ? "AI 沙盘助手" : "AI Sandbox Assistant"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Messages */}
                  <div className="mb-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                    {aiMessages.length === 0 ? (
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p>{isZh ? "请输入问题，例如：" : "Ask a question, e.g.:"}</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            isZh ? "预测Q3达成率" : "Forecast Q3 achievement",
                            isZh ? "分析能力雷达差距" : "Analyze capability gaps",
                            isZh ? "识别风险因素" : "Identify risk factors",
                          ].map((ex) => (
                            <button key={ex} onClick={() => { setAiInput(ex); }} className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted">
                              {ex}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      aiMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-white border"}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder={isZh ? "输入问题，如「预测Q3达成率」..." : "Ask a question..."}
                      className="flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAiSend(); }}
                    />
                    <Button size="sm" onClick={handleAiSend} disabled={!aiInput.trim()}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Adjustment history (all tabs except approval which shows its own) */}
          {activeTab !== "approval" && activeTab !== "finetune" && activeTab !== "capability" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isZh ? "微调记录" : "Adjustment History"}</CardTitle>
              </CardHeader>
              <CardContent>
                {(detail.adjustments ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{isZh ? "暂无微调记录" : "No adjustments yet"}</p>
                ) : (
                  <div className="space-y-2">
                    {detail.adjustments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <div>
                          <p className="font-medium">{a.adjustmentReason}</p>
                          <p className="text-xs text-muted-foreground">{a.applicantId} · {a.createdAt}</p>
                        </div>
                        {statusBadge(a.approvalStatus ?? "pending")}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
