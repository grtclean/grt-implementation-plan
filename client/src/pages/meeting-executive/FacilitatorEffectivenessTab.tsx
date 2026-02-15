import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, Play, ChevronDown, ChevronUp, Target, CheckCircle2,
  Users, Award, BarChart3, Zap, TrendingUp, TrendingDown,
  Minus, Building2, UserCheck, Lightbulb, Star, Shield,
} from "lucide-react";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800", F: "bg-red-100 text-red-800",
};

const STYLE_LABELS: Record<string, string> = {
  directive: "指令型", collaborative: "协作型", laissez_faire: "放任型",
  structured: "结构型", coaching: "教练型", democratic: "民主型", unknown: "未知",
};

const TREND_COLORS: Record<string, string> = {
  improving: "bg-green-100 text-green-800", stable: "bg-gray-100 text-gray-800", declining: "bg-red-100 text-red-800",
};
const TREND_LABELS: Record<string, string> = { improving: "改善中", stable: "稳定", declining: "下降中" };

export function FacilitatorEffectivenessTab() {
  // Section 1: Analyze form
  const [analyzeId, setAnalyzeId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  // Section 3: Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Section 4: Facilitator profile
  const [profileId, setProfileId] = useState("");

  // Section 6: Pattern filters
  const [patternDateFrom, setPatternDateFrom] = useState("");
  const [patternDateTo, setPatternDateTo] = useState("");

  // Section 7: AI coaching
  const [coachingId, setCoachingId] = useState("");

  // Section 9: Manual update
  const [updateId, setUpdateId] = useState("");
  const [updateName, setUpdateName] = useState("");
  const [updateStyle, setUpdateStyle] = useState("");
  const [updateEng, setUpdateEng] = useState("");
  const [updateDec, setUpdateDec] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [updateInc, setUpdateInc] = useState("");
  const [updateCla, setUpdateCla] = useState("");
  const [updateCon, setUpdateCon] = useState("");

  // Section 10: Organization snapshot
  const [snapshotScope, setSnapshotScope] = useState("org");
  const [snapshotScopeId, setSnapshotScopeId] = useState("");
  const [snapshotDateFrom, setSnapshotDateFrom] = useState("");
  const [snapshotDateTo, setSnapshotDateTo] = useState("");

  // Queries
  const dashboardQuery = trpc.ime.facilitatorDashboard.useQuery({});
  const analysisListQuery = trpc.ime.facilitatorAnalysisList.useQuery({});
  const profileQuery = trpc.ime.facilitatorProfile.useQuery(
    { facilitatorId: profileId },
    { enabled: !!profileId }
  );
  const comparisonQuery = trpc.ime.facilitatorComparison.useQuery({});
  const patternsQuery = trpc.ime.facilitationPatterns.useQuery({
    dateFrom: patternDateFrom || undefined,
    dateTo: patternDateTo || undefined,
  });
  const stylesQuery = trpc.ime.facilitatorStyles.useQuery({
    dateFrom: patternDateFrom || undefined,
    dateTo: patternDateTo || undefined,
  });
  const trendQuery = trpc.ime.facilitatorTrendData.useQuery({});

  // Mutations
  const analyzeMut = trpc.ime.analyzeMeetingFacilitator.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      analysisListQuery.refetch();
    },
  });
  const batchAnalyzeMut = trpc.ime.batchAnalyzeFacilitators.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      analysisListQuery.refetch();
    },
  });
  const coachingMut = trpc.ime.generateFacilitatorCoaching.useMutation();
  const updateMut = trpc.ime.updateFacilitatorAnalysis.useMutation({
    onSuccess: () => {
      analysisListQuery.refetch();
      dashboardQuery.refetch();
      setUpdateId("");
      setUpdateName("");
      setUpdateStyle("");
      setUpdateEng("");
      setUpdateDec("");
      setUpdateTime("");
      setUpdateInc("");
      setUpdateCla("");
      setUpdateCon("");
    },
  });
  const snapshotMut = trpc.ime.computeFacilitatorSnapshot.useMutation();

  const dashboard = (dashboardQuery.data ?? {}) as any;
  const analysisList = ((analysisListQuery.data as any)?.rows || []) as any[];
  const profileData = (profileQuery.data ?? null) as any;
  const comparisonData = (comparisonQuery.data ?? {}) as any;
  const facilitators = (comparisonData?.facilitators || []) as any[];
  const patternsData = (patternsQuery.data ?? {}) as any;
  const patterns = (patternsData?.patterns || []) as any[];
  const correlations = (patternsData?.correlations || []) as any[];
  const recommendations = (patternsData?.recommendations || []) as any[];
  const stylesData = (stylesQuery.data ?? {}) as any;
  const styles = (stylesData?.styles || []) as any[];
  const trendData = (trendQuery.data || []) as any[];

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Analyze Facilitator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-500" />
            分析引导者效能
          </CardTitle>
          <CardDescription>输入会议ID进行引导者效能分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single analysis */}
          <div className="flex gap-3">
            <Input
              placeholder="输入会议ID..."
              value={analyzeId}
              onChange={(e) => setAnalyzeId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => analyzeMut.mutate({ meetingId: analyzeId })}
              disabled={analyzeMut.isPending || !analyzeId.trim()}
            >
              {analyzeMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              分析引导者
            </Button>
          </div>
          {analyzeMut.data && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p>
                <span className="font-medium">引导者: </span>
                <span className="text-muted-foreground">{(analyzeMut.data as any).facilitatorName ?? "—"}</span>
              </p>
              <p>
                <span className="font-medium">引导风格: </span>
                <span className="text-muted-foreground">
                  {STYLE_LABELS[(analyzeMut.data as any).facilitationStyle] || (analyzeMut.data as any).facilitationStyle || "—"}
                </span>
              </p>
              <p>
                <span className="font-medium">效能分: </span>
                <span className="font-semibold">{(analyzeMut.data as any).overallEffectivenessScore ?? "—"}</span>
              </p>
              <p>
                <span className="font-medium">等级: </span>
                {(analyzeMut.data as any).grade ? (
                  <Badge className={GRADE_COLORS[(analyzeMut.data as any).grade] || ""}>
                    {(analyzeMut.data as any).grade}
                  </Badge>
                ) : "—"}
              </p>
              <p>
                <span className="font-medium">发言人数: </span>
                <span className="text-muted-foreground">{(analyzeMut.data as any).totalSpeakers ?? 0}</span>
              </p>
            </div>
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
            {batchAnalyzeMut.data && (() => {
              const results = ((batchAnalyzeMut.data as any)?.results ?? []) as any[];
              return (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-green-600">
                    已完成 {results.filter((r: any) => r.success).length} 个, 失败 {results.filter((r: any) => !r.success).length} 个
                  </p>
                  {results.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>会议ID</TableHead>
                          <TableHead>引导者</TableHead>
                          <TableHead className="text-center">效能分</TableHead>
                          <TableHead className="text-center">等级</TableHead>
                          <TableHead className="text-center">状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{r.meetingId ?? "—"}</TableCell>
                            <TableCell>{r.facilitatorName ?? "—"}</TableCell>
                            <TableCell className="text-center font-semibold">{r.overallEffectivenessScore ?? "—"}</TableCell>
                            <TableCell className="text-center">
                              {r.grade ? (
                                <Badge className={GRADE_COLORS[r.grade] || ""}>{r.grade}</Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {r.success ? (
                                <Badge className="bg-green-100 text-green-800" variant="secondary">成功</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800" variant="secondary">失败</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })()}
            {batchAnalyzeMut.isError && (
              <p className="text-sm text-red-500 mt-2">错误: {batchAnalyzeMut.error.message}</p>
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
          label="平均效能分"
          value={dashboard?.avgEffectivenessScore ?? "..."}
          subtitle="Avg Effectiveness Score"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Users}
          label="引导者总数"
          value={dashboard?.totalFacilitators ?? "..."}
          subtitle="Total Facilitators"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={Award}
          label="主导风格"
          value={dashboard?.dominantStyle ? (STYLE_LABELS[dashboard.dominantStyle] || dashboard.dominantStyle) : "..."}
          subtitle="Dominant Style"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Section 3: Facilitator Analysis List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">引导者分析列表</CardTitle>
          <CardDescription>查看所有已分析的引导者效能数据</CardDescription>
        </CardHeader>
        <CardContent>
          {analysisList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议ID</TableHead>
                  <TableHead>引导者</TableHead>
                  <TableHead className="text-center">风格</TableHead>
                  <TableHead className="text-center">效能分</TableHead>
                  <TableHead className="text-center">参与引导</TableHead>
                  <TableHead className="text-center">决策推动</TableHead>
                  <TableHead className="text-center">时间管理</TableHead>
                  <TableHead className="text-center">等级</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisList.map((row: any) => {
                  const isExpanded = expandedRows.has(row.id);
                  return (
                    <>
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(row.id)}
                      >
                        <TableCell className="font-mono text-xs" title={row.meeting_id}>
                          {(row.meeting_id || "").length > 8 ? (row.meeting_id || "").slice(0, 8) + "..." : row.meeting_id || "—"}
                        </TableCell>
                        <TableCell>{row.facilitator_name || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {STYLE_LABELS[row.facilitation_style] || row.facilitation_style || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {row.overall_effectiveness_score ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.engagement_impact_score ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.decision_facilitation_score ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.time_management_score ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.grade ? (
                            <Badge className={GRADE_COLORS[row.grade] || ""}>{row.grade}</Badge>
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
                        <TableRow key={`${row.id}-detail`}>
                          <TableCell colSpan={9} className="bg-muted/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-sm">
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium">包容性分: </span>
                                  <span className="text-muted-foreground">{row.inclusivity_score ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">清晰度分: </span>
                                  <span className="text-muted-foreground">{row.clarity_score ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">冲突解决分: </span>
                                  <span className="text-muted-foreground">{row.conflict_resolution_score ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">发言平衡度: </span>
                                  <span className="text-muted-foreground">{row.speaker_balance_score ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">发言人数: </span>
                                  <span className="text-muted-foreground">{row.total_speakers ?? "—"}</span>
                                </div>
                                <div>
                                  <span className="font-medium">优势: </span>
                                  {(() => {
                                    try {
                                      const items = JSON.parse(row.strengths || "[]");
                                      if (Array.isArray(items) && items.length > 0) {
                                        return (
                                          <ul className="mt-1 space-y-1">
                                            {items.map((s: string, i: number) => (
                                              <li key={i} className="text-muted-foreground">• {s}</li>
                                            ))}
                                          </ul>
                                        );
                                      }
                                      return <span className="text-muted-foreground">—</span>;
                                    } catch {
                                      return <span className="text-muted-foreground">{row.strengths || "—"}</span>;
                                    }
                                  })()}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium">不足: </span>
                                  {(() => {
                                    try {
                                      const items = JSON.parse(row.weaknesses || "[]");
                                      if (Array.isArray(items) && items.length > 0) {
                                        return (
                                          <ul className="mt-1 space-y-1">
                                            {items.map((w: string, i: number) => (
                                              <li key={i} className="text-muted-foreground">• {w}</li>
                                            ))}
                                          </ul>
                                        );
                                      }
                                      return <span className="text-muted-foreground">—</span>;
                                    } catch {
                                      return <span className="text-muted-foreground">{row.weaknesses || "—"}</span>;
                                    }
                                  })()}
                                </div>
                                <div>
                                  <span className="font-medium">教练要点: </span>
                                  {(() => {
                                    try {
                                      const items = JSON.parse(row.coaching_points || "[]");
                                      if (Array.isArray(items) && items.length > 0) {
                                        return (
                                          <ul className="mt-1 space-y-1">
                                            {items.map((c: string, i: number) => (
                                              <li key={i} className="text-muted-foreground">• {c}</li>
                                            ))}
                                          </ul>
                                        );
                                      }
                                      return <span className="text-muted-foreground">—</span>;
                                    } catch {
                                      return <span className="text-muted-foreground">{row.coaching_points || "—"}</span>;
                                    }
                                  })()}
                                </div>
                                {row.ai_narrative && (
                                  <div>
                                    <span className="font-medium">AI分析: </span>
                                    <p className="text-muted-foreground mt-1">{row.ai_narrative}</p>
                                  </div>
                                )}
                              </div>
                            </div>
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
              <p>暂无引导者分析数据</p>
              <p className="text-sm">请先在上方输入会议ID进行引导者分析</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Facilitator Profile (Radar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            引导者档案
          </CardTitle>
          <CardDescription>查看引导者综合能力雷达图与风格分布</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入引导者ID..."
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => profileQuery.refetch()}
              disabled={profileQuery.isFetching || !profileId.trim()}
            >
              {profileQuery.isFetching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              查看档案
            </Button>
          </div>

          {profileData && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p>
                  <span className="font-medium">引导者: </span>
                  <span className="text-muted-foreground">{profileData.facilitatorName ?? "—"}</span>
                </p>
                <p>
                  <span className="font-medium">引导会议数: </span>
                  <span className="text-muted-foreground">{profileData.meetingsFacilitated ?? 0}</span>
                </p>
                <p>
                  <span className="font-medium">平均效能: </span>
                  <span className="font-semibold">{profileData.avgEffectiveness ?? "—"}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Radar chart */}
                <div>
                  <h4 className="text-sm font-medium mb-2">能力雷达图</h4>
                  {(profileData.radarData || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={profileData.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="得分"
                          dataKey="score"
                          stroke="#6366f1"
                          fill="#6366f1"
                          fillOpacity={0.3}
                        />
                        <Tooltip />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">暂无雷达图数据</p>
                  )}
                </div>

                {/* Style distribution pie */}
                <div>
                  <h4 className="text-sm font-medium mb-2">风格分布</h4>
                  {(profileData.styleDistribution || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={(profileData.styleDistribution as any[]).map((s: any) => ({
                            name: STYLE_LABELS[s.style] || s.style,
                            value: s.count,
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {(profileData.styleDistribution as any[]).map((_: any, idx: number) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">暂无风格分布数据</p>
                  )}
                </div>
              </div>

              {/* Trend */}
              {profileData.trend && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">效能趋势:</span>
                  <Badge className={TREND_COLORS[profileData.trend] || ""} variant="secondary">
                    {(() => {
                      const Icon = profileData.trend === "improving" ? TrendingUp : profileData.trend === "declining" ? TrendingDown : Minus;
                      return (
                        <>
                          <Icon className="h-3 w-3 mr-1" />
                          {TREND_LABELS[profileData.trend] || profileData.trend}
                        </>
                      );
                    })()}
                  </Badge>
                </div>
              )}
            </div>
          )}
          {profileQuery.isError && (
            <p className="text-sm text-red-500">错误: {profileQuery.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Facilitator Comparison (Bar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            引导者效能对比
          </CardTitle>
          <CardDescription>按效能分对引导者进行排名比较</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {facilitators.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={facilitators}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="facilitatorName"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v?.length > 8 ? v.slice(0, 8) + "..." : v}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgEffectiveness" name="平均效能分" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">暂无对比数据</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Average */}
            <Card>
              <CardContent className="pt-4 text-center">
                <Target className="h-5 w-5 mx-auto text-indigo-500 mb-1" />
                <div className="text-xl font-bold">{comparisonData.avgEffectiveness ?? "—"}</div>
                <div className="text-xs text-muted-foreground">整体平均效能</div>
              </CardContent>
            </Card>

            {/* Best facilitator */}
            {comparisonData.bestFacilitator && (
              <Card className="border-green-200">
                <CardContent className="pt-4 text-center">
                  <Award className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <div className="text-lg font-bold text-green-700">
                    {comparisonData.bestFacilitator.facilitatorName ?? "—"}
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    {comparisonData.bestFacilitator.avgEffectiveness ?? "—"}分
                  </div>
                  <div className="text-xs text-muted-foreground">最佳引导者</div>
                </CardContent>
              </Card>
            )}

            {/* Worst facilitator */}
            {comparisonData.worstFacilitator && (
              <Card className="border-red-200">
                <CardContent className="pt-4 text-center">
                  <TrendingDown className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <div className="text-lg font-bold text-red-700">
                    {comparisonData.worstFacilitator.facilitatorName ?? "—"}
                  </div>
                  <div className="text-sm font-semibold text-red-600">
                    {comparisonData.worstFacilitator.avgEffectiveness ?? "—"}分
                  </div>
                  <div className="text-xs text-muted-foreground">待提升引导者</div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Facilitation Patterns & Style Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-500" />
            引导模式与风格分类
          </CardTitle>
          <CardDescription>分析引导模式、相关性及风格效能分类</CardDescription>
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
            <Button
              onClick={() => {
                patternsQuery.refetch();
                stylesQuery.refetch();
              }}
              disabled={patternsQuery.isFetching || stylesQuery.isFetching}
            >
              {patternsQuery.isFetching || stylesQuery.isFetching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              分析引导模式
            </Button>
          </div>

          {/* Patterns table */}
          {patterns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">引导模式</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模式</TableHead>
                    <TableHead className="text-center">频率</TableHead>
                    <TableHead className="text-center">影响</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[250px] truncate">{p.pattern ?? p.name ?? "—"}</TableCell>
                      <TableCell className="text-center">{p.frequency ?? p.count ?? 0}</TableCell>
                      <TableCell className="text-center">{p.impact ?? p.avgImpact ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Correlations table */}
          {correlations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">相关性分析</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>因素1</TableHead>
                    <TableHead>因素2</TableHead>
                    <TableHead className="text-center">关系</TableHead>
                    <TableHead className="text-center">强度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correlations.map((c: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{c.factor1 ?? "—"}</TableCell>
                      <TableCell>{c.factor2 ?? "—"}</TableCell>
                      <TableCell className="text-center">{c.relationship ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={
                          c.strength === "strong" ? "bg-green-100 text-green-800" :
                          c.strength === "moderate" ? "bg-amber-100 text-amber-800" :
                          "bg-gray-100 text-gray-800"
                        }>
                          {c.strength === "strong" ? "强" : c.strength === "moderate" ? "中" : c.strength === "weak" ? "弱" : c.strength ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">建议</h4>
              <ul className="space-y-1 text-sm">
                {recommendations.map((r: any, i: number) => (
                  <li key={i} className="text-muted-foreground">• {typeof r === "string" ? r : r.recommendation ?? r.text ?? ""}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Style classification */}
          {styles.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">风格效能分类</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pie chart of style distribution */}
                <div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={styles.map((s: any) => ({
                          name: STYLE_LABELS[s.style] || s.style,
                          value: s.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {styles.map((_: any, idx: number) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Style effectiveness list */}
                <div className="space-y-2">
                  {styles.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                      <div>
                        <span className="font-medium">{STYLE_LABELS[s.style] || s.style}</span>
                        <span className="text-muted-foreground text-sm ml-2">({s.count}次)</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">效能: </span>
                          <span className="font-semibold">{s.avgEffectiveness ?? "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">产出: </span>
                          <span className="font-semibold">{s.avgMeetingOutcome ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 7: AI Coaching Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            AI教练建议
          </CardTitle>
          <CardDescription>使用AI为引导者生成个性化教练提升方案</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入引导者ID..."
              value={coachingId}
              onChange={(e) => setCoachingId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => coachingMut.mutate({ facilitatorId: coachingId })}
              disabled={coachingMut.isPending || !coachingId.trim()}
            >
              {coachingMut.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              生成教练建议
            </Button>
          </div>

          {coachingMut.data && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p>
                  <span className="font-medium">引导者: </span>
                  <span className="text-muted-foreground">{(coachingMut.data as any).facilitatorName ?? "—"}</span>
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {(coachingMut.data as any).topStrength && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">最大优势:</span>
                      <Badge className="bg-green-100 text-green-800" variant="secondary">
                        <Star className="h-3 w-3 mr-1" />
                        {(coachingMut.data as any).topStrength}
                      </Badge>
                    </div>
                  )}
                  {(coachingMut.data as any).topWeakness && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">最大不足:</span>
                      <Badge className="bg-red-100 text-red-800" variant="secondary">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {(coachingMut.data as any).topWeakness}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Personalized plan table */}
              {((coachingMut.data as any).personalizedPlan || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">个性化提升计划</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>领域</TableHead>
                        <TableHead className="text-center">当前分</TableHead>
                        <TableHead className="text-center">目标分</TableHead>
                        <TableHead>行动方案</TableHead>
                        <TableHead className="text-center">时间线</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((coachingMut.data as any).personalizedPlan as any[]).map((p: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.area ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{p.currentScore ?? "—"}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-green-600">{p.targetScore ?? "—"}</span>
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            {(() => {
                              const actions = Array.isArray(p.actions) ? p.actions : [];
                              if (actions.length > 0) {
                                return (
                                  <ul className="space-y-1 text-sm text-muted-foreground">
                                    {actions.map((a: string, j: number) => (
                                      <li key={j}>• {a}</li>
                                    ))}
                                  </ul>
                                );
                              }
                              return <span className="text-muted-foreground">{typeof p.actions === "string" ? p.actions : "—"}</span>;
                            })()}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {p.timeline ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Quick wins */}
              {((coachingMut.data as any).quickWins || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">快速提升建议</h4>
                  <ul className="space-y-1 text-sm">
                    {((coachingMut.data as any).quickWins as string[]).map((w: string, i: number) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-1">
                        <Zap className="h-3 w-3 mt-1 text-amber-500 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI narrative */}
              {(coachingMut.data as any).aiNarrative && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-1">AI分析</h4>
                  <p className="text-sm text-muted-foreground">{(coachingMut.data as any).aiNarrative}</p>
                </div>
              )}
            </div>
          )}
          {coachingMut.isError && (
            <p className="text-sm text-red-500">错误: {coachingMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            引导效能趋势
          </CardTitle>
          <CardDescription>跟踪引导者效能与发言平衡度的变化趋势</CardDescription>
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
                  dataKey="avgEffectivenessScore"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="平均效能分"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgSpeakerBalance"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="发言平衡度"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">暂无趋势数据</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Manual Update */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            手动更新分析
          </CardTitle>
          <CardDescription>手动更新引导者分析记录的属性和评分</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="分析记录ID"
              type="number"
              value={updateId}
              onChange={(e) => setUpdateId(e.target.value)}
            />
            <Input
              placeholder="引导者名称"
              value={updateName}
              onChange={(e) => setUpdateName(e.target.value)}
            />
            <Select value={updateStyle} onValueChange={setUpdateStyle}>
              <SelectTrigger>
                <SelectValue placeholder="选择引导风格..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="directive">指令型</SelectItem>
                <SelectItem value="collaborative">协作型</SelectItem>
                <SelectItem value="laissez_faire">放任型</SelectItem>
                <SelectItem value="structured">结构型</SelectItem>
                <SelectItem value="coaching">教练型</SelectItem>
                <SelectItem value="democratic">民主型</SelectItem>
                <SelectItem value="unknown">未知</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">参与引导分 (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="参与引导分"
                value={updateEng}
                onChange={(e) => setUpdateEng(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">决策推动分 (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="决策推动分"
                value={updateDec}
                onChange={(e) => setUpdateDec(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">时间管理分 (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="时间管理分"
                value={updateTime}
                onChange={(e) => setUpdateTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">包容性分 (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="包容性分"
                value={updateInc}
                onChange={(e) => setUpdateInc(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">清晰度分 (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="清晰度分"
                value={updateCla}
                onChange={(e) => setUpdateCla(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">冲突解决分 (0-100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="冲突解决分"
                value={updateCon}
                onChange={(e) => setUpdateCon(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() =>
              updateMut.mutate({
                id: Number(updateId),
                facilitatorName: updateName || undefined,
                facilitationStyle: updateStyle || undefined,
                engagementImpactScore: updateEng ? Number(updateEng) : undefined,
                decisionFacilitationScore: updateDec ? Number(updateDec) : undefined,
                timeManagementScore: updateTime ? Number(updateTime) : undefined,
                inclusivityScore: updateInc ? Number(updateInc) : undefined,
                clarityScore: updateCla ? Number(updateCla) : undefined,
                conflictResolutionScore: updateCon ? Number(updateCon) : undefined,
              })
            }
            disabled={updateMut.isPending || !updateId}
          >
            {updateMut.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Target className="h-4 w-4 mr-2" />
            )}
            更新分析
          </Button>
          {updateMut.data && (
            <p className="text-sm text-green-600">分析记录已更新</p>
          )}
          {updateMut.isError && (
            <p className="text-sm text-red-500">错误: {updateMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 10: Organization Facilitator Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            组织引导者智能
          </CardTitle>
          <CardDescription>生成组织级、部门级或个人级的引导者效能快照</CardDescription>
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
          {snapshotMut.data && (() => {
            const snap = (snapshotMut.data as any)?.snapshot ?? snapshotMut.data;
            return (
              <div className="space-y-4">
                {/* Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Target className="h-5 w-5 mx-auto text-indigo-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgEffectivenessScore ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">平均效能分</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <BarChart3 className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                      <div className="text-xl font-bold">{snap.totalMeetingsAnalyzed ?? 0}</div>
                      <div className="text-xs text-muted-foreground">已分析会议</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Users className="h-5 w-5 mx-auto text-green-500 mb-1" />
                      <div className="text-xl font-bold">{snap.totalFacilitators ?? 0}</div>
                      <div className="text-xs text-muted-foreground">引导者总数</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Award className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                      <div className="text-xl font-bold">
                        {snap.overallGrade ? (
                          <Badge className={GRADE_COLORS[snap.overallGrade] || ""}>{snap.overallGrade}</Badge>
                        ) : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">整体等级</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Grade distribution */}
                {(() => {
                  try {
                    const gradeDist = typeof snap.gradeDistribution === "string"
                      ? JSON.parse(snap.gradeDistribution)
                      : snap.gradeDistribution;
                    if (gradeDist && typeof gradeDist === "object") {
                      const entries = Array.isArray(gradeDist)
                        ? gradeDist
                        : Object.entries(gradeDist).map(([grade, count]) => ({ grade, count }));
                      if (entries.length > 0) {
                        return (
                          <div>
                            <h4 className="text-sm font-medium mb-2">等级分布</h4>
                            <div className="flex gap-2 flex-wrap">
                              {entries.map((item: any, i: number) => {
                                const grade = item.grade || item.name || "";
                                const count = item.count || item.value || 0;
                                return (
                                  <div key={i} className="flex items-center gap-1">
                                    <Badge className={GRADE_COLORS[grade] || ""}>{grade}</Badge>
                                    <div className="bg-gray-200 rounded h-4 w-20 relative">
                                      <div
                                        className="bg-indigo-500 h-4 rounded"
                                        style={{ width: `${Math.min(count * 10, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{count}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })()}

                {/* Top facilitators */}
                {(() => {
                  try {
                    const topList = typeof snap.topFacilitators === "string"
                      ? JSON.parse(snap.topFacilitators)
                      : snap.topFacilitators;
                    if (Array.isArray(topList) && topList.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">优秀引导者</h4>
                          <ul className="space-y-1 text-sm">
                            {topList.map((f: any, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <Star className="h-3 w-3 text-green-500" />
                                <span className="font-medium">{typeof f === "string" ? f : f.name ?? f.facilitatorName ?? "—"}</span>
                                {typeof f !== "string" && f.score != null && (
                                  <span className="text-muted-foreground">({f.score}分)</span>
                                )}
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

                {/* Bottom facilitators */}
                {(() => {
                  try {
                    const bottomList = typeof snap.bottomFacilitators === "string"
                      ? JSON.parse(snap.bottomFacilitators)
                      : snap.bottomFacilitators;
                    if (Array.isArray(bottomList) && bottomList.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">待提升引导者</h4>
                          <ul className="space-y-1 text-sm">
                            {bottomList.map((f: any, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <TrendingDown className="h-3 w-3 text-red-500" />
                                <span className="font-medium">{typeof f === "string" ? f : f.name ?? f.facilitatorName ?? "—"}</span>
                                {typeof f !== "string" && f.score != null && (
                                  <span className="text-muted-foreground">({f.score}分)</span>
                                )}
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

                {/* Style distribution */}
                {(() => {
                  try {
                    const styleDist = typeof snap.styleDistribution === "string"
                      ? JSON.parse(snap.styleDistribution)
                      : snap.styleDistribution;
                    if (Array.isArray(styleDist) && styleDist.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-2">风格分布</h4>
                          <div className="flex gap-3 flex-wrap">
                            {styleDist.map((s: any, i: number) => (
                              <div key={i} className="flex items-center gap-1">
                                <Badge variant="secondary">
                                  {STYLE_LABELS[s.style] || s.style || s.name || "—"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {s.count ?? s.value ?? 0}次
                                  {s.percent != null && ` (${s.percent}%)`}
                                </span>
                              </div>
                            ))}
                          </div>
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

                {/* Best practices */}
                {(() => {
                  try {
                    const practices = typeof snap.bestPractices === "string"
                      ? JSON.parse(snap.bestPractices)
                      : snap.bestPractices;
                    if (Array.isArray(practices) && practices.length > 0) {
                      return (
                        <div>
                          <h4 className="text-sm font-medium mb-1">最佳实践</h4>
                          <ul className="space-y-1 text-sm">
                            {practices.map((p: string, i: number) => (
                              <li key={i} className="text-muted-foreground flex items-start gap-1">
                                <CheckCircle2 className="h-3 w-3 mt-1 text-green-500 shrink-0" />
                                {typeof p === "string" ? p : (p as any).text ?? (p as any).practice ?? ""}
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
                              <li key={i} className="text-muted-foreground">• {typeof r === "string" ? r : (r as any).text ?? ""}</li>
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
          {snapshotMut.isError && (
            <p className="text-sm text-red-500">错误: {snapshotMut.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
