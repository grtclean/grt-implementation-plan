/**
 * 社群消息统计分析页面
 * 功能：消息统计仪表盘、群成员画像、活跃度分析
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Users, MessageSquare, Clock, TrendingUp,
  AlertTriangle, Star, Activity, PieChart, Calendar
} from "lucide-react";

export default function SocialCommunityAnalytics() {
  const { t } = useLanguage();
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");

  // tRPC查询
  const { data: groups } = trpc.socialCommunity.getGroups.useQuery();
  const { data: stats } = trpc.socialCommunityEnhanced.getMessageStats.useQuery({
    groupId: selectedGroup !== "all" ? parseInt(selectedGroup) : undefined,
  });
  const { data: trend } = trpc.socialCommunityEnhanced.getMessageTrend.useQuery({
    groupId: selectedGroup !== "all" ? parseInt(selectedGroup) : undefined,
    days: dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90,
  });
  const { data: influencers } = trpc.socialCommunityEnhanced.getInfluencers.useQuery({
    groupId: selectedGroup !== "all" ? parseInt(selectedGroup) : undefined,
    limit: 10,
  });

  // 计算趋势变化
  const calculateTrendChange = () => {
    if (!trend || trend.length < 2) return 0;
    const recent = trend.slice(-7).reduce((sum: number, d: any) => sum + d.count, 0);
    const previous = trend.slice(-14, -7).reduce((sum: number, d: any) => sum + d.count, 0);
    if (previous === 0) return 100;
    return Math.round(((recent - previous) / previous) * 100);
  };

  const trendChange = calculateTrendChange();

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={BarChart3}
          title={t("common.socialAnalytics.title")}
          description={t("common.socialAnalytics.description")}
          actions={
            <div className="flex gap-2">
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("common.socialAnalytics.selectGroup")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.socialAnalytics.allGroups")}</SelectItem>
                  {groups?.items?.map((group: any) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{t("common.socialAnalytics.last7days")}</SelectItem>
                  <SelectItem value="30d">{t("common.socialAnalytics.last30days")}</SelectItem>
                  <SelectItem value="90d">{t("common.socialAnalytics.last90days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={MessageSquare}
            label={t("common.socialAnalytics.totalMessages")}
            value={stats?.totalMessages || 0}
            subtitle={`${trendChange >= 0 ? '+' : ''}${trendChange}% ${t("common.socialAnalytics.vsLastWeek")}`}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            icon={Activity}
            label={t("common.socialAnalytics.todayMessages")}
            value={stats?.todayMessages || 0}
            subtitle={t("common.socialAnalytics.realtimeUpdate")}
            iconColor="text-green-500"
            iconBg="bg-green-500/10"
          />
          <StatCard
            icon={AlertTriangle}
            label={t("common.socialAnalytics.sensitiveMessages")}
            value={stats?.sensitiveMessages || 0}
            subtitle={`${t("common.socialAnalytics.percentage")} ${stats?.totalMessages ? Math.round((stats.sensitiveMessages / stats.totalMessages) * 100) : 0}%`}
            iconColor="text-yellow-500"
            iconBg="bg-yellow-500/10"
          />
          <StatCard
            icon={Clock}
            label={t("common.socialAnalytics.pendingReply")}
            value={stats?.needsReplyMessages || 0}
            subtitle={`${t("common.socialAnalytics.avgResponse")} ${stats?.avgResponseTime || 0} ${t("common.socialAnalytics.minutes")}`}
            iconColor="text-purple-500"
            iconBg="bg-purple-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 消息趋势图 */}
          <Card className="lg:col-span-2 bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t("common.socialAnalytics.messageTrend")}
              </CardTitle>
              <CardDescription>
                {dateRange === "7d" ? t("common.socialAnalytics.messageTrendDesc7") : dateRange === "30d" ? t("common.socialAnalytics.messageTrendDesc30") : t("common.socialAnalytics.messageTrendDesc90")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-end gap-1">
                {trend?.map((day: any, index: number) => {
                  const maxCount = Math.max(...(trend?.map((d: any) => d.count) || [1]));
                  const height = (day.count / maxCount) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/80 rounded-t hover:bg-primary transition-colors"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                        title={`${day.date}: ${day.count}条消息`}
                      />
                      {trend.length <= 14 && (
                        <span className="text-[10px] text-muted-foreground rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 按小时分布 */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t("common.socialAnalytics.activeTimeSlots")}
              </CardTitle>
              <CardDescription>{t("common.socialAnalytics.hourlyDistribution")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.messagesByHour?.slice(0, 8).map((hour: any) => (
                  <div key={hour.hour} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">
                      {hour.hour.toString().padStart(2, '0')}:00
                    </span>
                    <Progress 
                      value={(hour.count / Math.max(...(stats.messagesByHour?.map((h: any) => h.count) || [1]))) * 100} 
                      className="flex-1 h-2"
                    />
                    <span className="text-xs w-8 text-right">{hour.count}</span>
                  </div>
                ))}
                {(!stats?.messagesByHour || stats.messagesByHour.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("common.socialAnalytics.noData")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 群组消息分布 */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                {t("common.socialAnalytics.groupDistribution")}
              </CardTitle>
              <CardDescription>{t("common.socialAnalytics.groupDistributionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.messagesByGroup?.map((group: any, index: number) => {
                  const total = stats.messagesByGroup.reduce((sum: number, g: any) => sum + g.count, 0);
                  const percentage = total > 0 ? Math.round((group.count / total) * 100) : 0;
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
                  return (
                    <div key={group.groupId} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                      <span className="flex-1 text-sm truncate">{group.groupName}</span>
                      <span className="text-sm font-medium">{group.count}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
                    </div>
                  );
                })}
                {(!stats?.messagesByGroup || stats.messagesByGroup.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("common.socialAnalytics.noData")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 活跃用户排行 */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                {t("common.socialAnalytics.activeUsersRank")}
              </CardTitle>
              <CardDescription>{t("common.socialAnalytics.top10Messages")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {influencers?.map((user: any, index: number) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-yellow-950' :
                      index === 1 ? 'bg-gray-400 text-gray-950' :
                      index === 2 ? 'bg-orange-600 text-orange-950' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name || user.wx_id}</p>
                      <p className="text-xs text-muted-foreground">{user.group_name}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {user.message_count} {t("common.socialAnalytics.messagesUnit")}
                    </Badge>
                  </div>
                ))}
                {(!influencers || influencers.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("common.socialAnalytics.noData")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
