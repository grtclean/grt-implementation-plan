import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  MessageSquare,
  Bell,
  Users
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  assigneeEmail?: string;
  supporter?: string;
  supporterEmail?: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
}

interface TaskDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingTitle: string;
  actionItems: ActionItem[];
  onDistribute?: (distributedItems: ActionItem[]) => void;
}

export default function TaskDistributionDialog({
  open,
  onOpenChange,
  meetingId,
  meetingTitle,
  actionItems,
  onDistribute
}: TaskDistributionDialogProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>(actionItems.map(item => item.id));
  const [notificationMethods, setNotificationMethods] = useState({
    email: true,
    webhook: true,
    inApp: true
  });
  const [isDistributing, setIsDistributing] = useState(false);

  // 分发任务mutation
  const distributeMutation = (trpc.meetingTaskLoop as any).distributeTasks.useMutation({
    onSuccess: (data) => {
      toast({
        title: '任务分发成功',
        description: `已成功分发 ${data.distributedCount} 个任务`,
      });
      onDistribute?.(actionItems.filter(item => selectedItems.includes(item.id)));
      onOpenChange(false);
      setIsDistributing(false);
    },
    onError: (error) => {
      toast({
        title: '分发失败',
        description: error.message,
        variant: 'destructive',
      });
      setIsDistributing(false);
    }
  });

  const handleSelectAll = () => {
    if (selectedItems.length === actionItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(actionItems.map(item => item.id));
    }
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleDistribute = () => {
    if (selectedItems.length === 0) {
      toast({
        title: '请选择任务',
        description: '至少选择一个任务进行分发',
        variant: 'destructive',
      });
      return;
    }

    setIsDistributing(true);
    distributeMutation.mutate({
      meetingId,
      taskIds: selectedItems,
      notificationMethods
    });
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      high: { label: '高优先级', className: 'bg-red-100 text-red-800' },
      medium: { label: '中优先级', className: 'bg-yellow-100 text-yellow-800' },
      low: { label: '低优先级', className: 'bg-green-100 text-green-800' }
    };
    return <Badge className={config[priority]?.className || config.medium.className}>
      {config[priority]?.label || '中优先级'}
    </Badge>;
  };

  // 统计信息
  const selectedCount = selectedItems.length;
  const totalCount = actionItems.length;
  const assignees = Array.from(new Set(actionItems.filter(item => selectedItems.includes(item.id)).map(item => item.assignee)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            任务分发确认
          </DialogTitle>
          <DialogDescription>
            确认并分发会议任务给相关责任人
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 会议信息 */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{meetingTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    共 {totalCount} 个任务，已选择 {selectedCount} 个
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{assignees.length} 位责任人</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 通知方式选择 */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">通知方式</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={notificationMethods.email}
                    onCheckedChange={(checked) => 
                      setNotificationMethods(prev => ({ ...prev, email: !!checked }))
                    }
                  />
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">邮件通知</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={notificationMethods.webhook}
                    onCheckedChange={(checked) => 
                      setNotificationMethods(prev => ({ ...prev, webhook: !!checked }))
                    }
                  />
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">企业微信/钉钉</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={notificationMethods.inApp}
                    onCheckedChange={(checked) => 
                      setNotificationMethods(prev => ({ ...prev, inApp: !!checked }))
                    }
                  />
                  <Bell className="h-4 w-4" />
                  <span className="text-sm">站内通知</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 任务列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">任务清单</span>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedItems.length === actionItems.length ? '取消全选' : '全选'}
              </Button>
            </div>
            <ScrollArea className="h-[300px] border rounded-md">
              {actionItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mb-2 opacity-50" />
                  <p>暂无任务</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {actionItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedItems.includes(item.id) 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggleItem(item.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => handleToggleItem(item.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{item.title}</span>
                              {getPriorityBadge(item.priority)}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.assignee}
                              </span>
                              {item.supporter && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  支持: {item.supporter}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {item.dueDate}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 分发预览 */}
          {selectedCount > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">分发预览</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  将向 {assignees.length} 位责任人分发 {selectedCount} 个任务
                  {notificationMethods.email && '，并发送邮件通知'}
                  {notificationMethods.webhook && '，推送到企业微信/钉钉'}
                  {notificationMethods.inApp && '，发送站内通知'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button 
            onClick={handleDistribute} 
            disabled={selectedCount === 0 || isDistributing}
          >
            {isDistributing ? (
              <>分发中...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                确认分发 ({selectedCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
