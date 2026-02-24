import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, TrendingUp, PieChart, ScatterChart, Users,
  DollarSign, Award, AlertTriangle, RefreshCw, Calendar,
  ArrowUp, ArrowDown, Minus, Target
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Period helpers
const getPeriodRange = (type: string) => {
  const now = new Date();
  let start: Date, end: Date;
  if (type === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (type === 'quarterly') {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
  } else {
    // weekly
    const day = now.getDay();
    start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }
  return { start: start.getTime(), end: end.getTime() };
};

// 工序名称映射
const PROCESS_NAMES: Record<string, string> = {
  CUT: '下料', WELD: '焊接', MACHINE: '机加工', ASSEMBLE: '装配',
  PAINT: '喷涂', TEST: '检验', PACK: '包装', SHIP: '发货',
};

export default function SalaryReport() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [periodType, setPeriodType] = useState("monthly");
  const [correlationMetric, setCorrelationMetric] = useState<"efficiency" | "quality" | "overall">("overall");

  const period = useMemo(() => getPeriodRange(periodType), [periodType]);

  // Queries
  const dashboardQuery = trpc.salaryReport.dashboard.useQuery({
    periodStart: period.start,
    periodEnd: period.end,
    periodType,
  });
  const distributionQuery = trpc.salaryReport.bonusDistribution.useQuery({
    periodStart: period.start,
    periodEnd: period.end,
  });
  const processQuery = trpc.salaryReport.processComparison.useQuery({
    periodStart: period.start,
    periodEnd: period.end,
  });
  const correlationQuery = trpc.salaryReport.correlation.useQuery({
    periodStart: period.start,
    periodEnd: period.end,
    metric: correlationMetric,
  });
  const trendQuery = trpc.salaryReport.trend.useQuery({
    periodType: periodType as any,
    periodsCount: 12,
  });

  const dashboard = (dashboardQuery.data ?? { summary: {}, statusDistribution: [], rankDistribution: [] }) as any;
  const distribution = (distributionQuery.data ?? { distribution: [], composition: {}, topWorkers: [], bottomWorkers: [] }) as any;
  const processData = (processQuery.data ?? { processStats: [], overallAvgBonus: '0', processCount: 0 }) as any;
  const correlation = (correlationQuery.data ?? { scatterData: [], correlation: {}, regression: {}, metric: 'overall', dataPoints: 0 }) as any;
  const trend = (trendQuery.data ?? { trend: [], periodType: '', periodsCount: 0 }) as any;

  const summary = dashboard.summary || {};

  const refetchAll = () => {
    dashboardQuery.refetch();
    distributionQuery.refetch();
    processQuery.refetch();
    correlationQuery.refetch();
    trendQuery.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={BarChart3}
        title={t("hr.salaryReport.title")}
        description={t("hr.salaryReport.description")}
        actions={
          <div className="flex gap-2 items-center">
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("hr.salaryReport.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("hr.salaryReport.monthly")}</SelectItem>
                <SelectItem value="quarterly">{t("hr.salaryReport.quarterly")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={refetchAll}>
              <RefreshCw className="w-4 h-4 mr-2" /> {t("hr.salaryReport.refresh")}
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard icon={Users} label={t("hr.salaryReport.employeeCount")} value={summary.unique_workers ?? 0} iconColor="text-violet-400" iconBg="bg-violet-500/20" />
        <StatCard icon={DollarSign} label={t("hr.salaryReport.totalBonus")} value={`¥${Number(summary.total_bonus_amount || 0).toLocaleString()}`} iconColor="text-green-400" iconBg="bg-green-500/20" />
        <StatCard icon={Target} label={t("hr.salaryReport.avgBonus")} value={`¥${Number(summary.avg_bonus || 0).toFixed(0)}`} iconColor="text-blue-400" iconBg="bg-blue-500/20" />
        <StatCard icon={TrendingUp} label={t("hr.salaryReport.avgScore")} value={Number(summary.avg_score || 0).toFixed(1)} iconColor="text-primary" iconBg="bg-primary/20" />
        <StatCard icon={AlertTriangle} label={t("hr.salaryReport.totalPenalties")} value={`¥${Number(summary.total_penalties || 0).toLocaleString()}`} iconColor="text-red-400" iconBg="bg-red-500/20" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="dashboard"><PieChart className="w-4 h-4 mr-1" /> {t("hr.salaryReport.tab.distribution")}</TabsTrigger>
          <TabsTrigger value="process"><BarChart3 className="w-4 h-4 mr-1" /> {t("hr.salaryReport.tab.process")}</TabsTrigger>
          <TabsTrigger value="correlation"><ScatterChart className="w-4 h-4 mr-1" /> {t("hr.salaryReport.tab.correlation")}</TabsTrigger>
          <TabsTrigger value="trend"><TrendingUp className="w-4 h-4 mr-1" /> {t("hr.salaryReport.tab.trend")}</TabsTrigger>
        </TabsList>

        {/* Bonus Distribution Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Distribution Chart (Bar) */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-base">{t("hr.salaryReport.bonusRange")}</CardTitle>
                <CardDescription>{t("hr.salaryReport.bonusRangeDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {distribution.distribution.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">{t("hr.salaryReport.noData")}</div>
                ) : (
                  <div className="space-y-3">
                    {distribution.distribution.map((d: any, i: number) => {
                      const maxCount = Math.max(...distribution.distribution.map((x: any) => Number(x.worker_count)));
                      const pct = maxCount > 0 ? (Number(d.worker_count) / maxCount) * 100 : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono">¥{d.bonus_range}</span>
                            <span className="text-muted-foreground">{d.worker_count}人 · 均值¥{Number(d.avg_bonus).toFixed(0)}</span>
                          </div>
                          <div className="h-6 bg-secondary/50 rounded overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Composition (Pie-like) */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-base">{t("hr.salaryReport.bonusComposition")}</CardTitle>
                <CardDescription>{t("hr.salaryReport.bonusCompositionDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {!distribution.composition.grand_total ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">{t("hr.salaryReport.noData")}</div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: t("hr.salaryReport.efficiencyBonus"), value: distribution.composition.total_efficiency, color: 'bg-blue-500', textColor: 'text-blue-400' },
                      { label: t("hr.salaryReport.qualityBonus"), value: distribution.composition.total_quality, color: 'bg-green-500', textColor: 'text-green-400' },
                      { label: t("hr.salaryReport.attendanceBonus"), value: distribution.composition.total_attendance, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
                      { label: t("hr.salaryReport.specialBonus"), value: distribution.composition.total_special, color: 'bg-violet-500', textColor: 'text-violet-400' },
                      { label: t("hr.salaryReport.penaltyDeduction"), value: distribution.composition.total_penalty, color: 'bg-red-500', textColor: 'text-red-400' },
                    ].map((item, i) => {
                      const total = Number(distribution.composition.grand_total) || 1;
                      const pct = (Number(item.value || 0) / total * 100);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className={item.textColor}>{item.label}</span>
                            <span className="text-muted-foreground">¥{Number(item.value || 0).toLocaleString()} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-4 bg-secondary/50 rounded overflow-hidden">
                            <div
                              className={`h-full ${item.color} rounded transition-all duration-500 opacity-70`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top & Bottom Workers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" /> {t("hr.salaryReport.top10")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {distribution.topWorkers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("hr.salaryReport.noData")}</p>
                ) : (
                  <div className="space-y-2">
                    {distribution.topWorkers.map((w: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-yellow-500/30 text-yellow-400' :
                            i <= 2 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>{i + 1}</span>
                          <span className="text-sm font-medium">{w.worker_name}</span>
                        </div>
                        <span className="text-sm font-bold text-green-400">¥{Number(w.total_bonus).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> {t("hr.salaryReport.bottom10")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {distribution.bottomWorkers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("hr.salaryReport.noData")}</p>
                ) : (
                  <div className="space-y-2">
                    {distribution.bottomWorkers.map((w: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-secondary text-muted-foreground">{i + 1}</span>
                          <span className="text-sm font-medium">{w.worker_name}</span>
                        </div>
                        <span className="text-sm font-bold text-red-400">¥{Number(w.total_bonus).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Process Comparison Tab */}
        <TabsContent value="process" className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-base">{t("hr.salaryReport.processComparison")}</CardTitle>
              <CardDescription>
                各工序平均奖金对比 · 总体平均: ¥{processData.overallAvgBonus}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processData.processStats.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">{t("hr.salaryReport.noData")}</div>
              ) : (
                <div className="space-y-4">
                  {processData.processStats.map((ps: any, i: number) => {
                    const maxAvg = Math.max(...processData.processStats.map((x: any) => Number(x.avg_bonus)));
                    const pct = maxAvg > 0 ? (Number(ps.avg_bonus) / maxAvg) * 100 : 0;
                    const deviation = Number(ps.deviationPercent);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono font-medium">
                            {ps.process_code} ({(PROCESS_NAMES as any)[ps.process_code] || ps.process_code})
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{ps.worker_count}人</span>
                            <span className="font-bold">¥{Number(ps.avg_bonus).toFixed(0)}</span>
                            <span className={`flex items-center ${deviation > 0 ? 'text-green-400' : deviation < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                              {deviation > 0 ? <ArrowUp className="w-3 h-3" /> : deviation < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {Math.abs(deviation).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-6 bg-secondary/50 rounded overflow-hidden">
                          <div
                            className={`h-full rounded transition-all duration-500 ${deviation >= 0 ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-orange-600 to-orange-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>效率: {Number(ps.avg_efficiency).toFixed(1)}%</span>
                          <span>质量: {Number(ps.avg_quality_rate).toFixed(1)}%</span>
                          <span>评分: {Number(ps.avg_score).toFixed(1)}</span>
                          <span>最高: ¥{Number(ps.max_bonus).toFixed(0)} / 最低: ¥{Number(ps.min_bonus).toFixed(0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Correlation Tab */}
        <TabsContent value="correlation" className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-muted-foreground">{t("hr.salaryReport.analysisDimension")}:</span>
            <Select value={correlationMetric} onValueChange={(v: any) => setCorrelationMetric(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">{t("hr.salaryReport.overallScore")}</SelectItem>
                <SelectItem value="efficiency">{t("hr.salaryReport.efficiencyMetric")}</SelectItem>
                <SelectItem value="quality">{t("hr.salaryReport.qualityMetric")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-mono mb-1">{t("hr.salaryReport.correlationCoeff")}</p>
                <p className="text-3xl font-bold">{correlation.correlation?.coefficient ?? 'N/A'}</p>
                <Badge className={`mt-2 ${
                  correlation.correlation?.strength === '强相关' ? 'bg-green-500/20 text-green-400' :
                  correlation.correlation?.strength === '中等相关' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                } border-0`}>
                  {correlation.correlation?.strength ?? ''} · {correlation.correlation?.direction ?? ''}
                </Badge>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-mono mb-1">{t("hr.salaryReport.rSquared")}</p>
                <p className="text-3xl font-bold">{correlation.regression?.rSquared ?? 'N/A'}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("hr.salaryReport.regressionEquation")}: y = {correlation.regression?.slope ?? 0}x + {correlation.regression?.intercept ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-mono mb-1">{t("hr.salaryReport.dataPoints")}</p>
                <p className="text-3xl font-bold">{correlation.dataPoints ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("hr.salaryReport.analysisDimension")}: {correlationMetric === 'overall' ? t("hr.salaryReport.overallScore") : correlationMetric === 'efficiency' ? t("hr.salaryReport.efficiencyMetric") : t("hr.salaryReport.qualityMetric")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Scatter Plot (text-based) */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-base">{t("hr.salaryReport.scatterTitle")}</CardTitle>
              <CardDescription>
                {t("hr.salaryReport.xAxis")}: {correlationMetric === 'overall' ? t("hr.salaryReport.overallScore") : correlationMetric === 'efficiency' ? t("hr.salaryReport.efficiencyMetric") : t("hr.salaryReport.qualityMetric")} · {t("hr.salaryReport.yAxis")}: {t("hr.salaryReport.bonusAmount")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {correlation.scatterData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">{t("hr.salaryReport.noData")}</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {correlation.scatterData.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          d.rank <= 3 ? 'bg-yellow-500/30 text-yellow-400' :
                          d.rank <= 5 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-secondary text-muted-foreground'
                        }`}>#{d.rank}</span>
                        <span>{d.workerName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">
                          {correlationMetric === 'overall' ? t("hr.salaryReport.score") : correlationMetric === 'efficiency' ? t("hr.salaryReport.efficiency") : t("hr.salaryReport.quality")}: <strong className="text-foreground">{d.x.toFixed(1)}</strong>
                        </span>
                        <span className="font-bold text-green-400">¥{d.y.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Tab */}
        <TabsContent value="trend" className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-base">{t("hr.salaryReport.trendAnalysis")}</CardTitle>
              <CardDescription>
                {periodType === 'weekly' ? t("hr.salaryReport.weeklyTrend") : periodType === 'monthly' ? t("hr.salaryReport.monthlyTrend") : t("hr.salaryReport.quarterlyTrend")} · {t("hr.salaryReport.recentPeriods")} {trend.periodsCount}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trend.trend.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">{t("hr.salaryReport.noData")}</div>
              ) : (
                <div className="space-y-3">
                  {trend.trend.map((t: any, i: number) => {
                    const maxBonus = Math.max(...trend.trend.map((x: any) => Number(x.avg_bonus)));
                    const pct = maxBonus > 0 ? (Number(t.avg_bonus) / maxBonus) * 100 : 0;
                    const change = t.avgBonusChange ? Number(t.avgBonusChange) : null;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono">
                            {new Date(Number(t.period_start)).toLocaleDateString()} - {new Date(Number(t.period_end)).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{t.worker_count}人</span>
                            <span className="font-bold">均值 ¥{Number(t.avg_bonus).toFixed(0)}</span>
                            {change !== null && (
                              <span className={`flex items-center ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                {change > 0 ? <ArrowUp className="w-3 h-3" /> : change < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                {Math.abs(change).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-5 bg-secondary/50 rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>总额: ¥{Number(t.total_bonus).toLocaleString()}</span>
                          <span>效率: {Number(t.avg_efficiency).toFixed(1)}%</span>
                          <span>质量: {Number(t.avg_quality_rate).toFixed(1)}%</span>
                          <span>评分: {Number(t.avg_score).toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-base">{t("hr.salaryReport.statusDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.statusDistribution.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground">{t("hr.salaryReport.noData")}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {dashboard.statusDistribution.map((s: any, i: number) => {
                    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
                      calculated: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: t("hr.salaryReport.status.pendingReview") },
                      reviewed: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: t("hr.salaryReport.status.reviewed") },
                      approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: t("hr.salaryReport.status.approved") },
                      paid: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: t("hr.salaryReport.status.paid") },
                      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: t("hr.salaryReport.status.rejected") },
                    };
                    const style = statusMap[s.status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: s.status };
                    return (
                      <div key={i} className={`p-3 rounded-lg ${style.bg}`}>
                        <p className={`text-xs ${style.text} font-mono`}>{style.label}</p>
                        <p className="text-lg font-bold mt-1">{s.count}人</p>
                        <p className="text-xs text-muted-foreground">¥{Number(s.amount).toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
