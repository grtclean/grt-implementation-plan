/**
 * 导出任务邮件通知管理组件
 * v2.5.18 - 导出完成邮件通知、下载链接附带、过期提醒
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Mail, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  FileText,
  RefreshCw,
  Settings,
  Send,
  Loader2,
  Timer
} from 'lucide-react';

// 类型定义
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
type ExportFormat = 'excel' | 'csv' | 'json' | 'pdf';
type ExportDataType = 'workflow_history' | 'device_list' | 'maintenance_records' | 'notification_logs' | 'aggregation_stats';

interface ExportTask {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  dataType: ExportDataType;
  format: ExportFormat;
  status: ExportStatus;
  fileName: string;
  fileUrl: string | null;
  fileSize: number | null;
  recordCount: number | null;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  notificationSent: boolean;
  expiryReminderSent: boolean;
}

interface EmailNotification {
  id: string;
  taskId: string;
  recipientEmail: string;
  type: 'export_complete' | 'export_failed' | 'expiry_reminder';
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

interface ExportEmailConfig {
  enabled: boolean;
  sendOnComplete: boolean;
  sendOnFailed: boolean;
  sendExpiryReminder: boolean;
  expiryReminderHours: number;
  downloadLinkValidHours: number;
  fromEmail: string;
  fromName: string;
  ccEmails: string[];
}

// 模拟数据
const generateMockTasks = (): ExportTask[] => [
  {
    id: 'export-1',
    userId: 'user-1',
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    dataType: 'workflow_history',
    format: 'excel',
    status: 'completed',
    fileName: '工作流历史_2026-01-27.xlsx',
    fileUrl: 'https://storage.example.com/exports/workflow_history_2026-01-27.xlsx',
    fileSize: 1024 * 1024 * 2.5,
    recordCount: 1500,
    progress: 100,
    errorMessage: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3500000).toISOString(),
    expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
    notificationSent: true,
    expiryReminderSent: false
  },
  {
    id: 'export-2',
    userId: 'user-1',
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    dataType: 'device_list',
    format: 'csv',
    status: 'processing',
    fileName: '设备列表_2026-01-27.csv',
    fileUrl: null,
    fileSize: null,
    recordCount: null,
    progress: 65,
    errorMessage: null,
    createdAt: new Date(Date.now() - 300000).toISOString(),
    completedAt: null,
    expiresAt: null,
    notificationSent: false,
    expiryReminderSent: false
  },
  {
    id: 'export-3',
    userId: 'user-2',
    userName: '李四',
    userEmail: 'lisi@example.com',
    dataType: 'maintenance_records',
    format: 'pdf',
    status: 'failed',
    fileName: '保养记录_2026-01-27.pdf',
    fileUrl: null,
    fileSize: null,
    recordCount: null,
    progress: 45,
    errorMessage: '数据量过大，请缩小时间范围后重试',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7100000).toISOString(),
    expiresAt: null,
    notificationSent: true,
    expiryReminderSent: false
  },
  {
    id: 'export-4',
    userId: 'user-1',
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    dataType: 'aggregation_stats',
    format: 'json',
    status: 'expired',
    fileName: '聚合统计_2026-01-20.json',
    fileUrl: null,
    fileSize: 512 * 1024,
    recordCount: 200,
    progress: 100,
    errorMessage: null,
    createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    completedAt: new Date(Date.now() - 7 * 24 * 3600000 + 60000).toISOString(),
    expiresAt: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
    notificationSent: true,
    expiryReminderSent: true
  }
];

const generateMockNotifications = (): EmailNotification[] => [
  {
    id: 'notif-1',
    taskId: 'export-1',
    recipientEmail: 'zhangsan@example.com',
    type: 'export_complete',
    subject: '[GRT系统] 您的数据导出已完成 - 工作流历史_2026-01-27.xlsx',
    status: 'sent',
    sentAt: new Date(Date.now() - 3500000).toISOString(),
    error: null,
    createdAt: new Date(Date.now() - 3500000).toISOString()
  },
  {
    id: 'notif-2',
    taskId: 'export-3',
    recipientEmail: 'lisi@example.com',
    type: 'export_failed',
    subject: '[GRT系统] 数据导出失败 - 保养记录_2026-01-27.pdf',
    status: 'sent',
    sentAt: new Date(Date.now() - 7100000).toISOString(),
    error: null,
    createdAt: new Date(Date.now() - 7100000).toISOString()
  }
];

const defaultConfig: ExportEmailConfig = {
  enabled: true,
  sendOnComplete: true,
  sendOnFailed: true,
  sendExpiryReminder: true,
  expiryReminderHours: 24,
  downloadLinkValidHours: 72,
  fromEmail: 'noreply@grt-system.com',
  fromName: 'GRT智能系统',
  ccEmails: []
};

// 辅助函数
const getStatusIcon = (status: ExportStatus) => {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />;
    case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'expired': return <Timer className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusLabel = (status: ExportStatus): string => {
  const labels: Record<ExportStatus, string> = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
    expired: '已过期'
  };
  return labels[status];
};

const getFormatIcon = (format: ExportFormat) => {
  switch (format) {
    case 'excel': return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    case 'csv': return <FileText className="w-4 h-4 text-blue-600" />;
    case 'json': return <FileJson className="w-4 h-4 text-yellow-600" />;
    case 'pdf': return <FileText className="w-4 h-4 text-red-600" />;
  }
};

const getDataTypeLabel = (dataType: ExportDataType): string => {
  const labels: Record<ExportDataType, string> = {
    workflow_history: '工作流历史',
    device_list: '设备列表',
    maintenance_records: '保养记录',
    notification_logs: '通知日志',
    aggregation_stats: '聚合统计'
  };
  return labels[dataType];
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  
  if (diff <= 0) return '已过期';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}天${hours % 24}小时`;
  }
  return `${hours}小时${minutes}分钟`;
};

// 配置对话框
const ConfigDialog = ({ 
  config, 
  onSave, 
  onClose 
}: { 
  config: ExportEmailConfig; 
  onSave: (config: ExportEmailConfig) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState<ExportEmailConfig>(config);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>邮件通知设置</DialogTitle>
        <DialogDescription>配置导出任务的邮件通知规则</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <Label>启用邮件通知</Label>
          <Switch 
            checked={formData.enabled} 
            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>导出完成时发送通知</Label>
          <Switch 
            checked={formData.sendOnComplete} 
            onCheckedChange={(checked) => setFormData({ ...formData, sendOnComplete: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>导出失败时发送通知</Label>
          <Switch 
            checked={formData.sendOnFailed} 
            onCheckedChange={(checked) => setFormData({ ...formData, sendOnFailed: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>发送过期提醒</Label>
          <Switch 
            checked={formData.sendExpiryReminder} 
            onCheckedChange={(checked) => setFormData({ ...formData, sendExpiryReminder: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>过期提醒时间（小时）</Label>
          <Input 
            type="number"
            value={formData.expiryReminderHours} 
            onChange={(e) => setFormData({ ...formData, expiryReminderHours: parseInt(e.target.value) || 24 })}
            min={1}
            max={72}
          />
          <p className="text-xs text-muted-foreground">在文件过期前多少小时发送提醒</p>
        </div>

        <div className="space-y-2">
          <Label>下载链接有效期（小时）</Label>
          <Input 
            type="number"
            value={formData.downloadLinkValidHours} 
            onChange={(e) => setFormData({ ...formData, downloadLinkValidHours: parseInt(e.target.value) || 72 })}
            min={1}
            max={168}
          />
        </div>

        <div className="space-y-2">
          <Label>发件人名称</Label>
          <Input 
            value={formData.fromName} 
            onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>发件人邮箱</Label>
          <Input 
            value={formData.fromEmail} 
            onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>抄送邮箱（逗号分隔）</Label>
          <Input 
            value={formData.ccEmails.join(', ')} 
            onChange={(e) => setFormData({ 
              ...formData, 
              ccEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            placeholder="admin@example.com, manager@example.com"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={() => onSave(formData)}>保存</Button>
      </DialogFooter>
    </DialogContent>
  );
};

// 主组件
export default function ExportEmailNotificationManager() {
  const [tasks, setTasks] = useState<ExportTask[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [config, setConfig] = useState<ExportEmailConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ExportStatus>('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setTasks(generateMockTasks());
      setNotifications(generateMockNotifications());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = (newConfig: ExportEmailConfig) => {
    setConfig(newConfig);
    setIsConfigDialogOpen(false);
  };

  const handleResendNotification = (_taskId: string) => {
    // TODO: call API to resend notification
  };

  const filteredTasks = tasks.filter(task => 
    statusFilter === 'all' || task.status === statusFilter
  );

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    processing: tasks.filter(t => t.status === 'processing').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    expired: tasks.filter(t => t.status === 'expired').length,
    notificationsSent: notifications.filter(n => n.status === 'sent').length
  };

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
            <Mail className="w-6 h-6 text-primary" />
            导出任务邮件通知
          </h2>
          <p className="text-muted-foreground">管理导出任务的邮件通知和下载链接</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-1" />
                设置
              </Button>
            </DialogTrigger>
            <ConfigDialog 
              config={config}
              onSave={handleSaveConfig}
              onClose={() => setIsConfigDialogOpen(false)}
            />
          </Dialog>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总任务数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
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
                <p className="text-sm text-muted-foreground">处理中</p>
                <p className="text-2xl font-bold text-blue-500">{stats.processing}</p>
              </div>
              <Loader2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">失败</p>
                <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已发送通知</p>
                <p className="text-2xl font-bold text-primary">{stats.notificationsSent}</p>
              </div>
              <Send className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">导出任务</TabsTrigger>
          <TabsTrigger value="notifications">通知记录</TabsTrigger>
        </TabsList>

        {/* 导出任务列表 */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>导出任务列表</CardTitle>
                  <CardDescription>查看所有导出任务及其邮件通知状态</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="pending">等待中</SelectItem>
                    <SelectItem value="processing">处理中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="failed">失败</SelectItem>
                    <SelectItem value="expired">已过期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无导出任务</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map(task => (
                    <div 
                      key={task.id}
                      className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getFormatIcon(task.format)}
                          <div>
                            <p className="font-medium">{task.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              {getDataTypeLabel(task.dataType)} · {task.userName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'failed' ? 'destructive' :
                            task.status === 'expired' ? 'secondary' :
                            'outline'
                          }>
                            {getStatusLabel(task.status)}
                          </Badge>
                        </div>
                      </div>

                      {task.status === 'processing' && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>处理进度</span>
                            <span>{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} />
                        </div>
                      )}

                      {task.status === 'failed' && task.errorMessage && (
                        <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded text-sm text-red-500">
                          <AlertTriangle className="w-4 h-4" />
                          {task.errorMessage}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>创建时间: {new Date(task.createdAt).toLocaleString('zh-CN')}</span>
                          {task.recordCount && <span>记录数: {task.recordCount}</span>}
                          {task.fileSize && <span>文件大小: {formatFileSize(task.fileSize)}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.notificationSent && (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              已通知
                            </Badge>
                          )}
                          {task.status === 'completed' && task.expiresAt && (
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              剩余: {getTimeRemaining(task.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {task.status === 'completed' && task.fileUrl && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" asChild>
                            <a href={task.fileUrl} download>
                              <Download className="w-4 h-4 mr-1" />
                              下载文件
                            </a>
                          </Button>
                          {!task.notificationSent && (
                            <Button size="sm" variant="outline" onClick={() => handleResendNotification(task.id)}>
                              <Send className="w-4 h-4 mr-1" />
                              发送通知
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知记录 */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知记录</CardTitle>
              <CardDescription>查看所有邮件通知发送记录</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无通知记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{notif.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            收件人: {notif.recipientEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {notif.status === 'sent' && (
                          <Badge className="bg-green-500/10 text-green-500">已发送</Badge>
                        )}
                        {notif.status === 'failed' && (
                          <Badge className="bg-red-500/10 text-red-500">失败</Badge>
                        )}
                        {notif.status === 'pending' && (
                          <Badge variant="outline">待发送</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
