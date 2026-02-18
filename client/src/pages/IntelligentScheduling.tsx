/**
 * 智能排程页面 - 基于CP-SAT约束规划的生产排程
 */

import { useState, useMemo } from 'react';
import { PageHeader, StatCard } from "@/components/grt";
import { GanttChart, type GanttTask, type GanttResource } from '@/components/GanttChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Play,
  Pause,
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Clock,
  Users,
  Cpu,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Layers,
  Zap,
  ArrowRight,
  Download,
  Upload,
  Filter,
  Search,
  ChevronRight,
  Activity,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { format, addDays } from 'date-fns';

// ==================== 模拟数据 ====================

const mockTasks: GanttTask[] = [
  {
    id: '1',
    name: '机架加工',
    start: new Date(),
    end: addDays(new Date(), 3),
    resource: '数控车床A',
    resourceId: 'r1',
    bu: 'BU1',
    taskType: 'machining',
    progress: 100,
    dependencies: [],
  },
  {
    id: '2',
    name: '底座焊接',
    start: addDays(new Date(), 3),
    end: addDays(new Date(), 5),
    resource: '焊接工位1',
    resourceId: 'r2',
    bu: 'BU2',
    taskType: 'welding',
    progress: 60,
    dependencies: ['1'],
  },
  {
    id: '3',
    name: '主体组装',
    start: addDays(new Date(), 5),
    end: addDays(new Date(), 8),
    resource: '装配线A',
    resourceId: 'r3',
    bu: 'BU3',
    taskType: 'assembly',
    progress: 0,
    dependencies: ['2'],
  },
  {
    id: '4',
    name: '电气调试',
    start: addDays(new Date(), 8),
    end: addDays(new Date(), 10),
    resource: '调试工程师张',
    resourceId: 'r4',
    bu: 'BU4',
    taskType: 'debugging',
    progress: 0,
    dependencies: ['3'],
  },
  {
    id: '5',
    name: '整机测试',
    start: addDays(new Date(), 10),
    end: addDays(new Date(), 12),
    resource: '测试台1',
    resourceId: 'r5',
    bu: 'BU5',
    taskType: 'testing',
    progress: 0,
    dependencies: ['4'],
  },
  {
    id: '6',
    name: '喷淋系统加工',
    start: addDays(new Date(), 1),
    end: addDays(new Date(), 4),
    resource: '数控铣床B',
    resourceId: 'r6',
    bu: 'BU1',
    taskType: 'machining',
    progress: 80,
    dependencies: [],
  },
  {
    id: '7',
    name: '喷淋管路焊接',
    start: addDays(new Date(), 4),
    end: addDays(new Date(), 6),
    resource: '焊接工位2',
    resourceId: 'r7',
    bu: 'BU2',
    taskType: 'welding',
    progress: 20,
    dependencies: ['6'],
  },
];

const mockResources: GanttResource[] = [
  { id: 'r1', name: '数控车床A', type: 'equipment', bu: 'BU1', utilization: 85 },
  { id: 'r2', name: '焊接工位1', type: 'workstation', bu: 'BU2', utilization: 72 },
  { id: 'r3', name: '装配线A', type: 'workstation', bu: 'BU3', utilization: 60 },
  { id: 'r4', name: '调试工程师张', type: 'employee', bu: 'BU4', utilization: 90 },
  { id: 'r5', name: '测试台1', type: 'equipment', bu: 'BU5', utilization: 45 },
  { id: 'r6', name: '数控铣床B', type: 'equipment', bu: 'BU1', utilization: 78 },
  { id: 'r7', name: '焊接工位2', type: 'workstation', bu: 'BU2', utilization: 65 },
];

// ==================== 组件 ====================

export default function IntelligentScheduling() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('gantt');
  const [isScheduling, setIsScheduling] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [buFilter, setBuFilter] = useState<string>('all'); // BU筛选

  // 排程配置
  const [scheduleConfig, setScheduleConfig] = useState({
    jobName: `排程任务-${format(new Date(), 'yyyyMMdd-HHmm')}`,
    delayWeight: 1,
    changeoverWeight: 0.5,
    maxTimeSeconds: 60,
    optimizationLevel: 'balanced' as 'fast' | 'balanced' | 'optimal',
    startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDate: format(addDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm"),
  });

  // 新任务表单
  const [newTask, setNewTask] = useState({
    taskName: '',
    buCode: 'BU1',
    taskType: 'machining' as 'machining' | 'welding' | 'assembly' | 'debugging' | 'testing',
    estimatedHours: 8,
    priority: 5,
    earliestStart: '',
    latestFinish: '',
  });

  // tRPC queries
  const tasksQuery = trpc.scheduling.listTasks.useQuery({});
  const resourcesQuery = trpc.scheduling.listResources.useQuery({});
  const statisticsQuery = trpc.scheduling.getStatistics.useQuery();
  const jobsQuery = trpc.scheduling.listJobs.useQuery({});

  // tRPC mutations
  const createTaskMutation = trpc.scheduling.createTask.useMutation({
    onSuccess: () => {
      toast({ title: '任务创建成功' });
      setShowNewTaskDialog(false);
      tasksQuery.refetch();
    },
    onError: (error) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' });
    },
  });

  const runSchedulingMutation = trpc.scheduling.runScheduling.useMutation({
    onSuccess: (result) => {
      setIsScheduling(false);
      toast({ 
        title: result.feasible ? '排程完成' : '排程失败',
        description: result.message,
        variant: result.feasible ? 'default' : 'destructive',
      });
      jobsQuery.refetch();
      tasksQuery.refetch();
    },
    onError: (error) => {
      setIsScheduling(false);
      toast({ title: '排程错误', description: error.message, variant: 'destructive' });
    },
  });

  // 导出 mutations
  const exportExcelMutation = trpc.scheduling.exportToExcel.useMutation({
    onSuccess: (result) => {
      setIsExporting(false);
      // 下载Excel文件
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '导出成功', description: `文件已下载: ${result.filename}` });
      setShowExportDialog(false);
    },
    onError: (error) => {
      setIsExporting(false);
      toast({ title: '导出失败', description: error.message, variant: 'destructive' });
    },
  });

  const exportPDFMutation = trpc.scheduling.exportToPDF.useMutation({
    onSuccess: (result) => {
      setIsExporting(false);
      // 打开新窗口显示HTML内容，用户可以打印为PDF
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(result.htmlContent);
        newWindow.document.close();
      }
      toast({ title: '导出成功', description: '报告已在新窗口打开，请使用浏览器打印功能保存为PDF' });
      setShowExportDialog(false);
    },
    onError: (error) => {
      setIsExporting(false);
      toast({ title: '导出失败', description: error.message, variant: 'destructive' });
    },
  });

  const exportCSVMutation = trpc.scheduling.exportToCSV.useMutation({
    onSuccess: (result) => {
      setIsExporting(false);
      // 下载CSV文件
      const blob = new Blob([result.data], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '导出成功', description: `文件已下载: ${result.filename}` });
      setShowExportDialog(false);
    },
    onError: (error) => {
      setIsExporting(false);
      toast({ title: '导出失败', description: error.message, variant: 'destructive' });
    },
  });

  // 执行导出
  const handleExport = () => {
    setIsExporting(true);
    const params = { projectId: undefined };
    switch (exportFormat) {
      case 'excel':
        exportExcelMutation.mutate(params);
        break;
      case 'pdf':
        exportPDFMutation.mutate(params);
        break;
      case 'csv':
        exportCSVMutation.mutate(params);
        break;
    }
  };

  // 使用API数据或模拟数据
  const tasks = useMemo(() => {
    if (tasksQuery.data && tasksQuery.data.length > 0) {
      return tasksQuery.data.map((t: any) => ({
        id: t.id,
        name: t.task_name,
        start: t.scheduled_start || new Date(),
        end: t.scheduled_end || addDays(new Date(), 1),
        resource: '待分配',
        resourceId: t.assigned_resource_id,
        bu: t.bu_code,
        taskType: t.task_type,
        progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
        dependencies: t.predecessor_tasks ? JSON.parse(t.predecessor_tasks) : [],
      }));
    }
    return mockTasks;
  }, [tasksQuery.data]);

  const resources = useMemo(() => {
    if (resourcesQuery.data && resourcesQuery.data.length > 0) {
      return resourcesQuery.data.map((r: any) => ({
        id: r.id,
        name: r.resource_name,
        type: r.resource_type,
        bu: r.bu_code,
        utilization: 0,
      }));
    }
    return mockResources;
  }, [resourcesQuery.data]);

  const statistics = statisticsQuery.data || {
    tasks: { total: 7, pending: 3, scheduled: 2, in_progress: 1, completed: 1 },
    resources: { total: 7, available: 6, employees: 1, equipment: 3 },
    recentJobs: [],
    buDistribution: [],
  };

  // 执行排程
  const handleRunScheduling = () => {
    setIsScheduling(true);
    runSchedulingMutation.mutate({
      jobName: scheduleConfig.jobName,
      objectiveWeights: {
        delayWeight: scheduleConfig.delayWeight,
        changeoverWeight: scheduleConfig.changeoverWeight,
      },
      solverConfig: {
        maxTimeSeconds: scheduleConfig.maxTimeSeconds,
        optimizationLevel: scheduleConfig.optimizationLevel,
      },
      planningHorizon: {
        startDate: new Date(scheduleConfig.startDate).toISOString(),
        endDate: new Date(scheduleConfig.endDate).toISOString(),
      },
    });
    setShowScheduleDialog(false);
  };

  // 创建任务
  const handleCreateTask = () => {
    createTaskMutation.mutate({
      ...newTask,
      earliestStart: newTask.earliestStart ? new Date(newTask.earliestStart).toISOString() : undefined,
      latestFinish: newTask.latestFinish ? new Date(newTask.latestFinish).toISOString() : undefined,
    });
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Cpu}
          title="智能排程中心"
          description="基于约束规划的生产排程优化系统"
          actions={<>
            <Button variant="outline" onClick={() => setShowNewTaskDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              新建任务
            </Button>
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              <Download className="w-4 h-4 mr-1" />
              导出报告
            </Button>
            <Button onClick={() => setShowScheduleDialog(true)} disabled={isScheduling}>
              {isScheduling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  排程中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  执行排程
                </>
              )}
            </Button>
          </>}
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Clock} label="待排程任务" value={statistics.tasks.pending} subtitle={`共 ${statistics.tasks.total} 个任务`} iconColor="text-orange-600" iconBg="bg-orange-100" />
          <StatCard icon={Users} label="可用资源" value={statistics.resources.available} subtitle={`${statistics.resources.employees} 人员 / ${statistics.resources.equipment} 设备`} iconColor="text-blue-600" iconBg="bg-blue-100" />
          <StatCard icon={Activity} label="进行中" value={statistics.tasks.in_progress} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard icon={CheckCircle2} label="已完成" value={statistics.tasks.completed} iconColor="text-purple-600" iconBg="bg-purple-100" trend={{ value: 85, label: "本周完成率" }} />
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="gantt">
              <BarChart3 className="w-4 h-4 mr-1" />
              甘特图
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <Layers className="w-4 h-4 mr-1" />
              任务列表
            </TabsTrigger>
            <TabsTrigger value="resources">
              <Users className="w-4 h-4 mr-1" />
              资源管理
            </TabsTrigger>
            <TabsTrigger value="constraints">
              <Settings className="w-4 h-4 mr-1" />
              约束配置
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-1" />
              排程历史
            </TabsTrigger>
          </TabsList>

          {/* 甘特图 */}
          <TabsContent value="gantt" className="mt-4">
            <GanttChart
              tasks={tasks}
              resources={resources}
              onTaskClick={(task) => {
                setSelectedTask(task);
                toast({ title: `选中任务: ${task.name}` });
              }}
              height={500}
            />
          </TabsContent>

          {/* 任务列表 */}
          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>排程任务</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input placeholder="搜索任务..." className="w-[200px]" />
                    <Select value={buFilter} onValueChange={setBuFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="筛选事业部" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部事业部</SelectItem>
                        <SelectItem value="BU1">BU1 - 海外事业部</SelectItem>
                        <SelectItem value="BU2">BU2 - 商用车事业部</SelectItem>
                        <SelectItem value="BU3">BU3 - 乘用车事业部</SelectItem>
                        <SelectItem value="BU4">BU4 - 半导体事业部</SelectItem>
                        <SelectItem value="BU5">BU5 - 工业通用事业部</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.filter(task => buFilter === 'all' || task.bu === buFilter).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              task.bu === 'BU1' ? '#3b82f6' :
                              task.bu === 'BU2' ? '#f59e0b' :
                              task.bu === 'BU3' ? '#10b981' :
                              task.bu === 'BU4' ? '#8b5cf6' :
                              '#ef4444'
                          }}
                        />
                        <div>
                          <p className="font-medium">{task.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(task.start), 'MM/dd')} - {format(new Date(task.end), 'MM/dd')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{task.bu}</Badge>
                        <Badge variant="secondary">{task.resource}</Badge>
                        <div className="w-20">
                          <Progress value={task.progress} className="h-2" />
                        </div>
                        <span className="text-xs text-muted-foreground w-10">{task.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 资源管理 */}
          <TabsContent value="resources" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => (
                <Card key={resource.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {resource.type === 'employee' ? (
                          <Users className="w-5 h-5 text-blue-500" />
                        ) : resource.type === 'equipment' ? (
                          <Cpu className="w-5 h-5 text-green-500" />
                        ) : (
                          <Layers className="w-5 h-5 text-purple-500" />
                        )}
                        <span className="font-medium">{resource.name}</span>
                      </div>
                      <Badge variant="outline">{resource.bu}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">利用率</span>
                        <span className="font-medium">{resource.utilization}%</span>
                      </div>
                      <Progress value={resource.utilization} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 约束配置 */}
          <TabsContent value="constraints" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>排程约束</CardTitle>
                <CardDescription>配置影响排程结果的约束条件</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">BU间前后置关系</p>
                      <p className="text-sm text-muted-foreground">BU2焊接完成后才能开始BU3总装</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">员工请假约束</p>
                      <p className="text-sm text-muted-foreground">请假期间产能为0</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">报工时间约束</p>
                      <p className="text-sm text-muted-foreground">任务必须在昨天报工完成后开始</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">设备换型时间</p>
                      <p className="text-sm text-muted-foreground">不同产品间切换需要换型时间</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 排程历史 */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>排程历史记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(jobsQuery.data || []).length > 0 ? (
                    (jobsQuery.data as any[]).map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {job.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : job.status === 'failed' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          )}
                          <div>
                            <p className="font-medium">{job.job_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(job.created_at), 'yyyy-MM-dd HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={job.status === 'completed' ? 'default' : 'destructive'}>
                            {job.status}
                          </Badge>
                          {job.solve_time_seconds && (
                            <span className="text-xs text-muted-foreground">
                              {job.solve_time_seconds.toFixed(2)}s
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无排程记录
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 新建任务对话框 */}
        <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建排程任务</DialogTitle>
              <DialogDescription>创建新的生产任务加入排程队列</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>任务名称</Label>
                <Input
                  value={newTask.taskName}
                  onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                  placeholder="输入任务名称"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>所属BU</Label>
                  <Select
                    value={newTask.buCode}
                    onValueChange={(v) => setNewTask({ ...newTask, buCode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BU1">BU1 - 海外事业部</SelectItem>
                      <SelectItem value="BU2">BU2 - 商用车事业部</SelectItem>
                      <SelectItem value="BU3">BU3 - 乘用车事业部</SelectItem>
                      <SelectItem value="BU4">BU4 - 半导体事业部</SelectItem>
                      <SelectItem value="BU5">BU5 - 工业通用事业部</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>任务类型</Label>
                  <Select
                    value={newTask.taskType}
                    onValueChange={(v: any) => setNewTask({ ...newTask, taskType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="machining">机加工</SelectItem>
                      <SelectItem value="welding">焊接</SelectItem>
                      <SelectItem value="assembly">装配</SelectItem>
                      <SelectItem value="debugging">调试</SelectItem>
                      <SelectItem value="testing">测试</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>预估工时 (小时)</Label>
                  <Input
                    type="number"
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseInt(e.target.value) || 8 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>优先级 (1-10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>最早开始时间</Label>
                  <Input
                    type="datetime-local"
                    value={newTask.earliestStart}
                    onChange={(e) => setNewTask({ ...newTask, earliestStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>最晚完成时间</Label>
                  <Input
                    type="datetime-local"
                    value={newTask.latestFinish}
                    onChange={(e) => setNewTask({ ...newTask, latestFinish: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建任务'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 执行排程对话框 */}
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>执行排程</DialogTitle>
              <DialogDescription>配置排程参数并执行优化计算</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>排程任务名称</Label>
                <Input
                  value={scheduleConfig.jobName}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, jobName: e.target.value })}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">目标函数权重</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">延迟惩罚权重</span>
                    <span className="text-sm font-medium">{scheduleConfig.delayWeight}</span>
                  </div>
                  <Slider
                    value={[scheduleConfig.delayWeight]}
                    onValueChange={([v]) => setScheduleConfig({ ...scheduleConfig, delayWeight: v })}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">换型成本权重</span>
                    <span className="text-sm font-medium">{scheduleConfig.changeoverWeight}</span>
                  </div>
                  <Slider
                    value={[scheduleConfig.changeoverWeight]}
                    onValueChange={([v]) => setScheduleConfig({ ...scheduleConfig, changeoverWeight: v })}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>优化级别</Label>
                  <Select
                    value={scheduleConfig.optimizationLevel}
                    onValueChange={(v: any) => setScheduleConfig({ ...scheduleConfig, optimizationLevel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">快速 (30s)</SelectItem>
                      <SelectItem value="balanced">平衡 (60s)</SelectItem>
                      <SelectItem value="optimal">最优 (120s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>最大求解时间 (秒)</Label>
                  <Input
                    type="number"
                    value={scheduleConfig.maxTimeSeconds}
                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, maxTimeSeconds: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>计划开始日期</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleConfig.startDate}
                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>计划结束日期</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleConfig.endDate}
                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                取消
              </Button>
              <Button onClick={handleRunScheduling}>
                <Play className="w-4 h-4 mr-1" />
                开始排程
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 导出报告对话框 */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>导出排程报告</DialogTitle>
              <DialogDescription>选择导出格式和范围</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>导出格式</Label>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'excel' | 'pdf' | 'csv')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Excel (.xlsx) - 包含甘特图和统计数据
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        PDF - 可打印的报告格式
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        CSV - 纯数据格式
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                {exportFormat === 'excel' && (
                  <p>导出Excel文件包含：任务列表、资源分配、甘特图数据、统计摘要</p>
                )}
                {exportFormat === 'pdf' && (
                  <p>导出PDF报告包含：项目概览、甘特图、资源利用率、关键指标</p>
                )}
                {exportFormat === 'csv' && (
                  <p>导出CSV文件包含：所有任务的详细数据，可导入其他系统</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                取消
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1" />
                    开始导出
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
