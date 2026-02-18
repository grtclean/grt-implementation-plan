import { useState } from "react";
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
  Clock,
  MessageSquare,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  Link2,
  Building2,
  Search,
  UserCheck,
  Radio,
  Heart,
  Activity,
  Bell,
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
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ============================================================================
// Tab 1: Overview
// ============================================================================

function OverviewTab() {
  const { data: dashboard, isLoading } = trpc.ime.dashboard.useQuery({});
  const effectivenessQuery = trpc.ime.effectivenessList.useQuery({ limit: 30 });

  const stats = dashboard?.stats;
  const topContributors = (dashboard?.topContributors ?? []) as any[];
  const trend = (dashboard?.effectivenessTrend ?? []) as any[];

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
            <p className="text-sm text-red-500">分析失败: {engagementMutation.error.message}</p>
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
                    {latestAnalysis.keyQuotes.map((q: string, i: number) => (
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
                  <>
                    <TableRow
                      key={m.meeting_id}
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
                      <TableRow key={`${m.meeting_id}-detail`}>
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
                  </>
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
          {batchMutation.data && (
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
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="participants">
          <ParticipantsTab />
        </TabsContent>

        <TabsContent value="scores">
          <MeetingScoresTab />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceLinkTab />
        </TabsContent>

        <TabsContent value="department">
          <DepartmentRollupTab />
        </TabsContent>

        <TabsContent value="patterns">
          <MeetingPatternsTab />
        </TabsContent>

        <TabsContent value="hr-signals">
          <HrSignalsTab />
        </TabsContent>

        <TabsContent value="live">
          <LiveAssistantTab />
        </TabsContent>

        <TabsContent value="cost">
          <MeetingCostTab />
        </TabsContent>

        <TabsContent value="action-items">
          <ActionItemTrackerTab />
        </TabsContent>

        <TabsContent value="topics">
          <TopicContinuityTab />
        </TabsContent>

        <TabsContent value="sentiment">
          <SentimentAnalysisTab />
        </TabsContent>

        <TabsContent value="health">
          <MeetingHealthTab />
        </TabsContent>

        <TabsContent value="digest">
          <DigestAlertsTab />
        </TabsContent>

        <TabsContent value="roi">
          <MeetingRoiTab />
        </TabsContent>

        <TabsContent value="attendee-opt">
          <AttendeeOptimizationTab />
        </TabsContent>

        <TabsContent value="predictions">
          <PredictiveAnalyticsTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeGraphTab />
        </TabsContent>

        <TabsContent value="ai-assistant">
          <MeetingAssistantTab />
        </TabsContent>

        <TabsContent value="workflow">
          <WorkflowCoachingTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationSettingsTab />
        </TabsContent>

        <TabsContent value="gamification">
          <GamificationTab />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackTab />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>

        <TabsContent value="hr-linkage">
          <HrPerformanceLinkageTab />
        </TabsContent>

        <TabsContent value="api">
          <MeetingIntelligenceApiTab />
        </TabsContent>

        <TabsContent value="collaboration">
          <CollaborationNetworkTab />
        </TabsContent>

        <TabsContent value="load-wellbeing">
          <MeetingLoadWellbeingTab />
        </TabsContent>

        <TabsContent value="recurring-value">
          <RecurringMeetingValueTab />
        </TabsContent>

        <TabsContent value="decision-effectiveness">
          <DecisionEffectivenessTab />
        </TabsContent>

        <TabsContent value="agenda-time">
          <AgendaTimeAllocationTab />
        </TabsContent>

        <TabsContent value="facilitator">
          <FacilitatorEffectivenessTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
