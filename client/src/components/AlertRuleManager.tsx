/**
 * 告警规则管理组件
 * 支持任务执行失败、超时等告警规则配置
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Save,
  Trash2,
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  Check,
  Clock,
  TrendingUp,
  Settings,
  History,
  BarChart3,
} from "lucide-react";
import { FeatureGuideDialog, alertRuleGuideSteps } from "./FeatureGuide";

// 规则类型
const RULE_TYPES = [
  { value: "consecutive_failure", label: "连续失败", icon: XCircle, description: "任务连续失败N次时触发" },
  { value: "timeout", label: "执行超时", icon: Clock, description: "任务执行时间超过阈值时触发" },
  { value: "error_rate", label: "错误率", icon: TrendingUp, description: "错误率超过阈值时触发" },
  { value: "custom", label: "自定义", icon: Settings, description: "自定义告警条件" },
] as const;

// 通知渠道
const NOTIFICATION_CHANNELS = [
  { value: "system", label: "系统通知" },
  { value: "email", label: "邮件" },
  { value: "webhook", label: "Webhook" },
  { value: "wechat", label: "企业微信" },
] as const;

// 告警级别
const SEVERITY_CONFIG = {
  info: { label: "信息", color: "bg-blue-500", icon: Info },
  warning: { label: "警告", color: "bg-yellow-500", icon: AlertTriangle },
  error: { label: "错误", color: "bg-red-500", icon: AlertCircle },
  critical: { label: "严重", color: "bg-red-700", icon: XCircle },
};

type RuleType = "consecutive_failure" | "timeout" | "error_rate" | "custom";
type NotificationChannel = "email" | "webhook" | "wechat" | "system";

interface AlertRuleManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AlertRuleManager({ open, onOpenChange }: AlertRuleManagerProps) {
  const [activeTab, setActiveTab] = useState("rules");
  const [editingRule, setEditingRule] = useState<any>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ruleType: "consecutive_failure" as RuleType,
    taskType: "",
    conditions: {
      consecutiveFailures: 3,
      timeoutSeconds: 300,
      errorRateThreshold: 50,
      timeWindowMinutes: 60,
    },
    actions: {
      channels: ["system"] as NotificationChannel[],
      webhookUrl: "",
      recipients: [] as string[],
    },
    isEnabled: true,
  });

  // 获取规则列表
  const { data: rules, refetch: refetchRules } = trpc.alertRule.list.useQuery();

  // 获取告警历史
  const { data: history, refetch: refetchHistory } = (trpc.alertRule.listHistory as any).useQuery({ limit: 50 });

  // 获取统计数据
  const { data: statistics } = trpc.alertRule.getStatistics.useQuery();

  // 创建规则
  const createMutation = trpc.alertRule.create.useMutation({
    onSuccess: () => {
      toast.success("告警规则创建成功");
      refetchRules();
      setShowRuleEditor(false);
      resetForm();
    },
    onError: (err) => toast.error("创建失败: " + err.message),
  });

  // 更新规则
  const updateMutation = trpc.alertRule.update.useMutation({
    onSuccess: () => {
      toast.success("告警规则更新成功");
      refetchRules();
      setShowRuleEditor(false);
      setEditingRule(null);
      resetForm();
    },
    onError: (err) => toast.error("更新失败: " + err.message),
  });

  // 删除规则
  const deleteMutation = trpc.alertRule.delete.useMutation({
    onSuccess: () => {
      toast.success("规则已删除");
      refetchRules();
    },
    onError: (err) => toast.error("删除失败: " + err.message),
  });

  // 切换启用状态
  const toggleMutation = trpc.alertRule.toggleEnabled.useMutation({
    onSuccess: () => {
      refetchRules();
    },
    onError: (err) => toast.error("操作失败: " + err.message),
  });

  // 确认告警
  const acknowledgeMutation = trpc.alertRule.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("告警已确认");
      refetchHistory();
    },
    onError: (err) => toast.error("确认失败: " + err.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      ruleType: "consecutive_failure",
      taskType: "",
      conditions: {
        consecutiveFailures: 3,
        timeoutSeconds: 300,
        errorRateThreshold: 50,
        timeWindowMinutes: 60,
      },
      actions: {
        channels: ["system"],
        webhookUrl: "",
        recipients: [],
      },
      isEnabled: true,
    });
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || "",
      ruleType: rule.ruleType,
      taskType: rule.taskType || "",
      conditions: rule.conditions,
      actions: rule.actions,
      isEnabled: rule.isEnabled,
    });
    setShowRuleEditor(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("请输入规则名称");
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      ruleType: formData.ruleType,
      taskType: formData.taskType || undefined,
      conditions: formData.conditions,
      actions: formData.actions,
      isEnabled: formData.isEnabled,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChannelToggle = (channel: NotificationChannel) => {
    const channels = formData.actions.channels.includes(channel)
      ? formData.actions.channels.filter(c => c !== channel)
      : [...formData.actions.channels, channel];
    setFormData({
      ...formData,
      actions: { ...formData.actions, channels },
    });
  };

  return (
    <>
      <FeatureGuideDialog
        featureKey="alert_rule"
        featureName="告警规则功能引导"
        steps={alertRuleGuideSteps}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              告警规则管理
            </DialogTitle>
          </DialogHeader>

        {/* 统计卡片 */}
        {statistics && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">启用规则</div>
              <div className="text-xl font-bold">{(statistics as any).enabledRules}/{(statistics as any).totalRules}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">待处理告警</div>
              <div className="text-xl font-bold text-yellow-500">{(statistics as any).unacknowledgedAlerts}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">7天告警数</div>
              <div className="text-xl font-bold">{(statistics as any).totalAlerts}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">严重告警</div>
              <div className="text-xl font-bold text-red-500">
                {((statistics as any).alertsBySeverity?.critical || 0) + ((statistics as any).alertsBySeverity?.error || 0)}
              </div>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              规则配置
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              告警历史
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              统计分析
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            <TabsContent value="rules" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => { resetForm(); setEditingRule(null); setShowRuleEditor(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建规则
                </Button>
              </div>

              {rules && (rules as any).length > 0 ? (
                <div className="space-y-2">
                  {(rules as any).map((rule: any) => {
                    const typeConfig = RULE_TYPES.find(t => t.value === rule.ruleType);
                    const TypeIcon = typeConfig?.icon || Settings;
                    return (
                      <Card key={rule.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${rule.isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{rule.name}</span>
                                  <Badge variant={rule.isEnabled ? "default" : "secondary"}>
                                    {rule.isEnabled ? "启用" : "禁用"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {typeConfig?.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>触发次数: {rule.triggerCount || 0}</span>
                                  {rule.lastTriggeredAt && (
                                    <span>
                                      最后触发: {new Date(rule.lastTriggeredAt).toLocaleString("zh-CN")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={rule.isEnabled}
                                onCheckedChange={() => toggleMutation.mutate({ id: rule.id! })}
                              />
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("确定要删除这个规则吗？")) {
                                    deleteMutation.mutate({ id: rule.id! });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无告警规则</p>
                  <p className="text-sm mt-1">点击"新建规则"创建第一个告警规则</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4 space-y-4">
              {history && history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((alert) => {
                    const severityConfig = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG];
                    const SeverityIcon = severityConfig?.icon || AlertTriangle;
                    return (
                      <Card key={alert.id} className={alert.acknowledged ? "opacity-60" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${severityConfig?.color} text-white`}>
                                <SeverityIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{alert.ruleName}</span>
                                  <Badge variant="outline">{severityConfig?.label}</Badge>
                                  {alert.acknowledged && (
                                    <Badge variant="secondary">
                                      <Check className="w-3 h-3 mr-1" />
                                      已确认
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                                <div className="text-xs text-muted-foreground mt-2">
                                  {new Date(alert.createdAt!).toLocaleString("zh-CN")}
                                </div>
                              </div>
                            </div>
                            {!alert.acknowledged && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => acknowledgeMutation.mutate({ id: alert.id! })}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                确认
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无告警历史</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="statistics" className="mt-4 space-y-4">
              {statistics && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">告警级别分布</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
                          const count = (statistics as any).alertsBySeverity?.[key] || 0;
                          const total = (statistics as any).totalAlerts || 1;
                          const percentage = (count / total) * 100;
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded ${config.color}`} />
                              <span className="w-16 text-sm">{config.label}</span>
                              <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                                <div
                                  className={`h-full ${config.color}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="w-12 text-right text-sm">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {(statistics as any).recentAlerts && (statistics as any).recentAlerts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">最近告警</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(statistics as any).recentAlerts.map((alert: any) => (
                            <div key={alert.id} className="flex items-center gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG]?.color}`} />
                              <span className="flex-1 truncate">{alert.message}</span>
                              <span className="text-muted-foreground text-xs">
                                {new Date(alert.createdAt!).toLocaleString("zh-CN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* 规则编辑对话框 */}
        <Dialog open={showRuleEditor} onOpenChange={setShowRuleEditor}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRule ? "编辑规则" : "新建规则"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>规则名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入规则名称"
                />
              </div>

              <div className="space-y-2">
                <Label>规则类型</Label>
                <Select
                  value={formData.ruleType}
                  onValueChange={(value) => setFormData({ ...formData, ruleType: value as RuleType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* 条件配置 */}
              {formData.ruleType === "consecutive_failure" && (
                <div className="space-y-2">
                  <Label>连续失败次数</Label>
                  <Input
                    type="number"
                    value={formData.conditions.consecutiveFailures}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, consecutiveFailures: parseInt(e.target.value) || 3 },
                    })}
                    min={1}
                  />
                </div>
              )}

              {formData.ruleType === "timeout" && (
                <div className="space-y-2">
                  <Label>超时阈值（秒）</Label>
                  <Input
                    type="number"
                    value={formData.conditions.timeoutSeconds}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, timeoutSeconds: parseInt(e.target.value) || 300 },
                    })}
                    min={1}
                  />
                </div>
              )}

              {formData.ruleType === "error_rate" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>错误率阈值（%）</Label>
                    <Input
                      type="number"
                      value={formData.conditions.errorRateThreshold}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, errorRateThreshold: parseInt(e.target.value) || 50 },
                      })}
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>时间窗口（分钟）</Label>
                    <Input
                      type="number"
                      value={formData.conditions.timeWindowMinutes}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, timeWindowMinutes: parseInt(e.target.value) || 60 },
                      })}
                      min={1}
                    />
                  </div>
                </div>
              )}

              <Separator />

              {/* 通知渠道 */}
              <div className="space-y-2">
                <Label>通知渠道</Label>
                <div className="flex flex-wrap gap-2">
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <Badge
                      key={channel.value}
                      variant={formData.actions.channels.includes(channel.value as NotificationChannel) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleChannelToggle(channel.value as NotificationChannel)}
                    >
                      {channel.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {formData.actions.channels.includes("webhook") && (
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    value={formData.actions.webhookUrl}
                    onChange={(e) => setFormData({
                      ...formData,
                      actions: { ...formData.actions, webhookUrl: e.target.value },
                    })}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                />
                <Label>启用规则</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRuleEditor(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
    </>
  );
}
