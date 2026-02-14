/**
 * 工作流管理页面
 * Workflow Management Page
 * 
 * 功能：
 * - 执行历史查看
 * - 手动触发执行
 * - Cron配置管理
 * - 状态监控
 */

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { PageHeader, StatCard } from '@/components/grt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Settings,
  History,
  Activity,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ==================== 类型定义 ====================

interface WorkflowConfig {
  id: string;
  title: string;
  enabled: boolean;
  cron: string;
  taskDueDays: number;
  retryCount: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime: string | null;
  scanResult: {
    totalEquipments: number;
    summary: {
      highPriority: number;
      mediumPriority: number;
      lowPriority: number;
    };
  } | null;
  taskCreateResult: {
    success: number;
    failed: number;
  } | null;
  error: string | null;
  retryAttempt: number;
}

interface WorkflowLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface SchedulerStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalTasksCreated: number;
  lastExecutionTime: string | null;
  nextScheduledTime: string | null;
}

// ==================== 模拟数据 ====================

const mockConfig: WorkflowConfig = {
  id: 'weekly_maintenance_scanner',
  title: 'Weekly Maintenance Opportunity Scanner',
  enabled: true,
  cron: '0 9 * * 1',
  taskDueDays: 3,
  retryCount: 3,
};

const mockStats: SchedulerStats = {
  totalExecutions: 12,
  successfulExecutions: 11,
  failedExecutions: 1,
  totalTasksCreated: 48,
  lastExecutionTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  nextScheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockExecutions: WorkflowExecution[] = [
  {
    id: 'exec_001',
    workflowId: 'weekly_maintenance_scanner',
    status: 'completed',
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5000).toISOString(),
    scanResult: { totalEquipments: 4, summary: { highPriority: 1, mediumPriority: 1, lowPriority: 2 } },
    taskCreateResult: { success: 4, failed: 0 },
    error: null,
    retryAttempt: 1,
  },
  {
    id: 'exec_002',
    workflowId: 'weekly_maintenance_scanner',
    status: 'completed',
    startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 3000).toISOString(),
    scanResult: { totalEquipments: 3, summary: { highPriority: 0, mediumPriority: 2, lowPriority: 1 } },
    taskCreateResult: { success: 3, failed: 0 },
    error: null,
    retryAttempt: 1,
  },
  {
    id: 'exec_003',
    workflowId: 'weekly_maintenance_scanner',
    status: 'failed',
    startTime: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000 + 15000).toISOString(),
    scanResult: null,
    taskCreateResult: null,
    error: '数据库连接超时',
    retryAttempt: 3,
  },
];

const mockLogs: WorkflowLog[] = [
  { id: 'log_001', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), level: 'info', message: '开始执行工作流: Weekly Maintenance Opportunity Scanner' },
  { id: 'log_002', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1000).toISOString(), level: 'info', message: '执行尝试 1/3' },
  { id: 'log_003', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2000).toISOString(), level: 'info', message: '开始扫描需要保养的设备...' },
  { id: 'log_004', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3000).toISOString(), level: 'info', message: '扫描完成，发现 4 台设备需要保养' },
  { id: 'log_005', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4000).toISOString(), level: 'info', message: '任务创建完成: 成功 4, 失败 0' },
  { id: 'log_006', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5000).toISOString(), level: 'info', message: '工作流执行成功，耗时 5000ms' },
];

// ==================== 组件 ====================

export default function WorkflowManagement() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WorkflowConfig>(mockConfig);
  const [stats, setStats] = useState<SchedulerStats>(mockStats);
  const [executions, setExecutions] = useState<WorkflowExecution[]>(mockExecutions);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [logs, setLogs] = useState<WorkflowLog[]>(mockLogs);
  const [isRunning, setIsRunning] = useState(false);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(true);

  // 手动触发执行
  const handleManualTrigger = async () => {
    setIsRunning(true);
    toast({
      title: '工作流已触发',
      description: '正在执行设备保养扫描...',
    });

    // 模拟执行
    setTimeout(() => {
      const newExecution: WorkflowExecution = {
        id: `exec_${Date.now()}`,
        workflowId: config.id,
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3000).toISOString(),
        scanResult: { totalEquipments: 5, summary: { highPriority: 2, mediumPriority: 2, lowPriority: 1 } },
        taskCreateResult: { success: 5, failed: 0 },
        error: null,
        retryAttempt: 1,
      };
      setExecutions([newExecution, ...executions]);
      setStats({
        ...stats,
        totalExecutions: stats.totalExecutions + 1,
        successfulExecutions: stats.successfulExecutions + 1,
        totalTasksCreated: stats.totalTasksCreated + 5,
        lastExecutionTime: new Date().toISOString(),
      });
      setIsRunning(false);
      toast({
        title: '执行完成',
        description: '成功创建 5 个销售待办任务',
      });
    }, 3000);
  };

  // 切换调度器状态
  const toggleScheduler = () => {
    setIsSchedulerRunning(!isSchedulerRunning);
    toast({
      title: isSchedulerRunning ? '调度器已暂停' : '调度器已启动',
      description: isSchedulerRunning ? '定时任务将不会自动执行' : '定时任务将按计划执行',
    });
  };

  // 更新配置
  const handleConfigUpdate = (updates: Partial<WorkflowConfig>) => {
    setConfig({ ...config, ...updates });
    toast({
      title: '配置已更新',
      description: '新配置将在下次执行时生效',
    });
  };

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />成功</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" />运行中</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20"><Clock className="w-3 h-3 mr-1" />等待</Badge>;
    }
  };

  // 获取日志级别样式
  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Activity}
          title="工作流管理"
          description="管理和监控自动化工作流的执行"
          actions={
            <>
              <Button
                variant="outline"
                onClick={toggleScheduler}
                className={isSchedulerRunning ? 'border-green-500/50' : 'border-red-500/50'}
              >
                {isSchedulerRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    暂停调度
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    启动调度
                  </>
                )}
              </Button>
              <Button onClick={handleManualTrigger} disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    立即执行
                  </>
                )}
              </Button>
            </>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={History}
            label="总执行次数"
            value={stats.totalExecutions}
          />
          <StatCard
            icon={CheckCircle2}
            label="成功率"
            value={`${stats.totalExecutions > 0
              ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
              : 0}%`}
            iconColor="text-green-500"
            iconBg="bg-green-500/10"
          />
          <StatCard
            icon={Activity}
            label="创建任务数"
            value={stats.totalTasksCreated}
          />
          <StatCard
            icon={Calendar}
            label="下次执行"
            value={stats.nextScheduledTime
              ? new Date(stats.nextScheduledTime).toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' })
              : '-'}
          />
        </div>

        {/* 主内容区 */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-4 h-4 mr-2" />
              执行历史
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="w-4 h-4 mr-2" />
              配置管理
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="w-4 h-4 mr-2" />
              执行日志
            </TabsTrigger>
          </TabsList>

          {/* 执行历史 */}
          <TabsContent value="history" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">执行历史记录</CardTitle>
                <CardDescription>查看工作流的历史执行情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedExecution(execution)}
                    >
                      <div className="flex items-center gap-4">
                        {getStatusBadge(execution.status)}
                        <div>
                          <p className="font-medium">{formatDate(execution.startTime)}</p>
                          <p className="text-sm text-muted-foreground">
                            {execution.scanResult
                              ? `扫描 ${execution.scanResult.totalEquipments} 台设备`
                              : execution.error || '未完成'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {execution.taskCreateResult && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-500">
                              +{execution.taskCreateResult.success} 任务
                            </p>
                            {execution.taskCreateResult.failed > 0 && (
                              <p className="text-xs text-red-500">
                                {execution.taskCreateResult.failed} 失败
                              </p>
                            )}
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 执行详情 */}
            {selectedExecution && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">执行详情</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedExecution(null)}>
                      关闭
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">执行ID</p>
                      <p className="font-mono text-sm">{selectedExecution.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">状态</p>
                      {getStatusBadge(selectedExecution.status)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">开始时间</p>
                      <p className="text-sm">{formatDate(selectedExecution.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">结束时间</p>
                      <p className="text-sm">{formatDate(selectedExecution.endTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">重试次数</p>
                      <p className="text-sm">{selectedExecution.retryAttempt}</p>
                    </div>
                    {selectedExecution.scanResult && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">扫描设备数</p>
                          <p className="text-sm">{selectedExecution.scanResult.totalEquipments}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">优先级分布</p>
                          <p className="text-sm">
                            <span className="text-red-500">高:{selectedExecution.scanResult.summary.highPriority}</span>
                            {' / '}
                            <span className="text-yellow-500">中:{selectedExecution.scanResult.summary.mediumPriority}</span>
                            {' / '}
                            <span className="text-green-500">低:{selectedExecution.scanResult.summary.lowPriority}</span>
                          </p>
                        </div>
                      </>
                    )}
                    {selectedExecution.error && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">错误信息</p>
                        <p className="text-sm text-red-500">{selectedExecution.error}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 配置管理 */}
          <TabsContent value="config" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">工作流配置</CardTitle>
                <CardDescription>配置工作流的执行参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">启用工作流</Label>
                    <p className="text-sm text-muted-foreground">开启后工作流将按计划自动执行</p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => handleConfigUpdate({ enabled: checked })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Cron 表达式</Label>
                    <Input
                      value={config.cron}
                      onChange={(e) => handleConfigUpdate({ cron: e.target.value })}
                      placeholder="0 9 * * 1"
                    />
                    <p className="text-xs text-muted-foreground">
                      当前设置: 每周一 09:00 执行
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>任务截止天数</Label>
                    <Input
                      type="number"
                      value={config.taskDueDays}
                      onChange={(e) => handleConfigUpdate({ taskDueDays: parseInt(e.target.value) })}
                      min={1}
                      max={30}
                    />
                    <p className="text-xs text-muted-foreground">
                      创建的销售任务将在 {config.taskDueDays} 天后到期
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>重试次数</Label>
                    <Input
                      type="number"
                      value={config.retryCount}
                      onChange={(e) => handleConfigUpdate({ retryCount: parseInt(e.target.value) })}
                      min={1}
                      max={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      执行失败时最多重试 {config.retryCount} 次
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-3">Cron 表达式说明</h4>
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div className="p-2 bg-secondary/30 rounded text-center">
                      <p className="font-mono">分钟</p>
                      <p className="text-muted-foreground">0-59</p>
                    </div>
                    <div className="p-2 bg-secondary/30 rounded text-center">
                      <p className="font-mono">小时</p>
                      <p className="text-muted-foreground">0-23</p>
                    </div>
                    <div className="p-2 bg-secondary/30 rounded text-center">
                      <p className="font-mono">日</p>
                      <p className="text-muted-foreground">1-31</p>
                    </div>
                    <div className="p-2 bg-secondary/30 rounded text-center">
                      <p className="font-mono">月</p>
                      <p className="text-muted-foreground">1-12</p>
                    </div>
                    <div className="p-2 bg-secondary/30 rounded text-center">
                      <p className="font-mono">星期</p>
                      <p className="text-muted-foreground">0-6</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    示例: "0 9 * * 1" = 每周一 09:00, "0 0 1 * *" = 每月1日 00:00
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 执行日志 */}
          <TabsContent value="logs" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">执行日志</CardTitle>
                    <CardDescription>查看最近一次执行的详细日志</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">
                        [{new Date(log.timestamp).toLocaleTimeString('zh-CN')}]
                      </span>
                      <span className={`shrink-0 uppercase ${getLogLevelStyle(log.level)}`}>
                        [{log.level}]
                      </span>
                      <span className={getLogLevelStyle(log.level)}>{log.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
