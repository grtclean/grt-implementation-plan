/**
 * 模型性能监控仪表盘
 * 展示预测准确率、调用次数、响应时间、趋势图表
 */

import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Gauge,
  LineChart,
  RefreshCw,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react';

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

// ==================== 模拟数据 ====================

const MODEL_NAMES: Record<ModelType, string> = {
  cost_prediction: '成本预测',
  demand_forecast: '需求预测',
  quality_prediction: '质量预测',
  delivery_time_estimation: '交付时间估算',
  resource_allocation: '资源分配',
  anomaly_detection: '异常检测'
};

function generateMockMetrics(modelType: ModelType, period: Period): ModelMetrics {
  const baseAccuracy = {
    cost_prediction: 0.85,
    demand_forecast: 0.78,
    quality_prediction: 0.92,
    delivery_time_estimation: 0.81,
    resource_allocation: 0.76,
    anomaly_detection: 0.88
  };
  
  const baseCalls = {
    hour: 50,
    day: 500,
    week: 3000,
    month: 12000
  };
  
  return {
    modelType,
    modelVersion: 'v1.2.0',
    period,
    totalCalls: Math.floor(baseCalls[period] * (0.8 + Math.random() * 0.4)),
    accuracy: baseAccuracy[modelType] + (Math.random() - 0.5) * 0.1,
    avgLatency: 200 + Math.random() * 800,
    p95Latency: 500 + Math.random() * 1500,
    avgConfidence: 0.7 + Math.random() * 0.25,
    mae: 100 + Math.random() * 200,
    rmse: 150 + Math.random() * 300
  };
}

function generateMockHealth(modelType: ModelType): HealthStatus {
  const statuses: HealthStatus['status'][] = ['healthy', 'healthy', 'healthy', 'degraded', 'critical'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  const issues: HealthStatus['issues'] = [];
  const recommendations: string[] = [];
  
  if (status === 'degraded') {
    issues.push({
      type: 'accuracy_drop',
      severity: 'warning',
      message: '准确率下降5%'
    });
    recommendations.push('建议检查最近的输入数据分布');
  } else if (status === 'critical') {
    issues.push({
      type: 'latency_spike',
      severity: 'critical',
      message: '响应时间超过阈值200%'
    });
    recommendations.push('建议立即检查服务器负载');
    recommendations.push('考虑增加计算资源');
  }
  
  return { modelType, status, issues, recommendations };
}

function generateMockTrend(modelType: ModelType, period: Period): TrendDataPoint[] {
  const pointCount = period === 'hour' ? 12 : period === 'day' ? 24 : period === 'week' ? 7 : 30;
  const now = Date.now();
  const interval = {
    hour: 5 * 60 * 1000,
    day: 60 * 60 * 1000,
    week: 24 * 60 * 60 * 1000,
    month: 24 * 60 * 60 * 1000
  }[period];
  
  return Array.from({ length: pointCount }, (_, i) => ({
    timestamp: now - (pointCount - i - 1) * interval,
    calls: Math.floor(20 + Math.random() * 80),
    accuracy: 0.75 + Math.random() * 0.2,
    avgLatency: 200 + Math.random() * 600
  }));
}

// ==================== 组件 ====================

function StatusBadge({ status }: { status: HealthStatus['status'] }) {
  const config = {
    healthy: { label: '健康', variant: 'default' as const, icon: CheckCircle2, className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    degraded: { label: '降级', variant: 'secondary' as const, icon: AlertTriangle, className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    critical: { label: '严重', variant: 'destructive' as const, icon: XCircle, className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    unknown: { label: '未知', variant: 'outline' as const, icon: Activity, className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
  };
  
  const { label, icon: Icon, className } = config[status];
  
  return (
    <Badge variant="outline" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function MetricCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  trendLabel,
  color = 'primary'
}: { 
  title: string; 
  value: string | number; 
  unit?: string;
  icon: any;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500'
  };
  
  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className={`w-4 h-4 ${colorClasses[color]}`} />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
              {trend >= 0 ? '+' : ''}{(trend * 100).toFixed(1)}%
            </span>
            {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendChart({ data, metric }: { data: TrendDataPoint[]; metric: 'calls' | 'accuracy' | 'avgLatency' }) {
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
          <StatusBadge status={health.status} />
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
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');
  const [selectedModel, setSelectedModel] = useState<ModelType | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  const modelTypes: ModelType[] = [
    'cost_prediction',
    'demand_forecast',
    'quality_prediction',
    'delivery_time_estimation',
    'resource_allocation',
    'anomaly_detection'
  ];
  
  // 生成模拟数据
  const allMetrics = useMemo(() => 
    modelTypes.map(type => generateMockMetrics(type, selectedPeriod)),
    [selectedPeriod, lastRefresh]
  );
  
  const allHealth = useMemo(() => 
    modelTypes.map(type => generateMockHealth(type)),
    [lastRefresh]
  );
  
  const selectedMetrics = selectedModel 
    ? allMetrics.find(m => m.modelType === selectedModel) 
    : null;
    
  const selectedHealth = selectedModel
    ? allHealth.find(h => h.modelType === selectedModel)
    : null;
    
  const trendData = useMemo(() => 
    selectedModel ? generateMockTrend(selectedModel, selectedPeriod) : [],
    [selectedModel, selectedPeriod, lastRefresh]
  );
  
  // 汇总统计
  const summary = useMemo(() => {
    const totalCalls = allMetrics.reduce((sum, m) => sum + m.totalCalls, 0);
    const avgAccuracy = allMetrics.reduce((sum, m) => sum + m.accuracy, 0) / allMetrics.length;
    const avgLatency = allMetrics.reduce((sum, m) => sum + m.avgLatency, 0) / allMetrics.length;
    const healthyCount = allHealth.filter(h => h.status === 'healthy').length;
    
    return { totalCalls, avgAccuracy, avgLatency, healthyCount };
  }, [allMetrics, allHealth]);
  
  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastRefresh(Date.now());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);
  
  const handleRefresh = () => {
    setLastRefresh(Date.now());
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gauge className="w-6 h-6 text-primary" />
              模型性能监控
            </h1>
            <p className="text-muted-foreground mt-1">
              实时监控AI模型的预测准确率、调用次数和响应时间
            </p>
          </div>
          
          <div className="flex items-center gap-4">
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
          </div>
        </div>
        
        {/* 汇总指标 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="总调用次数"
            value={summary.totalCalls.toLocaleString()}
            icon={Activity}
            trend={0.12}
            trendLabel="vs 上期"
            color="primary"
          />
          <MetricCard
            title="平均准确率"
            value={(summary.avgAccuracy * 100).toFixed(1)}
            unit="%"
            icon={Target}
            trend={0.03}
            trendLabel="vs 上期"
            color="success"
          />
          <MetricCard
            title="平均响应时间"
            value={summary.avgLatency.toFixed(0)}
            unit="ms"
            icon={Clock}
            trend={-0.05}
            trendLabel="vs 上期"
            color="primary"
          />
          <MetricCard
            title="健康模型"
            value={`${summary.healthyCount}/${modelTypes.length}`}
            icon={CheckCircle2}
            color={summary.healthyCount === modelTypes.length ? 'success' : 'warning'}
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
              {modelTypes.map((type, i) => (
                <ModelCard
                  key={type}
                  modelType={type}
                  metrics={allMetrics[i]}
                  health={allHealth[i]}
                  onSelect={() => setSelectedModel(type)}
                />
              ))}
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
                          <StatusBadge status={selectedHealth.status} />
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
          最后更新: {new Date(lastRefresh).toLocaleString()}
          {autoRefresh && ' (每30秒自动刷新)'}
        </div>
      </div>
    </Layout>
  );
}
