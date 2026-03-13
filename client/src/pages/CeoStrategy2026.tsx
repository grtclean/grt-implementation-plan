import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Target,
  Truck,
  DollarSign,
  Users,
  RefreshCw,
  Database,
  ChevronDown,
  ChevronRight,
  Crown,
  BarChart3,
  Shield,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, any> = {
  revenue: TrendingUp,
  quality: Target,
  delivery: Truck,
  cost: DollarSign,
  team: Users,
};

const CATEGORY_COLORS: Record<string, string> = {
  revenue: "text-blue-600",
  quality: "text-emerald-600",
  delivery: "text-orange-500",
  cost: "text-violet-600",
  team: "text-pink-500",
};

function ragColor(rag: string) {
  if (rag === "G") return "bg-emerald-500";
  if (rag === "A") return "bg-amber-500";
  return "bg-red-500";
}

function ragBadge(rag: string) {
  if (rag === "G") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Green</Badge>;
  if (rag === "A") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Amber</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Red</Badge>;
}

function progressColor(pct: number) {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function letterGrade(score: number) {
  if (score >= 90) return { letter: "A", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (score >= 80) return { letter: "B", color: "text-blue-600 bg-blue-50 border-blue-200" };
  if (score >= 70) return { letter: "C", color: "text-amber-600 bg-amber-50 border-amber-200" };
  return { letter: "D", color: "text-red-600 bg-red-50 border-red-200" };
}

function formatValue(val: number, unit: string): string {
  if (unit === "CNY") {
    if (val >= 100000000) return `${(val / 100000000).toFixed(1)}亿`;
    if (val >= 10000) return `${(val / 10000).toFixed(0)}万`;
    return val.toLocaleString();
  }
  if (unit === "DPPM") return val.toFixed(0);
  if (unit === "% reduction") return `${val}%`;
  return val.toLocaleString();
}

function computeGoalPct(goal: any): number {
  const target = Number(goal.target_value) || 1;
  const current = Number(goal.current_value) || 0;
  const isLowerBetter = goal.category === "quality" && goal.unit === "DPPM";
  if (isLowerBetter) return Math.min(100, (target / Math.max(current, 1)) * 100);
  return Math.min(100, (current / target) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CeoStrategy2026() {
  const { t } = useLanguage();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const dashboardQuery = trpc.strategyGoals.getDashboard.useQuery({ year: 2026 });
  const seedMutation = trpc.strategyGoals.seedDemo.useMutation({
    onSuccess: () => dashboardQuery.refetch(),
  });

  const data = dashboardQuery.data;
  const grade = data ? letterGrade(data.overallProgress) : null;

  // Sort divisions by weighted score descending
  const sortedDivisions = data
    ? [...data.divisionSummary].sort((a, b) => b.weightedScore - a.weightedScore)
    : [];

  // Find worst-performing BU + KPI for AI recommendation
  const worstBU = sortedDivisions.length > 0 ? sortedDivisions[sortedDivisions.length - 1] : null;
  const worstKpi = worstBU
    ? [...worstBU.kpis].sort((a: any, b: any) => (Number(a.completion_pct) || 0) - (Number(b.completion_pct) || 0))[0]
    : null;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {t("admin.strategy.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("admin.strategy.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Overall score ring */}
          {data && grade && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${grade.color}`}>
              <div className="text-3xl font-bold">{grade.letter}</div>
              <div className="text-sm leading-tight">
                <div className="font-semibold">{data.overallProgress.toFixed(1)}%</div>
                <div className="opacity-70">Overall</div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400">
            Updated {new Date().toLocaleDateString("zh-CN")}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
            {t("admin.strategy.refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <Database className="h-4 w-4 mr-1" />
            {seedMutation.isPending ? t("admin.strategy.seeding") : t("admin.strategy.runSeeder")}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {dashboardQuery.isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">{t("admin.strategy.loading")}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {dashboardQuery.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700 text-sm">
            {t("admin.strategy.loadFailed")}: {dashboardQuery.error.message}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* ── Section 1: Company-Level Objectives ─────────────── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              {t("admin.strategy.companyObjectives")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.companyGoals.map((goal: any) => {
                const pct = computeGoalPct(goal);
                const Icon = CATEGORY_ICONS[goal.category] || Target;
                const colorClass = CATEGORY_COLORS[goal.category] || "text-gray-600";

                return (
                  <Card key={goal.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg bg-gray-100 ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-gray-900">
                              {goal.metric_name}
                            </CardTitle>
                            <p className="text-xs text-gray-400">{goal.metric_name_en}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {(Number(goal.weight) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-gray-900">
                            {formatValue(Number(goal.current_value), goal.unit)}
                          </span>
                          <span className="text-sm text-gray-400">
                            / {formatValue(Number(goal.target_value), goal.unit)} {goal.unit === "DPPM" ? "DPPM" : ""}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${pct >= 90 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                            {pct.toFixed(1)}% {t("admin.strategy.achieved")}
                          </span>
                          <span className="text-gray-400">{goal.category}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ── Section 2: Division Manager Performance Matrix ──── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              {t("admin.strategy.divisionMatrix")}
            </h2>
            <Card className="border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="w-8" />
                      <TableHead className="font-semibold">Division</TableHead>
                      <TableHead className="font-semibold">Manager</TableHead>
                      <TableHead className="font-semibold text-right">Revenue</TableHead>
                      <TableHead className="font-semibold text-right">FAT</TableHead>
                      <TableHead className="font-semibold text-right">OTD</TableHead>
                      <TableHead className="font-semibold text-right">DPPM</TableHead>
                      <TableHead className="font-semibold text-right">Cost</TableHead>
                      <TableHead className="font-semibold text-right">Team</TableHead>
                      <TableHead className="font-semibold text-right">Score</TableHead>
                      <TableHead className="font-semibold text-center">RAG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDivisions.map((div) => {
                      const isExpanded = expandedRow === div.divisionCode;
                      // Determine row-level RAG: worst KPI determines it
                      const hasRed = div.ragCounts.R > 0;
                      const hasAmber = div.ragCounts.A > 0;
                      const rowRag = hasRed ? "R" : hasAmber ? "A" : "G";

                      return (
                        <TableRowGroup key={div.divisionCode}>
                          <TableRow
                            className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                            onClick={() => setExpandedRow(isExpanded ? null : div.divisionCode)}
                          >
                            <TableCell className="w-8">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{div.divisionName}</TableCell>
                            <TableCell>{div.managerName}</TableCell>
                            {div.kpis.map((kpi: any, i: number) => (
                              <TableCell key={i} className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${ragColor(kpi.rag_status)}`} />
                                  <span className="text-sm">
                                    {formatValue(Number(kpi.current_value), kpi.unit)}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    /{formatValue(Number(kpi.target_value), kpi.unit)}
                                  </span>
                                </div>
                              </TableCell>
                            ))}
                            <TableCell className="text-right">
                              <span className="font-semibold text-gray-900">
                                {div.weightedScore.toFixed(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{ragBadge(rowRag)}</TableCell>
                          </TableRow>

                          {/* Expanded row: evaluation criteria */}
                          {isExpanded && (
                            <TableRow className="bg-gray-50/50">
                              <TableCell colSpan={11} className="py-3 px-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {div.kpis.map((kpi: any, i: number) => (
                                    <div key={i} className="bg-white rounded-lg border p-3 text-sm">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`w-2 h-2 rounded-full ${ragColor(kpi.rag_status)}`} />
                                        <span className="font-medium">{kpi.metric_name}</span>
                                      </div>
                                      <p className="text-xs text-gray-500 leading-relaxed">
                                        {kpi.evaluation_criteria}
                                      </p>
                                      <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${progressColor(Number(kpi.completion_pct))}`}
                                            style={{ width: `${Math.min(Number(kpi.completion_pct), 100)}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {Number(kpi.completion_pct).toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableRowGroup>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* ── Section 3: AI Alignment Status ─────────────────── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              {t("admin.strategy.aiAlignment")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: KPI Sync Status */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">{t("admin.strategy.kpiSyncStatus")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">{data.aiAlignment.totalKpis}</span>
                      <span className="text-sm text-gray-400">{t("admin.strategy.totalKpisTracked")}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">{t("admin.strategy.greenSyncRate")}</span>
                        <span className="font-medium text-emerald-600">{data.aiAlignment.syncPct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${data.aiAlignment.syncPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: RAG Distribution */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">{t("admin.strategy.ragDistribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Stacked bar */}
                    <div className="h-8 rounded-lg overflow-hidden flex">
                      {data.aiAlignment.green > 0 && (
                        <div
                          className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${(data.aiAlignment.green / data.aiAlignment.totalKpis) * 100}%` }}
                        >
                          {data.aiAlignment.green}
                        </div>
                      )}
                      {data.aiAlignment.amber > 0 && (
                        <div
                          className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${(data.aiAlignment.amber / data.aiAlignment.totalKpis) * 100}%` }}
                        >
                          {data.aiAlignment.amber}
                        </div>
                      )}
                      {data.aiAlignment.red > 0 && (
                        <div
                          className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${(data.aiAlignment.red / data.aiAlignment.totalKpis) * 100}%` }}
                        >
                          {data.aiAlignment.red}
                        </div>
                      )}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Green: {data.aiAlignment.green}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Amber: {data.aiAlignment.amber}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Red: {data.aiAlignment.red}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: AI Recommendation */}
              <Card className="border shadow-sm bg-gradient-to-br from-violet-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-violet-700">{t("admin.strategy.aiRecommendation")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                    {worstBU && worstKpi ? (
                      <>
                        <p>
                          <span className="font-semibold text-red-600">{worstBU.divisionName}</span> requires
                          immediate attention with the lowest weighted score
                          of <span className="font-semibold">{worstBU.weightedScore.toFixed(1)}</span>.
                        </p>
                        <p>
                          Priority KPI: <span className="font-medium">{(worstKpi as any).metric_name}</span> at{" "}
                          <span className="font-semibold text-red-600">
                            {Number((worstKpi as any).completion_pct).toFixed(1)}%
                          </span>{" "}
                          completion — recommend scheduling a performance review with{" "}
                          <span className="font-medium">{worstBU.managerName}</span>.
                        </p>
                      </>
                    ) : (
                      <p>{t("admin.strategy.allOnTrack")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Fragment wrapper for table row groups
// ---------------------------------------------------------------------------

function TableRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
