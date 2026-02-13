/**
 * GRT智能系统 - 安全监控仪表盘
 * 
 * 提供安全威胁统计、审计日志、入侵检测告警和实时监控功能
 */

import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
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
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              安全监控中心
            </h1>
            <p className="text-muted-foreground">实时监控系统安全状态、威胁检测和审计日志</p>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

        {/* 安全概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 安全事件 */}
          <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">24小时安全事件</p>
                  <p className="text-3xl font-bold mt-1">
                    {isLoading ? '-' : dashboard?.overview.totalEvents24h || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-green-400">正常</span>
              </div>
            </CardContent>
          </Card>

          {/* 严重威胁 */}
          <Card className="bg-card/50 border-border hover:border-red-500/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">严重威胁</p>
                  <p className="text-3xl font-bold mt-1 text-red-400">
                    {isLoading ? '-' : dashboard?.overview.criticalEvents24h || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {(dashboard?.overview.criticalEvents24h || 0) > 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400 mr-1" />
                    <span className="text-red-400">需要关注</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-green-400">无威胁</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 登录失败 */}
          <Card className="bg-card/50 border-border hover:border-orange-500/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">登录失败</p>
                  <p className="text-3xl font-bold mt-1 text-orange-400">
                    {isLoading ? '-' : dashboard?.overview.failedLogins24h || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <XCircle className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {(dashboard?.overview.failedLogins24h || 0) > 10 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-orange-400 mr-1" />
                    <span className="text-orange-400">异常增多</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-green-400">正常范围</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 封禁IP */}
          <Card className="bg-card/50 border-border hover:border-purple-500/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">封禁IP</p>
                  <p className="text-3xl font-bold mt-1 text-purple-400">
                    {isLoading ? '-' : dashboard?.overview.blockedIPs || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Ban className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Globe className="w-4 h-4 text-muted-foreground mr-1" />
                <span className="text-muted-foreground">
                  {dashboard?.overview.activeSessions || 0} 活跃会话
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 标签页内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">安全概览</TabsTrigger>
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
        </Tabs>
      </div>
    </DashboardLayout>
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
