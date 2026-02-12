/**
 * 导出任务资源限制管理组件
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Activity, Cpu, HardDrive, Play, Pause, XCircle, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface ExportTask {
  id: string;
  name: string;
  type: 'excel' | 'csv' | 'json' | 'pdf';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  estimatedSizeMB: number;
  createdAt: number;
}

interface SystemLoad {
  cpuUsagePercent: number;
  memoryUsageMB: number;
  memoryTotalMB: number;
  activeTasks: number;
  queuedTasks: number;
}

const mockTasks: ExportTask[] = [
  { id: '1', name: '工作流历史导出', type: 'excel', priority: 'high', status: 'running', progress: 65, estimatedSizeMB: 50, createdAt: Date.now() - 300000 },
  { id: '2', name: '设备列表导出', type: 'csv', priority: 'normal', status: 'queued', progress: 0, estimatedSizeMB: 20, createdAt: Date.now() - 200000 },
  { id: '3', name: '保养记录导出', type: 'pdf', priority: 'urgent', status: 'running', progress: 30, estimatedSizeMB: 100, createdAt: Date.now() - 400000 },
  { id: '4', name: '通知日志导出', type: 'json', priority: 'low', status: 'queued', progress: 0, estimatedSizeMB: 15, createdAt: Date.now() - 100000 },
  { id: '5', name: '聚合统计导出', type: 'excel', priority: 'normal', status: 'completed', progress: 100, estimatedSizeMB: 30, createdAt: Date.now() - 600000 },
];

const mockLoad: SystemLoad = { cpuUsagePercent: 45, memoryUsageMB: 3200, memoryTotalMB: 8192, activeTasks: 2, queuedTasks: 2 };

export default function ExportResourceLimiterManager() {
  const [tasks] = useState<ExportTask[]>(mockTasks);
  const [load] = useState<SystemLoad>(mockLoad);
  const [concurrency, setConcurrency] = useState(3);

  const priorityColors: Record<string, string> = { urgent: 'bg-red-500', high: 'bg-orange-500', normal: 'bg-blue-500', low: 'bg-gray-500' };
  const statusIcons: Record<string, React.ReactNode> = {
    queued: <Clock className="h-4 w-4 text-yellow-500" />,
    running: <Activity className="h-4 w-4 text-blue-500 animate-pulse" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <AlertTriangle className="h-4 w-4 text-red-500" />,
    cancelled: <XCircle className="h-4 w-4 text-gray-500" />
  };

  const stats = {
    totalTasks: tasks.length,
    runningTasks: tasks.filter(t => t.status === 'running').length,
    queuedTasks: tasks.filter(t => t.status === 'queued').length,
    completedTasks: tasks.filter(t => t.status === 'completed').length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">导出任务资源限制</h1>
          <p className="text-muted-foreground">动态调整并发数量，避免资源争抢</p>
        </div>
      </div>

      {/* 系统负载监控 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">CPU使用率</span>
            </div>
            <p className="text-2xl font-bold mt-1">{load.cpuUsagePercent}%</p>
            <Progress value={load.cpuUsagePercent} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">内存使用</span>
            </div>
            <p className="text-2xl font-bold mt-1">{(load.memoryUsageMB / 1024).toFixed(1)} GB</p>
            <Progress value={(load.memoryUsageMB / load.memoryTotalMB) * 100} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">活跃任务</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.runningTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">排队任务</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.queuedTasks}</p>
          </CardContent>
        </Card>
      </div>

      {/* 并发控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            并发控制
          </CardTitle>
          <CardDescription>调整同时运行的导出任务数量</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">当前并发数: {concurrency}</span>
              <span className="text-sm text-muted-foreground">范围: 1-10</span>
            </div>
            <Slider value={[concurrency]} onValueChange={(v) => setConcurrency(v[0])} min={1} max={10} step={1} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConcurrency(1)}>最小</Button>
              <Button variant="outline" size="sm" onClick={() => setConcurrency(5)}>默认</Button>
              <Button variant="outline" size="sm" onClick={() => setConcurrency(10)}>最大</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">任务列表</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {tasks.filter(t => t.status !== 'completed').map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {statusIcons[task.status]}
                    <span className="font-medium">{task.name}</span>
                    <Badge variant="outline">{task.type.toUpperCase()}</Badge>
                    <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {task.status === 'queued' && <Button size="sm" variant="outline"><Play className="h-3 w-3" /></Button>}
                    {task.status === 'running' && <Button size="sm" variant="outline"><Pause className="h-3 w-3" /></Button>}
                    <Button size="sm" variant="outline"><XCircle className="h-3 w-3" /></Button>
                  </div>
                </div>
                {task.status === 'running' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>进度</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  预计大小: {task.estimatedSizeMB} MB · 创建于: {new Date(task.createdAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {tasks.filter(t => t.status === 'completed').map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcons[task.status]}
                    <span className="font-medium">{task.name}</span>
                    <Badge variant="outline">{task.type.toUpperCase()}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
