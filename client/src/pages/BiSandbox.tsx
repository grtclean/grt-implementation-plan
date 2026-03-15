/**
 * BI沙盘 — BI Sandbox
 *
 * CTO-level interactive sandbox for exploring BI data across all dimensions:
 * - Cross-department comparison with drill-down
 * - Individual performance ranking with filters
 * - Period-over-period trend simulation
 * - AI summary generation trigger
 *
 * Dark executive theme matching BiReportDashboard.
 */

import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BarChart3,
  Sparkles,
  Target,
  Users,
  Building2,
  Calendar,
  Plus,
  Loader2,
  Lock,
  TrendingUp,
  TrendingDown,
  Award,
  RefreshCw,
  FileText,
  Eye,
  Play,
} from "lucide-react";

// ── Theme (matches BiReportDashboard) ──
const T = {
  bg: "bg-[#0c111b]",
  card: "bg-[#131a2b] border-[#1e293b]",
  text: "text-[#e2e8f0]",
  muted: "text-[#64748b]",
  input: "bg-[#1e293b] border-[#334155] text-[#e2e8f0] placeholder:text-[#475569]",
};

// ── Quick Stat Card ──
function QStat({ label, value, color, icon: Icon }: {
  label: string; value: string | number; color: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className={T.card}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#1e293b]">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div>
          <p className={`text-[10px] ${T.muted}`}>{label}</p>
          <p className={`text-lg font-bold ${T.text} font-mono`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BiSandbox() {
  const { t } = useLanguage();
  const { level } = useUserProfile();
  const canManage = level >= 7;

  const [activeTab, setActiveTab] = useState("explorer");
  const [periodType, setPeriodType] = useState("monthly");
  const [createPeriodOpen, setCreatePeriodOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ label: "", start: "", end: "" });
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);

  // ── Role gate ──
  if (!canManage) {
    return (
      <div className={`min-h-screen ${T.bg} flex items-center justify-center`}>
        <Card className={T.card}>
          <CardContent className="p-8 text-center">
            <Lock className="h-8 w-8 mx-auto mb-3 text-[#64748b]" />
            <p className={`text-sm ${T.muted}`}>BI沙盘仅对CTO/系统管理员开放</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Queries ──
  const periodsQuery = (trpc.biReport as any).period.list.useQuery(
    { periodType, limit: 20 },
    { refetchOnWindowFocus: false }
  );
  const periods = periodsQuery.data ?? [];

  const deptsQuery = (trpc.biReport as any).department.getHorizontalComparison.useQuery(
    { reportPeriodId: selectedPeriodId! },
    { enabled: !!selectedPeriodId }
  );
  const departments = deptsQuery.data ?? [];

  const individualsQuery = (trpc.biReport as any).individual.getRankings.useQuery(
    { reportPeriodId: selectedPeriodId!, limit: 50 },
    { enabled: !!selectedPeriodId }
  );
  const individuals = individualsQuery.data ?? [];

  const rulesQuery = (trpc.biReport as any).access.listRules.useQuery({ activeOnly: true });
  const rules = rulesQuery.data ?? [];

  // ── Mutations ──
  const createPeriodMut = (trpc.biReport as any).period.create.useMutation({
    onSuccess: () => {
      toast.success("报告周期已创建");
      periodsQuery.refetch();
      setCreatePeriodOpen(false);
      setNewPeriod({ label: "", start: "", end: "" });
    },
    onError: (err: any) => toast.error(`创建失败: ${err.message}`),
  });

  const publishMut = (trpc.biReport as any).period.publish.useMutation({
    onSuccess: (data: any) => {
      toast.success(`AI摘要生成任务已提交 (taskId: ${data.taskId})`);
      periodsQuery.refetch();
    },
    onError: (err: any) => toast.error(`发布失败: ${err.message}`),
  });

  const archiveMut = (trpc.biReport as any).period.archive.useMutation({
    onSuccess: () => {
      toast.success("已归档");
      periodsQuery.refetch();
    },
    onError: (err: any) => toast.error(`归档失败: ${err.message}`),
  });

  const deptAiEvalMut = (trpc.biReport as any).department.generateAiEval.useMutation({
    onSuccess: (data: any) => toast.success(`部门AI评价任务已提交 (taskId: ${data.taskId})`),
    onError: (err: any) => toast.error(`AI评价失败: ${err.message}`),
  });

  // ── Stats ──
  const stats = useMemo(() => {
    const deptCount = departments.length;
    const indCount = individuals.length;
    const avgRate = deptCount > 0
      ? (departments.reduce((s: number, d: any) => s + parseFloat(d.achievementRate ?? "0"), 0) / deptCount).toFixed(1)
      : "—";
    const avgTraining = deptCount > 0
      ? (departments.reduce((s: number, d: any) => s + parseFloat(d.trainingQualityScore ?? "0"), 0) / deptCount).toFixed(1)
      : "—";
    return { deptCount, indCount, avgRate, avgTraining, periodCount: periods.length, ruleCount: rules.length };
  }, [departments, individuals, periods, rules]);

  const handleCreatePeriod = useCallback(() => {
    if (!newPeriod.label.trim() || !newPeriod.start || !newPeriod.end) {
      toast.error("请填写完整的周期信息");
      return;
    }
    createPeriodMut.mutate({
      periodType,
      periodLabel: newPeriod.label,
      startDate: newPeriod.start,
      endDate: newPeriod.end,
    });
  }, [newPeriod, periodType, createPeriodMut]);

  return (
    <div className={`min-h-screen ${T.bg} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className={`text-lg font-bold ${T.text}`}>BI 沙盘</h1>
            <p className={`text-xs ${T.muted}`}>交互式BI数据探索 · 周期管理 · AI评价触发 · 授权管理</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            沙盘模式
          </Badge>
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className={`w-24 h-8 text-xs ${T.input}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">周报</SelectItem>
              <SelectItem value="monthly">月报</SelectItem>
              <SelectItem value="quarterly">季报</SelectItem>
              <SelectItem value="yearly">年报</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-[#334155] text-[#94a3b8]"
            onClick={() => setCreatePeriodOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            新周期
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <QStat label="报告周期" value={stats.periodCount} color="text-cyan-400" icon={Calendar} />
        <QStat label="参评部门" value={stats.deptCount} color="text-blue-400" icon={Building2} />
        <QStat label="参评人数" value={stats.indCount} color="text-amber-400" icon={Users} />
        <QStat label="平均达成率" value={`${stats.avgRate}%`} color="text-emerald-400" icon={Target} />
        <QStat label="培训均分" value={stats.avgTraining} color="text-violet-400" icon={TrendingUp} />
        <QStat label="授权规则" value={stats.ruleCount} color="text-rose-400" icon={Lock} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#131a2b] border border-[#1e293b]">
          <TabsTrigger value="explorer" className="text-xs data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            数据探索
          </TabsTrigger>
          <TabsTrigger value="periods" className="text-xs data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            周期管理
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            AI评价
          </TabsTrigger>
          <TabsTrigger value="access" className="text-xs data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            授权规则
          </TabsTrigger>
        </TabsList>

        {/* Tab: Data Explorer */}
        <TabsContent value="explorer" className="space-y-4">
          {/* Period Selector */}
          <Card className={T.card}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm ${T.text}`}>选择报告周期</CardTitle>
            </CardHeader>
            <CardContent>
              {periodsQuery.isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  <span className={`text-xs ${T.muted}`}>加载中...</span>
                </div>
              ) : periods.length === 0 ? (
                <p className={`text-sm ${T.muted}`}>暂无报告周期。请先在"周期管理"创建。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {periods.map((p: any) => (
                    <Button
                      key={p.id}
                      variant={selectedPeriodId === p.id ? "default" : "outline"}
                      size="sm"
                      className={selectedPeriodId === p.id
                        ? "bg-cyan-900/50 text-cyan-300 border-cyan-700"
                        : "border-[#334155] text-[#94a3b8]"}
                      onClick={() => setSelectedPeriodId(p.id)}
                    >
                      {p.periodLabel}
                      <Badge variant="outline" className={`ml-2 text-[10px] ${
                        p.status === "published" ? "border-green-700 text-green-400" :
                        p.status === "archived" ? "border-[#334155] text-[#475569]" :
                        "border-amber-700 text-amber-400"
                      }`}>{p.status}</Badge>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Data */}
          {selectedPeriodId && (
            <Card className={T.card}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-sm ${T.text} flex items-center gap-2`}>
                    <Building2 className="h-4 w-4 text-cyan-400" />
                    部门横向对比
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-[#334155] text-[#94a3b8]"
                    onClick={() => deptsQuery.refetch()}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {deptsQuery.isLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-12 bg-[#1e293b]" />)}
                  </div>
                ) : departments.length === 0 ? (
                  <p className={`text-sm ${T.muted} text-center py-4`}>该周期暂无部门数据</p>
                ) : (
                  <div className="space-y-2">
                    {departments.map((d: any) => {
                      const rate = parseFloat(d.achievementRate ?? "0");
                      return (
                        <div key={d.departmentCode} className={`flex items-center gap-3 p-3 rounded-lg border ${T.card}`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${T.text}`}>{d.departmentName}</p>
                            <p className={`text-[10px] ${T.muted}`}>{d.headcount ?? 0}人 · {d.activeProjects ?? 0}个项目</p>
                          </div>
                          <div className="text-center w-16">
                            <p className={`text-xs ${T.muted}`}>达成率</p>
                            <p className={`text-sm font-bold font-mono ${
                              rate >= 85 ? "text-emerald-400" : rate >= 70 ? "text-amber-400" : "text-red-400"
                            }`}>{rate > 0 ? `${rate.toFixed(1)}%` : "—"}</p>
                          </div>
                          <div className="text-center w-16">
                            <p className={`text-xs ${T.muted}`}>奖/惩</p>
                            <p className={`text-sm font-mono ${T.text}`}>
                              <span className="text-emerald-400">+{d.rewardCount ?? 0}</span>
                              <span className={T.muted}>/</span>
                              <span className="text-red-400">-{d.penaltyCount ?? 0}</span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-cyan-400"
                            onClick={() => {
                              deptAiEvalMut.mutate({
                                reportPeriodId: selectedPeriodId,
                                departmentCode: d.departmentCode,
                              });
                            }}
                          >
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Individual Rankings */}
          {selectedPeriodId && individuals.length > 0 && (
            <Card className={T.card}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm ${T.text} flex items-center gap-2`}>
                  <Users className="h-4 w-4 text-amber-400" />
                  个人排名 (Top {individuals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {individuals.map((p: any, idx: number) => {
                    const kpi = parseFloat(p.kpiScore ?? "0");
                    return (
                      <div key={p.userId ?? idx} className={`flex items-center gap-3 p-2.5 rounded-lg border ${T.card}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx < 3 ? "bg-amber-900/40 text-amber-400" : "bg-[#1e293b] text-[#64748b]"
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${T.text} truncate`}>{p.userName ?? `User#${p.userId}`}</p>
                          <p className={`text-[10px] ${T.muted}`}>{p.departmentName ?? p.departmentCode}</p>
                        </div>
                        <div className={`text-sm font-bold font-mono ${
                          kpi >= 90 ? "text-emerald-400" : kpi >= 70 ? "text-amber-400" : kpi > 0 ? "text-red-400" : T.muted
                        }`}>
                          {kpi > 0 ? kpi.toFixed(1) : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Period Management */}
        <TabsContent value="periods" className="space-y-4">
          <Card className={T.card}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm ${T.text}`}>报告周期列表</CardTitle>
              <CardDescription className={T.muted}>管理BI报告周期的生命周期</CardDescription>
            </CardHeader>
            <CardContent>
              {periodsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-14 bg-[#1e293b]" />)}
                </div>
              ) : periods.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto text-[#334155] mb-3" />
                  <p className={`text-sm ${T.muted}`}>暂无周期。点击右上角"新周期"创建。</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {periods.map((p: any) => (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${T.card}`}>
                      <Calendar className={`h-4 w-4 ${T.muted}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${T.text}`}>{p.periodLabel}</p>
                        <p className={`text-[10px] ${T.muted}`}>
                          {p.startDate} → {p.endDate} · {p.periodType}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${
                        p.status === "published" ? "border-green-700 text-green-400" :
                        p.status === "generating" ? "border-blue-700 text-blue-400" :
                        p.status === "archived" ? "border-[#334155] text-[#475569]" :
                        "border-amber-700 text-amber-400"
                      }`}>{p.status}</Badge>
                      <div className="flex gap-1">
                        {p.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-green-800 text-green-400"
                            onClick={() => publishMut.mutate({ id: p.id })}
                            disabled={publishMut.isPending}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            发布
                          </Button>
                        )}
                        {(p.status === "published" || p.status === "draft") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-[#334155] text-[#64748b]"
                            onClick={() => archiveMut.mutate({ id: p.id })}
                            disabled={archiveMut.isPending}
                          >
                            归档
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: AI Evaluation */}
        <TabsContent value="ai" className="space-y-4">
          <Card className={T.card}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm ${T.text} flex items-center gap-2`}>
                <Sparkles className="h-4 w-4 text-cyan-400" />
                AI评价生成
              </CardTitle>
              <CardDescription className={T.muted}>
                选择一个已发布的报告周期，对部门或个人触发AI协调评价
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedPeriodId ? (
                <p className={`text-sm ${T.muted}`}>请先在"数据探索"选择一个报告周期</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0c111b] border border-cyan-900/30">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span className={`text-sm ${T.text}`}>
                      当前周期ID: {selectedPeriodId} · 点击部门行的
                      <Sparkles className="h-3 w-3 inline text-cyan-400 mx-1" />
                      图标触发AI评价
                    </span>
                  </div>
                  {departments.length > 0 && (
                    <div className="space-y-2">
                      {departments.map((d: any) => (
                        <div key={d.departmentCode} className={`flex items-center justify-between p-3 rounded-lg border ${T.card}`}>
                          <div>
                            <p className={`text-sm font-medium ${T.text}`}>{d.departmentName}</p>
                            <p className={`text-[10px] ${T.muted}`}>
                              {d.aiEvaluation ? "已有AI评价" : "暂无AI评价"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {d.aiEvaluation && (
                              <Badge variant="outline" className="text-[10px] border-green-700 text-green-400">已评价</Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-cyan-800 text-cyan-400"
                              onClick={() => deptAiEvalMut.mutate({
                                reportPeriodId: selectedPeriodId,
                                departmentCode: d.departmentCode,
                              })}
                              disabled={deptAiEvalMut.isPending}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {d.aiEvaluation ? "重新评价" : "生成评价"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Access Rules */}
        <TabsContent value="access" className="space-y-4">
          <Card className={T.card}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm ${T.text} flex items-center gap-2`}>
                <Lock className="h-4 w-4 text-violet-400" />
                授权规则 ({rules.length})
              </CardTitle>
              <CardDescription className={T.muted}>
                管理BI报告的访问控制规则
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesQuery.isLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 bg-[#1e293b]" />)}
                </div>
              ) : rules.length === 0 ? (
                <p className={`text-sm ${T.muted} text-center py-4`}>暂无授权规则</p>
              ) : (
                <div className="space-y-2">
                  {rules.map((r: any) => {
                    const levelLabels: Record<string, string> = {
                      view_summary: "查看摘要", view_detail: "查看详情",
                      view_individual: "查看个人", manage: "完全管理",
                    };
                    const levelColors: Record<string, string> = {
                      view_summary: "border-blue-700 text-blue-400",
                      view_detail: "border-emerald-700 text-emerald-400",
                      view_individual: "border-amber-700 text-amber-400",
                      manage: "border-red-700 text-red-400",
                    };
                    return (
                      <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${T.card}`}>
                        <Lock className={`h-3.5 w-3.5 ${T.muted} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${T.text}`}>
                            {r.grantedToRole ? `角色: ${r.grantedToRole}` : `用户: #${r.grantedToUserId}`}
                          </p>
                          <p className={`text-[10px] ${T.muted}`}>
                            {r.periodType ?? "所有周期"} · {r.departmentCode ?? "所有部门"}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${levelColors[r.accessLevel] ?? ""}`}>
                          {levelLabels[r.accessLevel] ?? r.accessLevel}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Period Dialog */}
      <Dialog open={createPeriodOpen} onOpenChange={setCreatePeriodOpen}>
        <DialogContent className={`${T.card} ${T.text}`}>
          <DialogHeader>
            <DialogTitle className={T.text}>创建报告周期</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className={T.muted}>周期标签 *</Label>
              <Input
                className={T.input}
                placeholder="e.g., 2026年3月"
                value={newPeriod.label}
                onChange={(e) => setNewPeriod({ ...newPeriod, label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={T.muted}>开始日期 *</Label>
                <Input
                  type="date"
                  className={T.input}
                  value={newPeriod.start}
                  onChange={(e) => setNewPeriod({ ...newPeriod, start: e.target.value })}
                />
              </div>
              <div>
                <Label className={T.muted}>结束日期 *</Label>
                <Input
                  type="date"
                  className={T.input}
                  value={newPeriod.end}
                  onChange={(e) => setNewPeriod({ ...newPeriod, end: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className={T.muted}>周期类型</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className={T.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">周报</SelectItem>
                  <SelectItem value="monthly">月报</SelectItem>
                  <SelectItem value="quarterly">季报</SelectItem>
                  <SelectItem value="yearly">年报</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-cyan-900/50 text-cyan-300 hover:bg-cyan-800/50"
              onClick={handleCreatePeriod}
              disabled={createPeriodMut.isPending}
            >
              {createPeriodMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              创建周期
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
