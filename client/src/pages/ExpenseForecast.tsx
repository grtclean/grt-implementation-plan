import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ExpenseForecastSkeleton } from "@/components/PageSkeleton";
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  DollarSign,
  BarChart3,
  RefreshCw,
  Brain,
  Lightbulb,
  AlertCircle,
  ChevronRight,
  Target,
  Activity
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

type ForecastType = 'monthly' | 'quarterly' | 'yearly';
type ForecastDimension = 'total' | 'department' | 'category' | 'destination';

interface ForecastResult {
  period: string;
  predictedAmount: number;
  confidenceLevel: number;
  trend: 'up' | 'down' | 'stable';
  changeRate: number;
  factors: string[];
}

interface ForecastSummary {
  forecastType: ForecastType;
  dimension: ForecastDimension;
  generatedAt: string;
  forecasts: ForecastResult[];
  totalPredicted: number;
  averageConfidence: number;
  aiAnalysis: string;
  recommendations: string[];
}

export default function ExpenseForecast() {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [forecastType, setForecastType] = useState<ForecastType>('monthly');
  const [dimension, setDimension] = useState<ForecastDimension>('total');
  const [periodsAhead, setPeriodsAhead] = useState(6);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取预测数据
  const { data: monthlyForecast, isLoading: isLoadingMonthly, refetch: refetchMonthly } = 
    (trpc.expenseForecast as any).getMonthlyForecast.useQuery({
      monthsAhead: periodsAhead,
      dimension,
    }, { enabled: forecastType === 'monthly' });

  const { data: quarterlyForecast, isLoading: isLoadingQuarterly, refetch: refetchQuarterly } = 
    (trpc.expenseForecast as any).getQuarterlyForecast.useQuery({
      quartersAhead: Math.min(periodsAhead, 8),
      dimension,
    }, { enabled: forecastType === 'quarterly' });

  const { data: yearlyForecast, isLoading: isLoadingYearly, refetch: refetchYearly } = 
    (trpc.expenseForecast as any).getYearlyForecast.useQuery({
      yearsAhead: Math.min(periodsAhead, 5),
      dimension,
    }, { enabled: forecastType === 'yearly' });

  const currentForecast = useMemo(() => {
    switch (forecastType) {
      case 'monthly':
        return monthlyForecast;
      case 'quarterly':
        return quarterlyForecast;
      case 'yearly':
        return yearlyForecast;
      default:
        return null;
    }
  }, [forecastType, monthlyForecast, quarterlyForecast, yearlyForecast]);

  const isLoading = forecastType === 'monthly' ? isLoadingMonthly :
                    forecastType === 'quarterly' ? isLoadingQuarterly : isLoadingYearly;

  // 显示骨架屏
  if (isLoading) {
    return (
      <Layout>
        <ExpenseForecastSkeleton />
      </Layout>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    switch (forecastType) {
      case 'monthly':
        await refetchMonthly();
        break;
      case 'quarterly':
        await refetchQuarterly();
        break;
      case 'yearly':
        await refetchYearly();
        break;
    }
    setIsRefreshing(false);
  };

  // 趋势图标
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // 趋势颜色
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-red-500';
      case 'down':
        return 'text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  // 置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/10 text-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500/10 text-yellow-500';
    return 'bg-red-500/10 text-red-500';
  };

  // 图表数据
  const chartData = useMemo(() => {
    if (!currentForecast?.forecasts) return [];
    return currentForecast.forecasts.map((f: ForecastResult) => ({
      period: f.period,
      predicted: f.predictedAmount,
      confidence: f.confidenceLevel * 100,
      changeRate: f.changeRate,
    }));
  }, [currentForecast]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Brain}
          title="出差费用预测"
          description="基于历史数据和AI模型预测未来出差费用"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          }
        />

        {/* 筛选条件 */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">预测类型:</span>
                <Select value={forecastType} onValueChange={(v) => setForecastType(v as ForecastType)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">月度</SelectItem>
                    <SelectItem value="quarterly">季度</SelectItem>
                    <SelectItem value="yearly">年度</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">预测维度:</span>
                <Select value={dimension} onValueChange={(v) => setDimension(v as ForecastDimension)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">总体</SelectItem>
                    <SelectItem value="department">部门</SelectItem>
                    <SelectItem value="category">费用类型</SelectItem>
                    <SelectItem value="destination">目的地</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">预测期数:</span>
                <Select value={String(periodsAhead)} onValueChange={(v) => setPeriodsAhead(Number(v))}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : currentForecast && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="预测总额" value={`¥${currentForecast.totalPredicted?.toLocaleString()}`} iconColor="text-primary" iconBg="bg-primary/10" />
            <StatCard icon={Target} label="平均置信度" value={`${(currentForecast.averageConfidence * 100).toFixed(1)}%`} iconColor="text-green-500" iconBg="bg-green-500/10" />
            <StatCard icon={Calendar} label="预测期数" value={currentForecast.forecasts?.length || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
            <StatCard icon={Activity} label="生成时间" value={currentForecast.generatedAt ? new Date(currentForecast.generatedAt).toLocaleString() : '-'} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          </div>
        )}

        {/* 预测图表和详情 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 预测趋势图 */}
          <Card className="lg:col-span-2 bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                预测趋势
              </CardTitle>
              <CardDescription>
                {forecastType === 'monthly' ? '月度' : forecastType === 'quarterly' ? '季度' : '年度'}费用预测趋势图
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'predicted') return [`¥${value.toLocaleString()}`, '预测金额'];
                        if (name === 'confidence') return [`${value.toFixed(1)}%`, '置信度'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      name="预测金额"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  暂无预测数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI分析 */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : currentForecast?.aiAnalysis ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentForecast.aiAnalysis}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">暂无AI分析</p>
              )}

              {/* 建议 */}
              {currentForecast?.recommendations && currentForecast.recommendations.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    建议
                  </h4>
                  <ul className="space-y-2">
                    {currentForecast.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 预测详情列表 */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">预测详情</CardTitle>
            <CardDescription>
              各期预测金额、置信度和影响因素
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-border/50 rounded-lg">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            ) : currentForecast?.forecasts && currentForecast.forecasts.length > 0 ? (
              <div className="space-y-4">
                {currentForecast.forecasts.map((forecast: ForecastResult, index: number) => (
                  <div
                    key={index}
                    className="p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{forecast.period}</span>
                          <Badge className={getConfidenceColor(forecast.confidenceLevel)}>
                            置信度 {(forecast.confidenceLevel * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold font-heading">
                            ¥{forecast.predictedAmount?.toLocaleString()}
                          </span>
                          <div className={`flex items-center gap-1 ${getTrendColor(forecast.trend)}`}>
                            {getTrendIcon(forecast.trend)}
                            <span className="text-sm font-medium">
                              {forecast.changeRate > 0 ? '+' : ''}{forecast.changeRate?.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {forecast.factors && forecast.factors.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {forecast.factors.map((factor: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无预测数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 置信度说明 */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              置信度说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium">高置信度 (≥80%)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  历史数据稳定，预测结果可靠性高，可作为预算规划的主要参考
                </p>
              </div>
              <div className="p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="font-medium">中置信度 (60-80%)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  历史数据有一定波动，预测结果仅供参考，建议结合实际情况调整
                </p>
              </div>
              <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-medium">低置信度 (&lt;60%)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  历史数据波动较大，预测结果不确定性高，需谨慎使用
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
