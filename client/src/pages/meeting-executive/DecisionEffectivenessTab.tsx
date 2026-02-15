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
  Minus, Building2,
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
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800", in_progress: "bg-blue-100 text-blue-800",
  implemented: "bg-green-100 text-green-800", abandoned: "bg-red-100 text-red-800",
  reversed: "bg-orange-100 text-orange-800",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "待执行", in_progress: "执行中", implemented: "已实施", abandoned: "已放弃", reversed: "已逆转",
};
const IMPACT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-800", neutral: "bg-gray-100 text-gray-800", negative: "bg-red-100 text-red-800",
};
const IMPACT_LABELS: Record<string, string> = { positive: "积极", neutral: "中性", negative: "消极" };
const TREND_COLORS: Record<string, string> = {
  improving: "bg-green-100 text-green-800", stable: "bg-gray-100 text-gray-800", declining: "bg-red-100 text-red-800",
};
const TREND_LABELS: Record<string, string> = { improving: "改善中", stable: "稳定", declining: "下降中" };

export function DecisionEffectivenessTab() {
  // Section 1: Analyze form
  const [meetingId, setMeetingId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  // Section 3: Expanded row
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Section 6: Reversal detection
  const [reversalDateFrom, setReversalDateFrom] = useState("");
  const [reversalDateTo, setReversalDateTo] = useState("");

  // Section 7: Quality assessment
  const [qualityDecisionId, setQualityDecisionId] = useState("");

  // Section 8: Update follow-through
  const [updateId, setUpdateId] = useState("");
  const [updateStatus, setUpdateStatus] = useState("pending");
  const [updateStartDate, setUpdateStartDate] = useState("");
  const [updateEndDate, setUpdateEndDate] = useState("");
  const [updateOutcome, setUpdateOutcome] = useState("");
  const [updateImpactScore, setUpdateImpactScore] = useState("");

  // Section 9: Decision snapshot
  const [snapshotScope, setSnapshotScope] = useState("org");
  const [snapshotScopeId, setSnapshotScopeId] = useState("");
  const [snapshotDateFrom, setSnapshotDateFrom] = useState("");
  const [snapshotDateTo, setSnapshotDateTo] = useState("");

  // Queries
  const dashboardQuery = trpc.ime.decisionDashboard.useQuery({});
  const trackingListQuery = trpc.ime.decisionTrackingList.useQuery({});
  const velocityTrendQuery = trpc.ime.decisionVelocityTrend.useQuery({});
  const reversalAnalysisQuery = trpc.ime.decisionReversalAnalysis.useQuery({});
  const velocityQuery = trpc.ime.computeDecisionVelocity.useQuery({});

  // Mutations
  const analyzeMut = trpc.ime.analyzeDecisionEffectiveness.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      trackingListQuery.refetch();
    },
  });
  const batchAnalyzeMut = trpc.ime.batchAnalyzeDecisionEffectiveness.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      trackingListQuery.refetch();
    },
  });
  const detectReversalsMut = trpc.ime.detectDecisionReversals.useMutation({
    onSuccess: () => {
      reversalAnalysisQuery.refetch();
      trackingListQuery.refetch();
    },
  });
  const assessQualityMut = trpc.ime.assessDecisionQuality.useMutation();
  const snapshotMut = trpc.ime.computeDecisionSnapshot.useMutation();
  const updateFollowThroughMut = trpc.ime.updateDecisionFollowThrough.useMutation({
    onSuccess: () => {
      trackingListQuery.refetch();
      dashboardQuery.refetch();
      setUpdateId("");
      setUpdateOutcome("");
      setUpdateImpactScore("");
    },
  });

  const dashboard = (dashboardQuery.data ?? {}) as any;
  const trackingList = ((trackingListQuery.data as any)?.rows || []) as any[];
  const velocityTrend = (velocityTrendQuery.data || []) as any[];
  const reversalAnalysis = (reversalAnalysisQuery.data ?? {}) as any;
  const velocityData = (velocityQuery.data ?? {}) as any;
  const velocityByDept = (velocityData?.byDepartment || []) as any[];

  // Compute status distribution from tracking list for pie chart
  const statusDistMap: Record<string, number> = {};
  for (const t of trackingList) {
    const s = t.follow_through_status || "pending";
    statusDistMap[s] = (statusDistMap[s] || 0) + 1;
  }
  const statusPieData = Object.entries(statusDistMap).map(([name, value]) => ({
    name: STATUS_LABELS[name] || name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Section 1: Analyze Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            分析决策效能
          </CardTitle>
          <CardDescription>输入会议ID进行决策效能分析</CardDescription>
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
              onClick={() => analyzeMut.mutate({ meetingId })}
              disabled={analyzeMut.isPending || !meetingId.trim()}
            >
              {analyzeMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              分析决策效能
            </Button>
          </div>
          {analyzeMut.data && (
            <p className="text-sm text-green-600">
              分析完成，识别到 {(analyzeMut.data as any).decisionsAnalyzed ?? 0} 个决策
            </p>
          )}
          {analyzeMut.isError && (
            <p className="text-sm text-red-500">错误: {analyzeMut.error.message}</p>
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
                  if (ids.length > 0) batchAnalyzeMut.mutate({ meetingIds: ids });
                }}
                disabled={batchAnalyzeMut.isPending || !batchIds.trim()}
              >
                {batchAnalyzeMut.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                批量分析
              </Button>
            </div>
            {batchAnalyzeMut.data && (
              <p className="text-sm text-green-600 mt-2">
                已完成 {(batchAnalyzeMut.data as any[]).filter((r: any) => r.success).length} 个, 失败 {(batchAnalyzeMut.data as any[]).filter((r: any) => !r.success).length} 个
              </p>
            )}
            {batchAnalyzeMut.isError && (
              <p className="text-sm text-red-500">错误: {batchAnalyzeMut.error.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="决策总数"
          value={dashboard?.totalDecisions ?? "..."}
          subtitle="Total Decisions"
        />
        <StatCard
          icon={CheckCircle2}
          label="执行率"
          value={dashboard?.followThroughRate ? `${dashboard.followThroughRate}%` : "..."}
          subtitle="Follow-through Rate"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Clock}
          label="平均速度(天)"
          value={dashboard?.avgVelocityDays ?? "..."}
          subtitle="Avg Velocity Days"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="逆转数"
          value={dashboard?.reversedCount ?? "..."}
          subtitle="Reversals"
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Section 3: Decision Tracking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">决策跟踪列表</CardTitle>
          <CardDescription>查看所有已识别决策的执行状态与质量评估</CardDescription>
        </CardHeader>
        <CardContent>
          {trackingList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>会议</TableHead>
                  <TableHead>决策内容</TableHead>
                  <TableHead>决策者</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-center">速度(天)</TableHead>
                  <TableHead className="text-center">影响</TableHead>
                  <TableHead className="text-center">质量分</TableHead>
                  <TableHead className="text-center">等级</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackingList.map((row: any) => (
                  <>
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate" title={row.meeting_id}>{row.meeting_title || row.meeting_id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {row.decision_text?.length > 50
                          ? row.decision_text.slice(0, 50) + "..."
                          : row.decision_text}
                      </TableCell>
                      <TableCell>{row.decision_maker || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={STATUS_COLORS[row.follow_through_status] || ""} variant="secondary">
                          {STATUS_LABELS[row.follow_through_status] || row.follow_through_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{row.total_velocity_days ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {row.impact_category ? (
                          <Badge className={IMPACT_COLORS[row.impact_category] || ""} variant="secondary">
                            {IMPACT_LABELS[row.impact_category] || row.impact_category}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{row.ai_quality_score ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {row.velocity_grade ? (
                          <Badge className={GRADE_COLORS[row.velocity_grade] || ""}>{row.velocity_grade}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {expandedId === row.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === row.id && (
                      <TableRow key={`${row.id}-detail`}>
                        <TableCell colSpan={10} className="bg-muted/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-sm">
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium">完整决策内容: </span>
                                <span className="text-muted-foreground">{row.decision_text || "—"}</span>
                              </div>
                              <div>
                                <span className="font-medium">利益相关者: </span>
                                {(() => {
                                  try {
                                    return JSON.parse(row.stakeholders || "[]").join(", ") || "—";
                                  } catch {
                                    return row.stakeholders || "—";
                                  }
                                })()}
                              </div>
                              <div>
                                <span className="font-medium">决策日期: </span>
                                {row.decision_date ? new Date(row.decision_date).toLocaleDateString("zh-CN") : "—"}
                              </div>
                              <div>
                                <span className="font-medium">执行开始: </span>
                                {row.implementation_start_date ? new Date(row.implementation_start_date).toLocaleDateString("zh-CN") : "—"}
                              </div>
                              <div>
                                <span className="font-medium">执行结束: </span>
                                {row.implementation_end_date ? new Date(row.implementation_end_date).toLocaleDateString("zh-CN") : "—"}
                              </div>
                              <div>
                                <span className="font-medium">业务结果: </span>
                                <span className="text-muted-foreground">{row.business_outcome || "—"}</span>
                              </div>
                              <div>
                                <span className="font-medium">影响分数: </span>{row.impact_score ?? "—"}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {row.ai_narrative && (
                                <>
                                  <div className="font-medium">AI分析:</div>
                                  <p className="text-muted-foreground">{row.ai_narrative}</p>
                                </>
                              )}
                              {(() => {
                                try {
                                  const recs = JSON.parse(row.ai_recommendations || "[]");
                                  if (recs.length > 0) {
                                    return (
                                      <div>
                                        <div className="font-medium">建议:</div>
                                        <ul className="mt-1 space-y-1">
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
                              {row.follow_through_status === "reversed" && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                                  <div className="font-medium text-orange-800 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    逆转详情
                                  </div>
                                  <div className="text-muted-foreground mt-1">
                                    <div>逆转原因: {row.reversal_reason || "—"}</div>
                                    <div>逆转会议: {row.reversal_meeting_id || "—"}</div>
                                    <div>逆转日期: {row.reversal_date ? new Date(row.reversal_date).toLocaleDateString("zh-CN") : "—"}</div>
                                  </div>
                                </div>
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
              <p>暂无决策跟踪数据</p>
              <p className="text-sm">请先在上方输入会议ID进行决策分析</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Velocity Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">决策速度趋势</CardTitle>
          <CardDescription>跟踪决策从制定到执行的速度变化与执行率趋势</CardDescription>
        </CardHeader>
        <CardContent>
          {velocityTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={velocityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period_end"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v?.split("T")[0] || v}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip labelFormatter={(v: string) => v?.split("T")[0] || v} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avg_velocity_days"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="平均速度(天)"
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="follow_through_rate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="执行率(%)"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">暂无速度趋势数据</p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Follow-through Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status distribution pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">决策状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusPieData.map((_: any, idx: number) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">暂无数据</p>
            )}
          </CardContent>
        </Card>

        {/* Velocity by department bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各部门决策速度</CardTitle>
          </CardHeader>
          <CardContent>
            {velocityByDept.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={velocityByDept}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v?.length > 10 ? v.slice(0, 10) + "..." : v}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgVelocity" name="平均速度(天)" fill="#6366f1" />
                  <Bar dataKey="count" name="决策数" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">暂无部门速度数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 6: Reversal Detection & Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            决策逆转检测
          </CardTitle>
          <CardDescription>检测在后续会议中被逆转或推翻的决策</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              type="date"
              value={reversalDateFrom}
              onChange={(e) => setReversalDateFrom(e.target.value)}
              className="w-44"
              placeholder="开始日期"
            />
            <Input
              type="date"
              value={reversalDateTo}
              onChange={(e) => setReversalDateTo(e.target.value)}
              className="w-44"
              placeholder="结束日期"
            />
            <Button
              onClick={() =>
                detectReversalsMut.mutate({
                  dateFrom: reversalDateFrom || undefined,
                  dateTo: reversalDateTo || undefined,
                })
              }
              disabled={detectReversalsMut.isPending}
            >
              {detectReversalsMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              检测决策逆转
            </Button>
          </div>
          {detectReversalsMut.data && (
            <div className="space-y-3">
              <p className="text-sm text-green-600">
                检测完成，发现 {(detectReversalsMut.data as any).reversalsDetected ?? 0} 个决策逆转
              </p>
              {((detectReversalsMut.data as any).reversals || []).length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>原始决策</TableHead>
                      <TableHead>原始会议</TableHead>
                      <TableHead>逆转会议</TableHead>
                      <TableHead>逆转日期</TableHead>
                      <TableHead>原因</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((detectReversalsMut.data as any).reversals as any[]).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{r.original_decision}</TableCell>
                        <TableCell className="font-mono text-xs">{r.original_meeting_id}</TableCell>
                        <TableCell className="font-mono text-xs">{r.reversal_meeting_id}</TableCell>
                        <TableCell>{r.reversal_date ? new Date(r.reversal_date).toLocaleDateString("zh-CN") : "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.reason || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
          {detectReversalsMut.isError && (
            <p className="text-sm text-red-500">错误: {detectReversalsMut.error.message}</p>
          )}

          {/* Reversal analysis aggregate */}
          {(reversalAnalysis?.totalReversals !== undefined || reversalAnalysis?.byDepartment?.length > 0) && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">逆转分析汇总</h4>
              <div className="flex gap-4 text-sm">
                <span>逆转总数: <strong>{reversalAnalysis.totalReversals ?? 0}</strong></span>
              </div>
              {(reversalAnalysis.byDepartment || []).length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-1">按部门分布</h5>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>部门</TableHead>
                        <TableHead className="text-center">逆转数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(reversalAnalysis.byDepartment as any[]).map((d: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{d.department}</TableCell>
                          <TableCell className="text-center">{d.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {(reversalAnalysis.topReasons || []).length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-1">主要逆转原因</h5>
                  <ul className="space-y-1 text-sm">
                    {(reversalAnalysis.topReasons as any[]).map((r: any, i: number) => (
                      <li key={i} className="text-muted-foreground">
                        • {r.reason || r} {r.count ? `(${r.count}次)` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 7: AI Quality Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            AI决策质量评估
          </CardTitle>
          <CardDescription>使用AI对单个决策进行深度质量评估</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入决策跟踪ID..."
              type="number"
              value={qualityDecisionId}
              onChange={(e) => setQualityDecisionId(e.target.value)}
              className="w-48"
            />
            <Button
              onClick={() => assessQualityMut.mutate({ decisionId: Number(qualityDecisionId) })}
              disabled={assessQualityMut.isPending || !qualityDecisionId}
            >
              {assessQualityMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              评估决策质量
            </Button>
          </div>
          {assessQualityMut.data && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-muted-foreground mb-1">质量分</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-indigo-500 h-3 rounded-full"
                        style={{ width: `${(assessQualityMut.data as any).qualityScore ?? 0}%` }}
                      />
                    </div>
                    <span className="font-semibold">{(assessQualityMut.data as any).qualityScore}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">清晰度分</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${(assessQualityMut.data as any).clarityScore ?? 0}%` }}
                      />
                    </div>
                    <span className="font-semibold">{(assessQualityMut.data as any).clarityScore}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">对齐度分</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-amber-500 h-3 rounded-full"
                        style={{ width: `${(assessQualityMut.data as any).alignmentScore ?? 0}%` }}
                      />
                    </div>
                    <span className="font-semibold">{(assessQualityMut.data as any).alignmentScore}</span>
                  </div>
                </div>
              </div>
              {((assessQualityMut.data as any).riskFactors || []).length > 0 && (
                <div>
                  <span className="font-medium">风险因素:</span>
                  <ul className="mt-1 space-y-1">
                    {((assessQualityMut.data as any).riskFactors as string[]).map((f: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {((assessQualityMut.data as any).recommendations || []).length > 0 && (
                <div>
                  <span className="font-medium">改进建议:</span>
                  <ul className="mt-1 space-y-1">
                    {((assessQualityMut.data as any).recommendations as string[]).map((r: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(assessQualityMut.data as any).narrative && (
                <div>
                  <span className="font-medium">AI叙述: </span>
                  <span className="text-muted-foreground">{(assessQualityMut.data as any).narrative}</span>
                </div>
              )}
            </div>
          )}
          {assessQualityMut.isError && (
            <p className="text-sm text-red-500">错误: {assessQualityMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Update Follow-Through */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            更新决策跟踪
          </CardTitle>
          <CardDescription>手动更新决策的执行状态和业务成果</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="决策跟踪ID"
              type="number"
              value={updateId}
              onChange={(e) => setUpdateId(e.target.value)}
            />
            <Select value={updateStatus} onValueChange={setUpdateStatus}>
              <SelectTrigger>
                <SelectValue placeholder="选择状态..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待执行</SelectItem>
                <SelectItem value="in_progress">执行中</SelectItem>
                <SelectItem value="implemented">已实施</SelectItem>
                <SelectItem value="abandoned">已放弃</SelectItem>
                <SelectItem value="reversed">已逆转</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="影响分数 (-100 到 +100)"
              type="number"
              min={-100}
              max={100}
              value={updateImpactScore}
              onChange={(e) => setUpdateImpactScore(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">执行开始日期</label>
              <Input
                type="date"
                value={updateStartDate}
                onChange={(e) => setUpdateStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">执行结束日期</label>
              <Input
                type="date"
                value={updateEndDate}
                onChange={(e) => setUpdateEndDate(e.target.value)}
              />
            </div>
          </div>
          <Input
            placeholder="业务成果描述..."
            value={updateOutcome}
            onChange={(e) => setUpdateOutcome(e.target.value)}
          />
          <Button
            onClick={() =>
              updateFollowThroughMut.mutate({
                id: Number(updateId),
                status: updateStatus || undefined,
                implementationStartDate: updateStartDate || undefined,
                implementationEndDate: updateEndDate || undefined,
                businessOutcome: updateOutcome || undefined,
                impactScore: updateImpactScore ? Number(updateImpactScore) : undefined,
              })
            }
            disabled={updateFollowThroughMut.isPending || !updateId}
          >
            {updateFollowThroughMut.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Target className="h-4 w-4 mr-2" />
            )}
            更新跟踪
          </Button>
          {updateFollowThroughMut.data && (
            <p className="text-sm text-green-600">跟踪信息已更新</p>
          )}
          {updateFollowThroughMut.isError && (
            <p className="text-sm text-red-500">错误: {updateFollowThroughMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Organization Decision Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            组织决策智能
          </CardTitle>
          <CardDescription>生成组织级、部门级或个人级的决策效能快照</CardDescription>
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
                snapshotMut.mutate({
                  scope: snapshotScope,
                  scopeId: snapshotScopeId || undefined,
                  dateFrom: snapshotDateFrom || undefined,
                  dateTo: snapshotDateTo || undefined,
                })
              }
              disabled={snapshotMut.isPending}
            >
              {snapshotMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              生成快照
            </Button>
          </div>
          {snapshotMut.data && (
            <div className="space-y-4">
              {/* Metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Target className="h-5 w-5 mx-auto text-indigo-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).totalDecisions ?? 0}</div>
                    <div className="text-xs text-muted-foreground">决策总数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).implementedCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">已实施</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).avgVelocityDays ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">平均速度(天)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).followThroughRate ?? "—"}%</div>
                    <div className="text-xs text-muted-foreground">执行率</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <AlertTriangle className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).reversedCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">逆转数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <BarChart3 className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).avgQualityScore ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">平均质量分</div>
                  </CardContent>
                </Card>
              </div>

              {/* Trend badge */}
              {(snapshotMut.data as any).trendVsPrevious && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">整体趋势:</span>
                  <Badge className={TREND_COLORS[(snapshotMut.data as any).trendVsPrevious] || ""} variant="secondary">
                    {(() => {
                      const trend = (snapshotMut.data as any).trendVsPrevious;
                      const Icon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
                      return (
                        <>
                          <Icon className="h-3 w-3 mr-1" />
                          {TREND_LABELS[trend] || trend}
                        </>
                      );
                    })()}
                  </Badge>
                </div>
              )}

              {/* Bottlenecks */}
              {((snapshotMut.data as any).topBottlenecks || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">瓶颈分析</h4>
                  <ul className="space-y-1 text-sm">
                    {((snapshotMut.data as any).topBottlenecks as string[]).map((b: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reversal reasons */}
              {((snapshotMut.data as any).topReversalReasons || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">逆转原因</h4>
                  <ul className="space-y-1 text-sm">
                    {((snapshotMut.data as any).topReversalReasons as string[]).map((r: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI narrative */}
              {(snapshotMut.data as any).aiNarrative && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-1">AI分析</h4>
                  <p className="text-sm text-muted-foreground">{(snapshotMut.data as any).aiNarrative}</p>
                </div>
              )}

              {/* Recommendations */}
              {((snapshotMut.data as any).recommendations || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">优化建议</h4>
                  <ul className="space-y-1 text-sm">
                    {((snapshotMut.data as any).recommendations as string[]).map((r: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {snapshotMut.isError && (
            <p className="text-sm text-red-500">错误: {snapshotMut.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
