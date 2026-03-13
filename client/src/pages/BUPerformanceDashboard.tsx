/**
 * BU事业部绩效看板页面
 * 展示各事业部的项目数量、营收、人员利用率等KPI指标
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Users,
  FolderKanban,
  DollarSign,
  Clock,
  CheckCircle2,
  Star,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Percent,
  ShieldAlert,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import ViolationAlert from "@/components/ViolationAlert";

// BU颜色配置
const BU_COLORS: Record<string, { bg: string; text: string; border: string; chart: string }> = {
  'BU1': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', chart: '#3b82f6' },
  'BU2': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30', chart: '#22c55e' },
  'BU3': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30', chart: '#a855f7' },
  'BU4': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30', chart: '#f97316' },
  'BU5': { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30', chart: '#06b6d4' },
};

// BU名称映射 — resolved at render time via t()
const BU_NAME_KEYS: Record<string, string> = {
  'BU1': 'admin.buPerf.buNames.BU1',
  'BU2': 'admin.buPerf.buNames.BU2',
  'BU3': 'admin.buPerf.buNames.BU3',
  'BU4': 'admin.buPerf.buNames.BU4',
  'BU5': 'admin.buPerf.buNames.BU5',
};

// 获取当前月份
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 获取周期选项
function getPeriodOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  
  // 最近12个月
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    options.push({ value, label });
  }
  
  return options;
}

// KPI卡片组件
function KPICard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'primary'
}: { 
  title: string; 
  value: number | string; 
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                 trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}/10`}>
            <Icon className={`h-6 w-6 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 进度条组件
function ProgressBar({ value, max = 100, color = 'primary' }: { value: number; max?: number; color?: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div 
        className={`h-2 rounded-full bg-${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function BUPerformanceDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [selectedBU, setSelectedBU] = useState<string | null>(null);
  
  const periodOptions = useMemo(() => getPeriodOptions(), []);

  // 获取所有BU信息
  const { data: busData } = trpc.buMapping.getAllBUs.useQuery();
  
  // 获取绩效统计
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = trpc.buMapping.getPerformanceStats.useQuery({
    period: selectedPeriod,
    periodType: 'monthly',
  });

  // 初始化示例数据
  const initSampleDataMutation = trpc.buMapping.initSamplePerformanceData.useMutation({
    onSuccess: (data) => {
      toast({
        title: t("admin.buPerf.initSuccess"),
        description: t("admin.buPerf.initSuccessDesc").replace("{count}", String(data.created)),
      });
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: t("admin.buPerf.initFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 计算汇总数据
  const summaryData = useMemo(() => {
    if (!statsData?.stats || statsData.stats.length === 0) {
      return null;
    }
    
    const stats = selectedBU 
      ? statsData.stats.filter(s => s.buCode === selectedBU)
      : statsData.stats;
    
    return {
      totalProjects: stats.reduce((sum, s) => sum + s.projectCount, 0),
      activeProjects: stats.reduce((sum, s) => sum + s.activeProjectCount, 0),
      completedProjects: stats.reduce((sum, s) => sum + s.completedProjectCount, 0),
      totalRevenue: stats.reduce((sum, s) => sum + s.totalRevenue, 0),
      totalCost: stats.reduce((sum, s) => sum + s.totalCost, 0),
      grossProfit: stats.reduce((sum, s) => sum + s.grossProfit, 0),
      avgGrossMargin: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.grossMargin, 0) / stats.length 
        : 0,
      totalTeamSize: stats.reduce((sum, s) => sum + s.teamSize, 0),
      avgUtilization: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.utilizationRate, 0) / stats.length 
        : 0,
      avgOnTimeDelivery: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.onTimeDeliveryRate, 0) / stats.length 
        : 0,
      avgSatisfaction: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.customerSatisfaction, 0) / stats.length 
        : 0,
    };
  }, [statsData, selectedBU]);

  // Performance record query for frozen state
  const perfDashboard = trpc.performanceRecord.dashboard.useQuery({
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
  });
  const perfData = perfDashboard.data;

  return (
      <div className="space-y-6">
        {/* Frozen BU Warning Banner */}
        {perfData && perfData.frozenCount > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            <Lock className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium">{t("admin.buPerf.frozenWarning")}</span>
              {t("admin.buPerf.frozenDesc").replace("{count}", String(perfData.frozenCount)).replace("{quarter}", String(perfData.quarter))}
            </div>
            <Badge className="bg-red-100 text-red-700">{t("admin.buPerf.frozenBadge").replace("{count}", String(perfData.frozenCount))}</Badge>
          </div>
        )}

        {/* 页面标题 */}
        <PageHeader
          icon={Building2}
          title={t("admin.buPerf.title")}
          description={t("admin.buPerf.description")}
          actions={
            <div className="flex gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("admin.buPerf.selectPeriod")} />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedBU || 'all'} onValueChange={(v) => setSelectedBU(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("admin.buPerf.selectBU")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.buPerf.allBUs")}</SelectItem>
                  {busData?.bus.map((bu) => (
                    <SelectItem key={bu.code} value={bu.code}>{bu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetchStats()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("admin.buPerf.refresh")}
              </Button>
              {(!statsData?.stats || statsData.stats.length === 0) && (
                <Button
                  onClick={() => initSampleDataMutation.mutate()}
                  disabled={initSampleDataMutation.isPending}
                >
                  {initSampleDataMutation.isPending ? t("admin.buPerf.initializing") : t("admin.buPerf.initSampleData")}
                </Button>
              )}
            </div>
          }
        />

        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !summaryData ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("admin.buPerf.noData")}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t("admin.buPerf.noDataHint")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 汇总KPI卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title={t("admin.buPerf.totalProjects")}
                value={summaryData.totalProjects}
                unit={t("admin.buPerf.projectUnit")}
                icon={FolderKanban}
                trend="up"
                trendValue={t("admin.buPerf.activeProjects").replace("{count}", String(summaryData.activeProjects))}
              />
              <KPICard
                title={t("admin.buPerf.totalRevenue")}
                value={summaryData.totalRevenue.toFixed(0)}
                unit={t("admin.buPerf.revenueUnit")}
                icon={DollarSign}
                trend="up"
                trendValue={t("admin.buPerf.grossProfit").replace("{amount}", summaryData.grossProfit.toFixed(0))}
              />
              <KPICard
                title={t("admin.buPerf.teamSize")}
                value={summaryData.totalTeamSize}
                unit={t("admin.buPerf.personUnit")}
                icon={Users}
                trend="neutral"
                trendValue={t("admin.buPerf.utilizationRate").replace("{rate}", summaryData.avgUtilization.toFixed(1))}
              />
              <KPICard
                title={t("admin.buPerf.customerSatisfaction")}
                value={summaryData.avgSatisfaction.toFixed(1)}
                unit={t("admin.buPerf.scoreUnit")}
                icon={Star}
                trend={summaryData.avgSatisfaction >= 4.5 ? 'up' : summaryData.avgSatisfaction >= 4 ? 'neutral' : 'down'}
                trendValue={summaryData.avgSatisfaction >= 4.5 ? t("admin.buPerf.excellent") : summaryData.avgSatisfaction >= 4 ? t("admin.buPerf.good") : t("admin.buPerf.needsImprovement")}
              />
            </div>

            {/* 各BU绩效详情 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {statsData?.stats
                .filter(stat => !selectedBU || stat.buCode === selectedBU)
                .map((stat) => {
                  const colors = BU_COLORS[stat.buCode] || BU_COLORS['BU1'];
                  const buName = BU_NAME_KEYS[stat.buCode] ? t(BU_NAME_KEYS[stat.buCode]) : stat.buCode;
                  
                  return (
                    <Card key={stat.buCode} className={`${colors.border} border-l-4`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={`${colors.bg} ${colors.text}`}>{stat.buCode}</Badge>
                            <CardTitle className="text-lg">{buName}</CardTitle>
                          </div>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {stat.teamSize} 人
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* 项目统计 */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-2xl font-bold">{stat.projectCount}</p>
                            <p className="text-xs text-muted-foreground">{t("admin.buPerf.totalProjectsLabel")}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-2xl font-bold text-blue-500">{stat.activeProjectCount}</p>
                            <p className="text-xs text-muted-foreground">{t("admin.buPerf.inProgress")}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-2xl font-bold text-green-500">{stat.completedProjectCount}</p>
                            <p className="text-xs text-muted-foreground">{t("admin.buPerf.completed")}</p>
                          </div>
                        </div>

                        {/* 财务指标 */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("admin.buPerf.revenue")}</span>
                            <span className="font-medium">{stat.totalRevenue.toFixed(0)} {t("admin.buPerf.revenueUnit")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("admin.buPerf.costLabel")}</span>
                            <span className="font-medium">{stat.totalCost.toFixed(0)} {t("admin.buPerf.revenueUnit")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("admin.buPerf.grossProfitLabel")}</span>
                            <span className="font-medium text-green-500">{stat.grossProfit.toFixed(0)} {t("admin.buPerf.revenueUnit")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("admin.buPerf.grossMargin")}</span>
                            <span className="font-medium">{stat.grossMargin.toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* 效率指标 */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {t("admin.buPerf.staffUtilization")}
                              </span>
                              <span className="font-medium">{stat.utilizationRate.toFixed(1)}%</span>
                            </div>
                            <ProgressBar value={stat.utilizationRate} color="blue-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t("admin.buPerf.onTimeDelivery")}
                              </span>
                              <span className="font-medium">{stat.onTimeDeliveryRate.toFixed(1)}%</span>
                            </div>
                            <ProgressBar value={stat.onTimeDeliveryRate} color="green-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {t("admin.buPerf.custSatisfaction")}
                              </span>
                              <span className="font-medium">{stat.customerSatisfaction.toFixed(1)} / 5.0</span>
                            </div>
                            <ProgressBar value={stat.customerSatisfaction * 20} color="yellow-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>

            {/* Performance Records & Violations */}
            <PerformanceRiskSection selectedBU={selectedBU} />

            {/* BU对比表格 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("admin.buPerf.comparison")}
                </CardTitle>
                <CardDescription>
                  {t("admin.buPerf.comparisonDesc").replace("{period}", selectedPeriod)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">{t("admin.buPerf.thBU")}</th>
                        <th className="text-right py-3 px-2">{t("admin.buPerf.thProjects")}</th>
                        <th className="text-right py-3 px-2">{t("admin.buPerf.thRevenue")}</th>
                        <th className="text-right py-3 px-2">{t("admin.buPerf.thMargin")}</th>
                        <th className="text-right py-3 px-2">{t("admin.buPerf.thTeam")}</th>
                        <th className="text-right py-3 px-2">{t("admin.buPerf.thUtilization")}</th>
                        <th className="text-right py-3 px-2">{t("admin.buPerf.thDelivery")}</th>
                        <th className="text-right py-3 px-2">{t("admin.buPerf.thSatisfaction")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData?.stats
                        .filter(stat => !selectedBU || stat.buCode === selectedBU)
                        .map((stat) => {
                          const colors = BU_COLORS[stat.buCode] || BU_COLORS['BU1'];
                          const buName = BU_NAME_KEYS[stat.buCode] ? t(BU_NAME_KEYS[stat.buCode]) : stat.buCode;
                          
                          return (
                            <tr key={stat.buCode} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={`${colors.bg} ${colors.text}`}>{stat.buCode}</Badge>
                                  <span>{buName}</span>
                                </div>
                              </td>
                              <td className="text-right py-3 px-2">{stat.projectCount}</td>
                              <td className="text-right py-3 px-2">{stat.totalRevenue.toFixed(0)}</td>
                              <td className="text-right py-3 px-2">
                                <span className={stat.grossMargin >= 30 ? 'text-green-500' : stat.grossMargin >= 20 ? 'text-yellow-500' : 'text-red-500'}>
                                  {stat.grossMargin.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-right py-3 px-2">{stat.teamSize}</td>
                              <td className="text-right py-3 px-2">
                                <span className={stat.utilizationRate >= 80 ? 'text-green-500' : stat.utilizationRate >= 70 ? 'text-yellow-500' : 'text-red-500'}>
                                  {stat.utilizationRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-right py-3 px-2">
                                <span className={stat.onTimeDeliveryRate >= 90 ? 'text-green-500' : stat.onTimeDeliveryRate >= 80 ? 'text-yellow-500' : 'text-red-500'}>
                                  {stat.onTimeDeliveryRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-right py-3 px-2">
                                <div className="flex items-center justify-end gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  {stat.customerSatisfaction.toFixed(1)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
  );
}

// ── Performance Records + Violations Section ─────────────
function PerformanceRiskSection({ selectedBU }: { selectedBU: string | null }) {
  const { t } = useLanguage();
  const buId = selectedBU ? Number(selectedBU.replace("BU", "")) : undefined;

  const perfQuery = trpc.performanceRecord.list.useQuery(
    { buId, year: new Date().getFullYear(), limit: 10 },
  );
  const violationQuery = trpc.violationEvent.list.useQuery(
    { buId, limit: 5 },
  );
  const violationStats = trpc.violationEvent.stats.useQuery({ buId });

  const records = perfQuery.data?.items || [];
  const violations = violationQuery.data?.items || [];
  const vStats = violationStats.data;

  // Skip section entirely if no data
  if (records.length === 0 && violations.length === 0 && !vStats?.total) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Records */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t("admin.buPerf.quarterlyRecords")}
            {records.some(r => r.isFrozen) && (
              <Badge className="bg-red-100 text-red-700 ml-2">
                <Lock className="h-3 w-3 mr-1" />
                {t("admin.buPerf.containsFrozen")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("admin.buPerf.noRecords")}</p>
          ) : (
            <div className="space-y-2">
              {records.map(r => (
                <div key={r.id} className={`p-3 rounded-lg border ${r.isFrozen ? "bg-red-50 border-red-200" : "bg-muted/30 border-transparent"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {r.isFrozen ? (
                        <Lock className="h-4 w-4 text-red-500" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-sm font-medium">
                        BU#{r.buId} · {r.year}年Q{r.quarter}
                      </span>
                      <Badge variant="outline" className="text-xs">{r.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span>KPI: <strong>{r.kpiScore ?? "-"}</strong></span>
                      <span>系数: <strong>{r.bonusCoefficient ?? "1.00"}</strong></span>
                      <Badge className="text-xs">v{r.version}</Badge>
                    </div>
                  </div>
                  {r.isFrozen && r.frozenReason && (
                    <div className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {r.frozenReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Violation Events */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            {t("admin.buPerf.riskEvents")}
            {vStats && vStats.activeCount > 0 && (
              <Badge className="bg-red-100 text-red-700 ml-2">{vStats.activeCount} {t("admin.buPerf.active")}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-6 w-6 mx-auto text-green-400 mb-1" />
              <p className="text-sm text-muted-foreground">{t("admin.buPerf.noRiskEvents")}</p>
            </div>
          ) : (
            <ViolationAlert violations={violations as any} compact />
          )}
          {vStats && vStats.total > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-2 border-t text-xs text-muted-foreground">
              <span>{t("admin.buPerf.minor")} {vStats.bySeverity.MINOR}</span>
              <span>{t("admin.buPerf.major")} <strong className="text-orange-600">{vStats.bySeverity.MAJOR}</strong></span>
              <span>{t("admin.buPerf.criticalSeverity")} <strong className="text-red-600">{vStats.bySeverity.CRITICAL}</strong></span>
              <span className="ml-auto">{t("admin.buPerf.resolved")} {vStats.byStatus.resolved}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
