/**
 * 导出任务断点续传管理组件
 * v2.5.19 - 大数据量导出支持断点续传、进度保存、恢复下载
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Pause, 
  Play, 
  RefreshCw, 
  Trash2, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  HardDrive,
  Zap,
  Eye,
  Plus
} from 'lucide-react';

type ExportStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
type ExportFormat = 'excel' | 'csv' | 'json' | 'pdf';
type DataType = 'workflow_history' | 'device_list' | 'maintenance_records' | 'notification_logs' | 'aggregation_stats';

interface ResumableExportTask {
  id: string;
  dataType: DataType;
  format: ExportFormat;
  status: ExportStatus;
  totalRecords: number;
  processedRecords: number;
  progress: number;
  fileName: string;
  fileSize: number;
  downloadUrl: string | null;
  downloadExpiry: Date | null;
  totalChunks: number;
  completedChunks: number;
  createdAt: Date;
  startedAt: Date | null;
  pausedAt: Date | null;
  completedAt: Date | null;
  estimatedTimeRemaining: number | null;
  error: string | null;
  retryCount: number;
}

// 模拟数据
const mockTasks: ResumableExportTask[] = [
  {
    id: 'exp-1',
    dataType: 'workflow_history',
    format: 'excel',
    status: 'processing',
    totalRecords: 50000,
    processedRecords: 32000,
    progress: 64,
    fileName: 'workflow_history_20260127.xlsx',
    fileSize: 0,
    downloadUrl: null,
    downloadExpiry: null,
    totalChunks: 5,
    completedChunks: 3,
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
    startedAt: new Date(Date.now() - 8 * 60 * 1000),
    pausedAt: null,
    completedAt: null,
    estimatedTimeRemaining: 180,
    error: null,
    retryCount: 0
  },
  {
    id: 'exp-2',
    dataType: 'device_list',
    format: 'csv',
    status: 'paused',
    totalRecords: 100000,
    processedRecords: 45000,
    progress: 45,
    fileName: 'device_list_20260127.csv',
    fileSize: 0,
    downloadUrl: null,
    downloadExpiry: null,
    totalChunks: 10,
    completedChunks: 4,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    startedAt: new Date(Date.now() - 25 * 60 * 1000),
    pausedAt: new Date(Date.now() - 5 * 60 * 1000),
    completedAt: null,
    estimatedTimeRemaining: 600,
    error: null,
    retryCount: 0
  },
  {
    id: 'exp-3',
    dataType: 'maintenance_records',
    format: 'excel',
    status: 'completed',
    totalRecords: 20000,
    processedRecords: 20000,
    progress: 100,
    fileName: 'maintenance_records_20260127.xlsx',
    fileSize: 5242880,
    downloadUrl: '/api/exports/exp-3/download',
    downloadExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    totalChunks: 2,
    completedChunks: 2,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    startedAt: new Date(Date.now() - 55 * 60 * 1000),
    pausedAt: null,
    completedAt: new Date(Date.now() - 50 * 60 * 1000),
    estimatedTimeRemaining: null,
    error: null,
    retryCount: 0
  },
  {
    id: 'exp-4',
    dataType: 'notification_logs',
    format: 'json',
    status: 'failed',
    totalRecords: 80000,
    processedRecords: 25000,
    progress: 31,
    fileName: 'notification_logs_20260127.json',
    fileSize: 0,
    downloadUrl: null,
    downloadExpiry: null,
    totalChunks: 8,
    completedChunks: 2,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    startedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    pausedAt: null,
    completedAt: null,
    estimatedTimeRemaining: null,
    error: '网络连接超时',
    retryCount: 2
  }
];

const statusConfig: Record<ExportStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof FileText; color: string }> = {
  pending: { label: '待处理', variant: 'secondary', icon: Clock, color: 'text-gray-500' },
  processing: { label: '处理中', variant: 'default', icon: RefreshCw, color: 'text-blue-500' },
  paused: { label: '已暂停', variant: 'outline', icon: Pause, color: 'text-yellow-500' },
  completed: { label: '已完成', variant: 'default', icon: CheckCircle, color: 'text-green-500' },
  failed: { label: '失败', variant: 'destructive', icon: AlertTriangle, color: 'text-red-500' },
  cancelled: { label: '已取消', variant: 'outline', icon: XCircle, color: 'text-gray-400' }
};

const dataTypeConfig: Record<DataType, string> = {
  workflow_history: '工作流历史',
  device_list: '设备列表',
  maintenance_records: '保养记录',
  notification_logs: '通知日志',
  aggregation_stats: '聚合统计'
};

const formatConfig: Record<ExportFormat, { label: string; icon: string }> = {
  excel: { label: 'Excel', icon: '📊' },
  csv: { label: 'CSV', icon: '📄' },
  json: { label: 'JSON', icon: '📋' },
  pdf: { label: 'PDF', icon: '📕' }
};

export default function ExportResumableManager() {
  const [tasks, setTasks] = useState<ResumableExportTask[]>(mockTasks);
  const [selectedTask, setSelectedTask] = useState<ResumableExportTask | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 模拟进度更新
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(task => {
        if (task.status !== 'processing') return task;
        
        const newProcessed = Math.min(task.processedRecords + 1000, task.totalRecords);
        const newProgress = Math.round((newProcessed / task.totalRecords) * 100);
        const newCompletedChunks = Math.floor(newProcessed / 10000);
        
        if (newProgress >= 100) {
          return {
            ...task,
            processedRecords: task.totalRecords,
            progress: 100,
            completedChunks: task.totalChunks,
            status: 'completed' as ExportStatus,
            completedAt: new Date(),
            downloadUrl: `/api/exports/${task.id}/download`,
            downloadExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            fileSize: task.totalRecords * 100,
            estimatedTimeRemaining: null
          };
        }
        
        return {
          ...task,
          processedRecords: newProcessed,
          progress: newProgress,
          completedChunks: newCompletedChunks,
          estimatedTimeRemaining: Math.max(0, (task.estimatedTimeRemaining || 0) - 1)
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 统计数据
  const stats = {
    totalTasks: tasks.length,
    processingTasks: tasks.filter(t => t.status === 'processing').length,
    pausedTasks: tasks.filter(t => t.status === 'paused').length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    failedTasks: tasks.filter(t => t.status === 'failed').length,
    totalDataExported: tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.fileSize, 0)
  };

  // 暂停任务
  const handlePause = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'paused' as ExportStatus, pausedAt: new Date() }
        : t
    ));
  };

  // 恢复任务
  const handleResume = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'processing' as ExportStatus, pausedAt: null }
        : t
    ));
  };

  // 重试任务
  const handleRetry = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'processing' as ExportStatus, error: null, retryCount: 0 }
        : t
    ));
  };

  // 取消任务
  const handleCancel = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'cancelled' as ExportStatus }
        : t
    ));
  };

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  // 格式化剩余时间
  const formatTimeRemaining = (seconds: number | null) => {
    if (seconds === null) return '-';
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">导出任务管理</h1>
          <p className="text-muted-foreground">支持大数据量导出的断点续传功能</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建导出
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总任务</p>
                <p className="text-2xl font-bold">{stats.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">处理中</p>
                <p className="text-2xl font-bold">{stats.processingTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Pause className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已暂停</p>
                <p className="text-2xl font-bold">{stats.pausedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold">{stats.completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">失败</p>
                <p className="text-2xl font-bold">{stats.failedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已导出</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalDataExported)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle>导出任务列表</CardTitle>
          <CardDescription>管理所有导出任务，支持暂停、恢复和断点续传</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>文件名</TableHead>
                <TableHead>数据类型</TableHead>
                <TableHead>格式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>剩余时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(task => {
                const StatusIcon = statusConfig[task.status].icon;
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatConfig[task.format].icon}</span>
                        <div>
                          <p className="font-medium">{task.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.processedRecords.toLocaleString()} / {task.totalRecords.toLocaleString()} 条
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{dataTypeConfig[task.dataType]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatConfig[task.format].label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[task.status].variant} className="flex items-center gap-1 w-fit">
                        <StatusIcon className={`w-3 h-3 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
                        {statusConfig[task.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={task.progress} className="flex-1" />
                        <span className="text-sm font-medium w-10">{task.progress}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        分片: {task.completedChunks}/{task.totalChunks}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimeRemaining(task.estimatedTimeRemaining)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {task.status === 'processing' && (
                          <Button variant="ghost" size="sm" onClick={() => handlePause(task.id)}>
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {task.status === 'paused' && (
                          <Button variant="ghost" size="sm" onClick={() => handleResume(task.id)}>
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {task.status === 'failed' && (
                          <Button variant="ghost" size="sm" onClick={() => handleRetry(task.id)}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {task.status === 'completed' && task.downloadUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={task.downloadUrl} download>
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        
                        {(task.status === 'pending' || task.status === 'paused' || task.status === 'failed') && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(task.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 任务详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>导出任务详情</DialogTitle>
            <DialogDescription>查看导出任务的详细信息和进度</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">文件名</Label>
                  <p className="font-medium">{selectedTask.fileName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">数据类型</Label>
                  <Badge variant="outline">{dataTypeConfig[selectedTask.dataType]}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">格式</Label>
                  <Badge variant="secondary">{formatConfig[selectedTask.format].label}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge variant={statusConfig[selectedTask.status].variant}>
                    {statusConfig[selectedTask.status].label}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground">导出进度</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={selectedTask.progress} className="flex-1" />
                  <span className="font-medium">{selectedTask.progress}%</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">已处理: </span>
                    <span className="font-medium">{selectedTask.processedRecords.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">总记录: </span>
                    <span className="font-medium">{selectedTask.totalRecords.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">分片: </span>
                    <span className="font-medium">{selectedTask.completedChunks}/{selectedTask.totalChunks}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">创建时间</Label>
                  <p>{formatTime(selectedTask.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">开始时间</Label>
                  <p>{formatTime(selectedTask.startedAt)}</p>
                </div>
                {selectedTask.pausedAt && (
                  <div>
                    <Label className="text-muted-foreground">暂停时间</Label>
                    <p>{formatTime(selectedTask.pausedAt)}</p>
                  </div>
                )}
                {selectedTask.completedAt && (
                  <div>
                    <Label className="text-muted-foreground">完成时间</Label>
                    <p>{formatTime(selectedTask.completedAt)}</p>
                  </div>
                )}
              </div>

              {selectedTask.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-red-600">错误信息</Label>
                  <p className="text-red-700">{selectedTask.error}</p>
                  <p className="text-sm text-red-500 mt-1">重试次数: {selectedTask.retryCount}</p>
                </div>
              )}

              {selectedTask.status === 'completed' && selectedTask.downloadUrl && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Label className="text-green-600">下载信息</Label>
                  <p className="text-green-700">文件大小: {formatFileSize(selectedTask.fileSize)}</p>
                  <p className="text-sm text-green-500 mt-1">
                    过期时间: {formatTime(selectedTask.downloadExpiry)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
            {selectedTask?.status === 'completed' && selectedTask.downloadUrl && (
              <Button asChild>
                <a href={selectedTask.downloadUrl} download>
                  <Download className="w-4 h-4 mr-1" />
                  下载文件
                </a>
              </Button>
            )}
            {selectedTask?.status === 'paused' && (
              <Button onClick={() => {
                handleResume(selectedTask.id);
                setShowDetailDialog(false);
              }}>
                <Play className="w-4 h-4 mr-1" />
                恢复导出
              </Button>
            )}
            {selectedTask?.status === 'failed' && (
              <Button onClick={() => {
                handleRetry(selectedTask.id);
                setShowDetailDialog(false);
              }}>
                <RefreshCw className="w-4 h-4 mr-1" />
                重试
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建导出对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建导出任务</DialogTitle>
            <DialogDescription>创建新的数据导出任务</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>数据类型</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择数据类型" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dataTypeConfig).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>导出格式</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择导出格式" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formatConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>文件名（可选）</Label>
              <Input placeholder="留空将自动生成" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              // 创建新任务
              const newTask: ResumableExportTask = {
                id: `exp-${Date.now()}`,
                dataType: 'workflow_history',
                format: 'excel',
                status: 'processing',
                totalRecords: 30000,
                processedRecords: 0,
                progress: 0,
                fileName: `export_${Date.now()}.xlsx`,
                fileSize: 0,
                downloadUrl: null,
                downloadExpiry: null,
                totalChunks: 3,
                completedChunks: 0,
                createdAt: new Date(),
                startedAt: new Date(),
                pausedAt: null,
                completedAt: null,
                estimatedTimeRemaining: 300,
                error: null,
                retryCount: 0
              };
              setTasks(prev => [newTask, ...prev]);
              setShowCreateDialog(false);
            }}>
              开始导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
