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
import { useLanguage } from "@/contexts/LanguageContext";
import type { ComponentType } from "react";

// ==================== Data Types ====================

interface RecurringSeries {
  id: number;
  series_title: string;
  frequency: string;
  occurrence_count: number;
  avg_participant_count: number;
  avg_effectiveness_score: number;
  effectiveness_trend: string;
  value_score: number;
  value_grade: string;
  recommendation: string;
  status: string;
  core_participants: string;
  total_cumulative_minutes: number;
  total_cumulative_cost: number;
  meeting_ids: string;
  trend_slope: number;
  avg_roi_grade: string | null;
  recommendation_rationale: string | null;
  ai_narrative: string | null;
  meeting_count?: number;
}

interface DashboardData {
  totalSeries: number;
  avgValueScore: number;
  decliningCount: number;
  totalWeeklyMinutesSaved: number;
}

interface SummaryData {
  frequencyDistribution: { frequency: string; count: number }[];
  gradeDistribution: { value_grade: string; count: number }[];
  potentialSavings?: {
    dfSeriesCount: number;
    totalMinutes: number;
    totalCost: number;
    estimatedWeeklySavings: number;
  };
  worstSeries?: RecurringSeries[];
}

interface ComparisonEntry {
  series_title: string;
  value_score: number;
  value_grade: string;
}

interface ValueTrendData {
  meetings: { meeting_date: string; effectiveness_score: number; participant_count: number }[];
}

interface OptimizationResult {
  recommendation: string;
  rationale: string;
  estimated_weekly_savings_minutes: number;
  specific_actions: string[];
  narrative?: string;
}

interface BatchOptimizationResult {
  optimized: number;
  errors: number;
}

interface DetectResult {
  detected: number;
}

interface RecordActionResult {
  actionTaken: string;
  minutesSaved: number;
}

interface OutcomeEntry {
  id: number;
  series_title: string;
  action_taken: string;
  pre_action_weekly_minutes: number;
  post_action_weekly_minutes: number;
  minutes_saved_per_week: number;
  cost_saved_per_week: number;
  productivity_impact: string;
}

interface PieEntry {
  name: string;
  value: number;
}

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
const TREND_ICONS: Record<string, ComponentType<{ className?: string }>> = {
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
const REC_LABEL_KEYS: Record<string, string> = {
  continue: "meeting.recurring.recContinue",
  shorten: "meeting.recurring.recShorten",
  reduce_frequency: "meeting.recurring.recReduceFreq",
  merge: "meeting.recurring.recMerge",
  cancel: "meeting.recurring.recCancel",
};
const FREQ_LABEL_KEYS: Record<string, string> = {
  daily: "meeting.recurring.freqDaily",
  weekly: "meeting.recurring.freqWeekly",
  biweekly: "meeting.recurring.freqBiweekly",
  monthly: "meeting.recurring.freqMonthly",
  irregular: "meeting.recurring.freqIrregular",
};
const ACTION_LABEL_KEYS: Record<string, string> = {
  cancelled: "meeting.recurring.actionCancelled",
  reduced_frequency: "meeting.recurring.actionReducedFreq",
  shortened: "meeting.recurring.actionShortened",
  merged: "meeting.recurring.actionMerged",
  no_change: "meeting.recurring.actionNoChange",
};

export function RecurringMeetingValueTab() {
  const { t } = useLanguage();

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

  const dashboard = dashboardQuery.data as DashboardData | undefined;
  const seriesList = (seriesListQuery.data || []) as unknown as RecurringSeries[];
  const outcomes = (outcomesQuery.data || []) as unknown as OutcomeEntry[];
  const summary = summaryQuery.data as unknown as SummaryData | undefined;
  const comparison = (comparisonQuery.data || []) as unknown as ComparisonEntry[];
  const valueTrend = valueTrendQuery.data as ValueTrendData | undefined;

  // Outcome action distribution for pie chart
  const actionDistMap: Record<string, number> = {};
  for (const o of outcomes) {
    const a = o.action_taken || "no_change";
    actionDistMap[a] = (actionDistMap[a] || 0) + 1;
  }
  const actionPieData = Object.entries(actionDistMap).map(([name, value]) => ({ name: t(ACTION_LABEL_KEYS[name] || "meeting.recurring.actionNoChange"), value }));

  // Summary pie data
  const freqDist: PieEntry[] = (summary?.frequencyDistribution || []).map((r) => ({
    name: t(FREQ_LABEL_KEYS[r.frequency] || "meeting.recurring.freqIrregular"),
    value: Number(r.count),
  }));
  const gradeDist: PieEntry[] = (summary?.gradeDistribution || []).map((r) => ({
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
            {t("meeting.recurring.detectTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.recurring.detectDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-44"
              placeholder={t("meeting.recurring.startDate")}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-44"
              placeholder={t("meeting.recurring.endDate")}
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
              {t("meeting.recurring.detectBtn")}
            </Button>
          </div>
          {detectMut.data && (
            <p className="text-sm text-green-600">
              {t("meeting.recurring.detectDone")} {(detectMut.data as DetectResult).detected} {t("meeting.recurring.seriesUnit")}
            </p>
          )}
          {detectMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.recurring.detectFailed")}: {detectMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label={t("meeting.recurring.totalSeries")}
          value={dashboard?.totalSeries ?? "..."}
          subtitle="Recurring Series"
        />
        <StatCard
          icon={Target}
          label={t("meeting.recurring.avgValueScore")}
          value={dashboard ? `${dashboard.avgValueScore}` : "..."}
          subtitle="Avg Value Score"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={TrendingDown}
          label={t("meeting.recurring.decliningCount")}
          value={dashboard?.decliningCount ?? "..."}
          subtitle="Declining Series"
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={Clock}
          label={t("meeting.recurring.minutesSavedWeek")}
          value={dashboard?.totalWeeklyMinutesSaved ?? "..."}
          subtitle="Minutes Saved/Week"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
      </div>

      {/* Section 3: Recurring Series Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.recurring.seriesList")}</CardTitle>
          <CardDescription>{t("meeting.recurring.seriesListDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {seriesList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("meeting.recurring.thMeetingName")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thFrequency")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thOccurrences")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thParticipants")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thEffectiveness")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thTrend")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thValueScore")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thGrade")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thRecommendation")}</TableHead>
                  <TableHead className="text-center">{t("meeting.recurring.thStatus")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seriesList.map((s) => (
                  <>
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedSeries(expandedSeries === s.id ? null : s.id)}
                    >
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{s.series_title}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{t(FREQ_LABEL_KEYS[s.frequency] || "meeting.recurring.freqIrregular")}</Badge>
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
                          {t(REC_LABEL_KEYS[s.recommendation] || "meeting.recurring.recContinue")}
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
                              <div><span className="font-medium">{t("meeting.recurring.coreParticipants")}: </span>{(() => { try { return JSON.parse(s.core_participants || "[]").join(", ") || "\u2014"; } catch { return "\u2014"; } })()}</div>
                              <div><span className="font-medium">{t("meeting.recurring.cumulativeDuration")}: </span>{s.total_cumulative_minutes} {t("meeting.recurring.minutesUnit")}</div>
                              <div><span className="font-medium">{t("meeting.recurring.cumulativeCost")}: </span>{s.total_cumulative_cost}</div>
                              <div><span className="font-medium">{t("meeting.recurring.meetingCount")}: </span>{(() => { try { return JSON.parse(s.meeting_ids || "[]").length; } catch { return 0; } })()}</div>
                              <div><span className="font-medium">{t("meeting.recurring.trendSlope")}: </span>{s.trend_slope}</div>
                              <div><span className="font-medium">{t("meeting.recurring.roiGrade")}: </span>{s.avg_roi_grade || "\u2014"}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="font-medium">{t("meeting.recurring.recommendationRationale")}:</div>
                              <p className="text-muted-foreground">{s.recommendation_rationale || "\u2014"}</p>
                              {s.ai_narrative && (
                                <>
                                  <div className="font-medium">{t("meeting.recurring.aiAnalysis")}:</div>
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
              <p>{t("meeting.recurring.noSeriesData")}</p>
              <p className="text-sm">{t("meeting.recurring.pleaseDetect")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Series Value Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.recurring.valueTrend")}</CardTitle>
          <CardDescription>{t("meeting.recurring.valueTrendDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder={t("meeting.recurring.selectSeries")} />
              </SelectTrigger>
              <SelectContent>
                {seriesList.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    [{s.value_grade}] {s.series_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(valueTrend?.meetings?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={valueTrend!.meetings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="meeting_date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v?.split("T")[0] || v}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip labelFormatter={(v: string) => v?.split("T")[0] || v} />
                <Legend />
                <Line type="monotone" dataKey="effectiveness_score" stroke="#6366f1" strokeWidth={2} name={t("meeting.recurring.effectivenessScore")} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="participant_count" stroke="#22c55e" strokeWidth={1} name={t("meeting.recurring.participantCount")} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : selectedSeriesId ? (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.recurring.noMeetingData")}</p>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.recurring.pleaseSelectSeries")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Series Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.recurring.seriesComparison")}</CardTitle>
          <CardDescription>{t("meeting.recurring.seriesComparisonDesc")}</CardDescription>
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
                <Bar dataKey="value_score" name={t("meeting.recurring.valueScoreLabel")}>
                  {comparison.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={GRADE_BAR_COLORS[entry.value_grade] || COLORS[idx % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.recurring.noComparisonData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 6: AI Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t("meeting.recurring.aiOptimization")}
          </CardTitle>
          <CardDescription>{t("meeting.recurring.aiOptimizationDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single optimization */}
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.recurring.enterSeriesId")}
              value={optimizeSeriesId}
              onChange={(e) => setOptimizeSeriesId(e.target.value)}
              className="w-40"
            />
            <Button
              onClick={() => optimizeMut.mutate({ seriesId: Number(optimizeSeriesId) })}
              disabled={optimizeMut.isPending || !optimizeSeriesId}
            >
              {optimizeMut.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              {t("meeting.recurring.generateOptimization")}
            </Button>
          </div>
          {optimizeMut.data && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              {(() => {
                const optData = optimizeMut.data as OptimizationResult;
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t("meeting.recurring.recommendation")}:</span>
                      <Badge className={REC_COLORS[optData.recommendation] || ""}>
                        {t(REC_LABEL_KEYS[optData.recommendation] || "meeting.recurring.recContinue")}
                      </Badge>
                    </div>
                    <div><span className="font-medium">{t("meeting.recurring.rationale")}: </span>{optData.rationale}</div>
                    <div><span className="font-medium">{t("meeting.recurring.estimatedWeeklySavings")}: </span>{optData.estimated_weekly_savings_minutes} {t("meeting.recurring.minutesUnit")}</div>
                    {optData.specific_actions?.length > 0 && (
                      <div>
                        <span className="font-medium">{t("meeting.recurring.specificActions")}:</span>
                        <ul className="mt-1 space-y-1">
                          {optData.specific_actions.map((a: string, i: number) => (
                            <li key={i} className="text-muted-foreground">{"\u2022"} {a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {optData.narrative && (
                      <div><span className="font-medium">{t("meeting.recurring.aiNarrative")}: </span><span className="text-muted-foreground">{optData.narrative}</span></div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {optimizeMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.recurring.optimizeFailed")}: {optimizeMut.error.message}</p>
          )}

          {/* Batch optimization */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">{t("meeting.recurring.batchOptimize")}</p>
            <div className="flex gap-3">
              <Input
                placeholder={t("meeting.recurring.batchIdsPlaceholder")}
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
                {t("meeting.recurring.batchOptimizeBtn")}
              </Button>
            </div>
            {batchOptimizeMut.data && (
              <p className="text-sm text-green-600 mt-2">
                {t("meeting.recurring.batchDone")} {(batchOptimizeMut.data as BatchOptimizationResult).optimized} {t("meeting.recurring.batchDoneUnit")}, {t("meeting.recurring.batchFailed")} {(batchOptimizeMut.data as BatchOptimizationResult).errors} {t("meeting.recurring.batchFailedUnit")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Record Optimization Action */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.recurring.recordAction")}</CardTitle>
          <CardDescription>{t("meeting.recurring.recordActionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder={t("meeting.recurring.seriesIdLabel")}
              value={actionSeriesId}
              onChange={(e) => setActionSeriesId(e.target.value)}
              className="w-32"
            />
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cancelled">{t("meeting.recurring.actionCancelled")}</SelectItem>
                <SelectItem value="reduced_frequency">{t("meeting.recurring.actionReducedFreq")}</SelectItem>
                <SelectItem value="shortened">{t("meeting.recurring.actionShortened")}</SelectItem>
                <SelectItem value="merged">{t("meeting.recurring.actionMerged")}</SelectItem>
                <SelectItem value="no_change">{t("meeting.recurring.actionNoChange")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => recordActionMut.mutate({ seriesId: Number(actionSeriesId), actionTaken: actionType })}
              disabled={recordActionMut.isPending || !actionSeriesId}
            >
              {recordActionMut.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
              {t("meeting.recurring.recordBtn")}
            </Button>
          </div>
          {recordActionMut.data && (
            <p className="text-sm text-green-600">
              {t("meeting.recurring.actionRecorded")}: {t(ACTION_LABEL_KEYS[(recordActionMut.data as RecordActionResult).actionTaken] || "meeting.recurring.actionNoChange")} — {t("meeting.recurring.weeklySaved")} {(recordActionMut.data as RecordActionResult).minutesSaved} {t("meeting.recurring.minutesUnit")}
            </p>
          )}
          {recordActionMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.recurring.recordFailed")}: {recordActionMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Optimization Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.recurring.outcomeTracking")}</CardTitle>
          <CardDescription>{t("meeting.recurring.outcomeTrackingDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionPieData.length > 0 && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <h4 className="text-sm font-medium mb-2">{t("meeting.recurring.actionTypeDistribution")}</h4>
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
                      {actionPieData.map((_: PieEntry, idx: number) => (
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
                      <TableHead>{t("meeting.recurring.thSeriesName")}</TableHead>
                      <TableHead className="text-center">{t("meeting.recurring.thAction")}</TableHead>
                      <TableHead className="text-center">{t("meeting.recurring.thPreAction")}</TableHead>
                      <TableHead className="text-center">{t("meeting.recurring.thPostAction")}</TableHead>
                      <TableHead className="text-center">{t("meeting.recurring.thSaved")}</TableHead>
                      <TableHead className="text-center">{t("meeting.recurring.thCostSaved")}</TableHead>
                      <TableHead className="text-center">{t("meeting.recurring.thProductivity")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outcomes.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium max-w-[150px] truncate">{o.series_title}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{t(ACTION_LABEL_KEYS[o.action_taken] || "meeting.recurring.actionNoChange")}</Badge>
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
            <p className="text-center py-8 text-muted-foreground">{t("meeting.recurring.noOutcomeData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Org Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.recurring.orgSummary")}</CardTitle>
          <CardDescription>{t("meeting.recurring.orgSummaryDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Grade distribution */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t("meeting.recurring.gradeDistribution")}</h4>
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
                      {gradeDist.map((entry: PieEntry, idx: number) => (
                        <Cell key={idx} fill={GRADE_BAR_COLORS[entry.name] || COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">{t("meeting.recurring.noData")}</p>
              )}
            </div>

            {/* Frequency distribution */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t("meeting.recurring.freqDistribution")}</h4>
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
                      {freqDist.map((_: PieEntry, idx: number) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">{t("meeting.recurring.noData")}</p>
              )}
            </div>
          </div>

          {/* Potential savings highlight */}
          {summary?.potentialSavings && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t("meeting.recurring.potentialSavings")}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">{t("meeting.recurring.dfSeriesCount")}</div>
                  <div className="font-semibold text-lg">{summary.potentialSavings.dfSeriesCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("meeting.recurring.cumulativeTime")}</div>
                  <div className="font-semibold text-lg">{summary.potentialSavings.totalMinutes} {t("meeting.recurring.minutesUnit")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("meeting.recurring.cumulativeCostLabel")}</div>
                  <div className="font-semibold text-lg">{summary.potentialSavings.totalCost}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("meeting.recurring.estimatedWeeklySavingsLabel")}</div>
                  <div className="font-semibold text-lg text-green-600">{summary.potentialSavings.estimatedWeeklySavings} {t("meeting.recurring.minutesUnit")}</div>
                </div>
              </div>
            </div>
          )}

          {/* Worst series table */}
          {(summary?.worstSeries || []).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t("meeting.recurring.worstTop10")}</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.recurring.thMeetingName")}</TableHead>
                    <TableHead className="text-center">{t("meeting.recurring.thFrequency")}</TableHead>
                    <TableHead className="text-center">{t("meeting.recurring.thValueScore")}</TableHead>
                    <TableHead className="text-center">{t("meeting.recurring.thGrade")}</TableHead>
                    <TableHead className="text-center">{t("meeting.recurring.thEffectiveness")}</TableHead>
                    <TableHead className="text-center">{t("meeting.recurring.thCumulativeDuration")}</TableHead>
                    <TableHead className="text-center">{t("meeting.recurring.thRecommendation")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(summary!.worstSeries as RecurringSeries[]).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{s.series_title}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{t(FREQ_LABEL_KEYS[s.frequency] || "meeting.recurring.freqIrregular")}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{s.value_score}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={GRADE_COLORS[s.value_grade] || ""}>{s.value_grade}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{s.avg_effectiveness_score}</TableCell>
                      <TableCell className="text-center">{s.total_cumulative_minutes} {t("meeting.recurring.minUnit")}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={REC_COLORS[s.recommendation] || ""} variant="secondary">
                          {t(REC_LABEL_KEYS[s.recommendation] || "meeting.recurring.recContinue")}
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
