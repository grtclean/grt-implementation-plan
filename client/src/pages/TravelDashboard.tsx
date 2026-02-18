/**
 * 出差数据大屏
 * 实时展示全公司出差人员分布、费用趋势、预算使用情况等关键指标
 */

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  Plane, 
  DollarSign, 
  TrendingUp, 
  MapPin, 
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Clock,
  Building2,
  Globe,
  Activity
} from "lucide-react";

// 模拟数据（实际应从API获取）
const mockDashboardData = {
  // 实时出差人数
  travelingNow: 23,
  travelingDomestic: 18,
  travelingInternational: 5,
  
  // 本月统计
  monthlyTrips: 156,
  monthlyBudget: 850000,
  monthlyActual: 720000,
  monthlyBudgetUsage: 84.7,
  
  // 预算预警
  warningCount: 3,
  exceededCount: 2,
  criticalCount: 1,
  
  // 部门分布
  departmentDistribution: [
    { name: "销售部", count: 8, budget: 250000, actual: 210000 },
    { name: "技术部", count: 6, budget: 180000, actual: 165000 },
    { name: "市场部", count: 4, budget: 120000, actual: 98000 },
    { name: "售后部", count: 3, budget: 150000, actual: 142000 },
    { name: "管理层", count: 2, budget: 150000, actual: 105000 }
  ],
  
  // 目的地分布
  destinationDistribution: [
    { city: "上海", count: 5, color: "#f97316" },
    { city: "北京", count: 4, color: "#3b82f6" },
    { city: "深圳", count: 3, color: "#22c55e" },
    { city: "广州", count: 3, color: "#a855f7" },
    { city: "成都", count: 2, color: "#ec4899" },
    { city: "海外", count: 5, color: "#14b8a6" }
  ],
  
  // 费用趋势（近6个月）
  expenseTrend: [
    { month: "8月", budget: 750000, actual: 680000 },
    { month: "9月", budget: 800000, actual: 720000 },
    { month: "10月", budget: 820000, actual: 790000 },
    { month: "11月", budget: 850000, actual: 810000 },
    { month: "12月", budget: 900000, actual: 850000 },
    { month: "1月", budget: 850000, actual: 720000 }
  ],
  
  // 最近出差动态
  recentActivities: [
    { id: 1, name: "张三", destination: "上海", status: "traveling", time: "2小时前" },
    { id: 2, name: "李四", destination: "北京", status: "arrived", time: "4小时前" },
    { id: 3, name: "王五", destination: "深圳", status: "returning", time: "6小时前" },
    { id: 4, name: "赵六", destination: "德国", status: "traveling", time: "1天前" },
    { id: 5, name: "钱七", destination: "日本", status: "completed", time: "2天前" }
  ]
};

// 刷新间隔选项
const REFRESH_INTERVALS = [
  { label: '关闭', value: 0 },
  { label: '30秒', value: 30000 },
  { label: '1分钟', value: 60000 },
  { label: '5分钟', value: 300000 },
  { label: '10分钟', value: 600000 }
];

export default function TravelDashboard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [data, setData] = useState(mockDashboardData);
  const [refreshInterval, setRefreshInterval] = useState(60000); // 默认1分钟
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 手动刷新数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 实际项目中应调用API获取最新数据
      // const newData = await trpc.travelDashboard.getData.query();
      // setData(newData);
      
      // 模拟刷新延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 自动刷新
  useEffect(() => {
    if (refreshInterval === 0) return;
    
    const timer = setInterval(() => {
      handleRefresh();
    }, refreshInterval);
    
    return () => clearInterval(timer);
  }, [refreshInterval]);

  // 获取刷新间隔标签
  const getRefreshIntervalLabel = () => {
    const interval = REFRESH_INTERVALS.find(i => i.value === refreshInterval);
    return interval ? interval.label : '自定义';
  };

  // 计算上次刷新时间
  const getTimeSinceLastRefresh = () => {
    const seconds = Math.floor((currentTime.getTime() - lastRefresh.getTime()) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    return `${Math.floor(minutes / 60)}小时前`;
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'traveling': return 'bg-blue-500';
      case 'arrived': return 'bg-green-500';
      case 'returning': return 'bg-yellow-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'traveling': return '出行中';
      case 'arrived': return '已到达';
      case 'returning': return '返程中';
      case 'completed': return '已完成';
      default: return '未知';
    }
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-6">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <PageHeader
            icon={Globe}
            title="出差数据大屏"
            description="Travel Management Dashboard"
          />

          <div className="flex items-center gap-4">
            {/* 时间显示 */}
            <div className="text-right">
              <div className="text-2xl font-mono text-orange-400">
                {currentTime.toLocaleTimeString('zh-CN', { hour12: false })}
              </div>
              <div className="text-sm text-slate-400">
                {currentTime.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            
            {/* 刷新状态指示器 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${refreshInterval > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-xs text-slate-400">
                {refreshInterval > 0 ? `自动刷新: ${getRefreshIntervalLabel()}` : '自动刷新: 关闭'}
              </span>
              <span className="text-xs text-slate-500">| 上次: {getTimeSinceLastRefresh()}</span>
            </div>
            
            {/* 刷新间隔选择器 */}
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-600 hover:bg-slate-700 gap-2"
                onClick={() => setShowRefreshMenu(!showRefreshMenu)}
              >
                <Clock className="w-4 h-4" />
                {getRefreshIntervalLabel()}
              </Button>
              {showRefreshMenu && (
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[120px]">
                  {REFRESH_INTERVALS.map((interval) => (
                    <button
                      key={interval.value}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg ${
                        refreshInterval === interval.value ? 'text-orange-400 bg-slate-700/50' : 'text-slate-300'
                      }`}
                      onClick={() => {
                        setRefreshInterval(interval.value);
                        setShowRefreshMenu(false);
                      }}
                    >
                      {interval.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* 手动刷新按钮 */}
            <Button 
              variant="outline" 
              size="icon" 
              className="border-slate-600 hover:bg-slate-700"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            {/* 全屏按钮 */}
            <Button variant="outline" size="icon" className="border-slate-600 hover:bg-slate-700" onClick={toggleFullscreen}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* 实时出差人数 */}
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300">实时出差人数</p>
                  <p className="text-3xl font-bold text-white mt-1">{data.travelingNow}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-blue-300">国内 {data.travelingDomestic}</span>
                    <span className="text-blue-300">|</span>
                    <span className="text-blue-300">海外 {data.travelingInternational}</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 本月出差次数 */}
          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300">本月出差次数</p>
                  <p className="text-3xl font-bold text-white mt-1">{data.monthlyTrips}</p>
                  <p className="text-xs text-green-300 mt-2">较上月 +12%</p>
                </div>
                <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Plane className="w-7 h-7 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 本月费用 */}
          <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-500/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300">本月实际费用</p>
                  <p className="text-3xl font-bold text-white mt-1">¥{(data.monthlyActual / 10000).toFixed(1)}万</p>
                  <p className="text-xs text-orange-300 mt-2">预算 ¥{(data.monthlyBudget / 10000).toFixed(1)}万</p>
                </div>
                <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 预算使用率 */}
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-purple-300">预算使用率</p>
                  <p className="text-3xl font-bold text-white mt-1">{data.monthlyBudgetUsage}%</p>
                  <Progress value={data.monthlyBudgetUsage} className="mt-2 h-2 bg-purple-900" />
                </div>
                <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center ml-4">
                  <TrendingUp className="w-7 h-7 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：部门分布和预警 */}
          <div className="space-y-6">
            {/* 预算预警 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  预算预警
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{data.warningCount}</p>
                    <p className="text-xs text-yellow-300">预警</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-400">{data.exceededCount}</p>
                    <p className="text-xs text-orange-300">超支</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{data.criticalCount}</p>
                    <p className="text-xs text-red-300">严重</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 部门费用分布 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  部门费用分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.departmentDistribution.map((dept, index) => {
                    const usage = (dept.actual / dept.budget) * 100;
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">{dept.name}</span>
                          <span className="text-slate-400">{dept.count}人 | ¥{(dept.actual / 10000).toFixed(1)}万</span>
                        </div>
                        <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`absolute h-full rounded-full transition-all ${
                              usage > 100 ? 'bg-red-500' : usage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 中间：地图和目的地分布 */}
          <div className="space-y-6">
            {/* 出差人员分布地图（简化版） */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur h-[300px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-400" />
                  出差人员分布
                </CardTitle>
              </CardHeader>
              <CardContent className="relative h-[220px]">
                {/* 简化的中国地图轮廓 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* 地图背景 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700/30 to-slate-800/30 rounded-lg" />
                    
                    {/* 城市标记点 */}
                    {data.destinationDistribution.map((dest, index) => {
                      // 简化的城市位置
                      const positions: Record<string, { x: number; y: number }> = {
                        '上海': { x: 75, y: 55 },
                        '北京': { x: 65, y: 30 },
                        '深圳': { x: 70, y: 80 },
                        '广州': { x: 65, y: 78 },
                        '成都': { x: 40, y: 60 },
                        '海外': { x: 90, y: 20 }
                      };
                      const pos = positions[dest.city] || { x: 50, y: 50 };
                      
                      return (
                        <div
                          key={index}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        >
                          {/* 脉冲动画 */}
                          <div 
                            className="absolute w-8 h-8 rounded-full animate-ping opacity-30"
                            style={{ backgroundColor: dest.color }}
                          />
                          {/* 中心点 */}
                          <div 
                            className="relative w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer"
                            style={{ backgroundColor: dest.color }}
                          />
                          {/* 标签 */}
                          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            <span className="text-xs text-white bg-slate-800/80 px-2 py-0.5 rounded">
                              {dest.city} ({dest.count})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 目的地排名 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-green-400" />
                  热门目的地
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.destinationDistribution.map((dest, index) => (
                    <Badge 
                      key={index}
                      className="px-3 py-1.5 text-sm"
                      style={{ backgroundColor: `${dest.color}20`, borderColor: dest.color, color: dest.color }}
                    >
                      {dest.city} ({dest.count})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：费用趋势和动态 */}
          <div className="space-y-6">
            {/* 费用趋势图 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  费用趋势（近6月）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] flex items-end gap-2">
                  {data.expenseTrend.map((item, index) => {
                    const maxValue = Math.max(...data.expenseTrend.map(i => Math.max(i.budget, i.actual)));
                    const budgetHeight = (item.budget / maxValue) * 100;
                    const actualHeight = (item.actual / maxValue) * 100;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full h-[140px] flex items-end gap-1">
                          <div 
                            className="flex-1 bg-slate-600/50 rounded-t transition-all"
                            style={{ height: `${budgetHeight}%` }}
                          />
                          <div 
                            className="flex-1 bg-orange-500 rounded-t transition-all"
                            style={{ height: `${actualHeight}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-6 mt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-600/50 rounded" />
                    <span className="text-slate-400">预算</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded" />
                    <span className="text-slate-400">实际</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 最近动态 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  最近动态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{activity.name}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-slate-300">{activity.destination}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 border-slate-600">
                            {getStatusText(activity.status)}
                          </Badge>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>数据每5分钟自动刷新 | 最后更新: {currentTime.toLocaleString('zh-CN')}</p>
        </div>
      </div>
  );
}
