/**
 * 异步导出任务管理组件
 * v2.5.17 - 任务队列、进度追踪、下载管理
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  FileText, 
  File,
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Bell,
  AlertTriangle
} from 'lucide-react';

// 类型定义
type ExportFormat = 'excel' | 'csv' | 'json' | 'pdf';
type ExportType = 'workflow_history' | 'equipment_list' | 'maintenance_records' | 'notification_logs' | 'aggregation_stats';
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface ExportTask {
  id: string;
  type: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  fileName: string;
  fileSize: number | null;
  downloadUrl: string | null;
  expiresAt: string | null;
  error: string | null;
}

interface ExportQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
  estimatedWaitTime: number;
}

interface ExportNotification {
  taskId: string;
  type: 'started' | 'progress' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  downloadUrl?: string;
}

// 模拟数据
const generateMockTasks = (): ExportTask[] => {
  const types: ExportType[] = ['workflow_history', 'equipment_list', 'maintenance_records', 'notification_logs', 'aggregation_stats'];
  const formats: ExportFormat[] = ['excel', 'csv', 'json', 'pdf'];
  const statuses: ExportStatus[] = ['pending', 'processing', 'completed', 'failed'];

  return Array.from({ length: 8 }, (_, i) => {
    const status = statuses[Math.min(i, statuses.length - 1)] as ExportStatus;
    const type = types[i % types.length];
    const format = formats[i % formats.length];
    
    return {
      id: `task-${i + 1}`,
      type,
      format,
      status,
      progress: status === 'completed' ? 100 : status === 'processing' ? Math.floor(Math.random() * 80) + 10 : 0,
      createdAt: new Date(Date.now() - (i + 1) * 600000).toISOString(),
      startedAt: status !== 'pending' ? new Date(Date.now() - i * 500000).toISOString() : null,
      completedAt: status === 'completed' || status === 'failed' ? new Date(Date.now() - i * 300000).toISOString() : null,
      fileName: `${getTypeLabel(type)}_${new Date().toISOString().slice(0, 10)}.${format}`,
      fileSize: status === 'completed' ? Math.floor(Math.random() * 1024 * 1024) + 10240 : null,
      downloadUrl: status === 'completed' ? `/api/exports/download/task-${i + 1}` : null,
      expiresAt: status === 'completed' ? new Date(Date.now() + 24 * 3600000).toISOString() : null,
      error: status === 'failed' ? '连接超时，请重试' : null
    };
  });
};

const generateMockStats = (): ExportQueueStats => ({
  pending: 2,
  processing: 1,
  completed: 45,
  failed: 3,
  averageProcessingTime: 25000,
  estimatedWaitTime: 50000
});

// 辅助函数
function getTypeLabel(type: ExportType): string {
  const labels: Record<ExportType, string> = {
    workflow_history: '工作流执行历史',
    equipment_list: '设备列表',
    maintenance_records: '保养记录',
    notification_logs: '通知日志',
    aggregation_stats: '聚合统计'
  };
  return labels[type];
}

function getFormatIcon(format: ExportFormat) {
  switch (format) {
    case 'excel': return FileSpreadsheet;
    case 'csv': return FileText;
    case 'json': return FileJson;
    case 'pdf': return File;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}秒`;
  return `${(ms / 60000).toFixed(1)}分钟`;
}

// 状态徽章组件
const StatusBadge = ({ status }: { status: ExportStatus }) => {
  const config = {
    pending: { label: '排队中', variant: 'secondary' as const, icon: Clock },
    processing: { label: '处理中', variant: 'default' as const, icon: Loader2, animate: true },
    completed: { label: '已完成', variant: 'outline' as const, icon: CheckCircle2, color: 'text-green-500' },
    failed: { label: '失败', variant: 'destructive' as const, icon: XCircle },
    cancelled: { label: '已取消', variant: 'secondary' as const, icon: XCircle }
  };

  const { label, variant, icon: Icon, animate, color } = config[status] as any;

  return (
    <Badge variant={variant} className={`flex items-center gap-1 ${color || ''}`}>
      <Icon className={`w-3 h-3 ${animate ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
};

// 创建导出对话框
const CreateExportDialog = ({ 
  onSubmit 
}: { 
  onSubmit: (type: ExportType, format: ExportFormat) => void 
}) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ExportType>('workflow_history');
  const [format, setFormat] = useState<ExportFormat>('excel');

  const handleSubmit = () => {
    onSubmit(type, format);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          新建导出
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建导出任务</DialogTitle>
          <DialogDescription>
            选择要导出的数据类型和文件格式
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">数据类型</label>
            <Select value={type} onValueChange={(v) => setType(v as ExportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workflow_history">工作流执行历史</SelectItem>
                <SelectItem value="equipment_list">设备列表</SelectItem>
                <SelectItem value="maintenance_records">保养记录</SelectItem>
                <SelectItem value="notification_logs">通知日志</SelectItem>
                <SelectItem value="aggregation_stats">聚合统计</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">文件格式</label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit}>创建任务</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 任务列表项
const TaskItem = ({ 
  task, 
  onCancel, 
  onRetry 
}: { 
  task: ExportTask; 
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) => {
  const FormatIcon = getFormatIcon(task.format);

  return (
    <div className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded">
            <FormatIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium">{getTypeLabel(task.type)}</p>
            <p className="text-sm text-muted-foreground">{task.fileName}</p>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.status === 'processing' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">处理进度</span>
            <span>{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-2" />
        </div>
      )}

      {task.error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertTriangle className="w-4 h-4" />
          {task.error}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>创建于 {new Date(task.createdAt).toLocaleString('zh-CN')}</span>
        {task.fileSize && <span>{formatFileSize(task.fileSize)}</span>}
      </div>

      <div className="flex items-center gap-2">
        {task.status === 'completed' && task.downloadUrl && (
          <Button size="sm" asChild>
            <a href={task.downloadUrl} download>
              <Download className="w-4 h-4 mr-1" />
              下载
            </a>
          </Button>
        )}
        {task.status === 'pending' && (
          <Button variant="outline" size="sm" onClick={() => onCancel(task.id)}>
            <Trash2 className="w-4 h-4 mr-1" />
            取消
          </Button>
        )}
        {task.status === 'failed' && (
          <Button variant="outline" size="sm" onClick={() => onRetry(task.id)}>
            <RefreshCw className="w-4 h-4 mr-1" />
            重试
          </Button>
        )}
        {task.expiresAt && task.status === 'completed' && (
          <span className="text-xs text-muted-foreground ml-auto">
            过期时间: {new Date(task.expiresAt).toLocaleString('zh-CN')}
          </span>
        )}
      </div>
    </div>
  );
};

// 主组件
export default function AsyncExportManager() {
  const [tasks, setTasks] = useState<ExportTask[]>([]);
  const [stats, setStats] = useState<ExportQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ExportStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setTasks(generateMockTasks());
      setStats(generateMockStats());
    } catch (error) {
      console.error('获取导出任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // 定期刷新处理中的任务
    const interval = setInterval(() => {
      setTasks(prev => prev.map(task => {
        if (task.status === 'processing') {
          const newProgress = Math.min(99, task.progress + Math.floor(Math.random() * 10) + 5);
          if (newProgress >= 99) {
            return {
              ...task,
              status: 'completed' as ExportStatus,
              progress: 100,
              completedAt: new Date().toISOString(),
              fileSize: Math.floor(Math.random() * 1024 * 1024) + 10240,
              downloadUrl: `/api/exports/download/${task.id}`,
              expiresAt: new Date(Date.now() + 24 * 3600000).toISOString()
            };
          }
          return { ...task, progress: newProgress };
        }
        return task;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCreateExport = (type: ExportType, format: ExportFormat) => {
    const newTask: ExportTask = {
      id: `task-${Date.now()}`,
      type,
      format,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      fileName: `${getTypeLabel(type)}_${new Date().toISOString().slice(0, 10)}.${format}`,
      fileSize: null,
      downloadUrl: null,
      expiresAt: null,
      error: null
    };
    setTasks(prev => [newTask, ...prev]);
    
    // 模拟开始处理
    setTimeout(() => {
      setTasks(prev => prev.map(t => 
        t.id === newTask.id 
          ? { ...t, status: 'processing' as ExportStatus, startedAt: new Date().toISOString() }
          : t
      ));
    }, 1000);
  };

  const handleCancelTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'cancelled' as ExportStatus, completedAt: new Date().toISOString() }
        : t
    ));
  };

  const handleRetryTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'pending' as ExportStatus, progress: 0, error: null, completedAt: null }
        : t
    ));
    
    // 模拟开始处理
    setTimeout(() => {
      setTasks(prev => prev.map(t => 
        t.id === taskId && t.status === 'pending'
          ? { ...t, status: 'processing' as ExportStatus, startedAt: new Date().toISOString() }
          : t
      ));
    }, 1000);
  };

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Download className="w-6 h-6 text-primary" />
            导出任务管理
          </h2>
          <p className="text-muted-foreground">管理数据导出任务，支持后台处理和进度追踪</p>
        </div>
        <CreateExportDialog onSubmit={handleCreateExport} />
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">排队中</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">处理中</p>
                  <p className="text-2xl font-bold text-primary">{stats.processing}</p>
                </div>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">预计等待</p>
                  <p className="text-2xl font-bold">{formatDuration(stats.estimatedWaitTime)}</p>
                </div>
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>导出任务列表</CardTitle>
              <CardDescription>查看和管理所有导出任务</CardDescription>
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as ExportStatus | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">排队中</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无导出任务</p>
              <p className="text-sm mt-1">点击"新建导出"创建第一个导出任务</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onCancel={handleCancelTask}
                  onRetry={handleRetryTask}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
