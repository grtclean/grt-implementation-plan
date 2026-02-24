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
import { useLanguage } from "@/contexts/LanguageContext";
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

// comparisonTypes and dimensions are defined inside the component to access t()

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
  const { t, tpl } = useLanguage();

  const comparisonTypes = [
    { value: 'month_over_month', label: t("finance.comparison.typeMonthOverMonth"), icon: Calendar },
    { value: 'year_over_year', label: t("finance.comparison.typeYearOverYear"), icon: BarChart3 },
    { value: 'quarter_over_quarter', label: t("finance.comparison.typeQuarterOverQuarter"), icon: PieChart },
  ] as const;

  const dimensions = [
    { value: 'overall', label: t("finance.comparison.dimOverall"), icon: BarChart3 },
    { value: 'department', label: t("finance.comparison.dimDepartment"), icon: Building2 },
    { value: 'employee', label: t("finance.comparison.dimEmployee"), icon: Users },
    { value: 'expense_type', label: t("finance.comparison.dimExpenseType"), icon: Receipt },
    { value: 'destination', label: t("finance.comparison.dimDestination"), icon: MapPin },
  ] as const;

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
        toast.success(t("finance.comparison.exportSuccess"), { description: tpl("finance.comparison.fileDownloaded", { filename: data.filename }) });
      } catch {
        toast.error(t("finance.comparison.exportFailed"), { description: t("finance.comparison.fileFailed") });
      }
      setIsExportDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(t("finance.comparison.exportFailed"), { description: error?.message });
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
        title={t("finance.comparison.title")}
        description={t("finance.comparison.desc")}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t("finance.comparison.refreshBtn")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              {t("finance.comparison.exportBtn")}
            </Button>
          </>
        }
      />

      {/* 筛选条件 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("finance.comparison.comparisonTypeLabel")}</span>
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
              <span className="text-sm text-muted-foreground">{t("finance.comparison.dimensionLabel")}</span>
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
          <TabsTrigger value="comparison">{t("finance.comparison.tabComparison")}</TabsTrigger>
          <TabsTrigger value="trend">{t("finance.comparison.tabTrend")}</TabsTrigger>
          <TabsTrigger value="quarter">{t("finance.comparison.tabQuarter")}</TabsTrigger>
          <TabsTrigger value="ai">{t("finance.comparison.tabAi")}</TabsTrigger>
        </TabsList>

        {/* 对比分析 */}
        <TabsContent value="comparison" className="space-y-4">
          {comparisonData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("finance.comparison.currentPeriod")}</span>
                      <TrendIcon trend={comparisonData.trend} />
                    </div>
                    <div className="text-2xl font-bold font-heading">
                      ¥{(comparisonData.currentPeriod?.totalExpense ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tpl("finance.comparison.tripsCount", { count: comparisonData.currentPeriod?.tripCount ?? 0 })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("finance.comparison.previousPeriod")}</span>
                    </div>
                    <div className="text-2xl font-bold font-heading">
                      ¥{(comparisonData.previousPeriod?.totalExpense ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tpl("finance.comparison.tripsCount", { count: comparisonData.previousPeriod?.tripCount ?? 0 })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("finance.comparison.changeRate")}</span>
                      <Badge variant={(comparisonData.changeRate ?? 0) > 0 ? 'destructive' : 'default'}>
                        {(comparisonData.changeRate ?? 0) > 0 ? '+' : ''}{(comparisonData.changeRate ?? 0).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className={`text-2xl font-bold font-heading ${getChangeColor(comparisonData.changeRate)}`}>
                      {(comparisonData.changeAmount ?? 0) > 0 ? '+' : ''}¥{(comparisonData.changeAmount ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(comparisonData.changeAmount ?? 0) > 0 ? t("finance.comparison.vsLastPeriodUp") : t("finance.comparison.vsLastPeriodDown")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {Array.isArray(comparisonData.breakdown) && comparisonData.breakdown.length > 0 && (
                <Card className="bg-card/50 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">{t("finance.comparison.breakdownTitle")}</CardTitle>
                    <CardDescription>
                      {tpl("finance.comparison.breakdownDesc", { dimension: dimensions.find(d => d.value === dimension)?.label ?? "" })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium">{t("finance.comparison.thName")}</th>
                            <th className="text-right py-3 px-4 font-medium">{t("finance.comparison.thCurrentPeriod")}</th>
                            <th className="text-right py-3 px-4 font-medium">{t("finance.comparison.thPreviousPeriod")}</th>
                            <th className="text-right py-3 px-4 font-medium">{t("finance.comparison.thChangeAmount")}</th>
                            <th className="text-right py-3 px-4 font-medium">{t("finance.comparison.thChangeRate")}</th>
                            <th className="text-center py-3 px-4 font-medium">{t("finance.comparison.thTrend")}</th>
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
                <p className="text-muted-foreground">{t("finance.comparison.noData")}</p>
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
                {t("finance.comparison.monthlyTrend")}
              </CardTitle>
              <CardDescription>{t("finance.comparison.monthlyTrendDesc")}</CardDescription>
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
                          {item.tripCount || 0}{t("finance.comparison.tripsLabel")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("finance.comparison.noTrendData")}</p>
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
                {t("finance.comparison.quarterTitle")}
              </CardTitle>
              <CardDescription>{t("finance.comparison.quarterDesc")}</CardDescription>
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
                            {tpl("finance.comparison.tripsCount", { count: quarter.tripCount || 0 })}
                          </span>
                          {quarter.yoyChange != null && (
                            <Badge variant={quarter.yoyChange > 0 ? 'destructive' : 'default'} className="text-xs">
                              {t("finance.comparison.yoy")} {quarter.yoyChange > 0 ? '+' : ''}{quarter.yoyChange.toFixed(1)}%
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
                  <p className="text-muted-foreground">{t("finance.comparison.noQuarterData")}</p>
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
                {t("finance.comparison.aiTitle")}
              </CardTitle>
              <CardDescription>{t("finance.comparison.aiDesc")}</CardDescription>
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
                  <p className="text-muted-foreground">{t("finance.comparison.noAiData")}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("finance.comparison.aiHint")}
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
              {t("finance.comparison.exportDialogTitle")}
            </DialogTitle>
            <DialogDescription>{t("finance.comparison.exportDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-3">
              <Label>{t("finance.comparison.exportFormat")}</Label>
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
              <Label>{t("finance.comparison.exportContent")}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  />
                  <label htmlFor="includeCharts" className="text-sm font-medium leading-none">
                    {t("finance.comparison.includeTrend")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAiAnalysis"
                    checked={includeAiAnalysis}
                    onCheckedChange={(checked) => setIncludeAiAnalysis(checked as boolean)}
                  />
                  <label htmlFor="includeAiAnalysis" className="text-sm font-medium leading-none">
                    {t("finance.comparison.includeAi")}
                  </label>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="text-muted-foreground mb-2">{t("finance.comparison.currentFilters")}</div>
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
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>{t("finance.comparison.cancelBtn")}</Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{t("finance.comparison.exporting")}</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />{t("finance.comparison.exportReport")}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
