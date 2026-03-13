import { useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import NineGridMatrix from "@/components/NineGridMatrix";
import {
  Cpu, HardDrive, Database, Activity, Bot, AlertTriangle,
  FileOutput, GitBranch, Wifi, WifiOff, RefreshCw, Shield,
  TrendingUp, Users, Lightbulb, BarChart3, MonitorCheck,
} from "lucide-react";

// ---- Gauge component (circular progress indicator) ----
function Gauge({ value, label, icon: Icon, color }: {
  value: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const status =
    clampedValue >= 90 ? "text-red-500" :
    clampedValue >= 75 ? "text-yellow-500" :
    "text-green-500";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
            className="text-muted/30" strokeWidth="5" />
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
            className={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${(clampedValue / 100) * 175.9} 175.9`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${status}`} />
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${status}`}>{clampedValue}%</span>
    </div>
  );
}

// ---- Stat row helper ----
function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold">{value}</span>
        {sub && <span className="text-xs text-muted-foreground ml-1">({sub})</span>}
      </div>
    </div>
  );
}

export default function CtoTechnicalDashboard() {
  const { language, t } = useLanguage();
  const isZh = language === "zh";
  const [selectedCell, setSelectedCell] = useState<{
    row: number; col: number; employees: Array<{ id: number; name: string; performance: number; potential: number }>;
  } | null>(null);

  // ---- tRPC queries (retry:false to avoid spamming on DB table missing) ----
  const queryOpts = { retry: false } as const;

  const healthQuery = trpc.ctoDashboard.systemHealth.useQuery(undefined, {
    refetchInterval: 15_000, ...queryOpts,
  });

  const designQuery = trpc.ctoDashboard.designActivity.useQuery(undefined, {
    refetchInterval: 60_000, ...queryOpts,
  });

  const robotQuery = trpc.ctoDashboard.robotFleet.useQuery(undefined, {
    refetchInterval: 10_000, ...queryOpts,
  });

  const conflictQuery = trpc.ctoDashboard.designConflicts.useQuery(undefined, queryOpts);

  const nineGridQuery = trpc.ctoDashboard.nineGridData.useQuery(undefined, queryOpts);

  const stabilityQuery = trpc.systemStability.overview.useQuery(undefined, {
    refetchInterval: 30_000, ...queryOpts,
  });

  // ---- Derived data aligned to actual backend response shapes ----
  const healthRaw = healthQuery.data as any;
  const health = {
    cpu: healthRaw?.cpu?.usage ?? 0,
    memory: healthRaw?.memory?.usagePct ?? 0,
    // DB gauge: convert latency to a health %; <50ms=green, 50-200ms=yellow, >200ms=red
    db: healthRaw?.database?.latencyMs != null
      ? Math.min(100, Math.max(0, (healthRaw.database.latencyMs / 200) * 100))
      : 0,
    dbLatency: healthRaw?.database?.latencyMs ?? -1,
    dbGrade: healthRaw?.database?.grade ?? "green",
    uptime: healthRaw?.updatedAt ? "OK" : "N/A",
  };

  // Design Activity — backend returns { exports: { total, formatBreakdown, recent }, syncEvents: { total, typeBreakdown, recent }, periodDays }
  const designRaw = designQuery.data as any;
  const design = {
    exportTotal: designRaw?.exports?.total ?? 0,
    syncTotal: designRaw?.syncEvents?.total ?? 0,
    periodDays: designRaw?.periodDays ?? 30,
    formatBreakdown: designRaw?.exports?.formatBreakdown ?? {},
    recentExports: designRaw?.exports?.recent ?? [],
  };

  // Robot Fleet — backend returns { totalRobots, statusCounts, brandCounts, recentCriticalAlerts, alerts }
  const robotsRaw = robotQuery.data as any;
  const robots = {
    online: robotsRaw?.statusCounts?.online ?? 0,
    offline: robotsRaw?.statusCounts?.offline ?? 0,
    error: (robotsRaw?.statusCounts?.error ?? 0) + (robotsRaw?.statusCounts?.maintenance ?? 0),
    total: robotsRaw?.totalRobots ?? 0,
    criticalAlerts: robotsRaw?.recentCriticalAlerts ?? 0,
    brandCounts: robotsRaw?.brandCounts ?? {},
  };

  // Conflicts — backend returns { projectsChecked, projectsWithConflicts, totalConflicts, results: [{projectId, hasConflicts, conflicts, recommendation}] }
  const conflictsRaw = conflictQuery.data as any;
  const conflictResults = (conflictsRaw?.results ?? []).filter((r: any) => r.hasConflicts);
  const conflicts = conflictResults.map((r: any) => ({
    projectId: r.projectId,
    projectName: r.projectName || `Project #${r.projectId}`,
    conflictCount: r.conflicts?.length ?? 0,
    severity: (r.conflicts?.length ?? 0) >= 5 ? "critical" : (r.conflicts?.length ?? 0) >= 2 ? "high" : "medium",
  }));

  // Nine Grid — backend returns { grid: { "high-high": [{userId, userName, score, slope}], ... }, summary, totalEmployees }
  const nineGridRaw = nineGridQuery.data as any;
  const nineGrid = (() => {
    if (!nineGridRaw?.grid) return [];
    const employees: Array<{ id: number; name: string; performance: number; potential: number }> = [];
    for (const cellEmployees of Object.values(nineGridRaw.grid) as any[]) {
      for (const emp of cellEmployees) {
        employees.push({
          id: emp.userId,
          name: emp.userName,
          performance: Math.max(0, Math.min(100, emp.score ?? 0)),
          // Normalize slope (-5..+5) to 0-100 range for NineGridMatrix buckets
          potential: Math.max(0, Math.min(100, ((emp.slope ?? 0) + 3) * (100 / 6))),
        });
      }
    }
    return employees;
  })();
  const nineGridTotal = nineGridRaw?.totalEmployees ?? nineGrid.length;

  // System Stability — backend returns { score, grade, trend, recommendations: string[], ... }
  const stabilityRaw = stabilityQuery.data as any;
  const stability = {
    score: stabilityRaw?.score ?? 0,
    grade: stabilityRaw?.grade ?? "yellow",
    trend: stabilityRaw?.trend ?? "stable",
    recommendations: (stabilityRaw?.recommendations ?? []) as string[],
  };

  const isLoading =
    healthQuery.isLoading || designQuery.isLoading || robotQuery.isLoading ||
    conflictQuery.isLoading || nineGridQuery.isLoading || stabilityQuery.isLoading;

  const refreshAll = () => {
    healthQuery.refetch();
    designQuery.refetch();
    robotQuery.refetch();
    conflictQuery.refetch();
    nineGridQuery.refetch();
    stabilityQuery.refetch();
  };

  // ---- Severity badge helper ----
  const severityBadge = (sev: string) => {
    if (sev === "critical") return <Badge variant="destructive">{sev}</Badge>;
    if (sev === "high") return <Badge className="bg-orange-500 text-white">{sev}</Badge>;
    return <Badge variant="secondary">{sev}</Badge>;
  };

  const stabilityColor =
    stability.score >= 90 ? "text-green-600" :
    stability.score >= 70 ? "text-yellow-600" :
    "text-red-600";

  // Collect query errors for display
  const queryErrors = [
    healthQuery.error && `Health: ${healthQuery.error.message}`,
    designQuery.error && `Design: ${designQuery.error.message}`,
    robotQuery.error && `Robot: ${robotQuery.error.message}`,
    conflictQuery.error && `Conflict: ${conflictQuery.error.message}`,
    nineGridQuery.error && `NineGrid: ${nineGridQuery.error.message}`,
    stabilityQuery.error && `Stability: ${stabilityQuery.error.message}`,
  ].filter(Boolean) as string[];

  return (
    <ErrorBoundary level="page">
    <div className="space-y-6">
      <PageHeader
        icon={MonitorCheck}
        title={isZh ? "CTO 技术仪表板" : "CTO Technical Dashboard"}
        description={isZh ? "系统架构、设计引擎、机器人舰队总览" : "System architecture, design engine, and robot fleet overview"}
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            {isZh ? "刷新" : "Refresh"}
          </Button>
        }
      />

      {/* Error banner — show but don't block entire page */}
      {queryErrors.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          <div className="flex items-center gap-2 font-medium mb-1">
            <AlertTriangle className="h-4 w-4" />
            {isZh ? "部分数据加载失败（不影响已加载模块）" : "Some queries failed (loaded modules still work)"}
          </div>
          <ul className="text-xs space-y-0.5 ml-6 list-disc">
            {queryErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Row 1: System Health + Design Activity + Robot Fleet */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Section 1: System Architecture Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" />
              {isZh ? "系统架构健康" : "System Architecture Health"}
            </CardTitle>
            <CardDescription>
              {isZh ? "CPU / 内存 / 数据库" : "CPU / Memory / DB"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around">
              <Gauge value={health.cpu} label="CPU" icon={Cpu} color="text-blue-500" />
              <Gauge value={health.memory} label={isZh ? "内存" : "Memory"} icon={HardDrive} color="text-purple-500" />
              <Gauge value={health.db} label={isZh ? "数据库" : "DB"} icon={Database} color="text-amber-500" />
            </div>
            <div className="mt-4 pt-3 border-t flex justify-around text-center">
              <div>
                <span className="text-xs text-muted-foreground">{isZh ? "DB延迟" : "DB Latency"}</span>
                <div className={`text-sm font-semibold ${health.dbGrade === "green" ? "text-green-600" : health.dbGrade === "yellow" ? "text-yellow-600" : "text-red-600"}`}>
                  {health.dbLatency >= 0 ? `${health.dbLatency}ms` : "N/A"}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{isZh ? "磁盘" : "Disk"}</span>
                <div className="text-sm font-semibold">
                  {healthRaw?.disk?.usagePct != null ? `${healthRaw.disk.usagePct}%` : "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Design Engine Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileOutput className="w-4 h-4 text-primary" />
              {isZh ? "设计引擎活动" : "Design Engine Activity"}
            </CardTitle>
            <CardDescription>
              {isZh ? "导出 / 版本 最近 7/30 天" : "Exports / Versions last 7/30 days"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatRow
              label={isZh ? "设计导出" : "Design Exports"}
              value={design.exportTotal}
              sub={`${design.periodDays}d`}
            />
            <StatRow
              label={isZh ? "同步事件" : "Sync Events"}
              value={design.syncTotal}
              sub={`${design.periodDays}d`}
            />
            <div className="border-t pt-2 mt-2">
              <span className="text-xs text-muted-foreground font-medium">
                {isZh ? "导出格式分布" : "Export Formats"}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(design.formatBreakdown).length > 0
                  ? Object.entries(design.formatBreakdown).slice(0, 5).map(([fmt, cnt]) => (
                      <Badge key={fmt} variant="outline" className="text-xs">
                        {fmt}: {cnt as number}
                      </Badge>
                    ))
                  : <span className="text-xs text-muted-foreground">{isZh ? "无数据" : "No data"}</span>
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Robot Fleet Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-4 h-4 text-primary" />
              {isZh ? "机器人舰队" : "Robot Fleet Summary"}
            </CardTitle>
            <CardDescription>
              {isZh ? `共 ${robots.total} 台` : `${robots.total} total units`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded-lg p-3">
                <Wifi className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-600">{robots.online}</div>
                <div className="text-xs text-muted-foreground">{isZh ? "在线" : "Online"}</div>
              </div>
              <div className="border rounded-lg p-3">
                <WifiOff className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-gray-500">{robots.offline}</div>
                <div className="text-xs text-muted-foreground">{isZh ? "离线" : "Offline"}</div>
              </div>
              <div className="border rounded-lg p-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <div className="text-lg font-bold text-red-600">{robots.error}</div>
                <div className="text-xs text-muted-foreground">{isZh ? "异常" : "Error"}</div>
              </div>
            </div>
            {robots.total > 0 && (
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{isZh ? "在线率" : "Online Rate"}</span>
                    <span>{Math.round((robots.online / robots.total) * 100)}%</span>
                  </div>
                  <Progress value={(robots.online / robots.total) * 100} />
                </div>
                {robots.criticalAlerts > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    {robots.criticalAlerts} {isZh ? "个严重告警 (7天内)" : "critical alerts (7d)"}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Conflicts + Nine Grid + Stability */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Section 4: Conflict Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="w-4 h-4 text-primary" />
              {isZh ? "设计冲突" : "Conflict Status"}
            </CardTitle>
            <CardDescription>
              {isZh
                ? `${conflicts.length} 个项目存在未解决冲突`
                : `${conflicts.length} projects with unresolved conflicts`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Shield className="w-8 h-8 mb-2 text-green-500" />
                <span className="text-sm">{isZh ? "无冲突" : "No conflicts"}</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {conflicts.map((c) => (
                  <div
                    key={c.projectId}
                    className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                  >
                    <div>
                      <span className="text-sm font-medium">{c.projectName}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {c.conflictCount} {isZh ? "个冲突" : "conflicts"}
                        </span>
                      </div>
                    </div>
                    {severityBadge(c.severity)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 5: Nine Grid Employee Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" />
              {isZh ? "九宫格人才矩阵" : "Nine Grid Employee Matrix"}
            </CardTitle>
            <CardDescription>
              {isZh
                ? `共 ${nineGridTotal} 名技术人员`
                : `${nineGridTotal} technical employees`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NineGridMatrix
              data={nineGrid}
              onCellClick={(cell) => setSelectedCell(cell)}
            />
            {selectedCell && selectedCell.employees.length > 0 && (
              <div className="mt-3 p-2 rounded-md border bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">
                    {isZh ? "选中人员" : "Selected employees"} ({selectedCell.employees.length})
                  </span>
                  <Button variant="ghost" size="sm" className="h-5 text-xs px-1"
                    onClick={() => setSelectedCell(null)}>
                    &times;
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedCell.employees.slice(0, 10).map((e) => (
                    <Badge key={e.id} variant="outline" className="text-xs">{e.name}</Badge>
                  ))}
                  {selectedCell.employees.length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedCell.employees.length - 10}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 6: System Stability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" />
              {isZh ? "系统稳定性" : "System Stability"}
            </CardTitle>
            <CardDescription>
              {isZh ? "综合评分 & 优化建议" : "Capacity score & recommendations"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Score display */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-4xl font-bold ${stabilityColor}`}>
                {stability.score}
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{isZh ? "稳定性评分" : "Stability Score"}</span>
                  <span>{stability.score}/100</span>
                </div>
                <Progress value={stability.score} />
              </div>
            </div>

            {/* Trend indicator */}
            <div className="flex items-center gap-1 mb-3 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">
                {isZh ? "趋势稳定" : "Stable trend"}
              </span>
            </div>

            {/* Recommendations */}
            <div className="border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                <Lightbulb className="w-3 h-3" />
                {isZh ? "优化建议" : "Recommendations"}
              </span>
              {stability.recommendations.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {isZh ? "系统运行良好" : "System is running well"}
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {stability.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <Badge
                        variant={stability.grade === "red" ? "destructive" : "secondary"}
                        className="text-[10px] shrink-0 mt-0.5"
                      >
                        {stability.grade === "red" ? "high" : stability.grade === "yellow" ? "medium" : "low"}
                      </Badge>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </ErrorBoundary>
  );
}
