import { useState } from "react";
import {
  DollarSign,
  RefreshCw,
  TrendingUp,
  Award,
  Target,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#6366f1",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

const GRADE_LABEL_KEYS: Record<string, string> = {
  A: "meeting.roi.gradeExcellent",
  B: "meeting.roi.gradeGood",
  C: "meeting.roi.gradeAverage",
  D: "meeting.roi.gradePoor",
  F: "meeting.roi.gradeVeryPoor",
};

const OUTCOME_TYPE_KEYS: Record<string, string> = {
  decision: "meeting.roi.outcomeDecision",
  deliverable: "meeting.roi.outcomeDeliverable",
  resolved_issue: "meeting.roi.outcomeResolvedIssue",
};

const OUTCOME_VALUE_KEYS: Record<string, string> = {
  high: "meeting.roi.valueHigh",
  medium: "meeting.roi.valueMedium",
  low: "meeting.roi.valueLow",
};

export function MeetingRoiTab() {
  const { t } = useLanguage();
  const [meetingId, setMeetingId] = useState("");
  const [batchIds, setBatchIds] = useState("");

  const computeMutation = trpc.ime.computeRoi.useMutation();
  const batchMutation = trpc.ime.batchComputeRoi.useMutation();
  const { data: dashboard, isLoading } = trpc.ime.roiDashboard.useQuery({});

  const stats = dashboard?.stats;
  const gradeDistribution = (dashboard?.gradeDistribution ?? []) as any[];
  const bestRoi = (dashboard?.bestRoi ?? []) as any[];
  const worstRoi = (dashboard?.worstRoi ?? []) as any[];
  const departmentComparison = (dashboard?.departmentComparison ?? []) as any[];
  const monthlyTrend = (dashboard?.monthlyTrend ?? []) as any[];
  const scatterData = (dashboard?.scatterData ?? []) as any[];

  const roiResult = computeMutation.data as any;

  const handleCompute = () => {
    if (!meetingId.trim()) return;
    computeMutation.mutate({ meetingId: meetingId.trim() });
  };

  const handleBatchCompute = () => {
    const ids = batchIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    batchMutation.mutate({ meetingIds: ids });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("meeting.roi.title")}
          </CardTitle>
          <CardDescription>{t("meeting.roi.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t("meeting.roi.enterMeetingId")}
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleCompute} disabled={computeMutation.isPending}>
              {computeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
              {t("meeting.roi.computeRoi")}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t("meeting.roi.batchPlaceholder")}
              value={batchIds}
              onChange={(e) => setBatchIds(e.target.value)}
              className="max-w-md"
            />
            <Button variant="outline" onClick={handleBatchCompute} disabled={batchMutation.isPending}>
              {batchMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("meeting.roi.batchCompute")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single meeting result */}
      {roiResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {t("meeting.roi.analysisResult")}
              <Badge
                className="ml-2 text-lg px-3"
                style={{ backgroundColor: GRADE_COLORS[roiResult.roiGrade] || "#6366f1" }}
              >
                {roiResult.roiGrade} — {t(GRADE_LABEL_KEYS[roiResult.roiGrade] || "meeting.roi.gradeAverage")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{roiResult.outcomeScore}</div>
                <div className="text-sm text-muted-foreground">{t("meeting.roi.outcomeScore")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">¥{roiResult.totalCost}</div>
                <div className="text-sm text-muted-foreground">{t("meeting.roi.totalCost")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{roiResult.decisionCount}</div>
                <div className="text-sm text-muted-foreground">{t("meeting.roi.decisionCount")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{roiResult.completedActionCount}/{roiResult.actionItemCount}</div>
                <div className="text-sm text-muted-foreground">{t("meeting.roi.completedActions")}</div>
              </div>
            </div>
            {roiResult.outcomes?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">{t("meeting.roi.outcomeList")}</h4>
                <div className="space-y-1">
                  {roiResult.outcomes.map((o: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant={o.value === "high" ? "default" : "outline"} className="text-xs">
                        {t(OUTCOME_TYPE_KEYS[o.type] || "meeting.roi.outcomeDecision")}
                      </Badge>
                      <span>{o.description}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">{t(OUTCOME_VALUE_KEYS[o.value] || "meeting.roi.valueLow")}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {roiResult.aiNarrative && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">{roiResult.aiNarrative}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label={t("meeting.roi.analyzedMeetings")} value={stats?.totalAnalyzed ?? 0} loading={isLoading} />
        <StatCard icon={Award} label={t("meeting.roi.avgRoiScore")} value={stats?.avgScore ?? 0} loading={isLoading} />
        <StatCard icon={DollarSign} label={t("meeting.roi.avgDecisionCost")} value={`¥${stats?.avgCostPerDecision ?? 0}`} loading={isLoading} />
        <StatCard icon={TrendingUp} label={t("meeting.roi.totalInvestment")} value={`¥${stats?.totalCost ?? 0}`} loading={isLoading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Grade distribution pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.roi.gradeDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80} label={({ grade, count }: any) => `${grade}: ${count}`}>
                    {gradeDistribution.map((entry: any, index: number) => (
                      <Cell key={index} fill={GRADE_COLORS[entry.grade] || "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-6 text-muted-foreground">{t("meeting.roi.noData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly ROI trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.roi.monthlyTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg_score" name={t("meeting.roi.avgScore")} stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-6 text-muted-foreground">{t("meeting.roi.noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best & worst ROI tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-600">{t("meeting.roi.bestTop5")}</CardTitle>
          </CardHeader>
          <CardContent>
            {bestRoi.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.roi.thMeeting")}</TableHead>
                    <TableHead className="text-center">{t("meeting.roi.thScore")}</TableHead>
                    <TableHead className="text-center">{t("meeting.roi.thGrade")}</TableHead>
                    <TableHead className="text-right">{t("meeting.roi.thCost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bestRoi.map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[200px] truncate">{m.meeting_title || m.meeting_id}</TableCell>
                      <TableCell className="text-center"><Badge>{Math.round(Number(m.outcome_score))}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Badge style={{ backgroundColor: GRADE_COLORS[m.roi_grade] }}>{m.roi_grade}</Badge>
                      </TableCell>
                      <TableCell className="text-right">¥{Math.round(Number(m.total_cost))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-6 text-muted-foreground">{t("meeting.roi.noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600">{t("meeting.roi.worstTop5")}</CardTitle>
          </CardHeader>
          <CardContent>
            {worstRoi.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("meeting.roi.thMeeting")}</TableHead>
                    <TableHead className="text-center">{t("meeting.roi.thScore")}</TableHead>
                    <TableHead className="text-center">{t("meeting.roi.thGrade")}</TableHead>
                    <TableHead className="text-right">{t("meeting.roi.thCost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worstRoi.map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[200px] truncate">{m.meeting_title || m.meeting_id}</TableCell>
                      <TableCell className="text-center"><Badge variant="destructive">{Math.round(Number(m.outcome_score))}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Badge style={{ backgroundColor: GRADE_COLORS[m.roi_grade] }}>{m.roi_grade}</Badge>
                      </TableCell>
                      <TableCell className="text-right">¥{Math.round(Number(m.total_cost))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-6 text-muted-foreground">{t("meeting.roi.noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.roi.deptComparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          {departmentComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg_score" name={t("meeting.roi.avgScore")} fill="#6366f1" />
                <Bar dataKey="avg_cost_per_decision" name={t("meeting.roi.avgDecisionCost")} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-6 text-muted-foreground">{t("meeting.roi.noDeptData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Cost vs Outcome scatter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.roi.costVsOutcome")}</CardTitle>
        </CardHeader>
        <CardContent>
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cost" name={t("meeting.roi.costAxis")} unit="¥" type="number" />
                <YAxis dataKey="score" name={t("meeting.roi.scoreAxis")} type="number" />
                <ZAxis dataKey="participants" name={t("meeting.roi.participantsAxis")} range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name={t("meeting.roi.scatterMeeting")} data={scatterData} fill="#6366f1" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-6 text-muted-foreground">{t("meeting.roi.noData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Batch result */}
      {batchMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.roi.batchResult")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{t("meeting.roi.processed")} {(batchMutation.data as any).processed} {t("meeting.roi.meetingsUnit")}</p>
            <div className="space-y-1">
              {((batchMutation.data as any).results ?? []).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant={r.success ? "default" : "destructive"}>{r.success ? t("meeting.roi.success") : t("meeting.roi.failed")}</Badge>
                  <span className="font-mono text-xs">{r.meetingId}</span>
                  {r.success && <Badge style={{ backgroundColor: GRADE_COLORS[r.roiGrade] }}>{r.roiGrade}</Badge>}
                  {!r.success && <span className="text-red-500 text-xs">{r.error}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
