import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Building2,
  RefreshCw,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

const DEPARTMENT_KEYS = [
  "meeting.dept.deptRnD",
  "meeting.dept.deptProduct",
  "meeting.dept.deptSales",
  "meeting.dept.deptMarketing",
  "meeting.dept.deptHR",
  "meeting.dept.deptFinance",
  "meeting.dept.deptOperations",
];

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function DepartmentRollupTab() {
  const { t } = useLanguage();
  const DEPARTMENTS = DEPARTMENT_KEYS.map((k) => t(k));
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [compareDepts, setCompareDepts] = useState<string[]>(DEPARTMENTS.slice(0, 4));

  const rollupQuery = trpc.ime.departmentRollup.useQuery(
    { department, period },
    { enabled: !!department && !!period }
  );
  const comparisonQuery = trpc.ime.departmentComparison.useQuery(
    { departments: compareDepts, period },
    { enabled: compareDepts.length > 0 }
  );
  const dashboardQuery = trpc.ime.managementDashboard.useQuery(
    { scope: "organization", period }
  );
  const refreshMutation = trpc.ime.refreshDepartmentRollup.useMutation({
    onSuccess: () => rollupQuery.refetch(),
  });

  const rollup = rollupQuery.data as any;
  const comparison = (comparisonQuery.data ?? []) as any[];
  const mgmt = dashboardQuery.data as any;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("meeting.dept.department")}</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("meeting.dept.period")}</label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="2026-02"
                className="w-[140px]"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => refreshMutation.mutate({ department, period })}
              disabled={refreshMutation.isPending}
            >
              {refreshMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t("meeting.dept.refreshRollup")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      {rollup && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label={t("meeting.dept.meetingCount")}
            value={rollup.meetingCount ?? 0}
            subtitle={`${department} · ${period}`}
          />
          <StatCard
            icon={Target}
            label={t("meeting.dept.avgEffectiveness")}
            value={`${Math.round(rollup.avgEffectiveness ?? 0)}%`}
            subtitle="Avg Effectiveness"
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          <StatCard
            icon={Users}
            label={t("meeting.dept.activeParticipants")}
            value={rollup.activeParticipants ?? 0}
            subtitle="Active Participants"
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            icon={CheckCircle2}
            label={t("meeting.dept.totalDecisions")}
            value={rollup.totalDecisions ?? 0}
            subtitle="Total Decisions"
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
        </div>
      )}

      {/* Department Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.dept.comparison")}</CardTitle>
          <CardDescription>Department comparison by effectiveness & contribution</CardDescription>
        </CardHeader>
        <CardContent>
          {comparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparison.map((d: any) => ({
                department: d.department,
                avgEffectiveness: Math.round(Number(d.avg_effectiveness ?? d.avgEffectiveness) || 0),
                avgContribution: Math.round(Number(d.avg_contribution_score ?? d.avgContributionScore) || 0),
                meetings: Number(d.meeting_count ?? d.meetingCount) || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgEffectiveness" fill="#6366f1" name={t("meeting.dept.chartAvgEffectiveness")} />
                <Bar dataKey="avgContribution" fill="#22c55e" name={t("meeting.dept.chartAvgContribution")} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">{t("meeting.dept.noComparisonData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Management Dashboard: Rankings + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.dept.rankingTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {mgmt?.rankings && (mgmt.rankings as any[]).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">{t("meeting.dept.thRank")}</TableHead>
                    <TableHead>{t("meeting.dept.thDept")}</TableHead>
                    <TableHead className="text-center">{t("meeting.dept.thMeetings")}</TableHead>
                    <TableHead className="text-center">{t("meeting.dept.thEffectiveness")}</TableHead>
                    <TableHead className="text-center">{t("meeting.dept.thContribution")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(mgmt.rankings as any[]).map((r: any, i: number) => (
                    <TableRow key={r.department}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell className="text-center">{r.meeting_count}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={Number(r.avg_effectiveness) >= 70 ? "default" : "secondary"}>
                          {Math.round(Number(r.avg_effectiveness) || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{Math.round(Number(r.avg_contribution) || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-6 text-muted-foreground">{t("meeting.dept.noRankingData")}</p>
            )}
          </CardContent>
        </Card>

        {/* Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("meeting.dept.trendTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mgmt?.trend && (mgmt.trend as any[]).length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mgmt.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avg_effectiveness"
                    stroke="#6366f1"
                    strokeWidth={2}
                    name={t("meeting.dept.chartTrendEffectiveness")}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">{t("meeting.dept.noTrendData")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
