/**
 * 生产工单管理页面 (Production Work Order Manager)
 * M5阶段的总工单管理界面
 * v2.5.24
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader, StatCard } from '@/components/grt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Factory,
  ClipboardList,
  Clock,
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
  Users,
  Package
} from 'lucide-react';

// 工单状态类型
type WorkOrderStatus = 'Planned' | 'In_Progress' | 'Halted' | 'Completed';
type WorkOrderPriority = 'Normal' | 'Urgent' | 'Top_Urgent';

// 模拟工单数据
const mockWorkOrders = [
  {
    id: 'WO-001',
    orderId: 'ORD-2024-0156',
    orderNumber: 'ORD-2024-0156',
    customerName: '上海半导体科技有限公司',
    status: 'In_Progress' as WorkOrderStatus,
    priority: 'Top_Urgent' as WorkOrderPriority,
    targetDeliveryDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    totalTasks: 24,
    completedTasks: 18,
    progressRate: 75,
    totalEstimatedHours: 480,
    totalActualHours: 420,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000
  },
  {
    id: 'WO-002',
    orderId: 'ORD-2024-0157',
    orderNumber: 'ORD-2024-0157',
    customerName: '苏州精密制造股份公司',
    status: 'Planned' as WorkOrderStatus,
    priority: 'Normal' as WorkOrderPriority,
    targetDeliveryDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    totalTasks: 18,
    completedTasks: 0,
    progressRate: 0,
    totalEstimatedHours: 360,
    totalActualHours: 0,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000
  },
  {
    id: 'WO-003',
    orderId: 'ORD-2024-0155',
    orderNumber: 'ORD-2024-0155',
    customerName: '深圳光电技术有限公司',
    status: 'Halted' as WorkOrderStatus,
    priority: 'Urgent' as WorkOrderPriority,
    targetDeliveryDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
    totalTasks: 20,
    completedTasks: 12,
    progressRate: 60,
    totalEstimatedHours: 400,
    totalActualHours: 280,
    createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000
  },
  {
    id: 'WO-004',
    orderId: 'ORD-2024-0154',
    orderNumber: 'ORD-2024-0154',
    customerName: '北京航天仪器研究所',
    status: 'Completed' as WorkOrderStatus,
    priority: 'Normal' as WorkOrderPriority,
    targetDeliveryDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
    actualDeliveryDate: Date.now() - 6 * 24 * 60 * 60 * 1000,
    totalTasks: 16,
    completedTasks: 16,
    progressRate: 100,
    totalEstimatedHours: 320,
    totalActualHours: 310,
    createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000
  }
];

export default function ProductionWorkOrderManager() {
  const { t, tpl } = useLanguage();
  const [activeTab, setActiveTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // 状态配置
  const statusConfig: Record<WorkOrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    'Planned': { label: t("manufacturing.workOrder.statusPlanned"), color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <Calendar className="w-4 h-4" /> },
    'In_Progress': { label: t("manufacturing.workOrder.statusInProgress"), color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <Play className="w-4 h-4" /> },
    'Halted': { label: t("manufacturing.workOrder.statusHalted"), color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <Pause className="w-4 h-4" /> },
    'Completed': { label: t("manufacturing.workOrder.statusCompleted"), color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: <CheckCircle2 className="w-4 h-4" /> }
  };

  // 优先级配置
  const priorityConfig: Record<WorkOrderPriority, { label: string; color: string }> = {
    'Normal': { label: t("manufacturing.workOrder.priorityNormal"), color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    'Urgent': { label: t("manufacturing.workOrder.priorityUrgent"), color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    'Top_Urgent': { label: t("manufacturing.workOrder.priorityTopUrgent"), color: 'bg-red-500/10 text-red-500 border-red-500/20' }
  };

  // 过滤工单
  const filteredOrders = mockWorkOrders.filter(order => {
    if (searchKeyword && !order.customerName.includes(searchKeyword) && !order.orderNumber.includes(searchKeyword)) {
      return false;
    }
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== 'all' && order.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  // 统计数据
  const stats = {
    total: mockWorkOrders.length,
    inProgress: mockWorkOrders.filter(o => o.status === 'In_Progress').length,
    halted: mockWorkOrders.filter(o => o.status === 'Halted').length,
    overdue: mockWorkOrders.filter(o => o.status !== 'Completed' && o.targetDeliveryDate < Date.now()).length,
    avgProgress: Math.round(mockWorkOrders.reduce((sum, o) => sum + o.progressRate, 0) / mockWorkOrders.length)
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 计算剩余天数
  const getDaysRemaining = (targetDate: number) => {
    const days = Math.ceil((targetDate - Date.now()) / (24 * 60 * 60 * 1000));
    return days;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Factory}
        title={t("manufacturing.workOrder.title")}
        description={t("manufacturing.workOrder.description")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
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
        <StatCard icon={Pause} label={t("manufacturing.workOrder.statusHalted")} value={stats.halted} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
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
                  <SelectItem value="Planned">{t("manufacturing.workOrder.statusPlanned")}</SelectItem>
                  <SelectItem value="In_Progress">{t("manufacturing.workOrder.statusInProgress")}</SelectItem>
                  <SelectItem value="Halted">{t("manufacturing.workOrder.statusHalted")}</SelectItem>
                  <SelectItem value="Completed">{t("manufacturing.workOrder.statusCompleted")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder={t("manufacturing.workOrder.priority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("manufacturing.workOrder.allPriorities")}</SelectItem>
                  <SelectItem value="Top_Urgent">{t("manufacturing.workOrder.priorityTopUrgent")}</SelectItem>
                  <SelectItem value="Urgent">{t("manufacturing.workOrder.priorityUrgent")}</SelectItem>
                  <SelectItem value="Normal">{t("manufacturing.workOrder.priorityNormal")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 工单列表 */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const daysRemaining = getDaysRemaining(order.targetDeliveryDate);
          const isOverdue = order.status !== 'Completed' && daysRemaining < 0;
          const efficiency = order.totalActualHours > 0
            ? Math.round((order.totalEstimatedHours / order.totalActualHours) * 100)
            : 0;

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
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">{order.id}</span>
                      <Badge variant="outline" className={statusConfig[order.status].color}>
                        {statusConfig[order.status].icon}
                        <span className="ml-1">{statusConfig[order.status].label}</span>
                      </Badge>
                      <Badge variant="outline" className={priorityConfig[order.priority].color}>
                        {priorityConfig[order.priority].label}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {tpl("manufacturing.workOrder.overdueDays", { days: Math.abs(daysRemaining) })}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold">{order.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{t("manufacturing.workOrder.orderNo")}: {order.orderNumber}</p>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{t("manufacturing.workOrder.targetDelivery")}: {formatDate(order.targetDeliveryDate)}</span>
                        {!isOverdue && order.status !== 'Completed' && daysRemaining <= 7 && (
                          <span className="text-yellow-500 ml-1">({tpl("manufacturing.workOrder.daysLater", { days: daysRemaining })})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span>{t("manufacturing.workOrder.tasks")}: {order.completedTasks}/{order.totalTasks}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Timer className="w-4 h-4" />
                        <span>{t("manufacturing.workOrder.workHours")}: {order.totalActualHours}/{order.totalEstimatedHours}h</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧进度 */}
                  <div className="w-48 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("manufacturing.workOrder.completionProgress")}</span>
                      <span className="font-semibold">{order.progressRate}%</span>
                    </div>
                    <Progress value={order.progressRate} className="h-2" />
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
