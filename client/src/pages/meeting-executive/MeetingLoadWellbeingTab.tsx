import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, AlertTriangle, BarChart3, Clock, Heart, Loader2, Play, RefreshCw,
  Users, ChevronDown, ChevronUp, Shield, Coffee,
} from "lucide-react";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};
const RISK_PIE_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};
const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};

export function MeetingLoadWellbeingTab() {
  const { t } = useLanguage();
  // Compute load form
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [periodType, setPeriodType] = useState("weekly");

  // Wellbeing assessment
  const [singleEmployeeId, setSingleEmployeeId] = useState("");
  const [batchEmployeeIds, setBatchEmployeeIds] = useState("");

  // Expanded rows
  const [expandedBurnout, setExpandedBurnout] = useState<number | null>(null);
  const [expandedWellbeing, setExpandedWellbeing] = useState<number | null>(null);

  // Queries
  const dashboardQuery = trpc.ime.loadDashboard.useQuery({ periodType });
  const loadDetailsQuery = trpc.ime.participantLoadDetails.useQuery({ periodType, limit: 30 });
  const trendsQuery = trpc.ime.loadTrends.useQuery({ periodType });
  const burnoutQuery = trpc.ime.detectBurnoutRisk.useQuery({ periodType });
  const teamQuery = trpc.ime.teamLoadSummary.useQuery({ periodType });
  const wellbeingQuery = trpc.ime.wellbeingScores.useQuery({});

  // Mutations
  const computeMut = trpc.ime.computeParticipantLoad.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      loadDetailsQuery.refetch();
      trendsQuery.refetch();
      burnoutQuery.refetch();
      teamQuery.refetch();
    },
  });
  const assessMut = trpc.ime.assessWellbeing.useMutation({
    onSuccess: () => { wellbeingQuery.refetch(); setSingleEmployeeId(""); },
  });
  const batchAssessMut = trpc.ime.batchAssessWellbeing.useMutation({
    onSuccess: () => { wellbeingQuery.refetch(); setBatchEmployeeIds(""); },
  });

  const dashboard = dashboardQuery.data as any;
  const loadDetails = (loadDetailsQuery.data || []) as any[];
  const trends = (trendsQuery.data || []) as any[];
  const burnoutData = burnoutQuery.data as any;
  const atRisk = (burnoutData?.atRisk || []) as any[];
  const distribution = burnoutData?.distribution || { critical: 0, high: 0, medium: 0, low: 0 };
  const teamData = (teamQuery.data || []) as any[];
  const wellbeingScores = (wellbeingQuery.data || []) as any[];

  // Pie chart data for risk distribution
  const riskPieData = Object.entries(distribution)
    .filter(([, v]) => Number(v) > 0)
    .map(([name, value]) => ({ name, value: Number(value) }));

  // Pie chart data for wellbeing grade distribution
  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const w of wellbeingScores) {
    const g = (w as any).wellbeing_grade || "C";
    if (gradeDistribution[g] !== undefined) gradeDistribution[g]++;
  }
  const gradePieData = Object.entries(gradeDistribution)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  const GRADE_PIE_COLORS: Record<string, string> = {
    A: "#22c55e", B: "#3b82f6", C: "#eab308", D: "#f97316", F: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Header & Compute Load */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500" />
            {t("meeting.load.title")}
          </CardTitle>
          <CardDescription>{t("meeting.load.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("meeting.load.startDate")}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("meeting.load.endDate")}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("meeting.load.periodType")}</label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("meeting.load.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("meeting.load.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("meeting.load.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => computeMut.mutate({
                periodType,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
              })}
              disabled={computeMut.isPending}
            >
              {computeMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {t("meeting.load.computeLoad")}
            </Button>
          </div>
          {computeMut.data && (
            <p className="text-sm text-green-600">
              {t("meeting.load.computed")} {(computeMut.data as any).computed} {t("meeting.load.employeesData")}
            </p>
          )}
          {computeMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.load.computeFailed")}: {computeMut.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label={t("meeting.load.avgWeeklyHours")}
          value={dashboard ? `${dashboard.avgWeeklyHours}h` : "..."}
          subtitle="Avg Weekly Meeting Hours"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("meeting.load.overloadedCount")}
          value={dashboard?.overloadedCount ?? "..."}
          subtitle="Overloaded Employees"
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={Coffee}
          label={t("meeting.load.avgFocusTime")}
          value={dashboard ? `${dashboard.avgFocusTimeMinutes}min` : "..."}
          subtitle="Avg Focus Time"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Activity}
          label={t("meeting.load.avgLoadScore")}
          value={dashboard?.avgLoadScore ?? "..."}
          subtitle="Avg Load Score"
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Section 3: Participant Load Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("meeting.load.loadRanking")}
          </CardTitle>
          <CardDescription>{t("meeting.load.loadRankingDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadDetails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t("meeting.load.name")}</TableHead>
                  <TableHead>{t("meeting.load.department")}</TableHead>
                  <TableHead className="text-center">{t("meeting.load.meetingCount")}</TableHead>
                  <TableHead className="text-center">{t("meeting.load.totalHours")}</TableHead>
                  <TableHead className="text-center">{t("meeting.load.backToBack")}</TableHead>
                  <TableHead className="text-center">{t("meeting.load.focusTime")}</TableHead>
                  <TableHead className="text-center">{t("meeting.load.loadScoreLabel")}</TableHead>
                  <TableHead className="text-center">{t("meeting.load.riskLevel")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadDetails.map((row: any, i: number) => (
                  <TableRow key={row.id || i}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell className="font-medium">{row.employee_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.department || "—"}</TableCell>
                    <TableCell className="text-center">{row.meeting_count}</TableCell>
                    <TableCell className="text-center">
                      {(Number(row.total_meeting_minutes) / 60).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center">{row.back_to_back_ratio}%</TableCell>
                    <TableCell className="text-center">{row.focus_time_minutes}min</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={Number(row.load_score) >= 60 ? "destructive" : "default"}>
                        {row.load_score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_COLORS[row.risk_level] || "bg-gray-100 text-gray-600"}`}>
                        {row.risk_level}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("meeting.load.noLoadData")}</p>
              <p className="text-sm">{t("meeting.load.pleaseCompute")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Load Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.load.loadTrend")}</CardTitle>
          <CardDescription>{t("meeting.load.loadTrendDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period_start"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => String(v).split("T")[0]}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  labelFormatter={(v) => String(v).split("T")[0]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_load_score"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={t("meeting.load.avgLoadScoreLabel")}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("meeting.load.noTrendData")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Burnout Risk Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {t("meeting.load.riskDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={riskPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {riskPieData.map((entry) => (
                      <Cell key={entry.name} fill={RISK_PIE_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">{t("meeting.load.noRiskData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Burnout Risk Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              {t("meeting.load.burnoutAlerts")}
            </CardTitle>
            <CardDescription>{t("meeting.load.burnoutDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {atRisk.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.load.name")}</TableHead>
                    <TableHead>{t("meeting.load.department")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.loadScoreLabel")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.durationH")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.risk")}</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRisk.map((row: any, i: number) => (
                    <>
                      <TableRow
                        key={row.id || i}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedBurnout(expandedBurnout === i ? null : i)}
                      >
                        <TableCell className="font-medium">{row.employee_name}</TableCell>
                        <TableCell className="text-sm">{row.department || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{row.load_score}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {(Number(row.total_meeting_minutes) / 60).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_COLORS[row.risk_level] || ""}`}>
                            {row.risk_level}
                          </span>
                        </TableCell>
                        <TableCell>
                          {expandedBurnout === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                      </TableRow>
                      {expandedBurnout === i && (
                        <TableRow key={`${i}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2">
                              <div>{t("meeting.load.meetingCount")}: <strong>{row.meeting_count}</strong></div>
                              <div>{t("meeting.load.backToBack")}: <strong>{row.back_to_back_ratio}%</strong></div>
                              <div>{t("meeting.load.focusTime")}: <strong>{row.focus_time_minutes}min</strong></div>
                              <div>{t("meeting.load.meetingDensity")}: <strong>{row.meeting_density}%</strong></div>
                              <div>{t("meeting.load.morningMeetings")}: <strong>{row.meetings_before_noon}</strong></div>
                              <div>{t("meeting.load.afternoonMeetings")}: <strong>{row.meetings_after_noon}</strong></div>
                              <div>{t("meeting.load.collaborators")}: <strong>{row.unique_collaborators}</strong></div>
                              <div>{t("meeting.load.longestFocus")}: <strong>{row.longest_focus_block}min</strong></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">{t("meeting.load.noBurnoutAlerts")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 6: Team Load Summary Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("meeting.load.teamOverview")}
          </CardTitle>
          <CardDescription>{t("meeting.load.teamOverviewDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {teamData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg_load_score" fill="#6366f1" name={t("meeting.load.avgLoadScoreLabel")} />
                <Bar dataKey="overloaded_percent" fill="#ef4444" name={t("meeting.load.overloadedPercent")} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("meeting.load.noTeamData")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Well-being Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            {t("meeting.load.wellbeingTitle")}
          </CardTitle>
          <CardDescription>{t("meeting.load.wellbeingDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single employee assessment */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-sm space-y-1">
              <label className="text-xs text-muted-foreground">{t("meeting.load.employeeId")}</label>
              <Input
                placeholder={t("meeting.load.enterEmployeeId")}
                value={singleEmployeeId}
                onChange={(e) => setSingleEmployeeId(e.target.value)}
              />
            </div>
            <Button
              onClick={() => assessMut.mutate({ employeeId: singleEmployeeId.trim() })}
              disabled={assessMut.isPending || !singleEmployeeId.trim()}
            >
              {assessMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Heart className="h-4 w-4 mr-2" />
              )}
              {t("meeting.load.assessWellbeing")}
            </Button>
          </div>
          {assessMut.data && (
            <div className="text-sm p-3 bg-muted/50 rounded space-y-1">
              <p>
                <strong>{(assessMut.data as any).employeeName}</strong> —
                {t("meeting.load.scoreLabel")}: <Badge className={GRADE_COLORS[(assessMut.data as any).wellbeingGrade] || ""}>{(assessMut.data as any).wellbeingScore}</Badge>
                {t("meeting.load.gradeLabel")}: <span className={`px-1.5 py-0.5 rounded text-xs ${GRADE_COLORS[(assessMut.data as any).wellbeingGrade] || ""}`}>{(assessMut.data as any).wellbeingGrade}</span>
              </p>
              <p className="text-muted-foreground">{(assessMut.data as any).aiNarrative}</p>
            </div>
          )}
          {assessMut.isError && (
            <p className="text-sm text-red-500">{t("meeting.load.assessFailed")}: {assessMut.error.message}</p>
          )}

          {/* Batch assessment */}
          <div className="border-t pt-4 space-y-3">
            <label className="text-sm font-medium">{t("meeting.load.batchAssess")}</label>
            <div className="flex gap-3">
              <Input
                placeholder={t("meeting.load.batchPlaceholder")}
                value={batchEmployeeIds}
                onChange={(e) => setBatchEmployeeIds(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  const ids = batchEmployeeIds.split(",").map((s) => s.trim()).filter(Boolean);
                  if (ids.length > 0) batchAssessMut.mutate({ employeeIds: ids });
                }}
                disabled={batchAssessMut.isPending || !batchEmployeeIds.trim()}
                variant="outline"
              >
                {batchAssessMut.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t("meeting.load.batchAssessBtn")}
              </Button>
            </div>
            {batchAssessMut.data && (
              <p className="text-sm text-green-600">
                {t("meeting.load.assessed")} {(batchAssessMut.data as any).assessed} {t("meeting.load.assessedSuffix")},
                {t("meeting.load.failed")} {(batchAssessMut.data as any).errors} {t("meeting.load.assessedSuffix")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 8: Well-being Scores Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.load.gradeDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {gradePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={gradePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {gradePieData.map((entry) => (
                      <Cell key={entry.name} fill={GRADE_PIE_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">{t("meeting.load.noAssessData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Well-being Scores Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              {t("meeting.load.wellbeingScoresList")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wellbeingScores.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.load.name")}</TableHead>
                    <TableHead>{t("meeting.load.department")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.scoreLabel")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.gradeLabel")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.dimLoad")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.dimBalance")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.dimCollaboration")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.dimFocus")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.dimEfficiency")}</TableHead>
                    <TableHead className="text-center">{t("meeting.load.dimTrend")}</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wellbeingScores.map((w: any, i: number) => (
                    <>
                      <TableRow
                        key={w.id || i}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedWellbeing(expandedWellbeing === i ? null : i)}
                      >
                        <TableCell className="font-medium">{w.employee_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{w.department || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={Number(w.wellbeing_score) >= 60 ? "default" : "destructive"}>
                            {w.wellbeing_score}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${GRADE_COLORS[w.wellbeing_grade] || ""}`}>
                            {w.wellbeing_grade}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm">{w.meeting_load_dimension}</TableCell>
                        <TableCell className="text-center text-sm">{w.schedule_balance_dimension}</TableCell>
                        <TableCell className="text-center text-sm">{w.collaboration_diversity_dimension}</TableCell>
                        <TableCell className="text-center text-sm">{w.focus_time_dimension}</TableCell>
                        <TableCell className="text-center text-sm">{w.meeting_efficiency_dimension}</TableCell>
                        <TableCell className="text-center text-sm">{w.workload_trend_dimension}</TableCell>
                        <TableCell>
                          {expandedWellbeing === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                      </TableRow>
                      {expandedWellbeing === i && (
                        <TableRow key={`wb-${i}-detail`}>
                          <TableCell colSpan={11} className="bg-muted/30">
                            <div className="space-y-3 p-3">
                              {/* AI Narrative */}
                              {w.ai_narrative && (
                                <div>
                                  <h4 className="text-sm font-medium mb-1">{t("meeting.load.aiAnalysis")}</h4>
                                  <p className="text-sm text-muted-foreground">{w.ai_narrative}</p>
                                </div>
                              )}
                              {/* Risk Factors */}
                              {(() => {
                                try {
                                  const factors = JSON.parse(w.risk_factors || "[]");
                                  if (factors.length > 0) {
                                    return (
                                      <div>
                                        <h4 className="text-sm font-medium mb-1">{t("meeting.load.riskFactors")}</h4>
                                        <div className="flex flex-wrap gap-1">
                                          {factors.map((f: string, fi: number) => (
                                            <Badge key={fi} variant="outline" className="text-xs">{f}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                } catch { return null; }
                              })()}
                              {/* Recommendations */}
                              {(() => {
                                try {
                                  const recs = JSON.parse(w.recommendations || "[]");
                                  if (recs.length > 0) {
                                    return (
                                      <div>
                                        <h4 className="text-sm font-medium mb-1">{t("meeting.load.recommendations")}</h4>
                                        <ul className="space-y-1">
                                          {recs.map((r: string, ri: number) => (
                                            <li key={ri} className="text-sm text-muted-foreground">• {r}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  }
                                  return null;
                                } catch { return null; }
                              })()}
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
                <Heart className="h-12 w-12 mb-3 opacity-30" />
                <p>{t("meeting.load.noWellbeingData")}</p>
                <p className="text-sm">{t("meeting.load.pleaseAssess")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
