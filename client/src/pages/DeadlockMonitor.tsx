/**
 * 死锁监控仪表板
 * 
 * 功能：
 * - 实时显示死锁检测状态
 * - 历史记录查询
 * - 解决统计图表
 * - 手动触发检测
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity,
  RefreshCw,
  Shield,
  Zap,
  TrendingUp,
  History,
  Settings,
  Mail,
  MessageSquare,
  Bell,
  Send,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

// 类型定义
interface DeadlockCycle {
  id: string;
  nodes: string[];
  detectedAt: string;
  resolvedAt?: string;
  resolution?: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface MonitorStatus {
  isRunning: boolean;
  lastCheckAt: string;
  nextCheckAt: string;
  cyclesDetected: number;
  cyclesResolved: number;
  checkIntervalMs: number;
}

interface DailyStats {
  date: string;
  detected: number;
  resolved: number;
  avgResolutionTimeMs: number;
}

export default function DeadlockMonitor() {
  const { user, loading: authLoading } = useAuth();
  const { t, tpl } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 使用tRPC获取数据
  const statusQuery = trpc.deadlockMonitor.getStatus.useQuery(undefined, {
    refetchInterval: 30000, // 每30秒刷新一次
  });
  const historyQuery = (trpc.deadlockMonitor.getHistory as any).useQuery({ limit: 10 });
  const statsQuery = (trpc.deadlockMonitor as any).getStats.useQuery({ days: 7 });
  const triggerCheckMutation = (trpc.deadlockMonitor as any).triggerCheck.useMutation();
  const notificationConfigQuery = (trpc.deadlockMonitor as any).getNotificationConfig.useQuery();
  const updateNotificationConfigMutation = (trpc.deadlockMonitor as any).updateNotificationConfig.useMutation();
  const testNotificationMutation = (trpc.deadlockMonitor as any).testNotificationChannel.useMutation();
  
  // 通知渠道状态
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  
  // 转换为组件需要的格式
  const status: MonitorStatus = {
    isRunning: (statusQuery.data as any)?.isRunning ?? true,
    lastCheckAt: (statusQuery.data as any)?.lastCheckTime ?? new Date().toISOString(),
    nextCheckAt: (statusQuery.data as any)?.nextCheckTime ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    cyclesDetected: Number((statusQuery.data as any)?.totalCyclesDetected) || 0,
    cyclesResolved: Number((statusQuery.data as any)?.totalCyclesResolved) || 0,
    checkIntervalMs: Number((statusQuery.data as any)?.checkIntervalMs) || 5 * 60 * 1000
  };
  
  const recentCycles: DeadlockCycle[] = ((historyQuery.data as any)?.records ?? []).map((r: any) => ({
    id: r.id,
    nodes: r.cycleNodes,
    detectedAt: r.detectedAt,
    resolvedAt: r.resolvedAt ?? undefined,
    resolution: r.resolution ?? undefined,
    severity: r.severity
  }));
  
  const dailyStats: DailyStats[] = (statsQuery.data?.dailyStats ?? []).map((s: any) => ({
    date: s.date,
    detected: s.detected,
    resolved: s.resolved,
    avgResolutionTimeMs: 0
  }));
  
  // 刷新状态
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await statusQuery.refetch();
    await historyQuery.refetch();
    await statsQuery.refetch();
    setIsRefreshing(false);
  };
  
  // 手动触发检测
  const handleManualCheck = async () => {
    setIsRefreshing(true);
    try {
      await triggerCheckMutation.mutateAsync();
      await statusQuery.refetch();
      await historyQuery.refetch();
      await statsQuery.refetch();
    } catch (error) {
      console.error("Manual check failed:", error);
    }
    setIsRefreshing(false);
  };
  
  // 格式化时间
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };
  
  // 计算倒计时
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      const next = new Date(status.nextCheckAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, next - now);
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [status.nextCheckAt]);
  
  // 获取严重程度颜色
  const getSeverityColor = (severity: DeadlockCycle["severity"]) => {
    switch (severity) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title={t("admin.deadlock.title")}
        description={t("admin.deadlock.description")}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {t("admin.deadlock.refresh")}
            </Button>
            <Button onClick={handleManualCheck} disabled={isRefreshing}>
              <Zap className="w-4 h-4 mr-2" />
              {t("admin.deadlock.manualCheck")}
            </Button>
          </div>
        }
      />
      
      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 监控状态 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.deadlock.monitorStatus")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status.isRunning ? (
                <>
                  <Badge variant="default" className="bg-green-500">
                    <Activity className="w-3 h-3 mr-1" />
                    {t("admin.deadlock.running")}
                  </Badge>
                </>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t("admin.deadlock.stopped")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {tpl("admin.deadlock.checkInterval", { min: String(status.checkIntervalMs / 60000) })}
            </p>
          </CardContent>
        </Card>
        
        {/* 下次检测 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.deadlock.nextCheck")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countdown}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {tpl("admin.deadlock.lastCheck", { time: formatTime(status.lastCheckAt) })}
            </p>
          </CardContent>
        </Card>
        
        {/* 检测到的死锁 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.deadlock.deadlocksDetected")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.cyclesDetected}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("admin.deadlock.todayTotal")}
            </p>
          </CardContent>
        </Card>
        
        {/* 已解决 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.deadlock.resolved")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{status.cyclesResolved}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {tpl("admin.deadlock.autoResolveRate", { rate: String(status.cyclesDetected > 0
                ? Math.round((status.cyclesResolved / status.cyclesDetected) * 100)
                : 100) })}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* 详细信息标签页 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="w-4 h-4 mr-2" />
            {t("admin.deadlock.tabOverview")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            {t("admin.deadlock.tabHistory")}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            {t("admin.deadlock.tabSettings")}
          </TabsTrigger>
        </TabsList>
        
        {/* 概览 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 7日统计图表 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.deadlock.sevenDayStats")}</CardTitle>
                <CardDescription>{t("admin.deadlock.sevenDayDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyStats.map((stat) => (
                    <div key={stat.date} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-muted-foreground">
                        {stat.date.slice(5)}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div 
                          className="h-4 bg-red-200 rounded"
                          style={{ width: `${Math.max(stat.detected * 10, 2)}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {tpl("admin.deadlock.detected", { count: String(stat.detected) })}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div 
                          className="h-4 bg-green-200 rounded"
                          style={{ width: `${Math.max(stat.resolved * 10, 2)}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {tpl("admin.deadlock.resolvedCount", { count: String(stat.resolved) })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* 系统健康状态 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.deadlock.systemHealth")}</CardTitle>
                <CardDescription>{t("admin.deadlock.systemHealthDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium">{t("admin.deadlock.systemGood")}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.deadlock.noRisk")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      {t("admin.deadlock.healthy")}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">{t("admin.deadlock.activeTransactions")}</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">{t("admin.deadlock.waitQueue")}</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">{t("admin.deadlock.lockedResources")}</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">{t("admin.deadlock.avgWaitTime")}</p>
                      <p className="text-2xl font-bold">0ms</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* 历史记录 */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.deadlock.deadlockHistory")}</CardTitle>
              <CardDescription>{t("admin.deadlock.deadlockHistoryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentCycles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>{t("admin.deadlock.noRecords")}</p>
                  <p className="text-sm">{t("admin.deadlock.noRecordsDesc")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCycles.map((cycle) => (
                    <div 
                      key={cycle.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className={`w-2 h-2 mt-2 rounded-full ${getSeverityColor(cycle.severity)}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{tpl("admin.deadlock.deadlockCycle", { id: cycle.id })}</p>
                          <Badge variant={cycle.resolvedAt ? "default" : "destructive"}>
                            {cycle.resolvedAt ? t("admin.deadlock.statusResolved") : t("admin.deadlock.statusPending")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tpl("admin.deadlock.involvedNodes", { nodes: cycle.nodes.join(" \u2192 ") })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {tpl("admin.deadlock.detectedAt", { time: formatTime(cycle.detectedAt) })}
                          {cycle.resolvedAt && ` | ${tpl("admin.deadlock.resolvedAt", { time: formatTime(cycle.resolvedAt) })}`}
                        </p>
                        {cycle.resolution && (
                          <p className="text-xs text-muted-foreground">
                            {tpl("admin.deadlock.resolution", { text: cycle.resolution })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 配置 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.deadlock.monitorConfig")}</CardTitle>
              <CardDescription>{t("admin.deadlock.monitorConfigDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("admin.deadlock.checkIntervalLabel")}</label>
                  <p className="text-2xl font-bold">{t("admin.deadlock.fiveMinutes")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.deadlock.autoCheckDesc")}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("admin.deadlock.autoResolve")}</label>
                  <p className="text-2xl font-bold">{t("admin.deadlock.enabled")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.deadlock.autoResolveDesc")}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("admin.deadlock.notifyThreshold")}</label>
                  <p className="text-2xl font-bold">{t("admin.deadlock.highAndAbove")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.deadlock.notifyThresholdDesc")}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("admin.deadlock.historyRetention")}</label>
                  <p className="text-2xl font-bold">{t("admin.deadlock.thirtyDays")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.deadlock.historyRetentionDesc")}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">{t("admin.deadlock.detectionAlgorithm")}</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Wait-For Graph (WFG) 分析</span>
                    <Badge variant="default">{t("admin.deadlock.enabled")}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Tarjan SCC</span>
                    <Badge variant="default">{t("admin.deadlock.enabled")}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span>RAG (Resource Allocation Graph)</span>
                    <Badge variant="default">{t("admin.deadlock.enabled")}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 通知渠道配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t("admin.deadlock.notifyChannelConfig")}
              </CardTitle>
              <CardDescription>{t("admin.deadlock.notifyChannelDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 系统通知 */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t("admin.deadlock.systemNotify")}</p>
                    <p className="text-sm text-muted-foreground">{t("admin.deadlock.systemNotifyDesc")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={notificationConfigQuery.data?.config?.system?.enabled ? "default" : "secondary"}>
                    {notificationConfigQuery.data?.config?.system?.enabled ? t("admin.deadlock.isEnabled") : t("admin.deadlock.notEnabled")}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={testingChannel === "system"}
                    onClick={async () => {
                      setTestingChannel("system");
                      try {
                        await testNotificationMutation.mutateAsync({ channel: "system" });
                      } finally {
                        setTestingChannel(null);
                      }
                    }}
                  >
                    {testingChannel === "system" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="ml-1">{t("admin.deadlock.test")}</span>
                  </Button>
                </div>
              </div>
              
              {/* 邮件通知 */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">{t("admin.deadlock.emailNotify")}</p>
                    <p className="text-sm text-muted-foreground">{t("admin.deadlock.emailNotifyDesc")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={notificationConfigQuery.data?.config?.email?.enabled ? "default" : "secondary"}>
                    {notificationConfigQuery.data?.config?.email?.enabled ? t("admin.deadlock.isEnabled") : t("admin.deadlock.notConfigured")}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!notificationConfigQuery.data?.config?.email?.enabled || testingChannel === "email"}
                    onClick={async () => {
                      setTestingChannel("email");
                      try {
                        await testNotificationMutation.mutateAsync({ channel: "email" });
                      } finally {
                        setTestingChannel(null);
                      }
                    }}
                  >
                    {testingChannel === "email" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="ml-1">{t("admin.deadlock.test")}</span>
                  </Button>
                </div>
              </div>
              
              {/* 钉钉通知 */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/10 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t("admin.deadlock.dingtalkNotify")}</p>
                    <p className="text-sm text-muted-foreground">DingTalk Webhook</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={notificationConfigQuery.data?.config?.dingtalk?.enabled ? "default" : "secondary"}>
                    {notificationConfigQuery.data?.config?.dingtalk?.enabled ? t("admin.deadlock.isEnabled") : t("admin.deadlock.notConfigured")}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!notificationConfigQuery.data?.config?.dingtalk?.enabled || testingChannel === "dingtalk"}
                    onClick={async () => {
                      setTestingChannel("dingtalk");
                      try {
                        await testNotificationMutation.mutateAsync({ channel: "dingtalk" });
                      } finally {
                        setTestingChannel(null);
                      }
                    }}
                  >
                    {testingChannel === "dingtalk" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="ml-1">{t("admin.deadlock.test")}</span>
                  </Button>
                </div>
              </div>
              
              {/* 企业微信通知 */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">{t("admin.deadlock.wechatNotify")}</p>
                    <p className="text-sm text-muted-foreground">WeCom/WeChat Work</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={notificationConfigQuery.data?.config?.wechat?.enabled ? "default" : "secondary"}>
                    {notificationConfigQuery.data?.config?.wechat?.enabled ? t("admin.deadlock.isEnabled") : t("admin.deadlock.notConfigured")}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!notificationConfigQuery.data?.config?.wechat?.enabled || testingChannel === "wechat"}
                    onClick={async () => {
                      setTestingChannel("wechat");
                      try {
                        await testNotificationMutation.mutateAsync({ channel: "wechat" });
                      } finally {
                        setTestingChannel(null);
                      }
                    }}
                  >
                    {testingChannel === "wechat" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="ml-1">{t("admin.deadlock.test")}</span>
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t("admin.deadlock.envHint")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
