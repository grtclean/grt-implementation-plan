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
          label="已分析会议"
          value={isLoading ? "..." : stats?.analyzedMeetings ?? 0}
          subtitle="Total Meetings Analyzed"
        />
        <StatCard
          icon={Target}
          label="平均效能"
          value={isLoading ? "..." : `${stats?.avgEffectiveness ?? 0}%`}
          subtitle="Avg Effectiveness"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Award}
          label="最高贡献者"
          value={isLoading ? "..." : (topContributors[0]?.employee_name ?? "—")}
          subtitle="Top Contributor"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          icon={Users}
          label="活跃参会者"
          value={isLoading ? "..." : stats?.activeParticipants ?? 0}
          subtitle="Active Participants"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Effectiveness Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">会议效能趋势</CardTitle>
          <CardDescription>Meeting Effectiveness Trend (recent)</CardDescription>
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
                  name="效能分"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p>暂无分析数据</p>
              <p className="text-sm">请先对会议进行AI分析</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 10 Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">贡献排行榜 Top 10</CardTitle>
          <CardDescription>Top contributors by average score</CardDescription>
        </CardHeader>
        <CardContent>
          {topContributors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead className="text-center">参与会议</TableHead>
                  <TableHead className="text-center">平均得分</TableHead>
                  <TableHead className="text-center">决策数</TableHead>
                  <TableHead className="text-center">行动项</TableHead>
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
            <p className="text-center py-6 text-muted-foreground">暂无贡献数据</p>
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
      { dimension: "发言时长", value: Math.min(100, (totals.speaking / n) / 3) },
      { dimension: "决策力", value: Math.min(100, (totals.decisions / n) * 25) },
      { dimension: "行动力", value: Math.min(100, (totals.actions / n) * 20) },
      { dimension: "参与度", value: Math.min(100, (totals.interventions / n) * 10) },
      { dimension: "综合得分", value: totals.score / n },
    ];
    if (engTotals.count > 0) {
      base.push(
        { dimension: "贡献价值", value: (engTotals.cv / engTotals.count) * 10 },
        { dimension: "逻辑简洁", value: (engTotals.lc / engTotals.count) * 10 },
        { dimension: "建设性", value: (engTotals.co / engTotals.count) * 10 },
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
            参与度分析
          </CardTitle>
          <CardDescription>输入会议ID分析参会者的贡献价值、逻辑简洁度和建设性</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="输入会议ID..."
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
              分析参与度
            </Button>
          </div>

          {engagementParticipants.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead className="text-center">角色</TableHead>
                    <TableHead className="text-center">参与度</TableHead>
                    <TableHead className="text-center">贡献值</TableHead>
                    <TableHead className="text-center">逻辑简洁</TableHead>
                    <TableHead className="text-center">建设性</TableHead>
                    <TableHead>关键贡献</TableHead>
                    <TableHead>行为标签</TableHead>
                    <TableHead>辅导建议</TableHead>
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
            <p className="text-sm text-red-500">分析失败: {engagementMutation.error?.message ?? "Unknown error"}</p>
          )}
        </CardContent>
      </Card>

      {/* Employee Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder="输入员工ID或姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setEmployeeId(searchTerm)} disabled={!searchTerm}>
              <Users className="h-4 w-4 mr-2" />
              查询
            </Button>
          </div>
        </CardContent>
      </Card>

      {employeeId && trendData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">能力雷达图</CardTitle>
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
                    name="得分"
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Contribution Breakdown Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">贡献明细</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="decision_count" fill="#6366f1" name="决策" />
                  <Bar dataKey="action_item_count" fill="#22c55e" name="行动项" />
                  <Bar dataKey="intervention_count" fill="#f59e0b" name="发言次数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Score Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">贡献分趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="contribution_score" stroke="#6366f1" strokeWidth={2} name="贡献分" />
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
                  AI 分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> 优势
                  </h4>
                  <ul className="space-y-1">
                    {latestAnalysis.strengths?.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> 改进方向
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
                      <MessageSquare className="h-3.5 w-3.5 text-purple-500" /> 关键发言
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
                      <Target className="h-3.5 w-3.5 text-indigo-500" /> 参与度评估
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">贡献价值</div>
                        <div className={`font-semibold ${scoreColor(latestAnalysis.engagement.contribution_value)}`}>
                          {Number(latestAnalysis.engagement.contribution_value).toFixed(1)}
                        </div>
                      </div>
                      <div className="text-center p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">逻辑简洁</div>
                        <div className={`font-semibold ${scoreColor(latestAnalysis.engagement.logic_conciseness)}`}>
                          {Number(latestAnalysis.engagement.logic_conciseness).toFixed(1)}
                        </div>
                      </div>
                      <div className="text-center p-2 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">建设性</div>
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
            <p>该员工暂无贡献分析数据</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>请输入员工ID查询贡献分析</p>
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: meetings, isLoading } = trpc.ime.effectivenessList.useQuery({ limit: 50 });
  const meetingList = (meetings ?? []) as any[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">会议效能评分列表</CardTitle>
          <CardDescription>Click on a meeting to see detailed scores</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">加载中...</p>
          ) : meetingList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会议名称</TableHead>
                  <TableHead className="text-center">日期</TableHead>
                  <TableHead className="text-center">参与人数</TableHead>
                  <TableHead className="text-center">总分</TableHead>
                  <TableHead className="text-center">目标达成</TableHead>
                  <TableHead className="text-center">参与均衡</TableHead>
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
                              <h4 className="text-sm font-medium mb-3">维度分布</h4>
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: "目标达成", value: Number(m.objective_achievement) || 0 },
                                      { name: "参与均衡", value: Number(m.participation_balance) || 0 },
                                      { name: "决策清晰", value: Number(m.decision_clarity) || 0 },
                                      { name: "可执行成果", value: Number(m.actionable_outcomes) || 0 },
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
                                AI 效能叙述
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {m.ai_narrative || "暂无AI分析叙述"}
                              </p>
                              {m.objective && (
                                <div className="mt-3">
                                  <span className="text-xs font-medium text-muted-foreground">会议目标: </span>
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
              <p>暂无会议效能评分</p>
              <p className="text-sm">请先对会议进行AI分析</p>
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
            绩效关联说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>会议贡献分析结果会自动关联到员工绩效追踪系统 (Performance Trace)。</p>
            <p>流程: 会议内容块 → AI贡献分析 → 贡献评分 → 绩效追踪记录 (sourceType: meeting_contribution)</p>
          </div>
        </CardContent>
      </Card>

      {/* Batch Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            批量分析
          </CardTitle>
          <CardDescription>输入会议ID(逗号分隔)进行批量AI分析与绩效关联</CardDescription>
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
              批量分析
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
          <CardTitle className="text-base">贡献 → 绩效追踪映射</CardTitle>
          <CardDescription>已分析员工的会议贡献评分与绩效关联</CardDescription>
        </CardHeader>
        <CardContent>
          {topContributors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead className="text-center">参与会议</TableHead>
                  <TableHead className="text-center">平均贡献分</TableHead>
                  <TableHead className="text-center">决策数</TableHead>
                  <TableHead className="text-center">行动项</TableHead>
                  <TableHead className="text-center">绩效指标</TableHead>
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
            <p className="text-center py-6 text-muted-foreground">暂无绩效关联数据</p>
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
          label="评估员工"
          value={totalEvaluated}
          subtitle="Employees Evaluated"
        />
        <StatCard
          icon={Target}
          label="平均会议分"
          value={`${avgScore}`}
          subtitle="Avg Meeting Score"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={CheckCircle2}
          label="行动项完成率"
          value={`${completionRate}%`}
          subtitle="Action Item Completion"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={Award}
          label="最佳员工"
          value={topName}
          subtitle={`${topScore} pts`}
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
            Meeting ROI Pipeline — 声纹雷达 + 协作画布 → 绩效引擎
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
              <p className="text-sm">暂无 ROI 数据</p>
              <p className="text-xs mt-1">请先在 Meeting Hub 中运行声纹分析并在协作画布中提取 Action Items</p>
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
  { children: ReactNode; tabName: string },
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
            <p className="font-medium">"{this.props.tabName}" 加载失败</p>
            <p className="text-sm text-muted-foreground mt-1">
              {this.state.error?.message}
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4"
            >
              重新加载
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
            <h3 className="font-semibold text-sm">管理节奏闭环</h3>
            <span className="text-xs text-gray-400">Strategy OKR → Automation → Meeting → Action → OKR Update</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {[
              { icon: "🎯", label: "战略OKR", desc: "公司/BU/部门目标", color: "bg-purple-50 border-purple-200 text-purple-700" },
              { icon: "⚡", label: "自动化规则", desc: `${5}条规则引擎`, color: "bg-amber-50 border-amber-200 text-amber-700" },
              { icon: "📅", label: "触发会议", desc: `${stats?.totalTriggered ?? 0}场已触发`, color: "bg-blue-50 border-blue-200 text-blue-700" },
              { icon: "✅", label: "行动项", desc: `${stats?.pending ?? 0}项待处理`, color: "bg-green-50 border-green-200 text-green-700" },
              { icon: "📊", label: "OKR更新", desc: `达成率 ${okrDash?.avgProgress ?? 0}%`, color: "bg-purple-50 border-purple-200 text-purple-700" },
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
            闭环逻辑: OKR目标滞后 / T节点异常 / 质量问题 / 供应商违约 → 自动创建会议 → 产出行动项 → 回写OKR进度
          </div>
        </div>
      </div>

      {/* Section 1: Triggered Meetings */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">自动触发会议</h3>
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
              模拟M2签约触发
            </button>
            <button
              onClick={() =>
                triggerTNodeMut.mutate({
                  tNode: "T12",
                  projectTitle: "喷淋清洗机-A项目",
                  severity: "CRITICAL",
                })
              }
              disabled={triggerTNodeMut.isPending}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
            >
              模拟T12异常触发
            </button>
            <button
              onClick={() =>
                triggerOKRMut.mutate({
                  objectiveTitle: "年度交付100台清洗设备",
                  progress: 28,
                  threshold: 40,
                  ownerName: "销售部总监",
                })
              }
              disabled={triggerOKRMut.isPending}
              className="text-xs px-3 py-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition-colors border border-orange-200 disabled:opacity-50"
            >
              模拟OKR滞后
            </button>
            <button
              onClick={() =>
                triggerQualityMut.mutate({
                  reportTitle: "超声波清洗机泄漏-8D",
                  severity: "CRITICAL",
                  productName: "GRT-UC200超声波清洗机",
                  customerName: "比亚迪半导体",
                })
              }
              disabled={triggerQualityMut.isPending}
              className="text-xs px-3 py-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors border border-rose-200 disabled:opacity-50"
            >
              模拟8D升级
            </button>
            <button
              onClick={() =>
                triggerSupplierMut.mutate({
                  supplierName: "华东不锈钢",
                  penaltyCount: 5,
                  threshold: 3,
                  latestReason: "不锈钢板材到货延迟7天",
                })
              }
              disabled={triggerSupplierMut.isPending}
              className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 transition-colors border border-yellow-200 disabled:opacity-50"
            >
              模拟供应商违约
            </button>
          </div>
          {/* Error feedback for any failed mutation */}
          {(triggerPhaseMut.isError || triggerTNodeMut.isError || triggerOKRMut.isError || triggerQualityMut.isError || triggerSupplierMut.isError) && (
            <div className="mt-2 px-3 py-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded">
              触发失败: {triggerPhaseMut.error?.message || triggerTNodeMut.error?.message || triggerOKRMut.error?.message || triggerQualityMut.error?.message || triggerSupplierMut.error?.message}
            </div>
          )}
        </div>

        <div className="p-4">
          {meetings.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              暂无自动触发会议 — 点击上方按钮模拟
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
              年度总结暨绩效评审准备
            </h3>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 2x2 KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="text-xs text-purple-600 mb-1">OKR达成率</div>
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
              <div className="text-xs text-blue-600 mb-1">目标数量</div>
              <div className="text-xl font-bold text-blue-700">
                {okrDash?.totalObjectives ?? 0}
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="text-xs text-amber-600 mb-1">已触发会议数</div>
              <div className="text-xl font-bold text-amber-700">
                {stats?.totalTriggered ?? 0}
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="text-xs text-green-600 mb-1">待处理行动项</div>
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
              查看OKR矩阵
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
              触发年度总结会议
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
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="会议效能分析"
        description="G-IME: Intelligent Meeting Executive — 参会者贡献分析与会议效能看板"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="participants">参会者分析</TabsTrigger>
          <TabsTrigger value="scores">会议效能</TabsTrigger>
          <TabsTrigger value="performance">绩效关联</TabsTrigger>
          <TabsTrigger value="department">部门分析</TabsTrigger>
          <TabsTrigger value="patterns">会议模式</TabsTrigger>
          <TabsTrigger value="hr-signals">HR信号</TabsTrigger>
          <TabsTrigger value="live">实时助手</TabsTrigger>
          <TabsTrigger value="cost">会议成本</TabsTrigger>
          <TabsTrigger value="action-items">行动项追踪</TabsTrigger>
          <TabsTrigger value="topics">议题追踪</TabsTrigger>
          <TabsTrigger value="sentiment">情感分析</TabsTrigger>
          <TabsTrigger value="health">健康度</TabsTrigger>
          <TabsTrigger value="digest">摘要警报</TabsTrigger>
          <TabsTrigger value="roi">ROI分析</TabsTrigger>
          <TabsTrigger value="attendee-opt">参会优化</TabsTrigger>
          <TabsTrigger value="predictions">预测分析</TabsTrigger>
          <TabsTrigger value="reports">报告导出</TabsTrigger>
          <TabsTrigger value="knowledge">知识图谱</TabsTrigger>
          <TabsTrigger value="ai-assistant">AI助手</TabsTrigger>
          <TabsTrigger value="workflow">自动化教练</TabsTrigger>
          <TabsTrigger value="integrations">集成设置</TabsTrigger>
          <TabsTrigger value="gamification">游戏化</TabsTrigger>
          <TabsTrigger value="feedback">反馈改进</TabsTrigger>
          <TabsTrigger value="compliance">合规治理</TabsTrigger>
          <TabsTrigger value="hr-linkage">HR绩效联动</TabsTrigger>
          <TabsTrigger value="api">Intelligence API</TabsTrigger>
          <TabsTrigger value="collaboration">协作网络</TabsTrigger>
          <TabsTrigger value="load-wellbeing">负荷健康</TabsTrigger>
          <TabsTrigger value="recurring-value">周期会议</TabsTrigger>
          <TabsTrigger value="decision-effectiveness">决策效能</TabsTrigger>
          <TabsTrigger value="agenda-time">议程时间</TabsTrigger>
          <TabsTrigger value="facilitator">引导效能</TabsTrigger>
          <TabsTrigger value="ai-performance">AI绩效引擎</TabsTrigger>
          <TabsTrigger value="management-rhythm">管理节奏</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TabErrorBoundary tabName="概览"><OverviewTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="participants">
          <TabErrorBoundary tabName="参会者分析"><ParticipantsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="scores">
          <TabErrorBoundary tabName="会议效能"><MeetingScoresTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="performance">
          <TabErrorBoundary tabName="绩效关联"><PerformanceLinkTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="department">
          <TabErrorBoundary tabName="部门分析"><DepartmentRollupTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="patterns">
          <TabErrorBoundary tabName="会议模式"><MeetingPatternsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="hr-signals">
          <TabErrorBoundary tabName="HR信号"><HrSignalsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="live">
          <TabErrorBoundary tabName="实时助手"><LiveAssistantTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="cost">
          <TabErrorBoundary tabName="会议成本"><MeetingCostTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="action-items">
          <TabErrorBoundary tabName="行动项追踪"><ActionItemTrackerTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="topics">
          <TabErrorBoundary tabName="议题追踪"><TopicContinuityTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="sentiment">
          <TabErrorBoundary tabName="情感分析"><SentimentAnalysisTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="health">
          <TabErrorBoundary tabName="健康度"><MeetingHealthTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="digest">
          <TabErrorBoundary tabName="摘要警报"><DigestAlertsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="roi">
          <TabErrorBoundary tabName="ROI分析"><MeetingRoiTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="attendee-opt">
          <TabErrorBoundary tabName="参会优化"><AttendeeOptimizationTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="predictions">
          <TabErrorBoundary tabName="预测分析"><PredictiveAnalyticsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="reports">
          <TabErrorBoundary tabName="报告导出"><ReportsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="knowledge">
          <TabErrorBoundary tabName="知识图谱"><KnowledgeGraphTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="ai-assistant">
          <TabErrorBoundary tabName="AI助手"><MeetingAssistantTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="workflow">
          <TabErrorBoundary tabName="自动化教练"><WorkflowCoachingTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="integrations">
          <TabErrorBoundary tabName="集成设置"><IntegrationSettingsTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="gamification">
          <TabErrorBoundary tabName="游戏化"><GamificationTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="feedback">
          <TabErrorBoundary tabName="反馈改进"><FeedbackTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="compliance">
          <TabErrorBoundary tabName="合规治理"><ComplianceTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="hr-linkage">
          <TabErrorBoundary tabName="HR绩效联动"><HrPerformanceLinkageTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="api">
          <TabErrorBoundary tabName="Intelligence API"><MeetingIntelligenceApiTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="collaboration">
          <TabErrorBoundary tabName="协作网络"><CollaborationNetworkTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="load-wellbeing">
          <TabErrorBoundary tabName="负荷健康"><MeetingLoadWellbeingTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="recurring-value">
          <TabErrorBoundary tabName="周期会议"><RecurringMeetingValueTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="decision-effectiveness">
          <TabErrorBoundary tabName="决策效能"><DecisionEffectivenessTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="agenda-time">
          <TabErrorBoundary tabName="议程时间"><AgendaTimeAllocationTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="facilitator">
          <TabErrorBoundary tabName="引导效能"><FacilitatorEffectivenessTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="ai-performance">
          <TabErrorBoundary tabName="AI绩效引擎"><AIPerformanceTab /></TabErrorBoundary>
        </TabsContent>

        <TabsContent value="management-rhythm">
          <TabErrorBoundary tabName="管理节奏"><ManagementRhythmTab /></TabErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
