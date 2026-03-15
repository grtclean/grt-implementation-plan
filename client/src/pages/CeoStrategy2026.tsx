/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  2026战略指挥中心 — CEO Strategy Command Center             ║
 * ║  实时联动: 项目/生产/质量/工时 → KPI → OKR → 战略目标       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Target,
  Truck,
  DollarSign,
  Users,
  RefreshCw,
  Database,
  ChevronDown,
  ChevronRight,
  Crown,
  BarChart3,
  Shield,
  Sparkles,
  Zap,
  Factory,
  ArrowRight,
  Radio,
  GitBranch,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, any> = {
  revenue: TrendingUp,
  quality: Target,
  delivery: Truck,
  cost: DollarSign,
  team: Users,
};

const CATEGORY_COLORS: Record<string, string> = {
  revenue: "text-blue-600",
  quality: "text-emerald-600",
  delivery: "text-orange-500",
  cost: "text-violet-600",
  team: "text-pink-500",
};

const CATEGORY_BG: Record<string, string> = {
  revenue: "from-blue-500 to-blue-600",
  quality: "from-emerald-500 to-emerald-600",
  delivery: "from-orange-500 to-orange-600",
  cost: "from-violet-500 to-violet-600",
  team: "from-pink-500 to-pink-600",
};

function ragColor(rag: string) {
  if (rag === "G") return "bg-emerald-500";
  if (rag === "A") return "bg-amber-500";
  return "bg-red-500";
}

function ragBadge(rag: string) {
  if (rag === "G") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Green</Badge>;
  if (rag === "A") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Amber</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Red</Badge>;
}

function progressColor(pct: number) {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function letterGrade(score: number) {
  if (score >= 90) return { letter: "A", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (score >= 80) return { letter: "B", color: "text-blue-600 bg-blue-50 border-blue-200" };
  if (score >= 70) return { letter: "C", color: "text-amber-600 bg-amber-50 border-amber-200" };
  return { letter: "D", color: "text-red-600 bg-red-50 border-red-200" };
}

function formatValue(val: number, unit: string): string {
  if (unit === "CNY") {
    if (val >= 100000000) return `${(val / 100000000).toFixed(1)}亿`;
    if (val >= 10000) return `${(val / 10000).toFixed(0)}万`;
    return val.toLocaleString();
  }
  if (unit === "DPPM") return val.toFixed(0);
  if (unit === "% reduction") return `${val}%`;
  return val.toLocaleString();
}

function computeGoalPct(goal: any): number {
  const target = Number(goal.target_value ?? goal.targetValue) || 1;
  const current = Number(goal.current_value ?? goal.currentValue) || 0;
  const isLowerBetter = goal.category === "quality" && goal.unit === "DPPM";
  if (isLowerBetter) return Math.min(100, (target / Math.max(current, 1)) * 100);
  return Math.min(100, (current / target) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CeoStrategy2026() {
  const { t } = useLanguage();
  const { role, level } = useUserProfile();
  const canManage = level >= 5; // director+ can manage strategy
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // ─── Goal CRUD state ───
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [editingKpi, setEditingKpi] = useState<any>(null);
  const [goalForm, setGoalForm] = useState({ metricName: "", metricNameEn: "", targetValue: "", currentValue: "0", unit: "CNY", weight: "0.2", category: "revenue" as string });

  // ─── Queries ───
  const dashboardQuery = trpc.strategyGoals.getDashboard.useQuery({ year: 2026 });
  const liveMetrics = trpc.strategyGoals.getLiveMetrics.useQuery();
  const linkageMap = trpc.strategyGoals.getLinkageMap.useQuery();
  const okrCascade = trpc.strategyGoals.getOkrCascade.useQuery({ year: 2026 });
  const recentEvents = trpc.strategyGoals.getRecentEvents.useQuery({ limit: 10 });

  // ─── Mutations ───
  const seedMutation = trpc.strategyGoals.seedDemo.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); toast.success("Demo数据已重置"); },
  });
  const syncMutation = trpc.strategyGoals.syncLiveToKpis.useMutation({
    onSuccess: (data) => { dashboardQuery.refetch(); liveMetrics.refetch(); toast.success(data.message); },
    onError: (e) => toast.error(`同步失败: ${e.message}`),
  });
  const createGoalMut = trpc.strategyGoals.createCompanyGoal.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); setShowCreateGoal(false); resetGoalForm(); toast.success("战略目标已创建"); },
    onError: (e) => toast.error(e.message),
  });
  const updateGoalMut = trpc.strategyGoals.updateCompanyGoal.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); setEditingGoal(null); toast.success("目标已更新"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteGoalMut = trpc.strategyGoals.deleteCompanyGoal.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); toast.success("目标已删除"); },
    onError: (e) => toast.error(e.message),
  });
  const updateKpiMut = trpc.strategyGoals.updateDivisionKpi.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); setEditingKpi(null); toast.success("KPI已更新"); },
    onError: (e) => toast.error(e.message),
  });

  const resetGoalForm = useCallback(() => {
    setGoalForm({ metricName: "", metricNameEn: "", targetValue: "", currentValue: "0", unit: "CNY", weight: "0.2", category: "revenue" });
  }, []);

  const data = dashboardQuery.data;
  const live = liveMetrics.data;
  const grade = data ? letterGrade(data.overallProgress) : null;

  const sortedDivisions = data
    ? [...data.divisionSummary].sort((a, b) => b.weightedScore - a.weightedScore)
    : [];

  const worstBU = sortedDivisions.length > 0 ? sortedDivisions[sortedDivisions.length - 1] : null;
  const worstKpi = worstBU
    ? [...worstBU.kpis].sort((a: any, b: any) => (Number(a.completion_pct) || 0) - (Number(b.completion_pct) || 0))[0]
    : null;

  const refetchAll = () => {
    dashboardQuery.refetch();
    liveMetrics.refetch();
    recentEvents.refetch();
    okrCascade.refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              2026战略指挥中心
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              实时联动: 运营数据 → KPI → OKR → 战略目标 | GRT深度融合迭代
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data && grade && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${grade.color}`}>
              <div className="text-3xl font-bold">{grade.letter}</div>
              <div className="text-sm leading-tight">
                <div className="font-semibold">{data.overallProgress.toFixed(1)}%</div>
                <div className="opacity-70">Overall</div>
              </div>
            </div>
          )}
          <Button size="sm" onClick={() => syncMutation.mutate({ year: 2026 })} disabled={syncMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Zap className="h-4 w-4 mr-1" />
            {syncMutation.isPending ? "同步中..." : "同步实时数据"}
          </Button>
          <Button variant="outline" size="sm" onClick={refetchAll} disabled={dashboardQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <Database className="h-4 w-4 mr-1" />
            {seedMutation.isPending ? "初始化..." : "重置Demo"}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {dashboardQuery.isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">加载战略数据...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {dashboardQuery.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700 text-sm">
            加载失败: {dashboardQuery.error.message}
          </CardContent>
        </Card>
      )}

      {/* ── Main Tabs ──────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />战略总览</TabsTrigger>
          <TabsTrigger value="live" className="gap-1.5"><Activity className="w-3.5 h-3.5" />实时联动</TabsTrigger>
          <TabsTrigger value="linkage" className="gap-1.5"><GitBranch className="w-3.5 h-3.5" />联动地图</TabsTrigger>
          <TabsTrigger value="okr" className="gap-1.5"><Layers className="w-3.5 h-3.5" />OKR级联</TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: 战略总览 (Original dashboard) ═══ */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {data && (
            <>
              {/* Company Objectives */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    公司级战略目标
                  </h2>
                  {canManage && (
                    <Button size="sm" onClick={() => { resetGoalForm(); setShowCreateGoal(true); }}>
                      <Plus className="h-4 w-4 mr-1" />新建目标
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.companyGoals.map((goal: any) => {
                    const pct = computeGoalPct(goal);
                    const Icon = CATEGORY_ICONS[goal.category] || Target;
                    const colorClass = CATEGORY_COLORS[goal.category] || "text-gray-600";
                    return (
                      <Card key={goal.id} className="border shadow-sm hover:shadow-md transition-shadow group">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg bg-gray-100 ${colorClass}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <CardTitle className="text-sm font-semibold text-gray-900">{goal.metric_name}</CardTitle>
                                <p className="text-xs text-gray-400">{goal.metric_name_en}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">{(Number(goal.weight) * 100).toFixed(0)}%</Badge>
                              {canManage && (
                                <div className="hidden group-hover:flex items-center gap-0.5">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingGoal(goal)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => { if (confirm(`确认删除「${goal.metric_name}」？关联的事业部KPI也将被删除。`)) deleteGoalMut.mutate({ id: goal.id }); }}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className="text-2xl font-bold text-gray-900">
                                {formatValue(Number(goal.current_value), goal.unit)}
                              </span>
                              <span className="text-sm text-gray-400">
                                / {formatValue(Number(goal.target_value), goal.unit)} {goal.unit === "DPPM" ? "DPPM" : ""}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-medium ${pct >= 90 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                                {pct.toFixed(1)}% 达成
                              </span>
                              <span className="text-gray-400">{goal.category}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Division Matrix */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  事业部绩效矩阵
                </h2>
                <Card className="border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="w-8" />
                          <TableHead className="font-semibold">事业部</TableHead>
                          <TableHead className="font-semibold">负责人</TableHead>
                          <TableHead className="font-semibold text-right">营收</TableHead>
                          <TableHead className="font-semibold text-right">FAT</TableHead>
                          <TableHead className="font-semibold text-right">OTD</TableHead>
                          <TableHead className="font-semibold text-right">DPPM</TableHead>
                          <TableHead className="font-semibold text-right">成本</TableHead>
                          <TableHead className="font-semibold text-right">团队</TableHead>
                          <TableHead className="font-semibold text-right">综合分</TableHead>
                          <TableHead className="font-semibold text-center">RAG</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedDivisions.map((div) => {
                          const isExpanded = expandedRow === div.divisionCode;
                          const hasRed = div.ragCounts.R > 0;
                          const hasAmber = div.ragCounts.A > 0;
                          const rowRag = hasRed ? "R" : hasAmber ? "A" : "G";
                          return (
                            <TableRowGroup key={div.divisionCode}>
                              <TableRow className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                                onClick={() => setExpandedRow(isExpanded ? null : div.divisionCode)}>
                                <TableCell className="w-8">
                                  {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                </TableCell>
                                <TableCell className="font-medium">{div.divisionName}</TableCell>
                                <TableCell>{div.managerName}</TableCell>
                                {div.kpis.map((kpi: any, i: number) => (
                                  <TableCell key={i} className="text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${ragColor(kpi.rag_status)}`} />
                                      <span className="text-sm">{formatValue(Number(kpi.current_value), kpi.unit)}</span>
                                      <span className="text-xs text-gray-400">/{formatValue(Number(kpi.target_value), kpi.unit)}</span>
                                    </div>
                                  </TableCell>
                                ))}
                                <TableCell className="text-right">
                                  <span className="font-semibold text-gray-900">{div.weightedScore.toFixed(1)}</span>
                                </TableCell>
                                <TableCell className="text-center">{ragBadge(rowRag)}</TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-gray-50/50">
                                  <TableCell colSpan={11} className="py-3 px-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {div.kpis.map((kpi: any, i: number) => (
                                        <div key={i} className="bg-white rounded-lg border p-3 text-sm">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full ${ragColor(kpi.rag_status)}`} />
                                            <span className="font-medium flex-1">{kpi.metric_name}</span>
                                            {canManage && (
                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setEditingKpi(kpi); }}>
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 leading-relaxed">{kpi.evaluation_criteria}</p>
                                          <div className="mt-2 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                              <div className={`h-full rounded-full ${progressColor(Number(kpi.completion_pct))}`}
                                                style={{ width: `${Math.min(Number(kpi.completion_pct), 100)}%` }} />
                                            </div>
                                            <span className="text-xs text-gray-500">{Number(kpi.completion_pct).toFixed(1)}%</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableRowGroup>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>

              {/* AI Alignment */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  AI对齐分析
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">KPI同步状态</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-gray-900">{data.aiAlignment.totalKpis}</span>
                          <span className="text-sm text-gray-400">KPI指标跟踪</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Green同步率</span>
                            <span className="font-medium text-emerald-600">{data.aiAlignment.syncPct}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${data.aiAlignment.syncPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">RAG分布</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-8 rounded-lg overflow-hidden flex">
                          {data.aiAlignment.green > 0 && (
                            <div className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(data.aiAlignment.green / data.aiAlignment.totalKpis) * 100}%` }}>{data.aiAlignment.green}</div>
                          )}
                          {data.aiAlignment.amber > 0 && (
                            <div className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(data.aiAlignment.amber / data.aiAlignment.totalKpis) * 100}%` }}>{data.aiAlignment.amber}</div>
                          )}
                          {data.aiAlignment.red > 0 && (
                            <div className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(data.aiAlignment.red / data.aiAlignment.totalKpis) * 100}%` }}>{data.aiAlignment.red}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Green: {data.aiAlignment.green}</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Amber: {data.aiAlignment.amber}</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Red: {data.aiAlignment.red}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border shadow-sm bg-gradient-to-br from-violet-50 to-white">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-violet-700">AI建议</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                        {worstBU && worstKpi ? (
                          <>
                            <p><span className="font-semibold text-red-600">{worstBU.divisionName}</span> 需立即关注，综合评分 <span className="font-semibold">{worstBU.weightedScore.toFixed(1)}</span> (最低)。</p>
                            <p>优先KPI: <span className="font-medium">{(worstKpi as any).metric_name}</span> 完成率 <span className="font-semibold text-red-600">{Number((worstKpi as any).completion_pct).toFixed(1)}%</span> — 建议约谈 <span className="font-medium">{worstBU.managerName}</span>。</p>
                          </>
                        ) : (
                          <p>所有事业部运行正常，持续监控。</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══ Tab 2: 实时联动 (Live Linkage Dashboard) ═══ */}
        <TabsContent value="live" className="space-y-6 mt-4">
          {live && (
            <>
              {/* Live Metric Cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    运营实时指标
                  </h2>
                  <Badge variant="outline" className="text-[10px]">
                    <Radio className="w-3 h-3 mr-1 text-green-500 animate-pulse" />
                    {new Date(live.timestamp).toLocaleTimeString("zh-CN")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Revenue Pipeline */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-gray-500">营收管线</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{formatValue(live.projectPipeline.totalContractAmount || live.projectPipeline.totalBudget, "CNY")}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {live.projectPipeline.active} 活跃项目 / {live.projectPipeline.total} 总计
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-gray-500">{live.projectPipeline.healthCounts.green}</span>
                        <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" /><span className="text-[10px] text-gray-500">{live.projectPipeline.healthCounts.yellow}</span>
                        <span className="w-2 h-2 rounded-full bg-red-500 ml-1" /><span className="text-[10px] text-gray-500">{live.projectPipeline.healthCounts.red}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* OTD */}
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-medium text-gray-500">交付及时率</span>
                      </div>
                      <div className={`text-2xl font-bold ${live.production.otdRate >= 90 ? "text-emerald-600" : live.production.otdRate >= 70 ? "text-amber-600" : "text-red-600"}`}>
                        {live.production.otdRate}%
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {live.production.completedWorkOrders} 完成 / {live.production.totalWorkOrders} 总工单
                      </div>
                      {live.production.overdueWorkOrders > 0 && (
                        <Badge variant="destructive" className="text-[10px] mt-2">{live.production.overdueWorkOrders} 逾期</Badge>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quality */}
                  <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-medium text-gray-500">FAT通过率</span>
                      </div>
                      <div className={`text-2xl font-bold ${live.quality.fatPassRate >= 95 ? "text-emerald-600" : live.quality.fatPassRate >= 90 ? "text-amber-600" : "text-red-600"}`}>
                        {live.quality.fatPassRate}%
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {live.quality.totalAccepted}/{live.quality.totalInspected} 通过 | 均分 {live.quality.avgQualityScore}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cost / Hours */}
                  <Card className="border-l-4 border-l-violet-500">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-violet-600" />
                        <span className="text-xs font-medium text-gray-500">工时利用</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{live.workforce.totalHours.toLocaleString()}h</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {live.workforce.uniqueWorkers} 工人 / {live.workforce.approvedLogs} 已审批
                      </div>
                    </CardContent>
                  </Card>

                  {/* OKR */}
                  <Card className="border-l-4 border-l-pink-500">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="h-4 w-4 text-pink-500" />
                        <span className="text-xs font-medium text-gray-500">OKR进度</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{live.okr.avgProgress}%</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {live.okr.activeCount} 进行中 / {live.okr.completedCount} 已完成
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* BU Breakdown */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Factory className="h-5 w-5 text-indigo-600" />
                  事业部运营实况
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {Object.entries(live.buBreakdown).filter(([k]) => k !== "UNKNOWN").map(([buCode, buData]) => {
                    const BU_NAMES: Record<string, string> = { BU1: "海外事业部", BU2: "商用车事业部", BU3: "乘用车事业部", BU4: "半导体事业部", BU5: "工业通用事业部" };
                    return (
                      <Card key={buCode} className="border shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center justify-between">
                            <span>{BU_NAMES[buCode] ?? buCode}</span>
                            <Badge variant="outline" className="text-[10px]">{buCode}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">项目</span>
                            <span className="font-medium">{buData.projects} 个</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">营收管线</span>
                            <span className="font-medium">{formatValue(buData.revenue, "CNY")}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">工单</span>
                            <span className="font-medium">{buData.wos} 单</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">平均进度</span>
                            <span className={`font-medium ${buData.completion >= 70 ? "text-emerald-600" : "text-amber-600"}`}>{buData.completion}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Recent Events */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Radio className="h-5 w-5 text-green-500 animate-pulse" />
                  最新事件流
                </h2>
                <Card className="border shadow-sm">
                  <CardContent className="pt-4">
                    {(recentEvents.data ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">暂无事件，操作模块后自动生成</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-auto">
                        {(recentEvents.data ?? []).map((evt: any) => (
                          <div key={evt.id} className="flex items-center gap-3 p-2 rounded border bg-gray-50/50 text-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs text-gray-600">{evt.eventType}</span>
                              {evt.targetModules?.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {(evt.targetModules as string[]).slice(0, 4).map((m: string) => (
                                    <Badge key={m} variant="outline" className="text-[9px] px-1 py-0">{m}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {new Date(evt.createdAt).toLocaleTimeString("zh-CN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
          {!live && !liveMetrics.isLoading && (
            <Card className="border"><CardContent className="py-8 text-center text-gray-400">点击"同步实时数据"加载运营指标</CardContent></Card>
          )}
        </TabsContent>

        {/* ═══ Tab 3: 联动地图 (Linkage Map) ═══ */}
        <TabsContent value="linkage" className="space-y-6 mt-4">
          {linkageMap.data && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-indigo-600" />
                  模块 → KPI 联动地图
                </h2>
                <p className="text-sm text-gray-500 mb-4">每个KPI类别由哪些运营模块实时供给数据</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {linkageMap.data.linkages.map((link: any) => {
                    const Icon = CATEGORY_ICONS[link.kpiCategory] || Target;
                    const bg = CATEGORY_BG[link.kpiCategory] || "from-gray-500 to-gray-600";
                    return (
                      <Card key={link.kpiCategory} className="border shadow-sm overflow-hidden">
                        <div className={`h-1.5 bg-gradient-to-r ${bg}`} />
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg bg-gray-100 ${CATEGORY_COLORS[link.kpiCategory]}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-sm font-semibold">{link.kpiCategory.toUpperCase()}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-gray-600">{link.description}</p>
                          <Separator />
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">数据源模块</div>
                            <div className="flex flex-wrap gap-1.5">
                              {link.modules.map((mod: string) => (
                                <Badge key={mod} variant="secondary" className="text-xs">{mod}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">tRPC调用</div>
                            <div className="flex flex-wrap gap-1">
                              {link.sources.map((src: string) => (
                                <Badge key={src} variant="outline" className="text-[9px] font-mono px-1.5">{src}</Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Event Flow */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  事件总线联动
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {linkageMap.data.events.map((evt: any) => (
                    <Card key={evt.event} className="border shadow-sm">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">{evt.event}</Badge>
                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <Badge className="text-[10px] bg-indigo-100 text-indigo-700 flex-shrink-0">{evt.direction}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{evt.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══ Tab 4: OKR级联 ═══ */}
        <TabsContent value="okr" className="space-y-6 mt-4">
          {okrCascade.data && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-pink-600" />
                战略目标 → OKR 级联视图
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {okrCascade.data.totalGoals} 个公司目标 → {okrCascade.data.totalOkrs} 个OKR目标
              </p>

              <div className="space-y-4">
                {okrCascade.data.cascade.map((item: any) => {
                  const Icon = CATEGORY_ICONS[item.goal.category] || Target;
                  const pct = computeGoalPct(item.goal);
                  return (
                    <Card key={item.goal.id} className="border shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg bg-gray-100 ${CATEGORY_COLORS[item.goal.category]}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-semibold">{item.goal.metricName}</CardTitle>
                              <p className="text-xs text-gray-400">
                                {formatValue(item.goal.currentValue, item.goal.unit)} / {formatValue(item.goal.targetValue, item.goal.unit)}
                                {" "}({pct.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{item.goal.category}</Badge>
                            <Badge className={`text-xs ${item.linkedOkrCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                              {item.linkedOkrCount} OKR关联
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {item.okrObjectives.length > 0 && (
                        <CardContent>
                          <div className="space-y-2 ml-6 border-l-2 border-gray-200 pl-4">
                            {item.okrObjectives.map((okr: any) => (
                              <div key={okr.id} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">{okr.level}</Badge>
                                    <span className="text-sm font-medium">{okr.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{okr.period}</span>
                                    <Badge className={`text-[10px] ${okr.status === "completed" ? "bg-emerald-100 text-emerald-700" : okr.status === "active" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                      {okr.status}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${progressColor(okr.progress)}`} style={{ width: `${okr.progress}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-500">{okr.progress.toFixed(0)}%</span>
                                </div>
                                {okr.keyResults.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {okr.keyResults.map((kr: any) => (
                                      <div key={kr.id} className="flex items-center gap-2 text-xs text-gray-600">
                                        {kr.status === "completed" ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Circle className="w-3 h-3 text-gray-300" />}
                                        <span className="flex-1">{kr.title}</span>
                                        <span className="text-gray-400">{kr.currentValue}/{kr.targetValue} {kr.unit}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                      {item.okrObjectives.length === 0 && (
                        <CardContent>
                          <p className="text-xs text-gray-400 ml-6 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> 尚无关联OKR — 建议在OKR矩阵中创建对应目标
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ Create Goal Dialog ═══ */}
      <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新建公司战略目标</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>指标名称 *</Label><Input value={goalForm.metricName} onChange={e => setGoalForm({...goalForm, metricName: e.target.value})} placeholder="如: 制造事业部营收" /></div>
              <div><Label>英文名称</Label><Input value={goalForm.metricNameEn} onChange={e => setGoalForm({...goalForm, metricNameEn: e.target.value})} placeholder="如: Manufacturing Revenue" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>类别 *</Label>
                <Select value={goalForm.category} onValueChange={v => setGoalForm({...goalForm, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">营收 Revenue</SelectItem>
                    <SelectItem value="quality">质量 Quality</SelectItem>
                    <SelectItem value="delivery">交付 Delivery</SelectItem>
                    <SelectItem value="cost">成本 Cost</SelectItem>
                    <SelectItem value="team">团队 Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>目标值 *</Label><Input type="number" value={goalForm.targetValue} onChange={e => setGoalForm({...goalForm, targetValue: e.target.value})} /></div>
              <div><Label>当前值</Label><Input type="number" value={goalForm.currentValue} onChange={e => setGoalForm({...goalForm, currentValue: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>单位 *</Label>
                <Select value={goalForm.unit} onValueChange={v => setGoalForm({...goalForm, unit: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">CNY (人民币)</SelectItem>
                    <SelectItem value="%">% (百分比)</SelectItem>
                    <SelectItem value="DPPM">DPPM (质量缺陷率)</SelectItem>
                    <SelectItem value="% reduction">% reduction (降幅)</SelectItem>
                    <SelectItem value="count">count (数量)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>权重 (0-1) *</Label><Input type="number" step="0.05" min="0" max="1" value={goalForm.weight} onChange={e => setGoalForm({...goalForm, weight: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGoal(false)}>取消</Button>
            <Button disabled={createGoalMut.isPending || !goalForm.metricName || !goalForm.targetValue}
              onClick={() => createGoalMut.mutate({
                metricName: goalForm.metricName, metricNameEn: goalForm.metricNameEn || undefined,
                targetValue: parseFloat(goalForm.targetValue), currentValue: parseFloat(goalForm.currentValue),
                unit: goalForm.unit, weight: parseFloat(goalForm.weight),
                category: goalForm.category as any,
              })}>
              {createGoalMut.isPending ? "创建中..." : "创建目标"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Goal Dialog ═══ */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>编辑战略目标</DialogTitle></DialogHeader>
          {editingGoal && (
            <EditGoalForm goal={editingGoal} onSave={(updates) => {
              updateGoalMut.mutate({ id: editingGoal.id, ...updates });
            }} isPending={updateGoalMut.isPending} />
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Edit KPI Dialog ═══ */}
      <Dialog open={!!editingKpi} onOpenChange={(open) => !open && setEditingKpi(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>编辑事业部KPI</DialogTitle></DialogHeader>
          {editingKpi && (
            <EditKpiForm kpi={editingKpi} onSave={(updates) => {
              updateKpiMut.mutate({ id: editingKpi.id, ...updates });
            }} isPending={updateKpiMut.isPending} />
          )}
        </DialogContent>
      </Dialog>

      {/* Permission Notice */}
      {!canManage && (
        <div className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 shadow-sm">
          <Shield className="w-3 h-3 inline mr-1" />
          当前角色: {role} — 需要总监级别以上权限才能编辑战略目标
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Forms
// ---------------------------------------------------------------------------

function EditGoalForm({ goal, onSave, isPending }: { goal: any; onSave: (u: any) => void; isPending: boolean }) {
  const [targetValue, setTargetValue] = useState(String(goal.target_value ?? goal.targetValue ?? ""));
  const [currentValue, setCurrentValue] = useState(String(goal.current_value ?? goal.currentValue ?? ""));
  const [status, setStatus] = useState(goal.status ?? "active");
  return (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded text-sm">
        <span className="font-medium">{goal.metric_name ?? goal.metricName}</span>
        <span className="text-gray-400 ml-2">({goal.category})</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>目标值</Label><Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} /></div>
        <div><Label>当前值</Label><Input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} /></div>
      </div>
      <div>
        <Label>状态</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">进行中</SelectItem>
            <SelectItem value="paused">暂停</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button disabled={isPending} onClick={() => onSave({
          targetValue: parseFloat(targetValue),
          currentValue: parseFloat(currentValue),
          status,
        })}>
          {isPending ? "保存中..." : "保存修改"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function EditKpiForm({ kpi, onSave, isPending }: { kpi: any; onSave: (u: any) => void; isPending: boolean }) {
  const [currentValue, setCurrentValue] = useState(String(kpi.current_value ?? kpi.currentValue ?? ""));
  const [completionPct, setCompletionPct] = useState(String(kpi.completion_pct ?? kpi.completionPct ?? ""));
  const [ragStatus, setRagStatus] = useState(kpi.rag_status ?? kpi.ragStatus ?? "G");
  return (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded text-sm">
        <div className="font-medium">{kpi.metric_name ?? kpi.metricName}</div>
        <div className="text-xs text-gray-400">{kpi.division_name ?? kpi.divisionName} — {kpi.manager_name ?? kpi.managerName}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>当前值</Label><Input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} /></div>
        <div><Label>完成率 (%)</Label><Input type="number" value={completionPct} onChange={e => setCompletionPct(e.target.value)} min="0" max="100" /></div>
      </div>
      <div>
        <Label>RAG状态</Label>
        <Select value={ragStatus} onValueChange={setRagStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="G"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" />Green 达标</span></SelectItem>
            <SelectItem value="A"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" />Amber 预警</span></SelectItem>
            <SelectItem value="R"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" />Red 风险</span></SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button disabled={isPending} onClick={() => onSave({
          currentValue: parseFloat(currentValue),
          completionPct: parseFloat(completionPct),
          ragStatus,
        })}>
          {isPending ? "保存中..." : "保存KPI"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Circle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/></svg>;
}

function TableRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
