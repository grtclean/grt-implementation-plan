/**
 * 模型解释性报告前端可视化页面
 * v2.5.7 - 特征重要性柱状图、模型对比雷达图、预测对比折线图
 */

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Download,
  RefreshCw,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';

// ==================== 类型定义 ====================

interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative';
  contribution: number;
  rank: number;
}

interface ModelMetrics {
  mae: number;
  mse: number;
  rmse: number;
  mape: number;
  r2: number;
}

interface ModelComparison {
  modelId: string;
  modelName: string;
  modelType: string;
  metrics: ModelMetrics;
  rank: number;
  strengths: string[];
  weaknesses: string[];
  suitableFor: string[];
}

interface DataCharacteristics {
  size: number;
  timeSpan: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  seasonality: boolean;
  seasonalPeriod?: number;
  outlierRatio: number;
  variance: number;
  autocorrelation: number;
  nonlinearity: number;
}

interface SelectionReason {
  primaryReason: string;
  supportingReasons: string[];
  dataCharacteristicsMatch: Record<string, boolean>;
  confidenceScore: number;
}

interface ExplainabilityReport {
  selectedModel: {
    id: string;
    name: string;
    type: string;
  };
  selectionReason: SelectionReason;
  featureImportances: FeatureImportance[];
  modelComparisons: ModelComparison[];
  dataCharacteristics: DataCharacteristics;
  recommendations: string[];
  visualizationData: {
    metricsComparison: {
      labels: string[];
      datasets: Array<{ modelName: string; values: number[] }>;
    };
    featureImportanceChart: {
      features: string[];
      importances: number[];
      colors: string[];
    };
    predictionComparison: {
      timestamps: number[];
      actual: number[];
      predictions: Record<string, number[]>;
    };
  };
  generatedAt: number;
}

// ==================== 模拟数据生成 ====================

function generateMockReport(): ExplainabilityReport {
  const now = Date.now();
  const timestamps = Array.from({ length: 30 }, (_, i) => now - (29 - i) * 86400000);
  const actual = timestamps.map((_, i) => 10000 + i * 500 + Math.random() * 2000);
  
  return {
    selectedModel: { id: 'linear', name: '线性回归', type: 'linear' },
    selectionReason: {
      primaryReason: '数据呈现明显的线性增长趋势，线性回归模型能够最好地捕捉这种模式',
      supportingReasons: ['数据方差较低，适合简单模型', '样本量适中，避免过拟合风险', '无明显季节性波动'],
      dataCharacteristicsMatch: { '线性趋势': true, '低方差': true, '无季节性': true, '足够样本': true },
      confidenceScore: 0.87
    },
    featureImportances: [
      { feature: '时间序列', importance: 0.45, direction: 'positive', contribution: 0.45, rank: 1 },
      { feature: '使用量', importance: 0.30, direction: 'positive', contribution: 0.30, rank: 2 },
      { feature: '历史均值', importance: 0.15, direction: 'positive', contribution: 0.15, rank: 3 },
      { feature: '波动率', importance: 0.07, direction: 'negative', contribution: -0.07, rank: 4 },
      { feature: '季节因子', importance: 0.03, direction: 'positive', contribution: 0.03, rank: 5 }
    ],
    modelComparisons: [
      { modelId: 'linear', modelName: '线性回归', modelType: 'linear', metrics: { mae: 850, mse: 1200000, rmse: 1095, mape: 6.2, r2: 0.92 }, rank: 1, strengths: ['解释性强', '计算效率高'], weaknesses: ['无法捕捉非线性关系'], suitableFor: ['线性趋势数据'] },
      { modelId: 'poly2', modelName: '二次多项式', modelType: 'polynomial', metrics: { mae: 920, mse: 1350000, rmse: 1162, mape: 6.8, r2: 0.89 }, rank: 2, strengths: ['能捕捉曲线趋势'], weaknesses: ['可能过拟合'], suitableFor: ['加速/减速趋势'] },
      { modelId: 'exp', modelName: '指数模型', modelType: 'exponential', metrics: { mae: 1100, mse: 1800000, rmse: 1342, mape: 8.1, r2: 0.85 }, rank: 3, strengths: ['适合指数增长'], weaknesses: ['对初始值敏感'], suitableFor: ['指数增长数据'] },
      { modelId: 'ma5', modelName: '移动平均(5期)', modelType: 'moving_average', metrics: { mae: 1250, mse: 2100000, rmse: 1449, mape: 9.2, r2: 0.78 }, rank: 4, strengths: ['平滑噪声'], weaknesses: ['滞后于实际变化'], suitableFor: ['稳定趋势数据'] }
    ],
    dataCharacteristics: { size: 30, timeSpan: 30, trend: 'increasing', seasonality: false, outlierRatio: 0.03, variance: 2500000, autocorrelation: 0.85, nonlinearity: 0.12 },
    recommendations: [
      '当前数据量适中，建议持续收集更多历史数据以提高预测准确性',
      '数据中存在少量异常值(3%)，建议定期检查数据质量',
      '线性模型表现良好，但建议定期重新评估模型以适应数据变化',
      '考虑添加更多特征（如季节因子、外部因素）以进一步提升预测精度'
    ],
    visualizationData: {
      metricsComparison: { labels: ['MAE', 'RMSE', 'MAPE(%)', 'R²(%)'], datasets: [
        { modelName: '线性回归', values: [850, 1095, 6.2, 92] },
        { modelName: '二次多项式', values: [920, 1162, 6.8, 89] },
        { modelName: '指数模型', values: [1100, 1342, 8.1, 85] },
        { modelName: '移动平均', values: [1250, 1449, 9.2, 78] }
      ]},
      featureImportanceChart: { features: ['时间序列', '使用量', '历史均值', '波动率', '季节因子'], importances: [0.45, 0.30, 0.15, 0.07, 0.03], colors: ['#22c55e', '#22c55e', '#22c55e', '#ef4444', '#22c55e'] },
      predictionComparison: { timestamps, actual, predictions: {
        '线性回归': actual.map(v => v + (Math.random() - 0.5) * 1000),
        '二次多项式': actual.map(v => v + (Math.random() - 0.5) * 1200),
        '指数模型': actual.map(v => v + (Math.random() - 0.5) * 1500),
        '移动平均': actual.map(v => v + (Math.random() - 0.5) * 1800)
      }}
    },
    generatedAt: now
  };
}

// ==================== 子组件 ====================

function FeatureImportanceChart({ data }: { data: FeatureImportance[] }) {
  const maxImportance = Math.max(...data.map(d => d.importance));
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.feature} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">{item.rank}</span>
              <span className="font-medium">{item.feature}</span>
              {item.direction === 'positive' ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
            <span className="text-muted-foreground">{(item.importance * 100).toFixed(1)}%</span>
          </div>
          <div className="relative h-8 bg-muted rounded-md overflow-hidden">
            <div className={`absolute inset-y-0 left-0 rounded-md transition-all duration-500 ${item.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${(item.importance / maxImportance) * 100}%` }} />
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs font-medium text-white drop-shadow">贡献度: {item.contribution > 0 ? '+' : ''}{(item.contribution * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelComparisonRadar({ data }: { data: ModelComparison[] }) {
  const metrics = ['MAE', 'RMSE', 'MAPE', 'R²'];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
        <div>模型</div>
        {metrics.map(m => <div key={m} className="text-center">{m}</div>)}
      </div>
      {data.map((model, index) => (
        <div key={model.modelId} className={`grid grid-cols-5 gap-2 text-sm py-2 rounded-lg transition-colors ${index === 0 ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}>
          <div className="flex items-center gap-2">
            {index === 0 && <CheckCircle2 className="w-4 h-4 text-primary" />}
            <span className={index === 0 ? 'font-medium text-primary' : ''}>{model.modelName}</span>
          </div>
          <div className="text-center">{model.metrics.mae.toFixed(0)}</div>
          <div className="text-center">{model.metrics.rmse.toFixed(0)}</div>
          <div className="text-center">{model.metrics.mape.toFixed(1)}%</div>
          <div className="text-center font-medium">
            <span className={model.metrics.r2 >= 0.9 ? 'text-green-500' : model.metrics.r2 >= 0.8 ? 'text-yellow-500' : 'text-red-500'}>{(model.metrics.r2 * 100).toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PredictionComparisonChart({ data }: { data: { timestamps: number[]; actual: number[]; predictions: Record<string, number[]> } }) {
  const [selectedModels, setSelectedModels] = useState<string[]>(['线性回归']);
  const modelNames = Object.keys(data.predictions);
  const allValues = [...data.actual, ...Object.values(data.predictions).flat()];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal;
  const width = 800, height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const xScale = (i: number) => padding.left + (i / (data.timestamps.length - 1)) * chartWidth;
  const yScale = (v: number) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight;
  const createPath = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
  const colors: Record<string, string> = { '实际值': '#6366f1', '线性回归': '#22c55e', '二次多项式': '#f59e0b', '指数模型': '#ef4444', '移动平均': '#8b5cf6' };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {modelNames.map(name => (
          <Button key={name} variant={selectedModels.includes(name) ? 'default' : 'outline'} size="sm" onClick={() => setSelectedModels(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])}>
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[name] }} />
            {name}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="bg-muted/30 rounded-lg">
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = padding.top + chartHeight * (1 - ratio);
            const value = minVal + range * ratio;
            return (
              <g key={ratio}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeOpacity={0.1} />
                <text x={padding.left - 10} y={y} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-muted-foreground">{(value / 1000).toFixed(0)}k</text>
              </g>
            );
          })}
          <path d={createPath(data.actual)} fill="none" stroke={colors['实际值']} strokeWidth={2} />
          {selectedModels.map(name => <path key={name} d={createPath(data.predictions[name])} fill="none" stroke={colors[name]} strokeWidth={2} strokeDasharray="5,5" />)}
          {[0, Math.floor(data.timestamps.length / 2), data.timestamps.length - 1].map(i => (
            <text key={i} x={xScale(i)} y={height - 10} textAnchor="middle" className="text-xs fill-muted-foreground">{new Date(data.timestamps[i]).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</text>
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2"><div className="w-8 h-0.5" style={{ backgroundColor: colors['实际值'] }} /><span>实际值</span></div>
        {selectedModels.map(name => <div key={name} className="flex items-center gap-2"><div className="w-8 h-0.5 border-dashed border-t-2" style={{ borderColor: colors[name] }} /><span>{name}</span></div>)}
      </div>
    </div>
  );
}

function DataCharacteristicsCard({ data }: { data: DataCharacteristics }) {
  const trendLabels: Record<string, string> = { increasing: '上升趋势', decreasing: '下降趋势', stable: '稳定', volatile: '波动' };
  const trendColors: Record<string, string> = { increasing: 'text-green-500', decreasing: 'text-red-500', stable: 'text-blue-500', volatile: 'text-yellow-500' };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-muted/50 rounded-lg"><div className="text-sm text-muted-foreground">数据量</div><div className="text-2xl font-bold">{data.size}</div><div className="text-xs text-muted-foreground">个样本</div></div>
      <div className="p-4 bg-muted/50 rounded-lg"><div className="text-sm text-muted-foreground">时间跨度</div><div className="text-2xl font-bold">{data.timeSpan}</div><div className="text-xs text-muted-foreground">天</div></div>
      <div className="p-4 bg-muted/50 rounded-lg"><div className="text-sm text-muted-foreground">趋势</div><div className={`text-2xl font-bold ${trendColors[data.trend]}`}>{trendLabels[data.trend]}</div><div className="text-xs text-muted-foreground">{data.seasonality ? `季节性(${data.seasonalPeriod}期)` : '无季节性'}</div></div>
      <div className="p-4 bg-muted/50 rounded-lg"><div className="text-sm text-muted-foreground">异常值比例</div><div className={`text-2xl font-bold ${data.outlierRatio > 0.1 ? 'text-red-500' : 'text-green-500'}`}>{(data.outlierRatio * 100).toFixed(1)}%</div><div className="text-xs text-muted-foreground">非线性度: {(data.nonlinearity * 100).toFixed(1)}%</div></div>
    </div>
  );
}

// ==================== 主组件 ====================

export default function ModelExplainabilityReport() {
  const [report, setReport] = useState<ExplainabilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('project-a');

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => { setReport(generateMockReport()); setLoading(false); }, 1000);
    return () => clearTimeout(timer);
  }, [selectedProject]);

  const handleRefresh = () => { setLoading(true); setTimeout(() => { setReport(generateMockReport()); setLoading(false); }, 1000); };
  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `model-report-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="container py-8"><div className="flex items-center justify-center h-96"><div className="text-center space-y-4"><RefreshCw className="w-12 h-12 animate-spin mx-auto text-primary" /><p className="text-muted-foreground">正在生成模型解释性报告...</p></div></div></div>;
  if (!report) return <div className="container py-8"><div className="flex items-center justify-center h-96"><div className="text-center space-y-4"><AlertCircle className="w-12 h-12 mx-auto text-destructive" /><p className="text-muted-foreground">无法加载报告数据</p><Button onClick={handleRefresh}>重试</Button></div></div></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="模型解释性报告"
        description={`生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`}
        actions={
          <>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48"><SelectValue placeholder="选择项目" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="project-a">项目A - 成本预测</SelectItem>
                <SelectItem value="project-b">项目B - 销售预测</SelectItem>
                <SelectItem value="project-c">项目C - 库存预测</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh}><RefreshCw className="w-4 h-4 mr-2" />刷新</Button>
            <Button onClick={handleExport}><Download className="w-4 h-4 mr-2" />导出报告</Button>
          </>
        }
      />

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary text-primary-foreground"><Target className="w-6 h-6" /></div>
              <div><CardTitle className="text-xl">推荐模型: {report.selectedModel.name}</CardTitle><CardDescription>置信度: {(report.selectionReason.confidenceScore * 100).toFixed(0)}%</CardDescription></div>
            </div>
            <Badge variant="default" className="text-lg px-4 py-1">R² = {(report.modelComparisons[0].metrics.r2 * 100).toFixed(1)}%</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div><h4 className="font-medium mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" />选择理由</h4><p className="text-muted-foreground">{report.selectionReason.primaryReason}</p></div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.selectionReason.dataCharacteristicsMatch).map(([key, match]) => (
                <Badge key={key} variant={match ? 'default' : 'secondary'}>{match ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}{key}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />数据特征分析</CardTitle></CardHeader><CardContent><DataCharacteristicsCard data={report.dataCharacteristics} /></CardContent></Card>

      <Tabs defaultValue="importance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="importance" className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />特征重要性</TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2"><PieChart className="w-4 h-4" />模型对比</TabsTrigger>
          <TabsTrigger value="prediction" className="flex items-center gap-2"><LineChart className="w-4 h-4" />预测对比</TabsTrigger>
        </TabsList>
        <TabsContent value="importance"><Card><CardHeader><CardTitle>特征重要性分析</CardTitle><CardDescription>展示各特征对预测结果的贡献程度，绿色表示正向影响，红色表示负向影响</CardDescription></CardHeader><CardContent><FeatureImportanceChart data={report.featureImportances} /></CardContent></Card></TabsContent>
        <TabsContent value="comparison"><Card><CardHeader><CardTitle>模型性能对比</CardTitle><CardDescription>比较不同模型在各项指标上的表现，第一行为推荐模型</CardDescription></CardHeader><CardContent><ModelComparisonRadar data={report.modelComparisons} /><Separator className="my-6" /><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{report.modelComparisons.slice(0, 2).map(model => (<div key={model.modelId} className="p-4 border rounded-lg"><h4 className="font-medium mb-3">{model.modelName}</h4><div className="space-y-2 text-sm"><div><span className="text-muted-foreground">优势: </span>{model.strengths.join('、')}</div><div><span className="text-muted-foreground">劣势: </span>{model.weaknesses.join('、')}</div><div><span className="text-muted-foreground">适用场景: </span>{model.suitableFor.join('、')}</div></div></div>))}</div></CardContent></Card></TabsContent>
        <TabsContent value="prediction"><Card><CardHeader><CardTitle>预测结果对比</CardTitle><CardDescription>对比不同模型的预测结果与实际值，点击按钮切换显示的模型</CardDescription></CardHeader><CardContent><PredictionComparisonChart data={report.visualizationData.predictionComparison} /></CardContent></Card></TabsContent>
      </Tabs>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" />优化建议</CardTitle></CardHeader><CardContent><ul className="space-y-3">{report.recommendations.map((rec, index) => (<li key={index} className="flex items-start gap-3"><div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">{index + 1}</div><span className="text-muted-foreground">{rec}</span></li>))}</ul></CardContent></Card>
    </div>
  );
}
