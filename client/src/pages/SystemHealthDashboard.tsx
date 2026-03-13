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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');

  // 模拟数据
  const [components] = useState<ComponentHealth[]>([
    { name: t("admin.sysHealth.mysqlDb"), status: 'healthy', message: t("admin.sysHealth.dbConnectionNormal"), responseTime: 45, details: { host: 'localhost', port: 3306, connections: 15 } },
    { name: t("admin.sysHealth.nodejsService"), status: 'healthy', message: t("admin.sysHealth.serviceRunningNormal"), responseTime: 12, details: { pid: 12345, uptime: '2d 5h 30m' } },
    { name: t("admin.sysHealth.systemMemory"), status: 'healthy', message: t("admin.sysHealth.memoryUsage65"), responseTime: 5, details: { total: '16 GB', used: '10.4 GB' } },
    { name: t("admin.sysHealth.diskSpace"), status: 'degraded', message: t("admin.sysHealth.diskUsage82"), responseTime: 8, details: { total: '500 GB', used: '410 GB' } },
    { name: t("admin.sysHealth.networkConnection"), status: 'healthy', message: t("admin.sysHealth.networkNormal"), responseTime: 3, details: { activeConnections: 42 } },
  ]);

  const [metrics] = useState<SystemMetrics>({
    cpu: { usage: 35.5, cores: 8, model: 'Intel Core i7-10700' },
    memory: { total: 17179869184, used: 11182080000, free: 5997789184, usagePercent: 65.1 },
    disk: { total: 536870912000, used: 440401920000, free: 96468992000, usagePercent: 82.0 },
    network: { activeConnections: 42 },
    process: { pid: 12345, uptime: 180000, memoryUsage: 256000000 },
  });

  const [alerts] = useState<HealthAlert[]>([
    { id: '1', level: 'warning', component: t("admin.sysHealth.diskSpace"), message: t("admin.sysHealth.diskUsageOver80"), timestamp: Date.now() - 3600000, acknowledged: false },
    { id: '2', level: 'info', component: t("admin.sysHealth.system"), message: t("admin.sysHealth.systemRunOver48h"), timestamp: Date.now() - 7200000, acknowledged: true },
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
    return `${days}${t("admin.sysHealth.days")} ${hours}${t("admin.sysHealth.hours")} ${minutes}${t("admin.sysHealth.minutes")}`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdate(new Date());
    setIsRefreshing(false);
    toast({
      title: t("admin.sysHealth.refreshComplete"),
      description: t("admin.sysHealth.statusUpdated"),
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
        return <Badge className="bg-green-500">{t("admin.sysHealth.healthy")}</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">{t("admin.sysHealth.degraded")}</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">{t("admin.sysHealth.unhealthy")}</Badge>;
      default:
        return <Badge variant="outline">{t("admin.sysHealth.unknown")}</Badge>;
    }
  };

  const getAlertBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">{t("admin.sysHealth.critical")}</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">{t("admin.sysHealth.warning")}</Badge>;
      case 'info':
        return <Badge variant="outline">{t("admin.sysHealth.info")}</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title={t("admin.sysHealth.title")}
        description={t("admin.sysHealth.description")}
        actions={
          <>
            <div className="text-sm text-muted-foreground">
              <Clock className="w-4 h-4 inline mr-1" />
              {t("admin.sysHealth.lastUpdate")}: {lastUpdate.toLocaleTimeString()}
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {t("admin.sysHealth.refresh")}
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
                <h2 className="text-xl font-bold">{t("admin.sysHealth.systemStatus")}: {
                  overallStatus === 'healthy' ? t("admin.sysHealth.normalRunning") :
                  overallStatus === 'degraded' ? t("admin.sysHealth.partiallyDegraded") : t("admin.sysHealth.hasAnomalies")
                }</h2>
                <p className="text-muted-foreground">
                  {t("admin.sysHealth.version")} v2.5.22 | {t("admin.sysHealth.uptime")}: {formatUptime(metrics.process.uptime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {alerts.filter(a => !a.acknowledged).length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  {alerts.filter(a => !a.acknowledged).length} {t("admin.sysHealth.alerts")}
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
                <p className="text-sm text-muted-foreground">{t("admin.sysHealth.cpuUsage")}</p>
                <p className="text-2xl font-bold">{metrics.cpu.usage}%</p>
              </div>
            </div>
            <Progress value={metrics.cpu.usage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{metrics.cpu.cores} {t("admin.sysHealth.cores")} | {metrics.cpu.model}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MemoryStick className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.sysHealth.memoryUsage")}</p>
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
                <p className="text-sm text-muted-foreground">{t("admin.sysHealth.diskUsage")}</p>
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
                <p className="text-sm text-muted-foreground">{t("admin.sysHealth.activeConnections")}</p>
                <p className="text-2xl font-bold">{metrics.network.activeConnections}</p>
              </div>
            </div>
            <Progress value={Math.min(metrics.network.activeConnections, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{t("admin.sysHealth.dbAndApiConnections")}</p>
          </CardContent>
        </Card>
      </div>

      {/* 详细信息 */}
      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">{t("admin.sysHealth.componentStatus")}</TabsTrigger>
          <TabsTrigger value="alerts">
            {t("admin.sysHealth.alertRecords")}
            {alerts.filter(a => !a.acknowledged).length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {alerts.filter(a => !a.acknowledged).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="details">{t("admin.sysHealth.detailedMetrics")}</TabsTrigger>
        </TabsList>

        {/* 组件状态 */}
        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.sysHealth.componentHealthStatus")}</CardTitle>
              <CardDescription>{t("admin.sysHealth.componentHealthDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.sysHealth.component")}</TableHead>
                    <TableHead>{t("admin.sysHealth.statusCol")}</TableHead>
                    <TableHead>{t("admin.sysHealth.message")}</TableHead>
                    <TableHead>{t("admin.sysHealth.responseTime")}</TableHead>
                    <TableHead>{t("admin.sysHealth.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((component, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {component.name === t("admin.sysHealth.mysqlDb") && <Database className="w-4 h-4" />}
                          {component.name === t("admin.sysHealth.nodejsService") && <Server className="w-4 h-4" />}
                          {component.name === t("admin.sysHealth.systemMemory") && <MemoryStick className="w-4 h-4" />}
                          {component.name === t("admin.sysHealth.diskSpace") && <HardDrive className="w-4 h-4" />}
                          {component.name === t("admin.sysHealth.networkConnection") && <Wifi className="w-4 h-4" />}
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
              <CardTitle>{t("admin.sysHealth.alertRecords")}</CardTitle>
              <CardDescription>{t("admin.sysHealth.alertHistoryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>{t("admin.sysHealth.noAlertRecords")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.sysHealth.level")}</TableHead>
                      <TableHead>{t("admin.sysHealth.component")}</TableHead>
                      <TableHead>{t("admin.sysHealth.message")}</TableHead>
                      <TableHead>{t("admin.sysHealth.time")}</TableHead>
                      <TableHead>{t("admin.sysHealth.statusCol")}</TableHead>
                      <TableHead>{t("admin.sysHealth.operation")}</TableHead>
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
                            <Badge variant="outline">{t("admin.sysHealth.acknowledged")}</Badge>
                          ) : (
                            <Badge variant="destructive">{t("admin.sysHealth.pending")}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!alert.acknowledged && (
                            <Button variant="ghost" size="sm">{t("admin.sysHealth.confirm")}</Button>
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
                <CardTitle>{t("admin.sysHealth.cpuDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.model")}</span>
                  <span>{metrics.cpu.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.coreCount")}</span>
                  <span>{metrics.cpu.cores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.usageRate")}</span>
                  <span>{metrics.cpu.usage}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.sysHealth.memoryDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.totalMemory")}</span>
                  <span>{formatBytes(metrics.memory.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.used")}</span>
                  <span>{formatBytes(metrics.memory.used)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.available")}</span>
                  <span>{formatBytes(metrics.memory.free)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.sysHealth.diskDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.totalCapacity")}</span>
                  <span>{formatBytes(metrics.disk.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.used")}</span>
                  <span>{formatBytes(metrics.disk.used)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.available")}</span>
                  <span>{formatBytes(metrics.disk.free)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.sysHealth.processDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PID</span>
                  <span>{metrics.process.pid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.uptime")}</span>
                  <span>{formatUptime(metrics.process.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.sysHealth.memoryUsed")}</span>
                  <span>{formatBytes(metrics.process.memoryUsage)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
