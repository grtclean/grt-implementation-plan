import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart,
  Calendar,
  Building2,
  Users,
  MapPin,
  Receipt,
  Brain,
  RefreshCw,
  Download
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type ComparisonType = 'month_over_month' | 'year_over_year' | 'quarter_over_quarter';
type ComparisonDimension = 'overall' | 'department' | 'employee' | 'expense_type' | 'destination';

// 对比类型选项
const comparisonTypes = [
  { value: 'month_over_month', label: '月环比', icon: Calendar },
  { value: 'year_over_year', label: '年同比', icon: BarChart3 },
  { value: 'quarter_over_quarter', label: '季度环比', icon: PieChart },
] as const;

// 维度选项
const dimensions = [
  { value: 'overall', label: '总体', icon: BarChart3 },
  { value: 'department', label: '按部门', icon: Building2 },
  { value: 'employee', label: '按员工', icon: Users },
  { value: 'expense_type', label: '按费用类型', icon: Receipt },
  { value: 'destination', label: '按目的地', icon: MapPin },
] as const;

// 趋势图标
function TrendIcon({ trend }: { trend?: string }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    default:
      return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
}

// 变化率颜色
function getChangeColor(changeRate?: number) {
  if (!changeRate) return 'text-muted-foreground';
  if (changeRate > 10) return 'text-red-500';
  if (changeRate < -10) return 'text-green-500';
  return 'text-muted-foreground';
}

export default function ExpenseComparison() {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('month_over_month');
  const [dimension, setDimension] = useState<ComparisonDimension>('overall');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'txt'>('excel');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeAiAnalysis, setIncludeAiAnalysis] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 导出报表mutation
  const exportMutation = (trpc.expenseComparisonExport as any).exportReport.useMutation({
    onSuccess: (data: any) => {
      try {
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('导出成功', { description: `文件已下载: ${data.filename}` });
      } catch {
        toast.error('导出失败', { description: '文件处理出错' });
      }
      setIsExportDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('导出失败', { description: error?.message || '未知错误' });
    },
  });

  // 获取对比数据
  const { data: comparisonData, isLoading, refetch } = (trpc.expenseComparison as any).getComparison.useQuery(
    { comparisonType, dimension },
    { retry: false },
  );

  // 获取月度趋势数据
  const { data: trendData } = (trpc.expenseComparison as any).getMonthlyTrend.useQuery(
    { months: 12, dimension },
    { retry: false },
  );

  // 获取季度对比数据
  const { data: quarterData } = (trpc.expenseComparison as any).getQuarterComparison.useQuery(
    { quarters: 4 },
    { retry: false },
  );

  // 骨架屏
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Card className="bg-card/50"><CardContent className="p-4"><Skeleton className="h-10 w-80" /></CardContent></Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50"><CardContent className="p-6"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refetch(); } finally { setIsRefreshing(false); }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dimensionMap: Record<string, string> = {
        'overall': 'total', 'department': 'department', 'employee': 'employee',
        'expense_type': 'category', 'destination': 'destination',
      };
      await exportMutation.mutateAsync({
        comparisonType,
        dimension: dimensionMap[dimension] || 'total',
        format: exportFormat,
        includeCharts,
        includeAiAnalysis,
      });
    } catch { /* handled by onError */ } finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="费用对比分析"
        description="分析出差费用的同比、环比变化趋势"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </>
        }
      />

      {/* 筛选条件 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">对比类型:</span>
              <Select value={comparisonType} onValueChange={(v) => setComparisonType(v as ComparisonType)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {comparisonTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">分析维度:</span>
              <Select value={dimension} onValueChange={(v) => setDimension(v as ComparisonDimension)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dimensions.map((dim) => (
                    <SelectItem key={dim.value} value={dim.value}>
                      <div className="flex items-center gap-2">
                        <dim.icon className="w-4 h-4" />
                        {dim.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">对比分析</TabsTrigger>
          <TabsTrigger value="trend">趋势分析</TabsTrigger>
          <TabsTrigger value="quarter">季度对比</TabsTrigger>
          <TabsTrigger value="ai">AI分析</TabsTrigger>
        </TabsList>

        {/* 对比分析 */}
        <TabsContent value="comparison" className="space-y-4">
          {comparisonData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">当期费用</span>
                      <TrendIcon trend={comparisonData.trend} />
                    </div>
                    <div className="text-2xl font-bold font-heading">
                      ¥{(comparisonData.currentPeriod?.totalExpense ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {comparisonData.currentPeriod?.tripCount ?? 0} 次出差
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">上期费用</span>
                    </div>
                    <div className="text-2xl font-bold font-heading">
                      ¥{(comparisonData.previousPeriod?.totalExpense ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {comparisonData.previousPeriod?.tripCount ?? 0} 次出差
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">变化率</span>
                      <Badge variant={(comparisonData.changeRate ?? 0) > 0 ? 'destructive' : 'default'}>
                        {(comparisonData.changeRate ?? 0) > 0 ? '+' : ''}{(comparisonData.changeRate ?? 0).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className={`text-2xl font-bold font-heading ${getChangeColor(comparisonData.changeRate)}`}>
                      {(comparisonData.changeAmount ?? 0) > 0 ? '+' : ''}¥{(comparisonData.changeAmount ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      较上期{(comparisonData.changeAmount ?? 0) > 0 ? '增加' : '减少'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {Array.isArray(comparisonData.breakdown) && comparisonData.breakdown.length > 0 && (
                <Card className="bg-card/50 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">分解数据</CardTitle>
                    <CardDescription>
                      按{dimensions.find(d => d.value === dimension)?.label}维度的详细对比
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium">名称</th>
                            <th className="text-right py-3 px-4 font-medium">当期费用</th>
                            <th className="text-right py-3 px-4 font-medium">上期费用</th>
                            <th className="text-right py-3 px-4 font-medium">变化量</th>
                            <th className="text-right py-3 px-4 font-medium">变化率</th>
                            <th className="text-center py-3 px-4 font-medium">趋势</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonData.breakdown.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-3 px-4">{item.name}</td>
                              <td className="text-right py-3 px-4">¥{(item.currentValue ?? 0).toLocaleString()}</td>
                              <td className="text-right py-3 px-4">¥{(item.previousValue ?? 0).toLocaleString()}</td>
                              <td className={`text-right py-3 px-4 ${getChangeColor(item.changeRate)}`}>
                                {(item.changeAmount ?? 0) > 0 ? '+' : ''}¥{(item.changeAmount ?? 0).toLocaleString()}
                              </td>
                              <td className={`text-right py-3 px-4 ${getChangeColor(item.changeRate)}`}>
                                {(item.changeRate ?? 0) > 0 ? '+' : ''}{(item.changeRate ?? 0).toFixed(1)}%
                              </td>
                              <td className="text-center py-3 px-4">
                                <TrendIcon trend={item.trend} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无对比数据</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 趋势分析 */}
        <TabsContent value="trend" className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                月度费用趋势
              </CardTitle>
              <CardDescription>近12个月的出差费用变化趋势</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(trendData) && trendData.length > 0 ? (
                <div className="space-y-2">
                  {trendData.map((item: any, index: number) => {
                    const maxExpense = Math.max(...trendData.map((d: any) => d.totalExpense || 0), 1);
                    const percentage = ((item.totalExpense || 0) / maxExpense) * 100;
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-20 text-sm text-muted-foreground">{item.month}</div>
                        <div className="flex-1 h-6 bg-muted/30 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-sm transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-24 text-right text-sm font-medium">
                          ¥{(item.totalExpense || 0).toLocaleString()}
                        </div>
                        <div className="w-16 text-right text-xs text-muted-foreground">
                          {item.tripCount || 0}次
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无趋势数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 季度对比 */}
        <TabsContent value="quarter" className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                季度费用对比
              </CardTitle>
              <CardDescription>近4个季度的费用对比分析</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(quarterData) && quarterData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quarterData.map((quarter: any, index: number) => (
                    <Card key={index} className="bg-muted/20 border-border/50">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">{quarter.quarter}</div>
                        <div className="text-xl font-bold font-heading">
                          ¥{(quarter.totalExpense || 0).toLocaleString()}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {quarter.tripCount || 0} 次出差
                          </span>
                          {quarter.yoyChange != null && (
                            <Badge variant={quarter.yoyChange > 0 ? 'destructive' : 'default'} className="text-xs">
                              同比 {quarter.yoyChange > 0 ? '+' : ''}{quarter.yoyChange.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无季度数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI分析 */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI智能分析
              </CardTitle>
              <CardDescription>基于数据的AI分析结论和建议</CardDescription>
            </CardHeader>
            <CardContent>
              {comparisonData?.aiAnalysis ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                    <p className="whitespace-pre-wrap">{comparisonData.aiAnalysis}</p>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无AI分析结果</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    选择对比类型和维度后，系统将自动生成分析结论
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 导出对话框 */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              导出费用对比报表
            </DialogTitle>
            <DialogDescription>选择导出格式和内容选项</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-3">
              <Label>导出格式</Label>
              <div className="grid grid-cols-3 gap-3">
                {(['excel', 'pdf', 'txt'] as const).map((fmt) => (
                  <Button
                    key={fmt}
                    variant={exportFormat === fmt ? 'default' : 'outline'}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setExportFormat(fmt)}
                  >
                    <span className="text-sm font-medium">{fmt.toUpperCase()}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>导出内容</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  />
                  <label htmlFor="includeCharts" className="text-sm font-medium leading-none">
                    包含趋势数据
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAiAnalysis"
                    checked={includeAiAnalysis}
                    onCheckedChange={(checked) => setIncludeAiAnalysis(checked as boolean)}
                  />
                  <label htmlFor="includeAiAnalysis" className="text-sm font-medium leading-none">
                    包含AI分析结果
                  </label>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="text-muted-foreground mb-2">当前筛选条件:</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {comparisonTypes.find(ct => ct.value === comparisonType)?.label ?? comparisonType}
                </Badge>
                <Badge variant="outline">
                  {dimensions.find(d => d.value === dimension)?.label ?? dimension}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>取消</Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />导出中...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />导出报表</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
