/**
 * 聚合规则效果分析页面
 * v2.5.17 - 消息压缩率、发送频率变化、规则效果对比
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  Zap, 
  Clock, 
  Star,
  ThumbsUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Download,
  Filter,
  ArrowDown,
  ArrowUp,
  Minus
} from 'lucide-react';

// 类型定义
interface AggregationRule {
  id: string;
  name: string;
  type: 'time_window' | 'count_threshold' | 'priority_merge' | 'dedup';
  enabled: boolean;
}

interface RuleStats {
  ruleId: string;
  ruleName: string;
  originalCount: number;
  aggregatedCount: number;
  compressionRate: number;
  savedMessages: number;
  avgBatchSize: number;
  avgDelayMs: number;
}

interface FrequencyChange {
  ruleId: string;
  period: string;
  beforeFrequency: number;
  afterFrequency: number;
  changePercent: number;
}

interface RuleComparison {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  compressionRate: number;
  avgDelay: number;
  userSatisfaction: number;
  effectiveness: number;
  recommendation: string;
}

interface TrendData {
  timestamp: string;
  originalCount: number;
  aggregatedCount: number;
  compressionRate: number;
}

interface AnalyticsReport {
  summary: {
    totalOriginalMessages: number;
    totalAggregatedMessages: number;
    overallCompressionRate: number;
    totalSavedMessages: number;
    avgUserSatisfaction: number;
    topPerformingRule: string;
    improvementSuggestions: string[];
  };
  ruleStats: RuleStats[];
  frequencyChanges: FrequencyChange[];
  ruleComparisons: RuleComparison[];
  trends: TrendData[];
}

// 模拟数据生成
const generateMockReport = (): AnalyticsReport => {
  const rules = [
    { id: 'rule-1', name: '5分钟时间窗口聚合', type: '时间窗口' },
    { id: 'rule-2', name: '10条消息阈值聚合', type: '数量阈值' },
    { id: 'rule-3', name: '优先级合并', type: '优先级合并' },
    { id: 'rule-4', name: '重复消息去重', type: '重复去重' }
  ];

  const ruleStats: RuleStats[] = rules.map(rule => {
    const originalCount = Math.floor(Math.random() * 1000) + 500;
    const compressionRate = 40 + Math.random() * 40;
    const aggregatedCount = Math.floor(originalCount * (1 - compressionRate / 100));
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      originalCount,
      aggregatedCount,
      compressionRate: Math.round(compressionRate * 10) / 10,
      savedMessages: originalCount - aggregatedCount,
      avgBatchSize: Math.floor(originalCount / aggregatedCount),
      avgDelayMs: Math.floor(Math.random() * 180000) + 30000
    };
  });

  const frequencyChanges: FrequencyChange[] = rules.map(rule => {
    const beforeFrequency = 50 + Math.random() * 100;
    const changePercent = -(40 + Math.random() * 40);
    return {
      ruleId: rule.id,
      period: '过去7天',
      beforeFrequency: Math.round(beforeFrequency * 10) / 10,
      afterFrequency: Math.round(beforeFrequency * (1 + changePercent / 100) * 10) / 10,
      changePercent: Math.round(changePercent * 10) / 10
    };
  });

  const ruleComparisons: RuleComparison[] = rules.map(rule => {
    const compressionRate = 40 + Math.random() * 40;
    const avgDelay = Math.floor(Math.random() * 180000) + 30000;
    const userSatisfaction = 3 + Math.random() * 2;
    const effectiveness = 40 + Math.random() * 50;
    
    let recommendation = '';
    if (effectiveness >= 80) recommendation = '效果优秀，建议保持当前配置';
    else if (effectiveness >= 60) recommendation = '效果良好，可考虑微调参数';
    else if (effectiveness >= 40) recommendation = '效果一般，建议优化配置';
    else recommendation = '效果较差，建议禁用或重新设计';

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      compressionRate: Math.round(compressionRate * 10) / 10,
      avgDelay,
      userSatisfaction: Math.round(userSatisfaction * 10) / 10,
      effectiveness: Math.round(effectiveness),
      recommendation
    };
  });

  const trends: TrendData[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 24 * 3600000);
    const originalCount = Math.floor(Math.random() * 500) + 200;
    const compressionRate = 45 + Math.random() * 30;
    return {
      timestamp: date.toISOString(),
      originalCount,
      aggregatedCount: Math.floor(originalCount * (1 - compressionRate / 100)),
      compressionRate: Math.round(compressionRate * 10) / 10
    };
  });

  const totalOriginal = ruleStats.reduce((sum, s) => sum + s.originalCount, 0);
  const totalAggregated = ruleStats.reduce((sum, s) => sum + s.aggregatedCount, 0);
  const overallCompression = ((totalOriginal - totalAggregated) / totalOriginal) * 100;
  const avgSatisfaction = ruleComparisons.reduce((sum, c) => sum + c.userSatisfaction, 0) / ruleComparisons.length;
  const topRule = ruleComparisons.reduce((best, curr) => curr.effectiveness > best.effectiveness ? curr : best);

  return {
    summary: {
      totalOriginalMessages: totalOriginal,
      totalAggregatedMessages: totalAggregated,
      overallCompressionRate: Math.round(overallCompression * 10) / 10,
      totalSavedMessages: totalOriginal - totalAggregated,
      avgUserSatisfaction: Math.round(avgSatisfaction * 10) / 10,
      topPerformingRule: topRule.ruleName,
      improvementSuggestions: [
        '建议增加时间窗口以提高压缩率',
        '可考虑启用重复消息去重规则',
        '监控用户反馈以持续优化'
      ]
    },
    ruleStats,
    frequencyChanges,
    ruleComparisons,
    trends
  };
};

// 效果评分徽章
const EffectivenessBadge = ({ score }: { score: number }) => {
  if (score >= 80) {
    return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">优秀</Badge>;
  } else if (score >= 60) {
    return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">良好</Badge>;
  } else if (score >= 40) {
    return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">一般</Badge>;
  } else {
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">较差</Badge>;
  }
};

// 变化指示器
const ChangeIndicator = ({ value }: { value: number }) => {
  if (value < -5) {
    return (
      <span className="flex items-center text-green-500">
        <ArrowDown className="w-4 h-4 mr-1" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  } else if (value > 5) {
    return (
      <span className="flex items-center text-red-500">
        <ArrowUp className="w-4 h-4 mr-1" />
        {value.toFixed(1)}%
      </span>
    );
  } else {
    return (
      <span className="flex items-center text-muted-foreground">
        <Minus className="w-4 h-4 mr-1" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  }
};

// 趋势图组件
const TrendChart = ({ data }: { data: TrendData[] }) => {
  const maxOriginal = Math.max(...data.map(d => d.originalCount));
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-muted-foreground/50 rounded" />
          原始消息
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-primary rounded" />
          聚合后消息
        </span>
      </div>
      <div className="h-48 flex items-end gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end" style={{ height: '160px' }}>
              <div 
                className="flex-1 bg-muted-foreground/30 rounded-t transition-all"
                style={{ height: `${(item.originalCount / maxOriginal) * 100}%` }}
                title={`原始: ${item.originalCount}`}
              />
              <div 
                className="flex-1 bg-primary rounded-t transition-all"
                style={{ height: `${(item.aggregatedCount / maxOriginal) * 100}%` }}
                title={`聚合后: ${item.aggregatedCount}`}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(item.timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 压缩率图表
const CompressionChart = ({ data }: { data: RuleStats[] }) => {
  const maxRate = 100;
  
  return (
    <div className="space-y-4">
      {data.map(rule => (
        <div key={rule.ruleId} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[200px]">{rule.ruleName}</span>
            <span className="text-primary font-bold">{rule.compressionRate}%</span>
          </div>
          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
              style={{ width: `${(rule.compressionRate / maxRate) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>节省 {rule.savedMessages} 条消息</span>
            <span>平均批次 {rule.avgBatchSize} 条</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// 主组件
export default function AggregationAnalytics() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setReport(generateMockReport());
    } catch (error) {
      console.error('获取分析数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, period]);

  if (isLoading || !report) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            聚合规则效果分析
          </h2>
          <p className="text-muted-foreground">分析消息聚合规则的效果和优化建议</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">今日</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-1" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">整体压缩率</p>
                <p className="text-3xl font-bold text-primary">
                  {report.summary.overallCompressionRate}%
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Zap className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              节省 {report.summary.totalSavedMessages} 条消息
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">原始消息数</p>
                <p className="text-3xl font-bold">
                  {report.summary.totalOriginalMessages.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-full">
                <TrendingUp className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              聚合后 {report.summary.totalAggregatedMessages.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">用户满意度</p>
                <p className="text-3xl font-bold text-yellow-500">
                  {report.summary.avgUserSatisfaction}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star 
                  key={i} 
                  className={`w-3 h-3 ${i <= Math.round(report.summary.avgUserSatisfaction) ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`} 
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">最佳规则</p>
                <p className="text-lg font-bold truncate max-w-[150px]">
                  {report.summary.topPerformingRule}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <ThumbsUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              综合效果最优
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compression" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compression">压缩率分析</TabsTrigger>
          <TabsTrigger value="frequency">频率变化</TabsTrigger>
          <TabsTrigger value="comparison">规则对比</TabsTrigger>
          <TabsTrigger value="trends">趋势图表</TabsTrigger>
          <TabsTrigger value="suggestions">优化建议</TabsTrigger>
        </TabsList>

        {/* 压缩率分析 */}
        <TabsContent value="compression">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  各规则压缩率
                </CardTitle>
                <CardDescription>
                  对比不同聚合规则的消息压缩效果
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompressionChart data={report.ruleStats} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  延迟统计
                </CardTitle>
                <CardDescription>
                  消息聚合导致的平均延迟时间
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.ruleStats.map(rule => (
                    <div key={rule.ruleId} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium truncate max-w-[200px]">{rule.ruleName}</span>
                      <span className={`font-mono ${rule.avgDelayMs > 120000 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {(rule.avgDelayMs / 1000).toFixed(0)}s
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 频率变化 */}
        <TabsContent value="frequency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                发送频率变化
              </CardTitle>
              <CardDescription>
                聚合前后的消息发送频率对比（每小时）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">规则名称</th>
                      <th className="text-right py-3 px-4 font-medium">聚合前</th>
                      <th className="text-right py-3 px-4 font-medium">聚合后</th>
                      <th className="text-right py-3 px-4 font-medium">变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.frequencyChanges.map(change => (
                      <tr key={change.ruleId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4">
                          {report.ruleStats.find(r => r.ruleId === change.ruleId)?.ruleName}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {change.beforeFrequency}/h
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {change.afterFrequency}/h
                        </td>
                        <td className="py-3 px-4 text-right">
                          <ChangeIndicator value={change.changePercent} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 规则对比 */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                规则效果对比
              </CardTitle>
              <CardDescription>
                综合评估各规则的效果和推荐操作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.ruleComparisons.map(comparison => (
                  <div 
                    key={comparison.ruleId}
                    className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comparison.ruleName}</span>
                          <Badge variant="outline">{comparison.ruleType}</Badge>
                        </div>
                      </div>
                      <EffectivenessBadge score={comparison.effectiveness} />
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">压缩率</p>
                        <p className="font-medium text-primary">{comparison.compressionRate}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">平均延迟</p>
                        <p className="font-medium">{(comparison.avgDelay / 1000).toFixed(0)}s</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">满意度</p>
                        <p className="font-medium flex items-center gap-1">
                          {comparison.userSatisfaction}
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">综合评分</p>
                        <p className="font-medium">{comparison.effectiveness}/100</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{comparison.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 趋势图表 */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                消息量趋势
              </CardTitle>
              <CardDescription>
                过去7天的消息量变化趋势
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={report.trends} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 优化建议 */}
        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                优化建议
              </CardTitle>
              <CardDescription>
                基于当前数据分析的改进建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.summary.improvementSuggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="p-2 bg-primary/10 rounded-full">
                      <AlertCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">建议 {index + 1}</p>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
