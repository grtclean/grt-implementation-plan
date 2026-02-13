/**
 * 生产工单管理页面 (Production Work Order Manager)
 * M5阶段的总工单管理界面
 * v2.5.24
 */

import { useState } from 'react';
import Layout from '@/components/Layout';
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

// 状态配置
const statusConfig: Record<WorkOrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'Planned': { label: '计划中', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <Calendar className="w-4 h-4" /> },
  'In_Progress': { label: '生产中', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <Play className="w-4 h-4" /> },
  'Halted': { label: '已暂停', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <Pause className="w-4 h-4" /> },
  'Completed': { label: '已完成', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: <CheckCircle2 className="w-4 h-4" /> }
};

// 优先级配置
const priorityConfig: Record<WorkOrderPriority, { label: string; color: string }> = {
  'Normal': { label: '普通', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  'Urgent': { label: '紧急', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  'Top_Urgent': { label: '特急', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
};

export default function ProductionWorkOrderManager() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

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
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Factory}
        title="生产工单管理"
        description="M5阶段生产制造工单追踪与管理"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              新建工单
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={ClipboardList} label="总工单数" value={stats.total} />
        <StatCard icon={Play} label="生产中" value={stats.inProgress} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Pause} label="已暂停" value={stats.halted} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        <StatCard icon={AlertTriangle} label="已逾期" value={stats.overdue} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={TrendingUp} label="平均进度" value={`${stats.avgProgress}%`} />
      </div>

      {/* 过滤器和搜索 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索客户名称或订单编号..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="Planned">计划中</SelectItem>
                  <SelectItem value="In_Progress">生产中</SelectItem>
                  <SelectItem value="Halted">已暂停</SelectItem>
                  <SelectItem value="Completed">已完成</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder="优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  <SelectItem value="Top_Urgent">特急</SelectItem>
                  <SelectItem value="Urgent">紧急</SelectItem>
                  <SelectItem value="Normal">普通</SelectItem>
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
                          逾期 {Math.abs(daysRemaining)} 天
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold">{order.customerName}</h3>
                      <p className="text-sm text-muted-foreground">订单号: {order.orderNumber}</p>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>目标交付: {formatDate(order.targetDeliveryDate)}</span>
                        {!isOverdue && order.status !== 'Completed' && daysRemaining <= 7 && (
                          <span className="text-yellow-500 ml-1">({daysRemaining}天后)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span>任务: {order.completedTasks}/{order.totalTasks}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Timer className="w-4 h-4" />
                        <span>工时: {order.totalActualHours}/{order.totalEstimatedHours}h</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧进度 */}
                  <div className="w-48 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">完成进度</span>
                      <span className="font-semibold">{order.progressRate}%</span>
                    </div>
                    <Progress value={order.progressRate} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>效率: {efficiency}%</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        详情 <ChevronRight className="w-3 h-3 ml-1" />
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
              <p className="text-muted-foreground">暂无符合条件的工单</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </Layout>
  );
}
