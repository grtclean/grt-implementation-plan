/**
 * 牙膏试验历史记录和统计分析页面
 */

import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Search, 
  Filter, 
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  PieChart,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// 特征类型名称映射
const featureTypeNames: Record<string, { zh: string; en: string }> = {
  blind_hole: { zh: "盲孔", en: "Blind Hole" },
  reinforcing_rib: { zh: "加强筋", en: "Reinforcing Rib" },
  sealing_surface: { zh: "密封面", en: "Sealing Surface" },
  threaded_hole: { zh: "螺纹孔", en: "Threaded Hole" },
  deep_cavity: { zh: "深腔", en: "Deep Cavity" },
  narrow_gap: { zh: "窄缝", en: "Narrow Gap" },
  complex_channel: { zh: "复杂通道", en: "Complex Channel" },
  precision_surface: { zh: "精密表面", en: "Precision Surface" },
};

export default function ToothpasteTestHistory() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("history");
  const [filters, setFilters] = useState({
    partNumber: "",
    featureType: "",
    result: "",
    startDate: "",
    endDate: "",
  });
  const [periodType, setPeriodType] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | "csv">("excel");

  // 导出报表mutation
  const exportMutation = trpc.capabilityOs.exportToothpasteTestReport.useMutation({
    onSuccess: (rawResult) => {
      const result = rawResult as any;
      if (result.success && result.data) {
        // 创建下载链接
        const blob = result.mimeType === "text/csv;charset=utf-8"
          ? new Blob([result.data], { type: result.mimeType })
          : new Blob([atob(result.data)], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setIsExporting(false);
    },
    onError: () => {
      setIsExporting(false);
    },
  });

  // 导出报表函数
  const handleExport = (format: "excel" | "pdf" | "csv") => {
    setIsExporting(true);
    setExportFormat(format);
    exportMutation.mutate({
      filters: {
        partNumber: filters.partNumber || undefined,
        featureType: filters.featureType || undefined,
        result: filters.result as "pass" | "fail" | "pending" | undefined || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      },
      options: {
        format,
        language: language as "zh" | "en",
        includeStatistics: true,
        includeCharts: format === "pdf",
      },
    });
  };

  // 获取历史记录
  const { data: records, isLoading: loadingRecords } = trpc.capabilityOs.getToothpasteTestRecords.useQuery();

  // 获取统计数据
  const { data: statisticsRaw, isLoading: loadingStats } = trpc.capabilityOs.getToothpasteTestStatistics.useQuery();
  const statistics = statisticsRaw as any;

  // 获取趋势数据
  const { data: trendRaw, isLoading: loadingTrend } = trpc.capabilityOs.getToothpasteTestTrend.useQuery();
  const trend = trendRaw as any;

  // 获取特征类型统计
  const { data: featureStatsRaw, isLoading: loadingFeatureStats } = trpc.capabilityOs.getToothpasteFeatureTypeStats.useQuery();
  const featureStats = featureStatsRaw as any;

  // 获取记录总数
  const { data: totalCountRaw } = trpc.capabilityOs.getToothpasteTestCount.useQuery();
  const totalCount = totalCountRaw as any;

  const getResultBadge = (result: string) => {
    switch (result) {
      case "pass":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            通过
          </Badge>
        );
      case "fail":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            失败
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            待定
          </Badge>
        );
    }
  };

  const getFeatureTypeName = (type: string) => {
    const names = featureTypeNames[type];
    if (names) {
      return language === "zh" ? names.zh : names.en;
    }
    return type;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={FlaskConical}
          title="牙膏试验历史记录"
          description="查看历史试验数据和统计分析"
          actions={
            <>
              <Badge variant="outline" className="text-lg px-3 py-1">
                共 {totalCount?.count || 0} 条记录
              </Badge>
              <Select
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as "excel" | "pdf" | "csv")}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleExport(exportFormat)}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "导出中..." : "导出报表"}
              </Button>
            </>
          }
        />

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              历史记录
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              统计分析
            </TabsTrigger>
            <TabsTrigger value="trend" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              趋势图表
            </TabsTrigger>
          </TabsList>

          {/* 历史记录Tab */}
          <TabsContent value="history" className="space-y-4">
            {/* 筛选器 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="w-4 h-4" />
                  筛选条件
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>零件编号</Label>
                    <Input
                      placeholder="输入零件编号"
                      value={filters.partNumber}
                      onChange={(e) => setFilters({ ...filters, partNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>特征类型</Label>
                    <Select
                      value={filters.featureType}
                      onValueChange={(value) => setFilters({ ...filters, featureType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">全部类型</SelectItem>
                        {Object.entries(featureTypeNames).map(([key, names]) => (
                          <SelectItem key={key} value={key}>
                            {language === "zh" ? names.zh : names.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>结果</Label>
                    <Select
                      value={filters.result}
                      onValueChange={(value) => setFilters({ ...filters, result: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="全部结果" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">全部结果</SelectItem>
                        <SelectItem value="pass">通过</SelectItem>
                        <SelectItem value="fail">失败</SelectItem>
                        <SelectItem value="pending">待定</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>开始日期</Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>结束日期</Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 记录列表 */}
            <Card>
              <CardContent className="p-0">
                {loadingRecords ? (
                  <div className="text-center py-8 text-muted-foreground">
                    加载中...
                  </div>
                ) : records && records.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>零件编号</TableHead>
                        <TableHead>特征类型</TableHead>
                        <TableHead>残留率</TableHead>
                        <TableHead>阈值</TableHead>
                        <TableHead>结果</TableHead>
                        <TableHead>测试人</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {format(new Date(record.testDate), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                          </TableCell>
                          <TableCell className="font-mono">{record.partNumber}</TableCell>
                          <TableCell>{getFeatureTypeName(record.featureType)}</TableCell>
                          <TableCell>{record.residueRate?.toFixed(2) || "-"}%</TableCell>
                          <TableCell>{record.threshold?.toFixed(2) || "5.00"}%</TableCell>
                          <TableCell>{getResultBadge(record.result)}</TableCell>
                          <TableCell>{record.testerName || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无试验记录
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 统计分析Tab */}
          <TabsContent value="statistics" className="space-y-4">
            {/* 周期选择 */}
            <div className="flex items-center gap-4">
              <Label>统计周期:</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">按日</SelectItem>
                  <SelectItem value="weekly">按周</SelectItem>
                  <SelectItem value="monthly">按月</SelectItem>
                  <SelectItem value="yearly">按年</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="总测试数" value={statistics?.totalTests || 0} iconColor="text-blue-500" iconBg="bg-blue-50" />
              <StatCard icon={CheckCircle2} label="通过数" value={statistics?.passedTests || 0} iconColor="text-green-500" iconBg="bg-green-50" />
              <StatCard icon={XCircle} label="失败数" value={statistics?.failedTests || 0} iconColor="text-red-500" iconBg="bg-red-50" />
              <StatCard icon={Activity} label="通过率" value={`${statistics?.passRate?.toFixed(1) || 0}%`} iconColor="text-primary" iconBg="bg-primary/10" />
            </div>

            {/* 特征类型分布 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    特征类型分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingFeatureStats ? (
                    <div className="text-center py-4 text-muted-foreground">加载中...</div>
                  ) : featureStats && featureStats.length > 0 ? (
                    <div className="space-y-3">
                      {featureStats.map((stat: any) => (
                        <div key={stat.featureType} className="flex items-center justify-between">
                          <span className="font-medium">{getFeatureTypeName(stat.featureType)}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">{stat.totalTests} 次</span>
                            <Badge variant={stat.passRate >= 90 ? "default" : stat.passRate >= 70 ? "secondary" : "destructive"}>
                              {stat.passRate.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">暂无数据</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    常见失败区域
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statistics?.commonFailureAreas && statistics.commonFailureAreas.length > 0 ? (
                    <div className="space-y-3">
                      {statistics.commonFailureAreas.map((area: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="font-medium">{area.area}</span>
                          <Badge variant="destructive">{area.count} 次</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">暂无失败记录</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 趋势图表Tab */}
          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  近30天测试趋势
                </CardTitle>
                <CardDescription>
                  每日测试数量和通过率变化
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTrend ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : trend && trend.length > 0 ? (
                  <div className="space-y-4">
                    {/* 简单的文字趋势展示 */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日期</TableHead>
                          <TableHead>总测试</TableHead>
                          <TableHead>通过</TableHead>
                          <TableHead>失败</TableHead>
                          <TableHead>通过率</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trend.slice(-10).map((item: any) => (
                          <TableRow key={item.date}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.total}</TableCell>
                            <TableCell className="text-green-500">{item.passed}</TableCell>
                            <TableCell className="text-red-500">{item.failed}</TableCell>
                            <TableCell>
                              <Badge variant={item.passRate >= 90 ? "default" : item.passRate >= 70 ? "secondary" : "destructive"}>
                                {item.passRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* 趋势条形图 */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-4">通过率趋势</h4>
                      <div className="flex items-end gap-1 h-32">
                        {trend.slice(-15).map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex-1 bg-primary/20 rounded-t relative group"
                            style={{ height: `${item.passRate}%` }}
                          >
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-primary rounded-t transition-all"
                              style={{ height: `${item.passRate}%` }}
                            />
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {item.passRate.toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">暂无趋势数据</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
