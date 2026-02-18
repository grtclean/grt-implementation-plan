import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  Calendar,
  Clock,
  Mail,
  Bell,
  Send,
  Plus,
  Trash2,
  Settings,
  History,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function ExpenseReportScheduler() {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [isAddRecipientDialogOpen, setIsAddRecipientDialogOpen] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    type: 'notification' as 'email' | 'notification' | 'wechat',
    target: '',
    name: '',
  });

  // 获取所有任务
  const { data: schedules, isLoading, refetch } = trpc.expenseReportScheduler.getSchedules.useQuery();
  
  // 获取统计信息
  const { data: stats } = (trpc.expenseReportScheduler as any).getStats.useQuery();
  
  // 获取发送历史
  const { data: history } = (trpc.expenseReportScheduler as any).getSendHistory.useQuery({ limit: 10 });
  
  // 获取支持的选项
  const { data: options } = (trpc.expenseReportScheduler as any).getSupportedOptions.useQuery();

  // 更新任务
  const updateMutation = trpc.expenseReportScheduler.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success('任务已更新');
      refetch();
    },
    onError: (error) => {
      toast.error('更新失败', { description: error.message });
    },
  });

  // 添加接收人
  const addRecipientMutation = (trpc.expenseReportScheduler as any).addRecipient.useMutation({
    onSuccess: () => {
      toast.success('接收人已添加');
      setIsAddRecipientDialogOpen(false);
      setNewRecipient({ type: 'notification', target: '', name: '' });
      refetch();
    },
    onError: (error) => {
      toast.error('添加失败', { description: error.message });
    },
  });

  // 移除接收人
  const removeRecipientMutation = (trpc.expenseReportScheduler as any).removeRecipient.useMutation({
    onSuccess: () => {
      toast.success('接收人已移除');
      refetch();
    },
    onError: (error) => {
      toast.error('移除失败', { description: error.message });
    },
  });

  // 手动触发发送
  const triggerMutation = (trpc.expenseReportScheduler as any).triggerSend.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('报表已发送', {
          description: `成功发送到 ${result.results?.filter(r => r.success).length || 0} 个接收人`,
        });
      } else {
        toast.error('发送失败', { description: result.error });
      }
      refetch();
    },
    onError: (error) => {
      toast.error('发送失败', { description: error.message });
    },
  });

  const handleToggleEnabled = (scheduleId: string, enabled: boolean) => {
    updateMutation.mutate({ scheduleId, enabled });
  };

  const handleAddRecipient = () => {
    if (!selectedScheduleId || !newRecipient.target) return;
    addRecipientMutation.mutate({
      scheduleId: selectedScheduleId,
      recipient: {
        ...newRecipient,
        enabled: true,
      },
    });
  };

  const handleRemoveRecipient = (scheduleId: string, recipientId: string) => {
    removeRecipientMutation.mutate({ scheduleId, recipientId });
  };

  const handleTriggerSend = (scheduleId: string) => {
    triggerMutation.mutate({ scheduleId });
  };

  const getFrequencyLabel = (frequency: string) => {
    return options?.frequencies.find(f => f.id === frequency)?.name || frequency;
  };

  const getRecipientTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'notification': return <Bell className="w-4 h-4" />;
      case 'wechat': return <Users className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
        <div className="space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card/50 border-border">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Clock}
          title="报表定时发送"
          description="配置费用对比报表的定时自动发送"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Calendar} label="任务总数" value={stats?.totalSchedules || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={CheckCircle2} label="已启用" value={stats?.enabledSchedules || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Users} label="接收人数" value={stats?.totalRecipients || 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          <StatCard icon={Send} label="发送成功率" value={`${stats?.successRate || 0}%`} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        </div>

        {/* 主要内容 */}
        <Tabs defaultValue="schedules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              任务配置
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              发送历史
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="space-y-4">
            {schedules?.map((schedule) => (
              <Card key={schedule.id} className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${schedule.enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{schedule.name}</CardTitle>
                        <CardDescription>{schedule.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                        {getFrequencyLabel(schedule.frequency)}
                      </Badge>
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(schedule.id, checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 报表配置 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">对比类型</p>
                      <p className="text-sm font-medium">
                        {options?.comparisonTypes.find(c => c.id === schedule.reportConfig.comparisonType)?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">分析维度</p>
                      <p className="text-sm font-medium">
                        {options?.dimensions.find(d => d.id === schedule.reportConfig.dimension)?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">报表格式</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        {schedule.reportConfig.format === 'excel' && <FileSpreadsheet className="w-4 h-4" />}
                        {schedule.reportConfig.format === 'pdf' && <FileText className="w-4 h-4" />}
                        {schedule.reportConfig.format === 'txt' && <FileText className="w-4 h-4" />}
                        {schedule.reportConfig.format.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cron表达式</p>
                      <p className="text-sm font-mono">{schedule.cronExpression}</p>
                    </div>
                  </div>

                  {/* 接收人列表 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">接收人 ({schedule.recipients.length})</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedScheduleId(schedule.id);
                          setIsAddRecipientDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加
                      </Button>
                    </div>
                    {schedule.recipients.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                        暂无接收人，请添加接收人后启用任务
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {schedule.recipients.map((recipient) => (
                          <div
                            key={recipient.id}
                            className="flex items-center justify-between p-3 bg-background rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              {getRecipientTypeIcon(recipient.type)}
                              <div>
                                <p className="text-sm font-medium">{recipient.name || recipient.target}</p>
                                <p className="text-xs text-muted-foreground">
                                  {options?.recipientTypes.find(t => t.id === recipient.type)?.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={recipient.enabled ? 'default' : 'secondary'} className="text-xs">
                                {recipient.enabled ? '启用' : '禁用'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRecipient(schedule.id, recipient.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      {schedule.lastSent && (
                        <span>上次发送: {new Date(schedule.lastSent).toLocaleString('zh-CN')}</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTriggerSend(schedule.id)}
                      disabled={schedule.recipients.length === 0 || triggerMutation.isPending}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      立即发送
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  发送历史
                </CardTitle>
                <CardDescription>最近的报表发送记录</CardDescription>
              </CardHeader>
              <CardContent>
                {!history || history.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    暂无发送记录
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 bg-background rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${record.success > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {record.success > 0 ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {schedules?.find(s => s.id === record.scheduleId)?.name || record.scheduleId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(record.sentAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">
                              <span className="text-green-500">{record.success}</span>
                              <span className="text-muted-foreground mx-1">/</span>
                              <span className="text-red-500">{record.failed}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">成功/失败</p>
                          </div>
                          <Badge variant="outline">
                            {record.reportConfig.format.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 添加接收人对话框 */}
        <Dialog open={isAddRecipientDialogOpen} onOpenChange={setIsAddRecipientDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                添加接收人
              </DialogTitle>
              <DialogDescription>
                配置报表发送的接收人
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>接收方式</Label>
                <Select
                  value={newRecipient.type}
                  onValueChange={(value) => setNewRecipient({ ...newRecipient, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.recipientTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          {getRecipientTypeIcon(type.id)}
                          <span>{type.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {options?.recipientTypes.find(t => t.id === newRecipient.type)?.description}
                </p>
              </div>
              <div className="space-y-2">
                <Label>接收目标</Label>
                <Input
                  placeholder={newRecipient.type === 'email' ? '邮箱地址' : newRecipient.type === 'notification' ? '用户ID' : '企业微信ID'}
                  value={newRecipient.target}
                  onChange={(e) => setNewRecipient({ ...newRecipient, target: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>备注名称（可选）</Label>
                <Input
                  placeholder="接收人名称"
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddRecipientDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddRecipient} disabled={!newRecipient.target}>
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
