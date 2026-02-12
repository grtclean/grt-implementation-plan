/**
 * 导出任务优先级队列管理组件
 * v2.5.20 - 优先级设置、紧急任务插队、队列管理
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  ListOrdered, 
  Plus, 
  ArrowUp, 
  ArrowDown,
  Clock,
  Download,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Settings,
  FileSpreadsheet,
  FileJson,
  FileText
} from 'lucide-react';

// 类型定义
type ExportPriority = 'critical' | 'high' | 'normal' | 'low';
type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface ExportTask {
  id: string;
  name: string;
  description: string;
  type: string;
  priority: ExportPriority;
  status: ExportStatus;
  queuePosition: number;
  estimatedWaitTime: number;
  estimatedProcessTime: number;
  format: string;
  rowCount: number;
  fileSize: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdBy: string;
  department: string;
  downloadUrl: string | null;
  progress?: number;
}

// 模拟数据
const mockTasks: ExportTask[] = [
  {
    id: 'export-001',
    name: '月度销售报表',
    description: '2024年1月销售数据汇总',
    type: 'report',
    priority: 'critical',
    status: 'processing',
    queuePosition: 0,
    estimatedWaitTime: 0,
    estimatedProcessTime: 120,
    format: 'excel',
    rowCount: 15000,
    fileSize: 0,
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    startedAt: new Date(Date.now() - 2 * 60 * 1000),
    completedAt: null,
    createdBy: '张经理',
    department: '销售部',
    downloadUrl: null,
    progress: 65
  },
  {
    id: 'export-002',
    name: '设备清单导出',
    description: '全部设备信息导出',
    type: 'data',
    priority: 'high',
    status: 'queued',
    queuePosition: 1,
    estimatedWaitTime: 60,
    estimatedProcessTime: 45,
    format: 'csv',
    rowCount: 5000,
    fileSize: 0,
    createdAt: new Date(Date.now() - 3 * 60 * 1000),
    startedAt: null,
    completedAt: null,
    createdBy: '李工程师',
    department: '技术部',
    downloadUrl: null
  },
  {
    id: 'export-003',
    name: '审计日志导出',
    description: '本季度操作审计日志',
    type: 'audit',
    priority: 'normal',
    status: 'queued',
    queuePosition: 2,
    estimatedWaitTime: 105,
    estimatedProcessTime: 90,
    format: 'json',
    rowCount: 50000,
    fileSize: 0,
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
    startedAt: null,
    completedAt: null,
    createdBy: '王审计',
    department: '审计部',
    downloadUrl: null
  },
  {
    id: 'export-004',
    name: '客户数据备份',
    description: '客户信息完整备份',
    type: 'backup',
    priority: 'low',
    status: 'queued',
    queuePosition: 3,
    estimatedWaitTime: 195,
    estimatedProcessTime: 180,
    format: 'json',
    rowCount: 100000,
    fileSize: 0,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    startedAt: null,
    completedAt: null,
    createdBy: '系统',
    department: 'IT部',
    downloadUrl: null
  },
  {
    id: 'export-005',
    name: '周报数据导出',
    description: '上周工作数据汇总',
    type: 'report',
    priority: 'normal',
    status: 'completed',
    queuePosition: 0,
    estimatedWaitTime: 0,
    estimatedProcessTime: 30,
    format: 'excel',
    rowCount: 2000,
    fileSize: 524288,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    startedAt: new Date(Date.now() - 55 * 60 * 1000),
    completedAt: new Date(Date.now() - 54 * 60 * 1000),
    createdBy: '赵主管',
    department: '运营部',
    downloadUrl: '/downloads/weekly-report.xlsx'
  }
];

export default function ExportPriorityQueueManager() {
  const [tasks, setTasks] = useState<ExportTask[]>(mockTasks);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExpediteDialogOpen, setIsExpediteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ExportTask | null>(null);
  const [activeTab, setActiveTab] = useState('queue');

  // 获取优先级徽章
  const getPriorityBadge = (priority: ExportPriority) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><Zap className="w-3 h-3 mr-1" />紧急</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><ArrowUp className="w-3 h-3 mr-1" />高</Badge>;
      case 'normal':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">普通</Badge>;
      case 'low':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><ArrowDown className="w-3 h-3 mr-1" />低</Badge>;
      default:
        return null;
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status: ExportStatus) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-400"><Clock className="w-3 h-3 mr-1" />排队中</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-400"><Play className="w-3 h-3 mr-1" />处理中</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500/50 text-green-400"><CheckCircle className="w-3 h-3 mr-1" />已完成</Badge>;
      case 'failed':
        return <Badge variant="outline" className="border-red-500/50 text-red-400"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-gray-500/50 text-gray-400">已取消</Badge>;
      default:
        return null;
    }
  };

  // 获取格式图标
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-yellow-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // 格式化等待时间
  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}分${secs}秒` : `${minutes}分钟`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 紧急插队
  const handleExpedite = (task: ExportTask) => {
    setSelectedTask(task);
    setIsExpediteDialogOpen(true);
  };

  // 确认插队
  const confirmExpedite = () => {
    if (!selectedTask) return;
    
    setTasks(tasks.map(t => {
      if (t.id === selectedTask.id) {
        return { ...t, priority: 'critical' as ExportPriority, queuePosition: 1 };
      }
      if (t.status === 'queued' && t.id !== selectedTask.id) {
        return { ...t, queuePosition: t.queuePosition + 1 };
      }
      return t;
    }));
    
    setIsExpediteDialogOpen(false);
    setSelectedTask(null);
  };

  // 取消任务
  const cancelTask = (taskId: string) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: 'cancelled' as ExportStatus } : t
    ));
  };

  // 统计数据
  const stats = {
    totalQueued: tasks.filter(t => t.status === 'queued').length,
    processing: tasks.filter(t => t.status === 'processing').length,
    completedToday: tasks.filter(t => t.status === 'completed').length,
    avgWaitTime: Math.round(tasks.filter(t => t.status === 'queued').reduce((sum, t) => sum + t.estimatedWaitTime, 0) / Math.max(tasks.filter(t => t.status === 'queued').length, 1))
  };

  const queuedTasks = tasks.filter(t => t.status === 'queued' || t.status === 'processing').sort((a, b) => {
    if (a.status === 'processing') return -1;
    if (b.status === 'processing') return 1;
    return a.queuePosition - b.queuePosition;
  });

  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-primary" />
            导出任务优先级队列
          </h1>
          <p className="text-muted-foreground mt-1">
            管理导出任务队列，支持优先级调整和紧急插队
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建导出任务
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建导出任务</DialogTitle>
              <DialogDescription>
                创建新的数据导出任务并加入队列
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>任务名称</Label>
                <Input placeholder="例如：月度销售报表" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>导出格式</Label>
                  <Select defaultValue="excel">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select defaultValue="normal">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">紧急</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="normal">普通</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>取消</Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>创建任务</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">排队中</p>
                <p className="text-2xl font-bold">{stats.totalQueued}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Play className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">处理中</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">今日完成</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">平均等待</p>
                <p className="text-2xl font-bold">{formatWaitTime(stats.avgWaitTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            当前队列
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            历史记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {queuedTasks.map((task, index) => (
            <Card key={task.id} className={`bg-card/50 ${task.status === 'processing' ? 'border-yellow-500/50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* 队列位置 */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      task.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      {task.status === 'processing' ? <Play className="w-5 h-5" /> : task.queuePosition}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getFormatIcon(task.format)}
                        <span className="font-medium">{task.name}</span>
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>创建者: {task.createdBy}</span>
                        <span>部门: {task.department}</span>
                        <span>预计行数: {task.rowCount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {task.status === 'queued' && (
                      <>
                        <div className="text-right mr-4">
                          <p className="text-sm text-muted-foreground">预计等待</p>
                          <p className="font-medium">{formatWaitTime(task.estimatedWaitTime)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExpedite(task)}
                          disabled={task.priority === 'critical'}
                        >
                          <Zap className="w-4 h-4 mr-1" />
                          插队
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    {task.status === 'processing' && task.progress !== undefined && (
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span>进度</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {queuedTasks.length === 0 && (
            <Card className="bg-card/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                队列为空，暂无待处理的导出任务
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {completedTasks.map((task) => (
            <Card key={task.id} className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getFormatIcon(task.format)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.name}</span>
                        {getStatusBadge(task.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.completedAt?.toLocaleString()} | {task.rowCount.toLocaleString()} 行 | {formatFileSize(task.fileSize)}
                      </p>
                    </div>
                  </div>
                  
                  {task.status === 'completed' && task.downloadUrl && (
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      下载
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* 插队确认对话框 */}
      <Dialog open={isExpediteDialogOpen} onOpenChange={setIsExpediteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              确认紧急插队
            </DialogTitle>
            <DialogDescription>
              将任务 "{selectedTask?.name}" 提升为紧急优先级并插入队列最前
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>插队原因</Label>
              <Input placeholder="请输入紧急插队的原因..." />
            </div>
            <p className="text-sm text-muted-foreground">
              注意：紧急插队会影响其他任务的等待时间，请确保确有紧急需求。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsExpediteDialogOpen(false)}>取消</Button>
              <Button onClick={confirmExpedite} className="bg-red-500 hover:bg-red-600">
                <Zap className="w-4 h-4 mr-1" />
                确认插队
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
