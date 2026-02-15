import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, Play, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Minus, AlertTriangle, BarChart3, Clock, Zap, Target,
} from "lucide-react";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};
const GRADE_BAR_COLORS: Record<string, string> = {
  A: "#22c55e", B: "#3b82f6", C: "#eab308", D: "#f97316", F: "#ef4444",
};
const TREND_ICONS: Record<string, any> = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
  volatile: AlertTriangle,
};
const TREND_COLORS: Record<string, string> = {
  improving: "bg-green-100 text-green-800",
  declining: "bg-red-100 text-red-800",
  stable: "bg-gray-100 text-gray-800",
  volatile: "bg-yellow-100 text-yellow-800",
};
const REC_COLORS: Record<string, string> = {
  continue: "bg-green-100 text-green-800",
  shorten: "bg-blue-100 text-blue-800",
  reduce_frequency: "bg-yellow-100 text-yellow-800",
  merge: "bg-purple-100 text-purple-800",
  cancel: "bg-red-100 text-red-800",
};
const REC_LABELS: Record<string, string> = {
  continue: "继续", shorten: "缩短", reduce_frequency: "降频", merge: "合并", cancel: "取消",
};
const FREQ_LABELS: Record<string, string> = {
  daily: "每日", weekly: "每周", biweekly: "每两周", monthly: "每月", irregular: "不规律",
};
const ACTION_LABELS: Record<string, string> = {
  cancelled: "已取消", reduced_frequency: "已降频", shortened: "已缩短", merged: "已合并", no_change: "无变化",
};

export function RecurringMeetingValueTab() {
  // Detect form
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Series detail
  const [expandedSeries, setExpandedSeries] = useState<number | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");

  // AI optimization
  const [optimizeSeriesId, setOptimizeSeriesId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  // Record action
  const [actionSeriesId, setActionSeriesId] = useState("");
  const [actionType, setActionType] = useState("no_change");

  // Queries
  const dashboardQuery = trpc.ime.recurringSeriesDashboard.useQuery({});
  const seriesListQuery = trpc.ime.recurringSeriesList.useQuery({});
  const outcomesQuery = trpc.ime.optimizationOutcomes.useQuery({});
  const summaryQuery = trpc.ime.recurringMeetingSummary.useQuery({});
  const comparisonQuery = trpc.ime.seriesComparison.useQuery({});

  const valueTrendQuery = trpc.ime.seriesValueTrend.useQuery(
    { seriesId: Number(selectedSeriesId) },
    { enabled: !!selectedSeriesId && !isNaN(Number(selectedSeriesId)) }
  );

  // Mutations
  const detectMut = trpc.ime.detectRecurringSeries.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      seriesListQuery.refetch();
      comparisonQuery.refetch();
      summaryQuery.refetch();
    },
  });

  const optimizeMut = trpc.ime.generateSeriesOptimization.useMutation();
  const batchOptimizeMut = trpc.ime.batchGenerateOptimizations.useMutation({
    onSuccess: () => { seriesListQuery.refetch(); },
  });
  const recordActionMut = trpc.ime.recordOptimizationAction.useMutation({
    onSuccess: () => {
      outcomesQuery.refetch();
      seriesListQuery.refetch();
      dashboardQuery.refetch();
      setActionSeriesId("");
    },
  });

  const dashboard = dashboardQuery.data as any;
  const seriesList = (seriesListQuery.data || []) as any[];
  const outcomes = (outcomesQuery.data || []) as any[];
  const summary = summaryQuery.data as any;
  const comparison = (comparisonQuery.data || []) as any[];
  const valueTrend = valueTrendQuery.data as any;

  // Outcome action distribution for pie chart
  const actionDistMap: Record<string, number> = {};
  for (const o of outcomes) {
    const a = o.action_taken || "no_change";
    actionDistMap[a] = (actionDistMap[a] || 0) + 1;
  }
  const actionPieData = Object.entries(actionDistMap).map(([name, value]) => ({ name: ACTION_LABELS[name] || name, value }));

  // Summary pie data
  const freqDist = ((summary?.frequencyDistribution || []) as any[]).map((r: any) => ({
    name: FREQ_LABELS[r.frequency] || r.frequency,
    value: Number(r.count),
  }));
  const gradeDist = ((summary?.gradeDistribution || []) as any[]).map((r: any) => ({
    name: r.value_grade,
    value: Number(r.count),
  }));

  return (
    <div className="space-y-6">
      {/* Section 1: Detect Recurring Series */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            检测周期性会议系列
          </CardTitle>
          <CardDescription>通过标题相似度、参会者重叠和时间间隔自动识别周期性会议</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-44"
              placeholder="开始日期"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-44"
              placeholder="结束日期"
            />
            <Button
              onClick={() => detectMut.mutate({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })}
              disabled={detectMut.isPending}
            >
              {detectMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              检测周期性会议
            </Button>
          </div>
          {detectMut.data && (
            <p className="text-sm text-green-600">
              检测完成，发现 {(detectMut.data as any).detected} 个周期性会议系列
            </p>
          )}
          {detectMut.isError && (
            <p className="text-sm text-red-500">检测失败: {detectMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label="周期性会议数"
          value={dashboard?.totalSeries ?? "..."}
          subtitle="Recurring Series"
        />
        <StatCard
          icon={Target}
          label="平均价值分"
          value={dashboard ? `${dashboard.avgValueScore}` : "..."}
          subtitle="Avg Value Score"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={TrendingDown}
          label="价值下降数"
          value={dashboard?.decliningCount ?? "..."}
          subtitle="Declining Series"
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={Clock}
          label="已节省分钟/周"
          value={dashboard?.totalWeeklyMinutesSaved ?? "..."}
          subtitle="Minutes Saved/Week"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
      </div>

      {/* Section 3: Recurring Series Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">周期性会议系列列表</CardTitle>
          <CardDescription>按价值分升序排列（最需优化的排在前面）</CardDescription>
        </CardHeader>
        <CardContent>
          {seriesList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>会议名称</TableHead>
                  <TableHead className="text-center">频率</TableHead>
                  <TableHead className="text-center">次数</TableHead>
                  <TableHead className="text-center">参会者</TableHead>
                  <TableHead className="text-center">效能</TableHead>
                  <TableHead className="text-center">趋势</TableHead>
                  <TableHead className="text-center">价值分</TableHead>
                  <TableHead className="text-center">等级</TableHead>
                  <TableHead className="text-center">建议</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seriesList.map((s: any) => (
                  <>
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedSeries(expandedSeries === s.id ? null : s.id)}
                    >
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{s.series_title}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{FREQ_LABELS[s.frequency] || s.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{s.occurrence_count}</TableCell>
                      <TableCell className="text-center">{s.avg_participant_count}</TableCell>
                      <TableCell className="text-center">{s.avg_effectiveness_score}</TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const trend = s.effectiveness_trend || "stable";
                          const Icon = TREND_ICONS[trend] || Minus;
                          return (
                            <Badge className={TREND_COLORS[trend] || ""} variant="secondary">
                              <Icon className="h-3 w-3 mr-1" />
                              {trend}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{s.value_score}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={GRADE_COLORS[s.value_grade] || ""}>{s.value_grade}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={REC_COLORS[s.recommendation] || ""} variant="secondary">
                          {REC_LABELS[s.recommendation] || s.recommendation}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {expandedSeries === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </TableCell>
                    </TableRow>
                    {expandedSeries === s.id && (
                      <TableRow key={`${s.id}-detail`}>
                        <TableCell colSpan={12} className="bg-muted/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-sm">
                            <div className="space-y-2">
                              <div><span className="font-medium">核心参会者: </span>{(() => { try { return JSON.parse(s.core_participants || "[]").join(", ") || "—"; } catch { return "—"; } })()}</div>
                              <div><span className="font-medium">累计时长: </span>{s.total_cumulative_minutes} 分钟</div>
                              <div><span className="font-medium">累计成本: </span>{s.total_cumulative_cost}</div>
                              <div><span className="font-medium">会议数: </span>{(() => { try { return JSON.parse(s.meeting_ids || "[]").length; } catch { return 0; } })()}</div>
                              <div><span className="font-medium">趋势斜率: </span>{s.trend_slope}</div>
                              <div><span className="font-medium">ROI等级: </span>{s.avg_roi_grade || "—"}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="font-medium">建议理由:</div>
                              <p className="text-muted-foreground">{s.recommendation_rationale || "—"}</p>
                              {s.ai_narrative && (
                                <>
                                  <div className="font-medium">AI分析:</div>
                                  <p className="text-muted-foreground">{s.ai_narrative}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无周期性会议数据</p>
              <p className="text-sm">请先点击"检测周期性会议"按钮</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Series Value Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">系列价值趋势</CardTitle>
          <CardDescription>选择一个会议系列，查看其效能变化趋势</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="选择会议系列..." />
              </SelectTrigger>
              <SelectContent>
                {seriesList.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    [{s.value_grade}] {s.series_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {valueTrend?.meetings?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={valueTrend.meetings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="meeting_date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v?.split("T")[0] || v}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip labelFormatter={(v: string) => v?.split("T")[0] || v} />
                <Legend />
                <Line type="monotone" dataKey="effectiveness_score" stroke="#6366f1" strokeWidth={2} name="效能分" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="participant_count" stroke="#22c55e" strokeWidth={1} name="参会人数" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : selectedSeriesId ? (
            <p className="text-center py-8 text-muted-foreground">该系列暂无会议数据</p>
          ) : (
            <p className="text-center py-8 text-muted-foreground">请选择一个会议系列</p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Series Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">系列价值对比</CardTitle>
          <CardDescription>按价值分对比所有周期性会议系列</CardDescription>
        </CardHeader>
        <CardContent>
          {comparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="series_title"
                  width={180}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v?.length > 25 ? v.slice(0, 25) + "..." : v}
                />
                <Tooltip />
                <Bar dataKey="value_score" name="价值分">
                  {comparison.map((entry: any, idx: number) => (
                    <Cell
                      key={idx}
                      fill={GRADE_BAR_COLORS[entry.value_grade] || COLORS[idx % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">暂无对比数据</p>
          )}
        </CardContent>
      </Card>

      {/* Section 6: AI Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            AI优化建议
          </CardTitle>
          <CardDescription>使用AI分析特定会议系列并生成优化建议</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single optimization */}
          <div className="flex gap-3">
            <Input
              placeholder="输入系列ID..."
              value={optimizeSeriesId}
              onChange={(e) => setOptimizeSeriesId(e.target.value)}
              className="w-40"
            />
            <Button
              onClick={() => optimizeMut.mutate({ seriesId: Number(optimizeSeriesId) })}
              disabled={optimizeMut.isPending || !optimizeSeriesId}
            >
              {optimizeMut.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              生成优化建议
            </Button>
          </div>
          {optimizeMut.data && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">建议:</span>
                <Badge className={REC_COLORS[(optimizeMut.data as any).recommendation] || ""}>
                  {REC_LABELS[(optimizeMut.data as any).recommendation] || (optimizeMut.data as any).recommendation}
                </Badge>
              </div>
              <div><span className="font-medium">理由: </span>{(optimizeMut.data as any).rationale}</div>
              <div><span className="font-medium">预计每周节省: </span>{(optimizeMut.data as any).estimated_weekly_savings_minutes} 分钟</div>
              {(optimizeMut.data as any).specific_actions?.length > 0 && (
                <div>
                  <span className="font-medium">具体操作:</span>
                  <ul className="mt-1 space-y-1">
                    {(optimizeMut.data as any).specific_actions.map((a: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(optimizeMut.data as any).narrative && (
                <div><span className="font-medium">AI叙述: </span><span className="text-muted-foreground">{(optimizeMut.data as any).narrative}</span></div>
              )}
            </div>
          )}
          {optimizeMut.isError && (
            <p className="text-sm text-red-500">优化失败: {optimizeMut.error.message}</p>
          )}

          {/* Batch optimization */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">批量优化</p>
            <div className="flex gap-3">
              <Input
                placeholder="系列ID（逗号分隔），如: 1,2,3"
                value={batchIds}
                onChange={(e) => setBatchIds(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  const ids = batchIds.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0);
                  if (ids.length > 0) batchOptimizeMut.mutate({ seriesIds: ids });
                }}
                disabled={batchOptimizeMut.isPending || !batchIds.trim()}
              >
                {batchOptimizeMut.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                批量优化
              </Button>
            </div>
            {batchOptimizeMut.data && (
              <p className="text-sm text-green-600 mt-2">
                已完成 {(batchOptimizeMut.data as any).optimized} 个, 失败 {(batchOptimizeMut.data as any).errors} 个
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Record Optimization Action */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">记录优化操作</CardTitle>
          <CardDescription>记录对周期性会议系列采取的优化操作</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="系列ID"
              value={actionSeriesId}
              onChange={(e) => setActionSeriesId(e.target.value)}
              className="w-32"
            />
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cancelled">取消</SelectItem>
                <SelectItem value="reduced_frequency">降低频率</SelectItem>
                <SelectItem value="shortened">缩短时长</SelectItem>
                <SelectItem value="merged">合并</SelectItem>
                <SelectItem value="no_change">无变化</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => recordActionMut.mutate({ seriesId: Number(actionSeriesId), actionTaken: actionType })}
              disabled={recordActionMut.isPending || !actionSeriesId}
            >
              {recordActionMut.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
              记录操作
            </Button>
          </div>
          {recordActionMut.data && (
            <p className="text-sm text-green-600">
              操作已记录: {ACTION_LABELS[(recordActionMut.data as any).actionTaken]} — 每周节省 {(recordActionMut.data as any).minutesSaved} 分钟
            </p>
          )}
          {recordActionMut.isError && (
            <p className="text-sm text-red-500">记录失败: {recordActionMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Optimization Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">优化结果追踪</CardTitle>
          <CardDescription>查看已采取优化操作的效果</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionPieData.length > 0 && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <h4 className="text-sm font-medium mb-2">操作类型分布</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={actionPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {actionPieData.map((_: any, idx: number) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-2/3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>会议系列</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                      <TableHead className="text-center">操作前(分/周)</TableHead>
                      <TableHead className="text-center">操作后(分/周)</TableHead>
                      <TableHead className="text-center">节省(分/周)</TableHead>
                      <TableHead className="text-center">成本节省</TableHead>
                      <TableHead className="text-center">生产力影响</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outcomes.map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium max-w-[150px] truncate">{o.series_title}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{ACTION_LABELS[o.action_taken] || o.action_taken}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{o.pre_action_weekly_minutes}</TableCell>
                        <TableCell className="text-center">{o.post_action_weekly_minutes}</TableCell>
                        <TableCell className="text-center font-semibold text-green-600">{o.minutes_saved_per_week}</TableCell>
                        <TableCell className="text-center">{o.cost_saved_per_week}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={o.productivity_impact === "positive" ? "default" : "outline"}>
                            {o.productivity_impact}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {outcomes.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">暂无优化结果数据</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Org Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">组织总览</CardTitle>
          <CardDescription>周期性会议的组织级视图：价值分布、频率分布与潜在节省</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Grade distribution */}
            <div>
              <h4 className="text-sm font-medium mb-2">价值等级分布</h4>
              {gradeDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={gradeDist}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {gradeDist.map((entry: any, idx: number) => (
                        <Cell key={idx} fill={GRADE_BAR_COLORS[entry.name] || COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">暂无数据</p>
              )}
            </div>

            {/* Frequency distribution */}
            <div>
              <h4 className="text-sm font-medium mb-2">频率分布</h4>
              {freqDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={freqDist}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {freqDist.map((_: any, idx: number) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">暂无数据</p>
              )}
            </div>
          </div>

          {/* Potential savings highlight */}
          {summary?.potentialSavings && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                潜在节省空间
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">D/F级系列数</div>
                  <div className="font-semibold text-lg">{summary.potentialSavings.dfSeriesCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">累计时间</div>
                  <div className="font-semibold text-lg">{summary.potentialSavings.totalMinutes} 分钟</div>
                </div>
                <div>
                  <div className="text-muted-foreground">累计成本</div>
                  <div className="font-semibold text-lg">{summary.potentialSavings.totalCost}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">预估每周可节省</div>
                  <div className="font-semibold text-lg text-green-600">{summary.potentialSavings.estimatedWeeklySavings} 分钟</div>
                </div>
              </div>
            </div>
          )}

          {/* Worst series table */}
          {(summary?.worstSeries || []).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">最低价值会议 Top 10</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>会议名称</TableHead>
                    <TableHead className="text-center">频率</TableHead>
                    <TableHead className="text-center">价值分</TableHead>
                    <TableHead className="text-center">等级</TableHead>
                    <TableHead className="text-center">效能</TableHead>
                    <TableHead className="text-center">累计时长</TableHead>
                    <TableHead className="text-center">建议</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(summary.worstSeries as any[]).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{s.series_title}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{FREQ_LABELS[s.frequency] || s.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{s.value_score}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={GRADE_COLORS[s.value_grade] || ""}>{s.value_grade}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{s.avg_effectiveness_score}</TableCell>
                      <TableCell className="text-center">{s.total_cumulative_minutes} 分</TableCell>
                      <TableCell className="text-center">
                        <Badge className={REC_COLORS[s.recommendation] || ""} variant="secondary">
                          {REC_LABELS[s.recommendation] || s.recommendation}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
