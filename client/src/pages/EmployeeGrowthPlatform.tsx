import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import CapabilityRadarChart from "@/components/CapabilityRadarChart";
import {
  BookOpen, GraduationCap, Award, AlertTriangle, BarChart3, FileText,
  Search, CheckCircle2, Clock, XCircle, Trophy,
  TrendingUp, TrendingDown, Minus, Calendar, Eye, Lock, Shield,
  Star, Target, ArrowRight, Download, RefreshCw,
  Flame, Zap, Sparkles, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const STAGE_LABELS: Record<string, { zh: string; en: string; icon: typeof GraduationCap; color: string; gradient: string }> = {
  onboarding: { zh: "入职培训", en: "Onboarding", icon: BookOpen, color: "bg-blue-500", gradient: "from-blue-500 to-blue-600" },
  "3_month": { zh: "3个月技能", en: "3M Skills", icon: Target, color: "bg-cyan-500", gradient: "from-cyan-500 to-cyan-600" },
  "6_month": { zh: "6个月深化", en: "6M Advanced", icon: TrendingUp, color: "bg-purple-500", gradient: "from-purple-500 to-purple-600" },
  "12_month": { zh: "12个月评估", en: "12M Review", icon: Award, color: "bg-amber-500", gradient: "from-amber-500 to-amber-600" },
  annual: { zh: "年度进阶", en: "Annual", icon: Star, color: "bg-rose-500", gradient: "from-rose-500 to-rose-600" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2; dot: string }> = {
  pending: { label: "待开始", color: "bg-slate-100 text-slate-600", icon: Clock, dot: "bg-slate-400" },
  active: { label: "进行中", color: "bg-blue-100 text-blue-700", icon: RefreshCw, dot: "bg-blue-500 animate-pulse" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700", icon: CheckCircle2, dot: "bg-green-500" },
  overdue: { label: "已逾期", color: "bg-red-100 text-red-700", icon: AlertTriangle, dot: "bg-red-500" },
  skipped: { label: "已跳过", color: "bg-gray-100 text-gray-500", icon: XCircle, dot: "bg-gray-400" },
};

const FORMAT_LABELS: Record<string, string> = { online: "线上", offline: "线下", self_study: "自学", blended: "混合" };
const CATEGORY_ICONS: Record<string, string> = { video: "🎬", document: "📄", slides: "📊", quiz: "❓", link: "🔗", handbook: "📘", "3d_model": "🧊" };
const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 border-green-200",
  intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  advanced: "bg-purple-100 text-purple-700 border-purple-200",
  expert: "bg-red-100 text-red-700 border-red-200",
};

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function EmployeeGrowthPlatform() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");

  // Prefetch key data for header
  const rpSummary = trpc.employeeGrowth.rewardPenalty.getSummary.useQuery({});
  const plans = trpc.employeeGrowth.stagePlan.getMyPlans.useQuery();
  const taskTrend = trpc.employeeGrowth.taskMetrics.getTrend.useQuery({ months: 6 });

  const completedPlans = (plans.data ?? []).filter(p => p.status === "completed").length;
  const totalPlans = (plans.data ?? []).length;
  const latestQuality = taskTrend.data?.[taskTrend.data.length - 1]?.avgQualityScore;

  // Derive user "level" from completed stages (gamification)
  const userLevel = Math.min(completedPlans + 1, 5);
  const levelNames = ["L1 · 新星", "L2 · 熟练", "L3 · 专业", "L4 · 专家", "L5 · 大师"];
  const levelProgress = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden border-b bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-cyan-600/5">
        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative px-6 py-5">
          <div className="flex items-start gap-5">
            {/* Level Badge */}
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white ring-2 ring-background shadow-sm">
                {userLevel}
              </div>
            </div>

            {/* Title + Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold tracking-tight">员工成长平台</h1>
                <Badge variant="outline" className="font-mono text-xs border-blue-200 text-blue-700 bg-blue-50">
                  {levelNames[userLevel - 1]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">培训资料 · 阶段计划 · 表彰处罚 · 任务指标 · 云厅授权 · 周期报告</p>

              {/* XP Progress Bar */}
              <div className="flex items-center gap-3 max-w-md">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>成长进度</span>
                    <span className="font-mono">{completedPlans}/{totalPlans} 阶段</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transition-all duration-700"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                </div>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-4">
              <QuickStat icon={Trophy} label="表彰" value={rpSummary.data?.totalRewards ?? 0} color="text-green-600" bg="bg-green-50" />
              <QuickStat icon={Flame} label="处罚" value={rpSummary.data?.totalPenalties ?? 0} color="text-red-600" bg="bg-red-50" />
              <QuickStat icon={Zap} label="质量分" value={latestQuality?.toFixed(1) ?? "—"} color="text-purple-600" bg="bg-purple-50" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-10 w-auto inline-flex bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="overview" className="gap-1.5 px-4"><TrendingUp className="h-3.5 w-3.5" />概览</TabsTrigger>
            <TabsTrigger value="materials" className="gap-1.5 px-4"><BookOpen className="h-3.5 w-3.5" />资料库</TabsTrigger>
            <TabsTrigger value="stages" className="gap-1.5 px-4"><GraduationCap className="h-3.5 w-3.5" />阶段培训</TabsTrigger>
            <TabsTrigger value="rewards" className="gap-1.5 px-4"><Award className="h-3.5 w-3.5" />表彰处罚</TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5 px-4"><BarChart3 className="h-3.5 w-3.5" />任务指标</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 px-4"><FileText className="h-3.5 w-3.5" />周期报告</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="materials"><MaterialsTab /></TabsContent>
          <TabsContent value="stages"><StagesTab /></TabsContent>
          <TabsContent value="rewards"><RewardsTab /></TabsContent>
          <TabsContent value="metrics"><MetricsTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, color, bg }: {
  icon: typeof Trophy; label: string; value: string | number; color: string; bg: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg} border border-transparent`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className={`text-lg font-bold ${color} leading-tight`}>{value}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 1: Overview — 成长概览 (with Radar Chart)
// ═══════════════════════════════════════════════════════════════

function OverviewTab() {
  const plans = trpc.employeeGrowth.stagePlan.getMyPlans.useQuery();
  const rpSummary = trpc.employeeGrowth.rewardPenalty.getSummary.useQuery({});
  const taskTrend = trpc.employeeGrowth.taskMetrics.getTrend.useQuery({ months: 6 });

  const stageOrder = ["onboarding", "3_month", "6_month", "12_month", "annual"];
  const sortedPlans = (plans.data ?? []).sort(
    (a, b) => stageOrder.indexOf(a.lifecycleStage) - stageOrder.indexOf(b.lifecycleStage),
  );

  // Derive radar chart data from training stages (TSDCKL mapping)
  const radarData = useMemo(() => {
    const domainMap: Record<string, { points: number; level: number }> = {
      T: { points: 0, level: 1 }, S: { points: 0, level: 1 },
      D: { points: 0, level: 1 }, C: { points: 0, level: 1 },
      K: { points: 0, level: 1 }, L: { points: 0, level: 1 },
    };
    // Map completed stages to capability domains
    for (const plan of sortedPlans) {
      if (plan.status === "completed") {
        const score = plan.testScore ?? 80;
        // Each stage contributes to different domains
        if (plan.lifecycleStage === "onboarding") { domainMap.T.points += score; domainMap.S.points += score * 0.5; }
        if (plan.lifecycleStage === "3_month") { domainMap.T.points += score * 1.5; domainMap.D.points += score; }
        if (plan.lifecycleStage === "6_month") { domainMap.D.points += score * 1.5; domainMap.C.points += score; domainMap.K.points += score * 0.5; }
        if (plan.lifecycleStage === "12_month") { domainMap.C.points += score * 1.5; domainMap.K.points += score; domainMap.L.points += score * 0.5; }
        if (plan.lifecycleStage === "annual") { domainMap.L.points += score * 1.5; domainMap.K.points += score; }
      }
    }
    // Task metrics boost
    const latestMetric = taskTrend.data?.[taskTrend.data.length - 1];
    if (latestMetric) {
      domainMap.D.points += (latestMetric.avgQualityScore ?? 0) * 2;
      domainMap.T.points += (latestMetric.tasksOnTime ?? 0) * 5;
    }
    // Rewards boost
    domainMap.L.points += (rpSummary.data?.totalRewards ?? 0) * 30;
    domainMap.C.points += (rpSummary.data?.totalRewards ?? 0) * 20;

    // Calculate levels
    for (const key of Object.keys(domainMap)) {
      const p = domainMap[key].points;
      domainMap[key].level = p >= 1000 ? 5 : p >= 600 ? 4 : p >= 300 ? 3 : p >= 100 ? 2 : 1;
    }

    return Object.entries(domainMap).map(([code, { points, level }]) => ({
      domainCode: code,
      points: Math.round(points),
      level,
    }));
  }, [sortedPlans, taskTrend.data, rpSummary.data]);

  return (
    <div className="space-y-6">
      {/* Two-column: Radar + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: TSDCKL Radar Chart */}
        <div className="lg:col-span-2">
          <CapabilityRadarChart data={radarData} height={340} showLegend={false} />
        </div>

        {/* Right: Lifecycle Timeline */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                成长轨迹时间线
              </CardTitle>
              <CardDescription>从入职到进阶的阶段性培训进度</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedPlans.length > 0 ? (
                <div className="space-y-3">
                  {sortedPlans.map((plan, i) => {
                    const cfg = STAGE_LABELS[plan.lifecycleStage] ?? STAGE_LABELS.onboarding;
                    const st = STATUS_CONFIG[plan.status ?? "pending"];
                    const Icon = cfg.icon;
                    const isActive = plan.status === "active";
                    const isDone = plan.status === "completed";

                    return (
                      <div key={plan.id} className="flex items-start gap-3">
                        {/* Timeline dot + line */}
                        <div className="flex flex-col items-center">
                          <div className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${cfg.gradient} text-white shadow-sm ${isActive ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-background" : ""}`}>
                            <Icon className="h-4 w-4" />
                            {isDone && (
                              <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white ring-2 ring-background">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </div>
                          {i < sortedPlans.length - 1 && (
                            <div className={`w-0.5 h-6 mt-1 rounded-full ${isDone ? "bg-green-300" : "bg-muted"}`} />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 pb-2 ${i < sortedPlans.length - 1 ? "border-b border-dashed border-muted" : ""}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{cfg.zh}</span>
                              <Badge variant="secondary" className={`text-[10px] h-5 ${st.color}`}>{st.label}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{plan.dueDate}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{plan.planName}</p>
                          {plan.testScore != null && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs font-mono">{plan.testScore}分</span>
                              {plan.testPassed ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <GraduationCap className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">暂无培训计划，请联系HR部门安排</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Metrics Trend — Mini Bar Chart */}
      {(taskTrend.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              任务质量趋势（近6个月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-28">
              {(taskTrend.data ?? []).map((m) => {
                const completion = m.tasksAssigned ? ((m.tasksCompleted ?? 0) / m.tasksAssigned * 100) : 0;
                const barH = Math.max(completion * 0.9, 8);
                return (
                  <div key={m.period} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{completion.toFixed(0)}%</span>
                    <div className="w-full flex justify-center">
                      <div
                        className="w-8 rounded-t-md bg-gradient-to-t from-blue-500 to-cyan-400 transition-all duration-500 hover:from-blue-600 hover:to-cyan-500"
                        style={{ height: `${barH}px` }}
                        title={`质量分: ${m.avgQualityScore?.toFixed(1) ?? "—"}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{m.period.slice(-5)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 2: Materials — 培训资料库
// ═══════════════════════════════════════════════════════════════

function MaterialsTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const materials = trpc.employeeGrowth.material.list.useQuery({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索培训资料（标题、编码、标签）..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-36"><SelectValue placeholder="全部类别" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类别</SelectItem>
            <SelectItem value="video">🎬 视频</SelectItem>
            <SelectItem value="document">📄 文档</SelectItem>
            <SelectItem value="slides">📊 演示文稿</SelectItem>
            <SelectItem value="handbook">📘 手册</SelectItem>
            <SelectItem value="3d_model">🧊 3D模型</SelectItem>
            <SelectItem value="quiz">❓ 测试</SelectItem>
            <SelectItem value="link">🔗 链接</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(materials.data?.items ?? []).map((m) => (
          <Card key={m.id} className="group hover:shadow-md hover:border-primary/20 transition-all duration-200">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl leading-none">{CATEGORY_ICONS[m.category] ?? "📁"}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.code}</p>
                  </div>
                </div>
                {!m.isPublic && <Lock className="h-4 w-4 text-amber-500 shrink-0" aria-label="需要授权" />}
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.description}</p>
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {m.difficulty && (
                  <Badge variant="secondary" className={`text-[10px] border ${DIFFICULTY_COLORS[m.difficulty] ?? ""}`}>
                    {m.difficulty === "beginner" ? "入门" : m.difficulty === "intermediate" ? "中级" : m.difficulty === "advanced" ? "高级" : "专家"}
                  </Badge>
                )}
                {m.format && <Badge variant="outline" className="text-[10px]">{m.format.toUpperCase()}</Badge>}
                {m.durationMinutes && <Badge variant="outline" className="text-[10px]">{m.durationMinutes}分钟</Badge>}
              </div>
              {(m.tags as string[] | null)?.length ? (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {(m.tags as string[]).slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{tag}</span>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex gap-2">
                {m.fileUrl && (
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1 group-hover:border-primary/30">
                    <Eye className="h-3 w-3" />查看
                  </Button>
                )}
                {m.fileUrl && (
                  <Button size="sm" variant="ghost" className="text-xs h-7 gap-1">
                    <Download className="h-3 w-3" />下载
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(materials.data?.items ?? []).length === 0 && !materials.isLoading && (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">暂无符合条件的培训资料</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 3: Stages — 阶段性培训 (vertical stepper)
// ═══════════════════════════════════════════════════════════════

function StagesTab() {
  const plans = trpc.employeeGrowth.stagePlan.getMyPlans.useQuery();
  const utils = trpc.useUtils();
  const submitTest = trpc.employeeGrowth.stagePlan.submitTest.useMutation({
    onSuccess: () => { toast.success("测试成绩已提交"); utils.employeeGrowth.stagePlan.getMyPlans.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const [testScore, setTestScore] = useState("");
  const [testingPlanId, setTestingPlanId] = useState<number | null>(null);

  return (
    <div className="space-y-4 max-w-3xl">
      {(plans.data ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <GraduationCap className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">暂无阶段性培训计划</p>
        </div>
      ) : (
        <div className="space-y-0">
          {(plans.data ?? []).map((plan, i) => {
            const cfg = STAGE_LABELS[plan.lifecycleStage] ?? STAGE_LABELS.onboarding;
            const st = STATUS_CONFIG[plan.status ?? "pending"];
            const Icon = cfg.icon;
            const StIcon = st.icon;
            const materialIds = (plan.materialIds as number[] | null) ?? [];
            const criteria = plan.completionCriteria as { testRequired?: boolean; minScore?: number; managerApproval?: boolean } | null;
            const isActive = plan.status === "active";
            const isDone = plan.status === "completed";
            const isLast = i === (plans.data ?? []).length - 1;

            return (
              <div key={plan.id} className="flex gap-4">
                {/* Stepper column */}
                <div className="flex flex-col items-center w-10 shrink-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${cfg.gradient} text-white shadow-sm ${isActive ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-background" : ""}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {!isLast && <div className={`w-0.5 flex-1 mt-1 mb-1 rounded-full ${isDone ? "bg-green-300" : "bg-muted"}`} />}
                </div>

                {/* Card */}
                <Card className={`flex-1 mb-3 ${isDone ? "border-green-200 bg-green-50/30" : isActive ? "border-blue-200 bg-blue-50/20 shadow-sm" : plan.status === "overdue" ? "border-red-200" : ""}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{plan.planName}</p>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${st.color}`}>
                            <StIcon className="h-3 w-3 mr-1" />{st.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          {plan.trainingFormat && (
                            <Badge variant="outline" className="text-[10px] h-5">{FORMAT_LABELS[plan.trainingFormat] ?? plan.trainingFormat}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{plan.triggerDate} → {plan.dueDate}</span>
                        </div>
                      </div>
                      {isDone && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                    </div>

                    {/* Completion criteria */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      {criteria?.testRequired && (
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />测试 ≥{criteria.minScore ?? 60}分</span>
                      )}
                      {criteria?.managerApproval && (
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3" />需主管签批</span>
                      )}
                      {materialIds.length > 0 && (
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{materialIds.length}份资料</span>
                      )}
                    </div>

                    {/* Test result */}
                    {plan.testScore != null && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span>成绩: <strong>{plan.testScore}</strong>分</span>
                        {plan.testPassed ? (
                          <Badge className="bg-green-100 text-green-700 text-[10px] h-5">通过</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 text-[10px] h-5">未通过</Badge>
                        )}
                      </div>
                    )}

                    {/* Supervisor signoff */}
                    {plan.supervisorSignoff && (
                      <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />主管已签批 ({plan.supervisorSignoffAt ? new Date(plan.supervisorSignoffAt).toLocaleDateString() : ""})
                      </div>
                    )}

                    {/* Test submission */}
                    {plan.status !== "completed" && plan.status !== "skipped" && criteria?.testRequired && plan.testScore == null && (
                      <div className="mt-3 flex items-center gap-2">
                        {testingPlanId === plan.id ? (
                          <>
                            <Input
                              type="number" min={0} max={100} placeholder="分数"
                              value={testScore} onChange={(e) => setTestScore(e.target.value)}
                              className="w-24 h-8 text-sm"
                            />
                            <Button size="sm" className="h-8" onClick={() => {
                              const score = Number(testScore);
                              if (score >= 0 && score <= 100) {
                                submitTest.mutate({ id: plan.id, testScore: score });
                                setTestingPlanId(null);
                                setTestScore("");
                              }
                            }} disabled={submitTest.isPending}>提交</Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setTestingPlanId(null)}>取消</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setTestingPlanId(plan.id)}>
                            <FileText className="h-3 w-3" />提交测试成绩
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 4: Rewards & Penalties — 表彰与处罚
// ═══════════════════════════════════════════════════════════════

function RewardsTab() {
  const [type, setType] = useState<"all" | "reward" | "penalty">("all");
  const summary = trpc.employeeGrowth.rewardPenalty.getSummary.useQuery({});
  const list = trpc.employeeGrowth.rewardPenalty.list.useQuery({
    type: type !== "all" ? type as "reward" | "penalty" : undefined,
  });

  return (
    <div className="space-y-4">
      {/* Summary - achievement style */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200/50 bg-gradient-to-br from-green-50/50 to-transparent">
          <CardContent className="pt-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 mx-auto mb-2">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{summary.data?.totalRewards ?? 0}</p>
            <p className="text-xs text-muted-foreground">表彰次数</p>
            {(summary.data?.rewardAmount ?? 0) > 0 && (
              <p className="text-sm text-green-600 font-medium mt-1">+¥{summary.data?.rewardAmount.toFixed(0)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-red-200/50 bg-gradient-to-br from-red-50/50 to-transparent">
          <CardContent className="pt-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 mx-auto mb-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.data?.totalPenalties ?? 0}</p>
            <p className="text-xs text-muted-foreground">处罚次数</p>
            {(summary.data?.penaltyAmount ?? 0) > 0 && (
              <p className="text-sm text-red-600 font-medium mt-1">-¥{summary.data?.penaltyAmount.toFixed(0)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50/50 to-transparent">
          <CardContent className="pt-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 mx-auto mb-2">
              <Star className="h-6 w-6 text-amber-600" />
            </div>
            <p className={`text-2xl font-bold ${(summary.data?.netAmount ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(summary.data?.netAmount ?? 0) >= 0 ? "+" : ""}¥{summary.data?.netAmount?.toFixed(0) ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">净激励金额</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {([["all", "全部", undefined], ["reward", "表彰", Trophy], ["penalty", "处罚", AlertTriangle]] as const).map(([key, label, Ic]) => (
          <Button key={key} size="sm" variant={type === key ? "default" : "outline"} onClick={() => setType(key as typeof type)} className="gap-1">
            {Ic && <Ic className="h-3 w-3" />}{label}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {(list.data?.items ?? []).map((item) => (
          <Card key={item.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.type === "reward" ? "bg-green-100" : "bg-red-100"}`}>
                  {item.type === "reward" ? <Trophy className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.issuedAt} · {item.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.amount != null && item.amount > 0 && (
                  <span className={`text-sm font-semibold ${item.type === "reward" ? "text-green-600" : "text-red-600"}`}>
                    {item.type === "reward" ? "+" : "-"}¥{item.amount}
                  </span>
                )}
                <Badge variant="secondary" className={`text-[10px] ${item.status === "active" ? "" : item.status === "appealed" ? "bg-amber-100 text-amber-700" : "bg-gray-100"}`}>
                  {item.status === "active" ? "生效" : item.status === "appealed" ? "申诉中" : item.status === "revoked" ? "已撤销" : item.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {(list.data?.items ?? []).length === 0 && !list.isLoading && (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Award className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">暂无记录</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 5: Task Metrics — 任务质量指标
// ═══════════════════════════════════════════════════════════════

function MetricsTab() {
  const metrics = trpc.employeeGrowth.taskMetrics.getByEmployee.useQuery({ limit: 12 });
  const data = metrics.data ?? [];

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">暂无任务指标数据</p>
        </div>
      ) : (
        <>
          {/* Latest month highlight */}
          {data[0] && (
            <div className="grid grid-cols-5 gap-3">
              <MetricCard label="分配任务" value={data[0].tasksAssigned ?? 0} color="text-slate-700" icon={Target} />
              <MetricCard label="已完成" value={data[0].tasksCompleted ?? 0} color="text-blue-600" icon={CheckCircle2} />
              <MetricCard label="准时完成" value={data[0].tasksOnTime ?? 0} color="text-green-600" icon={Clock} />
              <MetricCard label="质量评分" value={data[0].avgQualityScore?.toFixed(1) ?? "—"} color="text-purple-600" icon={Star} />
              <MetricCard label="缺陷数" value={data[0].defectCount ?? 0} color="text-red-600" icon={AlertTriangle} />
            </div>
          )}

          {/* Monthly table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">月度指标明细</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">月份</th>
                      <th className="pb-2 pr-4 text-right font-medium">分配</th>
                      <th className="pb-2 pr-4 text-right font-medium">完成</th>
                      <th className="pb-2 pr-4 text-right font-medium">准时</th>
                      <th className="pb-2 pr-4 text-right font-medium">逾期</th>
                      <th className="pb-2 pr-4 text-right font-medium">质量分</th>
                      <th className="pb-2 pr-4 text-right font-medium">缺陷</th>
                      <th className="pb-2 text-right font-medium">完成率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((m, i) => {
                      const rate = m.tasksAssigned ? ((m.tasksCompleted ?? 0) / m.tasksAssigned * 100) : 0;
                      return (
                        <tr key={m.period} className={`border-b last:border-0 ${i === 0 ? "bg-muted/30" : ""}`}>
                          <td className="py-2.5 pr-4 font-medium">{m.period}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{m.tasksAssigned}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{m.tasksCompleted}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-green-600">{m.tasksOnTime}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-red-600">{m.tasksOverdue}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{m.avgQualityScore?.toFixed(1) ?? "—"}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{m.defectCount}</td>
                          <td className="py-2.5 text-right">
                            <span className={`inline-flex items-center gap-1 font-medium ${rate >= 90 ? "text-green-600" : rate >= 70 ? "text-amber-600" : "text-red-600"}`}>
                              {rate.toFixed(0)}%
                              <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full ${rate >= 90 ? "bg-green-500" : rate >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${rate}%` }} />
                              </div>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: typeof Target }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
          <Icon className={`h-5 w-5 ${color} opacity-30`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 6: Periodic Reports — 周期性报告
// ═══════════════════════════════════════════════════════════════

function ReportsTab() {
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "annual">("daily");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const years = trpc.employeeGrowth.periodicReport.getYears.useQuery({});
  const history = trpc.employeeGrowth.periodicReport.listHistory.useQuery({ reportType, year: selectedYear, pageSize: 50 });

  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = reportType === "daily" ? today
    : reportType === "weekly" ? getWeekString(new Date())
    : reportType === "monthly" ? today.slice(0, 7)
    : reportType === "quarterly" ? `${today.slice(0, 4)}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
    : today.slice(0, 4);

  const currentReport = trpc.employeeGrowth.periodicReport.getOrCreate.useQuery({ reportType, period: currentPeriod });
  const utils = trpc.useUtils();

  const [dailyPlan, setDailyPlan] = useState("");
  const [dailyDone, setDailyDone] = useState("");
  const submitDaily = trpc.employeeGrowth.periodicReport.submitDaily.useMutation({
    onSuccess: () => { toast.success("日报已提交"); utils.employeeGrowth.periodicReport.invalidate(); },
  });
  const [weeklyAccomplishments, setWeeklyAccomplishments] = useState("");
  const [weeklyChallenges, setWeeklyChallenges] = useState("");
  const [weeklyGoals, setWeeklyGoals] = useState("");
  const submitWeekly = trpc.employeeGrowth.periodicReport.submitWeekly.useMutation({
    onSuccess: () => { toast.success("周报已提交"); utils.employeeGrowth.periodicReport.invalidate(); },
  });

  const TYPE_LABELS: Record<string, string> = { daily: "日报", weekly: "周报", monthly: "月报", quarterly: "季报", annual: "年报" };

  return (
    <div className="space-y-4">
      {/* Type selector — pill style */}
      <div className="flex items-center gap-2">
        {(["daily", "weekly", "monthly", "quarterly", "annual"] as const).map((rt) => (
          <Button key={rt} size="sm" variant={reportType === rt ? "default" : "outline"} onClick={() => setReportType(rt)}>
            {TYPE_LABELS[rt]}
          </Button>
        ))}
        <div className="ml-auto">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...new Set([new Date().getFullYear().toString(), ...(years.data ?? [])])].map((y) => (
                <SelectItem key={y} value={y}>{y}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Current period form */}
        <div className="col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {TYPE_LABELS[reportType]} — {currentPeriod}
                {currentReport.data?.status && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    {currentReport.data.status === "draft" ? "草稿" : currentReport.data.status === "submitted" ? "已提交" : currentReport.data.status === "reviewed" ? "已审阅" : "已归档"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportType === "daily" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">今日计划</label>
                    <Textarea placeholder="每行一项计划任务..." value={dailyPlan} onChange={(e) => setDailyPlan(e.target.value)} rows={4} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">完成情况</label>
                    <Textarea placeholder="格式：任务 | 完成/部分完成/未开始 | 工时" value={dailyDone} onChange={(e) => setDailyDone(e.target.value)} rows={4} className="mt-1" />
                  </div>
                  <Button onClick={() => {
                    const planned = dailyPlan.split("\n").filter(Boolean).map((line) => ({ title: line.trim(), priority: "normal", estimatedHours: 1 }));
                    const completed = dailyDone.split("\n").filter(Boolean).map((line) => {
                      const parts = line.split("|").map((s) => s.trim());
                      return { title: parts[0] || line.trim(), status: (parts[1]?.includes("完成") ? "done" : parts[1]?.includes("部分") ? "partial" : "not_started") as "done" | "partial" | "not_started", actualHours: parseFloat(parts[2]) || 1 };
                    });
                    submitDaily.mutate({ period: currentPeriod, plannedItems: planned, completedItems: completed });
                  }} disabled={submitDaily.isPending} className="gap-1">
                    <CheckCircle2 className="h-4 w-4" />提交日报
                  </Button>
                </div>
              )}

              {reportType === "weekly" && (
                <div className="space-y-3">
                  <div><label className="text-sm font-medium">本周主要成果</label><Textarea placeholder="每行一项成果..." value={weeklyAccomplishments} onChange={(e) => setWeeklyAccomplishments(e.target.value)} rows={4} className="mt-1" /></div>
                  <div><label className="text-sm font-medium">遇到的挑战</label><Textarea placeholder="每行一项挑战..." value={weeklyChallenges} onChange={(e) => setWeeklyChallenges(e.target.value)} rows={3} className="mt-1" /></div>
                  <div><label className="text-sm font-medium">下周目标</label><Textarea placeholder="每行一项目标..." value={weeklyGoals} onChange={(e) => setWeeklyGoals(e.target.value)} rows={3} className="mt-1" /></div>
                  <Button onClick={() => { submitWeekly.mutate({ period: currentPeriod, keyAccomplishments: weeklyAccomplishments.split("\n").filter(Boolean), challenges: weeklyChallenges.split("\n").filter(Boolean), nextPeriodGoals: weeklyGoals.split("\n").filter(Boolean) }); }} disabled={submitWeekly.isPending} className="gap-1">
                    <CheckCircle2 className="h-4 w-4" />提交周报
                  </Button>
                </div>
              )}

              {(reportType === "monthly" || reportType === "quarterly" || reportType === "annual") && (
                <div className="space-y-3">
                  {currentReport.data ? (
                    <ReportViewer report={currentReport.data} />
                  ) : (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      {reportType === "monthly" ? "月报将在月初自动生成" : reportType === "quarterly" ? "季报将在季度初自动生成" : "年报将在年初自动生成"}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History sidebar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">历史记录</CardTitle>
            <CardDescription>{selectedYear}年 · {TYPE_LABELS[reportType]}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {(history.data?.items ?? []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-sm transition-colors">
                    <div>
                      <p className="font-medium">{r.period}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.status === "submitted" ? "已提交" : r.status === "reviewed" ? "已审阅" : r.status === "draft" ? "草稿" : r.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.kpiOverallScore != null && <Badge variant="secondary" className="text-[10px]">{r.kpiOverallScore.toFixed(0)}分</Badge>}
                      {r.completionRate != null && <Badge variant="secondary" className="text-[10px]">{r.completionRate.toFixed(0)}%</Badge>}
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {(history.data?.items ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">暂无历史记录</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Report Viewer (for monthly/quarterly/annual)
// ═══════════════════════════════════════════════════════════════

function ReportViewer({ report }: { report: Record<string, unknown> }) {
  const kpiSummary = report.kpiSummaryJson as Array<{ kpiName: string; target: number; actual: number; score: number; trend: string }> | null;
  const accomplishments = report.keyAccomplishments as string[] | null;
  const challenges = report.challenges as string[] | null;
  const rpSummary = report.rewardPenaltySummary as { totalRewards: number; totalPenalties: number } | null;
  const taskSummary = report.taskMetricsSummary as { assigned: number; completed: number; onTimeRate: number; qualityScore: number } | null;

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      {kpiSummary && kpiSummary.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">KPI汇总</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-1 text-left font-medium">指标</th>
                  <th className="pb-1 text-right font-medium">目标</th>
                  <th className="pb-1 text-right font-medium">实际</th>
                  <th className="pb-1 text-right font-medium">得分</th>
                  <th className="pb-1 text-right font-medium">趋势</th>
                </tr>
              </thead>
              <tbody>
                {kpiSummary.map((k, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5">{k.kpiName}</td>
                    <td className="py-1.5 text-right tabular-nums">{k.target}</td>
                    <td className="py-1.5 text-right tabular-nums">{k.actual}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{k.score}</td>
                    <td className="py-1.5 text-right">
                      {k.trend === "up" ? <TrendingUp className="h-3 w-3 text-green-500 inline" /> :
                       k.trend === "down" ? <TrendingDown className="h-3 w-3 text-red-500 inline" /> :
                       <Minus className="h-3 w-3 text-gray-400 inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Metrics */}
      {taskSummary && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "分配任务", value: taskSummary.assigned },
            { label: "已完成", value: taskSummary.completed },
            { label: "准时率", value: `${taskSummary.onTimeRate}%` },
            { label: "质量评分", value: taskSummary.qualityScore },
          ].map((s) => (
            <div key={s.label} className="text-center p-2.5 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold tabular-nums">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* R&P Summary */}
      {(((rpSummary as any) && ((rpSummary as any).totalRewards > 0 || (rpSummary as any).totalPenalties > 0)) ? (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 flex items-center gap-1"><Trophy className="h-3 w-3" />表彰 {(rpSummary as any).totalRewards}次</span>
          <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />处罚 {(rpSummary as any).totalPenalties}次</span>
        </div>
      ) : null) as any}

      {/* Accomplishments & Challenges */}
      {(((accomplishments as any)?.length > 0) ? (
        <div>
          <h4 className="text-sm font-semibold mb-1">主要成果</h4>
          <ul className="text-sm space-y-1">
            {(accomplishments as any[]).map((a: any, i: number) => <li key={i} className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />{a}</li>)}
          </ul>
        </div>
      ) : null) as any}
      {challenges && challenges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-1">挑战与问题</h4>
          <ul className="text-sm space-y-1">
            {challenges.map((c, i) => <li key={i} className="flex items-start gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />{c}</li>)}
          </ul>
        </div>
      )}

      {/* AI Narrative */}
      {report.aiNarrative && (
        <div className="p-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-lg border border-blue-100">
          <p className="text-[11px] font-semibold text-blue-600 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI 分析</p>
          <p className="text-sm whitespace-pre-wrap">{report.aiNarrative as string}</p>
        </div>
      )}

      {/* Manager Comments */}
      {report.managerComments && (
        <div className="p-3 border-l-4 border-blue-400 bg-blue-50/50 rounded-r-lg">
          <p className="text-[11px] font-semibold text-blue-600 mb-1">主管评语</p>
          <p className="text-sm">{report.managerComments as string}</p>
        </div>
      )}

      {report.kpiOverallScore != null && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-sm font-medium">综合评分:</span>
          <span className="text-xl font-bold text-blue-600">{(report.kpiOverallScore as number).toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════════════════

function getWeekString(d: Date): string {
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const dayOfYear = Math.ceil((d.getTime() - oneJan.getTime()) / 86400000);
  const weekNum = Math.ceil((dayOfYear + oneJan.getDay()) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}
