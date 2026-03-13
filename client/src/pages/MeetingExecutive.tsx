import { useState, Component, Fragment } from "react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  BarChart3,
  Users,
  TrendingUp,
  Target,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Award,
  MessageSquare,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  Link2,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  DepartmentRollupTab,
  MeetingPatternsTab,
  HrSignalsTab,
  LiveAssistantTab,
  MeetingCostTab,
  ActionItemTrackerTab,
  TopicContinuityTab,
  SentimentAnalysisTab,
  MeetingHealthTab,
  DigestAlertsTab,
  MeetingRoiTab,
  AttendeeOptimizationTab,
  PredictiveAnalyticsTab,
  ReportsTab,
  KnowledgeGraphTab,
  MeetingAssistantTab,
  WorkflowCoachingTab,
  IntegrationSettingsTab,
  GamificationTab,
  FeedbackTab,
  ComplianceTab,
  HrPerformanceLinkageTab,
  MeetingIntelligenceApiTab,
  CollaborationNetworkTab,
  MeetingLoadWellbeingTab,
  RecurringMeetingValueTab,
  DecisionEffectivenessTab,
  AgendaTimeAllocationTab,
  FacilitatorEffectivenessTab,
} from "./meeting-executive";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import QueryErrorBanner from "@/components/QueryErrorBanner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ============================================================================
// Tab 1: Overview
// ============================================================================

function OverviewTab() {
  const { t } = useLanguage();
  const { data: dashboard, isLoading } = trpc.ime.dashboard.useQuery({});

  const stats = dashboard?.stats;
  const topContributors = Array.isArray(dashboard?.topContributors)
    ? dashboard.topContributors as any[]
    : [];
  const trend = Array.isArray(dashboard?.effectivenessTrend)
    ? dashboard.effectivenessTrend as any[]
    : [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label={t("mi.exec.analyzedMeetings")}
          value={isLoading ? "..." : stats?.analyzedMeetings ?? 0}
        />
        <StatCard
          icon={Target}
          label={t("mi.exec.avgEffectiveness")}
          value={isLoading ? "..." : `${stats?.avgEffectiveness ?? 0}%`}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Award}
          label={t("mi.exec.topContributor")}
          value={isLoading ? "..." : (topContributors[0]?.employee_name ?? "—")}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          icon={Users}
          label={t("mi.exec.activeParticipants")}
          value={isLoading ? "..." : stats?.activeParticipants ?? 0}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Effectiveness Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("mi.exec.effectivenessTrend")}</CardTitle>
          <CardDescription>{t("mi.exec.effectivenessTrendDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avg_score"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={t("mi.exec.effectivenessScore")}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("mi.exec.noAnalysisData")}</p>
              <p className="text-sm">{t("mi.exec.pleaseAnalyzeFirst")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 10 Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("mi.exec.contributorRanking")}</CardTitle>
          <CardDescription>{t("mi.exec.contributorRankingDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {topContributors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t("mi.exec.thName")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thMeetingCount")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thAvgScore")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thDecisions")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thActionItems")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topContributors.map((c: any, i: number) => (
                  <TableRow key={c.employee_id}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {i < 3 && <Award className="h-4 w-4 text-amber-500" />}
                        {c.employee_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{c.meeting_count}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={Number(c.avg_score) >= 70 ? "default" : "secondary"}>
                        {Math.round(Number(c.avg_score))}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{c.total_decisions ?? 0}</TableCell>
                    <TableCell className="text-center">{c.total_actions ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-6 text-muted-foreground">{t("mi.exec.noContributorData")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Tab 2: Participants
// ============================================================================

function ParticipantsTab() {
  const { t } = useLanguage();
  const [employeeId, setEmployeeId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [engagementMeetingId, setEngagementMeetingId] = useState("");
  const [engagementSearchId, setEngagementSearchId] = useState("");

  const trendQuery = trpc.ime.employeeTrend.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );
  const trendData = (trendQuery.data ?? []) as any[];

  // Engagement analysis
  const engagementMutation = trpc.ime.analyzeEngagement.useMutation();
  const engagementQuery = trpc.ime.meetingEngagement.useQuery(
    { meetingId: engagementSearchId },
    { enabled: !!engagementSearchId }
  );
  const engagementData = engagementMutation.data ?? engagementQuery.data;
  const engagementParticipants = (engagementData?.participants ?? []) as any[];

  const handleAnalyzeEngagement = () => {
    if (!engagementMeetingId.trim()) return;
    setEngagementSearchId(engagementMeetingId.trim());
    engagementMutation.mutate({ meetingId: engagementMeetingId.trim() });
  };

  // Compute radar data from trend — include engagement dimensions when available
  const radarData = (() => {
    if (trendData.length === 0) return [];
    const totals = { speaking: 0, decisions: 0, actions: 0, interventions: 0, score: 0 };
    let engTotals = { cv: 0, lc: 0, co: 0, count: 0 };
    for (const d of trendData) {
      totals.speaking += Number(d.speaking_time) || 0;
      totals.decisions += Number(d.decision_count) || 0;
      totals.actions += Number(d.action_item_count) || 0;
      totals.interventions += Number(d.intervention_count) || 0;
      totals.score += Number(d.contribution_score) || 0;
      try {
        const analysis = JSON.parse(d.ai_analysis || "{}");
        if (analysis.engagement) {
          engTotals.cv += Number(analysis.engagement.contribution_value) || 0;
          engTotals.lc += Number(analysis.engagement.logic_conciseness) || 0;
          engTotals.co += Number(analysis.engagement.constructiveness) || 0;
          engTotals.count++;
        }
      } catch { /* skip */ }
    }
    const n = trendData.length;
    const base = [
      { dimension: t("mi.exec.speakingTime"), value: Math.min(100, (totals.speaking / n) / 3) },
      { dimension: t("mi.exec.decisionAbility"), value: Math.min(100, (totals.decisions / n) * 25) },
      { dimension: t("mi.exec.executionAbility"), value: Math.min(100, (totals.actions / n) * 20) },
      { dimension: t("mi.exec.participationDegree"), value: Math.min(100, (totals.interventions / n) * 10) },
      { dimension: t("mi.exec.overallScore"), value: totals.score / n },
    ];
    if (engTotals.count > 0) {
      base.push(
        { dimension: t("mi.exec.contributionValueLabel"), value: (engTotals.cv / engTotals.count) * 10 },
        { dimension: t("mi.exec.logicConcisenessLabel"), value: (engTotals.lc / engTotals.count) * 10 },
        { dimension: t("mi.exec.constructivenessLabel"), value: (engTotals.co / engTotals.count) * 10 },
      );
    }
    return base;
  })();

  // Parse latest AI analysis
  const latestAnalysis = (() => {
    for (let i = trendData.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(trendData[i].ai_analysis);
        if (parsed.strengths?.length) return parsed;
      } catch { /* skip */ }
    }
    return null;
  })();

  const tagColorMap: Record<string, string> = {
    Strategic: "bg-purple-100 text-purple-700",
    "Risk-Aware": "bg-red-100 text-red-700",
    "Solution-Oriented": "bg-green-100 text-green-700",
    "Detail-Focused": "bg-blue-100 text-blue-700",
    Collaborative: "bg-cyan-100 text-cyan-700",
    "Off-Topic": "bg-orange-100 text-orange-700",
    Passive: "bg-gray-100 text-gray-600",
    Constructive: "bg-emerald-100 text-emerald-700",
    Analytical: "bg-indigo-100 text-indigo-700",
  };

  const scoreColor = (score: number) =>
    score >= 7 ? "text-green-600" : score >= 4 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Engagement Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t("mi.exec.engagementAnalysis")}
          </CardTitle>
          <CardDescription>{t("mi.exec.engagementDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder={t("mi.exec.enterMeetingId")}
              value={engagementMeetingId}
              onChange={(e) => setEngagementMeetingId(e.target.value)}
              className="max-w-sm"
            />
            <Button
              onClick={handleAnalyzeEngagement}
              disabled={engagementMutation.isPending || !engagementMeetingId.trim()}
            >
              {engagementMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              {t("mi.exec.analyzeEngagement")}
            </Button>
          </div>

          {engagementParticipants.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("mi.exec.thName")}</TableHead>
                    <TableHead className="text-center">{t("mi.exec.thRole")}</TableHead>
                    <TableHead className="text-center">{t("mi.exec.thEngagement")}</TableHead>
                    <TableHead className="text-center">{t("mi.exec.thContributionValue")}</TableHead>
                    <TableHead className="text-center">{t("mi.exec.thLogicConciseness")}</TableHead>
                    <TableHead className="text-center">{t("mi.exec.thConstructiveness")}</TableHead>
                    <TableHead>{t("mi.exec.thKeyContribution")}</TableHead>
                    <TableHead>{t("mi.exec.thBehaviorTags")}</TableHead>
                    <TableHead>{t("mi.exec.thCoachingSuggestion")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engagementParticipants.map((p: any) => (
                    <TableRow key={p.speaker}>
                      <TableCell className="font-medium">{p.speaker}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{p.role}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${scoreColor(p.engagement_score)}`}>
                          {Number(p.engagement_score).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{Number(p.contribution_value).toFixed(1)}</TableCell>
                      <TableCell className="text-center">{Number(p.logic_conciseness).toFixed(1)}</TableCell>
                      <TableCell className="text-center">{Number(p.constructiveness).toFixed(1)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {p.key_contribution}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(p.behavior_tags ?? []).map((tag: string) => (
                            <span
                              key={tag}
                              className={`text-xs px-1.5 py-0.5 rounded-full ${tagColorMap[tag] || "bg-gray-100 text-gray-600"}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                        {p.coaching_suggestion}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {engagementMutation.isError && (
            <p className="text-sm text-red-500">{t("mi.exec.analysisFailed")}: {engagementMutation.error?.message ?? "Unknown error"}</p>
          )}
        </CardContent>
      </Card>

      {/* Employee Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder={t("mi.exec.enterEmployeeId")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setEmployeeId(searchTerm)} disabled={!searchTerm}>
              <Users className="h-4 w-4 mr-2" />
              {t("mi.exec.query")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {employeeId && trendData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("mi.exec.radarChart")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.3}
                    name={t("mi.exec.score")}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Contribution Breakdown Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("mi.exec.contributionBreakdown")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="decision_count" fill="#6366f1" name={t("mi.exec.decisions")} />
                  <Bar dataKey="action_item_count" fill="#22c55e" name={t("mi.exec.actionItemsLabel")} />
                  <Bar dataKey="intervention_count" fill="#f59e0b" name={t("mi.exec.speakingCount")} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Score Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("mi.exec.scoreTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="contribution_score" stroke="#6366f1" strokeWidth={2} name={t("mi.exec.contributionScore")} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {latestAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  {t("mi.exec.aiAnalysis")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {t("mi.exec.strengths")}
                  </h4>
                  <ul className="space-y-1">
                    {latestAnalysis.strengths?.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> {t("mi.exec.improvements")}
                  </h4>
                  <ul className="space-y-1">
                    {latestAnalysis.improvements?.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
                {latestAnalysis.keyQuotes?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-500" /> {t("mi.exec.keyQuotes")}
                    </h4>
                    {latestAnalysis.keyQuotes?.map((q: string, i: number) => (
                      <blockquote key={i} className="text-sm italic text-muted-foreground border-l-2 border-purple-200 pl-3 my-1">
                        "{q}"
                      </blockquote>
                    ))}
                  </div>
                )}
                {latestAnalysis.engagement && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Target className="h-3.5 w-3.5 text-indigo-500" /> {t("mi.exec.engagementAssessment")}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">{t("mi.exec.contributionValueLabel")}</div>
                        <div className={`font-semibold ${scoreColor(latestAnalysis.engagement.contribution_value)}`}>
                          {Number(latestAnalysis.engagement.contribution_value).toFixed(1)}
                        </div>
                      </div>
                      <div className="text-center p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">{t("mi.exec.logicConcisenessLabel")}</div>
                        <div className={`font-semibold ${scoreColor(latestAnalysis.engagement.logic_conciseness)}`}>
                          {Number(latestAnalysis.engagement.logic_conciseness).toFixed(1)}
                        </div>
                      </div>
                      <div className="text-center p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">{t("mi.exec.constructivenessLabel")}</div>
                        <div className={`font-semibold ${scoreColor(latestAnalysis.engagement.constructiveness)}`}>
                          {Number(latestAnalysis.engagement.constructiveness).toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(latestAnalysis.engagement.behavior_tags ?? []).map((tag: string) => (
                        <span
                          key={tag}
                          className={`text-xs px-1.5 py-0.5 rounded-full ${tagColorMap[tag] || "bg-gray-100 text-gray-600"}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {latestAnalysis.engagement.coaching_suggestion && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {latestAnalysis.engagement.coaching_suggestion}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : employeeId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("mi.exec.noContributionAnalysis")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("mi.exec.enterEmployeeIdToQuery")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Tab 3: Meeting Scores
// ============================================================================

function MeetingScoresTab() {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: meetings, isLoading } = trpc.ime.effectivenessList.useQuery({ limit: 50 });
  const meetingList = (meetings ?? []) as any[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("mi.exec.meetingScoresList")}</CardTitle>
          <CardDescription>{t("mi.exec.meetingScoresListDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">{t("mi.exec.loading")}</p>
          ) : meetingList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("mi.exec.thMeetingName")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thDate")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thParticipantCount")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thTotalScore")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thObjectiveAchievement")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thParticipationBalance")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetingList.map((m: any) => (
                  <Fragment key={m.meeting_id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpanded(expanded === m.meeting_id ? null : m.meeting_id)}
                    >
                      <TableCell className="font-medium">{m.meeting_title}</TableCell>
                      <TableCell className="text-center text-sm">{m.meeting_date?.split("T")[0]}</TableCell>
                      <TableCell className="text-center">{m.participant_count ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={Number(m.overall_score) >= 70 ? "default" : "secondary"}>
                          {Math.round(Number(m.overall_score))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{Math.round(Number(m.objective_achievement))}</TableCell>
                      <TableCell className="text-center">{Math.round(Number(m.participation_balance))}</TableCell>
                      <TableCell>
                        {expanded === m.meeting_id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expanded === m.meeting_id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            {/* Pie chart of 4 dimensions */}
                            <div>
                              <h4 className="text-sm font-medium mb-3">{t("mi.exec.dimensionDistribution")}</h4>
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: t("mi.exec.objectiveAchievementLabel"), value: Number(m.objective_achievement) || 0 },
                                      { name: t("mi.exec.participationBalanceLabel"), value: Number(m.participation_balance) || 0 },
                                      { name: t("mi.exec.decisionClarityLabel"), value: Number(m.decision_clarity) || 0 },
                                      { name: t("mi.exec.actionableOutcomesLabel"), value: Number(m.actionable_outcomes) || 0 },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={70}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${Math.round(value)}`}
                                  >
                                    {COLORS.slice(0, 4).map((color, idx) => (
                                      <Cell key={idx} fill={color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            {/* AI Narrative */}
                            <div>
                              <h4 className="text-sm font-medium mb-3 flex items-center gap-1">
                                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                {t("mi.exec.aiNarrative")}
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {m.ai_narrative || t("mi.exec.noAiNarrative")}
                              </p>
                              {m.objective && (
                                <div className="mt-3">
                                  <span className="text-xs font-medium text-muted-foreground">{t("mi.exec.meetingObjective")}: </span>
                                  <span className="text-xs">{m.objective}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("mi.exec.noMeetingScores")}</p>
              <p className="text-sm">{t("mi.exec.pleaseAnalyzeFirst")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Tab 4: Performance Link
// ============================================================================

function PerformanceLinkTab() {
  const { t } = useLanguage();
  const [meetingIds, setMeetingIds] = useState("");
  const batchMutation = trpc.ime.batchAnalyze.useMutation();
  const { data: dashboard } = trpc.ime.dashboard.useQuery({});
  const topContributors = (dashboard?.topContributors ?? []) as any[];

  const handleBatchAnalyze = () => {
    const ids = meetingIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    batchMutation.mutate({ meetingIds: ids });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t("mi.exec.performanceLinkTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>{t("mi.exec.performanceLinkDesc1")}</p>
            <p>{t("mi.exec.performanceLinkDesc2")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Batch Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t("mi.exec.batchAnalysis")}
          </CardTitle>
          <CardDescription>{t("mi.exec.batchAnalysisDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="meeting-id-1, meeting-id-2, ..."
              value={meetingIds}
              onChange={(e) => setMeetingIds(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleBatchAnalyze}
              disabled={batchMutation.isPending || !meetingIds.trim()}
            >
              {batchMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t("mi.exec.batchAnalysis")}
            </Button>
          </div>
          {Array.isArray(batchMutation.data) && (
            <div className="space-y-1">
              {batchMutation.data.map((r: any) => (
                <div key={r.meetingId} className="flex items-center gap-2 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-mono text-xs">{r.meetingId}</span>
                  {r.error && <span className="text-red-500 text-xs">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contributor → Trace mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("mi.exec.contributorMapping")}</CardTitle>
          <CardDescription>{t("mi.exec.contributorMappingDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {topContributors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("mi.exec.thEmployee")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thMeetingCount")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thAvgContribution")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thDecisions")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thActionItems")}</TableHead>
                  <TableHead className="text-center">{t("mi.exec.thPerfMetric")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topContributors.map((c: any) => (
                  <TableRow key={c.employee_id}>
                    <TableCell className="font-medium">{c.employee_name}</TableCell>
                    <TableCell className="text-center">{c.meeting_count}</TableCell>
                    <TableCell className="text-center">
                      <Badge>{Math.round(Number(c.avg_score))}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{c.total_decisions ?? 0}</TableCell>
                    <TableCell className="text-center">{c.total_actions ?? 0}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">meeting_contribution_score</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-6 text-muted-foreground">{t("mi.exec.noPerfLinkData")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Tab: AI Performance Engine (AI 绩效引擎) — Real tRPC + fallback mock
// ============================================================================


function AIPerformanceTab() {
  const { t } = useLanguage();
  // ── tRPC queries with fallback ─────────────────────────────
  const dashboardQuery = trpc.aiPerformance.dashboard.useQuery({});
  const leaderboardQuery = trpc.aiPerformance.leaderboard.useQuery({ limit: 10 });
  const actionStatsQuery = trpc.aiPerformance.actionItemStats.useQuery({ months: 6 });
  const seedMutation = trpc.aiPerformance.seedDemo.useMutation();
  const recalcMutation = trpc.aiPerformance.recalculateAll.useMutation();
  // Analytics ROI pipeline (speaker radar + canvas → executive)
  const roiQuery = trpc.smartMeeting.analytics.aggregatedRoi.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const roiData = roiQuery.data ?? null;

  // Use real data from DB (seed via button if empty)
  const leaderboard = Array.isArray(leaderboardQuery.data) ? leaderboardQuery.data : [];
  const actionTrend = Array.isArray(actionStatsQuery.data) ? actionStatsQuery.data : [];
  const dash = dashboardQuery.data;
  const isLive = !!(dash && dash.employeesEvaluated > 0);

  const avgScore = dash?.avgMeetingScore ?? 0;
  const completionRate = dash?.actionItemCompletionRate ?? 0;
  const topName = dash?.topPerformer?.name ?? "—";
  const topScore = dash?.topPerformer?.score ?? 0;
  const totalEvaluated = dash?.employeesEvaluated ?? 0;

  const tierColor = (score: number) =>
    score >= 90 ? "text-emerald-600" : score >= 75 ? "text-blue-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  const tierLabel = (score: number) =>
    score >= 90 ? "Outstanding" : score >= 75 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement";

  const handleSeed = async () => {
    try {
      await seedMutation.mutateAsync();
      dashboardQuery.refetch();
      leaderboardQuery.refetch();
      actionStatsQuery.refetch();
    } catch { /* ignore */ }
  };

  const handleRecalculate = async () => {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await recalcMutation.mutateAsync({ month });
      dashboardQuery.refetch();
      leaderboardQuery.refetch();
      actionStatsQuery.refetch();
    } catch { /* ignore */ }
  };

  const queryError = dashboardQuery.error || leaderboardQuery.error || actionStatsQuery.error || roiQuery.error;

  return (
    <div className="space-y-6">
      <QueryErrorBanner error={queryError} onRetry={() => { dashboardQuery.refetch(); leaderboardQuery.refetch(); actionStatsQuery.refetch(); }} />
      {/* Seed + status banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">LIVE Data</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Demo Data</Badge>
          )}
          {!isLive && (
            <span className="text-xs text-muted-foreground">
              Click "Seed Demo Data" to populate the database with real records
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRecalculate}
            disabled={recalcMutation.isPending}
            title="Recalculate scores from real meeting attendance, interactions, and action items"
          >
            {recalcMutation.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {recalcMutation.isPending ? "Calculating..." : "Recalculate from Meetings"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSeed}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 mr-1.5" />
            )}
            {seedMutation.isPending ? "Seeding..." : "Seed Demo Data"}
          </Button>
        </div>
      </div>

      {recalcMutation.data && (recalcMutation.data as any).ok && (
        <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
          Recalculated {(recalcMutation.data as any).processed}/{(recalcMutation.data as any).totalUsers} users for {(recalcMutation.data as any).month} from real meeting data
        </div>
      )}

      {seedMutation.data && (
        <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          {(seedMutation.data as any).source === "real_meeting_data"
            ? `Calculated ${seedMutation.data.performanceRecords} performance records from real meeting data for ${seedMutation.data.month}`
            : `Seeded ${seedMutation.data.performanceRecords} performance records + ${seedMutation.data.actionItems} action items for ${seedMutation.data.month}`
          }
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t("mi.exec.evaluatedEmployees")}
          value={totalEvaluated}
        />
        <StatCard
          icon={Target}
          label={t("mi.exec.avgMeetingScore")}
          value={`${avgScore}`}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={CheckCircle2}
          label={t("mi.exec.actionItemCompletion")}
          value={`${completionRate}%`}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={Award}
          label={t("mi.exec.bestEmployee")}
          value={topName}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Top 10 AI Performance Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            AI Performance Leaderboard — Top 10
          </CardTitle>
          <CardDescription>
            Based on 4 dimensions: Participation (会议参与) · Execution (执行力) · Collaboration (协作) · Innovation (创新)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Participation</TableHead>
                <TableHead className="text-center">Execution</TableHead>
                <TableHead className="text-center">Collaboration</TableHead>
                <TableHead className="text-center">Innovation</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Tier</TableHead>
                <TableHead className="text-center">Meetings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((p: any, idx: number) => {
                const rank = idx + 1;
                const score = p.meetingScore ?? 0;
                return (
                  <TableRow key={rank}>
                    <TableCell className="font-medium">
                      {rank <= 3 ? (
                        <span className="flex items-center gap-1">
                          <Award className={`h-4 w-4 ${rank === 1 ? "text-amber-500" : rank === 2 ? "text-gray-400" : "text-orange-400"}`} />
                          {rank}
                        </span>
                      ) : rank}
                    </TableCell>
                    <TableCell className="font-medium">{p.userName}</TableCell>
                    <TableCell className="text-center">{p.participation ?? p.breadth ?? p.breadthScore ?? 0}</TableCell>
                    <TableCell className="text-center">{p.execution ?? p.depthScore ?? 0}</TableCell>
                    <TableCell className="text-center">{p.collaboration ?? p.executionScore ?? 0}</TableCell>
                    <TableCell className="text-center">{p.innovation ?? p.disciplineScore ?? 0}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={score >= 80 ? "default" : "secondary"}>
                        {score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-semibold ${tierColor(score)}`}>
                        {tierLabel(score)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{p.meetingsAttended ?? 0}/{p.meetingsTotal ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Radar chart: Top 3 comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 3 Dimension Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart
                data={[
                  { dimension: "Participation", ...Object.fromEntries(leaderboard.slice(0, 3).map((p: any) => [p.userName, p.participation ?? p.breadth ?? p.breadthScore ?? 0])) },
                  { dimension: "Execution", ...Object.fromEntries(leaderboard.slice(0, 3).map((p: any) => [p.userName, p.execution ?? p.depthScore ?? 0])) },
                  { dimension: "Collaboration", ...Object.fromEntries(leaderboard.slice(0, 3).map((p: any) => [p.userName, p.collaboration ?? p.executionScore ?? 0])) },
                  { dimension: "Innovation", ...Object.fromEntries(leaderboard.slice(0, 3).map((p: any) => [p.userName, p.innovation ?? p.disciplineScore ?? 0])) },
                ]}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} />
                {leaderboard.slice(0, 3).map((p, i) => (
                  <Radar
                    key={p.userName}
                    dataKey={p.userName}
                    stroke={COLORS[i]}
                    fill={COLORS[i]}
                    fillOpacity={0.15}
                    name={p.userName}
                  />
                ))}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Action Item Completion Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Action Item Completion Rate
            </CardTitle>
            <CardDescription>Monthly trend across all teams</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={actionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="total" fill="#94a3b8" name="Total Items" />
                <Bar yAxisId="left" dataKey="completed" fill="#22c55e" name="Completed" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rate"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Completion %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════ Meeting ROI Pipeline (Speaker Radar + Canvas → Analytics) ═══════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500" />
            {t("mi.exec.roiPipeline")}
          </CardTitle>
          <CardDescription>
            Aggregated from Speaker Radar (talk-time distribution) and Canvas Action Items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roiData && roiData.totalMeetings > 0 ? (
            <div className="space-y-6">
              {/* ROI Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Analyzed Meetings", value: roiData.totalMeetings ?? 0, color: "text-indigo-600" },
                  { label: "Avg ROI Score", value: `${roiData.avgRoiScore ?? 0}/100`, color: "text-emerald-600" },
                  { label: "Participation Balance", value: `${roiData.avgParticipationBalance ?? 0}%`, color: "text-blue-600" },
                  { label: "Action Completion", value: `${roiData.avgActionCompletionRate ?? 0}%`, color: "text-amber-600" },
                  { label: "Attendance Rate", value: `${roiData.avgAttendanceRate ?? 0}%`, color: "text-purple-600" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/40">
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Per-meeting ROI bar chart */}
              {(roiData.meetingRois ?? []).length > 0 && (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={(roiData.meetingRois ?? []).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="title"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="roiScore" fill="#6366f1" name="ROI Score" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{t("mi.exec.noRoiData")}</p>
              <p className="text-xs mt-1">{t("mi.exec.noRoiDataDesc")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Error Boundary — catches render-time crashes per tab
// ============================================================================

class TabErrorBoundary extends Component<
  { children: ReactNode; tabName: string; failedLabel?: string; reloadLabel?: string },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-amber-500" />
            <p className="font-medium">"{this.props.tabName}" {this.props.failedLabel ?? "Load Failed"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {this.state.error?.message}
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4"
            >
              {this.props.reloadLabel ?? "Reload"}
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// ManagementRhythmTab — 管理节奏 (Automation → Meeting closed-loop)
// ============================================================================

function ManagementRhythmTab() {
  const { t } = useLanguage();
  const meetingsQuery = trpc.automation.listTriggeredMeetings.useQuery(
    { limit: 20 },
    { retry: false }
  );
  const okrDashQuery = trpc.okr.dashboard.useQuery(undefined, { retry: false });
  const statsQuery = trpc.automation.getAutomationStats.useQuery(undefined, { retry: false });

  const triggerPhaseMut = trpc.automation.triggerPhaseChange.useMutation({
    onSuccess: () => {
      meetingsQuery.refetch();
      statsQuery.refetch();
    },
  });
  const triggerTNodeMut = trpc.automation.triggerTNodeDelay.useMutation({
    onSuccess: () => {
      meetingsQuery.refetch();
      statsQuery.refetch();
    },
  });
  const triggerOKRMut = trpc.automation.triggerOKRAtRisk.useMutation({
    onSuccess: () => {
      meetingsQuery.refetch();
      statsQuery.refetch();
    },
  });
  const triggerQualityMut = trpc.automation.triggerQualityEscalation.useMutation({
    onSuccess: () => {
      meetingsQuery.refetch();
      statsQuery.refetch();
    },
  });
  const triggerSupplierMut = trpc.automation.triggerSupplierPenalty.useMutation({
    onSuccess: () => {
      meetingsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const meetings = Array.isArray(meetingsQuery.data) ? meetingsQuery.data : [];
  const okrDash = okrDashQuery.data;
  const stats = statsQuery.data;

  const rhythmQueryError = meetingsQuery.error || okrDashQuery.error || statsQuery.error;

  return (
    <div className="space-y-6">
      <QueryErrorBanner error={rhythmQueryError} onRetry={() => { meetingsQuery.refetch(); okrDashQuery.refetch(); statsQuery.refetch(); }} />
      {/* Section 0: Management Rhythm Closed-Loop Flow */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-sm">{t("mi.exec.managementRhythmLoop")}</h3>
            <span className="text-xs text-gray-400">Strategy OKR → Automation → Meeting → Action → OKR Update</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {[
              { icon: "🎯", label: t("mi.exec.strategyOkr"), desc: "OKR", color: "bg-purple-50 border-purple-200 text-purple-700" },
              { icon: "⚡", label: t("mi.exec.automationRules"), desc: `5`, color: "bg-amber-50 border-amber-200 text-amber-700" },
              { icon: "📅", label: t("mi.exec.triggeredMeetings"), desc: `${stats?.totalTriggered ?? 0}`, color: "bg-blue-50 border-blue-200 text-blue-700" },
              { icon: "✅", label: t("mi.exec.actionItemsStatus"), desc: `${stats?.pending ?? 0}`, color: "bg-green-50 border-green-200 text-green-700" },
              { icon: "📊", label: t("mi.exec.okrUpdate"), desc: `${okrDash?.avgProgress ?? 0}%`, color: "bg-purple-50 border-purple-200 text-purple-700" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2 shrink-0">
                <div className={`flex flex-col items-center p-3 rounded-lg border ${step.color} min-w-[100px]`}>
                  <span className="text-xl mb-1">{step.icon}</span>
                  <span className="text-xs font-semibold">{step.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{step.desc}</span>
                </div>
                {i < arr.length - 1 && (
                  <ChevronDown className="w-4 h-4 text-gray-300 rotate-[-90deg] shrink-0" />
                )}
              </div>
            ))}
            {/* Loop-back arrow */}
            <div className="shrink-0 flex items-center">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400 text-center">
            {t("mi.exec.closedLoopDesc")}
          </div>
        </div>
      </div>

      {/* Section 1: Triggered Meetings */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">{t("mi.exec.autoTriggeredMeetings")}</h3>
            {meetings.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {meetings.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() =>
                triggerPhaseMut.mutate({
                  phase: "M2_SIGNED",
                  projectTitle: "超声波清洗机项目-Demo",
                  pmName: "张三",
                })
              }
              disabled={triggerPhaseMut.isPending}
              className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors border border-blue-200 disabled:opacity-50"
            >
              {t("mi.exec.simulateM2")}
            </button>
            <button
              onClick={() =>
                triggerTNodeMut.mutate({
                  tNode: "T12",
                  projectTitle: "Demo Project",
                  severity: "CRITICAL",
                })
              }
              disabled={triggerTNodeMut.isPending}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
            >
              {t("mi.exec.simulateT12")}
            </button>
            <button
              onClick={() =>
                triggerOKRMut.mutate({
                  objectiveTitle: "Annual Delivery Target",
                  progress: 28,
                  threshold: 40,
                  ownerName: "Sales Director",
                })
              }
              disabled={triggerOKRMut.isPending}
              className="text-xs px-3 py-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition-colors border border-orange-200 disabled:opacity-50"
            >
              {t("mi.exec.simulateOkrLag")}
            </button>
            <button
              onClick={() =>
                triggerQualityMut.mutate({
                  reportTitle: "Ultrasonic Cleaner Leak-8D",
                  severity: "CRITICAL",
                  productName: "GRT-UC200",
                  customerName: "Customer A",
                })
              }
              disabled={triggerQualityMut.isPending}
              className="text-xs px-3 py-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors border border-rose-200 disabled:opacity-50"
            >
              {t("mi.exec.simulate8dEscalation")}
            </button>
            <button
              onClick={() =>
                triggerSupplierMut.mutate({
                  supplierName: "Supplier A",
                  penaltyCount: 5,
                  threshold: 3,
                  latestReason: "Delayed delivery",
                })
              }
              disabled={triggerSupplierMut.isPending}
              className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 transition-colors border border-yellow-200 disabled:opacity-50"
            >
              {t("mi.exec.simulateSupplierBreach")}
            </button>
          </div>
          {/* Error feedback for any failed mutation */}
          {(triggerPhaseMut.isError || triggerTNodeMut.isError || triggerOKRMut.isError || triggerQualityMut.isError || triggerSupplierMut.isError) && (
            <div className="mt-2 px-3 py-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded">
              {t("mi.exec.triggerFailed")}: {triggerPhaseMut.error?.message || triggerTNodeMut.error?.message || triggerOKRMut.error?.message || triggerQualityMut.error?.message || triggerSupplierMut.error?.message}
            </div>
          )}
        </div>

        <div className="p-4">
          {meetings.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {t("mi.exec.noAutoTriggeredMeetings")}
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border"
                >
                  <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {m.title}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                        {m.type}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                          m.status === "UPCOMING"
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : m.status === "ENDED"
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    {m.scheduledStart && (
                      <div className="text-xs text-gray-500">
                        预计: {new Date(m.scheduledStart).toLocaleString("zh-CN")}
                      </div>
                    )}
                    {m.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Annual Summary & Performance Review Prep */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-sm">
              {t("mi.exec.annualSummary")}
            </h3>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 2x2 KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="text-xs text-purple-600 mb-1">{t("mi.exec.okrAchievementRate")}</div>
              <div className="text-xl font-bold text-purple-700">
                {okrDash?.avgProgress ?? 0}%
              </div>
              <div className="mt-1 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${Math.min(100, okrDash?.avgProgress ?? 0)}%`,
                  }}
                />
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-xs text-blue-600 mb-1">{t("mi.exec.objectiveCount")}</div>
              <div className="text-xl font-bold text-blue-700">
                {okrDash?.totalObjectives ?? 0}
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="text-xs text-amber-600 mb-1">{t("mi.exec.triggeredMeetingCount")}</div>
              <div className="text-xl font-bold text-amber-700">
                {stats?.totalTriggered ?? 0}
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="text-xs text-green-600 mb-1">{t("mi.exec.pendingActionItems")}</div>
              <div className="text-xl font-bold text-green-700">
                {stats?.pending ?? 0}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/strategy/okr-matrix"
              className="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors border border-purple-200 inline-flex items-center gap-1"
            >
              {t("mi.exec.viewOkrMatrix")}
              <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
            </Link>
            <button
              onClick={() =>
                triggerPhaseMut.mutate({
                  phase: "ANNUAL_REVIEW",
                  projectTitle: "年度总结",
                  pmName: "管理层",
                })
              }
              disabled={triggerPhaseMut.isPending}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {t("mi.exec.triggerAnnualMeeting")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function MeetingExecutive() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title={t("mi.exec.title")}
        description={t("mi.exec.description")}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">{t("mi.exec.tabOverview")}</TabsTrigger>
          <TabsTrigger value="participants">{t("mi.exec.tabParticipants")}</TabsTrigger>
          <TabsTrigger value="scores">{t("mi.exec.tabScores")}</TabsTrigger>
          <TabsTrigger value="performance">{t("mi.exec.tabPerformance")}</TabsTrigger>
          <TabsTrigger value="department">{t("mi.exec.tabDepartment")}</TabsTrigger>
          <TabsTrigger value="patterns">{t("mi.exec.tabPatterns")}</TabsTrigger>
          <TabsTrigger value="hr-signals">{t("mi.exec.tabHrSignals")}</TabsTrigger>
          <TabsTrigger value="live">{t("mi.exec.tabLive")}</TabsTrigger>
          <TabsTrigger value="cost">{t("mi.exec.tabCost")}</TabsTrigger>
          <TabsTrigger value="action-items">{t("mi.exec.tabActionItems")}</TabsTrigger>
          <TabsTrigger value="topics">{t("mi.exec.tabTopics")}</TabsTrigger>
          <TabsTrigger value="sentiment">{t("mi.exec.tabSentiment")}</TabsTrigger>
          <TabsTrigger value="health">{t("mi.exec.tabHealth")}</TabsTrigger>
          <TabsTrigger value="digest">{t("mi.exec.tabDigest")}</TabsTrigger>
          <TabsTrigger value="roi">{t("mi.exec.tabRoi")}</TabsTrigger>
          <TabsTrigger value="attendee-opt">{t("mi.exec.tabAttendeeOpt")}</TabsTrigger>
          <TabsTrigger value="predictions">{t("mi.exec.tabPredictions")}</TabsTrigger>
          <TabsTrigger value="reports">{t("mi.exec.tabReports")}</TabsTrigger>
          <TabsTrigger value="knowledge">{t("mi.exec.tabKnowledge")}</TabsTrigger>
          <TabsTrigger value="ai-assistant">{t("mi.exec.tabAiAssistant")}</TabsTrigger>
          <TabsTrigger value="workflow">{t("mi.exec.tabWorkflow")}</TabsTrigger>
          <TabsTrigger value="integrations">{t("mi.exec.tabIntegrations")}</TabsTrigger>
          <TabsTrigger value="gamification">{t("mi.exec.tabGamification")}</TabsTrigger>
          <TabsTrigger value="feedback">{t("mi.exec.tabFeedback")}</TabsTrigger>
          <TabsTrigger value="compliance">{t("mi.exec.tabCompliance")}</TabsTrigger>
          <TabsTrigger value="hr-linkage">{t("mi.exec.tabHrLinkage")}</TabsTrigger>
          <TabsTrigger value="api">{t("mi.exec.tabApi")}</TabsTrigger>
          <TabsTrigger value="collaboration">{t("mi.exec.tabCollaboration")}</TabsTrigger>
          <TabsTrigger value="load-wellbeing">{t("mi.exec.tabLoadWellbeing")}</TabsTrigger>
          <TabsTrigger value="recurring-value">{t("mi.exec.tabRecurringValue")}</TabsTrigger>
          <TabsTrigger value="decision-effectiveness">{t("mi.exec.tabDecisionEffectiveness")}</TabsTrigger>
          <TabsTrigger value="agenda-time">{t("mi.exec.tabAgendaTime")}</TabsTrigger>
          <TabsTrigger value="facilitator">{t("mi.exec.tabFacilitator")}</TabsTrigger>
          <TabsTrigger value="ai-performance">{t("mi.exec.tabAiPerformance")}</TabsTrigger>
          <TabsTrigger value="management-rhythm">{t("mi.exec.tabManagementRhythm")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TabErrorBoundary tabName={t("mi.exec.tabOverview")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><OverviewTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="participants">
          <TabErrorBoundary tabName={t("mi.exec.tabParticipants")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><ParticipantsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="scores">
          <TabErrorBoundary tabName={t("mi.exec.tabScores")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><MeetingScoresTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="performance">
          <TabErrorBoundary tabName={t("mi.exec.tabPerformance")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><PerformanceLinkTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="department">
          <TabErrorBoundary tabName={t("mi.exec.tabDepartment")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><DepartmentRollupTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="patterns">
          <TabErrorBoundary tabName={t("mi.exec.tabPatterns")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><MeetingPatternsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="hr-signals">
          <TabErrorBoundary tabName={t("mi.exec.tabHrSignals")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><HrSignalsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="live">
          <TabErrorBoundary tabName={t("mi.exec.tabLive")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><LiveAssistantTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="cost">
          <TabErrorBoundary tabName={t("mi.exec.tabCost")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><MeetingCostTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="action-items">
          <TabErrorBoundary tabName={t("mi.exec.tabActionItems")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><ActionItemTrackerTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="topics">
          <TabErrorBoundary tabName={t("mi.exec.tabTopics")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><TopicContinuityTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="sentiment">
          <TabErrorBoundary tabName={t("mi.exec.tabSentiment")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><SentimentAnalysisTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="health">
          <TabErrorBoundary tabName={t("mi.exec.tabHealth")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><MeetingHealthTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="digest">
          <TabErrorBoundary tabName={t("mi.exec.tabDigest")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><DigestAlertsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="roi">
          <TabErrorBoundary tabName={t("mi.exec.tabRoi")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><MeetingRoiTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="attendee-opt">
          <TabErrorBoundary tabName={t("mi.exec.tabAttendeeOpt")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><AttendeeOptimizationTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="predictions">
          <TabErrorBoundary tabName={t("mi.exec.tabPredictions")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><PredictiveAnalyticsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="reports">
          <TabErrorBoundary tabName={t("mi.exec.tabReports")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><ReportsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="knowledge">
          <TabErrorBoundary tabName={t("mi.exec.tabKnowledge")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><KnowledgeGraphTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="ai-assistant">
          <TabErrorBoundary tabName={t("mi.exec.tabAiAssistant")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><MeetingAssistantTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="workflow">
          <TabErrorBoundary tabName={t("mi.exec.tabWorkflow")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><WorkflowCoachingTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="integrations">
          <TabErrorBoundary tabName={t("mi.exec.tabIntegrations")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><IntegrationSettingsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="gamification">
          <TabErrorBoundary tabName={t("mi.exec.tabGamification")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><GamificationTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="feedback">
          <TabErrorBoundary tabName={t("mi.exec.tabFeedback")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><FeedbackTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="compliance">
          <TabErrorBoundary tabName={t("mi.exec.tabCompliance")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><ComplianceTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="hr-linkage">
          <TabErrorBoundary tabName={t("mi.exec.tabHrLinkage")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><HrPerformanceLinkageTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="api">
          <TabErrorBoundary tabName={t("mi.exec.tabApi")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><MeetingIntelligenceApiTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="collaboration">
          <TabErrorBoundary tabName={t("mi.exec.tabCollaboration")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><CollaborationNetworkTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="load-wellbeing">
          <TabErrorBoundary tabName={t("mi.exec.tabLoadWellbeing")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><MeetingLoadWellbeingTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="recurring-value">
          <TabErrorBoundary tabName={t("mi.exec.tabRecurringValue")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><RecurringMeetingValueTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="decision-effectiveness">
          <TabErrorBoundary tabName={t("mi.exec.tabDecisionEffectiveness")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><DecisionEffectivenessTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="agenda-time">
          <TabErrorBoundary tabName={t("mi.exec.tabAgendaTime")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><AgendaTimeAllocationTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="facilitator">
          <TabErrorBoundary tabName={t("mi.exec.tabFacilitator")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><FacilitatorEffectivenessTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="ai-performance">
          <TabErrorBoundary tabName={t("mi.exec.tabAiPerformance")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><AIPerformanceTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="management-rhythm">
          <TabErrorBoundary tabName={t("mi.exec.tabManagementRhythm")} failedLabel={t("mi.exec.tabLoadFailed")} reloadLabel={t("mi.exec.reload")}><ManagementRhythmTab /></TabErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
