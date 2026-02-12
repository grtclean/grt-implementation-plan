/**
 * 工作流执行监控仪表盘组件
 * v2.5.17 - 实时监控工作流执行状态、队列、资源使用
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Database, 
  HardDrive, 
  Pause, 
  Play, 
  RefreshCw, 
  Server, 
  XCircle,
  TrendingUp,
  Zap,
  Bell,
  BellOff
} from 'lucide-react';

// 类型定义
interface WorkflowExecutionStatus {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentNode: string | null;
  progress: number;
  startTime: string;
  estimatedEndTime: string | null;
  elapsedTime: number;
  resourceUsage: ResourceUsage;
}

interface ResourceUsage {
  cpuPercent: number;
  memoryMB: number;
  activeConnections: number;
  queueDepth: number;
}

interface QueueStatus {
  totalPending: number;
  totalRunning: number;
  totalCompleted: number;
  totalFailed: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  throughput: number;
}

interface PerformanceMetrics {
  successRate: number;
  averageExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  errorRate: number;
  retryRate: number;
  timeoutRate: number;
}

interface MonitoringAlert {
  id: string;
  workflowId: string;
  type: 'failure' | 'timeout' | 'slow' | 'queue_full' | 'resource_high';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolvedAt: string | null;
}

interface ExecutionTrend {
  time: string;
  count: number;
}

interface DashboardData {
  activeExecutions: WorkflowExecutionStatus[];
  queueStatus: QueueStatus;
  performanceMetrics: PerformanceMetrics;
  resourceUsage: ResourceUsage;
  recentAlerts: MonitoringAlert[];
  executionTrend: ExecutionTrend[];
}

// 模拟数据生成
const generateMockData = (): DashboardData => {
  const statuses: WorkflowExecutionStatus['status'][] = ['pending', 'running', 'completed', 'failed'];
  const workflowNames = [
    '设备保养扫描',
    '销售任务生成',
    '客户通知发送',
    '数据同步',
    '报表生成'
  ];

  const activeExecutions: WorkflowExecutionStatus[] = Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, i) => ({
    id: `exec-${Date.now()}-${i}`,
    workflowId: `wf-${i + 1}`,
    workflowName: workflowNames[i % workflowNames.length],
    status: statuses[Math.floor(Math.random() * 2)] as 'pending' | 'running',
    currentNode: `节点 ${Math.floor(Math.random() * 5) + 1}`,
    progress: Math.floor(Math.random() * 80) + 10,
    startTime: new Date(Date.now() - Math.random() * 300000).toISOString(),
    estimatedEndTime: new Date(Date.now() + Math.random() * 60000).toISOString(),
    elapsedTime: Math.floor(Math.random() * 120000),
    resourceUsage: {
      cpuPercent: Math.floor(Math.random() * 60) + 20,
      memoryMB: Math.floor(Math.random() * 512) + 128,
      activeConnections: Math.floor(Math.random() * 10) + 1,
      queueDepth: Math.floor(Math.random() * 5)
    }
  }));

  const executionTrend: ExecutionTrend[] = Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    count: Math.floor(Math.random() * 20) + 5
  }));

  return {
    activeExecutions,
    queueStatus: {
      totalPending: Math.floor(Math.random() * 10),
      totalRunning: activeExecutions.filter(e => e.status === 'running').length,
      totalCompleted: Math.floor(Math.random() * 100) + 50,
      totalFailed: Math.floor(Math.random() * 10),
      averageWaitTime: Math.floor(Math.random() * 5000),
      averageExecutionTime: Math.floor(Math.random() * 30000) + 5000,
      throughput: Math.floor(Math.random() * 10) + 2
    },
    performanceMetrics: {
      successRate: 95 + Math.random() * 5,
      averageExecutionTime: Math.floor(Math.random() * 20000) + 5000,
      p50ExecutionTime: Math.floor(Math.random() * 10000) + 3000,
      p95ExecutionTime: Math.floor(Math.random() * 40000) + 15000,
      p99ExecutionTime: Math.floor(Math.random() * 60000) + 30000,
      errorRate: Math.random() * 5,
      retryRate: Math.random() * 3,
      timeoutRate: Math.random() * 2
    },
    resourceUsage: {
      cpuPercent: Math.floor(Math.random() * 50) + 20,
      memoryMB: Math.floor(Math.random() * 1024) + 256,
      activeConnections: Math.floor(Math.random() * 20) + 5,
      queueDepth: Math.floor(Math.random() * 15)
    },
    recentAlerts: [
      {
        id: 'alert-1',
        workflowId: 'wf-1',
        type: 'slow',
        severity: 'warning',
        message: '工作流 "设备保养扫描" 执行时间超过预期',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        acknowledged: false,
        resolvedAt: null
      },
      {
        id: 'alert-2',
        workflowId: 'wf-2',
        type: 'failure',
        severity: 'error',
        message: '工作流 "数据同步" 执行失败: 连接超时',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        acknowledged: true,
        resolvedAt: null
      }
    ],
    executionTrend
  };
};

// 状态徽章组件
const StatusBadge = ({ status }: { status: WorkflowExecutionStatus['status'] }) => {
  const config = {
    pending: { label: '等待中', variant: 'secondary' as const, icon: Clock },
    running: { label: '执行中', variant: 'default' as const, icon: Play },
    completed: { label: '已完成', variant: 'outline' as const, icon: CheckCircle2 },
    failed: { label: '失败', variant: 'destructive' as const, icon: XCircle },
    cancelled: { label: '已取消', variant: 'secondary' as const, icon: Pause }
  };

  const { label, variant, icon: Icon } = config[status];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

// 告警严重性徽章
const AlertSeverityBadge = ({ severity }: { severity: MonitoringAlert['severity'] }) => {
  const config = {
    info: { label: '信息', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    warning: { label: '警告', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    error: { label: '错误', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    critical: { label: '严重', className: 'bg-red-600/20 text-red-600 border-red-600/30' }
  };

  const { label, className } = config[severity];

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
};

// 资源使用仪表
const ResourceGauge = ({ 
  label, 
  value, 
  max, 
  unit, 
  icon: Icon,
  warning = 70,
  critical = 90
}: { 
  label: string; 
  value: number; 
  max: number; 
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  warning?: number;
  critical?: number;
}) => {
  const percentage = (value / max) * 100;
  const getColor = () => {
    if (percentage >= critical) return 'text-red-500';
    if (percentage >= warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <span className={`text-sm font-medium ${getColor()}`}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${percentage >= critical ? '[&>div]:bg-red-500' : percentage >= warning ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
      />
    </div>
  );
};

// 执行趋势图（简化版）
const ExecutionTrendChart = ({ data }: { data: ExecutionTrend[] }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="h-32 flex items-end gap-1">
      {data.map((item, index) => (
        <div 
          key={index}
          className="flex-1 flex flex-col items-center gap-1"
          title={`${item.time}: ${item.count} 次执行`}
        >
          <div 
            className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
            style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: '4px' }}
          />
          {index % 4 === 0 && (
            <span className="text-[10px] text-muted-foreground">{item.time}</span>
          )}
        </div>
      ))}
    </div>
  );
};

// 主组件
export default function WorkflowMonitoringDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const fetchData = useCallback(async () => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 300));
      setData(generateMockData());
    } catch (error) {
      console.error('获取监控数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  const handleAcknowledgeAlert = (alertId: string) => {
    if (!data) return;
    setData({
      ...data,
      recentAlerts: data.recentAlerts.map(a => 
        a.id === alertId ? { ...a, acknowledged: true } : a
      )
    });
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const unacknowledgedAlerts = data.recentAlerts.filter(a => !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            工作流执行监控
          </h2>
          <p className="text-muted-foreground">实时监控工作流执行状态和系统资源</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {autoRefresh ? '暂停刷新' : '开始刷新'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">执行中</p>
                <p className="text-3xl font-bold text-primary">{data.queueStatus.totalRunning}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Play className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              等待中: {data.queueStatus.totalPending}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">成功率</p>
                <p className="text-3xl font-bold text-green-500">
                  {data.performanceMetrics.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              已完成: {data.queueStatus.totalCompleted}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">吞吐量</p>
                <p className="text-3xl font-bold">{data.queueStatus.throughput}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              次/分钟
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃告警</p>
                <p className={`text-3xl font-bold ${unacknowledgedAlerts.length > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {unacknowledgedAlerts.length}
                </p>
              </div>
              <div className={`p-3 rounded-full ${unacknowledgedAlerts.length > 0 ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
                {unacknowledgedAlerts.length > 0 ? (
                  <Bell className="w-6 h-6 text-yellow-500" />
                ) : (
                  <BellOff className="w-6 h-6 text-green-500" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              失败: {data.queueStatus.totalFailed}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="executions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="executions">活跃执行</TabsTrigger>
          <TabsTrigger value="resources">资源使用</TabsTrigger>
          <TabsTrigger value="performance">性能指标</TabsTrigger>
          <TabsTrigger value="alerts">
            告警
            {unacknowledgedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {unacknowledgedAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 活跃执行 */}
        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                活跃工作流执行
              </CardTitle>
              <CardDescription>
                当前正在执行或等待执行的工作流
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.activeExecutions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>当前没有活跃的工作流执行</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.activeExecutions.map(execution => (
                    <div 
                      key={execution.id}
                      className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={execution.status} />
                          <span className="font-medium">{execution.workflowName}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {(execution.elapsedTime / 1000).toFixed(1)}s
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            当前节点: {execution.currentNode || '-'}
                          </span>
                          <span>{execution.progress}%</span>
                        </div>
                        <Progress value={execution.progress} className="h-2" />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          CPU: {execution.resourceUsage.cpuPercent.toFixed(0)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          内存: {execution.resourceUsage.memoryMB.toFixed(0)}MB
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          连接: {execution.resourceUsage.activeConnections}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 执行趋势 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                24小时执行趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExecutionTrendChart data={data.executionTrend} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 资源使用 */}
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                系统资源使用
              </CardTitle>
              <CardDescription>
                实时监控CPU、内存和连接资源
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ResourceGauge 
                label="CPU 使用率" 
                value={data.resourceUsage.cpuPercent} 
                max={100} 
                unit="%" 
                icon={Cpu}
              />
              <ResourceGauge 
                label="内存使用" 
                value={data.resourceUsage.memoryMB} 
                max={2048} 
                unit="MB" 
                icon={HardDrive}
                warning={1400}
                critical={1800}
              />
              <ResourceGauge 
                label="活跃连接" 
                value={data.resourceUsage.activeConnections} 
                max={100} 
                unit="" 
                icon={Database}
                warning={60}
                critical={80}
              />
              <ResourceGauge 
                label="队列深度" 
                value={data.resourceUsage.queueDepth} 
                max={50} 
                unit="" 
                icon={Server}
                warning={30}
                critical={40}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 性能指标 */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>执行时间分布</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">平均执行时间</span>
                  <span className="font-medium">
                    {(data.performanceMetrics.averageExecutionTime / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">P50 执行时间</span>
                  <span className="font-medium">
                    {(data.performanceMetrics.p50ExecutionTime / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">P95 执行时间</span>
                  <span className="font-medium">
                    {(data.performanceMetrics.p95ExecutionTime / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">P99 执行时间</span>
                  <span className="font-medium">
                    {(data.performanceMetrics.p99ExecutionTime / 1000).toFixed(2)}s
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>错误率统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">成功率</span>
                  <span className="font-medium text-green-500">
                    {data.performanceMetrics.successRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">错误率</span>
                  <span className="font-medium text-red-500">
                    {data.performanceMetrics.errorRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">重试率</span>
                  <span className="font-medium text-yellow-500">
                    {data.performanceMetrics.retryRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">超时率</span>
                  <span className="font-medium text-orange-500">
                    {data.performanceMetrics.timeoutRate.toFixed(2)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 告警 */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                系统告警
              </CardTitle>
              <CardDescription>
                工作流执行过程中产生的告警信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                  <p>暂无告警信息</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentAlerts.map(alert => (
                    <div 
                      key={alert.id}
                      className={`p-4 border rounded-lg flex items-start justify-between gap-4 ${
                        alert.acknowledged ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                          alert.severity === 'critical' ? 'text-red-600' :
                          alert.severity === 'error' ? 'text-red-500' :
                          alert.severity === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertSeverityBadge severity={alert.severity} />
                            <span className="text-xs text-muted-foreground">
                              {new Date(alert.timestamp).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-sm">{alert.message}</p>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                        >
                          确认
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
