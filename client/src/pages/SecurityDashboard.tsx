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
import { useLanguage } from "@/contexts/LanguageContext";

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

const eventTypeLabelKeys: Record<string, string> = {
  'auth.login': 'admin.secDash.eventUserLogin',
  'auth.logout': 'admin.secDash.eventUserLogout',
  'auth.failed': 'admin.secDash.eventLoginFailed',
  'data.access': 'admin.secDash.eventDataAccess',
  'data.export': 'admin.secDash.eventDataExport',
  'config.change': 'admin.secDash.eventConfigChange',
  'threat.detected': 'admin.secDash.eventThreatDetected',
  'license.check': 'admin.secDash.eventLicenseCheck',
  'ip.blocked': 'admin.secDash.eventIpBlocked',
  'ip.unblocked': 'admin.secDash.eventIpUnblocked',
  'mfa.enabled': 'admin.secDash.eventMfaEnabled',
  'mfa.disabled': 'admin.secDash.eventMfaDisabled',
};

// ===== 主组件 =====

export default function SecurityDashboard() {
  const { user } = useAuth();
  const { t, tpl } = useLanguage();
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
      toast.success(t("admin.secDash.ipBlocked"));
      blockedIPsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.secDash.blockFailed")}: ${error.message}`);
    },
  });

  const unblockIPMutation = trpc.security.unblockIP.useMutation({
    onSuccess: () => {
      toast.success(t("admin.secDash.ipUnblocked"));
      blockedIPsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.secDash.unblockFailed")}: ${error.message}`);
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
              <h2 className="text-xl font-bold mb-2">{t("admin.secDash.accessRestricted")}</h2>
              <p className="text-muted-foreground">
                {t("admin.secDash.accessRestrictedDesc")}
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
          title={t("admin.secDash.title")}
          description={t("admin.secDash.description")}
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
              {t("admin.secDash.refreshData")}
            </Button>
          }
        />

        {/* 安全概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label={t("admin.secDash.events24h")}
            value={isLoading ? '-' : dashboard?.overview.totalEvents24h || 0}
            subtitle={t("admin.secDash.normal")}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            icon={ShieldAlert}
            label={t("admin.secDash.criticalThreats")}
            value={isLoading ? '-' : dashboard?.overview.criticalEvents24h || 0}
            subtitle={(dashboard?.overview.criticalEvents24h || 0) > 0 ? t("admin.secDash.needsAttention") : t("admin.secDash.noThreats")}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
          />
          <StatCard
            icon={XCircle}
            label={t("admin.secDash.loginFailures")}
            value={isLoading ? '-' : dashboard?.overview.failedLogins24h || 0}
            subtitle={(dashboard?.overview.failedLogins24h || 0) > 10 ? t("admin.secDash.abnormalIncrease") : t("admin.secDash.normalRange")}
            iconColor="text-orange-400"
            iconBg="bg-orange-500/10"
          />
          <StatCard
            icon={Ban}
            label={t("admin.secDash.blockedIPs")}
            value={isLoading ? '-' : dashboard?.overview.blockedIPs || 0}
            subtitle=""
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10"
          />
        </div>

        {/* 标签页内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">{t("admin.secDash.tabOverview")}</TabsTrigger>
            <TabsTrigger value="installation">{t("admin.secDash.tabInstallation")}</TabsTrigger>
            <TabsTrigger value="notes">{t("admin.secDash.tabNotes")}</TabsTrigger>
            <TabsTrigger value="audit">{t("admin.secDash.tabAudit")}</TabsTrigger>
            <TabsTrigger value="threats">{t("admin.secDash.tabThreats")}</TabsTrigger>
            <TabsTrigger value="access">{t("admin.secDash.tabAccess")}</TabsTrigger>
            <TabsTrigger value="license">{t("admin.secDash.tabLicense")}</TabsTrigger>
            <TabsTrigger value="alerts">{t("admin.secDash.tabAlerts")}</TabsTrigger>
          </TabsList>

          {/* 安全概览 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 许可证状态 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    {t("admin.secDash.licenseStatus")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("admin.secDash.status")}</span>
                      <Badge className={dashboard?.license.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {dashboard?.license.valid ? t("admin.secDash.valid") : t("admin.secDash.invalid")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("admin.secDash.type")}</span>
                      <span className="font-medium">{dashboard?.license.type || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("admin.secDash.expiryTime")}</span>
                      <span className="font-medium">
                        {dashboard?.license.expiresAt 
                          ? new Date(dashboard.license.expiresAt).toLocaleDateString() 
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("admin.secDash.daysRemaining")}</span>
                      <span className={`font-medium ${(dashboard?.license.daysRemaining || 0) < 30 ? 'text-orange-400' : 'text-green-400'}`}>
                        {dashboard?.license.daysRemaining || 0} {t("admin.secDash.days")}
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
                    {t("admin.secDash.aiProxy")}
                  </CardTitle>
                  <CardDescription>{t("admin.secDash.aiProxyDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("admin.secDash.activeMaps")}</span>
                      <span className="font-medium">{dashboard?.aiProxy?.activeMaps || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("admin.secDash.totalMappings")}</span>
                      <span className="font-medium text-primary">{dashboard?.aiProxy?.totalMappings || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("admin.secDash.oldestMapAge")}</span>
                      <span className="font-medium text-red-400">{dashboard?.aiProxy?.oldestMapAge || 0}</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{t("admin.secDash.dataProtectionRate")}</span>
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
                    {t("admin.secDash.eventDistribution")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {eventStatsQuery.data?.slice(0, 8).map((stat, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border">
                        <p className="text-sm text-muted-foreground">{eventTypeLabelKeys[stat.eventType] ? t(eventTypeLabelKeys[stat.eventType]) : stat.eventType}</p>
                        <p className="text-2xl font-bold mt-1">{stat.count}</p>
                      </div>
                    ))}
                    {(!eventStatsQuery.data || eventStatsQuery.data.length === 0) && (
                      <div className="col-span-4 text-center py-8 text-muted-foreground">
                        {t("admin.secDash.noEventData")}
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
                    <Label className="text-xs text-muted-foreground">{t("admin.secDash.search")}</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t("admin.secDash.searchPlaceholder")}
                        value={logFilters.search}
                        onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="w-[180px]">
                    <Label className="text-xs text-muted-foreground">{t("admin.secDash.eventType")}</Label>
                    <Select
                      value={logFilters.eventType}
                      onValueChange={(v) => setLogFilters({ ...logFilters, eventType: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("admin.secDash.allTypes")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("admin.secDash.allTypes")}</SelectItem>
                        <SelectItem value="auth.login">{t("admin.secDash.userLogin")}</SelectItem>
                        <SelectItem value="auth.failed">{t("admin.secDash.loginFailed")}</SelectItem>
                        <SelectItem value="data.access">{t("admin.secDash.dataAccess")}</SelectItem>
                        <SelectItem value="data.export">{t("admin.secDash.dataExport")}</SelectItem>
                        <SelectItem value="config.change">{t("admin.secDash.configChange")}</SelectItem>
                        <SelectItem value="threat.detected">{t("admin.secDash.threatDetected")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[150px]">
                    <Label className="text-xs text-muted-foreground">{t("admin.secDash.severity")}</Label>
                    <Select
                      value={logFilters.severity}
                      onValueChange={(v) => setLogFilters({ ...logFilters, severity: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("admin.secDash.all")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("admin.secDash.all")}</SelectItem>
                        <SelectItem value="critical">{t("admin.secDash.critical")}</SelectItem>
                        <SelectItem value="high">{t("admin.secDash.high")}</SelectItem>
                        <SelectItem value="medium">{t("admin.secDash.medium")}</SelectItem>
                        <SelectItem value="low">{t("admin.secDash.low")}</SelectItem>
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
                      {t("admin.secDash.reset")}
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
                      <TableHead className="w-[160px]">{t("admin.secDash.time")}</TableHead>
                      <TableHead className="w-[120px]">{t("admin.secDash.eventType")}</TableHead>
                      <TableHead>{t("admin.secDash.action")}</TableHead>
                      <TableHead className="w-[100px]">{t("admin.secDash.user")}</TableHead>
                      <TableHead className="w-[120px]">{t("admin.secDash.ipAddress")}</TableHead>
                      <TableHead className="w-[80px]">{t("admin.secDash.severityCol")}</TableHead>
                      <TableHead className="w-[80px]">{t("admin.secDash.result")}</TableHead>
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
                          {t("admin.secDash.noAuditLogs")}
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
                              {eventTypeLabelKeys[log.eventType] ? t(eventTypeLabelKeys[log.eventType]) : log.eventType}
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
                      {tpl("admin.secDash.totalRecords", { count: String(auditLogsQuery.data.pagination.total) })}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logPage === 1}
                        onClick={() => setLogPage(p => p - 1)}
                      >
                        {t("admin.secDash.prevPage")}
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
                        {t("admin.secDash.nextPage")}
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
                  <CardTitle>{t("admin.secDash.threatDistribution")}</CardTitle>
                  <CardDescription>{t("admin.secDash.threatDistributionDesc")}</CardDescription>
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
                        <p>{t("admin.secDash.noThreatRecords")}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 威胁统计 */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.secDash.threatStats")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-sm text-muted-foreground">{t("admin.secDash.criticalThreatsLabel")}</p>
                      <p className="text-2xl font-bold text-red-400">
                        {threatStatsQuery.data?.find((s) => s.severity === 'critical')?.count || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <p className="text-sm text-muted-foreground">{t("admin.secDash.highThreats")}</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {threatStatsQuery.data?.find((s) => s.severity === 'high')?.count || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-sm text-muted-foreground">{t("admin.secDash.mediumThreats")}</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {threatStatsQuery.data?.find((s) => s.severity === 'medium')?.count || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-sm text-muted-foreground">{t("admin.secDash.lowThreats")}</p>
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
                    {t("admin.secDash.ipBlacklist")}
                  </CardTitle>
                  <CardDescription>{t("admin.secDash.ipBlacklistDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.secDash.ipAddress")}</TableHead>
                        <TableHead>{t("admin.secDash.banReason")}</TableHead>
                        <TableHead>{t("admin.secDash.expiryTimeCol")}</TableHead>
                        <TableHead className="w-[80px]">{t("admin.secDash.action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blockedIPsQuery.data?.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t("admin.secDash.noBlockedIPs")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        blockedIPsQuery.data?.items.map((ip) => (
                          <TableRow key={ip.id}>
                            <TableCell className="font-mono">{ip.ipAddress}</TableCell>
                            <TableCell className="text-sm">{ip.reason}</TableCell>
                            <TableCell className="text-sm">
                              {ip.expiresAt ? new Date(ip.expiresAt).toLocaleString() : t("admin.secDash.permanent")}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unblockIPMutation.mutate({ ipAddress: ip.ipAddress })}
                                disabled={unblockIPMutation.isPending}
                              >
                                {t("admin.secDash.unblock")}
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
                    {t("admin.secDash.manualBlock")}
                  </CardTitle>
                  <CardDescription>{t("admin.secDash.manualBlockDesc")}</CardDescription>
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
                      <Label>{t("admin.secDash.ipAddressLabel")}</Label>
                      <Input name="ip" placeholder={t("admin.secDash.ipPlaceholder")} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.secDash.banReasonLabel")}</Label>
                      <Input name="reason" placeholder={t("admin.secDash.banReasonPlaceholder")} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.secDash.banDuration")}</Label>
                      <Select name="duration" defaultValue="24">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t("admin.secDash.hour1")}</SelectItem>
                          <SelectItem value="6">{t("admin.secDash.hour6")}</SelectItem>
                          <SelectItem value="24">{t("admin.secDash.hour24")}</SelectItem>
                          <SelectItem value="168">{t("admin.secDash.day7")}</SelectItem>
                          <SelectItem value="720">{t("admin.secDash.day30")}</SelectItem>
                          <SelectItem value="0">{t("admin.secDash.permanentBan")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={blockIPMutation.isPending}>
                      {blockIPMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Ban className="w-4 h-4 mr-2" />
                      )}
                      {t("admin.secDash.blockIP")}
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
                  {t("admin.secDash.licenseDetails")}
                </CardTitle>
                <CardDescription>{t("admin.secDash.licenseDetailsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">{t("admin.secDash.basicInfo")}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{t("admin.secDash.licenseStatusLabel")}</span>
                        <Badge className={dashboard?.license.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {dashboard?.license.valid ? t("admin.secDash.valid") : t("admin.secDash.invalid")}
                        </Badge>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{t("admin.secDash.licenseType")}</span>
                        <span className="font-medium">{dashboard?.license.type || '-'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{t("admin.secDash.expiryTime")}</span>
                        <span className="font-medium">
                          {dashboard?.license.expiresAt
                            ? new Date(dashboard.license.expiresAt).toLocaleDateString()
                            : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{t("admin.secDash.daysRemaining")}</span>
                        <span className={`font-medium ${(dashboard?.license.daysRemaining || 0) < 30 ? 'text-orange-400' : 'text-green-400'}`}>
                          {dashboard?.license.daysRemaining || 0} {t("admin.secDash.days")}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">{t("admin.secDash.moduleAuth")}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'CRM', labelKey: 'CRM' },
                        { key: 'projectMgmt', labelKey: 'admin.secDash.projectMgmt' },
                        { key: 'costMgmt', labelKey: 'admin.secDash.costMgmt' },
                        { key: 'trainingMgmt', labelKey: 'admin.secDash.trainingMgmt' },
                        { key: 'aiAssistant', labelKey: 'admin.secDash.aiAssistant' },
                        { key: 'reportAnalytics', labelKey: 'admin.secDash.reportAnalytics' },
                      ].map((module) => (
                        <div key={module.key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm">{module.labelKey === 'CRM' ? 'CRM' : t(module.labelKey)}</span>
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
  const { t } = useLanguage();
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
      toast.success(t("admin.secDash.alertAddSuccess"));
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
      toast.error(`${t("admin.secDash.addFailed")}: ${error.message}`);
    },
  });

  const toggleMutation = trpc.security.toggleAlertConfig.useMutation({
    onSuccess: () => {
      toast.success(t("admin.secDash.statusUpdated"));
      refetchConfigs();
    },
  });

  const deleteMutation = trpc.security.deleteAlertConfig.useMutation({
    onSuccess: () => {
      toast.success(t("admin.secDash.configDeleted"));
      refetchConfigs();
    },
  });

  const testMutation = trpc.security.testAlertConfig.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t("admin.secDash.testSuccess"));
      } else {
        toast.error(`${t("admin.secDash.testFailed")}: ${result.error}`);
      }
    },
  });

  const alertTypeOptions: { value: SecurityAlertTypeValue; labelKey: string }[] = [
    { value: 'intrusion_attempt', labelKey: 'admin.secDash.intrusionAttempt' },
    { value: 'rate_limit_exceeded', labelKey: 'admin.secDash.rateLimitExceeded' },
    { value: 'ip_blocked', labelKey: 'admin.secDash.ipBlockedAlert' },
    { value: 'sql_injection', labelKey: 'admin.secDash.sqlInjection' },
    { value: 'xss_attack', labelKey: 'admin.secDash.xssAttack' },
    { value: 'command_injection', labelKey: 'admin.secDash.commandInjection' },
    { value: 'unauthorized_access', labelKey: 'admin.secDash.unauthorizedAccess' },
    { value: 'suspicious_activity', labelKey: 'admin.secDash.suspiciousActivity' },
    { value: 'license_violation', labelKey: 'admin.secDash.licenseViolation' },
    { value: 'data_exfiltration', labelKey: 'admin.secDash.dataExfiltration' },
  ];

  const webhookTypeLabelKeys: Record<string, string> = {
    wecom: 'admin.secDash.wecom',
    dingtalk: 'admin.secDash.dingtalk',
    feishu: 'admin.secDash.feishu',
    custom: 'admin.secDash.custom',
  };

  const severityLabelKeys: Record<string, string> = {
    info: 'admin.secDash.info',
    warning: 'admin.secDash.warning',
    critical: 'admin.secDash.critical',
    emergency: 'admin.secDash.emergency',
  };

  return (
    <div className="space-y-6">
      {/* 告警统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.secDash.alertConfig")}</p>
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
                <p className="text-sm text-muted-foreground">{t("admin.secDash.alertEnabled")}</p>
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
                <p className="text-sm text-muted-foreground">{t("admin.secDash.alerts24h")}</p>
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
                <p className="text-sm text-muted-foreground">{t("admin.secDash.successRate")}</p>
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
                {t("admin.secDash.alertConfigTitle")}
              </CardTitle>
              <CardDescription>{t("admin.secDash.alertConfigDesc")}</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("admin.secDash.addConfig")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("admin.secDash.addAlertConfig")}</DialogTitle>
                  <DialogDescription>{t("admin.secDash.alertConfigDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("admin.secDash.configName")}</Label>
                      <Input
                        value={newConfig.name}
                        onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                        placeholder={t("admin.secDash.configNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.secDash.webhookType")}</Label>
                      <Select
                        value={newConfig.webhookType}
                        onValueChange={(v) => setNewConfig({ ...newConfig, webhookType: v as typeof newConfig.webhookType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wecom">{t("admin.secDash.wecom")}</SelectItem>
                          <SelectItem value="dingtalk">{t("admin.secDash.dingtalk")}</SelectItem>
                          <SelectItem value="feishu">{t("admin.secDash.feishu")}</SelectItem>
                          <SelectItem value="custom">{t("admin.secDash.custom")}</SelectItem>
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
                      <Label>{t("admin.secDash.minSeverity")}</Label>
                      <Select
                        value={newConfig.minSeverity}
                        onValueChange={(v) => setNewConfig({ ...newConfig, minSeverity: v as typeof newConfig.minSeverity })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">{t("admin.secDash.info")}</SelectItem>
                          <SelectItem value="warning">{t("admin.secDash.warning")}</SelectItem>
                          <SelectItem value="critical">{t("admin.secDash.critical")}</SelectItem>
                          <SelectItem value="emergency">{t("admin.secDash.emergency")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.secDash.cooldown")}</Label>
                      <Input
                        type="number"
                        value={newConfig.cooldownMinutes}
                        onChange={(e) => setNewConfig({ ...newConfig, cooldownMinutes: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.secDash.alertTypes")}</Label>
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
                          {t(opt.labelKey)}
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
                    <Label>{t("admin.secDash.mentionAll")}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t("admin.secDash.cancel")}</Button>
                  <Button
                    onClick={() => addConfigMutation.mutate(newConfig)}
                    disabled={!newConfig.name || !newConfig.webhookUrl || newConfig.alertTypes.length === 0}
                  >
                    {t("admin.secDash.add")}
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
                  <TableHead>{t("admin.secDash.configName")}</TableHead>
                  <TableHead>{t("admin.secDash.type")}</TableHead>
                  <TableHead>{t("admin.secDash.alertLevel")}</TableHead>
                  <TableHead>{t("admin.secDash.status")}</TableHead>
                  <TableHead>{t("admin.secDash.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(webhookTypeLabelKeys[config.webhookType])}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">&ge; {t(severityLabelKeys[config.minSeverity])}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.enabled ? 'default' : 'secondary'}>
                        {config.enabled ? t("admin.secDash.enabled") : t("admin.secDash.disabled")}
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
              <p>{t("admin.secDash.noAlertConfig")}</p>
              <p className="text-sm">{t("admin.secDash.noAlertConfigHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 告警发送历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {t("admin.secDash.alertHistory")}
          </CardTitle>
          <CardDescription>{t("admin.secDash.alertHistoryDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {alertHistory && alertHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.secDash.alertTimeCol")}</TableHead>
                  <TableHead>{t("admin.secDash.alertIdCol")}</TableHead>
                  <TableHead>{t("admin.secDash.configIdCol")}</TableHead>
                  <TableHead>{t("admin.secDash.statusCol")}</TableHead>
                  <TableHead>{t("admin.secDash.errorMsgCol")}</TableHead>
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
                        {record.success ? t("admin.secDash.successResult") : t("admin.secDash.failedResult")}
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
              <p>{t("admin.secDash.noAlertHistory")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== 安装模式Tab组件 =====

function InstallationModeTab() {
  const { t } = useLanguage();
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
      toast.success(t("admin.secDash.passwordSetSuccess"));
      setShowPasswordDialog(false);
      setNewPassword('');
    },
    onError: (err) => toast.error(err.message),
  });

  const setSecurityLevelMutation = trpc.security.setSecurityLevel.useMutation({
    onSuccess: () => {
      toast.success(t("admin.secDash.secLevelUpdated"));
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

  const securityLevelLabelKeys: Record<string, string> = {
    standard: 'admin.secDash.standardMode',
    elevated: 'admin.secDash.elevatedMode',
    lockdown: 'admin.secDash.lockdownMode',
  };

  return (
    <div className="space-y-6">
      {/* Current mode + Password status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="w-4 h-4" />
              {t("admin.secDash.currentInstallMode")}
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
              {t("admin.secDash.passwordProtection")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {passwordStatus?.configured ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t("admin.secDash.passwordConfigured")}</Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{t("admin.secDash.passwordNotConfigured")}</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowPasswordDialog(true)}
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              {passwordStatus?.configured ? t("admin.secDash.updatePasswordBtn") : t("admin.secDash.setPasswordBtn")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t("admin.secDash.activeSecurityLevel")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={securityLevelColors[security?.level || 'standard']}>
                {t(securityLevelLabelKeys[security?.level || 'standard'])}
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
                  {t(securityLevelLabelKeys[lvl])}
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
              {t("admin.secDash.versionCompare")}
            </CardTitle>
            <CardDescription>{t("admin.secDash.versionCompareDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t("admin.secDash.featureCol")}</TableHead>
                  {(['community', 'customer', 'enterprise'] as const).map((m) => (
                    <TableHead key={m} className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={m === currentMode ? 'font-bold text-primary' : ''}>
                          {modes[m]?.name}
                        </span>
                        {m === currentMode && <Badge variant="default" className="text-[10px] h-4">{t("admin.secDash.currentBadge")}</Badge>}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{t("admin.secDash.maxUsersRow")}</TableCell>
                  <TableCell className="text-center">{modes.community?.maxUsers}</TableCell>
                  <TableCell className="text-center">{modes.customer?.maxUsers}</TableCell>
                  <TableCell className="text-center">{t("admin.secDash.unlimited")}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t("admin.secDash.needsLicenseRow")}</TableCell>
                  <TableCell className="text-center"><XCircle className="w-4 h-4 mx-auto text-muted-foreground" /></TableCell>
                  <TableCell className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-green-400" /></TableCell>
                  <TableCell className="text-center"><CheckCircle2 className="w-4 h-4 mx-auto text-green-400" /></TableCell>
                </TableRow>
                {Object.entries(featureLabels).map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{label.name}</TableCell>
                    {(['community', 'customer', 'enterprise'] as const).map((m) => {
                      const features = modes[m]?.features as any;
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
              {t("admin.secDash.currentSecPolicy")} ({t(securityLevelLabelKeys[security.level])})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: t("admin.secDash.blockNonAdminLogin"), value: security.policies.blockNonAdminLogin ? t("admin.secDash.blockAction") : t("admin.secDash.allowAction"), danger: security.policies.blockNonAdminLogin },
                { label: t("admin.secDash.mfaAll"), value: security.policies.requireMFAAll ? t("admin.secDash.required") : t("admin.secDash.optional"), danger: false },
                { label: t("admin.secDash.strictRateLimits"), value: security.policies.strictRateLimits ? t("admin.secDash.on") : t("admin.secDash.off"), danger: false },
                { label: t("admin.secDash.dataExportPolicy"), value: security.policies.disableExport ? t("admin.secDash.disabledAction") : t("admin.secDash.allowAction"), danger: security.policies.disableExport },
                { label: t("admin.secDash.apiAccess"), value: security.policies.disableAPI ? t("admin.secDash.disabledAction") : t("admin.secDash.allowAction"), danger: security.policies.disableAPI },
                { label: t("admin.secDash.forceReauth"), value: security.policies.forceReauthMinutes ? `${security.policies.forceReauthMinutes}${t("admin.secDash.minutes")}` : t("admin.secDash.off"), danger: false },
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
            <DialogTitle>{t("admin.secDash.setServerPassword")}</DialogTitle>
            <DialogDescription>{t("admin.secDash.setServerPasswordDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin.secDash.newPasswordLabel")}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("admin.secDash.newPasswordPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>{t("admin.secDash.cancel")}</Button>
            <Button
              disabled={newPassword.length < 8 || setPasswordMutation.isPending}
              onClick={() => setPasswordMutation.mutate({ password: newPassword })}
            >
              {setPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
              {t("admin.secDash.confirmSet")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Level Dialog */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.secDash.changeSecLevelTo")} {t(securityLevelLabelKeys[targetLevel])}</DialogTitle>
            <DialogDescription>
              {targetLevel === 'lockdown' && t("admin.secDash.lockdownWarning")}
              {targetLevel === 'elevated' && t("admin.secDash.elevatedWarning")}
              {targetLevel === 'standard' && t("admin.secDash.standardInfo")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin.secDash.changeReason")}</Label>
              <Input
                value={securityReason}
                onChange={(e) => setSecurityReason(e.target.value)}
                placeholder={t("admin.secDash.changeReasonPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSecurityDialog(false)}>{t("admin.secDash.cancel")}</Button>
            <Button
              variant={targetLevel === 'lockdown' ? 'destructive' : 'default'}
              disabled={!securityReason.trim() || setSecurityLevelMutation.isPending}
              onClick={() => setSecurityLevelMutation.mutate({ level: targetLevel, reason: securityReason })}
            >
              {setSecurityLevelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
              {t("admin.secDash.confirmChange")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== 管理员重要事项Tab组件 =====

function AdminNotesTab() {
  const { t } = useLanguage();
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
    onSuccess: () => { toast.success(t("admin.secDash.dismissed")); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const addNoteMutation = trpc.security.addNote.useMutation({
    onSuccess: () => {
      toast.success(t("admin.secDash.noteAdded"));
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

  const categoryLabelKeys: Record<string, string> = {
    security: 'admin.secDash.categorySecurity',
    license: 'admin.secDash.categoryLicense',
    system: 'admin.secDash.categorySystem',
    update: 'admin.secDash.categoryUpdate',
    action_required: 'admin.secDash.categoryActionRequired',
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
            <p className="text-xs text-muted-foreground">{t("admin.secDash.urgentNotes")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {notes?.filter((n) => n.severity === 'warning').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.secDash.warningNotes")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{allNotes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">{t("admin.secDash.allNotesIncDismissed")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t("admin.secDash.adminNotesTitle")}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              {t("admin.secDash.addNoteBtn")}
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
                <div className="mt-0.5">{categoryIcons[note.category] || <AlertCircle className="w-4 h-4" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={severityColors[note.severity]} variant="outline">
                      {t(categoryLabelKeys[note.category])}
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
                        <a href={note.actionUrl}>{note.actionLabel || t("admin.secDash.viewAction")}</a>
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
              <p>{t("admin.secDash.noPendingNotes")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Note Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.secDash.addAdminNote")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("admin.secDash.categoryLabel")}</Label>
                <Select value={newNote.category} onValueChange={(v) => setNewNote((p) => ({ ...p, category: v as typeof p.category }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security">{t("admin.secDash.categorySecurity")}</SelectItem>
                    <SelectItem value="license">{t("admin.secDash.categoryLicense")}</SelectItem>
                    <SelectItem value="system">{t("admin.secDash.categorySystem")}</SelectItem>
                    <SelectItem value="update">{t("admin.secDash.categoryUpdate")}</SelectItem>
                    <SelectItem value="action_required">{t("admin.secDash.categoryActionRequired")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.secDash.noteSeverity")}</Label>
                <Select value={newNote.severity} onValueChange={(v) => setNewNote((p) => ({ ...p, severity: v as typeof p.severity }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">{t("admin.secDash.info")}</SelectItem>
                    <SelectItem value="warning">{t("admin.secDash.warning")}</SelectItem>
                    <SelectItem value="critical">{t("admin.secDash.emergency")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("admin.secDash.noteTitleLabel")}</Label>
              <Input value={newNote.title} onChange={(e) => setNewNote((p) => ({ ...p, title: e.target.value }))} placeholder={t("admin.secDash.noteTitlePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.secDash.noteDescLabel")}</Label>
              <Input value={newNote.description} onChange={(e) => setNewNote((p) => ({ ...p, description: e.target.value }))} placeholder={t("admin.secDash.noteDescPlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t("admin.secDash.cancel")}</Button>
            <Button
              disabled={!newNote.title.trim() || addNoteMutation.isPending}
              onClick={() => addNoteMutation.mutate(newNote)}
            >
              {addNoteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {t("admin.secDash.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
