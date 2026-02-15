import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, Play, ChevronDown, ChevronUp, Target, CheckCircle2,
  Clock, AlertTriangle, BarChart3, Zap, TrendingUp, TrendingDown,
  Minus, Building2, ListChecks, Timer, PieChart as PieChartIcon,
} from "lucide-react";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800", F: "bg-red-100 text-red-800",
};
const CATEGORY_LABELS: Record<string, string> = {
  discussion: "讨论", decision: "决策", update: "汇报", brainstorm: "头脑风暴", review: "评审", other: "其他",
};
const TREND_COLORS: Record<string, string> = {
  improving: "bg-green-100 text-green-800", stable: "bg-gray-100 text-gray-800", declining: "bg-red-100 text-red-800",
};
const TREND_LABELS: Record<string, string> = { improving: "改善中", stable: "稳定", declining: "下降中" };

/* Sub-component for expanded agenda items (avoids conditional hook calls) */
function AgendaItemsDetail({ meetingId }: { meetingId: string }) {
  const { data } = trpc.ime.timeAllocationBreakdown.useQuery({ meetingId });
  const items = (data?.items ?? []) as any[];

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">暂无议题明细数据</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>议题</TableHead>
          <TableHead className="text-center">类别</TableHead>
          <TableHead className="text-center">计划(分钟)</TableHead>
          <TableHead className="text-center">实际(分钟)</TableHead>
          <TableHead>时间条</TableHead>
          <TableHead>发言人</TableHead>
          <TableHead className="text-center">决策数</TableHead>
          <TableHead className="text-center">行动项</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item: any, idx: number) => {
          const planned = Number(item.plannedDurationMinutes ?? item.planned_duration_minutes ?? 0);
          const actual = Number(item.actualDurationMinutes ?? item.actual_duration_minutes ?? 0);
          const maxVal = Math.max(planned, actual, 1);
          const category = item.agendaItemCategory ?? item.agenda_item_category ?? "other";
          return (
            <TableRow key={idx}>
              <TableCell className="max-w-[180px] truncate">
                {item.agendaItemTitle ?? item.agenda_item_title ?? "—"}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{CATEGORY_LABELS[category] || category}</Badge>
              </TableCell>
              <TableCell className="text-center">{planned}</TableCell>
              <TableCell className="text-center">{actual}</TableCell>
              <TableCell className="min-w-[120px]">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="w-full bg-gray-100 rounded h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded"
                        style={{ width: `${(planned / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-full bg-gray-100 rounded h-2">
                      <div
                        className={`h-2 rounded ${actual > planned ? "bg-red-400" : "bg-green-500"}`}
                        style={{ width: `${(actual / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-xs">
                {item.speaker ?? item.speakers ?? "—"}
              </TableCell>
              <TableCell className="text-center">{item.decisionsCount ?? item.decisions_count ?? 0}</TableCell>
              <TableCell className="text-center">{item.actionsCount ?? item.actions_count ?? 0}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function AgendaTimeAllocationTab() {
  // Section 1: Analyze form
  const [meetingId, setMeetingId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  // Section 3: Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Section 4: Time allocation breakdown
  const [breakdownMeetingId, setBreakdownMeetingId] = useState("");
  const [breakdownSearchId, setBreakdownSearchId] = useState("");

  // Section 5: Overrun patterns
  const [patternDateFrom, setPatternDateFrom] = useState("");
  const [patternDateTo, setPatternDateTo] = useState("");

  // Section 6: Optimization
  const [optimizeMeetingId, setOptimizeMeetingId] = useState("");

  // Section 8: Update item
  const [updateItemId, setUpdateItemId] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateCategory, setUpdateCategory] = useState("other");
  const [updatePlanned, setUpdatePlanned] = useState("");
  const [updateActual, setUpdateActual] = useState("");

  // Section 9: Snapshot
  const [snapshotScope, setSnapshotScope] = useState("org");
  const [snapshotScopeId, setSnapshotScopeId] = useState("");
  const [snapshotDateFrom, setSnapshotDateFrom] = useState("");
  const [snapshotDateTo, setSnapshotDateTo] = useState("");

  // Mutations
  const analyzeMutation = trpc.ime.analyzeMeetingAgendaStructure.useMutation();
  const batchMutation = trpc.ime.batchAnalyzeMeetingAgenda.useMutation();
  const optimizeMutation = trpc.ime.generateAgendaOptimization.useMutation();
  const updateMutation = trpc.ime.updateAgendaItemAnalysis.useMutation();
  const snapshotMutation = trpc.ime.computeAgendaSnapshot.useMutation();

  // Queries
  const dashboardQuery = trpc.ime.agendaDashboard.useQuery({});
  const analysisListQuery = trpc.ime.agendaAnalysisList.useQuery({ limit: 50 });
  const breakdownQuery = trpc.ime.timeAllocationBreakdown.useQuery(
    { meetingId: breakdownSearchId },
    { enabled: !!breakdownSearchId }
  );
  const patternsQuery = trpc.ime.agendaOverrunPatterns.useQuery(
    { dateFrom: patternDateFrom || undefined, dateTo: patternDateTo || undefined },
    { enabled: false }
  );
  const categoryQuery = trpc.ime.categoryTimeDistribution.useQuery(
    { dateFrom: patternDateFrom || undefined, dateTo: patternDateTo || undefined },
    { enabled: false }
  );
  const trendQuery = trpc.ime.agendaTrendData.useQuery({ limit: 20 });

  const dashboard = (dashboardQuery.data ?? {}) as any;
  const analysisList = ((analysisListQuery.data as any)?.rows || []) as any[];
  const breakdownItems = ((breakdownQuery.data as any)?.items || []) as any[];
  const patterns = ((patternsQuery.data as any)?.patterns || []) as any[];
  const categories = ((categoryQuery.data as any)?.categories || []) as any[];
  const trendData = (trendQuery.data || []) as any[];

  const handleAnalyzePatterns = () => {
    patternsQuery.refetch();
    categoryQuery.refetch();
  };

  // Build pie data from breakdown items grouped by category
  const categoryPieMap: Record<string, number> = {};
  for (const item of breakdownItems) {
    const cat = item.agendaItemCategory ?? item.agenda_item_category ?? "other";
    const actual = Number(item.actualDurationMinutes ?? item.actual_duration_minutes ?? 0);
    categoryPieMap[cat] = (categoryPieMap[cat] || 0) + actual;
  }
  const categoryPieData = Object.entries(categoryPieMap).map(([name, value]) => ({
    name: CATEGORY_LABELS[name] || name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Section 1: Analyze Agenda Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-indigo-500" />
            议程结构分析
          </CardTitle>
          <CardDescription>输入会议ID进行议程结构与时间分配分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single analysis */}
          <div className="flex gap-3">
            <Input
              placeholder="输入会议ID..."
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => analyzeMutation.mutate({ meetingId })}
              disabled={analyzeMutation.isPending || !meetingId.trim()}
            >
              {analyzeMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              分析议程结构
            </Button>
          </div>
          {analyzeMutation.data && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p>
                <span className="font-medium">会议ID: </span>
                <span className="text-muted-foreground font-mono">{(analyzeMutation.data as any).meetingId}</span>
              </p>
              <p>
                <span className="font-medium">识别议题数: </span>
                {(analyzeMutation.data as any).agendaItemsFound ?? 0}
              </p>
              <p>
                <span className="font-medium">计划总时长: </span>
                {(analyzeMutation.data as any).totalPlanned ?? 0} 分钟
              </p>
              <p>
                <span className="font-medium">实际总时长: </span>
                {(analyzeMutation.data as any).totalActual ?? 0} 分钟
              </p>
              <p>
                <span className="font-medium">整体效率: </span>
                {(analyzeMutation.data as any).overallEfficiency ?? "—"}
              </p>
            </div>
          )}
          {analyzeMutation.isError && (
            <p className="text-sm text-red-500">错误: {analyzeMutation.error.message}</p>
          )}

          {/* Batch analysis */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">批量分析</p>
            <div className="flex gap-3">
              <Input
                placeholder="会议ID（逗号分隔），如: m001,m002,m003"
                value={batchIds}
                onChange={(e) => setBatchIds(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  const ids = batchIds.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
                  if (ids.length > 0) batchMutation.mutate({ meetingIds: ids });
                }}
                disabled={batchMutation.isPending || !batchIds.trim()}
              >
                {batchMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                批量分析
              </Button>
            </div>
            {batchMutation.data && (() => {
              const results = ((batchMutation.data as any)?.results ?? []) as any[];
              return (
                <p className="text-sm text-green-600 mt-2">
                  已完成 {results.filter((r: any) => r.success).length} 个, 失败 {results.filter((r: any) => !r.success).length} 个
                </p>
              );
            })()}
            {batchMutation.isError && (
              <p className="text-sm text-red-500">错误: {batchMutation.error.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label="已分析会议"
          value={dashboard?.totalMeetingsAnalyzed ?? "..."}
          subtitle="Total Meetings Analyzed"
        />
        <StatCard
          icon={Target}
          label="平均效率分"
          value={dashboard?.avgEfficiencyScore ?? "..."}
          subtitle="Avg Efficiency Score"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Clock}
          label="平均超时%"
          value={dashboard?.avgOverrunPercent != null ? `${dashboard.avgOverrunPercent}%` : "..."}
          subtitle="Avg Overrun Percent"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="跳过率"
          value={dashboard?.skippedRate != null ? `${dashboard.skippedRate}%` : "..."}
          subtitle="Skipped Rate"
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Section 3: Agenda Analysis List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">议程分析列表</CardTitle>
          <CardDescription>查看所有已分析会议的议程效率与时间分配评估</CardDescription>
        </CardHeader>
        <CardContent>
          {analysisList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议ID</TableHead>
                  <TableHead>会议标题</TableHead>
                  <TableHead className="text-center">议题数</TableHead>
                  <TableHead className="text-center">计划(分钟)</TableHead>
                  <TableHead className="text-center">实际(分钟)</TableHead>
                  <TableHead className="text-center">超时%</TableHead>
                  <TableHead className="text-center">效率分</TableHead>
                  <TableHead className="text-center">等级</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisList.map((row: any) => {
                  const mid = row.meeting_id || row.meetingId || "";
                  const isExpanded = expandedId === mid;
                  return (
                    <>
                      <TableRow
                        key={mid}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(isExpanded ? null : mid)}
                      >
                        <TableCell className="font-mono text-xs" title={mid}>
                          {mid.length > 8 ? mid.slice(0, 8) + "..." : mid}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {row.meeting_title || row.meetingTitle || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.agenda_items_count ?? row.agendaItemsCount ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.total_planned_minutes ?? row.totalPlannedMinutes ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.total_actual_minutes ?? row.totalActualMinutes ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.overrun_percent ?? row.overrunPercent ?? 0}%
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {row.time_efficiency_score ?? row.timeEfficiencyScore ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {(row.efficiency_grade ?? row.efficiencyGrade) ? (
                            <Badge className={GRADE_COLORS[row.efficiency_grade ?? row.efficiencyGrade] || ""}>
                              {row.efficiency_grade ?? row.efficiencyGrade}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${mid}-detail`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <AgendaItemsDetail meetingId={mid} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无议程分析数据</p>
              <p className="text-sm">请先在上方输入会议ID进行议程结构分析</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Time Allocation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-500" />
            时间分配详情
          </CardTitle>
          <CardDescription>查看单个会议的议题时间分配与类别分布</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入会议ID..."
              value={breakdownMeetingId}
              onChange={(e) => setBreakdownMeetingId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => setBreakdownSearchId(breakdownMeetingId.trim())}
              disabled={!breakdownMeetingId.trim()}
            >
              <Play className="h-4 w-4 mr-2" />
              查看时间分配
            </Button>
          </div>

          {breakdownSearchId && breakdownItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Grouped bar chart: planned vs actual */}
              <div>
                <h4 className="text-sm font-medium mb-2">计划 vs 实际时长</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={breakdownItems.map((item: any) => ({
                      name: (item.agendaItemTitle ?? item.agenda_item_title ?? "").length > 10
                        ? (item.agendaItemTitle ?? item.agenda_item_title ?? "").slice(0, 10) + "..."
                        : (item.agendaItemTitle ?? item.agenda_item_title ?? "—"),
                      planned: Number(item.plannedDurationMinutes ?? item.planned_duration_minutes ?? 0),
                      actual: Number(item.actualDurationMinutes ?? item.actual_duration_minutes ?? 0),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" name="计划(分钟)" fill="#6366f1" />
                    <Bar dataKey="actual" name="实际(分钟)" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart: time by category */}
              <div>
                <h4 className="text-sm font-medium mb-2">按类别分布</h4>
                {categoryPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryPieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}分钟`}
                      >
                        {categoryPieData.map((_: any, idx: number) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">暂无类别数据</p>
                )}
              </div>
            </div>
          )}

          {breakdownSearchId && breakdownItems.length === 0 && !breakdownQuery.isLoading && (
            <p className="text-center py-8 text-muted-foreground">未找到该会议的时间分配数据</p>
          )}
          {breakdownQuery.isLoading && (
            <p className="text-center py-4 text-muted-foreground">加载中...</p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Overrun Patterns & Category Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            超时模式分析
          </CardTitle>
          <CardDescription>分析议题超时模式与按类别的时间分布</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              type="date"
              value={patternDateFrom}
              onChange={(e) => setPatternDateFrom(e.target.value)}
              className="w-44"
              placeholder="开始日期"
            />
            <Input
              type="date"
              value={patternDateTo}
              onChange={(e) => setPatternDateTo(e.target.value)}
              className="w-44"
              placeholder="结束日期"
            />
            <Button onClick={handleAnalyzePatterns} disabled={patternsQuery.isFetching}>
              {patternsQuery.isFetching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              分析超时模式
            </Button>
          </div>

          {/* Overrun patterns table */}
          {patterns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">超时议题模式</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>议题</TableHead>
                    <TableHead className="text-center">出现次数</TableHead>
                    <TableHead className="text-center">平均计划(分钟)</TableHead>
                    <TableHead className="text-center">平均实际(分钟)</TableHead>
                    <TableHead className="text-center">平均超时%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[200px] truncate">
                        {p.topic ?? p.agendaItemTitle ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">{p.occurrences ?? p.count ?? 0}</TableCell>
                      <TableCell className="text-center">{p.avgPlannedMinutes ?? p.avg_planned ?? 0}</TableCell>
                      <TableCell className="text-center">{p.avgActualMinutes ?? p.avg_actual ?? 0}</TableCell>
                      <TableCell className="text-center">
                        <span className={Number(p.avgOverrunPercent ?? p.avg_overrun_percent ?? 0) > 20 ? "text-red-600 font-semibold" : ""}>
                          {p.avgOverrunPercent ?? p.avg_overrun_percent ?? 0}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Category distribution bar chart */}
          {categories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">按类别超时率</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={categories.map((c: any) => ({
                    name: CATEGORY_LABELS[c.category] || c.category,
                    overrunRate: Number(c.overrunRate ?? c.overrun_rate ?? 0),
                    avgMinutes: Number(c.avgActualMinutes ?? c.avg_actual_minutes ?? 0),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="overrunRate" name="超时率(%)" fill="#ef4444" />
                  <Bar dataKey="avgMinutes" name="平均时长(分钟)" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {patternsQuery.isFetching && (
            <p className="text-center py-4 text-muted-foreground">分析中...</p>
          )}
        </CardContent>
      </Card>

      {/* Section 6: AI Agenda Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            AI议程优化建议
          </CardTitle>
          <CardDescription>使用AI生成议程排序和时间分配优化建议</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入会议ID..."
              value={optimizeMeetingId}
              onChange={(e) => setOptimizeMeetingId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => optimizeMutation.mutate({ meetingId: optimizeMeetingId })}
              disabled={optimizeMutation.isPending || !optimizeMeetingId.trim()}
            >
              {optimizeMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              生成优化建议
            </Button>
          </div>
          {optimizeMutation.data && (
            <div className="space-y-4">
              {/* Recommended order */}
              {((optimizeMutation.data as any).recommendedOrder || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">推荐议程顺序</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {((optimizeMutation.data as any).recommendedOrder as string[]).map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Recommendations table */}
              {((optimizeMutation.data as any).recommendations || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">时间分配建议</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>议题</TableHead>
                        <TableHead className="text-center">建议时长</TableHead>
                        <TableHead className="text-center">当前时长</TableHead>
                        <TableHead>理由</TableHead>
                        <TableHead className="text-center">优先级</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((optimizeMutation.data as any).recommendations as any[]).map((rec: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-[160px] truncate">{rec.topic ?? rec.title ?? "—"}</TableCell>
                          <TableCell className="text-center">{rec.suggestedMinutes ?? rec.suggested ?? "—"} 分钟</TableCell>
                          <TableCell className="text-center">{rec.currentMinutes ?? rec.current ?? "—"} 分钟</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">{rec.reason ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className={
                              rec.priority === "high" ? "bg-red-100 text-red-800" :
                              rec.priority === "medium" ? "bg-amber-100 text-amber-800" :
                              "bg-gray-100 text-gray-800"
                            }>
                              {rec.priority === "high" ? "高" : rec.priority === "medium" ? "中" : "低"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Async candidates */}
              {((optimizeMutation.data as any).asyncCandidates || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">建议异步处理的议题</h4>
                  <ul className="space-y-1 text-sm">
                    {((optimizeMutation.data as any).asyncCandidates as string[]).map((c: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI narrative */}
              {(optimizeMutation.data as any).narrative && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-1">AI分析</h4>
                  <p className="text-sm text-muted-foreground">{(optimizeMutation.data as any).narrative}</p>
                </div>
              )}
            </div>
          )}
          {optimizeMutation.isError && (
            <p className="text-sm text-red-500">错误: {optimizeMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            议程效率趋势
          </CardTitle>
          <CardDescription>跟踪议程时间效率和超时比例的变化趋势</CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="periodEnd"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v?.split("T")[0] || v}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip labelFormatter={(v: string) => v?.split("T")[0] || v} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgTimeEfficiencyScore"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="效率分"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgOverrunPercent"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="超时%"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">暂无趋势数据</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Update Agenda Item (Manual) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            手动更新分析项
          </CardTitle>
          <CardDescription>手动更新议程分析项的标题、类别或时长</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="分析项ID"
              type="number"
              value={updateItemId}
              onChange={(e) => setUpdateItemId(e.target.value)}
            />
            <Input
              placeholder="议题标题"
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
            />
            <Select value={updateCategory} onValueChange={setUpdateCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择类别..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discussion">讨论</SelectItem>
                <SelectItem value="decision">决策</SelectItem>
                <SelectItem value="update">汇报</SelectItem>
                <SelectItem value="brainstorm">头脑风暴</SelectItem>
                <SelectItem value="review">评审</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">计划时长(分钟)</label>
              <Input
                type="number"
                min={0}
                placeholder="计划时长"
                value={updatePlanned}
                onChange={(e) => setUpdatePlanned(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">实际时长(分钟)</label>
              <Input
                type="number"
                min={0}
                placeholder="实际时长"
                value={updateActual}
                onChange={(e) => setUpdateActual(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() =>
              updateMutation.mutate({
                id: Number(updateItemId),
                agendaItemTitle: updateTitle || undefined,
                agendaItemCategory: updateCategory || undefined,
                plannedDurationMinutes: updatePlanned ? Number(updatePlanned) : undefined,
                actualDurationMinutes: updateActual ? Number(updateActual) : undefined,
              })
            }
            disabled={updateMutation.isPending || !updateItemId}
          >
            {updateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Target className="h-4 w-4 mr-2" />
            )}
            更新分析项
          </Button>
          {updateMutation.data && (
            <p className="text-sm text-green-600">分析项已更新</p>
          )}
          {updateMutation.isError && (
            <p className="text-sm text-red-500">错误: {updateMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Organization Agenda Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            组织议程智能
          </CardTitle>
          <CardDescription>生成组织级、部门级或个人级的议程效能快照</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={snapshotScope} onValueChange={setSnapshotScope}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择范围..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">组织</SelectItem>
                <SelectItem value="department">部门</SelectItem>
                <SelectItem value="team">团队</SelectItem>
                <SelectItem value="individual">个人</SelectItem>
              </SelectContent>
            </Select>
            {snapshotScope !== "org" && (
              <Input
                placeholder={`输入${snapshotScope === "department" ? "部门" : snapshotScope === "team" ? "团队" : "人员"}ID...`}
                value={snapshotScopeId}
                onChange={(e) => setSnapshotScopeId(e.target.value)}
                className="w-48"
              />
            )}
            <Input
              type="date"
              value={snapshotDateFrom}
              onChange={(e) => setSnapshotDateFrom(e.target.value)}
              className="w-44"
            />
            <Input
              type="date"
              value={snapshotDateTo}
              onChange={(e) => setSnapshotDateTo(e.target.value)}
              className="w-44"
            />
            <Button
              onClick={() =>
                snapshotMutation.mutate({
                  scope: snapshotScope,
                  scopeId: snapshotScopeId || undefined,
                  dateFrom: snapshotDateFrom || undefined,
                  dateTo: snapshotDateTo || undefined,
                })
              }
              disabled={snapshotMutation.isPending}
            >
              {snapshotMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              生成快照
            </Button>
          </div>
          {snapshotMutation.data && (() => {
            const snap = (snapshotMutation.data as any)?.snapshot ?? snapshotMutation.data;
            return (
              <div className="space-y-4">
                {/* Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <BarChart3 className="h-5 w-5 mx-auto text-indigo-500 mb-1" />
                      <div className="text-xl font-bold">{snap.totalMeetingsAnalyzed ?? 0}</div>
                      <div className="text-xs text-muted-foreground">已分析会议</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgOverrunPercent ?? 0}%</div>
                      <div className="text-xs text-muted-foreground">平均超时%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                      <div className="text-xl font-bold">{snap.overrunRate ?? 0}%</div>
                      <div className="text-xs text-muted-foreground">超时率</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgEngagementScore ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">参与度分</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Zap className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgProductivityScore ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">生产力分</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgTimeEfficiencyScore ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">效率分</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Trend + Grade badges */}
                <div className="flex items-center gap-4 flex-wrap">
                  {snap.trendVsPrevious && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">整体趋势:</span>
                      <Badge className={TREND_COLORS[snap.trendVsPrevious] || ""} variant="secondary">
                        {(() => {
                          const Icon = snap.trendVsPrevious === "improving" ? TrendingUp : snap.trendVsPrevious === "declining" ? TrendingDown : Minus;
                          return (
                            <>
                              <Icon className="h-3 w-3 mr-1" />
                              {TREND_LABELS[snap.trendVsPrevious] || snap.trendVsPrevious}
                            </>
                          );
                        })()}
                      </Badge>
                    </div>
                  )}
                  {snap.overallGrade && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">整体等级:</span>
                      <Badge className={GRADE_COLORS[snap.overallGrade] || ""}>{snap.overallGrade}</Badge>
                    </div>
                  )}
                </div>

                {/* Top overrun categories */}
                {(() => {
                  try {
                    const cats = typeof snap.topOverrunCategories === "string"
                      ? JSON.parse(snap.topOverrunCategories)
                      : snap.topOverrunCategories;
                    if (Array.isArray(cats) && cats.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">超时频率最高的类别</h4>
                          <ul className="space-y-1 text-sm">
                            {cats.map((c: any, i: number) => (
                              <li key={i} className="text-muted-foreground">
                                • {typeof c === "string" ? c : `${CATEGORY_LABELS[c.category] || c.category}: ${c.count ?? c.overrunRate ?? ""}次`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* Top overrun topics */}
                {(() => {
                  try {
                    const topics = typeof snap.topOverrunTopics === "string"
                      ? JSON.parse(snap.topOverrunTopics)
                      : snap.topOverrunTopics;
                    if (Array.isArray(topics) && topics.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">超时频率最高的议题</h4>
                          <ul className="space-y-1 text-sm">
                            {topics.map((t: any, i: number) => (
                              <li key={i} className="text-muted-foreground">
                                • {typeof t === "string" ? t : `${t.topic ?? t.title}: ${t.count ?? t.avgOverrun ?? ""}次`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* Optimal order recommendation */}
                {(() => {
                  try {
                    const order = typeof snap.optimalOrderRecommendation === "string"
                      ? JSON.parse(snap.optimalOrderRecommendation)
                      : snap.optimalOrderRecommendation;
                    if (Array.isArray(order) && order.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">最优议程顺序</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            {order.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ol>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* AI narrative */}
                {snap.aiNarrative && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-1">AI分析</h4>
                    <p className="text-sm text-muted-foreground">{snap.aiNarrative}</p>
                  </div>
                )}

                {/* Recommendations */}
                {(() => {
                  try {
                    const recs = typeof snap.recommendations === "string"
                      ? JSON.parse(snap.recommendations)
                      : snap.recommendations;
                    if (Array.isArray(recs) && recs.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">优化建议</h4>
                          <ul className="space-y-1 text-sm">
                            {recs.map((r: string, i: number) => (
                              <li key={i} className="text-muted-foreground">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}
              </div>
            );
          })()}
          {snapshotMutation.isError && (
            <p className="text-sm text-red-500">错误: {snapshotMutation.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
