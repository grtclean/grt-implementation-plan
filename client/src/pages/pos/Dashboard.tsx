import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Users,
  Package,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Bell,
  Shield,
  Zap,
  Calendar,
  DollarSign,
  Percent,
  Home,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";

// 风险等级配置
const riskLevels = {
  critical: { label: '严重', color: 'bg-red-500', textColor: 'text-red-500', bgLight: 'bg-red-50 dark:bg-red-950' },
  high: { label: '高', color: 'bg-orange-500', textColor: 'text-orange-500', bgLight: 'bg-orange-50 dark:bg-orange-950' },
  medium: { label: '中', color: 'bg-yellow-500', textColor: 'text-yellow-500', bgLight: 'bg-yellow-50 dark:bg-yellow-950' },
  low: { label: '低', color: 'bg-green-500', textColor: 'text-green-500', bgLight: 'bg-green-50 dark:bg-green-950' },
};

// KPI阈值配置
const kpiThresholds = {
  otd: { critical: 70, warning: 85, target: 95 },
  csat: { critical: 60, warning: 75, target: 90 },
  gm: { critical: 15, warning: 25, target: 35 },
};

// 获取KPI状态
function getKPIStatus(value: number, thresholds: { critical: number; warning: number; target: number }) {
  if (value >= thresholds.target) return { status: 'excellent', color: 'text-green-500', icon: TrendingUp };
  if (value >= thresholds.warning) return { status: 'good', color: 'text-blue-500', icon: TrendingUp };
  if (value >= thresholds.critical) return { status: 'warning', color: 'text-yellow-500', icon: AlertTriangle };
  return { status: 'critical', color: 'text-red-500', icon: AlertCircle };
}

// 风险预警卡片组件
function RiskAlertCard({ title, value, target, trend, trendValue, icon: Icon, alerts }: {
  title: string;
  value: number;
  target: number;
  trend: 'up' | 'down';
  trendValue: number;
  icon: any;
  alerts: { level: string; message: string; project?: string }[];
}) {
  const status = getKPIStatus(value, kpiThresholds.otd);
  const StatusIcon = status.icon;
  
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${value >= target ? 'bg-green-500' : value >= kpiThresholds.otd.warning ? 'bg-yellow-500' : 'bg-red-500'}`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <Badge variant={value >= target ? 'default' : 'destructive'} className="text-xs">
            目标: {target}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-3xl font-bold ${status.color}`}>{value}%</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {trend === 'up' ? (
                <ArrowUpRight className="w-3 h-3 text-green-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-500" />
              )}
              <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                {trendValue}%
              </span>
              <span className="text-muted-foreground">vs 上月</span>
            </div>
          </div>
          <StatusIcon className={`w-8 h-8 ${status.color} opacity-50`} />
        </div>
        
        {/* 风险预警列表 */}
        {alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Bell className="w-3 h-3" />
              风险预警 ({alerts.length})
            </div>
            {alerts.slice(0, 3).map((alert, i) => (
              <div key={i} className={`text-xs p-2 rounded ${riskLevels[alert.level as keyof typeof riskLevels]?.bgLight || 'bg-muted'}`}>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${riskLevels[alert.level as keyof typeof riskLevels]?.color || 'bg-gray-500'}`} />
                  <span className="font-medium">{alert.project}</span>
                </div>
                <p className="text-muted-foreground mt-0.5">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 项目风险列表组件
function ProjectRiskList({ projects }: { projects: any[] }) {
  return (
    <div className="space-y-3">
      {projects.map((project, index) => (
        <Link key={index} href={`/pos/projects/${project.id}`}>
          <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
            <div className={`w-2 h-12 rounded-full ${riskLevels[project.riskLevel as keyof typeof riskLevels]?.color || 'bg-gray-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{project.code}</span>
                <Badge variant="outline" className="text-xs">{project.stage}</Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{project.name}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {project.dueDate}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {project.pm}
                </span>
              </div>
            </div>
            <div className="text-right">
              <Badge className={riskLevels[project.riskLevel as keyof typeof riskLevels]?.color}>
                {riskLevels[project.riskLevel as keyof typeof riskLevels]?.label}风险
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">{project.riskReason}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// 阶段分布图表组件
function StageDistributionChart({ distribution }: { distribution: Record<string, number> }) {
  const stages = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
  const maxValue = Math.max(...Object.values(distribution), 1);
  
  return (
    <div className="space-y-2">
      {stages.map((stage) => {
        const count = distribution[stage] || 0;
        const percentage = (count / maxValue) * 100;
        const isActive = count > 0;
        
        return (
          <div key={stage} className="flex items-center gap-2">
            <span className={`w-10 text-xs font-mono ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
              {stage}
            </span>
            <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-500 ${
                  stage.startsWith('M0') || stage.startsWith('M1') || stage.startsWith('M2') ? 'bg-blue-500' :
                  stage.startsWith('M3') || stage.startsWith('M4') ? 'bg-purple-500' :
                  stage.startsWith('M5') || stage.startsWith('M6') || stage.startsWith('M7') ? 'bg-orange-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
              {count > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                  {count}
                </span>
              )}
            </div>
            <span className={`w-6 text-xs text-right ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {count}
            </span>
          </div>
        );
      })}
      <div className="flex justify-between text-xs text-muted-foreground mt-4 pt-2 border-t">
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" />售前</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded" />立项</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded" />执行</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" />交付</span>
      </div>
    </div>
  );
}

export default function POSDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: overview, isLoading } = trpc.pos.dashboard.getOverview.useQuery();
  const { data: activities } = trpc.pos.dashboard.getRecentActivities.useQuery({ limit: 10 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = overview?.projectStats || { total: 0, active: 0, completed: 0, atRisk: 0 };
  
  // 模拟风险项目数据
  const riskProjects = [
    { id: 1, code: 'GRT-2024-001', name: '某汽车零部件清洗线', stage: 'M4', riskLevel: 'critical', dueDate: '2024-03-15', pm: '张工', riskReason: '交期延迟15天' },
    { id: 2, code: 'GRT-2024-003', name: '新能源电池壳清洗设备', stage: 'M6', riskLevel: 'high', dueDate: '2024-04-01', pm: '李工', riskReason: '关键物料短缺' },
    { id: 3, code: 'GRT-2024-005', name: '精密零件超声清洗机', stage: 'M3', riskLevel: 'medium', dueDate: '2024-05-10', pm: '王工', riskReason: '技术方案待确认' },
  ];
  
  // 模拟KPI预警数据
  const otdAlerts = [
    { level: 'critical', project: 'GRT-2024-001', message: '预计延迟15天，需紧急协调资源' },
    { level: 'high', project: 'GRT-2024-003', message: '物料到货延迟，影响装配进度' },
  ];
  
  const csatAlerts = [
    { level: 'medium', project: 'GRT-2024-002', message: '客户反馈响应时间过长' },
  ];
  
  const gmAlerts = [
    { level: 'high', project: 'GRT-2024-004', message: '变更导致成本超支8%' },
  ];
  
  // 模拟阶段分布数据
  const stageDistribution = {
    'M0': 2, 'M1': 3, 'M2': 5, 'M3': 4, 'M4': 6,
    'M5': 3, 'M6': 4, 'M7': 2, 'M8': 3, 'M9': 2,
    'M10': 1, 'M11': 2, 'M12': 1
  };

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />
          首页
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/pos/dashboard" className="hover:text-foreground transition-colors">POS管理</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">总览</span>
      </nav>

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">经营概览</h1>
          <p className="text-muted-foreground">项目型组织操作系统 - 实时监控与风险预警</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="w-3 h-3 mr-1" />
            系统正常
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Clock className="w-3 h-3 mr-1" />
            实时更新
          </Badge>
        </div>
      </div>

      {/* 快速统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">项目总数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃项目</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <Zap className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">风险项目</p>
                <p className="text-2xl font-bold text-red-500">{stats.atRisk}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI风险预警看板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskAlertCard
          title="OTD 准时交付率"
          value={overview?.otd || 82}
          target={kpiThresholds.otd.target}
          trend="down"
          trendValue={3}
          icon={Target}
          alerts={otdAlerts}
        />
        <RiskAlertCard
          title="CSAT 客户满意度"
          value={overview?.csat || 88}
          target={kpiThresholds.csat.target}
          trend="up"
          trendValue={2}
          icon={Users}
          alerts={csatAlerts}
        />
        <RiskAlertCard
          title="GM% 毛利率"
          value={overview?.gmPercent || 28}
          target={kpiThresholds.gm.target}
          trend="down"
          trendValue={1.5}
          icon={DollarSign}
          alerts={gmAlerts}
        />
      </div>

      {/* 详细内容标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">风险项目</TabsTrigger>
          <TabsTrigger value="distribution">阶段分布</TabsTrigger>
          <TabsTrigger value="activities">最近活动</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-500" />
                    风险项目监控
                  </CardTitle>
                  <CardDescription>需要重点关注的项目列表，按风险等级排序</CardDescription>
                </div>
                <Link href="/pos/projects">
                  <Button variant="outline" size="sm">查看全部项目</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {riskProjects.length > 0 ? (
                <ProjectRiskList projects={riskProjects} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                  <p>所有项目运行正常，暂无风险预警</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                项目阶段分布
              </CardTitle>
              <CardDescription>M0-M12各阶段的项目数量分布</CardDescription>
            </CardHeader>
            <CardContent>
              <StageDistributionChart distribution={stageDistribution} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>最近活动</CardTitle>
              <CardDescription>系统最新操作记录</CardDescription>
            </CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="flex-1">{activity.description || '活动记录'}</span>
                      <span className="text-xs text-muted-foreground">{activity.time || '刚刚'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无活动记录
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
