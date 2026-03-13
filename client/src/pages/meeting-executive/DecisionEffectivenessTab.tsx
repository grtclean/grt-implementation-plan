import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
const STATUS_LABEL_KEYS: Record<string, string> = {
  pending: "meeting.decision.statusPending",
  in_progress: "meeting.decision.statusInProgress",
  implemented: "meeting.decision.statusImplemented",
  abandoned: "meeting.decision.statusAbandoned",
  reversed: "meeting.decision.statusReversed",
};
const IMPACT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-800", neutral: "bg-gray-100 text-gray-800", negative: "bg-red-100 text-red-800",
};
const IMPACT_LABEL_KEYS: Record<string, string> = {
  positive: "meeting.decision.impactPositive",
  neutral: "meeting.decision.impactNeutral",
  negative: "meeting.decision.impactNegative",
};
const TREND_COLORS: Record<string, string> = {
  improving: "bg-green-100 text-green-800", stable: "bg-gray-100 text-gray-800", declining: "bg-red-100 text-red-800",
};
const TREND_LABEL_KEYS: Record<string, string> = {
  improving: "meeting.decision.trendImproving",
  stable: "meeting.decision.trendStable",
  declining: "meeting.decision.trendDeclining",
};

export function DecisionEffectivenessTab() {
  const { t } = useLanguage();

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
  for (const item of trackingList) {
    const s = item.follow_through_status || "pending";
    statusDistMap[s] = (statusDistMap[s] || 0) + 1;
  }
  const statusPieData = Object.entries(statusDistMap).map(([name, value]) => ({
    name: t(STATUS_LABEL_KEYS[name] || "meeting.decision.statusPending"),
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Section 1: Analyze Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t("meeting.decision.analyzeTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.decision.analyzeDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single analysis */}
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.decision.inputMeetingId")}
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
              {t("meeting.decision.analyzeBtn")}
            </Button>
          </div>
          {analyzeMut.data && (
            <p className="text-sm text-green-600">
              {t("meeting.decision.analyzeSuccess")}: {(analyzeMut.data as any).decisionsAnalyzed ?? 0} {t("meeting.decision.decisionsUnit")}
            </p>
          )}
          {analyzeMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.decision.error")}: {analyzeMut.error.message}</p>
          )}

          {/* Batch analysis */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">{t("meeting.decision.batchAnalysis")}</p>
            <div className="flex gap-3">
              <Input
                placeholder={t("meeting.decision.batchPlaceholder")}
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
                {t("meeting.decision.batchBtn")}
              </Button>
            </div>
            {batchAnalyzeMut.data && (
              <p className="text-sm text-green-600 mt-2">
                {t("meeting.decision.batchCompleted")} {(batchAnalyzeMut.data as any[]).filter((r: any) => r.success).length} {t("meeting.decision.batchSuccessUnit")}, {t("meeting.decision.batchFailed")} {(batchAnalyzeMut.data as any[]).filter((r: any) => !r.success).length} {t("meeting.decision.batchSuccessUnit")}
              </p>
            )}
            {batchAnalyzeMut.isError && (
              <p className="text-sm text-red-500">{t("meeting.decision.error")}: {batchAnalyzeMut.error.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label={t("meeting.decision.totalDecisions")}
          value={dashboard?.totalDecisions ?? "..."}
        />
        <StatCard
          icon={CheckCircle2}
          label={t("meeting.decision.followThroughRate")}
          value={dashboard?.followThroughRate ? `${dashboard.followThroughRate}%` : "..."}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Clock}
          label={t("meeting.decision.avgVelocityDays")}
          value={dashboard?.avgVelocityDays ?? "..."}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("meeting.decision.reversedCount")}
          value={dashboard?.reversedCount ?? "..."}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Section 3: Decision Tracking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.decision.trackingTitle")}</CardTitle>
          <CardDescription>{t("meeting.decision.trackingDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {trackingList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("meeting.decision.thMeeting")}</TableHead>
                  <TableHead>{t("meeting.decision.thDecisionContent")}</TableHead>
                  <TableHead>{t("meeting.decision.thDecisionMaker")}</TableHead>
                  <TableHead className="text-center">{t("meeting.decision.thStatus")}</TableHead>
                  <TableHead className="text-center">{t("meeting.decision.thVelocityDays")}</TableHead>
                  <TableHead className="text-center">{t("meeting.decision.thImpact")}</TableHead>
                  <TableHead className="text-center">{t("meeting.decision.thQualityScore")}</TableHead>
                  <TableHead className="text-center">{t("meeting.decision.thGrade")}</TableHead>
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
                          {t(STATUS_LABEL_KEYS[row.follow_through_status] || "meeting.decision.statusPending")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{row.total_velocity_days ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {row.impact_category ? (
                          <Badge className={IMPACT_COLORS[row.impact_category] || ""} variant="secondary">
                            {t(IMPACT_LABEL_KEYS[row.impact_category] || "meeting.decision.impactNeutral")}
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
                                <span className="font-medium">{t("meeting.decision.fullDecisionContent")}: </span>
                                <span className="text-muted-foreground">{row.decision_text || "—"}</span>
                              </div>
                              <div>
                                <span className="font-medium">{t("meeting.decision.stakeholders")}: </span>
                                {(() => {
                                  try {
                                    return JSON.parse(row.stakeholders || "[]").join(", ") || "—";
                                  } catch {
                                    return row.stakeholders || "—";
                                  }
                                })()}
                              </div>
                              <div>
                                <span className="font-medium">{t("meeting.decision.decisionDate")}: </span>
                                {row.decision_date ? new Date(row.decision_date).toLocaleDateString("zh-CN") : "—"}
                              </div>
                              <div>
                                <span className="font-medium">{t("meeting.decision.implStartDate")}: </span>
                                {row.implementation_start_date ? new Date(row.implementation_start_date).toLocaleDateString("zh-CN") : "—"}
                              </div>
                              <div>
                                <span className="font-medium">{t("meeting.decision.implEndDate")}: </span>
                                {row.implementation_end_date ? new Date(row.implementation_end_date).toLocaleDateString("zh-CN") : "—"}
                              </div>
                              <div>
                                <span className="font-medium">{t("meeting.decision.businessOutcome")}: </span>
                                <span className="text-muted-foreground">{row.business_outcome || "—"}</span>
                              </div>
                              <div>
                                <span className="font-medium">{t("meeting.decision.impactScore")}: </span>{row.impact_score ?? "—"}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {row.ai_narrative && (
                                <>
                                  <div className="font-medium">{t("meeting.decision.aiAnalysis")}:</div>
                                  <p className="text-muted-foreground">{row.ai_narrative}</p>
                                </>
                              )}
                              {(() => {
                                try {
                                  const recs = JSON.parse(row.ai_recommendations || "[]");
                                  if (recs.length > 0) {
                                    return (
                                      <div>
                                        <div className="font-medium">{t("meeting.decision.recommendations")}:</div>
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
                                    {t("meeting.decision.reversalDetails")}
                                  </div>
                                  <div className="text-muted-foreground mt-1">
                                    <div>{t("meeting.decision.reversalReason")}: {row.reversal_reason || "—"}</div>
                                    <div>{t("meeting.decision.reversalMeeting")}: {row.reversal_meeting_id || "—"}</div>
                                    <div>{t("meeting.decision.reversalDate")}: {row.reversal_date ? new Date(row.reversal_date).toLocaleDateString("zh-CN") : "—"}</div>
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
              <p>{t("meeting.decision.noTrackingData")}</p>
              <p className="text-sm">{t("meeting.decision.noTrackingDataHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Velocity Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.decision.velocityTrendTitle")}</CardTitle>
          <CardDescription>{t("meeting.decision.velocityTrendDesc")}</CardDescription>
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
                  name={t("meeting.decision.chartAvgVelocity")}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="follow_through_rate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name={t("meeting.decision.chartFollowThroughRate")}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.decision.noVelocityTrendData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Follow-through Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status distribution pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.decision.statusDistribution")}</CardTitle>
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
              <p className="text-center py-8 text-muted-foreground">{t("meeting.decision.noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Velocity by department bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.decision.deptVelocityTitle")}</CardTitle>
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
                  <Bar dataKey="avgVelocity" name={t("meeting.decision.chartAvgVelocity")} fill="#6366f1" />
                  <Bar dataKey="count" name={t("meeting.decision.chartDecisionCount")} fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">{t("meeting.decision.noDeptVelocityData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 6: Reversal Detection & Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {t("meeting.decision.reversalDetectionTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.decision.reversalDetectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              type="date"
              value={reversalDateFrom}
              onChange={(e) => setReversalDateFrom(e.target.value)}
              className="w-44"
              placeholder={t("meeting.decision.startDate")}
            />
            <Input
              type="date"
              value={reversalDateTo}
              onChange={(e) => setReversalDateTo(e.target.value)}
              className="w-44"
              placeholder={t("meeting.decision.endDate")}
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
              {t("meeting.decision.detectReversalsBtn")}
            </Button>
          </div>
          {detectReversalsMut.data && (
            <div className="space-y-3">
              <p className="text-sm text-green-600">
                {t("meeting.decision.detectionComplete")}: {(detectReversalsMut.data as any).reversalsDetected ?? 0} {t("meeting.decision.reversalsUnit")}
              </p>
              {((detectReversalsMut.data as any).reversals || []).length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("meeting.decision.thOriginalDecision")}</TableHead>
                      <TableHead>{t("meeting.decision.thOriginalMeeting")}</TableHead>
                      <TableHead>{t("meeting.decision.thReversalMeeting")}</TableHead>
                      <TableHead>{t("meeting.decision.thReversalDate")}</TableHead>
                      <TableHead>{t("meeting.decision.thReason")}</TableHead>
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
            <p className="text-sm text-red-500">{t("meeting.decision.error")}: {detectReversalsMut.error.message}</p>
          )}

          {/* Reversal analysis aggregate */}
          {(reversalAnalysis?.totalReversals !== undefined || reversalAnalysis?.byDepartment?.length > 0) && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">{t("meeting.decision.reversalSummary")}</h4>
              <div className="flex gap-4 text-sm">
                <span>{t("meeting.decision.totalReversals")}: <strong>{reversalAnalysis.totalReversals ?? 0}</strong></span>
              </div>
              {(reversalAnalysis.byDepartment || []).length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-1">{t("meeting.decision.byDepartment")}</h5>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("meeting.decision.thDepartment")}</TableHead>
                        <TableHead className="text-center">{t("meeting.decision.thReversalCount")}</TableHead>
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
                  <h5 className="text-sm font-medium mb-1">{t("meeting.decision.topReversalReasons")}</h5>
                  <ul className="space-y-1 text-sm">
                    {(reversalAnalysis.topReasons as any[]).map((r: any, i: number) => (
                      <li key={i} className="text-muted-foreground">
                        • {r.reason || r} {r.count ? `(${r.count}${t("meeting.decision.timesUnit")})` : ""}
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
            {t("meeting.decision.aiQualityTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.decision.aiQualityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.decision.inputDecisionId")}
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
              {t("meeting.decision.assessQualityBtn")}
            </Button>
          </div>
          {assessQualityMut.data && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-muted-foreground mb-1">{t("meeting.decision.qualityScore")}</div>
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
                  <div className="text-muted-foreground mb-1">{t("meeting.decision.clarityScore")}</div>
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
                  <div className="text-muted-foreground mb-1">{t("meeting.decision.alignmentScore")}</div>
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
                  <span className="font-medium">{t("meeting.decision.riskFactors")}:</span>
                  <ul className="mt-1 space-y-1">
                    {((assessQualityMut.data as any).riskFactors as string[]).map((f: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {((assessQualityMut.data as any).recommendations || []).length > 0 && (
                <div>
                  <span className="font-medium">{t("meeting.decision.improveSuggestions")}:</span>
                  <ul className="mt-1 space-y-1">
                    {((assessQualityMut.data as any).recommendations as string[]).map((r: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(assessQualityMut.data as any).narrative && (
                <div>
                  <span className="font-medium">{t("meeting.decision.aiNarrative")}: </span>
                  <span className="text-muted-foreground">{(assessQualityMut.data as any).narrative}</span>
                </div>
              )}
            </div>
          )}
          {assessQualityMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.decision.error")}: {assessQualityMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Update Follow-Through */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {t("meeting.decision.updateTrackingTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.decision.updateTrackingDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder={t("meeting.decision.trackingIdPlaceholder")}
              type="number"
              value={updateId}
              onChange={(e) => setUpdateId(e.target.value)}
            />
            <Select value={updateStatus} onValueChange={setUpdateStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("meeting.decision.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t("meeting.decision.statusPending")}</SelectItem>
                <SelectItem value="in_progress">{t("meeting.decision.statusInProgress")}</SelectItem>
                <SelectItem value="implemented">{t("meeting.decision.statusImplemented")}</SelectItem>
                <SelectItem value="abandoned">{t("meeting.decision.statusAbandoned")}</SelectItem>
                <SelectItem value="reversed">{t("meeting.decision.statusReversed")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={t("meeting.decision.impactScorePlaceholder")}
              type="number"
              min={-100}
              max={100}
              value={updateImpactScore}
              onChange={(e) => setUpdateImpactScore(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.decision.implStartDateLabel")}</label>
              <Input
                type="date"
                value={updateStartDate}
                onChange={(e) => setUpdateStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.decision.implEndDateLabel")}</label>
              <Input
                type="date"
                value={updateEndDate}
                onChange={(e) => setUpdateEndDate(e.target.value)}
              />
            </div>
          </div>
          <Input
            placeholder={t("meeting.decision.outcomeDescPlaceholder")}
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
            {t("meeting.decision.updateTrackingBtn")}
          </Button>
          {updateFollowThroughMut.data && (
            <p className="text-sm text-green-600">{t("meeting.decision.trackingUpdated")}</p>
          )}
          {updateFollowThroughMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.decision.error")}: {updateFollowThroughMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Organization Decision Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            {t("meeting.decision.orgIntelTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.decision.orgIntelDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={snapshotScope} onValueChange={setSnapshotScope}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("meeting.decision.selectScope")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">{t("meeting.decision.scopeOrg")}</SelectItem>
                <SelectItem value="department">{t("meeting.decision.scopeDept")}</SelectItem>
                <SelectItem value="team">{t("meeting.decision.scopeTeam")}</SelectItem>
                <SelectItem value="individual">{t("meeting.decision.scopeIndividual")}</SelectItem>
              </SelectContent>
            </Select>
            {snapshotScope !== "org" && (
              <Input
                placeholder={`${t("meeting.decision.inputScopeId")}${snapshotScope === "department" ? t("meeting.decision.scopeDept") : snapshotScope === "team" ? t("meeting.decision.scopeTeam") : t("meeting.decision.scopeIndividual")}ID...`}
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
              {t("meeting.decision.generateSnapshot")}
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
                    <div className="text-xs text-muted-foreground">{t("meeting.decision.totalDecisions")}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).implementedCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">{t("meeting.decision.statusImplemented")}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).avgVelocityDays ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{t("meeting.decision.avgVelocityDays")}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).followThroughRate ?? "—"}%</div>
                    <div className="text-xs text-muted-foreground">{t("meeting.decision.followThroughRate")}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <AlertTriangle className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).reversedCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">{t("meeting.decision.reversedCount")}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <BarChart3 className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                    <div className="text-xl font-bold">{(snapshotMut.data as any).avgQualityScore ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{t("meeting.decision.avgQualityScore")}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Trend badge */}
              {(snapshotMut.data as any).trendVsPrevious && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("meeting.decision.overallTrend")}:</span>
                  <Badge className={TREND_COLORS[(snapshotMut.data as any).trendVsPrevious] || ""} variant="secondary">
                    {(() => {
                      const trend = (snapshotMut.data as any).trendVsPrevious;
                      const Icon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
                      return (
                        <>
                          <Icon className="h-3 w-3 mr-1" />
                          {t(TREND_LABEL_KEYS[trend] || "meeting.decision.trendStable")}
                        </>
                      );
                    })()}
                  </Badge>
                </div>
              )}

              {/* Bottlenecks */}
              {((snapshotMut.data as any).topBottlenecks || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("meeting.decision.bottleneckAnalysis")}</h4>
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
                  <h4 className="text-sm font-medium mb-1">{t("meeting.decision.reversalReasons")}</h4>
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
                  <h4 className="text-sm font-medium mb-1">{t("meeting.decision.aiAnalysis")}</h4>
                  <p className="text-sm text-muted-foreground">{(snapshotMut.data as any).aiNarrative}</p>
                </div>
              )}

              {/* Recommendations */}
              {((snapshotMut.data as any).recommendations || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("meeting.decision.optimizeSuggestions")}</h4>
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
            <p className="text-sm text-red-500">{t("meeting.decision.error")}: {snapshotMut.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
