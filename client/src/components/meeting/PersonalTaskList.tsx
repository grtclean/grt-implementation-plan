import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ListTodo, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Calendar,
  User,
  Upload,
  FileText,
  Send,
  Eye,
  Filter,
  Search,
  MoreVertical,
  Play,
  Pause,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/_core/hooks/useAuth';

interface PersonalTask {
  id: string;
  title: string;
  description: string;
  meetingId: string;
  meetingTitle: string;
  assignedBy: string;
  supporter?: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  progress: number;
  completionNote?: string;
  evidenceFiles?: string[];
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

interface PersonalTaskListProps {
  className?: string;
}

export default function PersonalTaskList({ className }: PersonalTaskListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<PersonalTask | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // 获取个人任务列表
  const { data: tasksData, isLoading, refetch } = (trpc.meetingTaskLoop as any).getPersonalTasks.useQuery({
    userId: user?.id || '',
    status: statusFilter === 'all' ? undefined : statusFilter
  }, {
    enabled: !!user?.id
  });

  const tasks: PersonalTask[] = (tasksData as any)?.tasks || [];

  // 接受任务
  const acceptMutation = (trpc.meetingTaskLoop as any).acceptTask.useMutation({
    onSuccess: () => {
      toast({ title: '任务已接受', description: '任务已添加到您的工作清单' });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' });
    }
  });

  // 更新任务进度
  const updateProgressMutation = (trpc.meetingTaskLoop as any).updateTaskProgress.useMutation({
    onSuccess: () => {
      toast({ title: '进度已更新' });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' });
    }
  });

  // 完成任务
  const completeMutation = (trpc.meetingTaskLoop as any).completeTask.useMutation({
    onSuccess: () => {
      toast({ title: '任务已完成', description: '已通知Meeting Owner审核' });
      setShowCompleteDialog(false);
      setSelectedTask(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: '提交失败', description: error.message, variant: 'destructive' });
    }
  });

  // 拒绝任务
  const rejectMutation = (trpc.meetingTaskLoop as any).rejectTask.useMutation({
    onSuccess: () => {
      toast({ title: '任务已拒绝', description: '已通知分配人' });
      setShowRejectDialog(false);
      setSelectedTask(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' });
    }
  });

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(query) || 
             task.meetingTitle.toLowerCase().includes(query);
    }
    return true;
  });

  // 统计数据
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress' || t.status === 'accepted').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      pending: { label: '待确认', variant: 'outline' },
      accepted: { label: '已接受', variant: 'secondary' },
      in_progress: { label: '进行中', variant: 'default' },
      completed: { label: '已完成', variant: 'default' },
      rejected: { label: '已拒绝', variant: 'destructive' }
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      high: { label: '高', className: 'bg-red-100 text-red-800' },
      medium: { label: '中', className: 'bg-yellow-100 text-yellow-800' },
      low: { label: '低', className: 'bg-green-100 text-green-800' }
    };
    const c = config[priority] || config.medium;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                我的任务清单
              </CardTitle>
              <CardDescription>
                来自会议的待办任务
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 统计卡片 */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            <Card className="bg-muted/50">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">全部任务</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                <p className="text-xs text-yellow-600">待确认</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
                <p className="text-xs text-blue-600">进行中</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                <p className="text-xs text-green-600">已完成</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
                <p className="text-xs text-red-600">已逾期</p>
              </CardContent>
            </Card>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待确认</SelectItem>
                <SelectItem value="accepted">已接受</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 任务列表 */}
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-2 opacity-50" />
                <p>暂无任务</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className={`transition-colors hover:bg-muted/50 ${
                      isOverdue(task.dueDate, task.status) ? 'border-red-300 bg-red-50/50' : ''
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium truncate">{task.title}</span>
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                            {isOverdue(task.dueDate, task.status) && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                逾期
                              </Badge>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {task.meetingTitle}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              分配人: {task.assignedBy}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              截止: {task.dueDate}
                            </span>
                          </div>

                          {/* 进度条 */}
                          {(task.status === 'in_progress' || task.status === 'accepted') && (
                            <div className="flex items-center gap-3">
                              <Progress value={task.progress} className="flex-1 h-2" />
                              <span className="text-xs text-muted-foreground w-10">
                                {task.progress}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-1 ml-4">
                          {task.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acceptMutation.mutate({ taskId: task.id })}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                接受
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(task.status === 'accepted' || task.status === 'in_progress') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newProgress = Math.min(task.progress + 25, 100);
                                  updateProgressMutation.mutate({
                                    taskId: task.id,
                                    progress: newProgress
                                  });
                                }}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                更新进度
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowCompleteDialog(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                完成
                              </Button>
                            </>
                          )}
                          {task.status === 'completed' && (
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 完成任务对话框 */}
      <CompleteTaskDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        task={selectedTask}
        onComplete={(note, files) => {
          if (selectedTask) {
            completeMutation.mutate({
              taskId: selectedTask.id,
              completionNote: note,
              evidenceFiles: files
            });
          }
        }}
      />

      {/* 拒绝任务对话框 */}
      <RejectTaskDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        task={selectedTask}
        onReject={(reason) => {
          if (selectedTask) {
            rejectMutation.mutate({
              taskId: selectedTask.id,
              reason
            });
          }
        }}
      />
    </div>
  );
}

// 完成任务对话框
interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PersonalTask | null;
  onComplete: (note: string, files: string[]) => void;
}

function CompleteTaskDialog({ open, onOpenChange, task, onComplete }: CompleteTaskDialogProps) {
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<string[]>([]);

  const handleSubmit = () => {
    onComplete(note, files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>完成任务</DialogTitle>
          <DialogDescription>
            提交完成说明和举证材料
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {task && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">{task.meetingTitle}</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>完成说明</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="描述任务完成情况..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>举证材料（可选）</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                点击或拖拽文件上传
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                支持图片、文档等格式
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            <Send className="h-4 w-4 mr-1" />
            提交完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 拒绝任务对话框
interface RejectTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PersonalTask | null;
  onReject: (reason: string) => void;
}

function RejectTaskDialog({ open, onOpenChange, task, onReject }: RejectTaskDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onReject(reason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>拒绝任务</DialogTitle>
          <DialogDescription>
            请说明拒绝原因
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {task && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">{task.meetingTitle}</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>拒绝原因 *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请说明无法接受该任务的原因..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!reason.trim()}>
            确认拒绝
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
