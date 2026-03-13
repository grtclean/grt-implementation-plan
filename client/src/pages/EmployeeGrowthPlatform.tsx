import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, GraduationCap, Award, AlertTriangle, BarChart3, FileText,
  Search, Plus, CheckCircle2, Clock, XCircle, ChevronRight, Trophy,
  TrendingUp, TrendingDown, Minus, Calendar, Eye, Lock, Shield,
  Star, Target, ArrowRight, Download, Filter, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

const STAGE_LABELS: Record<string, { zh: string; en: string; icon: typeof GraduationCap; color: string }> = {
  onboarding: { zh: "入职培训", en: "Onboarding", icon: BookOpen, color: "bg-blue-500" },
  "3_month": { zh: "3个月岗位技能", en: "3-Month Skills", icon: Target, color: "bg-cyan-500" },
  "6_month": { zh: "6个月专业深化", en: "6-Month Advanced", icon: TrendingUp, color: "bg-purple-500" },
  "12_month": { zh: "12个月综合评估", en: "12-Month Review", icon: Award, color: "bg-amber-500" },
  annual: { zh: "年度进阶", en: "Annual", icon: Star, color: "bg-rose-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "待开始", color: "bg-slate-100 text-slate-600", icon: Clock },
  active: { label: "进行中", color: "bg-blue-100 text-blue-700", icon: RefreshCw },
  completed: { label: "已完成", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  overdue: { label: "已逾期", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  skipped: { label: "已跳过", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

const FORMAT_LABELS: Record<string, string> = {
  online: "线上",
  offline: "线下",
  self_study: "自学",
  blended: "混合",
};

const CATEGORY_ICONS: Record<string, string> = {
  video: "🎬",
  document: "📄",
  slides: "📊",
  quiz: "❓",
  link: "🔗",
  handbook: "📘",
  "3d_model": "🧊",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
  expert: "bg-red-100 text-red-700",
};

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function EmployeeGrowthPlatform() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">员工成长平台</h1>
            <p className="text-sm text-muted-foreground">培训资料 · 阶段计划 · 表彰处罚 · 任务指标 · 云厅授权 · 周期报告</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />成长概览</TabsTrigger>
            <TabsTrigger value="materials" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />培训资料库</TabsTrigger>
            <TabsTrigger value="stages" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" />阶段性培训</TabsTrigger>
            <TabsTrigger value="rewards" className="gap-1.5"><Award className="h-3.5 w-3.5" />表彰与处罚</TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />任务质量指标</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5"><FileText className="h-3.5 w-3.5" />周期性报告</TabsTrigger>
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

// ═══════════════════════════════════════════════════════════════
// Tab 1: Overview — 成长概览
// ═══════════════════════════════════════════════════════════════

function OverviewTab() {
  const plans = trpc.employeeGrowth.stagePlan.getMyPlans.useQuery();
  const rpSummary = trpc.employeeGrowth.rewardPenalty.getSummary.useQuery({});
  const taskTrend = trpc.employeeGrowth.taskMetrics.getTrend.useQuery({ months: 6 });

  const stageOrder = ["onboarding", "3_month", "6_month", "12_month", "annual"];
  const sortedPlans = (plans.data ?? []).sort(
    (a, b) => stageOrder.indexOf(a.lifecycleStage) - stageOrder.indexOf(b.lifecycleStage),
  );

  return (
    <div className="space-y-6">
      {/* Lifecycle Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-500" />成长轨迹时间线</CardTitle>
          <CardDescription>从入职到进阶的阶段性培训进度</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedPlans.length > 0 ? (
            <div className="flex items-center gap-2">
              {sortedPlans.map((plan, i) => {
                const cfg = STAGE_LABELS[plan.lifecycleStage] ?? STAGE_LABELS.onboarding;
                const st = STATUS_CONFIG[plan.status ?? "pending"];
                const Icon = cfg.icon;
                return (
                  <div key={plan.id} className="flex items-center gap-2 flex-1">
                    <div className={`flex flex-col items-center gap-1 flex-1 rounded-lg border p-3 ${plan.status === "completed" ? "border-green-300 bg-green-50" : plan.status === "active" ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${cfg.color} text-white`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium">{cfg.zh}</span>
                      <Badge variant="secondary" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">{plan.dueDate}</span>
                      {plan.testScore != null && (
                        <span className="text-xs font-mono">{plan.testScore}分 {plan.testPassed ? "✓" : "✗"}</span>
                      )}
                    </div>
                    {i < sortedPlans.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">暂无培训计划，请联系HR部门安排</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">培训完成</p>
                <p className="text-2xl font-bold">{sortedPlans.filter((p) => p.status === "completed").length}/{sortedPlans.length}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">表彰次数</p>
                <p className="text-2xl font-bold text-green-600">{rpSummary.data?.totalRewards ?? 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">处罚次数</p>
                <p className="text-2xl font-bold text-red-600">{rpSummary.data?.totalPenalties ?? 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">本月质量评分</p>
                <p className="text-2xl font-bold">{taskTrend.data?.[taskTrend.data.length - 1]?.avgQualityScore?.toFixed(1) ?? "—"}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Metrics Trend */}
      {(taskTrend.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-purple-500" />任务质量趋势（近6个月）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {(taskTrend.data ?? []).map((m) => {
                const completion = m.tasksAssigned ? ((m.tasksCompleted ?? 0) / m.tasksAssigned * 100) : 0;
                return (
                  <div key={m.period} className="text-center space-y-1">
                    <p className="text-xs text-muted-foreground">{m.period}</p>
                    <div className="h-20 flex flex-col items-center justify-end">
                      <div
                        className="w-8 rounded-t bg-gradient-to-t from-blue-500 to-cyan-400"
                        style={{ height: `${Math.max(completion * 0.8, 4)}px` }}
                      />
                    </div>
                    <p className="text-xs font-medium">{completion.toFixed(0)}%</p>
                    <p className="text-[10px] text-muted-foreground">质量 {m.avgQualityScore?.toFixed(0) ?? "—"}</p>
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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索培训资料（标题、编码、标签）..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="全部类别" /></SelectTrigger>
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
          <Card key={m.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[m.category] ?? "📁"}</span>
                  <div>
                    <p className="font-medium text-sm leading-tight">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.code}</p>
                  </div>
                </div>
                {!m.isPublic && <Lock className="h-4 w-4 text-amber-500" title="需要授权" />}
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.description}</p>
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {m.difficulty && (
                  <Badge variant="secondary" className={`text-[10px] ${DIFFICULTY_COLORS[m.difficulty] ?? ""}`}>
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
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
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
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>暂无符合条件的培训资料</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 3: Stages — 阶段性培训
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
    <div className="space-y-4">
      {(plans.data ?? []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>暂无阶段性培训计划</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(plans.data ?? []).map((plan) => {
            const cfg = STAGE_LABELS[plan.lifecycleStage] ?? STAGE_LABELS.onboarding;
            const st = STATUS_CONFIG[plan.status ?? "pending"];
            const Icon = cfg.icon;
            const StIcon = st.icon;
            const materialIds = (plan.materialIds as number[] | null) ?? [];
            const criteria = plan.completionCriteria as { testRequired?: boolean; minScore?: number; managerApproval?: boolean } | null;

            return (
              <Card key={plan.id} className={plan.status === "completed" ? "border-green-200" : plan.status === "overdue" ? "border-red-200" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${cfg.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{plan.planName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className={`text-xs ${st.color}`}>
                            <StIcon className="h-3 w-3 mr-1" />{st.label}
                          </Badge>
                          {plan.trainingFormat && (
                            <Badge variant="outline" className="text-xs">{FORMAT_LABELS[plan.trainingFormat] ?? plan.trainingFormat}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>开始: {plan.triggerDate}</p>
                      <p>截止: {plan.dueDate}</p>
                    </div>
                  </div>

                  {/* Completion criteria */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    {criteria?.testRequired && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />需要测试 (≥{criteria.minScore ?? 60}分)
                      </span>
                    )}
                    {criteria?.managerApproval && (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />需主管签批
                      </span>
                    )}
                    {materialIds.length > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />{materialIds.length}份学习资料
                      </span>
                    )}
                  </div>

                  {/* Test result */}
                  {plan.testScore != null && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span>测试成绩: <strong>{plan.testScore}</strong>分</span>
                      {plan.testPassed ? (
                        <Badge className="bg-green-100 text-green-700">通过</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">未通过</Badge>
                      )}
                    </div>
                  )}

                  {/* Supervisor signoff */}
                  {plan.supervisorSignoff && (
                    <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />主管已签批 ({plan.supervisorSignoffAt ? new Date(plan.supervisorSignoffAt).toLocaleDateString() : ""})
                    </div>
                  )}

                  {/* Actions */}
                  {plan.status !== "completed" && plan.status !== "skipped" && criteria?.testRequired && plan.testScore == null && (
                    <div className="mt-3 flex items-center gap-2">
                      {testingPlanId === plan.id ? (
                        <>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="输入测试分数"
                            value={testScore}
                            onChange={(e) => setTestScore(e.target.value)}
                            className="w-32 h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              const score = Number(testScore);
                              if (score >= 0 && score <= 100) {
                                submitTest.mutate({ id: plan.id, testScore: score });
                                setTestingPlanId(null);
                                setTestScore("");
                              }
                            }}
                            disabled={submitTest.isPending}
                          >
                            提交成绩
                          </Button>
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
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardContent className="pt-4 text-center">
            <Trophy className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{summary.data?.totalRewards ?? 0}</p>
            <p className="text-xs text-muted-foreground">表彰次数</p>
            {(summary.data?.rewardAmount ?? 0) > 0 && (
              <p className="text-sm text-green-600 mt-1">+¥{summary.data?.rewardAmount.toFixed(0)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{summary.data?.totalPenalties ?? 0}</p>
            <p className="text-xs text-muted-foreground">处罚次数</p>
            {(summary.data?.penaltyAmount ?? 0) > 0 && (
              <p className="text-sm text-red-600 mt-1">-¥{summary.data?.penaltyAmount.toFixed(0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Star className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <p className={`text-2xl font-bold ${(summary.data?.netAmount ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(summary.data?.netAmount ?? 0) >= 0 ? "+" : ""}¥{summary.data?.netAmount?.toFixed(0) ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">净激励金额</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button size="sm" variant={type === "all" ? "default" : "outline"} onClick={() => setType("all")}>全部</Button>
        <Button size="sm" variant={type === "reward" ? "default" : "outline"} onClick={() => setType("reward")} className="gap-1"><Trophy className="h-3 w-3" />表彰</Button>
        <Button size="sm" variant={type === "penalty" ? "default" : "outline"} onClick={() => setType("penalty")} className="gap-1"><AlertTriangle className="h-3 w-3" />处罚</Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {(list.data?.items ?? []).map((item) => (
          <Card key={item.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${item.type === "reward" ? "bg-green-100" : "bg-red-100"}`}>
                  {item.type === "reward" ? <Trophy className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.issuedAt} · {item.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.amount != null && item.amount > 0 && (
                  <span className={`text-sm font-medium ${item.type === "reward" ? "text-green-600" : "text-red-600"}`}>
                    {item.type === "reward" ? "+" : "-"}¥{item.amount}
                  </span>
                )}
                <Badge variant="secondary" className={`text-xs ${item.status === "active" ? "" : item.status === "appealed" ? "bg-amber-100 text-amber-700" : "bg-gray-100"}`}>
                  {item.status === "active" ? "生效" : item.status === "appealed" ? "申诉中" : item.status === "revoked" ? "已撤销" : item.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {(list.data?.items ?? []).length === 0 && !list.isLoading && (
          <p className="text-center py-8 text-muted-foreground">暂无记录</p>
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
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>暂无任务指标数据</p>
        </div>
      ) : (
        <>
          {/* Latest month highlight */}
          {data[0] && (
            <div className="grid grid-cols-5 gap-3">
              <MetricCard label="分配任务" value={data[0].tasksAssigned ?? 0} color="text-slate-700" />
              <MetricCard label="已完成" value={data[0].tasksCompleted ?? 0} color="text-blue-600" />
              <MetricCard label="准时完成" value={data[0].tasksOnTime ?? 0} color="text-green-600" />
              <MetricCard label="质量评分" value={data[0].avgQualityScore?.toFixed(1) ?? "—"} color="text-purple-600" />
              <MetricCard label="缺陷数" value={data[0].defectCount ?? 0} color="text-red-600" />
            </div>
          )}

          {/* Monthly table */}
          <Card>
            <CardHeader><CardTitle className="text-base">月度指标明细</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">月份</th>
                      <th className="pb-2 pr-4 text-right">分配</th>
                      <th className="pb-2 pr-4 text-right">完成</th>
                      <th className="pb-2 pr-4 text-right">准时</th>
                      <th className="pb-2 pr-4 text-right">逾期</th>
                      <th className="pb-2 pr-4 text-right">质量分</th>
                      <th className="pb-2 pr-4 text-right">缺陷</th>
                      <th className="pb-2 text-right">完成率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((m) => {
                      const rate = m.tasksAssigned ? ((m.tasksCompleted ?? 0) / m.tasksAssigned * 100) : 0;
                      return (
                        <tr key={m.period} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{m.period}</td>
                          <td className="py-2 pr-4 text-right">{m.tasksAssigned}</td>
                          <td className="py-2 pr-4 text-right">{m.tasksCompleted}</td>
                          <td className="py-2 pr-4 text-right text-green-600">{m.tasksOnTime}</td>
                          <td className="py-2 pr-4 text-right text-red-600">{m.tasksOverdue}</td>
                          <td className="py-2 pr-4 text-right">{m.avgQualityScore?.toFixed(1) ?? "—"}</td>
                          <td className="py-2 pr-4 text-right">{m.defectCount}</td>
                          <td className="py-2 text-right">
                            <span className={rate >= 90 ? "text-green-600" : rate >= 70 ? "text-amber-600" : "text-red-600"}>
                              {rate.toFixed(0)}%
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

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
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
  const history = trpc.employeeGrowth.periodicReport.listHistory.useQuery({
    reportType,
    year: selectedYear,
    pageSize: 50,
  });

  const today = new Date().toISOString().slice(0, 10);
  const currentWeek = getWeekString(new Date());
  const currentMonth = today.slice(0, 7);
  const currentQuarter = `${today.slice(0, 4)}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const currentYear = today.slice(0, 4);

  const currentPeriod = reportType === "daily" ? today
    : reportType === "weekly" ? currentWeek
    : reportType === "monthly" ? currentMonth
    : reportType === "quarterly" ? currentQuarter
    : currentYear;

  const currentReport = trpc.employeeGrowth.periodicReport.getOrCreate.useQuery({
    reportType,
    period: currentPeriod,
  });

  const utils = trpc.useUtils();

  // Daily submission
  const [dailyPlan, setDailyPlan] = useState("");
  const [dailyDone, setDailyDone] = useState("");
  const submitDaily = trpc.employeeGrowth.periodicReport.submitDaily.useMutation({
    onSuccess: () => {
      toast.success("日报已提交");
      utils.employeeGrowth.periodicReport.invalidate();
    },
  });

  // Weekly submission
  const [weeklyAccomplishments, setWeeklyAccomplishments] = useState("");
  const [weeklyChallenges, setWeeklyChallenges] = useState("");
  const [weeklyGoals, setWeeklyGoals] = useState("");
  const submitWeekly = trpc.employeeGrowth.periodicReport.submitWeekly.useMutation({
    onSuccess: () => {
      toast.success("周报已提交");
      utils.employeeGrowth.periodicReport.invalidate();
    },
  });

  const TYPE_LABELS: Record<string, string> = {
    daily: "日报",
    weekly: "周报",
    monthly: "月报",
    quarterly: "季报",
    annual: "年报",
  };

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="flex items-center gap-2">
        {(["daily", "weekly", "monthly", "quarterly", "annual"] as const).map((rt) => (
          <Button
            key={rt}
            size="sm"
            variant={reportType === rt ? "default" : "outline"}
            onClick={() => setReportType(rt)}
          >
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
            <CardHeader>
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
                    <Textarea
                      placeholder="每行一项计划任务..."
                      value={dailyPlan}
                      onChange={(e) => setDailyPlan(e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">完成情况</label>
                    <Textarea
                      placeholder="每行一项完成情况（格式：任务名称 | 完成/部分完成/未开始 | 实际工时）..."
                      value={dailyDone}
                      onChange={(e) => setDailyDone(e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const planned = dailyPlan.split("\n").filter(Boolean).map((line) => ({
                        title: line.trim(),
                        priority: "normal",
                        estimatedHours: 1,
                      }));
                      const completed = dailyDone.split("\n").filter(Boolean).map((line) => {
                        const parts = line.split("|").map((s) => s.trim());
                        return {
                          title: parts[0] || line.trim(),
                          status: (parts[1]?.includes("完成") ? "done" : parts[1]?.includes("部分") ? "partial" : "not_started") as "done" | "partial" | "not_started",
                          actualHours: parseFloat(parts[2]) || 1,
                        };
                      });
                      submitDaily.mutate({ period: currentPeriod, plannedItems: planned, completedItems: completed });
                    }}
                    disabled={submitDaily.isPending}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />提交日报
                  </Button>
                </div>
              )}

              {reportType === "weekly" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">本周主要成果</label>
                    <Textarea
                      placeholder="每行一项成果..."
                      value={weeklyAccomplishments}
                      onChange={(e) => setWeeklyAccomplishments(e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">遇到的挑战</label>
                    <Textarea
                      placeholder="每行一项挑战..."
                      value={weeklyChallenges}
                      onChange={(e) => setWeeklyChallenges(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">下周目标</label>
                    <Textarea
                      placeholder="每行一项目标..."
                      value={weeklyGoals}
                      onChange={(e) => setWeeklyGoals(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      submitWeekly.mutate({
                        period: currentPeriod,
                        keyAccomplishments: weeklyAccomplishments.split("\n").filter(Boolean),
                        challenges: weeklyChallenges.split("\n").filter(Boolean),
                        nextPeriodGoals: weeklyGoals.split("\n").filter(Boolean),
                      });
                    }}
                    disabled={submitWeekly.isPending}
                    className="gap-1"
                  >
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
          <CardHeader>
            <CardTitle className="text-base">历史记录</CardTitle>
            <CardDescription>{selectedYear}年 · {TYPE_LABELS[reportType]}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {(history.data?.items ?? []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer text-sm">
                    <div>
                      <p className="font-medium">{r.period}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.status === "submitted" ? "已提交" : r.status === "reviewed" ? "已审阅" : r.status === "draft" ? "草稿" : r.status}
                      </p>
                    </div>
                    {r.kpiOverallScore != null && (
                      <Badge variant="secondary">{r.kpiOverallScore.toFixed(0)}分</Badge>
                    )}
                    {r.completionRate != null && (
                      <Badge variant="secondary">{r.completionRate.toFixed(0)}%</Badge>
                    )}
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
          <h4 className="text-sm font-medium mb-2">KPI汇总</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-1 text-left">指标</th>
                  <th className="pb-1 text-right">目标</th>
                  <th className="pb-1 text-right">实际</th>
                  <th className="pb-1 text-right">得分</th>
                  <th className="pb-1 text-right">趋势</th>
                </tr>
              </thead>
              <tbody>
                {kpiSummary.map((k, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1">{k.kpiName}</td>
                    <td className="py-1 text-right">{k.target}</td>
                    <td className="py-1 text-right">{k.actual}</td>
                    <td className="py-1 text-right font-medium">{k.score}</td>
                    <td className="py-1 text-right">
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
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold">{taskSummary.assigned}</p>
            <p className="text-xs text-muted-foreground">分配任务</p>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold">{taskSummary.completed}</p>
            <p className="text-xs text-muted-foreground">已完成</p>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold">{taskSummary.onTimeRate}%</p>
            <p className="text-xs text-muted-foreground">准时率</p>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold">{taskSummary.qualityScore}</p>
            <p className="text-xs text-muted-foreground">质量评分</p>
          </div>
        </div>
      )}

      {/* R&P Summary */}
      {rpSummary && (rpSummary.totalRewards > 0 || rpSummary.totalPenalties > 0) && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600">表彰 {rpSummary.totalRewards}次</span>
          <span className="text-red-600">处罚 {rpSummary.totalPenalties}次</span>
        </div>
      )}

      {/* Accomplishments & Challenges */}
      {accomplishments && accomplishments.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-1">主要成果</h4>
          <ul className="text-sm space-y-0.5">
            {accomplishments.map((a, i) => <li key={i} className="flex items-start gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />{a}</li>)}
          </ul>
        </div>
      )}
      {challenges && challenges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-1">挑战与问题</h4>
          <ul className="text-sm space-y-0.5">
            {challenges.map((c, i) => <li key={i} className="flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />{c}</li>)}
          </ul>
        </div>
      )}

      {/* AI Narrative */}
      {report.aiNarrative && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">AI分析</p>
          <p className="text-sm whitespace-pre-wrap">{report.aiNarrative as string}</p>
        </div>
      )}

      {/* Manager Comments */}
      {report.managerComments && (
        <div className="p-3 border-l-4 border-blue-400 bg-blue-50 rounded">
          <p className="text-xs font-medium text-blue-600 mb-1">主管评语</p>
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
