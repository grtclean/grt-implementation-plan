import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Activity, Database, HardDrive, Zap } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * 监控仪表板 - 实时监控、历史趋势、告警统计、优化建议
 * 
 * 功能:
 * - 实时监控面板：显示CPU、内存、磁盘、应用、数据库状态
 * - 历史趋势图表：支持7天/30天/90天/1年时间范围
 * - 告警统计分析：显示告警次数、成功率、虚假告警率
 * - 优化建议展示：基于数据自动生成告警规则优化建议
 */

interface MetricData {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

interface AlertStat {
  date: string;
  count: number;
  success: number;
  failure: number;
}

interface OptimizationSuggestion {
  id: string;
  type: 'threshold_adjustment' | 'new_rule' | 'rule_removal';
  metric: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  confidence: number;
  priority: number;
  status: 'pending' | 'applied' | 'rejected';
}

export default function MonitoringDashboard() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [metricsData, setMetricsData] = useState<MetricData[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStat[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    cpu: 45,
    memory: 62,
    disk: 58,
    appStatus: 'running',
    dbConnections: 45,
    networkTraffic: 250,
  });

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeMetrics(prev => ({
        cpu: Math.max(20, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(90, prev.memory + (Math.random() - 0.5) * 8)),
        disk: Math.max(40, Math.min(95, prev.disk + (Math.random() - 0.5) * 5)),
        appStatus: Math.random() > 0.95 ? 'error' : 'running',
        dbConnections: Math.max(20, Math.min(100, prev.dbConnections + Math.floor((Math.random() - 0.5) * 20))),
        networkTraffic: Math.max(100, Math.min(500, prev.networkTraffic + (Math.random() - 0.5) * 100)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 模拟历史数据
  useEffect(() => {
    const generateHistoricalData = () => {
      const data: MetricData[] = [];
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      
      for (let i = 0; i < days; i++) {
        data.push({
          timestamp: Date.now() - (days - i) * 24 * 60 * 60 * 1000,
          cpu: 40 + Math.random() * 40,
          memory: 50 + Math.random() * 35,
          disk: 50 + Math.random() * 30,
          network: 200 + Math.random() * 200,
        });
      }
      return data;
    };

    setMetricsData(generateHistoricalData());

    // 生成告警统计数据
    const stats: AlertStat[] = [];
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    
    for (let i = 0; i < days; i++) {
      const count = Math.floor(Math.random() * 50) + 10;
      stats.push({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        count,
        success: Math.floor(count * 0.92),
        failure: Math.floor(count * 0.08),
      });
    }
    setAlertStats(stats);

    // 生成优化建议
    setSuggestions([
      {
        id: '1',
        type: 'threshold_adjustment',
        metric: 'CPU',
        currentValue: '80%',
        suggestedValue: '85%',
        reason: t("admin.monitoring.suggestion1Reason"),
        confidence: 94.5,
        priority: 1,
        status: 'pending',
      },
      {
        id: '2',
        type: 'threshold_adjustment',
        metric: t("admin.monitoring.memory"),
        currentValue: '85%',
        suggestedValue: '90%',
        reason: t("admin.monitoring.suggestion2Reason"),
        confidence: 87.2,
        priority: 2,
        status: 'pending',
      },
      {
        id: '3',
        type: 'new_rule',
        metric: t("admin.monitoring.disk"),
        currentValue: t("admin.monitoring.none"),
        suggestedValue: t("admin.monitoring.createDiskRule"),
        reason: t("admin.monitoring.suggestion3Reason"),
        confidence: 76.8,
        priority: 3,
        status: 'pending',
      },
    ]);
  }, [timeRange]);

  const getMetricColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getMetricStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'normal';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title={t("admin.monitoring.title")}
        description={t("admin.monitoring.description")}
      />

      {/* 实时监控面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CPU */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {t("admin.monitoring.cpuUsage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getMetricColor(realtimeMetrics.cpu, { warning: 80, critical: 95 })}`}>
              {realtimeMetrics.cpu.toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  getMetricStatus(realtimeMetrics.cpu, { warning: 80, critical: 95 }) === 'critical'
                    ? 'bg-red-500'
                    : getMetricStatus(realtimeMetrics.cpu, { warning: 80, critical: 95 }) === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${realtimeMetrics.cpu}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("admin.monitoring.threshold")}: 80% / 95%</p>
          </CardContent>
        </Card>

        {/* 内存 */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {t("admin.monitoring.memoryUsage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getMetricColor(realtimeMetrics.memory, { warning: 85, critical: 95 })}`}>
              {realtimeMetrics.memory.toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  getMetricStatus(realtimeMetrics.memory, { warning: 85, critical: 95 }) === 'critical'
                    ? 'bg-red-500'
                    : getMetricStatus(realtimeMetrics.memory, { warning: 85, critical: 95 }) === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${realtimeMetrics.memory}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("admin.monitoring.threshold")}: 85% / 95%</p>
          </CardContent>
        </Card>

        {/* 磁盘 */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              {t("admin.monitoring.diskUsage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getMetricColor(realtimeMetrics.disk, { warning: 80, critical: 95 })}`}>
              {realtimeMetrics.disk.toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  getMetricStatus(realtimeMetrics.disk, { warning: 80, critical: 95 }) === 'critical'
                    ? 'bg-red-500'
                    : getMetricStatus(realtimeMetrics.disk, { warning: 80, critical: 95 }) === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${realtimeMetrics.disk}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("admin.monitoring.threshold")}: 80% / 95%</p>
          </CardContent>
        </Card>

        {/* 应用状态 */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("admin.monitoring.appStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${realtimeMetrics.appStatus === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium">{realtimeMetrics.appStatus === 'running' ? t("admin.monitoring.running") : t("admin.monitoring.error")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("admin.monitoring.grtAppProcess")}</p>
          </CardContent>
        </Card>

        {/* 数据库连接 */}
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              {t("admin.monitoring.dbConnections")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{realtimeMetrics.dbConnections}</div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all"
                style={{ width: `${(realtimeMetrics.dbConnections / 100) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("admin.monitoring.max")}: 100</p>
          </CardContent>
        </Card>

        {/* 网络流量 */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("admin.monitoring.networkTraffic")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{realtimeMetrics.networkTraffic.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-2">MB/s</p>
          </CardContent>
        </Card>
      </div>

      {/* 历史趋势和统计 */}
      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="trends">{t("admin.monitoring.historicalTrends")}</TabsTrigger>
            <TabsTrigger value="statistics">{t("admin.monitoring.alertStatistics")}</TabsTrigger>
            <TabsTrigger value="suggestions">{t("admin.monitoring.optimizationSuggestions")}</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              {t("admin.monitoring.7days")}
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              {t("admin.monitoring.30days")}
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              {t("admin.monitoring.90days")}
            </Button>
            <Button
              variant={timeRange === '1y' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('1y')}
            >
              {t("admin.monitoring.1year")}
            </Button>
          </div>
        </div>

        {/* 历史趋势 Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.monitoring.cpuMemoryTrend")}</CardTitle>
              <CardDescription>{t("admin.monitoring.showPast")} {timeRange === '7d' ? t("admin.monitoring.7days") : timeRange === '30d' ? t("admin.monitoring.30days") : timeRange === '90d' ? t("admin.monitoring.90days") : t("admin.monitoring.1year")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" />
                  <Line type="monotone" dataKey="memory" stroke="#a855f7" name={`${t("admin.monitoring.memory")} %`} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.monitoring.diskNetworkTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="disk" stroke="#f97316" name={`${t("admin.monitoring.disk")} %`} />
                  <Line type="monotone" dataKey="network" stroke="#06b6d4" name={`${t("admin.monitoring.network")} MB/s`} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警统计 Tab */}
        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("admin.monitoring.totalAlerts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{alertStats.reduce((sum, s) => sum + s.count, 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("admin.monitoring.successRate")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {(
                    (alertStats.reduce((sum, s) => sum + s.success, 0) /
                      alertStats.reduce((sum, s) => sum + s.count, 0)) *
                    100
                  ).toFixed(1)}
                  %
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("admin.monitoring.falseAlarmRate")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">7.7%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("admin.monitoring.avgResponseTime")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2.5 {t("admin.monitoring.minutes")}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.monitoring.dailyAlertStats")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={alertStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name={t("admin.monitoring.totalAlerts")} />
                  <Bar dataKey="success" fill="#10b981" name={t("admin.monitoring.success")} />
                  <Bar dataKey="failure" fill="#ef4444" name={t("admin.monitoring.failure")} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 优化建议 Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        {t("admin.monitoring.priority")} {suggestion.priority}
                      </span>
                      {suggestion.type === 'threshold_adjustment' && t("admin.monitoring.thresholdAdjustment")}
                      {suggestion.type === 'new_rule' && t("admin.monitoring.newRule")}
                      {suggestion.type === 'rule_removal' && t("admin.monitoring.deleteRule")}
                    </CardTitle>
                    <CardDescription className="mt-2">{suggestion.metric}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">{suggestion.confidence.toFixed(1)}% {t("admin.monitoring.confidence")}</div>
                    <Button
                      size="sm"
                      variant={suggestion.status === 'applied' ? 'outline' : 'default'}
                      disabled={suggestion.status === 'applied'}
                      className="mt-2"
                    >
                      {suggestion.status === 'applied' ? t("admin.monitoring.applied") : t("admin.monitoring.applySuggestion")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.monitoring.currentValue")}</p>
                    <p className="font-mono font-semibold">{suggestion.currentValue}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.monitoring.suggestedValue")}</p>
                    <p className="font-mono font-semibold text-green-600">{suggestion.suggestedValue}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("admin.monitoring.optimizationReason")}</p>
                  <p className="text-sm">{suggestion.reason}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
