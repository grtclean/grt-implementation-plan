/**
 * BU事业部绩效看板页面
 * 展示各事业部的项目数量、营收、人员利用率等KPI指标
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Users,
  FolderKanban,
  DollarSign,
  Clock,
  CheckCircle2,
  Star,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Percent
} from "lucide-react";

// BU颜色配置
const BU_COLORS: Record<string, { bg: string; text: string; border: string; chart: string }> = {
  'BU1': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', chart: '#3b82f6' },
  'BU2': { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30', chart: '#22c55e' },
  'BU3': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30', chart: '#a855f7' },
  'BU4': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30', chart: '#f97316' },
  'BU5': { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30', chart: '#06b6d4' },
};

// BU名称映射
const BU_NAMES: Record<string, string> = {
  'BU1': '海外事业部',
  'BU2': '商用车事业部',
  'BU3': '乘用车事业部',
  'BU4': '半导体事业部',
  'BU5': '工业通用事业部',
};

// 获取当前月份
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 获取周期选项
function getPeriodOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  
  // 最近12个月
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    options.push({ value, label });
  }
  
  return options;
}

// KPI卡片组件
function KPICard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'primary'
}: { 
  title: string; 
  value: number | string; 
  unit?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                 trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}/10`}>
            <Icon className={`h-6 w-6 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 进度条组件
function ProgressBar({ value, max = 100, color = 'primary' }: { value: number; max?: number; color?: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div 
        className={`h-2 rounded-full bg-${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function BUPerformanceDashboard() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [selectedBU, setSelectedBU] = useState<string | null>(null);
  
  const periodOptions = useMemo(() => getPeriodOptions(), []);

  // 获取所有BU信息
  const { data: busData } = trpc.buMapping.getAllBUs.useQuery();
  
  // 获取绩效统计
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = trpc.buMapping.getPerformanceStats.useQuery({
    period: selectedPeriod,
    periodType: 'monthly',
  });

  // 初始化示例数据
  const initSampleDataMutation = trpc.buMapping.initSamplePerformanceData.useMutation({
    onSuccess: (data) => {
      toast({
        title: "示例数据初始化成功",
        description: `已创建 ${data.created} 条绩效记录`,
      });
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "初始化失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 计算汇总数据
  const summaryData = useMemo(() => {
    if (!statsData?.stats || statsData.stats.length === 0) {
      return null;
    }
    
    const stats = selectedBU 
      ? statsData.stats.filter(s => s.buCode === selectedBU)
      : statsData.stats;
    
    return {
      totalProjects: stats.reduce((sum, s) => sum + s.projectCount, 0),
      activeProjects: stats.reduce((sum, s) => sum + s.activeProjectCount, 0),
      completedProjects: stats.reduce((sum, s) => sum + s.completedProjectCount, 0),
      totalRevenue: stats.reduce((sum, s) => sum + s.totalRevenue, 0),
      totalCost: stats.reduce((sum, s) => sum + s.totalCost, 0),
      grossProfit: stats.reduce((sum, s) => sum + s.grossProfit, 0),
      avgGrossMargin: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.grossMargin, 0) / stats.length 
        : 0,
      totalTeamSize: stats.reduce((sum, s) => sum + s.teamSize, 0),
      avgUtilization: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.utilizationRate, 0) / stats.length 
        : 0,
      avgOnTimeDelivery: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.onTimeDeliveryRate, 0) / stats.length 
        : 0,
      avgSatisfaction: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.customerSatisfaction, 0) / stats.length 
        : 0,
    };
  }, [statsData, selectedBU]);

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Building2}
          title="BU事业部绩效看板"
          description="查看各事业部的项目数量、营收、人员利用率等KPI指标"
          actions={
            <div className="flex gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="选择周期" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedBU || 'all'} onValueChange={(v) => setSelectedBU(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="选择事业部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部事业部</SelectItem>
                  {busData?.bus.map((bu) => (
                    <SelectItem key={bu.code} value={bu.code}>{bu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetchStats()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
              {(!statsData?.stats || statsData.stats.length === 0) && (
                <Button
                  onClick={() => initSampleDataMutation.mutate()}
                  disabled={initSampleDataMutation.isPending}
                >
                  {initSampleDataMutation.isPending ? "初始化中..." : "初始化示例数据"}
                </Button>
              )}
            </div>
          }
        />

        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !summaryData ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无绩效数据</p>
              <p className="text-sm text-muted-foreground mt-2">
                点击"初始化示例数据"按钮生成示例绩效数据
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 汇总KPI卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard 
                title="总项目数" 
                value={summaryData.totalProjects} 
                unit="个"
                icon={FolderKanban}
                trend="up"
                trendValue={`进行中 ${summaryData.activeProjects} 个`}
              />
              <KPICard 
                title="总营收" 
                value={summaryData.totalRevenue.toFixed(0)} 
                unit="万元"
                icon={DollarSign}
                trend="up"
                trendValue={`毛利 ${summaryData.grossProfit.toFixed(0)} 万元`}
              />
              <KPICard 
                title="团队规模" 
                value={summaryData.totalTeamSize} 
                unit="人"
                icon={Users}
                trend="neutral"
                trendValue={`利用率 ${summaryData.avgUtilization.toFixed(1)}%`}
              />
              <KPICard 
                title="客户满意度" 
                value={summaryData.avgSatisfaction.toFixed(1)} 
                unit="分"
                icon={Star}
                trend={summaryData.avgSatisfaction >= 4.5 ? 'up' : summaryData.avgSatisfaction >= 4 ? 'neutral' : 'down'}
                trendValue={summaryData.avgSatisfaction >= 4.5 ? '优秀' : summaryData.avgSatisfaction >= 4 ? '良好' : '待提升'}
              />
            </div>

            {/* 各BU绩效详情 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {statsData?.stats
                .filter(stat => !selectedBU || stat.buCode === selectedBU)
                .map((stat) => {
                  const colors = BU_COLORS[stat.buCode] || BU_COLORS['BU1'];
                  const buName = BU_NAMES[stat.buCode] || stat.buCode;
                  
                  return (
                    <Card key={stat.buCode} className={`${colors.border} border-l-4`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={`${colors.bg} ${colors.text}`}>{stat.buCode}</Badge>
                            <CardTitle className="text-lg">{buName}</CardTitle>
                          </div>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {stat.teamSize} 人
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* 项目统计 */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-2xl font-bold">{stat.projectCount}</p>
                            <p className="text-xs text-muted-foreground">总项目</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-2xl font-bold text-blue-500">{stat.activeProjectCount}</p>
                            <p className="text-xs text-muted-foreground">进行中</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-2xl font-bold text-green-500">{stat.completedProjectCount}</p>
                            <p className="text-xs text-muted-foreground">已完成</p>
                          </div>
                        </div>

                        {/* 财务指标 */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">营收</span>
                            <span className="font-medium">{stat.totalRevenue.toFixed(0)} 万元</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">成本</span>
                            <span className="font-medium">{stat.totalCost.toFixed(0)} 万元</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">毛利润</span>
                            <span className="font-medium text-green-500">{stat.grossProfit.toFixed(0)} 万元</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">毛利率</span>
                            <span className="font-medium">{stat.grossMargin.toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* 效率指标 */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                人员利用率
                              </span>
                              <span className="font-medium">{stat.utilizationRate.toFixed(1)}%</span>
                            </div>
                            <ProgressBar value={stat.utilizationRate} color="blue-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                准时交付率
                              </span>
                              <span className="font-medium">{stat.onTimeDeliveryRate.toFixed(1)}%</span>
                            </div>
                            <ProgressBar value={stat.onTimeDeliveryRate} color="green-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                客户满意度
                              </span>
                              <span className="font-medium">{stat.customerSatisfaction.toFixed(1)} / 5.0</span>
                            </div>
                            <ProgressBar value={stat.customerSatisfaction * 20} color="yellow-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>

            {/* BU对比表格 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  事业部绩效对比
                </CardTitle>
                <CardDescription>
                  {selectedPeriod.replace('-', '年')}月各事业部关键指标对比
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">事业部</th>
                        <th className="text-right py-3 px-2">项目数</th>
                        <th className="text-right py-3 px-2">营收(万)</th>
                        <th className="text-right py-3 px-2">毛利率</th>
                        <th className="text-right py-3 px-2">团队</th>
                        <th className="text-right py-3 px-2">利用率</th>
                        <th className="text-right py-3 px-2">交付率</th>
                        <th className="text-right py-3 px-2">满意度</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData?.stats
                        .filter(stat => !selectedBU || stat.buCode === selectedBU)
                        .map((stat) => {
                          const colors = BU_COLORS[stat.buCode] || BU_COLORS['BU1'];
                          const buName = BU_NAMES[stat.buCode] || stat.buCode;
                          
                          return (
                            <tr key={stat.buCode} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={`${colors.bg} ${colors.text}`}>{stat.buCode}</Badge>
                                  <span>{buName}</span>
                                </div>
                              </td>
                              <td className="text-right py-3 px-2">{stat.projectCount}</td>
                              <td className="text-right py-3 px-2">{stat.totalRevenue.toFixed(0)}</td>
                              <td className="text-right py-3 px-2">
                                <span className={stat.grossMargin >= 30 ? 'text-green-500' : stat.grossMargin >= 20 ? 'text-yellow-500' : 'text-red-500'}>
                                  {stat.grossMargin.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-right py-3 px-2">{stat.teamSize}</td>
                              <td className="text-right py-3 px-2">
                                <span className={stat.utilizationRate >= 80 ? 'text-green-500' : stat.utilizationRate >= 70 ? 'text-yellow-500' : 'text-red-500'}>
                                  {stat.utilizationRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-right py-3 px-2">
                                <span className={stat.onTimeDeliveryRate >= 90 ? 'text-green-500' : stat.onTimeDeliveryRate >= 80 ? 'text-yellow-500' : 'text-red-500'}>
                                  {stat.onTimeDeliveryRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="text-right py-3 px-2">
                                <div className="flex items-center justify-end gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  {stat.customerSatisfaction.toFixed(1)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
  );
}
