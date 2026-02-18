import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  Briefcase, 
  GraduationCap, 
  FileText, 
  Calendar, 
  Mail, 
  Brain, 
  Target,
  TrendingUp,
  Award,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Bot,
  Video,
  MessageSquare,
  BarChart3,
  Percent,
  DollarSign,
  Building2,
  Calculator,
  Timer,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { toast } from "sonner";

const showPlaceholder = (featureName: string) => {
  toast.info('功能完善中', { description: `${featureName}功能正在开发完善中，敬请期待` });
};

export default function HRMIntelligent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNewPositionDialog, setShowNewPositionDialog] = useState(false);
  const [showNewCandidateDialog, setShowNewCandidateDialog] = useState(false);

  // 岗位职责数据
  const positionsQuery = trpc.hrm.getPositions.useQuery();
  const candidatesQuery = trpc.hrm.getCandidates.useQuery();
  const employeesQuery = trpc.hrm.getEmployees.useQuery();
  const salaryStructuresQuery = trpc.hrm.getSalaryStructures.useQuery();
  const performanceGradesQuery = trpc.hrm.getPerformanceGrades.useQuery();
  
  // 安全访问数据
  const positions = { data: positionsQuery.data ?? [], refetch: positionsQuery.refetch, isLoading: positionsQuery.isLoading };
  const candidates = { data: candidatesQuery.data ?? [], refetch: candidatesQuery.refetch, isLoading: candidatesQuery.isLoading };
  const employees = { data: employeesQuery.data ?? [], refetch: employeesQuery.refetch, isLoading: employeesQuery.isLoading };
  const salaryStructures = { data: salaryStructuresQuery.data ?? [], refetch: salaryStructuresQuery.refetch, isLoading: salaryStructuresQuery.isLoading };
  const performanceGrades = { data: performanceGradesQuery.data ?? [], refetch: performanceGradesQuery.refetch, isLoading: performanceGradesQuery.isLoading };

  // 初始化默认数据
  const initSalaryStructures = trpc.hrm.initSalaryStructures.useMutation({
    onSuccess: (data) => {
      toast.success(`成功初始化 ${data.created} 个薪酬结构`);
      salaryStructures.refetch();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    }
  });

  const initPerformanceGrades = trpc.hrm.initPerformanceGrades.useMutation({
    onSuccess: (data) => {
      toast.success(`成功初始化 ${data.created} 个绩效等级`);
      performanceGrades.refetch();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    }
  });

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Brain}
          title="HRM智能化管理"
          description="人力资源智能化管理系统 - 岗位职责、AI面试、培训管理、薪酬体系"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                导出报表
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                系统设置
              </Button>
            </div>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Briefcase} label="岗位数量" value={positions.data?.length || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Users} label="在职员工" value={employees.data?.length || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Search} label="待面试候选人" value={candidates.data?.filter(c => c.status === 'interviewing').length || 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={GraduationCap} label="培训计划" value={12} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        </div>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              人才看板
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              岗位管理
            </TabsTrigger>
            <TabsTrigger value="candidates" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              候选人管理
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              入职培训
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              述职报告
            </TabsTrigger>
            <TabsTrigger value="ai-interview" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI面试
            </TabsTrigger>
            <TabsTrigger value="salary" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              薪酬体系
            </TabsTrigger>
            <TabsTrigger value="role-management" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              角色管理
            </TabsTrigger>
            <TabsTrigger value="digital-role" className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              数字角色
            </TabsTrigger>
            <TabsTrigger value="salary-calc" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              薪酬计算器
            </TabsTrigger>
            <TabsTrigger value="scheduled-tasks" className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              定时任务
            </TabsTrigger>
            <TabsTrigger value="teams-interview" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Teams面试
            </TabsTrigger>
          </TabsList>

          {/* 人才库看板 */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* 招聘漏斗 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    招聘漏斗
                  </CardTitle>
                  <CardDescription>候选人各阶段转化情况</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { stage: "简历收集", count: candidates.data?.length || 0, color: "bg-blue-500", width: "100%" },
                      { stage: "简历筛选", count: candidates.data?.filter(c => c.status !== 'new').length || 0, color: "bg-cyan-500", width: "80%" },
                      { stage: "面试中", count: candidates.data?.filter(c => c.status === 'interviewing').length || 0, color: "bg-green-500", width: "45%" },
                      { stage: "已发Offer", count: candidates.data?.filter(c => c.status === 'offer').length || 0, color: "bg-yellow-500", width: "25%" },
                      { stage: "已入职", count: candidates.data?.filter(c => c.status === 'hired').length || 0, color: "bg-primary", width: "15%" },
                    ].map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.stage}</span>
                          <span className="font-semibold">{item.count}人</span>
                        </div>
                        <div className="h-8 bg-muted rounded overflow-hidden">
                          <div 
                            className={`h-full ${item.color} transition-all duration-500 flex items-center justify-end pr-2`}
                            style={{ width: item.width }}
                          >
                            {index > 0 && (
                              <span className="text-xs text-white font-medium">
                                {candidates.data && candidates.data.length > 0 
                                  ? Math.round((item.count / candidates.data.length) * 100) 
                                  : 0}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {candidates.data && candidates.data.length > 0 && candidates.data.filter(c => c.status === 'hired').length > 0
                            ? Math.round((candidates.data.filter(c => c.status === 'hired').length / candidates.data.length) * 100)
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">整体转化率</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">
                          {candidates && candidates.data.filter(c => c.status === 'interviewing').length > 0 && candidates.data.filter(c => c.status !== 'new').length > 0
                            ? Math.round((candidates.data.filter(c => c.status === 'interviewing').length / candidates.data.filter(c => c.status !== 'new').length) * 100)
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">面试通过率</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-500">
                          {candidates && candidates.data.filter(c => c.status === 'offer' || c.status === 'hired').length > 0 && candidates.data.filter(c => c.status === 'interviewing' || c.status === 'offer' || c.status === 'hired').length > 0
                            ? Math.round((candidates.data.filter(c => c.status === 'offer' || c.status === 'hired').length / candidates.data.filter(c => c.status === 'interviewing' || c.status === 'offer' || c.status === 'hired').length) * 100)
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Offer接受率</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 人才分布 */}
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    人才分布
                  </CardTitle>
                  <CardDescription>按部门/岗位的候选人分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { dept: "研发部", count: candidates.data?.filter(c => c.positionName?.includes('研发') || c.positionName?.includes('工程师')).length || 1, positions: ["电气研发工程师", "机械工程师"], color: "bg-blue-500" },
                      { dept: "销售部", count: candidates.data?.filter(c => c.positionName?.includes('销售')).length || 0, positions: ["销售经理", "客户经理"], color: "bg-green-500" },
                      { dept: "技术服务部", count: candidates.data?.filter(c => c.positionName?.includes('技术') || c.positionName?.includes('服务')).length || 0, positions: ["技术工程师", "售后工程师"], color: "bg-purple-500" },
                      { dept: "生产部", count: candidates.data?.filter(c => c.positionName?.includes('生产') || c.positionName?.includes('装配')).length || 0, positions: ["生产经理", "装配技师"], color: "bg-orange-500" },
                      { dept: "品管部", count: candidates.data?.filter(c => c.positionName?.includes('品质') || c.positionName?.includes('质检')).length || 0, positions: ["品质工程师"], color: "bg-red-500" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{item.dept}</span>
                            <span className="text-sm text-muted-foreground">{item.count}人</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.positions.join("、")}</p>
                        </div>
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color}`}
                            style={{ width: `${Math.min((item.count / Math.max(candidates.data?.length || 1, 1)) * 100 * 3, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-3">热门岗位 TOP3</h4>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">1</span>
                        电气研发工程师
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">2</span>
                        销售经理
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">3</span>
                        技术工程师
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 面试转化率趋势 & 候选人来源 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    面试转化率趋势
                  </CardTitle>
                  <CardDescription>近六个月面试转化情况</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { month: "2025-08", interviews: 12, passed: 8, rate: 67 },
                      { month: "2025-09", interviews: 15, passed: 9, rate: 60 },
                      { month: "2025-10", interviews: 18, passed: 12, rate: 67 },
                      { month: "2025-11", interviews: 20, passed: 14, rate: 70 },
                      { month: "2025-12", interviews: 16, passed: 10, rate: 63 },
                      { month: "2026-01", interviews: 8, passed: 5, rate: 63 },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="w-20 text-sm text-muted-foreground">{item.month}</span>
                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden flex">
                          <div 
                            className="h-full bg-green-500 flex items-center justify-center"
                            style={{ width: `${item.rate}%` }}
                          >
                            <span className="text-xs text-white font-medium">{item.passed}通过</span>
                          </div>
                          <div 
                            className="h-full bg-red-400 flex items-center justify-center"
                            style={{ width: `${100 - item.rate}%` }}
                          >
                            <span className="text-xs text-white font-medium">{item.interviews - item.passed}未通过</span>
                          </div>
                        </div>
                        <span className="w-12 text-sm font-medium text-right">{item.rate}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">平均转化率</p>
                      <p className="text-2xl font-bold text-green-500">65%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">本月面试</p>
                      <p className="text-2xl font-bold">8场</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    候选人来源分析
                  </CardTitle>
                  <CardDescription>各招聘渠道效果对比</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { source: "猎聘网", count: 5, hired: 2, cost: 3000, color: "bg-blue-500" },
                      { source: "BOSS直聘", count: 8, hired: 1, cost: 2000, color: "bg-green-500" },
                      { source: "内部推荐", count: 3, hired: 2, cost: 500, color: "bg-purple-500" },
                      { source: "校园招聘", count: 4, hired: 1, cost: 1500, color: "bg-orange-500" },
                      { source: "其他渠道", count: 2, hired: 0, cost: 1000, color: "bg-gray-500" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{item.source}</span>
                            <span className="text-sm">{item.count}人 / {item.hired}入职</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>转化率: {item.count > 0 ? Math.round((item.hired / item.count) * 100) : 0}%</span>
                            <span>人均成本: ¥{item.cost}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">最优渠道</p>
                        <p className="font-semibold text-green-500">内部推荐</p>
                        <p className="text-xs text-muted-foreground">67%转化率</p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">最低成本</p>
                        <p className="font-semibold text-blue-500">内部推荐</p>
                        <p className="text-xs text-muted-foreground">¥500/人</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 最新候选人动态 */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  最新候选人动态
                </CardTitle>
                <CardDescription>近期候选人状态变更</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {candidates.data?.slice(0, 5).map((candidate, index) => (
                    <div key={candidate.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {candidate.positionName} · {candidate.source}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          candidate.status === 'hired' ? 'default' :
                          candidate.status === 'offer' ? 'secondary' :
                          candidate.status === 'interviewing' ? 'outline' :
                          candidate.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {candidate.status === 'new' && '新简历'}
                          {candidate.status === 'screening' && '筛选中'}
                          {candidate.status === 'interviewing' && '面试中'}
                          {candidate.status === 'offer' && '已发Offer'}
                          {candidate.status === 'hired' && '已入职'}
                          {candidate.status === 'rejected' && '已淘汰'}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => showPlaceholder('查看详情')}>查看详情</Button>
                      </div>
                    </div>
                  ))}
                  {(!candidates || candidates.data.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无候选人数据
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 岗位管理 */}
          <TabsContent value="positions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="搜索岗位..." className="w-64" />
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
              <Dialog open={showNewPositionDialog} onOpenChange={setShowNewPositionDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新增岗位
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新增岗位</DialogTitle>
                    <DialogDescription>
                      创建新的岗位职责和KPI评估项目
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>岗位名称</Label>
                        <Input placeholder="如：电气研发工程师" />
                      </div>
                      <div className="space-y-2">
                        <Label>所属部门</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择部门" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rd">研发部</SelectItem>
                            <SelectItem value="sales">销售部</SelectItem>
                            <SelectItem value="production">生产部</SelectItem>
                            <SelectItem value="quality">品管部</SelectItem>
                            <SelectItem value="finance">财务部</SelectItem>
                            <SelectItem value="hr">人事部</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>岗位职责</Label>
                      <Textarea 
                        placeholder="描述该岗位的主要职责和工作内容..."
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>关键工作任务</Label>
                      <Textarea 
                        placeholder="列出该岗位的关键工作任务（每行一个）..."
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>KPI评估项目</Label>
                      <Textarea 
                        placeholder="定义该岗位的KPI评估指标（每行一个）..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewPositionDialog(false)}>
                      取消
                    </Button>
                    <Button onClick={() => {
                      toast.success("岗位创建成功");
                      setShowNewPositionDialog(false);
                    }}>
                      创建岗位
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {positions.data?.map((position) => (
                <Card key={position.id} className="bg-card/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{position.name}</CardTitle>
                        <CardDescription>{position.department} · {position.positionCode}</CardDescription>
                      </div>
                      <Badge variant={position.status === 'active' ? 'default' : 'secondary'}>
                        {position.status === 'active' ? '在用' : '停用'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">岗位职责</p>
                        <p className="line-clamp-2">{position.responsibilities || '暂无'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">关键任务</p>
                        <p className="line-clamp-2">{position.keyTasks || '暂无'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">KPI指标</p>
                        <p className="line-clamp-2">{position.kpiIndicators || '暂无'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => showPlaceholder('编辑')}>编辑</Button>
                      <Button variant="outline" size="sm">查看详情</Button>
                      <Button variant="outline" size="sm">
                        <Brain className="w-4 h-4 mr-1" />
                        AI生成培训计划
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(!positions.data || positions.data.length === 0) && (
                <Card className="bg-card/50">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暂无岗位数据</p>
                    <Button className="mt-4" onClick={() => setShowNewPositionDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      创建第一个岗位
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 候选人管理 */}
          <TabsContent value="candidates" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="搜索候选人..." className="w-64" />
                <Select>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="screening">简历筛选</SelectItem>
                    <SelectItem value="interviewing">面试中</SelectItem>
                    <SelectItem value="offer">已发Offer</SelectItem>
                    <SelectItem value="hired">已入职</SelectItem>
                    <SelectItem value="rejected">已淘汰</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  导入简历
                </Button>
                <Dialog open={showNewCandidateDialog} onOpenChange={setShowNewCandidateDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      新增候选人
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>新增候选人</DialogTitle>
                      <DialogDescription>
                        录入候选人基本信息，系统将自动进行AI分析
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>姓名</Label>
                          <Input placeholder="候选人姓名" />
                        </div>
                        <div className="space-y-2">
                          <Label>应聘岗位</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="选择岗位" />
                            </SelectTrigger>
                            <SelectContent>
                              {positions.data?.map((pos) => (
                                <SelectItem key={pos.id} value={pos.id.toString()}>
                                  {pos.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>年龄</Label>
                          <Input type="number" placeholder="年龄" />
                        </div>
                        <div className="space-y-2">
                          <Label>工作年限</Label>
                          <Input type="number" placeholder="年" />
                        </div>
                        <div className="space-y-2">
                          <Label>期望薪资</Label>
                          <Input placeholder="如：15-20K" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>简历上传</Label>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            拖拽文件到此处或点击上传（支持PDF、Word）
                          </p>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewCandidateDialog(false)}>
                        取消
                      </Button>
                      <Button onClick={() => {
                        toast.success("候选人添加成功，AI正在分析简历...");
                        setShowNewCandidateDialog(false);
                      }}>
                        添加并分析
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-4">
              {candidates.data?.map((candidate) => (
                <Card key={candidate.id} className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{candidate.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {candidate.age}岁 · {candidate.workYears}年经验 · 应聘: {candidate.positionName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">AI匹配度</p>
                          <p className="text-lg font-bold text-primary">0%</p>
                        </div>
                        <Badge variant={
                          candidate.status === 'hired' ? 'default' :
                          candidate.status === 'offer' ? 'secondary' :
                          candidate.status === 'interviewing' ? 'outline' :
                          candidate.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {candidate.status === 'screening' && '简历筛选'}
                          {candidate.status === 'interviewing' && '面试中'}
                          {candidate.status === 'offer' && '已发Offer'}
                          {candidate.status === 'hired' && '已入职'}
                          {candidate.status === 'rejected' && '已淘汰'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => showPlaceholder('查看简历')}>查看简历</Button>
                      <Button variant="outline" size="sm">
                        <Brain className="w-4 h-4 mr-1" />
                        AI分析
                      </Button>
                      <Button variant="outline" size="sm">
                        <Video className="w-4 h-4 mr-1" />
                        安排面试
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        面试记录
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!candidates || candidates.data.length === 0) && (
                <Card className="bg-card/50">
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暂无候选人数据</p>
                    <Button className="mt-4" onClick={() => setShowNewCandidateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      添加候选人
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 入职培训 */}
          <TabsContent value="onboarding" className="space-y-4">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  入职培训计划管理
                </CardTitle>
                <CardDescription>
                  基于岗位职责和入职日期自动生成培训计划，支持培训内容测试
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <Calendar className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                      <p className="font-semibold">培训日历</p>
                      <p className="text-sm text-muted-foreground">查看培训安排</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <FileText className="w-8 h-8 mx-auto text-green-500 mb-2" />
                      <p className="font-semibold">培训内容</p>
                      <p className="text-sm text-muted-foreground">管理培训资料</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <Award className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                      <p className="font-semibold">培训测试</p>
                      <p className="text-sm text-muted-foreground">考核与评估</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 述职报告 */}
          <TabsContent value="performance" className="space-y-4">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  述职报告管理
                </CardTitle>
                <CardDescription>
                  试用期满3个月/6个月自动提醒，周二下午2:00述职报告
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Clock className="w-8 h-8 text-orange-500" />
                      <div>
                        <p className="font-semibold">即将到期的述职报告</p>
                        <p className="text-sm text-muted-foreground">系统将自动发送提醒邮件</p>
                      </div>
                    </div>
                    <Badge variant="outline">3人待述职</Badge>
                  </div>
                  
                  <div className="border rounded-lg">
                    <div className="p-4 border-b bg-muted/30">
                      <h4 className="font-semibold">提醒通知配置</h4>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span>通知收件人</span>
                        <span className="text-sm text-muted-foreground">
                          主管、主管的主管、HRBP、camillia@gerrytech.com、gerry@grtclean.ai
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>提醒时间</span>
                        <span className="text-sm text-muted-foreground">
                          满期前一周的周二下午2:00
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>述职报告模板</span>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-1" />
                          查看模板
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI面试 */}
          <TabsContent value="ai-interview" className="space-y-4">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI面试系统
                </CardTitle>
                <CardDescription>
                  简历分析、面试策略生成、Teams视觉语音识别、风险评估
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-6 h-6 text-blue-500" />
                        <h4 className="font-semibold">简历智能分析</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        AI自动解析简历，提取关键信息，评估候选人与岗位匹配度
                      </p>
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-1" />
                        上传简历分析
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <MessageSquare className="w-6 h-6 text-green-500" />
                        <h4 className="font-semibold">面试策略生成</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        根据岗位要求和候选人背景，AI生成个性化面试问题和评估要点
                      </p>
                      <Button variant="outline" size="sm">
                        <Brain className="w-4 h-4 mr-1" />
                        生成面试策略
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Video className="w-6 h-6 text-purple-500" />
                        <h4 className="font-semibold">Teams面试识别</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        集成Teams视觉语音识别，实时分析候选人表现，提供面试建议
                      </p>
                      <Button variant="outline" size="sm">
                        <Video className="w-4 h-4 mr-1" />
                        开始AI面试
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-orange-500" />
                        <h4 className="font-semibold">风险评估</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        识别候选人与Offer、职责安排的匹配风险，提供培训或淘汰建议
                      </p>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        查看风险报告
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 薪酬体系 */}
          <TabsContent value="salary" className="space-y-4">
            <Card className="bg-card/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      GRT绩效薪酬体系
                    </CardTitle>
                    <CardDescription>
                      基于GRT绩效薪酬体系方案，管理各部门薪酬结构和绩效等级
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => initSalaryStructures.mutate()}
                      disabled={initSalaryStructures.isPending}
                    >
                      {initSalaryStructures.isPending ? "初始化中..." : "初始化薪酬结构"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => initPerformanceGrades.mutate()}
                      disabled={initPerformanceGrades.isPending}
                    >
                      {initPerformanceGrades.isPending ? "初始化中..." : "初始化绩效等级"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 薪酬结构 */}
                  <div>
                    <h4 className="font-semibold mb-4">部门薪酬结构</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-3 text-left">部门</th>
                            <th className="p-3 text-center">基本工资</th>
                            <th className="p-3 text-center">绩效工资</th>
                            <th className="p-3 text-center">奖金</th>
                            <th className="p-3 text-center">福利</th>
                            <th className="p-3 text-center">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salaryStructures.data?.map((structure) => (
                            <tr key={structure.id} className="border-t">
                              <td className="p-3">{structure.department}</td>
                              <td className="p-3 text-center">
                                {(parseFloat(structure.baseSalaryRatioMin) * 100).toFixed(0)}-{(parseFloat(structure.baseSalaryRatioMax) * 100).toFixed(0)}%
                              </td>
                              <td className="p-3 text-center">
                                {(parseFloat(structure.performanceRatioMin) * 100).toFixed(0)}-{(parseFloat(structure.performanceRatioMax) * 100).toFixed(0)}%
                              </td>
                              <td className="p-3 text-center">
                                {(parseFloat(structure.bonusRatioMin) * 100).toFixed(0)}-{(parseFloat(structure.bonusRatioMax) * 100).toFixed(0)}%
                              </td>
                              <td className="p-3 text-center">
                                {(parseFloat(structure.benefitsRatioMin) * 100).toFixed(0)}-{(parseFloat(structure.benefitsRatioMax) * 100).toFixed(0)}%
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant={structure.status === 'active' ? 'default' : 'secondary'}>
                                  {structure.status === 'active' ? '生效' : '停用'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          {(!salaryStructures.data || salaryStructures.data.length === 0) && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                暂无薪酬结构数据，请点击"初始化薪酬结构"按钮
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 绩效等级 */}
                  <div>
                    <h4 className="font-semibold mb-4">绩效等级标准</h4>
                    <div className="grid grid-cols-6 gap-4">
                      {performanceGrades.data?.map((grade) => (
                        <Card key={grade.id} className="bg-muted/30">
                          <CardContent className="p-4 text-center">
                            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2 ${
                              grade.grade === 'S' ? 'bg-purple-500/20 text-purple-500' :
                              grade.grade === 'A' ? 'bg-blue-500/20 text-blue-500' :
                              grade.grade === 'B' ? 'bg-green-500/20 text-green-500' :
                              grade.grade === 'C' ? 'bg-yellow-500/20 text-yellow-500' :
                              grade.grade === 'D' ? 'bg-orange-500/20 text-orange-500' :
                              'bg-red-500/20 text-red-500'
                            }`}>
                              {grade.grade}
                            </div>
                            <p className="font-semibold">{grade.description}</p>
                            <p className="text-xs text-muted-foreground">奖金系数: {grade.bonusRate}</p>
                          </CardContent>
                        </Card>
                      ))}
                      {(!performanceGrades.data || performanceGrades.data.length === 0) && (
                        <div className="col-span-6 p-8 text-center text-muted-foreground border rounded-lg">
                          暂无绩效等级数据，请点击"初始化绩效等级"按钮
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 角色管理 */}
          <TabsContent value="role-management" className="space-y-6">
            <RoleManagementPanel />
          </TabsContent>

          {/* 数字角色 */}
          <TabsContent value="digital-role" className="space-y-4">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  数字角色模型
                </CardTitle>
                <CardDescription>
                  追踪岗位数字化代理进度，分析物理人物→数字代理转换百分比
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p className="text-2xl font-bold">35%</p>
                        <p className="text-sm text-muted-foreground">平均数字化率</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-center">
                        <Building2 className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                        <p className="text-2xl font-bold">12</p>
                        <p className="text-sm text-muted-foreground">已建模岗位</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-center">
                        <Bot className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                        <p className="text-2xl font-bold">5</p>
                        <p className="text-sm text-muted-foreground">数字代理上线</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-4">岗位数字化进度</h4>
                    <div className="space-y-3">
                      {[
                        { name: "客服专员", progress: 75, status: "高度自动化" },
                        { name: "数据分析师", progress: 60, status: "部分自动化" },
                        { name: "采购专员", progress: 45, status: "流程优化中" },
                        { name: "质检员", progress: 30, status: "数据采集中" },
                        { name: "销售经理", progress: 15, status: "规划中" },
                      ].map((role, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <span className="w-24 text-sm">{role.name}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                role.progress >= 60 ? 'bg-green-500' :
                                role.progress >= 40 ? 'bg-yellow-500' :
                                'bg-orange-500'
                              }`}
                              style={{ width: `${role.progress}%` }}
                            />
                          </div>
                          <span className="w-12 text-sm text-right">{role.progress}%</span>
                          <Badge variant="outline" className="w-24 justify-center">
                            {role.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 薪酬计算器 */}
          <TabsContent value="salary-calc" className="space-y-4">
            <SalaryCalculator />
          </TabsContent>

          {/* 定时任务管理 */}
          <TabsContent value="scheduled-tasks" className="space-y-4">
            <ScheduledTasksManager />
          </TabsContent>

          {/* Teams面试系统 */}
          <TabsContent value="teams-interview" className="space-y-4">
            <TeamsInterviewSystem />
          </TabsContent>
        </Tabs>
      </div>
  );
}

// 薪酬计算结果类型
interface SalaryCalculationResult {
  baseSalary?: number;
  performanceSalary?: number;
  bonus?: number;
  benefits?: number;
  monthlyTotal?: number;
  annualTotal?: number;
  breakdown?: Record<string, unknown>;
}

// 薪酬计算器组件
function SalaryCalculator() {
  const [department, setDepartment] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [performanceGrade, setPerformanceGrade] = useState("");
  const [projectBonus, setProjectBonus] = useState("");
  const [calculationResult, setCalculationResult] = useState<SalaryCalculationResult | null>(null);

  const salaryStructures = trpc.hrm.getSalaryStructures.useQuery();
  const performanceGrades = trpc.hrm.getPerformanceGrades.useQuery();
  const calculateSalary = trpc.hrm.calculateSalary.useQuery(
    {
      department,
      baseSalary: parseFloat(baseSalary) || 0,
      performanceGrade: performanceGrade || undefined,
      projectBonus: parseFloat(projectBonus) || undefined,
    },
    {
      enabled: !!department && !!baseSalary && parseFloat(baseSalary) > 0,
    }
  );

  // Update calculation result when data changes
  useEffect(() => {
    if (calculateSalary.data) {
      setCalculationResult(calculateSalary.data);
    }
  }, [calculateSalary.data]);

  const saveSalaryCalculation = trpc.hrm.createSalaryCalculation.useMutation({
    onSuccess: () => {
      toast.success("薪酬计算结果已保存");
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const handleSaveCalculation = () => {
    if (!calculationResult) return;
    saveSalaryCalculation.mutate({
      department,
      calculationType: "simulation",
      baseSalary: parseFloat(baseSalary),
      performanceSalary: calculationResult.performanceSalary,
      bonus: calculationResult.bonus,
      benefits: calculationResult.benefits,
      monthlyTotal: calculationResult.monthlyTotal,
      annualTotal: calculationResult.annualTotal,
      calculationParams: {
        performanceGrade,
        projectBonus: parseFloat(projectBonus) || 0,
      },
      salaryBreakdown: calculationResult.breakdown,
    });
  };

  return (
    <Card className="bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          薪酬计算器
        </CardTitle>
        <CardDescription>
          基于GRT绩效薪酬体系，计算员工或候选人的薪酬结构
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* 输入区域 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>部门</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="选择部门" />
                </SelectTrigger>
                <SelectContent>
                  {salaryStructures.data?.map((s) => (
                    <SelectItem key={s.id} value={s.department || s.level}>
                      {s.department || s.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>基本工资 (元/月)</Label>
              <Input
                type="number"
                placeholder="输入基本工资"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>绩效等级</Label>
              <Select value={performanceGrade} onValueChange={setPerformanceGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="选择绩效等级" />
                </SelectTrigger>
                <SelectContent>
                  {performanceGrades.data?.map((g) => (
                    <SelectItem key={g.id} value={g.grade}>
                      {g.grade} - {g.description} (系数: {g.bonusRate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>项目奖金 (元/月，可选)</Label>
              <Input
                type="number"
                placeholder="输入项目奖金"
                value={projectBonus}
                onChange={(e) => setProjectBonus(e.target.value)}
              />
            </div>
          </div>

          {/* 计算结果 */}
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-4">薪酬计算结果</h4>
              {calculateSalary.isLoading ? (
                <p className="text-muted-foreground">计算中...</p>
              ) : calculationResult ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>基本工资</span>
                    <span className="font-mono">¥{calculationResult.baseSalary?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>绩效工资</span>
                    <span className="font-mono">¥{calculationResult.performanceSalary?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>奖金</span>
                    <span className="font-mono">¥{calculationResult.bonus?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>福利补贴</span>
                    <span className="font-mono">¥{calculationResult.benefits?.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>月度总薪酬</span>
                      <span className="text-primary">¥{calculationResult.monthlyTotal?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-2">
                      <span>年度总薪酬</span>
                      <span className="text-primary">¥{calculationResult.annualTotal?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">请填写左侧参数进行计算</p>
              )}
            </div>

            {/* 批量导入区域 */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-3">批量薪资模拟</h4>
              <div className="space-y-2">
                <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-primary rounded-lg cursor-pointer hover:bg-primary/5 transition">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="text-sm">上传Excel文件</span>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; toast.info('Excel导入功能开发中...'); }} />
                </label>
                <p className="text-xs text-muted-foreground">支持Excel/CSV格式，包含部门、基本工资、绩效等级等列</p>
              </div>
            </div>

            {calculationResult && (
              <div className="space-y-2">
                <Button onClick={handleSaveCalculation} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  保存计算结果
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    const csvContent = [
                      '薪酬计算报表',
                      '',
                      '项目,金额(元)',
                      `部门,${department}`,
                      `基本工资,${calculationResult.baseSalary}`,
                      `绩效工资,${calculationResult.performanceSalary}`,
                      `奖金,${calculationResult.bonus}`,
                      `福利补贴,${calculationResult.benefits}`,
                      '',
                      `月度总薪酬,${calculationResult.monthlyTotal}`,
                      `年度总薪酬,${calculationResult.annualTotal}`,
                      '',
                      `绩效等级,${performanceGrade || '未选择'}`,
                      `项目奖金,${projectBonus || 0}`,
                      '',
                      `生成时间,${new Date().toLocaleString()}`,
                    ].join('\n');
                    
                    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `薪酬计算报表_${department}_${new Date().toISOString().slice(0,10)}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast.success('报表已下载');
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  导出CSV报表
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>薪酬计算报表 - ${department}</title>
  <style>
    body { font-family: 'Microsoft YaHei', sans-serif; padding: 40px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
    .info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f97316; color: white; }
    .total { font-size: 1.2em; font-weight: bold; color: #f97316; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💰 薪酬计算报表</h1>
    <div class="info">
      <strong>部门:</strong> ${department} | 
      <strong>绩效等级:</strong> ${performanceGrade || '未选择'} | 
      <strong>项目奖金:</strong> ¥${projectBonus || 0}
    </div>
    <table>
      <tr><th>薪酬项目</th><th>金额 (元)</th></tr>
      <tr><td>基本工资</td><td>¥${calculationResult.baseSalary?.toLocaleString()}</td></tr>
      <tr><td>绩效工资</td><td>¥${calculationResult.performanceSalary?.toLocaleString()}</td></tr>
      <tr><td>奖金</td><td>¥${calculationResult.bonus?.toLocaleString()}</td></tr>
      <tr><td>福利补贴</td><td>¥${calculationResult.benefits?.toLocaleString()}</td></tr>
      <tr class="total"><td>月度总薪酬</td><td>¥${calculationResult.monthlyTotal?.toLocaleString()}</td></tr>
      <tr class="total"><td>年度总薪酬</td><td>¥${calculationResult.annualTotal?.toLocaleString()}</td></tr>
    </table>
    <div class="footer">
      <p>生成时间: ${new Date().toLocaleString()}</p>
      <p>GRT智能系统 - HRM薪酬计算器</p>
    </div>
  </div>
</body>
</html>`;
                    
                    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `薪酬计算报表_${department}_${new Date().toISOString().slice(0,10)}.html`;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast.success('HTML报表已下载');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出HTML报表
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 定时任务管理组件
function ScheduledTasksManager() {
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState<{ taskName: string; taskType: string; cronExpression: string }>({
    taskName: "",
    taskType: "performance_review_reminder",
    cronExpression: "0 0 14 * * 2", // 每周二下午2点
  });

  const scheduledTasks = trpc.hrm.getScheduledTasks.useQuery();
  const createTask = trpc.hrm.createScheduledTask.useMutation({
    onSuccess: () => {
      toast.success("定时任务创建成功");
      setShowNewTaskDialog(false);
      scheduledTasks.refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateTask = trpc.hrm.updateScheduledTask.useMutation({
    onSuccess: () => {
      toast.success("任务状态已更新");
      scheduledTasks.refetch();
    },
  });

  const taskTypeLabels: Record<string, string> = {
    performance_review_reminder: "述职提醒",
    training_reminder: "培训提醒",
    meeting_reminder: "会议提醒",
    custom: "自定义任务",
  };

  return (
    <Card className="bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              定时任务管理
            </CardTitle>
            <CardDescription>
              管理述职提醒、培训提醒等定时任务
            </CardDescription>
          </div>
          <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新建任务
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建定时任务</DialogTitle>
                <DialogDescription>配置定时执行的任务</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>任务名称</Label>
                  <Input
                    value={newTask.taskName}
                    onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                    placeholder="输入任务名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>任务类型</Label>
                  <Select
                    value={newTask.taskType}
                    onValueChange={(v) => setNewTask({ ...newTask, taskType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="performance_review_reminder">述职提醒</SelectItem>
                      <SelectItem value="training_reminder">培训提醒</SelectItem>
                      <SelectItem value="meeting_reminder">会议提醒</SelectItem>
                      <SelectItem value="custom">自定义任务</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cron表达式</Label>
                  <Input
                    value={newTask.cronExpression}
                    onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                    placeholder="0 0 14 * * 2"
                  />
                  <p className="text-xs text-muted-foreground">
                    示例: "0 0 14 * * 2" = 每周二下午2:00
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
                  取消
                </Button>
                <Button
                  onClick={() => createTask.mutate(newTask)}
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? "创建中..." : "创建任务"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 监控统计 */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-muted/30 border-0">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{scheduledTasks.data?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">总任务数</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30 border-0">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{scheduledTasks.data?.filter(t => t.isEnabled).length || 0}</p>
                  <p className="text-sm text-muted-foreground">运行中</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30 border-0">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-500">{scheduledTasks.data?.filter(t => !t.isEnabled).length || 0}</p>
                  <p className="text-sm text-muted-foreground">已暂停</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 任务列表 */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              任务执行历史
            </h4>
          {scheduledTasks.data?.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${task.isEnabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                  <Timer className={`w-5 h-5 ${task.isEnabled ? 'text-green-500' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className="font-semibold">{task.taskName}</p>
                  <p className="text-sm text-muted-foreground">
                    {taskTypeLabels[task.taskType]} · {task.cronExpression}
                  </p>
                  {task.lastRunAt && (
                    <p className="text-xs text-muted-foreground">
                      上次执行: {new Date(task.lastRunAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={task.isEnabled ? 'default' : 'secondary'}>
                  {task.isEnabled ? '运行中' : '已暂停'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateTask.mutate({ id: task.id, isEnabled: !task.isEnabled })}
                >
                  {task.isEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}

          {(!scheduledTasks.data || scheduledTasks.data.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              <Timer className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无定时任务</p>
              <Button className="mt-4" onClick={() => setShowNewTaskDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建第一个任务
              </Button>
            </div>
          )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Teams面试系统组件
function TeamsInterviewSystem() {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [meetingSubject, setMeetingSubject] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  const candidatesQuery = trpc.hrm.getCandidates.useQuery();
  const candidates = { data: (candidatesQuery.data ?? []).filter(c => c.status === "interviewing") };
  const teamsMeetings = trpc.hrm.getTeamsMeetings.useQuery();

  const createMeeting = trpc.hrm.createTeamsMeeting.useMutation({
    onSuccess: () => {
      toast.success("Teams面试会议已创建");
      setShowScheduleDialog(false);
      teamsMeetings.refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMeeting = trpc.hrm.updateTeamsMeeting.useMutation({
    onSuccess: () => {
      toast.success("会议状态已更新");
      teamsMeetings.refetch();
    },
  });

  const statusLabels: Record<string, string> = {
    scheduled: "已安排",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500/10 text-blue-500",
    in_progress: "bg-green-500/10 text-green-500",
    completed: "bg-gray-500/10 text-gray-500",
    cancelled: "bg-red-500/10 text-red-500",
  };

  return (
    <Card className="bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Teams视频面试系统
            </CardTitle>
            <CardDescription>
              集成Teams视频会议，支持AI实时语音识别和情绪分析
            </CardDescription>
          </div>
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                安排面试
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>安排Teams面试</DialogTitle>
                <DialogDescription>为候选人安排视频面试</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>选择候选人</Label>
                  <Select
                    value={selectedCandidate?.toString() || ""}
                    onValueChange={(v) => setSelectedCandidate(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择候选人" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name} - {c.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>面试主题</Label>
                  <Input
                    value={meetingSubject}
                    onChange={(e) => setMeetingSubject(e.target.value)}
                    placeholder="例如：技术面试 - 第一轮"
                  />
                </div>
                <div className="space-y-2">
                  <Label>面试时间</Label>
                  <Input
                    type="datetime-local"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    if (selectedCandidate && meetingSubject && meetingTime) {
                      createMeeting.mutate({
                        candidateId: selectedCandidate,
                        subject: meetingSubject,
                        startTime: new Date(meetingTime),
                        durationMinutes: 60,
                      });
                    }
                  }}
                  disabled={createMeeting.isPending || !selectedCandidate || !meetingSubject || !meetingTime}
                >
                  {createMeeting.isPending ? "创建中..." : "创建会议"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* AI面试功能卡片 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <Brain className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="font-semibold">实时语音识别</p>
                <p className="text-xs text-muted-foreground">自动转录面试对话</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                <p className="font-semibold">情绪分析</p>
                <p className="text-xs text-muted-foreground">检测候选人情绪状态</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="font-semibold">智能评分</p>
                <p className="text-xs text-muted-foreground">综合评估面试表现</p>
              </CardContent>
            </Card>
          </div>

          {/* 面试列表 */}
          <div className="border rounded-lg">
            <div className="p-4 border-b bg-muted/30">
              <h4 className="font-semibold">面试安排</h4>
            </div>
            <div className="divide-y">
              {teamsMeetings.data?.map((meeting) => (
                <div key={meeting.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${statusColors[meeting.status]}`}>
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{meeting.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(meeting.startTime).toLocaleString()} · {meeting.durationMinutes}分钟
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{statusLabels[meeting.status]}</Badge>
                    {meeting.status === 'scheduled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateMeeting.mutate({ id: meeting.id, status: 'in_progress' })}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        开始
                      </Button>
                    )}
                    {meeting.status === 'in_progress' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateMeeting.mutate({ id: meeting.id, status: 'completed' })}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        完成
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {(!teamsMeetings.data || teamsMeetings.data.length === 0) && (
                <div className="p-8 text-center text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无面试安排</p>
                  <Button className="mt-4" onClick={() => setShowScheduleDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    安排第一场面试
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ============================================
// 角色管理面板组件
// ============================================
function RoleManagementPanel() {
  const [selectedRole, setSelectedRole] = useState<string>("employee");
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  
  // 系统角色定义
  const systemRoles = [
    { id: "guest", name: "访客", description: "仅查看公开信息", color: "bg-gray-500", userCount: 0 },
    { id: "employee", name: "普通员工", description: "查看个人相关信息", color: "bg-blue-500", userCount: 15 },
    { id: "team_lead", name: "团队主管", description: "管理团队成员", color: "bg-cyan-500", userCount: 5 },
    { id: "dept_manager", name: "部门经理", description: "管理部门事务", color: "bg-green-500", userCount: 3 },
    { id: "hr_specialist", name: "HR专员", description: "处理HR日常事务", color: "bg-yellow-500", userCount: 2 },
    { id: "hr_manager", name: "HR经理", description: "管理HR团队和策略", color: "bg-orange-500", userCount: 1 },
    { id: "finance_specialist", name: "财务专员", description: "处理财务日常事务", color: "bg-pink-500", userCount: 2 },
    { id: "finance_manager", name: "财务经理", description: "管理财务团队", color: "bg-purple-500", userCount: 1 },
    { id: "director", name: "总监/副总", description: "高级管理权限", color: "bg-red-500", userCount: 2 },
    { id: "admin", name: "系统管理员", description: "完全系统权限", color: "bg-primary", userCount: 1 },
  ];

  // 模块权限定义
  const modulePermissions = [
    { module: "hrm_position", name: "岗位管理", category: "HRM" },
    { module: "hrm_candidate", name: "候选人管理", category: "HRM" },
    { module: "hrm_ai_interview", name: "AI面试系统", category: "HRM" },
    { module: "hrm_salary_structure", name: "薪酬结构", category: "HRM" },
    { module: "hrm_salary_detail", name: "薪资明细", category: "HRM" },
    { module: "hrm_performance", name: "绩效管理", category: "HRM" },
    { module: "hrm_training", name: "培训管理", category: "HRM" },
    { module: "pm_project", name: "项目管理", category: "PM" },
    { module: "pm_milestone", name: "里程碑管理", category: "PM" },
    { module: "crm_customer", name: "客户管理", category: "CRM" },
    { module: "crm_opportunity", name: "商机管理", category: "CRM" },
    { module: "system_user", name: "用户管理", category: "系统" },
    { module: "system_role", name: "角色管理", category: "系统" },
    { module: "system_audit", name: "审计日志", category: "系统" },
  ];

  // 权限矩阵（简化版）
  const getPermissionLevel = (roleId: string, moduleId: string): "none" | "read" | "write" => {
    // 管理员拥有所有权限
    if (roleId === "admin") return "write";
    
    // HR经理对HRM模块有写权限
    if (roleId === "hr_manager" && moduleId.startsWith("hrm_")) return "write";
    
    // HR专员对HRM模块有读权限，部分有写权限
    if (roleId === "hr_specialist" && moduleId.startsWith("hrm_")) {
      if (moduleId === "hrm_salary_detail") return "read";
      return "write";
    }
    
    // 财务经理对薪资有写权限
    if (roleId === "finance_manager" && moduleId.includes("salary")) return "write";
    
    // 部门经理对本部门有管理权限
    if (roleId === "dept_manager") {
      if (moduleId.startsWith("hrm_") && !moduleId.includes("salary")) return "read";
      if (moduleId.startsWith("pm_")) return "write";
      return "none";
    }
    
    // 普通员工只能查看个人相关
    if (roleId === "employee") {
      if (moduleId === "hrm_training") return "read";
      if (moduleId === "hrm_performance") return "read";
      return "none";
    }
    
    return "none";
  };

  const currentRole = systemRoles.find(r => r.id === selectedRole);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 角色列表 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            系统角色
          </CardTitle>
          <CardDescription>选择角色查看权限配置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {systemRoles.map((role) => (
              <div
                key={role.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedRole === role.id
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{role.userCount}人</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 权限矩阵 */}
      <Card className="bg-card/50 lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                权限配置 - {currentRole?.name}
              </CardTitle>
              <CardDescription>{currentRole?.description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddUserDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                添加用户
              </Button>
              <Button size="sm" onClick={() => setShowPermissionDialog(true)}>
                <Settings className="w-4 h-4 mr-2" />
                编辑权限
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 权限图例 */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span>可读写</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span>只读</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-300" />
                <span>无权限</span>
              </div>
            </div>

            {/* 按分类显示权限 */}
            {["HRM", "PM", "CRM", "系统"].map((category) => (
              <div key={category}>
                <h4 className="font-semibold mb-3 text-sm text-muted-foreground">{category}模块</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {modulePermissions
                    .filter((m) => m.category === category)
                    .map((module) => {
                      const level = getPermissionLevel(selectedRole, module.module);
                      return (
                        <div
                          key={module.module}
                          className={`p-3 rounded-lg border ${
                            level === "write"
                              ? "bg-green-500/10 border-green-500/30"
                              : level === "read"
                              ? "bg-blue-500/10 border-blue-500/30"
                              : "bg-muted/30 border-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{module.name}</span>
                            <Badge
                              variant={level === "none" ? "secondary" : "default"}
                              className={
                                level === "write"
                                  ? "bg-green-500"
                                  : level === "read"
                                  ? "bg-blue-500"
                                  : ""
                              }
                            >
                              {level === "write" ? "读写" : level === "read" ? "只读" : "无"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}

            {/* 敏感数据访问 */}
            <div>
              <h4 className="font-semibold mb-3 text-sm text-muted-foreground">敏感数据访问</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "员工薪资明细", access: selectedRole === "admin" || selectedRole === "hr_manager" || selectedRole === "finance_manager" },
                  { name: "员工身份信息", access: selectedRole === "admin" || selectedRole === "hr_manager" || selectedRole === "hr_specialist" },
                  { name: "面试评估报告", access: selectedRole === "admin" || selectedRole === "hr_manager" || selectedRole === "hr_specialist" || selectedRole === "dept_manager" },
                  { name: "绩效考核数据", access: selectedRole === "admin" || selectedRole === "hr_manager" || selectedRole === "dept_manager" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      item.access
                        ? "bg-orange-500/10 border-orange-500/30"
                        : "bg-muted/30 border-muted"
                    }`}
                  >
                    <span className="text-sm">{item.name}</span>
                    {item.access ? (
                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 添加用户对话框 */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加用户到角色</DialogTitle>
            <DialogDescription>将用户分配到 {currentRole?.name} 角色</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择用户</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择用户" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user1">张三 - 研发部</SelectItem>
                  <SelectItem value="user2">李四 - 销售部</SelectItem>
                  <SelectItem value="user3">王五 - 财务部</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>生效日期</Label>
              <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea placeholder="添加备注说明..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              toast.success("用户已添加到角色");
              setShowAddUserDialog(false);
            }}>
              确认添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑权限对话框 */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑权限 - {currentRole?.name}</DialogTitle>
            <DialogDescription>配置角色的模块访问权限</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {modulePermissions.map((module) => (
              <div key={module.module} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">{module.name}</p>
                  <p className="text-xs text-muted-foreground">{module.category}</p>
                </div>
                <Select defaultValue={getPermissionLevel(selectedRole, module.module)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无权限</SelectItem>
                    <SelectItem value="read">只读</SelectItem>
                    <SelectItem value="write">读写</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              toast.success("权限配置已保存");
              setShowPermissionDialog(false);
            }}>
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
