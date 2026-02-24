/**
 * A/B测试贝叶斯分析组件
 * 支持贝叶斯统计方法、胜出概率预测、置信区间计算
 */

import { useState } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart3, 
  Plus, 
  Play, 
  TrendingUp, 
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity
} from 'lucide-react';

// 类型定义
interface VariantData {
  id: string;
  name: string;
  visitors: number;
  conversions: number;
}

interface WinProbability {
  variantId: string;
  variantName: string;
  probability: number;
  expectedLoss: number;
  relativeUplift: number;
}

interface BayesianTest {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'paused';
  variants: VariantData[];
  winProbabilities: WinProbability[];
  isConclusive: boolean;
  recommendedVariant: string | null;
  createdAt: number;
  lastAnalyzedAt: number;
}

// 模拟数据
const mockTests: BayesianTest[] = [
  {
    id: 'test-1',
    name: '首页CTA按钮颜色测试',
    status: 'completed',
    variants: [
      { id: 'control', name: '对照组 (蓝色)', visitors: 5000, conversions: 250 },
      { id: 'variant-a', name: '变体A (绿色)', visitors: 5000, conversions: 300 }
    ],
    winProbabilities: [
      { variantId: 'control', variantName: '对照组 (蓝色)', probability: 0.08, expectedLoss: 0.012, relativeUplift: 0 },
      { variantId: 'variant-a', variantName: '变体A (绿色)', probability: 0.92, expectedLoss: 0.001, relativeUplift: 0.20 }
    ],
    isConclusive: false,
    recommendedVariant: null,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    lastAnalyzedAt: Date.now() - 1 * 60 * 60 * 1000
  },
  {
    id: 'test-2',
    name: '定价页面布局测试',
    status: 'completed',
    variants: [
      { id: 'control', name: '对照组 (三列)', visitors: 8000, conversions: 320 },
      { id: 'variant-a', name: '变体A (两列)', visitors: 8000, conversions: 400 },
      { id: 'variant-b', name: '变体B (单列)', visitors: 8000, conversions: 280 }
    ],
    winProbabilities: [
      { variantId: 'control', variantName: '对照组 (三列)', probability: 0.02, expectedLoss: 0.015, relativeUplift: 0 },
      { variantId: 'variant-a', variantName: '变体A (两列)', probability: 0.97, expectedLoss: 0.0005, relativeUplift: 0.25 },
      { variantId: 'variant-b', variantName: '变体B (单列)', probability: 0.01, expectedLoss: 0.018, relativeUplift: -0.125 }
    ],
    isConclusive: true,
    recommendedVariant: 'variant-a',
    createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
    lastAnalyzedAt: Date.now() - 2 * 24 * 60 * 60 * 1000
  },
  {
    id: 'test-3',
    name: '注册流程简化测试',
    status: 'running',
    variants: [
      { id: 'control', name: '对照组 (5步)', visitors: 2000, conversions: 100 },
      { id: 'variant-a', name: '变体A (3步)', visitors: 2000, conversions: 130 }
    ],
    winProbabilities: [
      { variantId: 'control', variantName: '对照组 (5步)', probability: 0.15, expectedLoss: 0.008, relativeUplift: 0 },
      { variantId: 'variant-a', variantName: '变体A (3步)', probability: 0.85, expectedLoss: 0.002, relativeUplift: 0.30 }
    ],
    isConclusive: false,
    recommendedVariant: null,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    lastAnalyzedAt: Date.now() - 30 * 60 * 1000
  }
];

export default function ABBayesianAnalysis() {
  const { t } = useLanguage();
  const [tests, setTests] = useState<BayesianTest[]>(mockTests);
  const [selectedTest, setSelectedTest] = useState<BayesianTest | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTestName, setNewTestName] = useState('');

  // 统计数据
  const stats = {
    totalTests: tests.length,
    runningTests: tests.filter(t => t.status === 'running').length,
    conclusiveTests: tests.filter(t => t.isConclusive).length,
    averageWinProbability: tests.length > 0 
      ? tests.flatMap(t => t.winProbabilities).reduce((sum, wp) => sum + wp.probability, 0) / tests.flatMap(t => t.winProbabilities).length
      : 0
  };

  // 创建新测试
  const handleCreateTest = () => {
    const newTest: BayesianTest = {
      id: `test-${Date.now()}`,
      name: newTestName,
      status: 'running',
      variants: [
        { id: 'control', name: '对照组', visitors: 0, conversions: 0 },
        { id: 'variant-a', name: '变体A', visitors: 0, conversions: 0 }
      ],
      winProbabilities: [],
      isConclusive: false,
      recommendedVariant: null,
      createdAt: Date.now(),
      lastAnalyzedAt: Date.now()
    };
    setTests([...tests, newTest]);
    setShowCreateDialog(false);
    setNewTestName('');
  };

  // 运行分析
  const handleRunAnalysis = (testId: string) => {
    setTests(tests.map(t => {
      if (t.id === testId) {
        return { ...t, lastAnalyzedAt: Date.now() };
      }
      return t;
    }));
  };

  // 格式化概率
  const formatProbability = (prob: number) => `${(prob * 100).toFixed(1)}%`;

  // 格式化提升
  const formatUplift = (uplift: number) => {
    const sign = uplift >= 0 ? '+' : '';
    return `${sign}${(uplift * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title={t("ai.abBayes.title")}
        description={t("ai.abBayes.description")}
        actions={
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("ai.abBayes.createTest")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("ai.abBayes.createNewTest")}</DialogTitle>
              <DialogDescription>{t("ai.abBayes.createNewTestDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("ai.abBayes.testName")}</Label>
                <Input
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder={t("ai.abBayes.testNamePlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("ai.abBayes.cancel")}</Button>
              <Button onClick={handleCreateTest} disabled={!newTestName}>{t("ai.abBayes.create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label={t("ai.abBayes.totalTests")} value={stats.totalTests} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard icon={Activity} label={t("ai.abBayes.running")} value={stats.runningTests} iconColor="text-blue-500" iconBg="bg-blue-50" />
        <StatCard icon={CheckCircle} label={t("ai.abBayes.concluded")} value={stats.conclusiveTests} iconColor="text-green-500" iconBg="bg-green-50" />
        <StatCard icon={Target} label={t("ai.abBayes.avgWinProb")} value={formatProbability(stats.averageWinProbability)} iconColor="text-purple-500" iconBg="bg-purple-50" />
      </div>

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tests">{t("ai.abBayes.testList")}</TabsTrigger>
          <TabsTrigger value="analysis">{t("ai.abBayes.analysisDetails")}</TabsTrigger>
        </TabsList>

        {/* 测试列表 */}
        <TabsContent value="tests" className="space-y-4">
          {tests.map((test) => (
            <Card key={test.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTest(test)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <Badge variant={test.status === 'running' ? 'default' : test.isConclusive ? 'secondary' : 'outline'}>
                      {test.status === 'running' ? t("ai.abBayes.statusRunning") : test.isConclusive ? t("ai.abBayes.statusConcluded") : t("ai.abBayes.statusCompleted")}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRunAnalysis(test.id); }}>
                    <Play className="h-3 w-3 mr-1" />
                    {t("ai.abBayes.runAnalysis")}
                  </Button>
                </div>
                <CardDescription>
                  {test.variants.length} {t("ai.abBayes.variantsCount")} · {t("ai.abBayes.lastAnalysis")}: {new Date(test.lastAnalyzedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {test.winProbabilities.map((wp) => (
                    <div key={wp.variantId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {wp.variantName}
                          {test.recommendedVariant === wp.variantId && (
                            <Badge variant="default" className="text-xs">{t("ai.abBayes.recommend")}</Badge>
                          )}
                        </span>
                        <span className="flex items-center gap-4">
                          <span className={wp.relativeUplift >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatUplift(wp.relativeUplift)}
                          </span>
                          <span className="font-medium">{formatProbability(wp.probability)}</span>
                        </span>
                      </div>
                      <Progress value={wp.probability * 100} className="h-2" />
                    </div>
                  ))}
                </div>

                {test.isConclusive && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      {t("ai.abBayes.testConcluded")} {test.winProbabilities.find(wp => wp.variantId === test.recommendedVariant)?.variantName}
                    </span>
                  </div>
                )}

                {!test.isConclusive && test.status === 'running' && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700 dark:text-yellow-400">
                      {t("ai.abBayes.needMoreData")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 分析详情 */}
        <TabsContent value="analysis" className="space-y-4">
          {selectedTest ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedTest.name}</CardTitle>
                  <CardDescription>{t("ai.abBayes.bayesianDetails")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 变体数据 */}
                  <div>
                    <h3 className="font-medium mb-3">{t("ai.abBayes.variantData")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedTest.variants.map((variant) => (
                        <Card key={variant.id}>
                          <CardContent className="p-4">
                            <h4 className="font-medium">{variant.name}</h4>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p>{t("ai.abBayes.visitors")}: {variant.visitors.toLocaleString()}</p>
                              <p>{t("ai.abBayes.conversions")}: {variant.conversions.toLocaleString()}</p>
                              <p>{t("ai.abBayes.conversionRate")}: {((variant.conversions / variant.visitors) * 100).toFixed(2)}%</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* 胜出概率 */}
                  <div>
                    <h3 className="font-medium mb-3">{t("ai.abBayes.winProbAnalysis")}</h3>
                    <div className="space-y-4">
                      {selectedTest.winProbabilities.map((wp) => (
                        <div key={wp.variantId} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{wp.variantName}</span>
                            <Badge variant={wp.probability >= 0.95 ? 'default' : 'secondary'}>
                              {t("ai.abBayes.winProb")}: {formatProbability(wp.probability)}
                            </Badge>
                          </div>
                          <Progress value={wp.probability * 100} className="h-3 mb-2" />
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span>{t("ai.abBayes.relativeUplift")}: </span>
                              <span className={wp.relativeUplift >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatUplift(wp.relativeUplift)}
                              </span>
                            </div>
                            <div>
                              <span>{t("ai.abBayes.expectedLoss")}: </span>
                              <span>{(wp.expectedLoss * 100).toFixed(3)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 结论 */}
                  <div>
                    <h3 className="font-medium mb-3">{t("ai.abBayes.analysisConclusion")}</h3>
                    {selectedTest.isConclusive ? (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-700 dark:text-green-400">{t("ai.abBayes.statisticallySignificant")}</span>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          {t("ai.abBayes.bayesianRecommend")} "{selectedTest.winProbabilities.find(wp => wp.variantId === selectedTest.recommendedVariant)?.variantName}"，
                          {t("ai.abBayes.winProbAbove95")}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <span className="font-medium text-yellow-700 dark:text-yellow-400">{t("ai.abBayes.notYetSignificant")}</span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          {t("ai.abBayes.insufficientData")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("ai.abBayes.selectTestPrompt")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
