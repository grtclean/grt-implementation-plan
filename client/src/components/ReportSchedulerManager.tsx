/**
 * 报表定时发送管理组件
 * 支持配置报表任务、添加接收人、预览报表、手动触发发送
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  Bot,
  Send,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  History,
  Settings,
  FileText,
} from "lucide-react";
import CronExpressionEditor from "./CronExpressionEditor";

interface ReportSchedulerManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 报表类型标签
const REPORT_TYPE_LABELS: Record<string, string> = {
  funnel: "销售漏斗",
  trend: "趋势分析",
  source: "来源分析",
  performance: "销售业绩",
  summary: "商机概览",
};

// 频率标签
const FREQUENCY_LABELS: Record<string, string> = {
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
};

// 接收人类型标签
const RECIPIENT_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  email: { label: "邮箱", icon: <Mail className="w-4 h-4" /> },
  wechat: { label: "企业微信", icon: <MessageSquare className="w-4 h-4" /> },
  wechat_robot: { label: "机器人", icon: <Bot className="w-4 h-4" /> },
};

export default function ReportSchedulerManager({
  open,
  onOpenChange,
}: ReportSchedulerManagerProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("schedules");
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // 添加接收人表单状态
  const [newRecipient, setNewRecipient] = useState({
    type: "email" as "email" | "wechat" | "wechat_robot",
    target: "",
    name: "",
  });
  
  // 查询报表任务列表
  const { data: schedules, refetch: refetchSchedules } = trpc.reportScheduler.getSchedules.useQuery() as any;
  
  // 查询发送历史
  const { data: history } = (trpc.reportScheduler.getHistory as any).useQuery({
    scheduleId: selectedScheduleId || undefined,
    limit: 20,
  });
  
  // 更新任务配置
  const updateScheduleMutation = trpc.reportScheduler.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success("配置已更新");
      refetchSchedules();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
  
  // 添加接收人
  const addRecipientMutation = trpc.reportScheduler.addRecipient.useMutation({
    onSuccess: () => {
      toast.success("接收人已添加");
      refetchSchedules();
      setNewRecipient({ type: "email", target: "", name: "" });
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });
  
  // 移除接收人
  const removeRecipientMutation = trpc.reportScheduler.removeRecipient.useMutation({
    onSuccess: () => {
      toast.success("接收人已移除");
      refetchSchedules();
    },
    onError: (error) => {
      toast.error(`移除失败: ${error.message}`);
    },
  });
  
  // 手动触发发送
  const triggerSendMutation = trpc.reportScheduler.triggerSend.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("报表发送成功");
      } else {
        toast.error(`发送失败: ${(result as any).error}`);
      }
      refetchSchedules();
    },
    onError: (error: any) => {
      toast.error(`发送失败: ${error.message}`);
    },
  });

  // 预览报表
  const previewMutation = (trpc.reportScheduler.previewReport as any).useMutation({
    onSuccess: (result: any) => {
      setPreviewContent(result.formatted);
      setShowPreview(true);
    },
    onError: (error: any) => {
      toast.error(`预览失败: ${error.message}`);
    },
  });
  
  // 获取选中的任务
  const selectedSchedule = schedules?.find((s: any) => s.id === selectedScheduleId);
  
  // 处理启用/禁用切换
  const handleToggleEnabled = (scheduleId: string, enabled: boolean) => {
    updateScheduleMutation.mutate({ scheduleId, enabled });
  };
  
  // 处理Cron表达式更新
  const handleCronChange = (scheduleId: string, cronExpression: string) => {
    updateScheduleMutation.mutate({ scheduleId, cronExpression });
  };
  
  // 处理添加接收人
  const handleAddRecipient = () => {
    if (!selectedScheduleId || !newRecipient.target) {
      toast.error("请填写接收人信息");
      return;
    }
    
    addRecipientMutation.mutate({
      scheduleId: selectedScheduleId,
      ...newRecipient,
    });
  };
  
  // 处理移除接收人
  const handleRemoveRecipient = (target: string) => {
    if (!selectedScheduleId) return;
    removeRecipientMutation.mutate({ scheduleId: selectedScheduleId, target });
  };
  
  // 处理手动发送
  const handleTriggerSend = (scheduleId: string) => {
    triggerSendMutation.mutate({ scheduleId });
  };
  
  // 处理预览
  const handlePreview = (reportTypes: string[], frequency: string) => {
    const period = frequency === "daily" ? "day" : frequency === "weekly" ? "week" : "month";
    previewMutation.mutate({
      reportTypes: reportTypes as any,
      period: period as any,
      format: "text",
    });
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              报表定时发送管理
            </DialogTitle>
            <DialogDescription>
              配置报表发送任务、接收人和发送时间
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="schedules">
                <Settings className="w-4 h-4 mr-2" />
                任务配置
              </TabsTrigger>
              <TabsTrigger value="recipients">
                <Mail className="w-4 h-4 mr-2" />
                接收人管理
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                发送历史
              </TabsTrigger>
            </TabsList>

            {/* 任务配置 */}
            <TabsContent value="schedules" className="flex-1 overflow-auto">
              <div className="space-y-4 py-4">
                {schedules?.map((schedule: any) => (
                  <Card
                    key={schedule.id}
                    className={`cursor-pointer transition-colors ${
                      selectedScheduleId === schedule.id
                        ? "border-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedScheduleId(schedule.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {schedule.name}
                          <Badge variant="outline">
                            {FREQUENCY_LABELS[schedule.frequency]}
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={schedule.enabled}
                            onCheckedChange={(checked) =>
                              handleToggleEnabled(schedule.id, checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreview(schedule.reportTypes, schedule.frequency);
                            }}
                            disabled={previewMutation.isPending}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            预览
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerSend(schedule.id);
                            }}
                            disabled={
                              triggerSendMutation.isPending ||
                              schedule.recipients.length === 0
                            }
                          >
                            <Send className="w-4 h-4 mr-1" />
                            立即发送
                          </Button>
                        </div>
                      </div>
                      <CardDescription>{schedule.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">报表类型: </span>
                          <span>
                            {schedule.reportTypes
                              .map((t: any) => REPORT_TYPE_LABELS[t])
                              .join("、")}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">接收人: </span>
                          <span>
                            {schedule.recipients.length > 0
                              ? `${schedule.recipients.length} 人`
                              : "未配置"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cron: </span>
                          <code className="text-xs bg-muted px-1 rounded">
                            {schedule.cronExpression}
                          </code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">上次发送: </span>
                          <span>
                            {schedule.lastSent
                              ? new Date(schedule.lastSent).toLocaleString("zh-CN")
                              : "从未发送"}
                          </span>
                        </div>
                      </div>

                      {/* Cron编辑器 */}
                      {selectedScheduleId === schedule.id && (
                        <div className="mt-4 pt-4 border-t">
                          <Label className="text-sm mb-2 block">调度时间配置</Label>
                          <CronExpressionEditor
                            value={schedule.cronExpression}
                            onChange={(cron) => handleCronChange(schedule.id, cron)}
                            showPreview={true}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 接收人管理 */}
            <TabsContent value="recipients" className="flex-1 overflow-auto">
              <div className="space-y-4 py-4">
                {/* 选择任务 */}
                <div className="space-y-2">
                  <Label>选择报表任务</Label>
                  <Select
                    value={selectedScheduleId || ""}
                    onValueChange={setSelectedScheduleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择报表任务" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedules?.map((schedule: any) => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                          {schedule.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSchedule && (
                  <>
                    {/* 添加接收人 */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">添加接收人</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-2">
                          <Select
                            value={newRecipient.type}
                            onValueChange={(v) =>
                              setNewRecipient({ ...newRecipient, type: v as any })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">邮箱</SelectItem>
                              <SelectItem value="wechat">企业微信</SelectItem>
                              <SelectItem value="wechat_robot">机器人</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder={
                              newRecipient.type === "email"
                                ? "邮箱地址"
                                : newRecipient.type === "wechat"
                                ? "用户ID"
                                : "Webhook URL"
                            }
                            value={newRecipient.target}
                            onChange={(e) =>
                              setNewRecipient({ ...newRecipient, target: e.target.value })
                            }
                          />
                          <Input
                            placeholder="名称（可选）"
                            value={newRecipient.name}
                            onChange={(e) =>
                              setNewRecipient({ ...newRecipient, name: e.target.value })
                            }
                          />
                          <Button
                            onClick={handleAddRecipient}
                            disabled={addRecipientMutation.isPending}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            添加
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 接收人列表 */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          接收人列表 ({selectedSchedule.recipients.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedSchedule.recipients.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            暂无接收人，请添加
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {selectedSchedule.recipients.map((recipient: any, index: any) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-muted/30 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  {RECIPIENT_TYPE_LABELS[recipient.type]?.icon}
                                  <span className="text-sm">
                                    {recipient.name || recipient.target}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {RECIPIENT_TYPE_LABELS[recipient.type]?.label}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRecipient(recipient.target)}
                                  disabled={removeRecipientMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>

            {/* 发送历史 */}
            <TabsContent value="history" className="flex-1 overflow-auto">
              <div className="space-y-4 py-4">
                {/* 筛选 */}
                <div className="space-y-2">
                  <Label>筛选任务</Label>
                  <Select
                    value={selectedScheduleId || "all"}
                    onValueChange={(v) =>
                      setSelectedScheduleId(v === "all" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="全部任务" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部任务</SelectItem>
                      {schedules?.map((schedule: any) => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                          {schedule.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 历史列表 */}
                {history && history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map((record: any, index: any) => (
                      <Card key={index}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(record.sentAt).toLocaleString("zh-CN")}
                              </span>
                              <Badge variant="outline">
                                {schedules?.find((s: any) => s.id === record.scheduleId)?.name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {record.success > 0 && (
                                <Badge className="bg-green-500/20 text-green-400">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {record.success} 成功
                                </Badge>
                              )}
                              {record.failed > 0 && (
                                <Badge className="bg-red-500/20 text-red-400">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  {record.failed} 失败
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    暂无发送历史
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 报表预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>报表预览</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <pre className="text-sm whitespace-pre-wrap bg-muted/30 p-4 rounded-lg">
              {previewContent}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
