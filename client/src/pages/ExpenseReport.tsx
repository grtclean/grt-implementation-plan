/**
 * 出差费用统计报表页面
 * Trip Expense Report Page
 */

import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart3,
  Download, 
  TrendingUp, 
  TrendingDown,
  Building2,
  Users,
  MapPin,
  FolderOpen,
  Receipt,
  Calendar,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

type ReportDimension = 'department' | 'project' | 'employee' | 'expense_type' | 'destination';

export default function ExpenseReport() {
  const { t, tpl } = useLanguage();

  const getDimensionLabel = (dim: ReportDimension) => {
    switch (dim) {
      case 'department': return t("finance.report.dimDepartment");
      case 'project': return t("finance.report.dimProject");
      case 'employee': return t("finance.report.dimEmployee");
      case 'expense_type': return t("finance.report.dimExpenseType");
      case 'destination': return t("finance.report.dimDestination");
    }
  };

  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [dimension, setDimension] = useState<ReportDimension>('department');

  // 获取报表数据
  const { data: report, isLoading, refetch } = (trpc.expenseReport as any).generateReport.useQuery({
    dateRange,
    dimension,
  });

  // 导出Excel
  const exportMutation = (trpc.expenseReport as any).exportToExcel.useMutation({
    onSuccess: (data: any) => {
      // 下载文件
      const link = document.createElement('a');
      link.href = `data:text/csv;base64,${data.data}`;
      link.download = data.filename;
      link.click();
    },
  });

  // 获取部门排名
  const { data: departmentRanking } = (trpc.expenseReport as any).getDepartmentRanking.useQuery({
    dateRange,
  });

  const handleExport = () => {
    exportMutation.mutate({ dateRange, dimension });
  };

  const getDimensionIcon = (dim: ReportDimension) => {
    switch (dim) {
      case 'department': return <Building2 className="w-4 h-4" />;
      case 'project': return <FolderOpen className="w-4 h-4" />;
      case 'employee': return <Users className="w-4 h-4" />;
      case 'expense_type': return <Receipt className="w-4 h-4" />;
      case 'destination': return <MapPin className="w-4 h-4" />;
    }
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={BarChart3}
          title={t("finance.report.titleFull")}
          description={t("finance.report.descFull")}
          actions={
            <Button onClick={handleExport} disabled={exportMutation.isPending}>
              {exportMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {t("finance.report.exportExcel")}
            </Button>
          }
        />

        {/* 筛选条件 */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{t("finance.report.startDate")}</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("finance.report.endDate")}</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("finance.report.statDimension")}</Label>
                <Select value={dimension} onValueChange={(v) => setDimension(v as ReportDimension)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="department">{t("finance.report.dimDepartment")}</SelectItem>
                    <SelectItem value="project">{t("finance.report.dimProject")}</SelectItem>
                    <SelectItem value="employee">{t("finance.report.dimEmployee")}</SelectItem>
                    <SelectItem value="expense_type">{t("finance.report.dimExpenseType")}</SelectItem>
                    <SelectItem value="destination">{t("finance.report.dimDestination")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => refetch()} className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  {t("finance.report.query")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : report ? (
          <>
            {/* 汇总卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("finance.report.totalBudget")}</p>
                      <p className="text-2xl font-bold">
                        ¥{report.summary.totalBudget.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("finance.report.actualExpense")}</p>
                      <p className="text-2xl font-bold">
                        ¥{report.summary.totalActual.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <Receipt className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("finance.report.varianceAmount")}</p>
                      <p className={`text-2xl font-bold ${report.summary.totalVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {report.summary.totalVariance >= 0 ? '+' : ''}¥{report.summary.totalVariance.toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${report.summary.totalVariance >= 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      {report.summary.totalVariance >= 0 ? (
                        <TrendingUp className="w-6 h-6 text-red-600" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("finance.report.tripCount")}</p>
                      <p className="text-2xl font-bold">{report.summary.tripCount}</p>
                      <p className="text-xs text-muted-foreground">
                        {tpl("finance.report.avgPerTrip", { amount: report.summary.avgExpensePerTrip.toFixed(0) })}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <MapPin className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 预算使用率 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("finance.report.budgetUsage")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("finance.report.used")}</span>
                    <span className={report.summary.budgetUtilization > 100 ? 'text-red-600' : ''}>
                      {report.summary.budgetUtilization.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(report.summary.budgetUtilization, 100)} 
                    className={report.summary.budgetUtilization > 100 ? '[&>div]:bg-red-500' : ''}
                  />
                  {report.summary.budgetUtilization > 100 && (
                    <p className="text-sm text-red-600">
                      {tpl("finance.report.exceededBudget", { percent: (report.summary.budgetUtilization - 100).toFixed(1) })}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 详细数据 */}
            <Tabs defaultValue="dimension" className="space-y-4">
              <TabsList>
                <TabsTrigger value="dimension" className="flex items-center gap-2">
                  {getDimensionIcon(dimension)}
                  {getDimensionLabel(dimension)}
                </TabsTrigger>
                <TabsTrigger value="expense_type" className="flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  {t("finance.report.expenseType")}
                </TabsTrigger>
                <TabsTrigger value="trend" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t("finance.report.trend")}
                </TabsTrigger>
                <TabsTrigger value="ranking" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {t("finance.report.departmentRanking")}
                </TabsTrigger>
              </TabsList>

              {/* 按维度统计 */}
              <TabsContent value="dimension">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getDimensionIcon(dimension)}
                      {tpl("finance.report.dimStats", { dimension: getDimensionLabel(dimension) })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">{t("finance.report.thCategory")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thBudget")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thActual")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thVariance")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thVarianceRate")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thTrips")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thAvgExpense")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.byDimension.map((item: any, index: any) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-4 font-medium">{item.dimensionLabel}</td>
                              <td className="text-right py-3 px-4">¥{item.totalBudget.toLocaleString()}</td>
                              <td className="text-right py-3 px-4">¥{item.totalActual.toLocaleString()}</td>
                              <td className={`text-right py-3 px-4 ${item.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {item.variance >= 0 ? '+' : ''}¥{item.variance.toLocaleString()}
                              </td>
                              <td className="text-right py-3 px-4">
                                <Badge variant={item.varianceRate > 10 ? 'destructive' : item.varianceRate < -10 ? 'default' : 'secondary'}>
                                  {item.varianceRate >= 0 ? '+' : ''}{item.varianceRate.toFixed(1)}%
                                </Badge>
                              </td>
                              <td className="text-right py-3 px-4">{item.tripCount}</td>
                              <td className="text-right py-3 px-4">¥{item.avgExpensePerTrip.toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 费用类型分布 */}
              <TabsContent value="expense_type">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      {t("finance.report.expenseDistribution")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {report.byExpenseType.map((item: any, index: any) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{item.typeLabel}</span>
                            <span>¥{item.amount.toLocaleString()} ({item.percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={item.percentage} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 趋势分析 */}
              <TabsContent value="trend">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {t("finance.report.monthlyTrend")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">{t("finance.report.thMonth")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thBudget")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thActual")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thTrips")}</th>
                            <th className="text-right py-3 px-4">{t("finance.report.thTrendCol")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.trend.map((item: any, index: any) => {
                            const prevActual = index > 0 ? report.trend[index - 1].actual : item.actual;
                            const trend = prevActual > 0 ? ((item.actual - prevActual) / prevActual) * 100 : 0;
                            return (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="py-3 px-4 font-medium">{item.period}</td>
                                <td className="text-right py-3 px-4">¥{item.budget.toLocaleString()}</td>
                                <td className="text-right py-3 px-4">¥{item.actual.toLocaleString()}</td>
                                <td className="text-right py-3 px-4">{item.tripCount}</td>
                                <td className="text-right py-3 px-4">
                                  {index > 0 && (
                                    <span className={`flex items-center justify-end gap-1 ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                      {Math.abs(trend).toFixed(1)}%
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 部门排名 */}
              <TabsContent value="ranking">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      {t("finance.report.deptExpenseRanking")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {departmentRanking?.map((item: any) => (
                        <div key={item.department} className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            item.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            item.rank === 2 ? 'bg-gray-100 text-gray-700' :
                            item.rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {item.rank}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">{item.department}</span>
                              <span>¥{item.totalExpense.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>{tpl("finance.report.tripsAndAvg", { count: item.tripCount })}</span>
                              <span>{tpl("finance.report.avgLabel", { amount: item.avgExpense.toFixed(0) })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* 费用最高出差 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("finance.report.topExpenses")}</CardTitle>
                <CardDescription>{t("finance.report.topExpensesDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">{t("finance.report.thRank")}</th>
                        <th className="text-left py-3 px-4">{t("finance.report.thEmployee")}</th>
                        <th className="text-left py-3 px-4">{t("finance.report.thDepartment")}</th>
                        <th className="text-left py-3 px-4">{t("finance.report.thDestination")}</th>
                        <th className="text-right py-3 px-4">{t("finance.report.thAmount")}</th>
                        <th className="text-left py-3 px-4">{t("finance.report.thTripDate")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.topExpenses.map((item: any, index: any) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <Badge variant={index < 3 ? 'default' : 'secondary'}>
                              #{index + 1}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-medium">{item.employeeName}</td>
                          <td className="py-3 px-4">{item.department}</td>
                          <td className="py-3 px-4">{item.destination}</td>
                          <td className="text-right py-3 px-4 font-bold">¥{item.amount.toLocaleString()}</td>
                          <td className="py-3 px-4">{item.tripDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("finance.report.noDataRetry")}
            </CardContent>
          </Card>
        )}
      </div>
  );
}
