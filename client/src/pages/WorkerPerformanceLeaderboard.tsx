import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Trophy, Medal, Star, TrendingUp, Clock, Target,
  Award, Users, ChevronUp, ChevronDown, Minus, Crown
} from "lucide-react";

const PERIOD_KEYS = [
  { value: "week", key: "manufacturing.leaderboard.periodWeek" },
  { value: "month", key: "manufacturing.leaderboard.periodMonth" },
  { value: "quarter", key: "manufacturing.leaderboard.periodQuarter" },
  { value: "year", key: "manufacturing.leaderboard.periodYear" },
] as const;

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{rank}</span>;
}

function getTrendIcon(trend: string) {
  if (trend === "up") return <ChevronUp className="w-4 h-4 text-green-500" />;
  if (trend === "down") return <ChevronDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function getEfficiencyColor(efficiency: number) {
  if (efficiency >= 120) return "text-green-600 bg-green-50";
  if (efficiency >= 100) return "text-blue-600 bg-blue-50";
  if (efficiency >= 80) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export default function WorkerPerformanceLeaderboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [period, setPeriod] = useState("month");
  const [selectedProject] = useState("PRJ-2026-001");

  // Queries
  const leaderboardQuery = (trpc.qualityMaterialPerformance as any).workerLeaderboard.useQuery(
    { projectId: selectedProject, period },
    { enabled: activeTab === "leaderboard" }
  );
  const performanceSummaryQuery = (trpc.qualityMaterialPerformance as any).workerPerformanceSummary.useQuery(
    { projectId: selectedProject, period },
    { enabled: activeTab === "summary" }
  );

  const leaderboard = (leaderboardQuery.data as any[] || []);
  const summary = performanceSummaryQuery.data;

  // Calculate top performers
  const topPerformers = useMemo(() => {
    return leaderboard.slice(0, 3);
  }, [leaderboard]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Trophy}
        title={t("manufacturing.leaderboard.title")}
        description={t("manufacturing.leaderboard.description")}
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_KEYS.map(p => (
                <SelectItem key={p.value} value={p.value}>{t(p.key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="leaderboard">{t("manufacturing.leaderboard.tabLeaderboard")}</TabsTrigger>
          <TabsTrigger value="summary">{t("manufacturing.leaderboard.tabTeamOverview")}</TabsTrigger>
          <TabsTrigger value="details">{t("manufacturing.leaderboard.tabDetails")}</TabsTrigger>
        </TabsList>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          {/* Top 3 Podium */}
          {topPerformers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformers.map((worker: any, i: number) => (
                <Card key={worker.worker_id || i} className={`${i === 0 ? 'border-yellow-300 bg-yellow-50/30 md:order-2' : i === 1 ? 'border-gray-300 bg-gray-50/30 md:order-1' : 'border-amber-300 bg-amber-50/30 md:order-3'}`}>
                  <CardContent className="p-6 text-center">
                    <div className="mb-3">{getRankIcon(i + 1)}</div>
                    <div className="text-lg font-bold">{worker.worker_name || `${t("manufacturing.leaderboard.worker")}${worker.worker_id}`}</div>
                    <div className="text-sm text-muted-foreground mb-3">{worker.department || t("manufacturing.leaderboard.productionDept")}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-background rounded">
                        <div className="font-bold text-primary">{worker.total_tasks || 0}</div>
                        <div className="text-xs text-muted-foreground">{t("manufacturing.leaderboard.completedTasks")}</div>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <div className={`font-bold ${getEfficiencyColor(worker.efficiency || 0).split(' ')[0]}`}>
                          {worker.efficiency || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">{t("manufacturing.leaderboard.efficiency")}</div>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <div className="font-bold">{worker.total_hours ? Number(worker.total_hours).toFixed(1) : '0'}h</div>
                        <div className="text-xs text-muted-foreground">{t("manufacturing.leaderboard.totalHours")}</div>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <div className="font-bold">{worker.quality_score || 0}</div>
                        <div className="text-xs text-muted-foreground">{t("manufacturing.leaderboard.qualityScore")}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("manufacturing.leaderboard.fullLeaderboard")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 w-12">{t("manufacturing.leaderboard.rank")}</th>
                      <th className="p-3">{t("manufacturing.leaderboard.worker")}</th>
                      <th className="p-3 text-center">{t("manufacturing.leaderboard.completedTasks")}</th>
                      <th className="p-3 text-center">{t("manufacturing.leaderboard.totalHours")}</th>
                      <th className="p-3 text-center">{t("manufacturing.leaderboard.efficiency")}</th>
                      <th className="p-3 text-center">{t("manufacturing.leaderboard.qualityScore")}</th>
                      <th className="p-3 text-center">{t("manufacturing.leaderboard.compositeScore")}</th>
                      <th className="p-3 text-center">{t("manufacturing.leaderboard.trend")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((worker: any, i: number) => (
                      <tr key={worker.worker_id || i} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3">{getRankIcon(i + 1)}</td>
                        <td className="p-3">
                          <div className="font-medium">{worker.worker_name || `${t("manufacturing.leaderboard.worker")}${worker.worker_id}`}</div>
                          <div className="text-xs text-muted-foreground">{worker.department || t("manufacturing.leaderboard.productionDept")}</div>
                        </td>
                        <td className="p-3 text-center font-mono">{worker.total_tasks || 0}</td>
                        <td className="p-3 text-center font-mono">{worker.total_hours ? Number(worker.total_hours).toFixed(1) : '0'}h</td>
                        <td className="p-3 text-center">
                          <Badge className={getEfficiencyColor(worker.efficiency || 0)}>
                            {worker.efficiency || 0}%
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="font-mono">{worker.quality_score || 0}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-primary">{worker.composite_score || 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          {getTrendIcon(worker.trend || "stable")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leaderboard.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t("manufacturing.leaderboard.noPerformanceData")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <div className="text-3xl font-bold">{summary?.totalWorkers || 0}</div>
                <p className="text-sm text-muted-foreground">{t("manufacturing.leaderboard.participatingWorkers")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <div className="text-3xl font-bold">{summary?.totalHours ? Number(summary.totalHours).toFixed(0) : 0}h</div>
                <p className="text-sm text-muted-foreground">{t("manufacturing.leaderboard.totalHours")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <div className="text-3xl font-bold">{summary?.avgEfficiency || 0}%</div>
                <p className="text-sm text-muted-foreground">{t("manufacturing.leaderboard.avgEfficiency")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                <div className="text-3xl font-bold">{summary?.totalTasks || 0}</div>
                <p className="text-sm text-muted-foreground">{t("manufacturing.leaderboard.completedTasks")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Efficiency Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("manufacturing.leaderboard.efficiencyDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: `${t("manufacturing.leaderboard.effHigh")} (≥120%)`, range: "120+", color: "bg-green-500", count: summary?.efficiencyDistribution?.high || 0 },
                  { label: `${t("manufacturing.leaderboard.effStandard")} (100-119%)`, range: "100-119", color: "bg-blue-500", count: summary?.efficiencyDistribution?.standard || 0 },
                  { label: `${t("manufacturing.leaderboard.effBelow")} (80-99%)`, range: "80-99", color: "bg-yellow-500", count: summary?.efficiencyDistribution?.below || 0 },
                  { label: `${t("manufacturing.leaderboard.effLow")} (<80%)`, range: "<80", color: "bg-red-500", count: summary?.efficiencyDistribution?.low || 0 },
                ].map((item) => (
                  <div key={item.range} className="text-center p-4 rounded-lg bg-muted">
                    <div className={`w-4 h-4 rounded-full ${item.color} mx-auto mb-2`} />
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Process Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("manufacturing.leaderboard.processEfficiency")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(summary?.processPerformance as any[] || []).map((p: any) => (
                  <div key={p.process_code} className="flex items-center gap-4">
                    <span className="w-10 font-mono font-bold text-sm">{p.process_code}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${Number(p.avg_efficiency) >= 100 ? 'bg-green-500' : Number(p.avg_efficiency) >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Number(p.avg_efficiency), 150)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-sm">{p.avg_efficiency}%</span>
                    <span className="w-20 text-right text-xs text-muted-foreground">{p.worker_count}{t("manufacturing.process.personSuffix")}</span>
                  </div>
                ))}
                {(!summary?.processPerformance || (summary.processPerformance as any[]).length === 0) && (
                  <p className="text-center text-muted-foreground py-4">{t("manufacturing.common.noData")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5" />
                {t("manufacturing.leaderboard.incentiveSuggestions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">{t("manufacturing.leaderboard.outstandingWorker")}</h4>
                <p className="text-sm text-green-700">
                  {topPerformers.length > 0
                    ? `${t("manufacturing.leaderboard.topPerformerPrefix")} ${t(period === 'week' ? "manufacturing.leaderboard.periodWeek" : period === 'month' ? "manufacturing.leaderboard.periodMonth" : period === 'quarter' ? "manufacturing.leaderboard.periodQuarter" : "manufacturing.leaderboard.periodYear")} ${t("manufacturing.leaderboard.topPerformerIs")} ${topPerformers[0]?.worker_name || t("manufacturing.workerMobile.unknown")}${t("manufacturing.leaderboard.topPerformerCompleted")} ${topPerformers[0]?.total_tasks || 0} ${t("manufacturing.leaderboard.topPerformerTasks")}${t("manufacturing.leaderboard.topPerformerEfficiency")} ${topPerformers[0]?.efficiency || 0}%${t("manufacturing.leaderboard.topPerformerRecommend")}`
                    : t("manufacturing.leaderboard.noDataForSuggestions")}
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">{t("manufacturing.leaderboard.teamHighlights")}</h4>
                <p className="text-sm text-blue-700">
                  {t("manufacturing.leaderboard.teamAvgEfficiency")} {summary?.avgEfficiency || 0}%{t("manufacturing.leaderboard.teamWorkerCount")} {summary?.totalWorkers || 0} {t("manufacturing.leaderboard.teamWorkerUnit")}{t("manufacturing.leaderboard.teamTotalTasks")} {summary?.totalTasks || 0} {t("manufacturing.leaderboard.teamTaskUnit")}
                  {(summary?.avgEfficiency || 0) >= 100 ? t("manufacturing.leaderboard.teamPerformanceGood") : t("manufacturing.leaderboard.teamPerformanceImprove")}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">{t("manufacturing.leaderboard.improvementSuggestions")}</h4>
                <p className="text-sm text-yellow-700">
                  {(summary?.efficiencyDistribution?.low || 0) > 0
                    ? `${t("manufacturing.leaderboard.lowEffWorkers")} ${summary?.efficiencyDistribution?.low} ${t("manufacturing.leaderboard.lowEffSuggest")}`
                    : t("manufacturing.leaderboard.allEffAcceptable")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
