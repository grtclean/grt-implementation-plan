/**
 * A/B测试多指标分析组件
 * v2.5.20 - 多指标同时追踪、综合评估报告、指标权重配置
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Scale,
  Award,
  AlertTriangle,
  Settings,
  RefreshCw
} from 'lucide-react';

// 类型定义
type MetricType = 'conversion' | 'revenue' | 'engagement' | 'retention' | 'performance' | 'custom';
type MetricDirection = 'higher_better' | 'lower_better';

interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  direction: MetricDirection;
  unit: string;
  weight: number;
  enabled: boolean;
}

interface MetricResult {
  metricId: string;
  metricName: string;
  controlValue: number;
  treatmentValue: number;
  relativeChange: number;
  pValue: number;
  isSignificant: boolean;
  isImproved: boolean;
}

interface MultiMetricTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  metrics: MetricDefinition[];
  primaryMetricId: string;
  overallScore: number;
  recommendation: string;
  startDate: Date;
  currentSampleSize: number;
  targetSampleSize: number;
}

// 模拟数据
const mockTests: MultiMetricTest[] = [
  {
    id: 'mmtest-001',
    name: '新结账流程测试',
    description: '测试简化结账流程对转化率和收入的影响',
    status: 'running',
    metrics: [
      { id: 'conversion', name: '转化率', description: '', type: 'conversion', direction: 'higher_better', unit: '%', weight: 40, enabled: true },
      { id: 'revenue', name: '平均订单金额', description: '', type: 'revenue', direction: 'higher_better', unit: '¥', weight: 30, enabled: true },
      { id: 'bounce', name: '跳出率', description: '', type: 'engagement', direction: 'lower_better', unit: '%', weight: 20, enabled: true },
      { id: 'time', name: '完成时间', description: '', type: 'performance', direction: 'lower_better', unit: 's', weight: 10, enabled: true }
    ],
    primaryMetricId: 'conversion',
    overallScore: 72,
    recommendation: 'stop_winner',
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    currentSampleSize: 8500,
    targetSampleSize: 10000
  },
  {
    id: 'mmtest-002',
    name: '推荐算法优化',
    description: '测试新推荐算法对用户参与度和留存的影响',
    status: 'running',
    metrics: [
      { id: 'engagement', name: '参与度', description: '', type: 'engagement', direction: 'higher_better', unit: '分', weight: 35, enabled: true },
      { id: 'retention', name: '7日留存', description: '', type: 'retention', direction: 'higher_better', unit: '%', weight: 35, enabled: true },
      { id: 'ctr', name: '点击率', description: '', type: 'conversion', direction: 'higher_better', unit: '%', weight: 30, enabled: true }
    ],
    primaryMetricId: 'engagement',
    overallScore: 48,
    recommendation: 'continue',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    currentSampleSize: 3200,
    targetSampleSize: 10000
  }
];

const mockMetricResults: Record<string, MetricResult[]> = {
  'mmtest-001': [
    { metricId: 'conversion', metricName: '转化率', controlValue: 3.2, treatmentValue: 4.1, relativeChange: 28.1, pValue: 0.003, isSignificant: true, isImproved: true },
    { metricId: 'revenue', metricName: '平均订单金额', controlValue: 156, treatmentValue: 168, relativeChange: 7.7, pValue: 0.042, isSignificant: true, isImproved: true },
    { metricId: 'bounce', metricName: '跳出率', controlValue: 45, treatmentValue: 38, relativeChange: -15.6, pValue: 0.008, isSignificant: true, isImproved: true },
    { metricId: 'time', metricName: '完成时间', controlValue: 180, treatmentValue: 145, relativeChange: -19.4, pValue: 0.001, isSignificant: true, isImproved: true }
  ],
  'mmtest-002': [
    { metricId: 'engagement', metricName: '参与度', controlValue: 42, treatmentValue: 44, relativeChange: 4.8, pValue: 0.12, isSignificant: false, isImproved: true },
    { metricId: 'retention', metricName: '7日留存', controlValue: 28, treatmentValue: 27, relativeChange: -3.6, pValue: 0.35, isSignificant: false, isImproved: false },
    { metricId: 'ctr', metricName: '点击率', controlValue: 12.5, treatmentValue: 13.2, relativeChange: 5.6, pValue: 0.08, isSignificant: false, isImproved: true }
  ]
};

export default function ABMultiMetricAnalysis() {
  const [tests, setTests] = useState<MultiMetricTest[]>(mockTests);
  const [selectedTest, setSelectedTest] = useState<MultiMetricTest | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">运行中</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">已暂停</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">已完成</Badge>;
      case 'draft':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">草稿</Badge>;
      default:
        return null;
    }
  };

  // 获取推荐徽章
  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'stop_winner':
        return <Badge className="bg-green-500/20 text-green-400"><Award className="w-3 h-3 mr-1" />建议采用</Badge>;
      case 'stop_no_effect':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />建议停止</Badge>;
      case 'continue':
        return <Badge className="bg-blue-500/20 text-blue-400"><RefreshCw className="w-3 h-3 mr-1" />继续测试</Badge>;
      case 'need_more_samples':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><AlertTriangle className="w-3 h-3 mr-1" />需要更多样本</Badge>;
      default:
        return null;
    }
  };

  // 获取变化趋势图标
  const getTrendIcon = (result: MetricResult) => {
    if (result.isImproved) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (result.relativeChange < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  // 统计数据
  const stats = {
    totalTests: tests.length,
    runningTests: tests.filter(t => t.status === 'running').length,
    avgScore: tests.reduce((sum, t) => sum + t.overallScore, 0) / tests.length,
    avgMetrics: tests.reduce((sum, t) => sum + t.metrics.length, 0) / tests.length
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            A/B测试多指标分析
          </h1>
          <p className="text-muted-foreground mt-1">
            同时追踪多个指标，综合评估实验效果
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              创建多指标测试
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建多指标A/B测试</DialogTitle>
              <DialogDescription>
                配置测试名称、指标和权重
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>测试名称</Label>
                <Input placeholder="例如：新结账流程测试" />
              </div>
              <div className="space-y-2">
                <Label>测试描述</Label>
                <Input placeholder="描述测试目的和假设..." />
              </div>
              <div className="space-y-2">
                <Label>目标样本量</Label>
                <Input type="number" placeholder="10000" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>取消</Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>创建测试</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总测试数</p>
                <p className="text-2xl font-bold">{stats.totalTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">运行中</p>
                <p className="text-2xl font-bold">{stats.runningTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">平均评分</p>
                <p className="text-2xl font-bold">{stats.avgScore.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Scale className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">平均指标数</p>
                <p className="text-2xl font-bold">{stats.avgMetrics.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 测试列表 */}
      <div className="space-y-4">
        {tests.map((test) => {
          const results = mockMetricResults[test.id] || [];
          const progress = (test.currentSampleSize / test.targetSampleSize) * 100;
          
          return (
            <Card key={test.id} className="bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{test.name}</CardTitle>
                      {getStatusBadge(test.status)}
                      {getRecommendationBadge(test.recommendation)}
                    </div>
                    <CardDescription>{test.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-3xl font-bold ${getScoreColor(test.overallScore)}`}>
                      {test.overallScore}
                    </div>
                    <span className="text-sm text-muted-foreground">分</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 进度条 */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">样本进度</span>
                    <span>{test.currentSampleSize.toLocaleString()} / {test.targetSampleSize.toLocaleString()}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* 指标结果 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {results.map((result) => {
                    const metric = test.metrics.find(m => m.id === result.metricId);
                    const isPrimary = test.primaryMetricId === result.metricId;
                    
                    return (
                      <div
                        key={result.metricId}
                        className={`p-3 rounded-lg ${isPrimary ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-1">
                            {isPrimary && <Target className="w-3 h-3 text-primary" />}
                            {result.metricName}
                          </span>
                          {getTrendIcon(result)}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl font-bold ${result.isImproved ? 'text-green-500' : (result.relativeChange < 0 ? 'text-red-500' : '')}`}>
                            {result.relativeChange > 0 ? '+' : ''}{result.relativeChange.toFixed(1)}%
                          </span>
                          {result.isSignificant && (
                            <Badge variant="outline" className="text-xs">显著</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.controlValue.toFixed(1)} → {result.treatmentValue.toFixed(1)} {metric?.unit}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          权重: {metric?.weight}%
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                  <Dialog open={isWeightDialogOpen} onOpenChange={setIsWeightDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedTest(test)}>
                        <Settings className="w-4 h-4 mr-1" />
                        调整权重
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>调整指标权重</DialogTitle>
                        <DialogDescription>
                          调整各指标在综合评分中的权重占比
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {test.metrics.map((metric) => (
                          <div key={metric.id} className="space-y-2">
                            <div className="flex justify-between">
                              <Label>{metric.name}</Label>
                              <span className="text-sm text-muted-foreground">{metric.weight}%</span>
                            </div>
                            <Slider
                              defaultValue={[metric.weight]}
                              max={100}
                              step={5}
                            />
                          </div>
                        ))}
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsWeightDialogOpen(false)}>取消</Button>
                          <Button onClick={() => setIsWeightDialogOpen(false)}>保存</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {test.status === 'running' && (
                    <Button variant="outline" size="sm">
                      <Pause className="w-4 h-4 mr-1" />
                      暂停
                    </Button>
                  )}
                  {test.status === 'paused' && (
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-1" />
                      继续
                    </Button>
                  )}
                  {test.recommendation === 'stop_winner' && (
                    <Button size="sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      采用实验组
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
