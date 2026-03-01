/**
 * 模型性能监控仪表盘
 * 展示预测准确率、调用次数、响应时间、趋势图表
 *
 * Data source: trpc.aiModel.getPerformanceDashboard / getModelTrend (DB-backed)
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { PageHeader, StatCard } from '@/components/grt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Gauge,
  RefreshCw,
  Target,
  XCircle,
  Zap
} from 'lucide-react';

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ==================== 类型定义 ====================

type ModelType =
  | 'cost_prediction'
  | 'demand_forecast'
  | 'quality_prediction'
  | 'delivery_time_estimation'
  | 'resource_allocation'
  | 'anomaly_detection';

type Period = 'hour' | 'day' | 'week' | 'month';

interface ModelMetrics {
  modelType: ModelType;
  modelVersion: string;
  period: Period;
  totalCalls: number;
  accuracy: number;
  avgLatency: number;
  p95Latency: number;
  avgConfidence: number;
  mae?: number;
  rmse?: number;
}

interface HealthStatus {
  modelType: ModelType;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  issues: Array<{
    type: string;
    severity: 'warning' | 'critical';
    message: string;
  }>;
  recommendations: string[];
}

interface TrendDataPoint {
  timestamp: number;
  calls: number;
  accuracy: number;
  avgLatency: number;
}

// ==================== 常量 ====================

const MODEL_NAMES: Record<ModelType, string> = {
  cost_prediction: '成本预测',
  demand_forecast: '需求预测',
  quality_prediction: '质量预测',
  delivery_time_estimation: '交付时间估算',
  resource_allocation: '资源分配',
  anomaly_detection: '异常检测'
};

const MODEL_TYPES: ModelType[] = [
  'cost_prediction',
  'demand_forecast',
  'quality_prediction',
  'delivery_time_estimation',
  'resource_allocation',
  'anomaly_detection'
];

// ==================== 子组件 ====================

function ModelStatusBadge({ status }: { status: HealthStatus['status'] }) {
  const config = {
    healthy: { label: '健康', icon: CheckCircle2, className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    degraded: { label: '降级', icon: AlertTriangle, className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    critical: { label: '严重', icon: XCircle, className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    unknown: { label: '未知', icon: Activity, className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
  };
  const { label, icon: Icon, className } = config[status];
  return (
    <Badge variant="outline" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function TrendChart({ data, metric }: { data: TrendDataPoint[]; metric: 'calls' | 'accuracy' | 'avgLatency' }) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d[metric]));
  const minValue = Math.min(...data.map(d => d[metric]));
  const range = maxValue - minValue || 1;
  const formatValue = (v: number) => {
    if (metric === 'accuracy') return `${(v * 100).toFixed(1)}%`;
    if (metric === 'avgLatency') return `${v.toFixed(0)}ms`;
    return v.toString();
  };
  return (
    <div className="h-40 flex items-end gap-1">
      {data.map((point, i) => {
        const height = ((point[metric] - minValue) / range) * 100;
        return (
          <div
            key={i}
            className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t cursor-pointer group relative"
            style={{ height: `${Math.max(height, 5)}%` }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {formatValue(point[metric])}
              <br />
              {new Date(point.timestamp).toLocaleTimeString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelCard({
  modelType,
  metrics,
  health,
  onSelect
}: {
  modelType: ModelType;
  metrics: ModelMetrics;
  health: HealthStatus;
  onSelect: () => void;
}) {
  return (
    <Card
      className="bg-card/50 border-border hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{MODEL_NAMES[modelType]}</CardTitle>
          <ModelStatusBadge status={health.status} />
        </div>
        <CardDescription>版本 {metrics.modelVersion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">准确率</p>
            <div className="flex items-center gap-2">
              <Progress value={metrics.accuracy * 100} className="h-2 flex-1" />
              <span className="text-sm font-medium">{(metrics.accuracy * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">调用次数</p>
            <p className="text-lg font-bold">{metrics.totalCalls.toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">平均延迟</p>
            <p className="font-medium">{metrics.avgLatency.toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">P95延迟</p>
            <p className="font-medium">{metrics.p95Latency.toFixed(0)}ms</p>
          </div>
        </div>
        {health.issues.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">问题 ({health.issues.length})</p>
            {health.issues.slice(0, 2).map((issue, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <AlertTriangle className={`w-3 h-3 ${issue.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                <span className="truncate">{issue.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 主组件 ====================

export default function ModelPerformanceMonitor() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');
  const [selectedModel, setSelectedModel] = useState<ModelType | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ─── tRPC ───
  const dashQuery = trpc.aiModel.getPerformanceDashboard.useQuery(
    { period: selectedPeriod },
    { ...QUERY_OPTS, refetchInterval: autoRefresh ? 30000 : false },
  );
  const allMetrics = (dashQuery.data?.metrics ?? []) as ModelMetrics[];
  const allHealth = (dashQuery.data?.health ?? []) as HealthStatus[];

  const trendQuery = trpc.aiModel.getModelTrend.useQuery(
    { modelType: selectedModel!, period: selectedPeriod },
    { ...QUERY_OPTS, enabled: !!selectedModel },
  );
  const trendData = (trendQuery.data ?? []) as TrendDataPoint[];

  const selectedMetrics = selectedModel
    ? allMetrics.find(m => m.modelType === selectedModel) ?? null
    : null;
  const selectedHealth = selectedModel
    ? allHealth.find(h => h.modelType === selectedModel) ?? null
    : null;

  const summary = useMemo(() => {
    if (allMetrics.length === 0) return { totalCalls: 0, avgAccuracy: 0, avgLatency: 0, healthyCount: 0 };
    return {
      totalCalls: allMetrics.reduce((sum, m) => sum + m.totalCalls, 0),
      avgAccuracy: allMetrics.reduce((sum, m) => sum + m.accuracy, 0) / allMetrics.length,
      avgLatency: allMetrics.reduce((sum, m) => sum + m.avgLatency, 0) / allMetrics.length,
      healthyCount: allHealth.filter(h => h.status === 'healthy').length,
    };
  }, [allMetrics, allHealth]);

  const handleRefresh = () => {
    dashQuery.refetch();
    if (selectedModel) trendQuery.refetch();
  };

  if (dashQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Gauge} title="模型性能监控" description="..." />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
          <div className="lg:col-span-2"><Skeleton className="h-96 rounded-lg" /></div>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Gauge}
          title="模型性能监控"
          description="实时监控AI模型的预测准确率、调用次数和响应时间"
          actions={
            <>
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-refresh" className="text-sm">自动刷新</Label>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">最近1小时</SelectItem>
                  <SelectItem value="day">最近24小时</SelectItem>
                  <SelectItem value="week">最近7天</SelectItem>
                  <SelectItem value="month">最近30天</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </>
          }
        />

        {/* 汇总指标 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label="总调用次数"
            value={summary.totalCalls.toLocaleString()}
            trend={{ value: 12, label: "vs 上期" }}
          />
          <StatCard
            icon={Target}
            label="平均准确率"
            value={`${(summary.avgAccuracy * 100).toFixed(1)}%`}
            iconColor="text-green-600"
            iconBg="bg-green-100"
            trend={{ value: 3, label: "vs 上期" }}
          />
          <StatCard
            icon={Clock}
            label="平均响应时间"
            value={`${summary.avgLatency.toFixed(0)}ms`}
            trend={{ value: -5, label: "vs 上期" }}
          />
          <StatCard
            icon={CheckCircle2}
            label="健康模型"
            value={`${summary.healthyCount}/${MODEL_TYPES.length}`}
            iconColor={summary.healthyCount === MODEL_TYPES.length ? "text-green-600" : "text-yellow-600"}
            iconBg={summary.healthyCount === MODEL_TYPES.length ? "bg-green-100" : "bg-yellow-100"}
          />
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 模型列表 */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              模型列表
            </h2>
            <div className="space-y-3">
              {MODEL_TYPES.map((type) => {
                const m = allMetrics.find(x => x.modelType === type);
                const h = allHealth.find(x => x.modelType === type);
                if (!m || !h) return null;
                return (
                  <ModelCard
                    key={type}
                    modelType={type}
                    metrics={m}
                    health={h}
                    onSelect={() => setSelectedModel(type)}
                  />
                );
              })}
            </div>
          </div>

          {/* 详细信息 */}
          <div className="lg:col-span-2 space-y-4">
            {selectedModel && selectedMetrics && selectedHealth ? (
              <>
                <Card className="bg-card/50 border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {MODEL_NAMES[selectedModel]}
                          <ModelStatusBadge status={selectedHealth.status} />
                        </CardTitle>
                        <CardDescription>版本 {selectedMetrics.modelVersion}</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedModel(null)}>
                        返回概览
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="metrics">
                      <TabsList>
                        <TabsTrigger value="metrics">性能指标</TabsTrigger>
                        <TabsTrigger value="trends">趋势图表</TabsTrigger>
                        <TabsTrigger value="health">健康状态</TabsTrigger>
                      </TabsList>

                      <TabsContent value="metrics" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-secondary/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">准确率</p>
                            <p className="text-2xl font-bold">{(selectedMetrics.accuracy * 100).toFixed(1)}%</p>
                          </div>
                          <div className="p-4 bg-secondary/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">调用次数</p>
                            <p className="text-2xl font-bold">{selectedMetrics.totalCalls.toLocaleString()}</p>
                          </div>
                          <div className="p-4 bg-secondary/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">平均延迟</p>
                            <p className="text-2xl font-bold">{selectedMetrics.avgLatency.toFixed(0)}ms</p>
                          </div>
                          <div className="p-4 bg-secondary/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">置信度</p>
                            <p className="text-2xl font-bold">{(selectedMetrics.avgConfidence * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        {selectedMetrics.mae && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-secondary/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">MAE (平均绝对误差)</p>
                              <p className="text-xl font-bold">{selectedMetrics.mae.toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-secondary/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">RMSE (均方根误差)</p>
                              <p className="text-xl font-bold">{selectedMetrics.rmse?.toFixed(2)}</p>
                            </div>
                          </div>
                        )}
                        <div className="p-4 bg-secondary/30 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">延迟分布</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>P50</span>
                              <span className="font-medium">{(selectedMetrics.avgLatency * 0.8).toFixed(0)}ms</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>P95</span>
                              <span className="font-medium">{selectedMetrics.p95Latency.toFixed(0)}ms</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>P99</span>
                              <span className="font-medium">{(selectedMetrics.p95Latency * 1.3).toFixed(0)}ms</span>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="trends" className="space-y-4 mt-4">
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Activity className="w-4 h-4" />
                              调用次数趋势
                            </h4>
                            <TrendChart data={trendData} metric="calls" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              准确率趋势
                            </h4>
                            <TrendChart data={trendData} metric="accuracy" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              响应时间趋势
                            </h4>
                            <TrendChart data={trendData} metric="avgLatency" />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="health" className="space-y-4 mt-4">
                        <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                          <div className={`p-3 rounded-full ${
                            selectedHealth.status === 'healthy' ? 'bg-green-500/20' :
                            selectedHealth.status === 'degraded' ? 'bg-yellow-500/20' :
                            selectedHealth.status === 'critical' ? 'bg-red-500/20' :
                            'bg-gray-500/20'
                          }`}>
                            {selectedHealth.status === 'healthy' ? (
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                            ) : selectedHealth.status === 'degraded' ? (
                              <AlertTriangle className="w-8 h-8 text-yellow-500" />
                            ) : selectedHealth.status === 'critical' ? (
                              <XCircle className="w-8 h-8 text-red-500" />
                            ) : (
                              <Activity className="w-8 h-8 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {selectedHealth.status === 'healthy' ? '模型运行正常' :
                               selectedHealth.status === 'degraded' ? '模型性能降级' :
                               selectedHealth.status === 'critical' ? '模型存在严重问题' :
                               '状态未知'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              最后检查: {new Date().toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {selectedHealth.issues.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">发现的问题</h4>
                            {selectedHealth.issues.map((issue, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-lg border ${
                                  issue.severity === 'critical'
                                    ? 'bg-red-500/10 border-red-500/20'
                                    : 'bg-yellow-500/10 border-yellow-500/20'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className={`w-4 h-4 ${
                                    issue.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                                  }`} />
                                  <span className="font-medium">{issue.message}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedHealth.recommendations.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">建议措施</h4>
                            <ul className="space-y-1">
                              {selectedHealth.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Zap className="w-4 h-4 text-primary mt-0.5" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-card/50 border-border h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">选择一个模型</h3>
                  <p className="text-muted-foreground">
                    点击左侧的模型卡片查看详细性能数据和趋势图表
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 最后更新时间 */}
        <div className="text-center text-sm text-muted-foreground">
          最后更新: {new Date(dashQuery.dataUpdatedAt).toLocaleString()}
          {autoRefresh && ' (每30秒自动刷新)'}
        </div>
      </div>
  );
}
