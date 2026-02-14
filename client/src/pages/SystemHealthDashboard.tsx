/**
 * 系统健康检查面板
 * v2.5.22 - 本地部署的系统状态监控
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Activity, 
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Wifi,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Bell,
  Clock,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from "@/components/grt";
import Layout from "@/components/Layout";

interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime: number;
  details: Record<string, any>;
}

interface SystemMetrics {
  cpu: { usage: number; cores: number; model: string };
  memory: { total: number; used: number; free: number; usagePercent: number };
  disk: { total: number; used: number; free: number; usagePercent: number };
  network: { activeConnections: number };
  process: { pid: number; uptime: number; memoryUsage: number };
}

interface HealthAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export default function SystemHealthDashboard() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');

  // 模拟数据
  const [components] = useState<ComponentHealth[]>([
    { name: 'MySQL数据库', status: 'healthy', message: '数据库连接正常', responseTime: 45, details: { host: 'localhost', port: 3306, connections: 15 } },
    { name: 'Node.js服务', status: 'healthy', message: '服务运行正常', responseTime: 12, details: { pid: 12345, uptime: '2d 5h 30m' } },
    { name: '系统内存', status: 'healthy', message: '内存使用率 65%', responseTime: 5, details: { total: '16 GB', used: '10.4 GB' } },
    { name: '磁盘空间', status: 'degraded', message: '磁盘使用率 82%', responseTime: 8, details: { total: '500 GB', used: '410 GB' } },
    { name: '网络连接', status: 'healthy', message: '网络连接正常', responseTime: 3, details: { activeConnections: 42 } },
  ]);

  const [metrics] = useState<SystemMetrics>({
    cpu: { usage: 35.5, cores: 8, model: 'Intel Core i7-10700' },
    memory: { total: 17179869184, used: 11182080000, free: 5997789184, usagePercent: 65.1 },
    disk: { total: 536870912000, used: 440401920000, free: 96468992000, usagePercent: 82.0 },
    network: { activeConnections: 42 },
    process: { pid: 12345, uptime: 180000, memoryUsage: 256000000 },
  });

  const [alerts] = useState<HealthAlert[]>([
    { id: '1', level: 'warning', component: '磁盘空间', message: '磁盘使用率超过80%', timestamp: Date.now() - 3600000, acknowledged: false },
    { id: '2', level: 'info', component: '系统', message: '系统已运行超过48小时', timestamp: Date.now() - 7200000, acknowledged: true },
  ]);

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdate(new Date());
    setIsRefreshing(false);
    toast({
      title: '刷新完成',
      description: '系统状态已更新',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500">健康</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">降级</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">异常</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const getAlertBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">严重</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">警告</Badge>;
      case 'info':
        return <Badge variant="outline">信息</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title="系统健康检查"
        description="实时监控系统运行状态和资源使用情况"
        actions={
          <>
            <div className="text-sm text-muted-foreground">
              <Clock className="w-4 h-4 inline mr-1" />
              最后更新: {lastUpdate.toLocaleTimeString()}
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              刷新
            </Button>
          </>
        }
      />

      {/* 整体状态 */}
      <Card className={`border-2 ${
        overallStatus === 'healthy' ? 'border-green-500' :
        overallStatus === 'degraded' ? 'border-yellow-500' : 'border-red-500'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(overallStatus)}
              <div>
                <h2 className="text-xl font-bold">系统状态: {
                  overallStatus === 'healthy' ? '正常运行' :
                  overallStatus === 'degraded' ? '部分降级' : '存在异常'
                }</h2>
                <p className="text-muted-foreground">
                  版本 v2.5.22 | 运行时间: {formatUptime(metrics.process.uptime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {alerts.filter(a => !a.acknowledged).length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  {alerts.filter(a => !a.acknowledged).length} 个告警
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 资源使用概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Cpu className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPU使用率</p>
                <p className="text-2xl font-bold">{metrics.cpu.usage}%</p>
              </div>
            </div>
            <Progress value={metrics.cpu.usage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{metrics.cpu.cores}核心 | {metrics.cpu.model}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MemoryStick className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">内存使用率</p>
                <p className="text-2xl font-bold">{metrics.memory.usagePercent}%</p>
              </div>
            </div>
            <Progress value={metrics.memory.usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${metrics.disk.usagePercent > 80 ? 'bg-yellow-500/10' : 'bg-purple-500/10'}`}>
                <HardDrive className={`w-5 h-5 ${metrics.disk.usagePercent > 80 ? 'text-yellow-500' : 'text-purple-500'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">磁盘使用率</p>
                <p className="text-2xl font-bold">{metrics.disk.usagePercent}%</p>
              </div>
            </div>
            <Progress 
              value={metrics.disk.usagePercent} 
              className={`h-2 ${metrics.disk.usagePercent > 80 ? '[&>div]:bg-yellow-500' : ''}`} 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Wifi className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">活跃连接</p>
                <p className="text-2xl font-bold">{metrics.network.activeConnections}</p>
              </div>
            </div>
            <Progress value={Math.min(metrics.network.activeConnections, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">数据库 + API连接</p>
          </CardContent>
        </Card>
      </div>

      {/* 详细信息 */}
      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">组件状态</TabsTrigger>
          <TabsTrigger value="alerts">
            告警记录
            {alerts.filter(a => !a.acknowledged).length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {alerts.filter(a => !a.acknowledged).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="details">详细指标</TabsTrigger>
        </TabsList>

        {/* 组件状态 */}
        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>组件健康状态</CardTitle>
              <CardDescription>各系统组件的运行状态和响应时间</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>组件</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>消息</TableHead>
                    <TableHead>响应时间</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((component, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {component.name === 'MySQL数据库' && <Database className="w-4 h-4" />}
                          {component.name === 'Node.js服务' && <Server className="w-4 h-4" />}
                          {component.name === '系统内存' && <MemoryStick className="w-4 h-4" />}
                          {component.name === '磁盘空间' && <HardDrive className="w-4 h-4" />}
                          {component.name === '网络连接' && <Wifi className="w-4 h-4" />}
                          {component.name}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(component.status)}</TableCell>
                      <TableCell>{component.message}</TableCell>
                      <TableCell>{component.responseTime}ms</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {Object.entries(component.details).map(([key, value]) => (
                          <span key={key} className="mr-2">{key}: {String(value)}</span>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警记录 */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>告警记录</CardTitle>
              <CardDescription>系统告警和通知历史</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>暂无告警记录</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>级别</TableHead>
                      <TableHead>组件</TableHead>
                      <TableHead>消息</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{getAlertBadge(alert.level)}</TableCell>
                        <TableCell>{alert.component}</TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>{new Date(alert.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          {alert.acknowledged ? (
                            <Badge variant="outline">已确认</Badge>
                          ) : (
                            <Badge variant="destructive">待处理</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!alert.acknowledged && (
                            <Button variant="ghost" size="sm">确认</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 详细指标 */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>CPU详情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">型号</span>
                  <span>{metrics.cpu.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">核心数</span>
                  <span>{metrics.cpu.cores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">使用率</span>
                  <span>{metrics.cpu.usage}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>内存详情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总内存</span>
                  <span>{formatBytes(metrics.memory.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">已使用</span>
                  <span>{formatBytes(metrics.memory.used)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">可用</span>
                  <span>{formatBytes(metrics.memory.free)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>磁盘详情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总容量</span>
                  <span>{formatBytes(metrics.disk.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">已使用</span>
                  <span>{formatBytes(metrics.disk.used)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">可用</span>
                  <span>{formatBytes(metrics.disk.free)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>进程详情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PID</span>
                  <span>{metrics.process.pid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">运行时间</span>
                  <span>{formatUptime(metrics.process.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">内存占用</span>
                  <span>{formatBytes(metrics.process.memoryUsage)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
