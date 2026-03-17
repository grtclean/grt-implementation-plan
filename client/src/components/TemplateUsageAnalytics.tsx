/**
 * 模板使用统计分析组件
 * 展示报表模板的使用趋势、热度排行和用户活跃度
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Eye,
  Download,
  Copy,
  Clock,
  Calendar,
  Award,
  Activity,
  PieChart,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";

type TimeRange = "7d" | "30d" | "90d" | "365d";

export default function TemplateUsageAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeTab, setActiveTab] = useState("overview");

  // 计算日期范围
  const dateRange = useMemo(() => {
    const endDate = endOfDay(new Date());
    let startDate: Date;
    switch (timeRange) {
      case "7d":
        startDate = startOfDay(subDays(new Date(), 7));
        break;
      case "30d":
        startDate = startOfDay(subDays(new Date(), 30));
        break;
      case "90d":
        startDate = startOfDay(subDays(new Date(), 90));
        break;
      case "365d":
        startDate = startOfDay(subMonths(new Date(), 12));
        break;
      default:
        startDate = startOfDay(subDays(new Date(), 30));
    }
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [timeRange]);

  // 获取统计摘要
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = 
    (trpc.templateUsageStats.getSummary as any).useQuery(dateRange);

  // 获取使用趋势
  const { data: trends, isLoading: trendsLoading } = 
    (trpc.templateUsageStats.getTrends as any).useQuery(dateRange);

  // 获取模板热度排行
  const { data: popularity, isLoading: popularityLoading } = 
    (trpc.templateUsageStats.getPopularity as any).useQuery({ ...dateRange, limit: 10 });

  // 获取用户活跃度
  const { data: userActivity, isLoading: userActivityLoading } = 
    (trpc.templateUsageStats.getUserActivity as any).useQuery({ ...dateRange, limit: 10 });

  // 获取报表类型分布
  const { data: reportTypeDistribution } = 
    (trpc.templateUsageStats.getReportTypeDistribution as any).useQuery(dateRange);

  // 获取小时分布
  const { data: hourlyDistribution } = 
    (trpc.templateUsageStats.getHourlyDistribution as any).useQuery(dateRange);

  const isLoading = summaryLoading || trendsLoading || popularityLoading || userActivityLoading;

  const handleRefresh = () => {
    refetchSummary();
  };

  // 获取操作类型图标
  const getActionIcon = (action: string) => {
    switch (action) {
      case "view":
        return <Eye className="w-4 h-4" />;
      case "use":
        return <FileText className="w-4 h-4" />;
      case "export":
        return <Download className="w-4 h-4" />;
      case "duplicate":
        return <Copy className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // 找出最活跃的小时
  const peakHour = useMemo(() => {
    if (!hourlyDistribution || hourlyDistribution.length === 0) return null;
    return hourlyDistribution.reduce((max: any, curr: any) => 
      curr.count > max.count ? curr : max
    );
  }, [hourlyDistribution]);

  return (
    <div className="space-y-6">
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            模板使用统计
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            分析报表模板的使用情况和趋势
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近30天</SelectItem>
              <SelectItem value="90d">最近90天</SelectItem>
              <SelectItem value="365d">最近一年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 统计摘要卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总使用次数</p>
                <p className="text-2xl font-bold">{(summary as any)?.totalUsage || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              日均 {(summary as any)?.avgDailyUsage || 0} 次
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃用户</p>
                <p className="text-2xl font-bold">{(summary as any)?.uniqueUsers || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              使用 {(summary as any)?.uniqueTemplates || 0} 个模板
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">最热门模板</p>
                <p className="text-lg font-bold truncate max-w-[120px]">
                  {(summary as any)?.mostPopularTemplate?.name || "-"}
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-full">
                <Award className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(summary as any)?.mostPopularTemplate?.count || 0} 次使用
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">高峰时段</p>
                <p className="text-2xl font-bold">
                  {peakHour ? `${peakHour.hour}:00` : "-"}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Clock className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {peakHour?.count || 0} 次操作
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详细分析标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            趋势分析
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            模板排行
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            用户活跃度
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-1">
            <PieChart className="w-4 h-4" />
            分布分析
          </TabsTrigger>
        </TabsList>

        {/* 趋势分析 */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">使用趋势</CardTitle>
              <CardDescription>
                按日期统计模板使用情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : trends && trends.length > 0 ? (
                <div className="space-y-4">
                  {/* 简单的趋势图表 */}
                  <div className="grid grid-cols-4 gap-4 text-center text-sm">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Eye className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                      <p className="font-bold">{(summary as any)?.totalViews || 0}</p>
                      <p className="text-xs text-muted-foreground">查看</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <FileText className="w-5 h-5 mx-auto mb-1 text-green-500" />
                      <p className="font-bold">{(summary as any)?.totalUses || 0}</p>
                      <p className="text-xs text-muted-foreground">使用</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <Download className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                      <p className="font-bold">{(summary as any)?.totalExports || 0}</p>
                      <p className="text-xs text-muted-foreground">导出</p>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <Copy className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                      <p className="font-bold">{(summary as any)?.totalDuplicates || 0}</p>
                      <p className="text-xs text-muted-foreground">复制</p>
                    </div>
                  </div>

                  {/* 趋势列表 */}
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left p-2">日期</th>
                          <th className="text-right p-2">查看</th>
                          <th className="text-right p-2">使用</th>
                          <th className="text-right p-2">导出</th>
                          <th className="text-right p-2">复制</th>
                          <th className="text-right p-2">总计</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trends.slice(-10).reverse().map((trend: any, idx: any) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-2">{trend.date}</td>
                            <td className="text-right p-2">{trend.views}</td>
                            <td className="text-right p-2">{trend.uses}</td>
                            <td className="text-right p-2">{trend.exports}</td>
                            <td className="text-right p-2">{trend.duplicates}</td>
                            <td className="text-right p-2 font-medium">{trend.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Calendar className="w-12 h-12 mb-2" />
                  <p>暂无使用数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 模板排行 */}
        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">模板热度排行</CardTitle>
              <CardDescription>
                按使用次数排序的模板列表
              </CardDescription>
            </CardHeader>
            <CardContent>
              {popularityLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : popularity && popularity.length > 0 ? (
                <div className="space-y-3">
                  {popularity.map((template: any, idx: any) => (
                    <div
                      key={template.templateId}
                      className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? "bg-yellow-500 text-white" :
                        idx === 1 ? "bg-gray-400 text-white" :
                        idx === 2 ? "bg-orange-600 text-white" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{template.templateName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {template.uniqueUsers} 用户
                          </span>
                          {template.lastUsedAt && (
                            <span>
                              最后使用: {format(new Date(template.lastUsedAt), "MM-dd HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Eye className="w-3 h-3" />
                          {template.views}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <FileText className="w-3 h-3" />
                          {template.uses}
                        </Badge>
                        <Badge className="bg-primary">
                          {template.totalUsage}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-2" />
                  <p>暂无模板使用数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户活跃度 */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">用户活跃度排行</CardTitle>
              <CardDescription>
                按操作次数排序的用户列表
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userActivityLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : userActivity && userActivity.length > 0 ? (
                <div className="space-y-3">
                  {userActivity.map((user: any, idx: any) => (
                    <div
                      key={user.userId}
                      className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? "bg-yellow-500 text-white" :
                        idx === 1 ? "bg-gray-400 text-white" :
                        idx === 2 ? "bg-orange-600 text-white" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.userName}</p>
                        {user.lastActiveAt && (
                          <p className="text-xs text-muted-foreground">
                            最后活跃: {format(new Date(user.lastActiveAt), "MM-dd HH:mm")}
                          </p>
                        )}
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={(user.totalActions / (userActivity[0]?.totalActions || 1)) * 100} 
                          className="h-2"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Eye className="w-3 h-3" />
                          {user.views}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <FileText className="w-3 h-3" />
                          {user.uses}
                        </Badge>
                        <Badge className="bg-primary">
                          {user.totalActions}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Users className="w-12 h-12 mb-2" />
                  <p>暂无用户活动数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分布分析 */}
        <TabsContent value="distribution" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 报表类型分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">报表类型分布</CardTitle>
                <CardDescription>
                  各类型报表的使用占比
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportTypeDistribution && reportTypeDistribution.length > 0 ? (
                  <div className="space-y-3">
                    {reportTypeDistribution.map((item: any, idx: any) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.reportType}</span>
                          <span className="text-muted-foreground">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <PieChart className="w-8 h-8 mb-2" />
                    <p className="text-sm">暂无数据</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 小时分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">使用时段分布</CardTitle>
                <CardDescription>
                  24小时内的使用分布
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hourlyDistribution && hourlyDistribution.length > 0 ? (
                  <div className="flex items-end gap-1 h-32">
                    {hourlyDistribution.map((item: any, idx: any) => {
                      const maxCount = Math.max(...hourlyDistribution.map((h: any) => h.count));
                      const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center"
                          title={`${item.hour}:00 - ${item.count}次`}
                        >
                          <div
                            className={`w-full rounded-t ${
                              item.count === maxCount ? "bg-primary" : "bg-primary/40"
                            }`}
                            style={{ height: `${height}%`, minHeight: item.count > 0 ? "4px" : "0" }}
                          />
                          {idx % 4 === 0 && (
                            <span className="text-[10px] text-muted-foreground mt-1">
                              {item.hour}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Clock className="w-8 h-8 mb-2" />
                    <p className="text-sm">暂无数据</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
