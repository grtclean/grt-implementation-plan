/**
 * 生产指挥中心 - Production Command Center
 * 统一聚合生产制造各模块数据的综合看板
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard as GrtStatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Monitor,
  Home,
  ChevronRight,
  Factory,
  Gauge,
  ShieldCheck,
  Package,
  Lock,
  ClipboardCheck,
  CalendarClock,
  AlertTriangle,
  MapPin,
  Users,
} from "lucide-react";

// ======== Query options shared across all queries ========
const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function ProductionCommandCenter() {
  const [activeTab, setActiveTab] = useState("process");

  // ── Stat card queries ──
  const { data: productionStats, isLoading: productionStatsLoading, isError: productionStatsError } =
    trpc.productionDashboard.getDashboardStats.useQuery(undefined, QUERY_OPTS);

  const { data: qcStats, isLoading: qcStatsLoading, isError: qcStatsError } =
    trpc.productionDashboard.getQCStats.useQuery(undefined, QUERY_OPTS);

  const { data: processStats, isLoading: processStatsLoading, isError: processStatsError } =
    trpc.processManagement.getProcessDashboardStats.useQuery({}, QUERY_OPTS);

  // ── Tab 1: Process progress data ──
  const { data: processDefinitions, isLoading: defsLoading, isError: defsError } =
    trpc.processManagement.getProcessDefinitions.useQuery(undefined, QUERY_OPTS);

  const { data: processInstances, isLoading: instancesLoading, isError: instancesError } =
    trpc.processManagement.getProjectProcessInstances.useQuery(undefined, QUERY_OPTS);

  // ── Tab 2: Scheduling data ──
  const { data: schedulingStats, isLoading: schedStatsLoading, isError: schedStatsError } =
    trpc.scheduling.getStatistics.useQuery(undefined, QUERY_OPTS);

  const { data: schedulingTasks, isLoading: schedTasksLoading, isError: schedTasksError } =
    trpc.scheduling.listTasks.useQuery(undefined, QUERY_OPTS);

  // ── Tab 4: UWB worker locations ──
  const { data: realtimeLocations, isLoading: locationsLoading, isError: locationsError } =
    trpc.uwb.getRealtimeLocations.useQuery(undefined, QUERY_OPTS);

  const { data: todayWorkHours, isLoading: workHoursLoading, isError: workHoursError } =
    trpc.uwb.getTodayWorkHoursOverview.useQuery(undefined, QUERY_OPTS);

  // ── Derived stat values ──
  const inProgressOrders = productionStatsError ? "--" : (productionStats?.summary?.inProgressOrders ?? 0);
  const equipUtilization = productionStatsError ? "--" : `${productionStats?.equipment?.avgUtilization ?? 0}%`;
  const qualityPassRate = qcStatsError ? "--" : (qcStats?.stats?.passRate ?? "0%");
  const todayOutput = productionStatsError ? "--" : (productionStats?.summary?.completedQuantity ?? 0);
  const qualityLockCount = productionStatsError
    ? "--"
    : (productionStats?.summary?.qualityCheckOrders ?? 0);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Monitor}
          title="生产指挥中心"
          description="统一查看工序进度、排程执行、质量监控和工人分布"
        />

        {/* ── Stat Cards (5 metrics) ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <GrtStatCard icon={Factory} label="进行中工单" value={productionStatsLoading ? "..." : inProgressOrders} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <GrtStatCard icon={Gauge} label="设备利用率" value={productionStatsLoading ? "..." : equipUtilization} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <GrtStatCard icon={ShieldCheck} label="质量通过率" value={qcStatsLoading ? "..." : qualityPassRate} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          <GrtStatCard icon={Package} label="今日产出" value={productionStatsLoading ? "..." : todayOutput} iconColor="text-cyan-500" iconBg="bg-cyan-500/10" />
          <GrtStatCard icon={Lock} label="质量锁定" value={productionStatsLoading ? "..." : qualityLockCount} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        </div>

        {/* ── Tab area ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="process">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              工序进度
            </TabsTrigger>
            <TabsTrigger value="scheduling">
              <CalendarClock className="w-4 h-4 mr-2" />
              排程执行
            </TabsTrigger>
            <TabsTrigger value="quality">
              <AlertTriangle className="w-4 h-4 mr-2" />
              质量监控
            </TabsTrigger>
            <TabsTrigger value="workers">
              <MapPin className="w-4 h-4 mr-2" />
              工人分布
            </TabsTrigger>
          </TabsList>

          {/* Tab 1 - Process progress */}
          <TabsContent value="process" className="mt-6">
            <ProcessProgressTab
              definitions={processDefinitions}
              instances={processInstances}
              stats={processStats}
              loading={defsLoading || instancesLoading || processStatsLoading}
              error={defsError || instancesError || processStatsError}
            />
          </TabsContent>

          {/* Tab 2 - Scheduling execution */}
          <TabsContent value="scheduling" className="mt-6">
            <SchedulingTab
              stats={schedulingStats}
              tasks={schedulingTasks}
              statsLoading={schedStatsLoading}
              tasksLoading={schedTasksLoading}
              error={schedStatsError || schedTasksError}
            />
          </TabsContent>

          {/* Tab 3 - Quality monitoring */}
          <TabsContent value="quality" className="mt-6">
            <QualityTab
              qcStats={qcStats}
              loading={qcStatsLoading}
              error={qcStatsError}
            />
          </TabsContent>

          {/* Tab 4 - Worker distribution */}
          <TabsContent value="workers" className="mt-6">
            <WorkerDistributionTab
              locations={realtimeLocations}
              workHours={todayWorkHours}
              locationsLoading={locationsLoading}
              workHoursLoading={workHoursLoading}
              error={locationsError || workHoursError}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════════
// StatCard component (same pattern as RDVerificationCenter)
// ═══════════════════════════════════════════
function StatCard({
  borderColor,
  iconBg,
  icon,
  label,
  value,
  loading,
}: {
  borderColor: string;
  iconBg: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4 h-12">
          {loading ? (
            <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
          ) : (
            <div className={`p-3 rounded-lg shrink-0 ${iconBg}`}>{icon}</div>
          )}
          <div className="min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-7 w-12" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// Tab 1: Process Progress (T1-T15)
// ═══════════════════════════════════════════
function ProcessProgressTab({
  definitions,
  instances,
  stats,
  loading,
  error,
}: {
  definitions: any;
  instances: any;
  stats: any;
  loading: boolean;
  error: boolean;
}) {
  if (error) {
    return <EmptyState message="暂无数据" />;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Group instances by project
  const projectMap = new Map<string, any[]>();
  if (Array.isArray(instances)) {
    for (const inst of instances) {
      const key = inst.projectName || `Project ${inst.projectId}`;
      if (!projectMap.has(key)) {
        projectMap.set(key, []);
      }
      projectMap.get(key)!.push(inst);
    }
  }

  const statusColor: Record<string, string> = {
    COMPLETED: "bg-green-500",
    IN_PROGRESS: "bg-blue-500",
    NOT_STARTED: "bg-gray-400",
    ON_HOLD: "bg-yellow-500",
    BLOCKED: "bg-red-500",
  };

  const statusLabel: Record<string, string> = {
    COMPLETED: "已完成",
    IN_PROGRESS: "进行中",
    NOT_STARTED: "未开始",
    ON_HOLD: "暂停",
    BLOCKED: "阻塞",
  };

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      {stats?.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">工序统计概览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{stats.summary.total}</p>
                <p className="text-xs text-muted-foreground">工序总数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.summary.completed}</p>
                <p className="text-xs text-muted-foreground">已完成</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.summary.inProgress}</p>
                <p className="text-xs text-muted-foreground">进行中</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.summary.avgCompletionRate}%</p>
                <p className="text-xs text-muted-foreground">平均完成率</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* T-stage pipeline per project */}
      {Array.from(projectMap.entries()).map(([projectName, projInstances]) => (
        <Card key={projectName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{projectName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {(definitions || []).map((def: any) => {
                  const inst = projInstances.find((p: any) => p.processCode === def.code);
                  const status = inst?.status || "NOT_STARTED";
                  const pct = inst?.completionPercentage ?? 0;
                  return (
                    <div
                      key={def.code}
                      className="flex flex-col items-center w-16 text-center"
                      title={`${def.code} ${def.nameZh} - ${statusLabel[status] || status} (${pct}%)`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${statusColor[status] || "bg-gray-400"}`}
                      >
                        {def.code}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 leading-tight truncate w-full">
                        {def.nameZh}
                      </span>
                      <span className="text-[10px] font-medium">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {projectMap.size === 0 && <EmptyState message="暂无进行中的项目工序数据" />}
    </div>
  );
}

// ═══════════════════════════════════════════
// Tab 2: Scheduling Execution
// ═══════════════════════════════════════════
function SchedulingTab({
  stats,
  tasks,
  statsLoading,
  tasksLoading,
  error,
}: {
  stats: any;
  tasks: any;
  statsLoading: boolean;
  tasksLoading: boolean;
  error: boolean;
}) {
  if (error) {
    return <EmptyState message="暂无数据" />;
  }

  return (
    <div className="space-y-4">
      {/* Task distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">任务分布统计</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : stats?.tasks ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{stats.tasks.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">任务总数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">{stats.tasks.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">待排程</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.tasks.scheduled ?? 0}</p>
                <p className="text-xs text-muted-foreground">已排程</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-500">{stats.tasks.in_progress ?? 0}</p>
                <p className="text-xs text-muted-foreground">执行中</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.tasks.completed ?? 0}</p>
                <p className="text-xs text-muted-foreground">已完成</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          )}
        </CardContent>
      </Card>

      {/* Task list table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">排程任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : Array.isArray(tasks) && tasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">任务名称</th>
                    <th className="py-2 pr-4">类型</th>
                    <th className="py-2 pr-4">BU</th>
                    <th className="py-2 pr-4">优先级</th>
                    <th className="py-2 pr-4">状态</th>
                    <th className="py-2 pr-4">预估工时</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice(0, 20).map((task: any, idx: number) => (
                    <tr key={task.id || idx} className="border-b border-muted/30">
                      <td className="py-2 pr-4 font-medium">{task.task_name || task.taskName || "--"}</td>
                      <td className="py-2 pr-4">{task.task_type || task.taskType || "--"}</td>
                      <td className="py-2 pr-4">{task.bu_code || task.buCode || "--"}</td>
                      <td className="py-2 pr-4">{task.priority ?? "--"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            task.status === "completed"
                              ? "bg-green-500/10 text-green-500"
                              : task.status === "in_progress"
                              ? "bg-blue-500/10 text-blue-500"
                              : task.status === "scheduled"
                              ? "bg-cyan-500/10 text-cyan-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {task.status || "pending"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{task.estimated_hours || task.estimatedHours || "--"}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无排程任务数据</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════
// Tab 3: Quality Monitoring
// ═══════════════════════════════════════════

const MOCK_QUALITY_ALERTS = [
  { id: 1, workOrder: "WO-2026-004", checkpoint: "原材料检验", severity: "warning", message: "5件外观轻微划痕", time: "09:00" },
  { id: 2, workOrder: "WO-2026-001", checkpoint: "焊接工序", severity: "info", message: "2件焊缝偏差，已返修", time: "14:00" },
  { id: 3, workOrder: "WO-2026-003", checkpoint: "整机测试", severity: "info", message: "2项参数临界值，已通过", time: "10:00" },
];

function QualityTab({
  qcStats,
  loading,
  error,
}: {
  qcStats: any;
  loading: boolean;
  error: boolean;
}) {
  if (error) {
    return <EmptyState message="暂无数据" />;
  }

  return (
    <div className="space-y-4">
      {/* QC Stats overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">质检统计概览</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : qcStats?.stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{qcStats.stats.totalRecords}</p>
                <p className="text-xs text-muted-foreground">质检记录</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{qcStats.stats.passRate}</p>
                <p className="text-xs text-muted-foreground">批次通过率</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{qcStats.stats.itemPassRate}</p>
                <p className="text-xs text-muted-foreground">项目通过率</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{qcStats.stats.failCount}</p>
                <p className="text-xs text-muted-foreground">不合格批次</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          )}
        </CardContent>
      </Card>

      {/* Recent quality alerts (mock data) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">近期质量预警</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_QUALITY_ALERTS.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" : "border-muted"
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    alert.severity === "warning" ? "text-yellow-500" : "text-muted-foreground"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {alert.workOrder} - {alert.checkpoint}
                  </p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{alert.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════
// Tab 4: Worker Distribution
// ═══════════════════════════════════════════
function WorkerDistributionTab({
  locations,
  workHours,
  locationsLoading,
  workHoursLoading,
  error,
}: {
  locations: any;
  workHours: any;
  locationsLoading: boolean;
  workHoursLoading: boolean;
  error: boolean;
}) {
  if (error) {
    return <EmptyState message="暂无数据" />;
  }

  // Group locations by zone
  const zoneMap = new Map<string, any[]>();
  if (Array.isArray(locations)) {
    for (const loc of locations) {
      const zone = loc.zoneName || "未知区域";
      if (!zoneMap.has(zone)) {
        zoneMap.set(zone, []);
      }
      zoneMap.get(zone)!.push(loc);
    }
  }

  return (
    <div className="space-y-4">
      {/* Zone distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            区域人员分布 (实时)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locationsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : zoneMap.size > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from(zoneMap.entries()).map(([zoneName, workers]) => (
                <div
                  key={zoneName}
                  className="p-4 rounded-lg border bg-muted/30 text-center"
                >
                  <p className="text-2xl font-bold">{workers.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{zoneName}</p>
                  <div className="flex flex-wrap gap-1 mt-2 justify-center">
                    {workers.slice(0, 3).map((w: any) => (
                      <span
                        key={w.tagId}
                        className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                      >
                        {w.employeeName || w.tagId}
                      </span>
                    ))}
                    {workers.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{workers.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">暂无实时定位数据</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work hours summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">今日工时概览</CardTitle>
        </CardHeader>
        <CardContent>
          {workHoursLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : Array.isArray(workHours) && workHours.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">员工</th>
                    <th className="py-2 pr-4">有效工时</th>
                    <th className="py-2 pr-4">总工时</th>
                    <th className="py-2 pr-4">利用率</th>
                  </tr>
                </thead>
                <tbody>
                  {workHours.map((wh: any, idx: number) => {
                    const utilRate =
                      wh.totalMinutes > 0
                        ? Math.round((wh.effectiveMinutes / wh.totalMinutes) * 100)
                        : 0;
                    return (
                      <tr key={wh.employeeId || idx} className="border-b border-muted/30">
                        <td className="py-2 pr-4 font-medium">{wh.employeeName || "--"}</td>
                        <td className="py-2 pr-4">{(wh.effectiveHours ?? 0).toFixed(1)}h</td>
                        <td className="py-2 pr-4">{((wh.totalMinutes ?? 0) / 60).toFixed(1)}h</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(utilRate, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs">{utilRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无今日工时数据</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════
// Empty state helper
// ═══════════════════════════════════════════
function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
