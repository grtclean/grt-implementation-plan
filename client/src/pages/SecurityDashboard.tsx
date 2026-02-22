/**
 * GRT智能系统 - 安全监控仪表盘
 * 
 * 提供安全威胁统计、审计日志、入侵检测告警和实时监控功能
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Ban, 
  Bell,
  CheckCircle2, 
  Clock, 
  Eye, 
  FileText, 
  Key, 
  Loader2, 
  Lock, 
  Plus,
  RefreshCw, 
  Search, 
  Send,
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldOff, 
  Skull, 
  Terminal, 
  TestTube,
  Trash2,
  TrendingDown, 
  TrendingUp, 
  User, 
  Users, 
  Webhook,
  XCircle,
  Activity,
  AlertCircle,
  Database,
  Globe,
  Server,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "@/components/grt";

// ===== 类型定义 =====

type Severity = 'low' | 'medium' | 'high' | 'critical';

type SecurityAlertTypeValue =
  | 'intrusion_attempt' | 'rate_limit_exceeded' | 'ip_blocked'
  | 'sql_injection' | 'xss_attack' | 'command_injection'
  | 'unauthorized_access' | 'suspicious_activity' | 'license_violation' | 'data_exfiltration';

interface AuditLog {
  id: number;
  eventType: string;
  action: string;
  userId: number | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  resource: string | null;
  severity: Severity;
  result: string;
  details: string | null;
  createdAt: string;
}

// ===== 辅助函数 =====

const getSeverityColor = (severity: Severity) => {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
  }
};

const getSeverityIcon = (severity: Severity) => {
  switch (severity) {
    case 'critical': return <Skull className="w-4 h-4" />;
    case 'high': return <ShieldAlert className="w-4 h-4" />;
    case 'medium': return <AlertTriangle className="w-4 h-4" />;
    case 'low': return <ShieldCheck className="w-4 h-4" />;
  }
};

const getEventTypeLabel = (eventType: string) => {
  const labels: Record<string, string> = {
    'auth.login': '用户登录',
    'auth.logout': '用户登出',
    'auth.failed': '登录失败',
    'data.access': '数据访问',
    'data.export': '数据导出',
    'config.change': '配置变更',
    'threat.detected': '威胁检测',
    'license.check': '许可证检查',
    'ip.blocked': 'IP封禁',
    'ip.unblocked': 'IP解封',
    'mfa.enabled': 'MFA启用',
    'mfa.disabled': 'MFA禁用',
  };
  return labels[eventType] || eventType;
};

// ===== 主组件 =====

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [logPage, setLogPage] = useState(1);
  const [logFilters, setLogFilters] = useState({
    eventType: '',
    severity: '',
    search: '',
  });
  
  // tRPC查询
  const dashboardQuery = trpc.security.getDashboard.useQuery(undefined, {
    refetchInterval: 30000, // 30秒刷新一次
  });
  
  const auditLogsQuery = trpc.security.getAuditLogs.useQuery({
    page: logPage,
    pageSize: 20,
    eventType: logFilters.eventType || undefined,
    severity: logFilters.severity as Severity || undefined,
    search: logFilters.search || undefined,
  });
  
  const eventStatsQuery = trpc.security.getEventTypeStats.useQuery({ days: 7 });
  const threatStatsQuery = trpc.security.getThreatStats.useQuery({ days: 7 });
  const blockedIPsQuery = trpc.security.getBlockedIPs.useQuery({ page: 1, pageSize: 10 });
  
  // Mutations
  const blockIPMutation = trpc.security.blockIP.useMutation({
    onSuccess: () => {
      toast.success('IP已封禁');
      blockedIPsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`封禁失败: ${error.message}`);
    },
  });
  
  const unblockIPMutation = trpc.security.unblockIP.useMutation({
    onSuccess: () => {
      toast.success('IP已解封');
      blockedIPsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`解封失败: ${error.message}`);
    },
  });
  
  const dashboard = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;
  
  // 检查是否是管理员
  if (user && user.role !== 'admin') {
    return (
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ShieldOff className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">访问受限</h2>
              <p className="text-muted-foreground">
                安全监控仪表盘仅限管理员访问。如需访问权限，请联系系统管理员。
              </p>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Shield}
          title="安全监控中心"
          description="实时监控系统安全状态、威胁检测和审计日志"
          actions={
            <Button
              variant="outline"
              onClick={() => {
                dashboardQuery.refetch();
                auditLogsQuery.refetch();
                eventStatsQuery.refetch();
                threatStatsQuery.refetch();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              刷新数据
            </Button>
          }
        />

        {/* 安全概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label="24小时安全事件"
            value={isLoading ? '-' : dashboard?.overview.totalEvents24h || 0}
            subtitle="正常"
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            icon={ShieldAlert}
            label="严重威胁"
            value={isLoading ? '-' : dashboard?.overview.criticalEvents24h || 0}
            subtitle={(dashboard?.overview.criticalEvents24h || 0) > 0 ? '需要关注' : '无威胁'}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
          />
          <StatCard
            icon={XCircle}
            label="登录失败"
            value={isLoading ? '-' : dashboard?.overview.failedLogins24h || 0}
            subtitle={(dashboard?.overview.failedLogins24h || 0) > 10 ? '异常增多' : '正常范围'}
            iconColor="text-orange-400"
            iconBg="bg-orange-500/10"
          />
          <StatCard
            icon={Ban}
            label="封禁IP"
            value={isLoading ? '-' : dashboard?.overview.blockedIPs || 0}
            subtitle=""
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10"
          />
        </div>

        {/* 标签页内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">安全概览</TabsTrigger>
            <TabsTrigger value="installation">安装模式</TabsTrigger>
            <TabsTrigger value="notes">重要事项</TabsTrigger>
            <TabsTrigger value="audit">审计日志</TabsTrigger>
            <TabsTrigger value="threats">威胁检测</TabsTrigger>
            <TabsTrigger value="access">访问控制</TabsTrigger>
            <TabsTrigger value="license">许可证</TabsTrigger>
            <TabsTrigger value="alerts">告警配置</TabsTrigger>
          </TabsList>

          {/* 安全概览 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 许可证状态 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    许可证状态
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">状态</span>
                      <Badge className={dashboard?.license.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {dashboard?.license.valid ? '有效' : '无效'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">类型</span>
                      <span className="font-medium">{dashboard?.license.type || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">到期时间</span>
                      <span className="font-medium">
                        {dashboard?.license.expiresAt 
                          ? new Date(dashboard.license.expiresAt).toLocaleDateString() 
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">剩余天数</span>
                      <span className={`font-medium ${(dashboard?.license.daysRemaining || 0) < 30 ? 'text-orange-400' : 'text-green-400'}`}>
                        {dashboard?.license.daysRemaining || 0} 天
                      </span>
                    </div>
                    {dashboard?.license.warnings && dashboard.license.warnings.length > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                        <p className="text-sm text-orange-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          {dashboard.license.warnings[0]}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI脱敏代理统计 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    AI脱敏代理
                  </CardTitle>
                  <CardDescription>保护敏感数据不被AI模型学习</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">活跃映射数</span>
                      <span className="font-medium">{dashboard?.aiProxy?.activeMaps || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">映射总数</span>
                      <span className="font-medium text-primary">{dashboard?.aiProxy?.totalMappings || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">最早映射年龄(ms)</span>
                      <span className="font-medium text-red-400">{dashboard?.aiProxy?.oldestMapAge || 0}</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">数据保护率</span>
                        <span className="font-medium">
                          {dashboard?.aiProxy?.activeMaps
                            ? Math.round((dashboard.aiProxy.totalMappings / dashboard.aiProxy.activeMaps) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress
                        value={dashboard?.aiProxy?.activeMaps
                          ? (dashboard.aiProxy.totalMappings / dashboard.aiProxy.activeMaps) * 100
                          : 0}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 事件类型统计 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    事件类型分布 (近7天)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {eventStatsQuery.data?.slice(0, 8).map((stat, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border">
                        <p className="text-sm text-muted-foreground">{getEventTypeLabel(stat.eventType)}</p>
                        <p className="text-2xl font-bold mt-1">{stat.count}</p>
                      </div>
                    ))}
                    {(!eventStatsQuery.data || eventStatsQuery.data.length === 0) && (
                      <div className="col-span-4 text-center py-8 text-muted-foreground">
                        暂无事件数据
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 审计日志 */}
          <TabsContent value="audit" className="space-y-4">
            {/* 筛选器 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs text-muted-foreground">搜索</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索操作内容..."
                        value={logFilters.search}
                        onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="w-[180px]">
                    <Label className="text-xs text-muted-foreground">事件类型</Label>
                    <Select
                      value={logFilters.eventType}
                      onValueChange={(v) => setLogFilters({ ...logFilters, eventType: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="全部类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部类型</SelectItem>
                        <SelectItem value="auth.login">用户登录</SelectItem>
                        <SelectItem value="auth.failed">登录失败</SelectItem>
                        <SelectItem value="data.access">数据访问</SelectItem>
                        <SelectItem value="data.export">数据导出</SelectItem>
                        <SelectItem value="config.change">配置变更</SelectItem>
                        <SelectItem value="threat.detected">威胁检测</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[150px]">
                    <Label className="text-xs text-muted-foreground">严重程度</Label>
                    <Select
                      value={logFilters.severity}
                      onValueChange={(v) => setLogFilters({ ...logFilters, severity: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="全部" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="critical">严重</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="low">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setLogFilters({ eventType: '', severity: '', search: '' });
                        setLogPage(1);
                      }}
                    >
                      重置
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 日志表格 */}
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">时间</TableHead>
                      <TableHead className="w-[120px]">事件类型</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead className="w-[100px]">用户</TableHead>
                      <TableHead className="w-[120px]">IP地址</TableHead>
                      <TableHead className="w-[80px]">严重度</TableHead>
                      <TableHead className="w-[80px]">结果</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : auditLogsQuery.data?.logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          暂无审计日志
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogsQuery.data?.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getEventTypeLabel(log.eventType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate" title={log.action}>
                            {log.action}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.userName || '-'}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {log.ipAddress || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getSeverityColor(log.severity as Severity)} text-xs`}>
                              {getSeverityIcon(log.severity as Severity)}
                              <span className="ml-1">{log.severity}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={(log.result as string) === 'success' || (log.result as string) === 'allowed'
                                ? 'text-green-400 border-green-500/30'
                                : 'text-red-400 border-red-500/30'}
                            >
                              {log.result}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* 分页 */}
                {auditLogsQuery.data && auditLogsQuery.data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      共 {auditLogsQuery.data.pagination.total} 条记录
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logPage === 1}
                        onClick={() => setLogPage(p => p - 1)}
                      >
                        上一页
                      </Button>
                      <span className="flex items-center px-3 text-sm">
                        {logPage} / {auditLogsQuery.data.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logPage >= auditLogsQuery.data.pagination.totalPages}
                        onClick={() => setLogPage(p => p + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 威胁检测 */}
          <TabsContent value="threats" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 威胁类型统计 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>威胁类型分布</CardTitle>
                  <CardDescription>近7天检测到的威胁类型统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {threatStatsQuery.data?.map((threat, index) => {
                      const totalCount = threatStatsQuery.data?.reduce((sum, t) => sum + t.count, 0) || 1;
                      return (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-32 text-sm">{threat.severity}</div>
                          <div className="flex-1">
                            <Progress
                              value={(threat.count / totalCount) * 100}
                              className="h-2"
                            />
                          </div>
                          <div className="w-16 text-right font-medium">{threat.count}</div>
                        </div>
                      );
                    })}
                    {(!threatStatsQuery.data || threatStatsQuery.data.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-green-400" />
                        <p>暂无威胁检测记录</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 威胁统计 */}
              <Card>
                <CardHeader>
                  <CardTitle>威胁统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-sm text-muted-foreground">严重威胁</p>
                      <p className="text-2xl font-bold text-red-400">
                        {threatStatsQuery.data?.find((s) => s.severity === 'critical')?.count || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <p className="text-sm text-muted-foreground">高危威胁</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {threatStatsQuery.data?.find((s) => s.severity === 'high')?.count || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-sm text-muted-foreground">中等威胁</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {threatStatsQuery.data?.find((s) => s.severity === 'medium')?.count || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-sm text-muted-foreground">低危威胁</p>
                      <p className="text-2xl font-bold text-green-400">
                        {threatStatsQuery.data?.find((s) => s.severity === 'low')?.count || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 访问控制 */}
          <TabsContent value="access" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* IP黑名单 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="w-5 h-5" />
                    IP黑名单
                  </CardTitle>
                  <CardDescription>被封禁的IP地址列表</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP地址</TableHead>
                        <TableHead>封禁原因</TableHead>
                        <TableHead>到期时间</TableHead>
                        <TableHead className="w-[80px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blockedIPsQuery.data?.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            暂无封禁IP
                          </TableCell>
                        </TableRow>
                      ) : (
                        blockedIPsQuery.data?.items.map((ip) => (
                          <TableRow key={ip.id}>
                            <TableCell className="font-mono">{ip.ipAddress}</TableCell>
                            <TableCell className="text-sm">{ip.reason}</TableCell>
                            <TableCell className="text-sm">
                              {ip.expiresAt ? new Date(ip.expiresAt).toLocaleString() : '永久'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unblockIPMutation.mutate({ ipAddress: ip.ipAddress })}
                                disabled={unblockIPMutation.isPending}
                              >
                                解封
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 手动封禁IP */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    手动封禁IP
                  </CardTitle>
                  <CardDescription>手动添加IP到黑名单</CardDescription>
                </CardHeader>
                <CardContent>
                  <form 
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const ipAddress = formData.get('ip') as string;
                      const reason = formData.get('reason') as string;
                      const durationHours = parseInt(formData.get('duration') as string) || 0;
                      const expiresAt = durationHours > 0
                        ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
                        : undefined;

                      if (ipAddress) {
                        blockIPMutation.mutate({ ipAddress, reason, expiresAt });
                        e.currentTarget.reset();
                      }
                    }}
                  >
                    <div className="space-y-2">
                      <Label>IP地址</Label>
                      <Input name="ip" placeholder="例如: 192.168.1.100" required />
                    </div>
                    <div className="space-y-2">
                      <Label>封禁原因</Label>
                      <Input name="reason" placeholder="输入封禁原因" />
                    </div>
                    <div className="space-y-2">
                      <Label>封禁时长 (小时)</Label>
                      <Select name="duration" defaultValue="24">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1小时</SelectItem>
                          <SelectItem value="6">6小时</SelectItem>
                          <SelectItem value="24">24小时</SelectItem>
                          <SelectItem value="168">7天</SelectItem>
                          <SelectItem value="720">30天</SelectItem>
                          <SelectItem value="0">永久</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={blockIPMutation.isPending}>
                      {blockIPMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Ban className="w-4 h-4 mr-2" />
                      )}
                      封禁IP
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 许可证 */}
          <TabsContent value="license" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  许可证详情
                </CardTitle>
                <CardDescription>系统许可证信息和功能模块授权</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">基本信息</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">许可证状态</span>
                        <Badge className={dashboard?.license.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {dashboard?.license.valid ? '有效' : '无效'}
                        </Badge>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">许可证类型</span>
                        <span className="font-medium">{dashboard?.license.type || '-'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">到期时间</span>
                        <span className="font-medium">
                          {dashboard?.license.expiresAt 
                            ? new Date(dashboard.license.expiresAt).toLocaleDateString() 
                            : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">剩余天数</span>
                        <span className={`font-medium ${(dashboard?.license.daysRemaining || 0) < 30 ? 'text-orange-400' : 'text-green-400'}`}>
                          {dashboard?.license.daysRemaining || 0} 天
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">功能模块授权</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['CRM', '项目管理', '成本管理', '培训管理', 'AI助手', '报表分析'].map((module) => (
                        <div key={module} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm">{module}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 告警配置 */}
          <TabsContent value="alerts" className="space-y-4">
            <AlertConfigTab />
          </TabsContent>

          {/* 安装模式 */}
          <TabsContent value="installation" className="space-y-4">
            <InstallationModeTab />
          </TabsContent>

          {/* 管理员重要事项 */}
          <TabsContent value="notes" className="space-y-4">
            <AdminNotesTab />
          </TabsContent>
        </Tabs>
      </div>
  );
}

// ===== 告警配置Tab组件 =====

function AlertConfigTab() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    webhookType: 'wecom' as 'wecom' | 'dingtalk' | 'feishu' | 'custom',
    webhookUrl: '',
    alertTypes: [] as SecurityAlertTypeValue[],
    minSeverity: 'warning' as 'info' | 'warning' | 'critical' | 'emergency',
    mentionAll: false,
    cooldownMinutes: 5,
  });

  // 获取告警配置
  const { data: alertConfigs, isLoading: configsLoading, refetch: refetchConfigs } = 
    trpc.security.getAlertConfigs.useQuery();
  
  // 获取告警统计
  const { data: alertStats } = trpc.security.getAlertStats.useQuery();
  
  // 获取告警历史
  const { data: alertHistory } = trpc.security.getAlertHistory.useQuery({ limit: 20 });
  
  // 获取模板
  const { data: templates } = trpc.security.getAlertConfigTemplates.useQuery();

  // 添加配置
  const addConfigMutation = trpc.security.addAlertConfig.useMutation({
    onSuccess: () => {
      toast.success('告警配置添加成功');
      setShowAddDialog(false);
      refetchConfigs();
      setNewConfig({
        name: '',
        webhookType: 'wecom',
        webhookUrl: '',
        alertTypes: [],
        minSeverity: 'warning',
        mentionAll: false,
        cooldownMinutes: 5,
      });
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  // 切换启用状态
  const toggleMutation = trpc.security.toggleAlertConfig.useMutation({
    onSuccess: () => {
      toast.success('状态已更新');
      refetchConfigs();
    },
  });

  // 删除配置
  const deleteMutation = trpc.security.deleteAlertConfig.useMutation({
    onSuccess: () => {
      toast.success('配置已删除');
      refetchConfigs();
    },
  });

  // 测试配置
  const testMutation = trpc.security.testAlertConfig.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('测试消息发送成功');
      } else {
        toast.error(`测试失败: ${result.error}`);
      }
    },
  });

  const alertTypeOptions: { value: SecurityAlertTypeValue; label: string }[] = [
    { value: 'intrusion_attempt', label: '入侵尝试' },
    { value: 'rate_limit_exceeded', label: '速率限制超出' },
    { value: 'ip_blocked', label: 'IP被封禁' },
    { value: 'sql_injection', label: 'SQL注入' },
    { value: 'xss_attack', label: 'XSS攻击' },
    { value: 'command_injection', label: '命令注入' },
    { value: 'unauthorized_access', label: '未授权访问' },
    { value: 'suspicious_activity', label: '可疑活动' },
    { value: 'license_violation', label: '许可证违规' },
    { value: 'data_exfiltration', label: '数据外泄' },
  ];

  const webhookTypeLabels: Record<string, string> = {
    wecom: '企业微信',
    dingtalk: '钉钉',
    feishu: '飞书',
    custom: '自定义',
  };

  const severityLabels: Record<string, string> = {
    info: '信息',
    warning: '警告',
    critical: '严重',
    emergency: '紧急',
  };

  return (
    <div className="space-y-6">
      {/* 告警统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">告警配置</p>
                <p className="text-2xl font-bold">{alertStats?.totalConfigs || 0}</p>
              </div>
              <Webhook className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已启用</p>
                <p className="text-2xl font-bold text-green-500">{alertStats?.enabledConfigs || 0}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">24小时告警</p>
                <p className="text-2xl font-bold text-orange-500">{alertStats?.last24HoursAlerts || 0}</p>
              </div>
              <Bell className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">成功率</p>
                <p className="text-2xl font-bold">
                  {alertStats?.totalAlertsSent 
                    ? Math.round((alertStats.successfulAlerts / alertStats.totalAlertsSent) * 100) 
                    : 100}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 告警配置列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                告警配置管理
              </CardTitle>
              <CardDescription>配置安全告警的Webhook推送目标</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  添加配置
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>添加告警配置</DialogTitle>
                  <DialogDescription>配置安全告警的Webhook推送目标</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>配置名称</Label>
                      <Input
                        value={newConfig.name}
                        onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                        placeholder="例如：入侵检测告警"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook类型</Label>
                      <Select
                        value={newConfig.webhookType}
                        onValueChange={(v) => setNewConfig({ ...newConfig, webhookType: v as typeof newConfig.webhookType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wecom">企业微信</SelectItem>
                          <SelectItem value="dingtalk">钉钉</SelectItem>
                          <SelectItem value="feishu">飞书</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={newConfig.webhookUrl}
                      onChange={(e) => setNewConfig({ ...newConfig, webhookUrl: e.target.value })}
                      placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>最低告警级别</Label>
                      <Select
                        value={newConfig.minSeverity}
                        onValueChange={(v) => setNewConfig({ ...newConfig, minSeverity: v as typeof newConfig.minSeverity })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">信息</SelectItem>
                          <SelectItem value="warning">警告</SelectItem>
                          <SelectItem value="critical">严重</SelectItem>
                          <SelectItem value="emergency">紧急</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>冷却时间（分钟）</Label>
                      <Input
                        type="number"
                        value={newConfig.cooldownMinutes}
                        onChange={(e) => setNewConfig({ ...newConfig, cooldownMinutes: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>告警类型</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {alertTypeOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newConfig.alertTypes.includes(opt.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewConfig({ ...newConfig, alertTypes: [...newConfig.alertTypes, opt.value] });
                              } else {
                                setNewConfig({ ...newConfig, alertTypes: newConfig.alertTypes.filter(t => t !== opt.value) });
                              }
                            }}
                            className="rounded"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newConfig.mentionAll}
                      onChange={(e) => setNewConfig({ ...newConfig, mentionAll: e.target.checked })}
                      className="rounded"
                    />
                    <Label>紧急告警时@所有人</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
                  <Button
                    onClick={() => addConfigMutation.mutate(newConfig)}
                    disabled={!newConfig.name || !newConfig.webhookUrl || newConfig.alertTypes.length === 0}
                  >
                    添加
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {configsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : alertConfigs && alertConfigs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>告警级别</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{webhookTypeLabels[config.webhookType]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">≥ {severityLabels[config.minSeverity]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.enabled ? 'default' : 'secondary'}>
                        {config.enabled ? '已启用' : '已禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleMutation.mutate({ id: config.id, enabled: !config.enabled })}
                        >
                          {config.enabled ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => testMutation.mutate({ id: config.id })}
                          disabled={testMutation.isPending}
                        >
                          <TestTube className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate({ id: config.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无告警配置</p>
              <p className="text-sm">点击上方“添加配置”按钮创建第一个告警配置</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 告警发送历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            告警发送历史
          </CardTitle>
          <CardDescription>最近20条告警发送记录</CardDescription>
        </CardHeader>
        <CardContent>
          {alertHistory && alertHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>告警ID</TableHead>
                  <TableHead>配置ID</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>错误信息</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertHistory.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(record.sentAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{record.alertId.slice(0, 16)}...</TableCell>
                    <TableCell className="font-mono text-xs">{record.configId.slice(0, 16)}...</TableCell>
                    <TableCell>
                      <Badge variant={record.success ? 'default' : 'destructive'}>
                        {record.success ? '成功' : '失败'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.error || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无告警发送记录</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== 安装模式Tab组件 =====

function InstallationModeTab() {
  const { data: installInfo, isLoading } = trpc.security.getInstallationInfo.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: modesData } = trpc.security.getInstallationModes.useQuery();
  const { data: passwordStatus } = trpc.security.isPasswordSet.useQuery();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [securityReason, setSecurityReason] = useState('');
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [targetLevel, setTargetLevel] = useState<'standard' | 'elevated' | 'lockdown'>('standard');

  const setPasswordMutation = trpc.security.setServerPassword.useMutation({
    onSuccess: () => {
      toast.success('服务器密码已设置');
      setShowPasswordDialog(false);
      setNewPassword('');
    },
    onError: (err) => toast.error(err.message),
  });

  const setSecurityLevelMutation = trpc.security.setSecurityLevel.useMutation({
    onSuccess: () => {
      toast.success('安全级别已更新');
      setShowSecurityDialog(false);
      setSecurityReason('');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const modes = modesData?.modes;
  const featureLabels = modesData?.featureLabels;
  const currentMode = installInfo?.mode || 'community';
  const security = installInfo?.security;

  const securityLevelColors: Record<string, string> = {
    standard: 'bg-green-500/20 text-green-400 border-green-500/30',
    elevated: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    lockdown: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const securityLevelLabels: Record<string, string> = {
    standard: '标准模式',
    elevated: '加强模式',
    lockdown: '锁定模式',
  };

  return (
    <div className="space-y-6">
      {/* Current mode + Password status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="w-4 h-4" />
              当前安装模式
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{modes?.[currentMode]?.name || currentMode}</div>
            <p className="text-xs text-muted-foreground mt-1">{modes?.[currentMode]?.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              密码保护
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {passwordStatus?.configured ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">已设置</Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">未设置</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowPasswordDialog(true)}
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              {passwordStatus?.configured ? '更新密码' : '设置密码'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              主动安全级别
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={securityLevelColors[security?.level || 'standard']}>
                {securityLevelLabels[security?.level || 'standard']}
              </Badge>
            </div>
            {security?.activatedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {security.reason} ({new Date(security.activatedAt).toLocaleString()})
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {(['standard', 'elevated', 'lockdown'] as const).map((lvl) => (
                <Button
                  key={lvl}
                  variant={security?.level === lvl ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  disabled={security?.level === lvl}
                  onClick={() => { setTargetLevel(lvl); setShowSecurityDialog(true); }}
                >
                  {securityLevelLabels[lvl]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3-Mode Comparison Table */}
      {modes && featureLabels && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              三版本功能对比
            </CardTitle>
            <CardDescription>社区开源版 vs 客户授权版 vs 企业内部版</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">功能</TableHead>
                  {(['community', 'customer', 'enterprise'] as const).map((m) => (
                    <TableHead key={m} className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={m === currentMode ? 'font-bold text-primary' : ''}>
                          {modes[m]?.name}
                        </span>
                        {m === currentMode && <Badge variant="default" className="text-[10px] h-4">当前</Badge>}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">最大用户数</TableCell>
                  <TableCell className="text-center">{modes.community?.maxUsers}</TableCell>
                  <TableCell className="text-center">{modes.customer?.maxUsers}</TableCell>
                  <TableCell className="text-center">不限</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">需要许可证</TableCell>
                  <TableCell className="text-center"><XCircle className="w-4 h-4 mx-auto text-muted-foreground" /></TableCell>
                  <TableCell className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-green-400" /></TableCell>
                  <TableCell className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-green-400" /></TableCell>
                </TableRow>
                {Object.entries(featureLabels).map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{label.name}</TableCell>
                    {(['community', 'customer', 'enterprise'] as const).map((m) => {
                      const features = modes[m]?.features as Record<string, boolean> | undefined;
                      const enabled = features?.[key];
                      return (
                        <TableCell key={m} className="text-center">
                          {enabled
                            ? <CheckCircle2 className="w-4 h-4 mx-auto text-green-400" />
                            : <XCircle className="w-4 h-4 mx-auto text-muted-foreground/40" />
                          }
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Security Policies per Mode */}
      {security && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              当前安全策略 ({securityLevelLabels[security.level]})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: '非管理员登录', value: security.policies.blockNonAdminLogin ? '阻止' : '允许', danger: security.policies.blockNonAdminLogin },
                { label: '全员MFA', value: security.policies.requireMFAAll ? '必须' : '可选', danger: false },
                { label: '严格限速', value: security.policies.strictRateLimits ? '开启' : '关闭', danger: false },
                { label: '数据导出', value: security.policies.disableExport ? '禁用' : '允许', danger: security.policies.disableExport },
                { label: 'API访问', value: security.policies.disableAPI ? '禁用' : '允许', danger: security.policies.disableAPI },
                { label: '强制重认证', value: security.policies.forceReauthMinutes ? `${security.policies.forceReauthMinutes}分钟` : '关闭', danger: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant={item.danger ? 'destructive' : 'secondary'} className="text-xs">
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置服务器访问密码</DialogTitle>
            <DialogDescription>此密码保护整个服务器实例，防止未授权访问。建议使用强密码。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>新密码 (最少8位)</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入新的服务器密码..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>取消</Button>
            <Button
              disabled={newPassword.length < 8 || setPasswordMutation.isPending}
              onClick={() => setPasswordMutation.mutate({ password: newPassword })}
            >
              {setPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
              确认设置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Level Dialog */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>变更安全级别至: {securityLevelLabels[targetLevel]}</DialogTitle>
            <DialogDescription>
              {targetLevel === 'lockdown' && '锁定模式将阻止所有非管理员登录，禁用数据导出和API。仅在紧急情况下使用。'}
              {targetLevel === 'elevated' && '加强模式将启用全员MFA、严格限速、禁用数据导出。'}
              {targetLevel === 'standard' && '恢复到标准安全级别，所有功能正常可用。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>变更原因 (必填)</Label>
              <Input
                value={securityReason}
                onChange={(e) => setSecurityReason(e.target.value)}
                placeholder="说明变更原因..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSecurityDialog(false)}>取消</Button>
            <Button
              variant={targetLevel === 'lockdown' ? 'destructive' : 'default'}
              disabled={!securityReason.trim() || setSecurityLevelMutation.isPending}
              onClick={() => setSecurityLevelMutation.mutate({ level: targetLevel, reason: securityReason })}
            >
              {setSecurityLevelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
              确认变更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== 管理员重要事项Tab组件 =====

function AdminNotesTab() {
  const { data: notes, isLoading, refetch } = trpc.security.getAdminNotes.useQuery(
    { includeDismissed: false },
    { refetchInterval: 30000 }
  );
  const { data: allNotes } = trpc.security.getAdminNotes.useQuery({ includeDismissed: true });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNote, setNewNote] = useState({
    category: 'system' as 'security' | 'license' | 'system' | 'update' | 'action_required',
    severity: 'info' as 'info' | 'warning' | 'critical',
    title: '',
    description: '',
  });

  const dismissMutation = trpc.security.dismissNote.useMutation({
    onSuccess: () => { toast.success('已忽略'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const addNoteMutation = trpc.security.addNote.useMutation({
    onSuccess: () => {
      toast.success('事项已添加');
      setShowAddDialog(false);
      setNewNote({ category: 'system', severity: 'info', title: '', description: '' });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const categoryIcons: Record<string, React.ReactNode> = {
    security: <ShieldAlert className="w-4 h-4" />,
    license: <Key className="w-4 h-4" />,
    system: <Server className="w-4 h-4" />,
    update: <RefreshCw className="w-4 h-4" />,
    action_required: <AlertCircle className="w-4 h-4" />,
  };

  const categoryLabels: Record<string, string> = {
    security: '安全',
    license: '许可证',
    system: '系统',
    update: '更新',
    action_required: '需要操作',
  };

  const severityColors: Record<string, string> = {
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-400">
              {notes?.filter((n) => n.severity === 'critical').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">紧急事项</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {notes?.filter((n) => n.severity === 'warning').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">警告事项</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{allNotes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">全部事项(含已忽略)</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              管理员重要事项
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加事项
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {notes && notes.length > 0 ? (
            notes.map((note) => (
              <div
                key={note.id}
                className={`flex items-start gap-3 p-4 border rounded-lg ${
                  note.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                  note.severity === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-muted bg-muted/10'
                }`}
              >
                <div className="mt-0.5">{categoryIcons[note.category]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={severityColors[note.severity]} variant="outline">
                      {categoryLabels[note.category]}
                    </Badge>
                    <span className="text-sm font-semibold">{note.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{note.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.timestamp).toLocaleString()}
                    </span>
                    {note.actionUrl && (
                      <Button variant="link" size="sm" className="text-xs h-5 px-0" asChild>
                        <a href={note.actionUrl}>{note.actionLabel || '查看'}</a>
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  onClick={() => dismissMutation.mutate({ noteId: note.id })}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>没有待处理的重要事项</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Note Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加管理员事项</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>类别</Label>
                <Select value={newNote.category} onValueChange={(v) => setNewNote((p) => ({ ...p, category: v as typeof p.category }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security">安全</SelectItem>
                    <SelectItem value="license">许可证</SelectItem>
                    <SelectItem value="system">系统</SelectItem>
                    <SelectItem value="update">更新</SelectItem>
                    <SelectItem value="action_required">需要操作</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>严重程度</Label>
                <Select value={newNote.severity} onValueChange={(v) => setNewNote((p) => ({ ...p, severity: v as typeof p.severity }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">信息</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="critical">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>标题</Label>
              <Input value={newNote.title} onChange={(e) => setNewNote((p) => ({ ...p, title: e.target.value }))} placeholder="事项标题..." />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={newNote.description} onChange={(e) => setNewNote((p) => ({ ...p, description: e.target.value }))} placeholder="详细描述..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button
              disabled={!newNote.title.trim() || addNoteMutation.isPending}
              onClick={() => addNoteMutation.mutate(newNote)}
            >
              {addNoteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
