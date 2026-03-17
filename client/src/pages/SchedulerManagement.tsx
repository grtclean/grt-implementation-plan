/**
 * 定时任务管理页面
 * 展示所有定时任务状态，支持手动触发和配置修改
 */

import { PageHeader } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  History, 
  Loader2, 
  Play, 
  RefreshCw, 
  Settings, 
  Timer,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import AlertRuleManager from "@/components/AlertRuleManager";
import { useLanguage } from "@/contexts/LanguageContext";

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number | null;
}

interface TaskExecutionLog {
  id: string;
  taskId: string;
  taskName: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'failed' | 'running';
  result?: string;
  error?: string;
}

interface ReminderConfig {
  noFollowUpDays: number;
  dueSoonHours: number;
  enableWechatNotification: boolean;
  enableEmailNotification: boolean;
}

export default function SchedulerManagement() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("tasks");
  
  // 获取定时任务列表
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = (trpc.scheduler as any).getTasks.useQuery();
  
  // 获取执行日志
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = (trpc.scheduler as any).getLogs.useQuery({ limit: 50 });
  
  // 获取提醒配置
  const { data: configData, isLoading: configLoading } = (trpc.scheduler as any).getReminderConfig.useQuery();
  
  // 触发任务
  const triggerMutation = (trpc.scheduler as any).triggerTask.useMutation({
    onSuccess: (data: any) => {
      toast.success(`${t("admin.scheduler.taskTriggered")} "${data?.taskId}"`);
      refetchTasks();
      refetchLogs();
    },
    onError: (error: any) => {
      toast.error(`${t("admin.scheduler.triggerFailed")}: ${error.message}`);
    }
  });
  
  // 启用/禁用任务
  const setEnabledMutation = (trpc.scheduler as any).setTaskEnabled.useMutation({
    onSuccess: () => {
      toast.success(t("admin.scheduler.taskStatusUpdated"));
      refetchTasks();
    },
    onError: (error: any) => {
      toast.error(`${t("admin.scheduler.updateFailed")}: ${error.message}`);
    }
  });
  
  // 更新提醒配置
  const updateConfigMutation = (trpc.scheduler as any).updateReminderConfig.useMutation({
    onSuccess: () => {
      toast.success(t("admin.scheduler.configSaved"));
    },
    onError: (error: any) => {
      toast.error(`${t("admin.scheduler.saveFailed")}: ${error.message}`);
    }
  });
  
  const [localConfig, setLocalConfig] = useState<ReminderConfig | null>(null);
  
  // 初始化本地配置
  if (configData && !localConfig) {
    setLocalConfig(configData);
  }
  
  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return t("admin.scheduler.neverExecuted");
    return new Date(timestamp).toLocaleString('zh-CN');
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />{t("admin.scheduler.success")}</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />{t("admin.scheduler.failed")}</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t("admin.scheduler.running")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const tasks: ScheduledTask[] = tasksData || [];
  const logs: TaskExecutionLog[] = logsData || [];

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Timer}
          title={t("admin.scheduler.title")}
          description={t("admin.scheduler.description")}
          actions={
            <Button
              variant="outline"
              onClick={() => { refetchTasks(); refetchLogs(); }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("admin.scheduler.refresh")}
            </Button>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-lg gap-1">
            <TabsTrigger value="tasks" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("admin.scheduler.taskList")}
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <History className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("admin.scheduler.executionLogs")}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("admin.scheduler.alertRules")}
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("admin.scheduler.reminderConfig")}
            </TabsTrigger>
          </TabsList>

          {/* 任务列表 Tab */}
          <TabsContent value="tasks" className="space-y-4">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t("admin.scheduler.noTasks")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <Card key={task.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${task.enabled ? 'bg-primary/20' : 'bg-muted'}`}>
                            <Calendar className={`w-5 h-5 ${task.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{task.name}</CardTitle>
                            <CardDescription>{task.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`enable-${task.id}`} className="text-sm text-muted-foreground">
                              {task.enabled ? t("admin.scheduler.enabled") : t("admin.scheduler.disabled")}
                            </Label>
                            <Switch
                              id={`enable-${task.id}`}
                              checked={task.enabled}
                              onCheckedChange={(checked) => {
                                setEnabledMutation.mutate({ taskId: task.id, enabled: checked });
                              }}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerMutation.mutate({ taskId: task.id })}
                            disabled={triggerMutation.isPending}
                            className="gap-2"
                          >
                            {triggerMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                            {t("admin.scheduler.executeNow")}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t("admin.scheduler.cronExpression")}:</span>
                          <code className="ml-2 px-2 py-1 bg-muted rounded text-xs font-mono">
                            {task.cronExpression}
                          </code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("admin.scheduler.lastRun")}:</span>
                          <span className="ml-2">{formatDateTime(task.lastRun)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("admin.scheduler.nextRun")}:</span>
                          <span className="ml-2 text-primary">{formatDateTime(task.nextRun)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 执行日志 Tab */}
          <TabsContent value="logs" className="space-y-4">
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t("admin.scheduler.noExecutionRecords")}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("admin.scheduler.executionHistory")}</CardTitle>
                  <CardDescription>{t("admin.scheduler.last50Records")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {getStatusBadge(log.status)}
                          <div>
                            <p className="font-medium">{log.taskName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDateTime(log.startTime)}
                              {log.endTime && ` - ${t("admin.scheduler.duration")} ${Math.round((log.endTime - log.startTime) / 1000)}s`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {log.result && (
                            <p className="text-sm text-muted-foreground max-w-xs truncate">
                              {log.result}
                            </p>
                          )}
                          {log.error && (
                            <p className="text-sm text-red-400 max-w-xs truncate flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {log.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 提醒配置 Tab */}
          <TabsContent value="config" className="space-y-4">
            {configLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("admin.scheduler.reminderConfigTitle")}</CardTitle>
                  <CardDescription>{t("admin.scheduler.reminderConfigDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="noFollowUpDays">{t("admin.scheduler.noFollowUpDays")}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="noFollowUpDays"
                          type="number"
                          min={1}
                          max={30}
                          value={localConfig?.noFollowUpDays || 3}
                          onChange={(e) => setLocalConfig(prev => prev ? { ...prev, noFollowUpDays: parseInt(e.target.value) || 3 } : null)}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">{t("admin.scheduler.daysUnit")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.scheduler.noFollowUpHint")}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dueSoonHours">{t("admin.scheduler.dueSoonHours")}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="dueSoonHours"
                          type="number"
                          min={1}
                          max={168}
                          value={localConfig?.dueSoonHours || 24}
                          onChange={(e) => setLocalConfig(prev => prev ? { ...prev, dueSoonHours: parseInt(e.target.value) || 24 } : null)}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">{t("admin.scheduler.hoursUnit")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.scheduler.dueSoonHint")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6 space-y-4">
                    <h4 className="font-medium">{t("admin.scheduler.notificationMethod")}</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t("admin.scheduler.wechatNotification")}</Label>
                        <p className="text-xs text-muted-foreground">{t("admin.scheduler.wechatNotificationDesc")}</p>
                      </div>
                      <Switch
                        checked={localConfig?.enableWechatNotification || false}
                        onCheckedChange={(checked) => setLocalConfig(prev => prev ? { ...prev, enableWechatNotification: checked } : null)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t("admin.scheduler.emailNotification")}</Label>
                        <p className="text-xs text-muted-foreground">{t("admin.scheduler.emailNotificationDesc")}</p>
                      </div>
                      <Switch
                        checked={localConfig?.enableEmailNotification || false}
                        onCheckedChange={(checked) => setLocalConfig(prev => prev ? { ...prev, enableEmailNotification: checked } : null)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => {
                        if (localConfig) {
                          updateConfigMutation.mutate(localConfig);
                        }
                      }}
                      disabled={updateConfigMutation.isPending}
                    >
                      {updateConfigMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {t("admin.scheduler.saveConfig")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 告警规则 Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <AlertRuleManager open={true} onOpenChange={() => {}} />
          </TabsContent>
        </Tabs>
      </div>
  );
}
