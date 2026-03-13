/**
 * 事业部经理驾驶舱 — BU Manager Cockpit
 *
 * 面向 bu_gm 角色的综合运营驾驶舱，展示本事业部的核心经营指标：
 * - KPI 概览（营收/项目/团队/满意度）
 * - 销售目标完成情况
 * - 项目管道（进行中/已完成/延期）
 * - 团队利用率与交付效率
 * - 质量指标
 *
 * 数据来源：buMapping, buSalesTarget, bu, project 等现有 tRPC 路由
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, TrendingUp, TrendingDown, Users, FolderKanban,
  DollarSign, Star, RefreshCw, Target, Clock, CheckCircle2,
  AlertTriangle, BarChart3, Briefcase, ShieldCheck, Activity,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function pctColor(pct: number, good = 80, warn = 60) {
  return pct >= good ? "text-green-600" : pct >= warn ? "text-yellow-600" : "text-red-600";
}

function trendIcon(trend: "up" | "down" | "flat") {
  if (trend === "up") return <ArrowUpRight className="h-3 w-3 text-green-500" />;
  if (trend === "down") return <ArrowDownRight className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

// ── KPI Metric Card ──────────────────────────────────────────────────

function MetricCard({ title, value, unit, icon: Icon, subtitle, trend, color = "primary" }: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  trend?: "up" | "down" | "flat";
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {subtitle && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {trend && trendIcon(trend)}
                <span>{subtitle}</span>
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-lg bg-${color}/10`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Progress Row ─────────────────────────────────────────────────────

function ProgressRow({ label, value, max = 100, suffix = "%", icon: Icon }: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </span>
        <span className={`font-medium ${pctColor(pct)}`}>
          {typeof value === "number" ? value.toFixed(1) : value}{suffix}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function BuManagerCockpit() {
  const { language, t } = useLanguage();
  const isZh = language === "zh";
  const { currentBU } = useUserProfile();
  const period = getCurrentPeriod();

  // ── Data queries ────────────────────────────────────────────────────
  const perfStatsQuery = trpc.buMapping.getPerformanceStats.useQuery({
    period,
    periodType: "monthly",
  });

  const salesDashQuery = trpc.buSalesTarget.dashboard.useQuery();

  const buListQuery = trpc.buMapping.getAllBUs.useQuery();

  // ── Derived data ────────────────────────────────────────────────────
  const myBuStats = useMemo(() => {
    if (!perfStatsQuery.data?.stats) return null;
    if (currentBU) {
      return perfStatsQuery.data.stats.find((s) => s.buCode === currentBU) ?? null;
    }
    // If no BU selected (director/admin), aggregate all
    const all = perfStatsQuery.data.stats;
    if (all.length === 0) return null;
    return {
      buCode: "ALL",
      projectCount: all.reduce((s, x) => s + x.projectCount, 0),
      activeProjectCount: all.reduce((s, x) => s + x.activeProjectCount, 0),
      completedProjectCount: all.reduce((s, x) => s + x.completedProjectCount, 0),
      totalRevenue: all.reduce((s, x) => s + x.totalRevenue, 0),
      totalCost: all.reduce((s, x) => s + x.totalCost, 0),
      grossProfit: all.reduce((s, x) => s + x.grossProfit, 0),
      grossMargin: all.length > 0 ? all.reduce((s, x) => s + x.grossMargin, 0) / all.length : 0,
      teamSize: all.reduce((s, x) => s + x.teamSize, 0),
      utilizationRate: all.length > 0 ? all.reduce((s, x) => s + x.utilizationRate, 0) / all.length : 0,
      onTimeDeliveryRate: all.length > 0 ? all.reduce((s, x) => s + x.onTimeDeliveryRate, 0) / all.length : 0,
      customerSatisfaction: all.length > 0 ? all.reduce((s, x) => s + x.customerSatisfaction, 0) / all.length : 0,
    };
  }, [perfStatsQuery.data, currentBU]);

  const salesDash = salesDashQuery.data ?? {
    totalPlans: 0, totalSalesTarget: 0, totalOutputTarget: 0, avgGrowth: 0, pendingApprovals: 0,
  };

  const buName = useMemo(() => {
    if (!currentBU) return isZh ? "全部事业部" : "All Business Units";
    const buList = buListQuery.data?.bus ?? [];
    return buList.find((b) => b.code === currentBU)?.name ?? currentBU;
  }, [currentBU, buListQuery.data, isZh]);

  const isLoading = perfStatsQuery.isLoading;

  const refreshAll = () => {
    perfStatsQuery.refetch();
    salesDashQuery.refetch();
  };

  // ── Revenue achievement ────────────────────────────────────────────
  const revenueAchievement = salesDash.totalSalesTarget > 0
    ? ((myBuStats?.totalRevenue ?? 0) / salesDash.totalSalesTarget) * 100
    : 0;

  const delayedProjects = (myBuStats?.projectCount ?? 0) - (myBuStats?.activeProjectCount ?? 0) - (myBuStats?.completedProjectCount ?? 0);

  return (
    <ErrorBoundary level="page">
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title={isZh ? `${buName} — 经理驾驶舱` : `${buName} — Manager Cockpit`}
        description={isZh
          ? `${period.replace("-", "年")}月运营全景 · 项目/营收/团队/质量一屏掌控`
          : `${period} operational overview — projects, revenue, team, quality at a glance`}
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            {isZh ? "刷新" : "Refresh"}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !myBuStats ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isZh ? "暂无绩效数据，请先在BU绩效看板初始化数据" : "No performance data available"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Row 1: Top KPI Cards ───────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title={isZh ? "本月营收" : "Monthly Revenue"}
              value={myBuStats.totalRevenue.toFixed(0)}
              unit={isZh ? "万元" : "K"}
              icon={DollarSign}
              subtitle={isZh ? `毛利 ${myBuStats.grossProfit.toFixed(0)}万` : `Profit ${myBuStats.grossProfit.toFixed(0)}K`}
              trend={myBuStats.grossMargin >= 25 ? "up" : myBuStats.grossMargin >= 15 ? "flat" : "down"}
              color="green-600"
            />
            <MetricCard
              title={isZh ? "项目总数" : "Total Projects"}
              value={myBuStats.projectCount}
              unit={isZh ? "个" : ""}
              icon={FolderKanban}
              subtitle={isZh
                ? `进行中 ${myBuStats.activeProjectCount} · 完成 ${myBuStats.completedProjectCount}`
                : `Active ${myBuStats.activeProjectCount} · Done ${myBuStats.completedProjectCount}`}
              trend={myBuStats.completedProjectCount > myBuStats.activeProjectCount ? "up" : "flat"}
              color="blue-600"
            />
            <MetricCard
              title={isZh ? "团队人数" : "Team Size"}
              value={myBuStats.teamSize}
              unit={isZh ? "人" : ""}
              icon={Users}
              subtitle={isZh
                ? `利用率 ${myBuStats.utilizationRate.toFixed(1)}%`
                : `Util. ${myBuStats.utilizationRate.toFixed(1)}%`}
              trend={myBuStats.utilizationRate >= 80 ? "up" : myBuStats.utilizationRate >= 65 ? "flat" : "down"}
              color="purple-600"
            />
            <MetricCard
              title={isZh ? "客户满意度" : "Customer Satisfaction"}
              value={myBuStats.customerSatisfaction.toFixed(1)}
              unit="/ 5.0"
              icon={Star}
              subtitle={myBuStats.customerSatisfaction >= 4.5
                ? (isZh ? "优秀" : "Excellent")
                : myBuStats.customerSatisfaction >= 4.0
                  ? (isZh ? "良好" : "Good")
                  : (isZh ? "待提升" : "Needs improvement")}
              trend={myBuStats.customerSatisfaction >= 4.5 ? "up" : myBuStats.customerSatisfaction >= 4 ? "flat" : "down"}
              color="yellow-600"
            />
          </div>

          {/* ── Row 2: Sales Target + Project Pipeline + Efficiency ───── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* Sales Target Achievement */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-4 h-4 text-primary" />
                  {isZh ? "销售目标达成" : "Sales Target Achievement"}
                </CardTitle>
                <CardDescription>
                  {isZh ? "年度销售目标与实际进度" : "Annual target vs actual progress"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`text-3xl font-bold ${pctColor(revenueAchievement, 80, 50)}`}>
                    {revenueAchievement.toFixed(1)}%
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{isZh ? "完成率" : "Achievement"}</span>
                      <span>{myBuStats.totalRevenue.toFixed(0)} / {salesDash.totalSalesTarget.toFixed(0)}</span>
                    </div>
                    <Progress value={Math.min(revenueAchievement, 100)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 text-center">
                    <div className="text-lg font-bold">{salesDash.totalPlans}</div>
                    <div className="text-xs text-muted-foreground">{isZh ? "销售计划" : "Sales Plans"}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 text-center">
                    <div className="text-lg font-bold">{salesDash.totalOutputTarget.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">{isZh ? "产出目标(万)" : "Output Target"}</div>
                  </div>
                </div>
                {salesDash.pendingApprovals > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {salesDash.pendingApprovals} {isZh ? "个待审批调整" : "pending adjustments"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Pipeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {isZh ? "项目管道" : "Project Pipeline"}
                </CardTitle>
                <CardDescription>
                  {isZh ? "本事业部项目分布" : "Project status distribution"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                    <div className="text-xl font-bold text-blue-600">{myBuStats.activeProjectCount}</div>
                    <div className="text-xs text-muted-foreground">{isZh ? "进行中" : "Active"}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                    <div className="text-xl font-bold text-green-600">{myBuStats.completedProjectCount}</div>
                    <div className="text-xs text-muted-foreground">{isZh ? "已完成" : "Completed"}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-orange-50 border-orange-200">
                    <div className="text-xl font-bold text-orange-600">{Math.max(0, delayedProjects)}</div>
                    <div className="text-xs text-muted-foreground">{isZh ? "其他" : "Other"}</div>
                  </div>
                </div>

                {/* Completion progress */}
                {myBuStats.projectCount > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{isZh ? "项目完成率" : "Completion Rate"}</span>
                      <span>{((myBuStats.completedProjectCount / myBuStats.projectCount) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(myBuStats.completedProjectCount / myBuStats.projectCount) * 100} />
                  </div>
                )}

                {/* On-time delivery indicator */}
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/30 border">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isZh ? "准时交付率" : "On-time Delivery"}
                  </span>
                  <span className={`text-sm font-bold ${pctColor(myBuStats.onTimeDeliveryRate, 90, 75)}`}>
                    {myBuStats.onTimeDeliveryRate.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Team Efficiency */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="w-4 h-4 text-primary" />
                  {isZh ? "团队效率" : "Team Efficiency"}
                </CardTitle>
                <CardDescription>
                  {isZh ? "人员利用率与交付效能" : "Utilization and delivery performance"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressRow
                  label={isZh ? "人员利用率" : "Utilization Rate"}
                  value={myBuStats.utilizationRate}
                  icon={Users}
                />
                <ProgressRow
                  label={isZh ? "准时交付率" : "On-time Delivery"}
                  value={myBuStats.onTimeDeliveryRate}
                  icon={Clock}
                />
                <ProgressRow
                  label={isZh ? "毛利率" : "Gross Margin"}
                  value={myBuStats.grossMargin}
                  icon={TrendingUp}
                />
                <ProgressRow
                  label={isZh ? "客户满意度" : "CSAT Score"}
                  value={myBuStats.customerSatisfaction * 20}
                  suffix={` (${myBuStats.customerSatisfaction.toFixed(1)}/5)`}
                  icon={Star}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── Row 3: Financial + Quality + Actions ──────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Financial Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-4 h-4 text-primary" />
                  {isZh ? "财务概览" : "Financial Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">{isZh ? "总营收" : "Revenue"}</span>
                    <span className="text-sm font-bold">{myBuStats.totalRevenue.toFixed(0)} {isZh ? "万元" : "K"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">{isZh ? "总成本" : "Total Cost"}</span>
                    <span className="text-sm font-bold">{myBuStats.totalCost.toFixed(0)} {isZh ? "万元" : "K"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">{isZh ? "毛利润" : "Gross Profit"}</span>
                    <span className="text-sm font-bold text-green-600">{myBuStats.grossProfit.toFixed(0)} {isZh ? "万元" : "K"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">{isZh ? "毛利率" : "Gross Margin"}</span>
                    <span className={`text-lg font-bold ${pctColor(myBuStats.grossMargin, 25, 15)}`}>
                      {myBuStats.grossMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Scorecard */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  {isZh ? "运营健康度" : "Operations Health"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <HealthIndicator
                    label={isZh ? "准时交付" : "On-time"}
                    value={myBuStats.onTimeDeliveryRate}
                    good={90}
                    warn={75}
                  />
                  <HealthIndicator
                    label={isZh ? "客户满意" : "CSAT"}
                    value={myBuStats.customerSatisfaction * 20}
                    good={90}
                    warn={70}
                    displayValue={`${myBuStats.customerSatisfaction.toFixed(1)}/5`}
                  />
                  <HealthIndicator
                    label={isZh ? "团队利用" : "Utilization"}
                    value={myBuStats.utilizationRate}
                    good={80}
                    warn={60}
                  />
                  <HealthIndicator
                    label={isZh ? "毛利率" : "Margin"}
                    value={myBuStats.grossMargin}
                    good={25}
                    warn={15}
                  />
                </div>
                {/* Overall score */}
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{isZh ? "综合健康评分" : "Overall Health Score"}</span>
                    {(() => {
                      const scores = [
                        myBuStats.onTimeDeliveryRate >= 90 ? 1 : myBuStats.onTimeDeliveryRate >= 75 ? 0.5 : 0,
                        myBuStats.customerSatisfaction >= 4.5 ? 1 : myBuStats.customerSatisfaction >= 4 ? 0.5 : 0,
                        myBuStats.utilizationRate >= 80 ? 1 : myBuStats.utilizationRate >= 60 ? 0.5 : 0,
                        myBuStats.grossMargin >= 25 ? 1 : myBuStats.grossMargin >= 15 ? 0.5 : 0,
                      ];
                      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                      const grade = avg >= 0.75 ? "A" : avg >= 0.5 ? "B" : avg >= 0.25 ? "C" : "D";
                      const gradeColor = avg >= 0.75 ? "bg-green-100 text-green-800" : avg >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
                      return <Badge className={gradeColor}>{grade}</Badge>;
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}

// ── Health Indicator Sub-Component ───────────────────────────────────

function HealthIndicator({ label, value, good, warn, displayValue }: {
  label: string;
  value: number;
  good: number;
  warn: number;
  displayValue?: string;
}) {
  const status = value >= good ? "green" : value >= warn ? "yellow" : "red";
  const colors = {
    green: "bg-green-100 border-green-300 text-green-800",
    yellow: "bg-yellow-100 border-yellow-300 text-yellow-800",
    red: "bg-red-100 border-red-300 text-red-800",
  };
  const dotColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[status]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold">
        {displayValue ?? `${value.toFixed(1)}%`}
      </div>
    </div>
  );
}
