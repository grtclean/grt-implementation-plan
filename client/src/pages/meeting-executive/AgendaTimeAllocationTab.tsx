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
  Minus, Building2, ListChecks, Timer, PieChart as PieChartIcon,
} from "lucide-react";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface AgendaItem {
  agendaItemTitle?: string;
  agenda_item_title?: string;
  agendaItemCategory?: string;
  agenda_item_category?: string;
  plannedDurationMinutes?: number | string;
  planned_duration_minutes?: number | string;
  actualDurationMinutes?: number | string;
  actual_duration_minutes?: number | string;
  speaker?: string;
  speakers?: string;
  decisionsCount?: number;
  decisions_count?: number;
  actionsCount?: number;
  actions_count?: number;
}

interface AnalysisRow {
  meeting_id?: string;
  meetingId?: string;
  meeting_title?: string;
  meetingTitle?: string;
  agenda_items_count?: number;
  agendaItemsCount?: number;
  total_planned_minutes?: number;
  totalPlannedMinutes?: number;
  total_actual_minutes?: number;
  totalActualMinutes?: number;
  overrun_percent?: number;
  overrunPercent?: number;
  time_efficiency_score?: number | string;
  timeEfficiencyScore?: number | string;
  efficiency_grade?: string;
  efficiencyGrade?: string;
}

interface OverrunPattern {
  topic?: string;
  agendaItemTitle?: string;
  occurrences?: number;
  count?: number;
  avgPlannedMinutes?: number;
  avg_planned?: number;
  avgActualMinutes?: number;
  avg_actual?: number;
  avgOverrunPercent?: number;
  avg_overrun_percent?: number;
}

interface CategoryDistribution {
  category: string;
  overrunRate?: number;
  overrun_rate?: number;
  avgActualMinutes?: number;
  avg_actual_minutes?: number;
}

interface TrendRow {
  periodEnd: string;
  avgTimeEfficiencyScore: number;
  avgOverrunPercent: number;
}

interface AnalyzeResult {
  meetingId: string;
  agendaItemsFound?: number;
  totalPlanned?: number;
  totalActual?: number;
  overallEfficiency?: string | number;
}

interface BatchResult {
  results?: Array<{ success: boolean }>;
}

interface OptimizationResult {
  recommendedOrder?: string[];
  recommendations?: Array<{
    topic?: string;
    title?: string;
    suggestedMinutes?: number;
    suggested?: number;
    currentMinutes?: number;
    current?: number;
    reason?: string;
    priority?: string;
  }>;
  asyncCandidates?: string[];
  narrative?: string;
}

interface SnapshotResult {
  snapshot?: SnapshotData;
  totalMeetingsAnalyzed?: number;
  avgOverrunPercent?: number;
  overrunRate?: number;
  avgEngagementScore?: number | string;
  avgProductivityScore?: number | string;
  avgTimeEfficiencyScore?: number | string;
  trendVsPrevious?: string;
  overallGrade?: string;
  topOverrunCategories?: string | Array<string | { category: string; count?: number; overrunRate?: number }>;
  topOverrunTopics?: string | Array<string | { topic?: string; title?: string; count?: number; avgOverrun?: number }>;
  optimalOrderRecommendation?: string | string[];
  aiNarrative?: string;
  recommendations?: string | string[];
}

type SnapshotData = Omit<SnapshotResult, "snapshot">;

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800", F: "bg-red-100 text-red-800",
};
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  discussion: "meeting.agenda.catDiscussion",
  decision: "meeting.agenda.catDecision",
  update: "meeting.agenda.catUpdate",
  brainstorm: "meeting.agenda.catBrainstorm",
  review: "meeting.agenda.catReview",
  other: "meeting.agenda.catOther",
};
const TREND_COLORS: Record<string, string> = {
  improving: "bg-green-100 text-green-800", stable: "bg-gray-100 text-gray-800", declining: "bg-red-100 text-red-800",
};
const TREND_LABEL_KEYS: Record<string, string> = {
  improving: "meeting.agenda.trendImproving",
  stable: "meeting.agenda.trendStable",
  declining: "meeting.agenda.trendDeclining",
};

/* Sub-component for expanded agenda items (avoids conditional hook calls) */
function AgendaItemsDetail({ meetingId }: { meetingId: string }) {
  const { t } = useLanguage();
  const { data } = trpc.ime.timeAllocationBreakdown.useQuery({ meetingId });
  const items = (data?.items ?? []) as AgendaItem[];

  const categoryLabel = (key: string) => t(CATEGORY_LABEL_KEYS[key] || "meeting.agenda.catOther");

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{t("meeting.agenda.noItemDetail")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("meeting.agenda.thTopic")}</TableHead>
          <TableHead className="text-center">{t("meeting.agenda.thCategory")}</TableHead>
          <TableHead className="text-center">{t("meeting.agenda.thPlannedMin")}</TableHead>
          <TableHead className="text-center">{t("meeting.agenda.thActualMin")}</TableHead>
          <TableHead>{t("meeting.agenda.thTimeBar")}</TableHead>
          <TableHead>{t("meeting.agenda.thSpeaker")}</TableHead>
          <TableHead className="text-center">{t("meeting.agenda.thDecisionCount")}</TableHead>
          <TableHead className="text-center">{t("meeting.agenda.thActionItems")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item: AgendaItem, idx: number) => {
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
                <Badge variant="secondary">{categoryLabel(category)}</Badge>
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
  const { t } = useLanguage();

  const categoryLabel = (key: string) => t(CATEGORY_LABEL_KEYS[key] || "meeting.agenda.catOther");
  const trendLabel = (key: string) => t(TREND_LABEL_KEYS[key] || "meeting.agenda.trendStable");

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

  const dashboard = (dashboardQuery.data ?? {}) as Record<string, unknown>;
  const analysisList = ((analysisListQuery.data as Record<string, unknown> | undefined)?.rows || []) as AnalysisRow[];
  const breakdownItems = ((breakdownQuery.data as Record<string, unknown> | undefined)?.items || []) as AgendaItem[];
  const patterns = ((patternsQuery.data as Record<string, unknown> | undefined)?.patterns || []) as OverrunPattern[];
  const categories = ((categoryQuery.data as Record<string, unknown> | undefined)?.categories || []) as CategoryDistribution[];
  const trendData = (trendQuery.data || []) as unknown as TrendRow[];

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
    name: categoryLabel(name),
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Section 1: Analyze Agenda Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-indigo-500" />
            {t("meeting.agenda.analyzeTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.agenda.analyzeDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single analysis */}
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.agenda.inputMeetingId")}
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
              {t("meeting.agenda.analyzeBtn")}
            </Button>
          </div>
          {analyzeMutation.data && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              {(() => { const analyzeData = analyzeMutation.data as AnalyzeResult; return (<>
              <p>
                <span className="font-medium">{t("meeting.agenda.meetingIdLabel")}: </span>
                <span className="text-muted-foreground font-mono">{analyzeData.meetingId}</span>
              </p>
              <p>
                <span className="font-medium">{t("meeting.agenda.agendaItemsFound")}: </span>
                {analyzeData.agendaItemsFound ?? 0}
              </p>
              <p>
                <span className="font-medium">{t("meeting.agenda.totalPlanned")}: </span>
                {analyzeData.totalPlanned ?? 0} {t("meeting.agenda.minutesUnit")}
              </p>
              <p>
                <span className="font-medium">{t("meeting.agenda.totalActual")}: </span>
                {analyzeData.totalActual ?? 0} {t("meeting.agenda.minutesUnit")}
              </p>
              <p>
                <span className="font-medium">{t("meeting.agenda.overallEfficiency")}: </span>
                {analyzeData.overallEfficiency ?? "—"}
              </p>
              </>); })()}
            </div>
          )}
          {analyzeMutation.isError && (
            <p className="text-sm text-red-500">{t("meeting.agenda.error")}: {analyzeMutation.error.message}</p>
          )}

          {/* Batch analysis */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">{t("meeting.agenda.batchAnalysis")}</p>
            <div className="flex gap-3">
              <Input
                placeholder={t("meeting.agenda.batchPlaceholder")}
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
                {t("meeting.agenda.batchBtn")}
              </Button>
            </div>
            {batchMutation.data && (() => {
              const batchData = batchMutation.data as BatchResult;
              const results = (batchData.results ?? []);
              return (
                <p className="text-sm text-green-600 mt-2">
                  {t("meeting.agenda.batchCompleted")} {results.filter((r) => r.success).length} {t("meeting.agenda.batchSuccessUnit")}, {t("meeting.agenda.batchFailed")} {results.filter((r) => !r.success).length} {t("meeting.agenda.batchSuccessUnit")}
                </p>
              );
            })()}
            {batchMutation.isError && (
              <p className="text-sm text-red-500">{t("meeting.agenda.error")}: {batchMutation.error.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label={t("meeting.agenda.totalMeetingsAnalyzed")}
          value={(dashboard?.totalMeetingsAnalyzed as number) ?? "..."}
        />
        <StatCard
          icon={Target}
          label={t("meeting.agenda.avgEfficiencyScore")}
          value={(dashboard?.avgEfficiencyScore as number) ?? "..."}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Clock}
          label={t("meeting.agenda.avgOverrunPercent")}
          value={dashboard?.avgOverrunPercent != null ? `${dashboard.avgOverrunPercent as number}%` : "..."}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("meeting.agenda.skippedRate")}
          value={dashboard?.skippedRate != null ? `${dashboard.skippedRate as number}%` : "..."}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Section 3: Agenda Analysis List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.agenda.analysisListTitle")}</CardTitle>
          <CardDescription>{t("meeting.agenda.analysisListDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {analysisList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.agenda.thMeetingId")}</TableHead>
                  <TableHead>{t("meeting.agenda.thMeetingTitle")}</TableHead>
                  <TableHead className="text-center">{t("meeting.agenda.thTopicCount")}</TableHead>
                  <TableHead className="text-center">{t("meeting.agenda.thPlannedMin")}</TableHead>
                  <TableHead className="text-center">{t("meeting.agenda.thActualMin")}</TableHead>
                  <TableHead className="text-center">{t("meeting.agenda.thOverrunPercent")}</TableHead>
                  <TableHead className="text-center">{t("meeting.agenda.thEfficiencyScore")}</TableHead>
                  <TableHead className="text-center">{t("meeting.agenda.thGrade")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisList.map((row: AnalysisRow) => {
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
                            <Badge className={GRADE_COLORS[row.efficiency_grade! ?? row.efficiencyGrade] || ""}>
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
              <p>{t("meeting.agenda.noAnalysisData")}</p>
              <p className="text-sm">{t("meeting.agenda.noAnalysisDataHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Time Allocation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-500" />
            {t("meeting.agenda.breakdownTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.agenda.breakdownDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.agenda.inputMeetingId")}
              value={breakdownMeetingId}
              onChange={(e) => setBreakdownMeetingId(e.target.value)}
              className="w-60"
            />
            <Button
              onClick={() => setBreakdownSearchId(breakdownMeetingId.trim())}
              disabled={!breakdownMeetingId.trim()}
            >
              <Play className="h-4 w-4 mr-2" />
              {t("meeting.agenda.viewBreakdownBtn")}
            </Button>
          </div>

          {breakdownSearchId && breakdownItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Grouped bar chart: planned vs actual */}
              <div>
                <h4 className="text-sm font-medium mb-2">{t("meeting.agenda.plannedVsActual")}</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={breakdownItems.map((item: AgendaItem) => ({
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
                    <Bar dataKey="planned" name={t("meeting.agenda.chartPlannedMin")} fill="#6366f1" />
                    <Bar dataKey="actual" name={t("meeting.agenda.chartActualMin")} fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart: time by category */}
              <div>
                <h4 className="text-sm font-medium mb-2">{t("meeting.agenda.byCategoryDist")}</h4>
                {categoryPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryPieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}${t("meeting.agenda.minutesUnit")}`}
                      >
                        {categoryPieData.map((_: { name: string; value: number }, idx: number) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">{t("meeting.agenda.noCategoryData")}</p>
                )}
              </div>
            </div>
          )}

          {breakdownSearchId && breakdownItems.length === 0 && !breakdownQuery.isLoading && (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.agenda.noBreakdownData")}</p>
          )}
          {breakdownQuery.isLoading && (
            <p className="text-center py-4 text-muted-foreground">{t("meeting.agenda.loading")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Overrun Patterns & Category Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            {t("meeting.agenda.overrunPatternsTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.agenda.overrunPatternsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              type="date"
              value={patternDateFrom}
              onChange={(e) => setPatternDateFrom(e.target.value)}
              className="w-44"
              placeholder={t("meeting.agenda.startDate")}
            />
            <Input
              type="date"
              value={patternDateTo}
              onChange={(e) => setPatternDateTo(e.target.value)}
              className="w-44"
              placeholder={t("meeting.agenda.endDate")}
            />
            <Button onClick={handleAnalyzePatterns} disabled={patternsQuery.isFetching}>
              {patternsQuery.isFetching ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t("meeting.agenda.analyzeOverrunBtn")}
            </Button>
          </div>

          {/* Overrun patterns table */}
          {patterns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t("meeting.agenda.overrunTopicPatterns")}</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.agenda.thTopic")}</TableHead>
                    <TableHead className="text-center">{t("meeting.agenda.thOccurrences")}</TableHead>
                    <TableHead className="text-center">{t("meeting.agenda.thAvgPlannedMin")}</TableHead>
                    <TableHead className="text-center">{t("meeting.agenda.thAvgActualMin")}</TableHead>
                    <TableHead className="text-center">{t("meeting.agenda.thAvgOverrunPercent")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((p: OverrunPattern, i: number) => (
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
              <h4 className="text-sm font-medium mb-2">{t("meeting.agenda.categoryOverrunRate")}</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={categories.map((c: CategoryDistribution) => ({
                    name: categoryLabel(c.category),
                    overrunRate: Number(c.overrunRate ?? c.overrun_rate ?? 0),
                    avgMinutes: Number(c.avgActualMinutes ?? c.avg_actual_minutes ?? 0),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="overrunRate" name={t("meeting.agenda.chartOverrunRate")} fill="#ef4444" />
                  <Bar dataKey="avgMinutes" name={t("meeting.agenda.chartAvgDurationMin")} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {patternsQuery.isFetching && (
            <p className="text-center py-4 text-muted-foreground">{t("meeting.agenda.analyzing")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 6: AI Agenda Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t("meeting.agenda.optimizationTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.agenda.optimizationDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t("meeting.agenda.inputMeetingId")}
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
              {t("meeting.agenda.generateOptimizationBtn")}
            </Button>
          </div>
          {optimizeMutation.data && (() => { const optData = optimizeMutation.data as OptimizationResult; return (
            <div className="space-y-4">
              {/* Recommended order */}
              {(optData.recommendedOrder || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("meeting.agenda.recommendedOrder")}</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {optData.recommendedOrder!.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Recommendations table */}
              {(optData.recommendations || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("meeting.agenda.timeAllocationSuggestions")}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("meeting.agenda.thTopic")}</TableHead>
                        <TableHead className="text-center">{t("meeting.agenda.thSuggestedDuration")}</TableHead>
                        <TableHead className="text-center">{t("meeting.agenda.thCurrentDuration")}</TableHead>
                        <TableHead>{t("meeting.agenda.thReason")}</TableHead>
                        <TableHead className="text-center">{t("meeting.agenda.thPriority")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optData.recommendations!.map((rec, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-[160px] truncate">{rec.topic ?? rec.title ?? "—"}</TableCell>
                          <TableCell className="text-center">{rec.suggestedMinutes ?? rec.suggested ?? "—"} {t("meeting.agenda.minutesUnit")}</TableCell>
                          <TableCell className="text-center">{rec.currentMinutes ?? rec.current ?? "—"} {t("meeting.agenda.minutesUnit")}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">{rec.reason ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className={
                              rec.priority === "high" ? "bg-red-100 text-red-800" :
                              rec.priority === "medium" ? "bg-amber-100 text-amber-800" :
                              "bg-gray-100 text-gray-800"
                            }>
                              {rec.priority === "high" ? t("meeting.agenda.priorityHigh") : rec.priority === "medium" ? t("meeting.agenda.priorityMedium") : t("meeting.agenda.priorityLow")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Async candidates */}
              {(optData.asyncCandidates || []).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("meeting.agenda.asyncCandidates")}</h4>
                  <ul className="space-y-1 text-sm">
                    {optData.asyncCandidates!.map((c: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI narrative */}
              {optData.narrative && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-1">{t("meeting.agenda.aiAnalysis")}</h4>
                  <p className="text-sm text-muted-foreground">{optData.narrative}</p>
                </div>
              )}
            </div>
          ); })()}
          {optimizeMutation.isError && (
            <p className="text-sm text-red-500">{t("meeting.agenda.error")}: {optimizeMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            {t("meeting.agenda.efficiencyTrendTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.agenda.efficiencyTrendDesc")}</CardDescription>
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
                  name={t("meeting.agenda.chartEfficiencyScore")}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgOverrunPercent"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name={t("meeting.agenda.chartOverrunPercent")}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.agenda.noTrendData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Update Agenda Item (Manual) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {t("meeting.agenda.updateItemTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.agenda.updateItemDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder={t("meeting.agenda.analysisItemId")}
              type="number"
              value={updateItemId}
              onChange={(e) => setUpdateItemId(e.target.value)}
            />
            <Input
              placeholder={t("meeting.agenda.topicTitlePlaceholder")}
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
            />
            <Select value={updateCategory} onValueChange={setUpdateCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t("meeting.agenda.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discussion">{t("meeting.agenda.catDiscussion")}</SelectItem>
                <SelectItem value="decision">{t("meeting.agenda.catDecision")}</SelectItem>
                <SelectItem value="update">{t("meeting.agenda.catUpdate")}</SelectItem>
                <SelectItem value="brainstorm">{t("meeting.agenda.catBrainstorm")}</SelectItem>
                <SelectItem value="review">{t("meeting.agenda.catReview")}</SelectItem>
                <SelectItem value="other">{t("meeting.agenda.catOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.agenda.plannedDurationLabel")}</label>
              <Input
                type="number"
                min={0}
                placeholder={t("meeting.agenda.plannedDurationPlaceholder")}
                value={updatePlanned}
                onChange={(e) => setUpdatePlanned(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.agenda.actualDurationLabel")}</label>
              <Input
                type="number"
                min={0}
                placeholder={t("meeting.agenda.actualDurationPlaceholder")}
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
            {t("meeting.agenda.updateItemBtn")}
          </Button>
          {updateMutation.data && (
            <p className="text-sm text-green-600">{t("meeting.agenda.itemUpdated")}</p>
          )}
          {updateMutation.isError && (
            <p className="text-sm text-red-500">{t("meeting.agenda.error")}: {updateMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Organization Agenda Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            {t("meeting.agenda.orgIntelTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.agenda.orgIntelDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={snapshotScope} onValueChange={setSnapshotScope}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("meeting.agenda.selectScope")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">{t("meeting.agenda.scopeOrg")}</SelectItem>
                <SelectItem value="department">{t("meeting.agenda.scopeDept")}</SelectItem>
                <SelectItem value="team">{t("meeting.agenda.scopeTeam")}</SelectItem>
                <SelectItem value="individual">{t("meeting.agenda.scopeIndividual")}</SelectItem>
              </SelectContent>
            </Select>
            {snapshotScope !== "org" && (
              <Input
                placeholder={`${t("meeting.agenda.inputScopeId")}${snapshotScope === "department" ? t("meeting.agenda.scopeDept") : snapshotScope === "team" ? t("meeting.agenda.scopeTeam") : t("meeting.agenda.scopeIndividual")}ID...`}
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
              {t("meeting.agenda.generateSnapshot")}
            </Button>
          </div>
          {snapshotMutation.data && (() => {
            const snapRaw = snapshotMutation.data as SnapshotResult;
            const snap: SnapshotData = (snapRaw.snapshot ?? snapRaw) as SnapshotData;
            return (
              <div className="space-y-4">
                {/* Metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <BarChart3 className="h-5 w-5 mx-auto text-indigo-500 mb-1" />
                      <div className="text-xl font-bold">{snap.totalMeetingsAnalyzed ?? 0}</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.agenda.totalMeetingsAnalyzed")}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgOverrunPercent ?? 0}%</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.agenda.avgOverrunPercent")}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                      <div className="text-xl font-bold">{snap.overrunRate ?? 0}%</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.agenda.overrunRate")}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgEngagementScore ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.agenda.engagementScore")}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Zap className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgProductivityScore ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.agenda.productivityScore")}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                      <div className="text-xl font-bold">{snap.avgTimeEfficiencyScore ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{t("meeting.agenda.efficiencyScore")}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Trend + Grade badges */}
                <div className="flex items-center gap-4 flex-wrap">
                  {snap.trendVsPrevious && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t("meeting.agenda.overallTrend")}:</span>
                      <Badge className={TREND_COLORS[snap.trendVsPrevious] || ""} variant="secondary">
                        {(() => {
                          const Icon = snap.trendVsPrevious === "improving" ? TrendingUp : snap.trendVsPrevious === "declining" ? TrendingDown : Minus;
                          return (
                            <>
                              <Icon className="h-3 w-3 mr-1" />
                              {trendLabel(snap.trendVsPrevious)}
                            </>
                          );
                        })()}
                      </Badge>
                    </div>
                  )}
                  {snap.overallGrade && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t("meeting.agenda.overallGrade")}:</span>
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
                          <h4 className="text-sm font-medium mb-1">{t("meeting.agenda.topOverrunCategories")}</h4>
                          <ul className="space-y-1 text-sm">
                            {cats.map((c: string | { category: string; count?: number; overrunRate?: number }, i: number) => (
                              <li key={i} className="text-muted-foreground">
                                • {typeof c === "string" ? c : `${categoryLabel(c.category)}: ${c.count ?? c.overrunRate ?? ""}${t("meeting.agenda.timesUnit")}`}
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
                          <h4 className="text-sm font-medium mb-1">{t("meeting.agenda.topOverrunTopics")}</h4>
                          <ul className="space-y-1 text-sm">
                            {topics.map((tp: string | { topic?: string; title?: string; count?: number; avgOverrun?: number }, i: number) => (
                              <li key={i} className="text-muted-foreground">
                                • {typeof tp === "string" ? tp : `${tp.topic ?? tp.title}: ${tp.count ?? tp.avgOverrun ?? ""}${t("meeting.agenda.timesUnit")}`}
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
                          <h4 className="text-sm font-medium mb-1">{t("meeting.agenda.optimalOrder")}</h4>
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
                    <h4 className="text-sm font-medium mb-1">{t("meeting.agenda.aiAnalysis")}</h4>
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
                          <h4 className="text-sm font-medium mb-1">{t("meeting.agenda.optimizeSuggestions")}</h4>
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
            <p className="text-sm text-red-500">{t("meeting.agenda.error")}: {snapshotMutation.error.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
