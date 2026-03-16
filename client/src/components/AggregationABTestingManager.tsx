/**
 * 聚合规则A/B测试管理组件
 * v2.5.18 - 多策略并行运行、效果对比分析、自动选择最优规则
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FlaskConical,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Trophy,
  BarChart3,
  Users,
  Target,
  RefreshCw,
  Plus,
  Settings,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Clock
} from 'lucide-react';

// 类型定义
type TestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
type TrafficSplitMethod = 'random' | 'user_hash' | 'time_based' | 'device_type';
type WinnerSelectionCriteria = 'compression_rate' | 'delivery_rate' | 'user_satisfaction' | 'composite';

interface AggregationRule {
  id: string;
  name: string;
  description: string;
  timeWindowMinutes: number;
  maxMessagesPerWindow: number;
  aggregationStrategy: 'time_based' | 'count_based' | 'smart';
}

interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  ruleId: string;
  rule: AggregationRule;
  trafficPercentage: number;
  isControl: boolean;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: TestStatus;
  variants: ABTestVariant[];
  trafficSplitMethod: TrafficSplitMethod;
  winnerCriteria: WinnerSelectionCriteria;
  minSampleSize: number;
  confidenceLevel: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  winnerId: string | null;
  autoSelectWinner: boolean;
}

interface VariantMetrics {
  variantId: string;
  sampleSize: number;
  messagesSent: number;
  messagesAggregated: number;
  compressionRate: number;
  deliveryRate: number;
  avgDeliveryTimeMs: number;
  userSatisfactionScore: number;
  errorCount: number;
}

interface TestResult {
  testId: string;
  variantMetrics: VariantMetrics[];
  statisticalSignificance: number;
  recommendedWinner: string | null;
  analysisNotes: string[];
}

// 模拟数据
const mockRules: AggregationRule[] = [
  {
    id: 'rule-1',
    name: '标准时间窗口',
    description: '5分钟时间窗口，最多10条消息聚合',
    timeWindowMinutes: 5,
    maxMessagesPerWindow: 10,
    aggregationStrategy: 'time_based'
  },
  {
    id: 'rule-2',
    name: '激进聚合',
    description: '15分钟时间窗口，最多30条消息聚合',
    timeWindowMinutes: 15,
    maxMessagesPerWindow: 30,
    aggregationStrategy: 'count_based'
  },
  {
    id: 'rule-3',
    name: '智能聚合',
    description: '根据消息优先级和用户行为动态调整',
    timeWindowMinutes: 10,
    maxMessagesPerWindow: 20,
    aggregationStrategy: 'smart'
  }
];

const generateMockTests = (): ABTest[] => [
  {
    id: 'test-1',
    name: '聚合策略对比测试 A',
    description: '对比标准时间窗口与激进聚合策略的效果',
    status: 'running',
    variants: [
      {
        id: 'variant-1-a',
        name: '对照组 - 标准策略',
        description: '当前生产环境使用的标准策略',
        ruleId: 'rule-1',
        rule: mockRules[0],
        trafficPercentage: 50,
        isControl: true
      },
      {
        id: 'variant-1-b',
        name: '实验组 - 激进策略',
        description: '测试更激进的聚合策略',
        ruleId: 'rule-2',
        rule: mockRules[1],
        trafficPercentage: 50,
        isControl: false
      }
    ],
    trafficSplitMethod: 'user_hash',
    winnerCriteria: 'composite',
    minSampleSize: 1000,
    confidenceLevel: 0.95,
    startDate: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    endDate: null,
    createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    winnerId: null,
    autoSelectWinner: true
  },
  {
    id: 'test-2',
    name: '智能聚合验证测试',
    description: '验证智能聚合策略是否优于传统策略',
    status: 'completed',
    variants: [
      {
        id: 'variant-2-a',
        name: '对照组 - 标准策略',
        description: '标准时间窗口策略',
        ruleId: 'rule-1',
        rule: mockRules[0],
        trafficPercentage: 50,
        isControl: true
      },
      {
        id: 'variant-2-b',
        name: '实验组 - 智能策略',
        description: '智能聚合策略',
        ruleId: 'rule-3',
        rule: mockRules[2],
        trafficPercentage: 50,
        isControl: false
      }
    ],
    trafficSplitMethod: 'random',
    winnerCriteria: 'composite',
    minSampleSize: 500,
    confidenceLevel: 0.95,
    startDate: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    endDate: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    winnerId: 'variant-2-b',
    autoSelectWinner: true
  }
];

const generateMockMetrics = (): Map<string, VariantMetrics> => {
  const map = new Map<string, VariantMetrics>();
  
  map.set('variant-1-a', {
    variantId: 'variant-1-a',
    sampleSize: 856,
    messagesSent: 12500,
    messagesAggregated: 4200,
    compressionRate: 2.98,
    deliveryRate: 0.985,
    avgDeliveryTimeMs: 245,
    userSatisfactionScore: 4.2,
    errorCount: 12
  });
  
  map.set('variant-1-b', {
    variantId: 'variant-1-b',
    sampleSize: 844,
    messagesSent: 12300,
    messagesAggregated: 2800,
    compressionRate: 4.39,
    deliveryRate: 0.978,
    avgDeliveryTimeMs: 320,
    userSatisfactionScore: 3.9,
    errorCount: 18
  });
  
  map.set('variant-2-a', {
    variantId: 'variant-2-a',
    sampleSize: 520,
    messagesSent: 8500,
    messagesAggregated: 2900,
    compressionRate: 2.93,
    deliveryRate: 0.982,
    avgDeliveryTimeMs: 250,
    userSatisfactionScore: 4.1,
    errorCount: 8
  });
  
  map.set('variant-2-b', {
    variantId: 'variant-2-b',
    sampleSize: 518,
    messagesSent: 8400,
    messagesAggregated: 2400,
    compressionRate: 3.50,
    deliveryRate: 0.991,
    avgDeliveryTimeMs: 180,
    userSatisfactionScore: 4.5,
    errorCount: 4
  });
  
  return map;
};

// 辅助函数
const getStatusIcon = (status: TestStatus) => {
  switch (status) {
    case 'draft': return <Clock className="w-4 h-4 text-muted-foreground" />;
    case 'running': return <Play className="w-4 h-4 text-green-500" />;
    case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
  }
};

const getStatusLabel = (status: TestStatus): string => {
  const labels: Record<TestStatus, string> = {
    draft: '草稿',
    running: '运行中',
    paused: '已暂停',
    completed: '已完成',
    cancelled: '已取消'
  };
  return labels[status];
};

const getCriteriaLabel = (criteria: WinnerSelectionCriteria): string => {
  const labels: Record<WinnerSelectionCriteria, string> = {
    compression_rate: '压缩率',
    delivery_rate: '送达率',
    user_satisfaction: '用户满意度',
    composite: '综合评分'
  };
  return labels[criteria];
};

const getTrafficMethodLabel = (method: TrafficSplitMethod): string => {
  const labels: Record<TrafficSplitMethod, string> = {
    random: '随机分配',
    user_hash: '用户哈希',
    time_based: '时间轮询',
    device_type: '设备类型'
  };
  return labels[method];
};

const formatPercentage = (value: number): string => {
  return (value * 100).toFixed(1) + '%';
};

// 创建测试对话框
const CreateTestDialog = ({ 
  rules,
  onClose 
}: { 
  rules: AggregationRule[];
  onClose: () => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [controlRuleId, setControlRuleId] = useState('');
  const [treatmentRuleId, setTreatmentRuleId] = useState('');
  const [trafficSplit, setTrafficSplit] = useState([50]);
  const [minSampleSize, setMinSampleSize] = useState(1000);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [autoSelectWinner, setAutoSelectWinner] = useState(true);

  const handleCreate = () => {
    // TODO: call API to create A/B test
    onClose();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>创建A/B测试</DialogTitle>
        <DialogDescription>配置聚合规则的A/B测试实验</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>测试名称</Label>
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：聚合策略对比测试"
          />
        </div>

        <div className="space-y-2">
          <Label>测试描述</Label>
          <Input 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述测试目的和预期结果"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>对照组规则</Label>
            <Select value={controlRuleId} onValueChange={setControlRuleId}>
              <SelectTrigger>
                <SelectValue placeholder="选择对照组规则" />
              </SelectTrigger>
              <SelectContent>
                {rules.map(rule => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>实验组规则</Label>
            <Select value={treatmentRuleId} onValueChange={setTreatmentRuleId}>
              <SelectTrigger>
                <SelectValue placeholder="选择实验组规则" />
              </SelectTrigger>
              <SelectContent>
                {rules.map(rule => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>流量分配: 对照组 {trafficSplit[0]}% / 实验组 {100 - trafficSplit[0]}%</Label>
          <Slider
            value={trafficSplit}
            onValueChange={setTrafficSplit}
            min={10}
            max={90}
            step={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>最小样本量</Label>
            <Input 
              type="number"
              value={minSampleSize} 
              onChange={(e) => setMinSampleSize(parseInt(e.target.value) || 1000)}
              min={100}
            />
          </div>

          <div className="space-y-2">
            <Label>置信度</Label>
            <Select value={confidenceLevel.toString()} onValueChange={(v) => setConfidenceLevel(parseFloat(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.90">90%</SelectItem>
                <SelectItem value="0.95">95%</SelectItem>
                <SelectItem value="0.99">99%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>自动选择获胜者</Label>
          <Switch 
            checked={autoSelectWinner} 
            onCheckedChange={setAutoSelectWinner}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleCreate} disabled={!name || !controlRuleId || !treatmentRuleId}>
          创建测试
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// 变体对比卡片
const VariantComparisonCard = ({ 
  variant, 
  metrics,
  isWinner 
}: { 
  variant: ABTestVariant;
  metrics: VariantMetrics | undefined;
  isWinner: boolean;
}) => {
  if (!metrics) return null;

  return (
    <Card className={`${isWinner ? 'border-primary ring-2 ring-primary/20' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isWinner && <Trophy className="w-5 h-5 text-yellow-500" />}
            <CardTitle className="text-lg">{variant.name}</CardTitle>
          </div>
          <Badge variant={variant.isControl ? 'secondary' : 'default'}>
            {variant.isControl ? '对照组' : '实验组'}
          </Badge>
        </div>
        <CardDescription>{variant.rule.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">样本量</p>
            <p className="text-xl font-bold">{metrics.sampleSize.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">压缩率</p>
            <p className="text-xl font-bold">{metrics.compressionRate.toFixed(2)}x</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">送达率</p>
            <p className="text-xl font-bold">{formatPercentage(metrics.deliveryRate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">满意度</p>
            <p className="text-xl font-bold">{metrics.userSatisfactionScore.toFixed(1)}/5</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">平均延迟</p>
            <p className="text-xl font-bold">{metrics.avgDeliveryTimeMs}ms</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">错误数</p>
            <p className="text-xl font-bold text-red-500">{metrics.errorCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 主组件
export default function AggregationABTestingManager() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [metrics, setMetrics] = useState<Map<string, VariantMetrics>>(new Map());
  const [rules] = useState<AggregationRule[]>(mockRules);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | TestStatus>('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setTests(generateMockTests());
      setMetrics(generateMockMetrics());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartTest = (testId: string) => {
    setTests(prev => prev.map(t => 
      t.id === testId ? { ...t, status: 'running' as TestStatus, startDate: new Date().toISOString() } : t
    ));
  };

  const handlePauseTest = (testId: string) => {
    setTests(prev => prev.map(t => 
      t.id === testId ? { ...t, status: 'paused' as TestStatus } : t
    ));
  };

  const handleCompleteTest = (testId: string) => {
    setTests(prev => prev.map(t => 
      t.id === testId ? { ...t, status: 'completed' as TestStatus, endDate: new Date().toISOString() } : t
    ));
  };

  const handleApplyWinner = (_testId: string) => {
    // TODO: call API to apply winning rule
  };

  const filteredTests = tests.filter(test => 
    statusFilter === 'all' || test.status === statusFilter
  );

  const stats = {
    total: tests.length,
    running: tests.filter(t => t.status === 'running').length,
    completed: tests.filter(t => t.status === 'completed').length,
    totalSamples: Array.from(metrics.values()).reduce((sum, m) => sum + m.sampleSize, 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" />
            聚合规则A/B测试
          </h2>
          <p className="text-muted-foreground">多策略并行运行、效果对比分析、自动选择最优规则</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-1" />
                创建测试
              </Button>
            </DialogTrigger>
            <CreateTestDialog 
              rules={rules}
              onClose={() => setIsCreateDialogOpen(false)}
            />
          </Dialog>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总测试数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FlaskConical className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">运行中</p>
                <p className="text-2xl font-bold text-green-500">{stats.running}</p>
              </div>
              <Play className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-blue-500">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总样本量</p>
                <p className="text-2xl font-bold">{stats.totalSamples.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tests">测试列表</TabsTrigger>
          <TabsTrigger value="rules">聚合规则</TabsTrigger>
        </TabsList>

        {/* 测试列表 */}
        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>A/B测试列表</CardTitle>
                  <CardDescription>管理所有聚合规则的A/B测试实验</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="running">运行中</SelectItem>
                    <SelectItem value="paused">已暂停</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无A/B测试</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTests.map(test => (
                    <div 
                      key={test.id}
                      className="p-4 border rounded-lg space-y-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(test.status)}
                          <div>
                            <p className="font-medium">{test.name}</p>
                            <p className="text-sm text-muted-foreground">{test.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            test.status === 'running' ? 'default' :
                            test.status === 'completed' ? 'secondary' :
                            'outline'
                          }>
                            {getStatusLabel(test.status)}
                          </Badge>
                          {test.winnerId && (
                            <Badge className="bg-yellow-500/10 text-yellow-600">
                              <Trophy className="w-3 h-3 mr-1" />
                              已选出获胜者
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 变体对比 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {test.variants.map(variant => (
                          <VariantComparisonCard
                            key={variant.id}
                            variant={variant}
                            metrics={metrics.get(variant.id)}
                            isWinner={variant.id === test.winnerId}
                          />
                        ))}
                      </div>

                      {/* 测试进度 */}
                      {test.status === 'running' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>样本收集进度</span>
                            <span>
                              {Math.min(
                                ...test.variants.map(v => metrics.get(v.id)?.sampleSize || 0)
                              ).toLocaleString()} / {test.minSampleSize.toLocaleString()}
                            </span>
                          </div>
                          <Progress 
                            value={Math.min(100, (Math.min(
                              ...test.variants.map(v => metrics.get(v.id)?.sampleSize || 0)
                            ) / test.minSampleSize) * 100)} 
                          />
                        </div>
                      )}

                      {/* 测试信息 */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>评选标准: {getCriteriaLabel(test.winnerCriteria)}</span>
                          <span>流量分配: {getTrafficMethodLabel(test.trafficSplitMethod)}</span>
                          <span>置信度: {(test.confidenceLevel * 100).toFixed(0)}%</span>
                        </div>
                        <span>
                          创建于 {new Date(test.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        {test.status === 'draft' && (
                          <Button size="sm" onClick={() => handleStartTest(test.id)}>
                            <Play className="w-4 h-4 mr-1" />
                            启动测试
                          </Button>
                        )}
                        {test.status === 'running' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handlePauseTest(test.id)}>
                              <Pause className="w-4 h-4 mr-1" />
                              暂停
                            </Button>
                            <Button size="sm" onClick={() => handleCompleteTest(test.id)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              结束测试
                            </Button>
                          </>
                        )}
                        {test.status === 'paused' && (
                          <Button size="sm" onClick={() => handleStartTest(test.id)}>
                            <Play className="w-4 h-4 mr-1" />
                            恢复测试
                          </Button>
                        )}
                        {test.status === 'completed' && test.winnerId && (
                          <Button size="sm" onClick={() => handleApplyWinner(test.id)}>
                            <Zap className="w-4 h-4 mr-1" />
                            应用获胜规则
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setSelectedTest(test)}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          详细分析
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 聚合规则 */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>聚合规则库</CardTitle>
              <CardDescription>可用于A/B测试的聚合规则</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map(rule => (
                  <div 
                    key={rule.id}
                    className="p-4 border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>时间窗口: {rule.timeWindowMinutes}分钟</span>
                      <span>最大消息数: {rule.maxMessagesPerWindow}</span>
                      <Badge variant="outline">{rule.aggregationStrategy}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 详细分析对话框 */}
      {selectedTest && (
        <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedTest.name} - 详细分析</DialogTitle>
              <DialogDescription>查看测试的详细统计数据和分析结果</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedTest.variants.map(variant => {
                  const m = metrics.get(variant.id);
                  const controlMetrics = metrics.get(
                    selectedTest.variants.find(v => v.isControl)?.id || ''
                  );
                  
                  if (!m) return null;
                  
                  const compressionDiff = controlMetrics 
                    ? ((m.compressionRate - controlMetrics.compressionRate) / controlMetrics.compressionRate * 100)
                    : 0;
                  const deliveryDiff = controlMetrics
                    ? ((m.deliveryRate - controlMetrics.deliveryRate) / controlMetrics.deliveryRate * 100)
                    : 0;

                  return (
                    <Card key={variant.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{variant.name}</CardTitle>
                          <Badge variant={variant.isControl ? 'secondary' : 'default'}>
                            {variant.isControl ? '对照组' : '实验组'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">压缩率</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-bold">{m.compressionRate.toFixed(2)}x</p>
                              {!variant.isControl && (
                                <span className={`text-sm flex items-center ${compressionDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {compressionDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {Math.abs(compressionDiff).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">送达率</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-bold">{formatPercentage(m.deliveryRate)}</p>
                              {!variant.isControl && (
                                <span className={`text-sm flex items-center ${deliveryDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {deliveryDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {Math.abs(deliveryDiff).toFixed(2)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">样本量</p>
                            <p className="font-medium">{m.sampleSize.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">发送消息</p>
                            <p className="font-medium">{m.messagesSent.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">聚合消息</p>
                            <p className="font-medium">{m.messagesAggregated.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">分析结论</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {selectedTest.status === 'completed' && selectedTest.winnerId ? (
                      <>
                        <p className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          测试已完成，获胜变体: {selectedTest.variants.find(v => v.id === selectedTest.winnerId)?.name}
                        </p>
                        <p>建议将获胜规则应用到生产环境以提升整体性能。</p>
                      </>
                    ) : selectedTest.status === 'running' ? (
                      <>
                        <p className="flex items-center gap-2 text-blue-600">
                          <Target className="w-4 h-4" />
                          测试正在进行中，继续收集数据以达到统计显著性
                        </p>
                        <p>当前样本量尚未达到目标 {selectedTest.minSampleSize}，建议继续运行测试。</p>
                      </>
                    ) : (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Minus className="w-4 h-4" />
                        测试尚未开始或已暂停
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTest(null)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
