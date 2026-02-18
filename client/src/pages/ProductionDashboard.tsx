/**
 * v2.5.26 生产看板前端页面
 * 车间大屏看板、工单进度实时显示、任务状态统计、工人效率排名
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";

import { toast } from "sonner";

// 类型定义
interface WorkOrderSummary {
  id: number;
  workOrderCode: string;
  productName: string;
  productModel: string | null;
  quantity: number;
  priority: 'Normal' | 'Urgent' | 'Top_Urgent';
  status: 'Draft' | 'Pending' | 'In_Progress' | 'QC_Review' | 'Completed' | 'Cancelled';
  completionRate: number;
  estimatedHours: number;
  actualHours: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  assignedTeam: string | null;
}

interface TaskStatusCount {
  status: string;
  count: number;
  percentage: number;
}

interface WorkerEfficiency {
  workerId: number;
  workerName: string;
  tasksCompleted: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  efficiency: number;
  qualityPassRate: number;
  ranking: number;
}

interface DashboardMetrics {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  pendingWorkOrders: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  averageEfficiency: number;
  averageCompletionRate: number;
  onTimeDeliveryRate: number;
}

// 模拟数据
const mockMetrics: DashboardMetrics = {
  totalWorkOrders: 24,
  activeWorkOrders: 8,
  completedWorkOrders: 12,
  pendingWorkOrders: 4,
  totalTasks: 156,
  completedTasks: 98,
  inProgressTasks: 42,
  averageEfficiency: 94,
  averageCompletionRate: 78,
  onTimeDeliveryRate: 92
};

const mockWorkOrders: WorkOrderSummary[] = [
  {
    id: 1,
    workOrderCode: "WO-2026-001",
    productName: "高压清洗机 HP-3000",
    productModel: "HP-3000-A",
    quantity: 5,
    priority: "Top_Urgent",
    status: "In_Progress",
    completionRate: 65,
    estimatedHours: 120,
    actualHours: 85,
    plannedStartDate: "2026-01-20",
    plannedEndDate: "2026-02-05",
    assignedTeam: "A组"
  },
  {
    id: 2,
    workOrderCode: "WO-2026-002",
    productName: "超声波清洗设备 US-500",
    productModel: "US-500-PRO",
    quantity: 3,
    priority: "Urgent",
    status: "In_Progress",
    completionRate: 45,
    estimatedHours: 80,
    actualHours: 40,
    plannedStartDate: "2026-01-22",
    plannedEndDate: "2026-02-08",
    assignedTeam: "B组"
  },
  {
    id: 3,
    workOrderCode: "WO-2026-003",
    productName: "工业清洗系统 IC-2000",
    productModel: "IC-2000-X",
    quantity: 2,
    priority: "Normal",
    status: "QC_Review",
    completionRate: 95,
    estimatedHours: 160,
    actualHours: 155,
    plannedStartDate: "2026-01-15",
    plannedEndDate: "2026-01-30",
    assignedTeam: "A组"
  },
  {
    id: 4,
    workOrderCode: "WO-2026-004",
    productName: "喷淋清洗机 SP-800",
    productModel: "SP-800-S",
    quantity: 8,
    priority: "Normal",
    status: "Pending",
    completionRate: 0,
    estimatedHours: 200,
    actualHours: 0,
    plannedStartDate: "2026-02-01",
    plannedEndDate: "2026-02-20",
    assignedTeam: null
  }
];

const mockTaskStatus: TaskStatusCount[] = [
  { status: "Completed", count: 98, percentage: 63 },
  { status: "In_Progress", count: 42, percentage: 27 },
  { status: "Pending", count: 12, percentage: 8 },
  { status: "QC_Review", count: 4, percentage: 2 }
];

const mockWorkers: WorkerEfficiency[] = [
  { workerId: 1, workerName: "张明", tasksCompleted: 28, totalEstimatedHours: 180, totalActualHours: 165, efficiency: 109, qualityPassRate: 98, ranking: 1 },
  { workerId: 2, workerName: "李强", tasksCompleted: 25, totalEstimatedHours: 160, totalActualHours: 155, efficiency: 103, qualityPassRate: 96, ranking: 2 },
  { workerId: 3, workerName: "王伟", tasksCompleted: 22, totalEstimatedHours: 140, totalActualHours: 142, efficiency: 99, qualityPassRate: 95, ranking: 3 },
  { workerId: 4, workerName: "刘洋", tasksCompleted: 20, totalEstimatedHours: 130, totalActualHours: 138, efficiency: 94, qualityPassRate: 92, ranking: 4 },
  { workerId: 5, workerName: "陈静", tasksCompleted: 18, totalEstimatedHours: 120, totalActualHours: 130, efficiency: 92, qualityPassRate: 97, ranking: 5 }
];

// 优先级颜色映射
const priorityColors: Record<string, string> = {
  Top_Urgent: "bg-red-500",
  Urgent: "bg-orange-500",
  Normal: "bg-blue-500"
};

const priorityLabels: Record<string, string> = {
  Top_Urgent: "特急",
  Urgent: "紧急",
  Normal: "普通"
};

// 状态颜色映射
const statusColors: Record<string, string> = {
  Draft: "bg-gray-500",
  Pending: "bg-yellow-500",
  In_Progress: "bg-blue-500",
  QC_Review: "bg-purple-500",
  Completed: "bg-green-500",
  Cancelled: "bg-red-500"
};

const statusLabels: Record<string, string> = {
  Draft: "草稿",
  Pending: "待开始",
  In_Progress: "进行中",
  QC_Review: "质检中",
  Completed: "已完成",
  Cancelled: "已取消"
};

export default function ProductionDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedView, setSelectedView] = useState<"workshop" | "manager">("workshop");

  // 自动刷新
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date());
      // 这里可以添加数据刷新逻辑
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  // 手动刷新
  const handleRefresh = () => {
    setLastUpdated(new Date());
    toast.success("数据已刷新");
  };

  // 切换全屏
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Factory}
          title="M5 生产看板"
          description={`车间实时生产状态监控 · 最后更新: ${lastUpdated.toLocaleTimeString()}`}
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
                <RefreshCw className="w-4 h-4" />
              </Button>

              <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <StatCard icon={Package} label="总工单数" value={mockMetrics.totalWorkOrders} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Play} label="进行中" value={mockMetrics.activeWorkOrders} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={CheckCircle2} label="已完成" value={mockMetrics.completedWorkOrders} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          <StatCard icon={Gauge} label="平均效率" value={`${mockMetrics.averageEfficiency}%`} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={Target} label="准时交付率" value={`${mockMetrics.onTimeDeliveryRate}%`} iconColor="text-cyan-500" iconBg="bg-cyan-500/10" />
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
              效率排名
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              异常预警
            </TabsTrigger>
          </TabsList>

          {/* 工单进度 Tab */}
          <TabsContent value="workorders" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockWorkOrders.map((wo) => (
                <Card key={wo.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {wo.workOrderCode}
                          <Badge className={`${priorityColors[wo.priority]} text-white`}>
                            {priorityLabels[wo.priority]}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {wo.productName} {wo.productModel && `(${wo.productModel})`}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={`${statusColors[wo.status]} text-white border-0`}>
                        {statusLabels[wo.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">完成进度</span>
                        <span className="font-medium">{wo.completionRate}%</span>
                      </div>
                      <Progress value={wo.completionRate} className="h-2" />
                      
                      <div className="grid grid-cols-3 gap-4 pt-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">数量</p>
                          <p className="font-medium">{wo.quantity} 台</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">预估工时</p>
                          <p className="font-medium">{wo.estimatedHours}h</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">实际工时</p>
                          <p className="font-medium">{wo.actualHours}h</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 text-sm border-t">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {wo.plannedStartDate} ~ {wo.plannedEndDate}
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
          </TabsContent>

          {/* 任务统计 Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    任务状态分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockTaskStatus.map((item) => (
                      <div key={item.status} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${statusColors[item.status]}`} />
                            <span>{statusLabels[item.status]}</span>
                          </div>
                          <span className="font-medium">{item.count} ({item.percentage}%)</span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    生产效率趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">本周效率</p>
                        <p className="text-2xl font-bold">{mockMetrics.averageEfficiency}%</p>
                      </div>
                      <div className="flex items-center gap-1 text-green-500">
                        <ArrowUp className="w-4 h-4" />
                        <span className="text-sm">+3.2%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">任务完成率</p>
                        <p className="text-2xl font-bold">{Math.round(mockMetrics.completedTasks / mockMetrics.totalTasks * 100)}%</p>
                      </div>
                      <div className="flex items-center gap-1 text-green-500">
                        <ArrowUp className="w-4 h-4" />
                        <span className="text-sm">+5.1%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">质检通过率</p>
                        <p className="text-2xl font-bold">96%</p>
                      </div>
                      <div className="flex items-center gap-1 text-red-500">
                        <ArrowDown className="w-4 h-4" />
                        <span className="text-sm">-1.2%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 效率排名 Tab */}
          <TabsContent value="workers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  工人效率排行榜
                </CardTitle>
                <CardDescription>
                  基于任务完成数量、工时效率和质量通过率综合排名
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockWorkers.map((worker, index) => (
                    <div 
                      key={worker.workerId}
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
                        {worker.ranking}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{worker.workerName}</span>
                          {index < 3 && (
                            <Badge variant="secondary" className="text-xs">
                              {index === 0 ? '🥇 冠军' : index === 1 ? '🥈 亚军' : '🥉 季军'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>完成任务: {worker.tasksCompleted}</span>
                          <span>工时效率: {worker.efficiency}%</span>
                          <span>质量通过率: {worker.qualityPassRate}%</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Zap className={`w-4 h-4 ${worker.efficiency >= 100 ? 'text-green-500' : 'text-orange-500'}`} />
                          <span className={`text-xl font-bold ${worker.efficiency >= 100 ? 'text-green-500' : 'text-orange-500'}`}>
                            {worker.efficiency}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">综合效率</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                      <div>
                        <p className="font-medium">WO-2026-002 超声波清洗设备</p>
                        <p className="text-sm text-muted-foreground">任务: 主体框架焊接</p>
                      </div>
                      <Badge variant="destructive">超出 125%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                      <div>
                        <p className="font-medium">WO-2026-001 高压清洗机</p>
                        <p className="text-sm text-muted-foreground">任务: 电气系统调试</p>
                      </div>
                      <Badge className="bg-orange-500">超出 118%</Badge>
                    </div>
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
                    <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                      <div>
                        <p className="font-medium">WO-2026-003 工业清洗系统</p>
                        <p className="text-sm text-muted-foreground">等待质检: 2天</p>
                      </div>
                      <Badge className="bg-purple-500">待质检</Badge>
                    </div>
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
                    <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                      <div>
                        <p className="font-medium">WO-2026-001 高压清洗机</p>
                        <p className="text-sm text-muted-foreground">距交期: 7天 | 完成率: 65%</p>
                      </div>
                      <Badge className="bg-yellow-500 text-yellow-950">风险</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-green-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <TrendingUp className="w-5 h-5" />
                    效率提升建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                      <div>
                        <p className="font-medium">A组效率持续提升</p>
                        <p className="text-sm text-muted-foreground">建议: 分享最佳实践到B组</p>
                      </div>
                      <Badge className="bg-green-500">建议</Badge>
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
                任务状态分布统计，追踪生产效率趋势
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                工人效率排行榜，基于任务完成、工时效率、质量通过率综合排名
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
