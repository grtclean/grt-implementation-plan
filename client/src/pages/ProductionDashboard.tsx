/**
 * v2.5.26 生产看板前端页面
 * 车间大屏看板、工单进度实时显示、任务状态统计、团队效率排名
 *
 * Data source: trpc.productionDashboard.getDashboardStats + getTeamCapacity
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Factory,
  Gauge,
  Loader2,
  Monitor,
  Package,
  Play,
  RefreshCw,
  Settings,
  Target,
  Timer,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { toast } from "sonner";

// 优先级颜色映射 (使用后端值)
const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-blue-500",
  low: "bg-gray-500",
};

const priorityLabels: Record<string, string> = {
  urgent: "特急",
  high: "紧急",
  normal: "普通",
  low: "低",
};

// 状态颜色映射 (使用后端值)
const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  planned: "bg-yellow-500",
  in_progress: "bg-blue-500",
  quality_check: "bg-purple-500",
  completed: "bg-green-500",
  on_hold: "bg-orange-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "草稿",
  planned: "待开始",
  in_progress: "进行中",
  quality_check: "质检中",
  completed: "已完成",
  on_hold: "暂停",
  cancelled: "已取消",
};

export default function ProductionDashboard() {
  const { t } = useLanguage();
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedView, setSelectedView] = useState<"workshop" | "manager">("workshop");

  // ─── tRPC Queries (auto-refresh) ───
  const dashboardQuery = trpc.productionDashboard.getDashboardStats.useQuery(undefined, {
    refetchInterval: refreshInterval * 1000,
  });
  const teamQuery = trpc.productionDashboard.getTeamCapacity.useQuery(undefined, {
    refetchInterval: refreshInterval * 1000,
  });

  const stats = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;

  // ─── Derived Data ───
  const workOrders = (stats?.recentOrders ?? []) as any[];
  const totalOrders = stats?.summary?.totalOrders ?? 0;

  // Task status distribution from ordersByStatus
  const taskStatusEntries = (() => {
    if (!stats?.ordersByStatus) return [];
    const total = totalOrders || 1;
    return [
      { status: "completed", count: stats.ordersByStatus.completed ?? 0 },
      { status: "in_progress", count: stats.ordersByStatus.in_progress ?? 0 },
      { status: "planned", count: (stats.ordersByStatus.planned ?? 0) + (stats.ordersByStatus.draft ?? 0) },
      { status: "quality_check", count: stats.ordersByStatus.quality_check ?? 0 },
    ].map(e => ({ ...e, percentage: Math.round((e.count / total) * 100) }));
  })();

  // Team data
  const teams = (teamQuery.data ?? []) as any[];

  // Alerts derived from work orders
  const overtimeOrders = workOrders.filter((wo: any) => wo.estimatedHours > 0 && wo.actualHours > wo.estimatedHours);
  const qcPending = workOrders.filter((wo: any) => wo.status === "quality_check");
  const deadlineRiskOrders = workOrders.filter((wo: any) => {
    if (!wo.plannedEndDate || wo.status === "completed" || wo.status === "cancelled") return false;
    const daysLeft = Math.ceil((new Date(wo.plannedEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && (wo.progress ?? 0) < 80;
  });

  // ─── Actions ───
  const handleRefresh = () => {
    dashboardQuery.refetch();
    teamQuery.refetch();
    toast.success("数据已刷新");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Factory} title="M5 生产看板" description="加载中..." />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Factory}
          title="M5 生产看板"
          description={`车间实时生产状态监控 · 数据来源: 数据库`}
          actions={
            <div className="flex items-center gap-3">
              <Select value={selectedView} onValueChange={(v) => setSelectedView(v as "workshop" | "manager")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workshop">车间大屏</SelectItem>
                  <SelectItem value="manager">管理视图</SelectItem>
                </SelectContent>
              </Select>

              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10秒刷新</SelectItem>
                  <SelectItem value="30">30秒刷新</SelectItem>
                  <SelectItem value="60">1分钟刷新</SelectItem>
                  <SelectItem value="300">5分钟刷新</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={handleRefresh}>
                {dashboardQuery.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>

              <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
          }
        />

        {/* KPI 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <StatCard icon={Package} label="总工单数" value={totalOrders} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Play} label="进行中" value={stats?.summary?.inProgressOrders ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={CheckCircle2} label="已完成" value={stats?.summary?.completedOrders ?? 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          <StatCard icon={Gauge} label="设备利用率" value={`${stats?.equipment?.avgUtilization ?? 0}%`} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={Target} label="平均完成率" value={`${stats?.summary?.avgProgress ?? 0}%`} iconColor="text-cyan-500" iconBg="bg-cyan-500/10" />
        </div>

        {/* 主要内容区域 */}
        <Tabs defaultValue="workorders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workorders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              工单进度
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              任务统计
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              团队效率
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              异常预警
            </TabsTrigger>
          </TabsList>

          {/* 工单进度 Tab */}
          <TabsContent value="workorders" className="space-y-4">
            {workOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mb-4 opacity-40" />
                  <p>暂无工单数据，请先通过生产管理创建工单</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {workOrders.map((wo: any) => (
                  <Card key={wo.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {wo.orderCode}
                            <Badge className={`${priorityColors[wo.priority] || 'bg-blue-500'} text-white`}>
                              {priorityLabels[wo.priority] || wo.priority}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {wo.productName} {wo.productModel && `(${wo.productModel})`}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={`${statusColors[wo.status] || 'bg-gray-500'} text-white border-0`}>
                          {statusLabels[wo.status] || wo.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">完成进度</span>
                          <span className="font-medium">{wo.progress ?? 0}%</span>
                        </div>
                        <Progress value={wo.progress ?? 0} className="h-2" />

                        <div className="grid grid-cols-3 gap-4 pt-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">数量</p>
                            <p className="font-medium">{wo.quantity} 台</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">预估工时</p>
                            <p className="font-medium">{wo.estimatedHours || 0}h</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">实际工时</p>
                            <p className="font-medium">{wo.actualHours || 0}h</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 text-sm border-t">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {wo.plannedStartDate ?? '—'} ~ {wo.plannedEndDate ?? '—'}
                          </div>
                          {wo.assignedTeam && (
                            <Badge variant="secondary">{wo.assignedTeam}</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 任务统计 Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    工单状态分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {taskStatusEntries.length === 0 ? (
                    <p className="text-muted-foreground text-sm">暂无数据</p>
                  ) : (
                    <div className="space-y-4">
                      {taskStatusEntries.map((item) => (
                        <div key={item.status} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${statusColors[item.status] || 'bg-gray-400'}`} />
                              <span>{statusLabels[item.status] || item.status}</span>
                            </div>
                            <span className="font-medium">{item.count} ({item.percentage}%)</span>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    设备与生产效率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">设备利用率</p>
                        <p className="text-2xl font-bold">{stats?.equipment?.avgUtilization ?? 0}%</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{stats?.equipment?.running ?? 0}台运行中</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">工单完成率</p>
                        <p className="text-2xl font-bold">
                          {totalOrders > 0 ? Math.round(((stats?.summary?.completedOrders ?? 0) / totalOrders) * 100) : 0}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">{stats?.summary?.completedOrders ?? 0}/{totalOrders}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">平均进度</p>
                        <p className="text-2xl font-bold">{stats?.summary?.avgProgress ?? 0}%</p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">
                          产量 {stats?.summary?.completedQuantity ?? 0}/{stats?.summary?.totalQuantity ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 团队效率 Tab */}
          <TabsContent value="workers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  团队效率排行榜
                </CardTitle>
                <CardDescription>
                  基于工单完成数量和工时效率综合排名
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <p className="text-muted-foreground text-sm">暂无团队数据</p>
                ) : (
                  <div className="space-y-4">
                    {[...teams]
                      .sort((a: any, b: any) => (b.efficiency ?? 0) - (a.efficiency ?? 0))
                      .map((team: any, index: number) => (
                      <div
                        key={team.team}
                        className={`flex items-center gap-4 p-4 rounded-lg ${
                          index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                          index === 1 ? 'bg-gray-400/10 border border-gray-400/30' :
                          index === 2 ? 'bg-orange-600/10 border border-orange-600/30' :
                          'bg-muted/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          index === 0 ? 'bg-yellow-500 text-yellow-950' :
                          index === 1 ? 'bg-gray-400 text-gray-950' :
                          index === 2 ? 'bg-orange-600 text-orange-950' :
                          'bg-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{team.team}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>总工单: {team.totalOrders}</span>
                            <span>已完成: {team.completedOrders}</span>
                            <span>进行中: {team.inProgressOrders}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Zap className={`w-4 h-4 ${(team.efficiency ?? 0) >= 80 ? 'text-green-500' : 'text-orange-500'}`} />
                            <span className={`text-xl font-bold ${(team.efficiency ?? 0) >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
                              {team.efficiency ?? 0}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">工时效率</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 异常预警 Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-red-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    工时超预估预警
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overtimeOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">无超时工单</p>
                    ) : overtimeOrders.map((wo: any) => {
                      const ratio = Math.round((wo.actualHours / wo.estimatedHours) * 100);
                      return (
                        <div key={wo.id} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                          <div>
                            <p className="font-medium">{wo.orderCode} {wo.productName}</p>
                            <p className="text-sm text-muted-foreground">预估 {wo.estimatedHours}h → 实际 {wo.actualHours}h</p>
                          </div>
                          <Badge variant="destructive">超出 {ratio}%</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-500">
                    <Timer className="w-5 h-5" />
                    质检待处理
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {qcPending.length === 0 ? (
                      <p className="text-sm text-muted-foreground">无待检工单</p>
                    ) : qcPending.map((wo: any) => (
                      <div key={wo.id} className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                        <div>
                          <p className="font-medium">{wo.orderCode} {wo.productName}</p>
                          <p className="text-sm text-muted-foreground">进度: {wo.progress ?? 0}%</p>
                        </div>
                        <Badge className="bg-purple-500">待质检</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-500">
                    <Clock className="w-5 h-5" />
                    交期预警
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {deadlineRiskOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">无交期风险</p>
                    ) : deadlineRiskOrders.map((wo: any) => {
                      const daysLeft = Math.ceil((new Date(wo.plannedEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={wo.id} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                          <div>
                            <p className="font-medium">{wo.orderCode} {wo.productName}</p>
                            <p className="text-sm text-muted-foreground">距交期: {daysLeft}天 | 完成率: {wo.progress ?? 0}%</p>
                          </div>
                          <Badge className="bg-yellow-500 text-yellow-950">风险</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <TrendingUp className="w-5 h-5" />
                    设备状态概览
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                      <div>
                        <p className="font-medium">设备总数: {stats?.equipment?.total ?? 0}</p>
                        <p className="text-sm text-muted-foreground">
                          运行 {stats?.equipment?.running ?? 0} · 空闲 {stats?.equipment?.idle ?? 0} · 维护 {stats?.equipment?.maintenance ?? 0} · 故障 {stats?.equipment?.fault ?? 0}
                        </p>
                      </div>
                      <Badge className="bg-green-500">{stats?.equipment?.avgUtilization ?? 0}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 功能说明卡片 */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              M5 生产看板功能说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                实时监控车间生产状态，支持10秒到5分钟自动刷新
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                工单进度可视化，显示优先级、完成率、工时等关键信息
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                工单状态分布统计，追踪设备利用率和生产效率
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                团队效率排行榜，基于工单完成数量和工时效率排名
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                异常预警系统，包括工时超预估、质检待处理、交期风险等
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
  );
}
