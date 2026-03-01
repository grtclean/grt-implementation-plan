/**
 * 生产工单管理页面 (Production Work Order Manager)
 * M5阶段的总工单管理界面
 *
 * Data source: trpc.productionDashboard.list (DB-backed)
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { PageHeader, StatCard } from '@/components/grt';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Factory,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Calendar,
  TrendingUp,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ChevronRight,
  Timer,
  Loader2,
  Package
} from 'lucide-react';

// 状态配置 (使用后端 lowercase 值)
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: '草稿', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: <ClipboardList className="w-4 h-4" /> },
  planned: { label: '已计划', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <Calendar className="w-4 h-4" /> },
  in_progress: { label: '进行中', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <Play className="w-4 h-4" /> },
  quality_check: { label: '质检中', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  on_hold: { label: '暂停', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <Pause className="w-4 h-4" /> },
  completed: { label: '已完成', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: '已取消', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <AlertTriangle className="w-4 h-4" /> },
};

// 优先级配置 (使用后端 lowercase 值)
const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  normal: { label: '普通', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  high: { label: '紧急', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  urgent: { label: '特急', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

export default function ProductionWorkOrderManager() {
  const { t, tpl } = useLanguage();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // ─── tRPC Query (server-side filter) ───
  const listQuery = trpc.productionDashboard.list.useQuery({
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter as any : undefined,
    page: 1,
    pageSize: 50,
  });

  const dashboardQuery = trpc.productionDashboard.getDashboardStats.useQuery();

  const orders = (listQuery.data?.items ?? []) as any[];
  const isLoading = listQuery.isLoading;
  const summary = dashboardQuery.data?.summary;

  // ─── Client-side search filter (API doesn't support text search) ───
  const filteredOrders = searchKeyword
    ? orders.filter((o: any) =>
        (o.productName ?? '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (o.orderCode ?? '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (o.assignedTeam ?? '').toLowerCase().includes(searchKeyword.toLowerCase())
      )
    : orders;

  // ─── Stats from dashboard ───
  const stats = {
    total: summary?.totalOrders ?? 0,
    inProgress: summary?.inProgressOrders ?? 0,
    onHold: 0, // not tracked separately in dashboard
    overdue: orders.filter((o: any) =>
      o.status !== 'completed' && o.status !== 'cancelled' && o.plannedEndDate && new Date(o.plannedEndDate) < new Date()
    ).length,
    avgProgress: summary?.avgProgress ?? 0,
  };

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch { return dateStr; }
  };

  // 计算剩余天数
  const getDaysRemaining = (dateStr: string | null) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Factory} title={t("manufacturing.workOrder.title")} description="加载中..." />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Factory}
        title={t("manufacturing.workOrder.title")}
        description={t("manufacturing.workOrder.description")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
              {listQuery.isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {t("manufacturing.common.refresh")}
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t("manufacturing.workOrder.createWorkOrder")}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={ClipboardList} label={t("manufacturing.workOrder.totalWorkOrders")} value={stats.total} />
        <StatCard icon={Play} label={t("manufacturing.workOrder.statusInProgress")} value={stats.inProgress} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Pause} label={t("manufacturing.workOrder.statusHalted")} value={stats.onHold} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        <StatCard icon={AlertTriangle} label={t("manufacturing.workOrder.overdue")} value={stats.overdue} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={TrendingUp} label={t("manufacturing.workOrder.avgProgress")} value={`${stats.avgProgress}%`} />
      </div>

      {/* 过滤器和搜索 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("manufacturing.workOrder.searchPlaceholder")}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder={t("manufacturing.production.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("manufacturing.common.allStatuses")}</SelectItem>
                  <SelectItem value="planned">已计划</SelectItem>
                  <SelectItem value="in_progress">进行中</SelectItem>
                  <SelectItem value="quality_check">质检中</SelectItem>
                  <SelectItem value="on_hold">暂停</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder={t("manufacturing.workOrder.priority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("manufacturing.workOrder.allPriorities")}</SelectItem>
                  <SelectItem value="urgent">特急</SelectItem>
                  <SelectItem value="high">紧急</SelectItem>
                  <SelectItem value="normal">普通</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 工单列表 */}
      <div className="space-y-4">
        {filteredOrders.map((order: any) => {
          const daysRemaining = getDaysRemaining(order.plannedEndDate);
          const isOverdue = order.status !== 'completed' && order.status !== 'cancelled' && daysRemaining !== null && daysRemaining < 0;
          const progress = order.progress ?? 0;
          const estimatedHours = order.estimatedHours ?? 0;
          const actualHours = order.actualHours ?? 0;
          const efficiency = actualHours > 0 ? Math.round((estimatedHours / actualHours) * 100) : 0;
          const sCfg = statusConfig[order.status] || statusConfig.draft;
          const pCfg = priorityConfig[order.priority] || priorityConfig.normal;

          return (
            <Card
              key={order.id}
              className={`bg-card/50 border-border hover:border-primary/30 transition-colors cursor-pointer ${
                isOverdue ? 'border-red-500/30' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* 左侧信息 */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{order.orderCode}</span>
                      <Badge variant="outline" className={sCfg.color}>
                        {sCfg.icon}
                        <span className="ml-1">{sCfg.label}</span>
                      </Badge>
                      <Badge variant="outline" className={pCfg.color}>
                        {pCfg.label}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {tpl("manufacturing.workOrder.overdueDays", { days: Math.abs(daysRemaining!) })}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        {order.productName}
                        {order.productModel && <span className="text-muted-foreground font-normal ml-2">({order.productModel})</span>}
                      </h3>
                      {order.assignedTeam && (
                        <p className="text-sm text-muted-foreground">团队: {order.assignedTeam}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{t("manufacturing.workOrder.targetDelivery")}: {formatDate(order.plannedEndDate)}</span>
                        {!isOverdue && order.status !== 'completed' && daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0 && (
                          <span className="text-yellow-500 ml-1">({tpl("manufacturing.workOrder.daysLater", { days: daysRemaining })})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span>数量: {order.quantity} 台</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Timer className="w-4 h-4" />
                        <span>{t("manufacturing.workOrder.workHours")}: {actualHours}/{estimatedHours}h</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧进度 */}
                  <div className="w-48 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("manufacturing.workOrder.completionProgress")}</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t("manufacturing.workOrder.efficiency")}: {efficiency}%</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        {t("manufacturing.workOrder.details")} <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredOrders.length === 0 && (
          <Card className="bg-card/50 border-border">
            <CardContent className="p-8 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t("manufacturing.workOrder.noMatchingOrders")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
