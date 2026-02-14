import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Bell, CheckCircle2, Clock, Edit2, ExternalLink, FileText, Plus, RefreshCw, Send, Settings2, Trash2, Webhook, XCircle, Eye, Copy, Filter, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type WebhookType = "wecom" | "dingtalk" | "feishu" | "custom";
type EventType = "meeting_reminder" | "cost_alert" | "training_notification" | "system_notification";

interface WebhookConfig {
  id: number;
  name: string;
  type: WebhookType;
  webhookUrl: string;
  description: string | null;
  triggerEvents: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
}

interface WebhookLog {
  id: number;
  webhookId: number;
  eventType: string;
  payload: string | null;
  response: string | null;
  statusCode: number | null;
  success: boolean;
  errorMessage: string | null;
  sentAt: Date;
}

const webhookTypeLabels: Record<WebhookType, string> = {
  wecom: "企业微信",
  dingtalk: "钉钉",
  feishu: "飞书",
  custom: "自定义",
};

const webhookTypeColors: Record<WebhookType, string> = {
  wecom: "bg-green-500/10 text-green-500 border-green-500/20",
  dingtalk: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  feishu: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  custom: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const eventTypeLabels: Record<EventType, string> = {
  meeting_reminder: "会议提醒",
  cost_alert: "成本预警",
  training_notification: "培训通知",
  system_notification: "系统通知",
};

// Trigger condition types
type ConditionOperator = "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains" | "not_contains" | "starts_with" | "ends_with" | "in";
type ConditionLogic = "AND" | "OR";

interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

interface TriggerConditionGroup {
  logic: ConditionLogic;
  conditions: TriggerCondition[];
}

const conditionOperatorLabels: Record<ConditionOperator, string> = {
  eq: "等于",
  ne: "不等于",
  gt: "大于",
  lt: "小于",
  gte: "大于等于",
  lte: "小于等于",
  contains: "包含",
  not_contains: "不包含",
  starts_with: "开头是",
  ends_with: "结尾是",
  in: "在列表中",
};

const conditionFieldOptions = [
  { value: "alert_level", label: "预警级别", type: "select", options: ["low", "medium", "high", "critical"] },
  { value: "project_type", label: "项目类型", type: "text" },
  { value: "cost_category", label: "成本类别", type: "text" },
  { value: "deviation_percent", label: "偏差百分比", type: "number" },
  { value: "project_name", label: "项目名称", type: "text" },
  { value: "event_type", label: "事件类型", type: "select", options: ["meeting_reminder", "cost_alert", "training_notification", "system_notification"] },
];

export default function WebhookManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("configs");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [testMessage, setTestMessage] = useState("这是一条测试消息");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "wecom" as WebhookType,
    webhookUrl: "",
    description: "",
    triggerEvents: [] as EventType[],
    enabled: true,
    triggerConditions: {
      logic: "AND" as ConditionLogic,
      conditions: [] as TriggerCondition[],
    },
    // Retry configuration
    maxRetries: 3,
    retryIntervalSeconds: 60,
    useExponentialBackoff: true,
  });

  // Queries
  const { data: webhooksData, isLoading: webhooksLoading, refetch: refetchWebhooks } = trpc.webhook.getAll.useQuery();
  const webhooks = (webhooksData as any)?.webhooks || webhooksData || [];
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.webhook.getLogs.useQuery(
    { webhookId: selectedWebhook?.id, limit: 50 },
    { enabled: activeTab === "logs" }
  );

  // Mutations
  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook创建成功");
      setShowNewDialog(false);
      resetForm();
      refetchWebhooks();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook更新成功");
      setShowEditDialog(false);
      setSelectedWebhook(null);
      refetchWebhooks();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook删除成功");
      refetchWebhooks();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("测试消息发送成功");
      } else {
        toast.error(`测试失败: ${(result as any).message || result.response?.message}`);
      }
      setShowTestDialog(false);
      refetchLogs();
    },
    onError: (error) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  const toggleActiveMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success("状态更新成功");
      refetchWebhooks();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "wecom" as WebhookType,
      webhookUrl: "",
      description: "",
      triggerEvents: [],
      enabled: true,
      triggerConditions: {
        logic: "AND" as ConditionLogic,
        conditions: [],
      },
      maxRetries: 3,
      retryIntervalSeconds: 60,
      useExponentialBackoff: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      type: formData.type,
      url: formData.webhookUrl,
      description: formData.description || undefined,
      triggerEvents: formData.triggerEvents,
      enabled: formData.enabled,
      maxRetries: formData.maxRetries,
      retryIntervalSeconds: formData.retryIntervalSeconds,
      useExponentialBackoff: formData.useExponentialBackoff,
    } as any);
  };

  const handleUpdate = () => {
    if (!selectedWebhook) return;
    updateMutation.mutate({
      id: String(selectedWebhook.id),
      name: formData.name,
      type: formData.type,
      url: formData.webhookUrl,
      description: formData.description || undefined,
      triggerEvents: formData.triggerEvents,
      enabled: formData.enabled,
      maxRetries: formData.maxRetries,
      retryIntervalSeconds: formData.retryIntervalSeconds,
      useExponentialBackoff: formData.useExponentialBackoff,
    } as any);
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    // Parse triggerConditions from webhook if available (stored as JSON in description or separate field)
    let parsedConditions: TriggerConditionGroup = { logic: "AND", conditions: [] };
    try {
      // Try to parse from description if it contains JSON conditions
      if (webhook.description && webhook.description.startsWith('{"logic":')) {
        parsedConditions = JSON.parse(webhook.description);
      }
    } catch (e) {
      // Keep default empty conditions
    }
    setFormData({
      name: webhook.name,
      type: webhook.type as WebhookType,
      webhookUrl: webhook.webhookUrl,
      description: webhook.description || "",
      triggerEvents: (webhook.triggerEvents || "").split(",").filter(Boolean) as EventType[],
      enabled: webhook.enabled,
      triggerConditions: parsedConditions,
      maxRetries: (webhook as any).maxRetries ?? 3,
      retryIntervalSeconds: (webhook as any).retryIntervalSeconds ?? 60,
      useExponentialBackoff: (webhook as any).useExponentialBackoff ?? true,
    });
    setShowEditDialog(true);
  };

  const handleTest = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setShowTestDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个Webhook吗？")) {
      deleteMutation.mutate({ id: String(id) } as any);
    }
  };

  const toggleEvent = (event: EventType) => {
    setFormData(prev => ({
      ...prev,
      triggerEvents: prev.triggerEvents.includes(event)
        ? prev.triggerEvents.filter(e => e !== event)
        : [...prev.triggerEvents, event],
    }));
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-CN");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Webhook}
          title="Webhook管理"
          description="配置和管理系统通知的Webhook端点"
          actions={
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>新建Webhook</DialogTitle>
                  <DialogDescription>配置新的Webhook端点接收系统通知</DialogDescription>
                </DialogHeader>
                <WebhookForm
                  formData={formData}
                  setFormData={setFormData}
                  toggleEvent={toggleEvent}
                  onSubmit={handleCreate}
                  isLoading={createMutation.isPending}
                  submitLabel="创建"
                />
              </DialogContent>
            </Dialog>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Webhook} label="Webhook总数" value={webhooks?.length || 0} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard icon={CheckCircle2} label="已启用" value={webhooks?.filter(w => w.enabled).length || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Send} label="今日发送" value="-" iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertCircle} label="失败次数" value="-" iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="configs">
              <Settings2 className="w-4 h-4 mr-2" />
              配置列表
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              消息模板
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Clock className="w-4 h-4 mr-2" />
              发送日志
            </TabsTrigger>
          </TabsList>

          {/* Configs Tab */}
          <TabsContent value="configs" className="mt-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Webhook配置列表
                </CardTitle>
                <CardDescription>管理所有已配置的Webhook端点</CardDescription>
              </CardHeader>
              <CardContent>
                {webhooksLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : webhooks && webhooks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>事件</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhooks.map((webhook) => (
                        <TableRow key={webhook.id}>
                          <TableCell className="font-medium">{webhook.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={webhookTypeColors[webhook.type as WebhookType]}>
                              {webhookTypeLabels[webhook.type as WebhookType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            <span className="text-muted-foreground text-sm">{webhook.webhookUrl}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(webhook.triggerEvents || "").split(",").filter(Boolean).map((event) => (
                                <Badge key={event} variant="secondary" className="text-xs">
                                  {eventTypeLabels[event as EventType] || event}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={webhook.enabled}
                              onCheckedChange={(checked) => {
                                toggleActiveMutation.mutate({
                                  id: webhook.id,
                                  enabled: checked,
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTest(webhook)}
                                title="测试"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(webhook)}
                                title="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(webhook.id)}
                                title="删除"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无Webhook配置，点击"新建Webhook"创建
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      发送日志
                    </CardTitle>
                    <CardDescription>查看Webhook消息发送记录</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedWebhook?.id?.toString() || "all"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedWebhook(null);
                        } else {
                          const webhook = webhooks?.find(w => w.id === parseInt(value));
                          setSelectedWebhook(webhook || null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="选择Webhook" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部Webhook</SelectItem>
                        {webhooks?.map((webhook) => (
                          <SelectItem key={webhook.id} value={webhook.id.toString()}>
                            {webhook.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetchLogs()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : logs && logs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>事件类型</TableHead>
                        <TableHead>状态码</TableHead>
                        <TableHead>结果</TableHead>
                        <TableHead>错误信息</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(log.sentAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {eventTypeLabels[log.eventType as EventType] || log.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.statusCode && log.statusCode < 400 ? "default" : "destructive"}>
                              {log.statusCode || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.success ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                            {log.errorMessage || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无发送日志
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-4">
            <TemplatesTab />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>编辑Webhook</DialogTitle>
              <DialogDescription>修改Webhook配置</DialogDescription>
            </DialogHeader>
            <WebhookForm
              formData={formData}
              setFormData={setFormData}
              toggleEvent={toggleEvent}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
              submitLabel="保存"
            />
          </DialogContent>
        </Dialog>

        {/* Test Dialog */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>测试Webhook</DialogTitle>
              <DialogDescription>
                向 {selectedWebhook?.name} 发送测试消息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>测试消息</Label>
                <Textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="输入测试消息内容"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    if (selectedWebhook) {
                      testMutation.mutate({
                        id: String(selectedWebhook.id),
                        message: testMessage,
                      } as any);
                    }
                  }}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? "发送中..." : "发送测试"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Webhook Form Component
function WebhookForm({
  formData,
  setFormData,
  toggleEvent,
  onSubmit,
  isLoading,
  submitLabel,
}: {
  formData: {
    name: string;
    type: WebhookType;
    webhookUrl: string;
    description: string;
    triggerEvents: EventType[];
    enabled: boolean;
    triggerConditions: TriggerConditionGroup;
    maxRetries: number;
    retryIntervalSeconds: number;
    useExponentialBackoff: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  toggleEvent: (event: EventType) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  // Condition management functions
  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        conditions: [
          ...prev.triggerConditions.conditions,
          { field: "alert_level", operator: "eq" as ConditionOperator, value: "" },
        ],
      },
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        conditions: prev.triggerConditions.conditions.filter((_, i) => i !== index),
      },
    }));
  };

  const updateCondition = (index: number, field: keyof TriggerCondition, value: string) => {
    setFormData(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        conditions: prev.triggerConditions.conditions.map((c, i) =>
          i === index ? { ...c, [field]: value } : c
        ),
      },
    }));
  };

  const toggleLogic = () => {
    setFormData(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        logic: prev.triggerConditions.logic === "AND" ? "OR" : "AND",
      },
    }));
  };
  
  // Condition testing state
  const [showTestConditionDialog, setShowTestConditionDialog] = useState(false);
  const [testData, setTestData] = useState<Record<string, string>>({
    alert_level: "high",
    project_type: "development",
    cost_amount: "10000",
    event_type: "cost_alert",
  });
  const [testResult, setTestResult] = useState<{ matches: boolean; details: string[] } | null>(null);
  
  // Evaluate condition against test data
  const evaluateCondition = (condition: TriggerCondition, data: Record<string, string>): { matches: boolean; reason: string } => {
    const fieldValue = data[condition.field] || "";
    const targetValue = condition.value;
    
    let matches = false;
    let reason = "";
    
    switch (condition.operator) {
      case "eq":
        matches = fieldValue === targetValue;
        reason = `${condition.field} ("${fieldValue}") ${matches ? "=" : "≠"} "${targetValue}"`;
        break;
      case "ne":
        matches = fieldValue !== targetValue;
        reason = `${condition.field} ("${fieldValue}") ${matches ? "≠" : "="} "${targetValue}"`;
        break;
      case "gt":
        matches = parseFloat(fieldValue) > parseFloat(targetValue);
        reason = `${condition.field} (${fieldValue}) ${matches ? ">" : "≤"} ${targetValue}`;
        break;
      case "lt":
        matches = parseFloat(fieldValue) < parseFloat(targetValue);
        reason = `${condition.field} (${fieldValue}) ${matches ? "<" : "≥"} ${targetValue}`;
        break;
      case "gte":
        matches = parseFloat(fieldValue) >= parseFloat(targetValue);
        reason = `${condition.field} (${fieldValue}) ${matches ? "≥" : "<"} ${targetValue}`;
        break;
      case "lte":
        matches = parseFloat(fieldValue) <= parseFloat(targetValue);
        reason = `${condition.field} (${fieldValue}) ${matches ? "≤" : ">"} ${targetValue}`;
        break;
      case "contains":
        matches = fieldValue.includes(targetValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? "包含" : "不包含"} "${targetValue}"`;
        break;
      case "not_contains":
        matches = !fieldValue.includes(targetValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? "不包含" : "包含"} "${targetValue}"`;
        break;
      case "starts_with":
        matches = fieldValue.startsWith(targetValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? "开头是" : "开头不是"} "${targetValue}"`;
        break;
      case "ends_with":
        matches = fieldValue.endsWith(targetValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? "结尾是" : "结尾不是"} "${targetValue}"`;
        break;
      case "in":
        const values = targetValue.split(",").map(v => v.trim());
        matches = values.includes(fieldValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? "在" : "不在"} [${values.join(", ")}] 中`;
        break;
      default:
        reason = `未知运算符: ${condition.operator}`;
    }
    
    return { matches, reason };
  };
  
  // Run condition test
  const runConditionTest = () => {
    const conditions = formData.triggerConditions.conditions;
    const logic = formData.triggerConditions.logic;
    
    if (conditions.length === 0) {
      setTestResult({ matches: true, details: ["未设置条件，所有事件都会触发"] });
      return;
    }
    
    const results = conditions.map(c => evaluateCondition(c, testData));
    const details = results.map((r, i) => `${i + 1}. ${r.reason} → ${r.matches ? "✅ 匹配" : "❌ 不匹配"}`);
    
    let finalMatch = false;
    if (logic === "AND") {
      finalMatch = results.every(r => r.matches);
      details.push(`\n结果: 所有条件 (AND) ${finalMatch ? "全部匹配 ✅" : "未全部匹配 ❌"}`);
    } else {
      finalMatch = results.some(r => r.matches);
      details.push(`\n结果: 任一条件 (OR) ${finalMatch ? "匹配 ✅" : "无匹配 ❌"}`);
    }
    
    setTestResult({ matches: finalMatch, details });
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>名称</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="如：生产环境企业微信"
        />
      </div>

      <div className="space-y-2">
        <Label>类型</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as WebhookType }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wecom">企业微信</SelectItem>
            <SelectItem value="dingtalk">钉钉</SelectItem>
            <SelectItem value="feishu">飞书</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Webhook URL</Label>
        <Input
          value={formData.webhookUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
          placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
        />
      </div>

      <div className="space-y-2">
        <Label>描述 (可选)</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Webhook用途说明"
        />
      </div>

      <div className="space-y-2">
        <Label>订阅事件</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(eventTypeLabels) as EventType[]).map((event) => (
            <label
              key={event}
              className={`flex items-center gap-2 p-2 rounded-sm border cursor-pointer transition-colors ${
                formData.triggerEvents.includes(event)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.triggerEvents.includes(event)}
                onChange={() => toggleEvent(event)}
                className="sr-only"
              />
              <span className="text-sm">{eventTypeLabels[event]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>启用状态</Label>
        <Switch
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      {/* Retry Configuration Section */}
      <div className="space-y-3 border-t border-border pt-4">
        <Label className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          重试配置
        </Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">最大重试次数</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={formData.maxRetries}
              onChange={(e) => setFormData(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 0 }))}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">重试间隔(秒)</Label>
            <Input
              type="number"
              min={10}
              max={3600}
              value={formData.retryIntervalSeconds}
              onChange={(e) => setFormData(prev => ({ ...prev, retryIntervalSeconds: parseInt(e.target.value) || 60 }))}
              className="h-8"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Label className="text-sm">指数退避</Label>
          <Switch
            checked={formData.useExponentialBackoff}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, useExponentialBackoff: checked }))}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          启用指数退避后，每次重试间隔会递增（基础间隔 × 2^重试次数）
        </p>
      </div>

      {/* Trigger Conditions Section */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            触发条件 (可选)
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCondition}
          >
            <Plus className="w-3 h-3 mr-1" />
            添加条件
          </Button>
        </div>
        
        {formData.triggerConditions.conditions.length > 0 && (
          <div className="space-y-2">
            {/* Logic Toggle */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">条件关系:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleLogic}
                className="h-7 px-2"
              >
                {formData.triggerConditions.logic === "AND" ? "且 (AND)" : "或 (OR)"}
              </Button>
            </div>
            
            {/* Conditions List */}
            {formData.triggerConditions.conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-sm border border-border">
                {/* Field Select */}
                <Select
                  value={condition.field}
                  onValueChange={(value) => updateCondition(index, "field", value)}
                >
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionFieldOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Operator Select */}
                <Select
                  value={condition.operator}
                  onValueChange={(value) => updateCondition(index, "operator", value)}
                >
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(conditionOperatorLabels) as ConditionOperator[]).map((op) => (
                      <SelectItem key={op} value={op}>
                        {conditionOperatorLabels[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Value Input */}
                <Input
                  value={condition.value}
                  onChange={(e) => updateCondition(index, "value", e.target.value)}
                  placeholder="值"
                  className="flex-1 h-8"
                />
                
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition(index)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {formData.triggerConditions.conditions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            未设置条件时，所有订阅事件都会触发此Webhook
          </p>
        )}
        
        {/* Test Condition Button */}
        {formData.triggerConditions.conditions.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setTestResult(null);
              setShowTestConditionDialog(true);
            }}
            className="mt-2"
          >
            <Eye className="w-3 h-3 mr-1" />
            测试条件
          </Button>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onSubmit} disabled={isLoading || !formData.name || !formData.webhookUrl}>
          {isLoading ? "处理中..." : submitLabel}
        </Button>
      </div>
      
      {/* Test Condition Dialog */}
      <Dialog open={showTestConditionDialog} onOpenChange={setShowTestConditionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>测试触发条件</DialogTitle>
            <DialogDescription>
              输入模拟数据验证条件是否正确触发
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Test Data Input */}
            <div className="space-y-3">
              <Label>模拟数据</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">预警级别</Label>
                  <Select
                    value={testData.alert_level}
                    onValueChange={(value) => setTestData(prev => ({ ...prev, alert_level: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="critical">严重</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">项目类型</Label>
                  <Select
                    value={testData.project_type}
                    onValueChange={(value) => setTestData(prev => ({ ...prev, project_type: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">研发</SelectItem>
                      <SelectItem value="production">生产</SelectItem>
                      <SelectItem value="maintenance">运维</SelectItem>
                      <SelectItem value="consulting">咨询</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">成本金额</Label>
                  <Input
                    type="number"
                    value={testData.cost_amount}
                    onChange={(e) => setTestData(prev => ({ ...prev, cost_amount: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">事件类型</Label>
                  <Select
                    value={testData.event_type}
                    onValueChange={(value) => setTestData(prev => ({ ...prev, event_type: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cost_alert">成本预警</SelectItem>
                      <SelectItem value="meeting_reminder">会议提醒</SelectItem>
                      <SelectItem value="training_notification">培训通知</SelectItem>
                      <SelectItem value="system_notification">系统通知</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Current Conditions Display */}
            <div className="space-y-2">
              <Label>当前条件 ({formData.triggerConditions.logic})</Label>
              <div className="text-xs space-y-1 p-2 bg-muted/30 rounded-sm">
                {formData.triggerConditions.conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span>{c.field}</span>
                    <span className="text-primary">{conditionOperatorLabels[c.operator]}</span>
                    <span>"{c.value}"</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Run Test Button */}
            <Button onClick={runConditionTest} className="w-full">
              运行测试
            </Button>
            
            {/* Test Result */}
            {testResult && (
              <div className={`p-3 rounded-sm border ${testResult.matches ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div className={`font-medium mb-2 ${testResult.matches ? "text-green-500" : "text-red-500"}`}>
                  {testResult.matches ? "✅ 条件匹配 - Webhook将触发" : "❌ 条件不匹配 - Webhook不会触发"}
                </div>
                <div className="text-xs space-y-1">
                  {testResult.details.map((detail, i) => (
                    <div key={i} className="text-muted-foreground whitespace-pre-wrap">{detail}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ============================================
// Templates Tab Component
// ============================================

interface WebhookTemplate {
  id: number;
  name: string;
  eventType: string;
  webhookType: WebhookType;
  titleTemplate: string;
  contentTemplate: string;
  availableVariables: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
}

function TemplatesTab() {
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WebhookTemplate | null>(null);
  const [previewResult, setPreviewResult] = useState<{ title: string; content: string } | null>(null);
  
  const [templateForm, setTemplateForm] = useState({
    name: "",
    eventType: "meeting_reminder",
    webhookType: "wecom" as WebhookType,
    titleTemplate: "",
    contentTemplate: "",
    availableVariables: "",
    isDefault: false,
  });
  
  // Sample variables for preview
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  
  // Queries
  const { data: templates, isLoading, refetch } = trpc.webhook.getTemplates.useQuery();
  
  // Mutations
  const createMutation = trpc.webhook.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板创建成功");
      setShowNewTemplateDialog(false);
      refetch();
      resetTemplateForm();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.webhook.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板更新成功");
      setShowEditTemplateDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
  
  const deleteMutation = trpc.webhook.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("模板删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
  
  const initMutation = trpc.webhook.initTemplates.useMutation({
    onSuccess: (result) => {
      toast.success(`初始化完成，创建了 ${(result as any).created} 个默认模板`);
      refetch();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    },
  });
  
  const previewMutation = (trpc.webhook.previewTemplate as any).useMutation({
    onSuccess: (result) => {
      setPreviewResult(result);
    },
    onError: (error) => {
      toast.error(`预览失败: ${error.message}`);
    },
  });
  
  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      eventType: "meeting_reminder",
      webhookType: "wecom",
      titleTemplate: "",
      contentTemplate: "",
      availableVariables: "",
      isDefault: false,
    });
  };
  
  const handleCreateTemplate = () => {
    createMutation.mutate({
      ...templateForm,
      availableVariables: templateForm.availableVariables || undefined,
    });
  };
  
  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      ...templateForm,
    });
  };
  
  const handleDeleteTemplate = (id: number) => {
    if (confirm("确定要删除此模板吗？")) {
      deleteMutation.mutate({ id });
    }
  };
  
  const handleEditTemplate = (template: WebhookTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      eventType: template.eventType,
      webhookType: template.webhookType,
      titleTemplate: template.titleTemplate,
      contentTemplate: template.contentTemplate,
      availableVariables: template.availableVariables || "",
      isDefault: template.isDefault,
    });
    setShowEditTemplateDialog(true);
  };
  
  const handlePreviewTemplate = (template: WebhookTemplate) => {
    setSelectedTemplate(template);
    // Parse available variables and set default values
    try {
      const vars = template.availableVariables ? JSON.parse(template.availableVariables) : [];
      const defaultVars: Record<string, string> = {};
      vars.forEach((v: string) => {
        defaultVars[v] = `[${v}]`;
      });
      setPreviewVariables(defaultVars);
    } catch {
      setPreviewVariables({});
    }
    setPreviewResult(null);
    setShowPreviewDialog(true);
  };
  
  const handleGeneratePreview = () => {
    if (!selectedTemplate) return;
    previewMutation.mutate({
      templateId: selectedTemplate.id,
      variables: previewVariables,
    });
  };
  
  const eventTypeOptions = [
    { value: "meeting_reminder", label: "会议提醒" },
    { value: "cost_alert", label: "成本预警" },
    { value: "training_complete", label: "培训完成" },
    { value: "system_notification", label: "系统通知" },
  ];
  
  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              消息模板管理
            </CardTitle>
            <CardDescription>自定义Webhook消息模板，支持变量替换</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
              {initMutation.isPending ? "初始化中..." : "初始化默认模板"}
            </Button>
            <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetTemplateForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建模板
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>新建消息模板</DialogTitle>
                  <DialogDescription>创建自定义的Webhook消息模板</DialogDescription>
                </DialogHeader>
                <TemplateForm
                  formData={templateForm}
                  setFormData={setTemplateForm}
                  eventTypeOptions={eventTypeOptions}
                  onSubmit={handleCreateTemplate}
                  isLoading={createMutation.isPending}
                  submitLabel="创建"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : templates && templates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模板名称</TableHead>
                <TableHead>事件类型</TableHead>
                <TableHead>Webhook类型</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {eventTypeOptions.find(e => e.value === template.eventType)?.label || template.eventType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={webhookTypeColors[template.webhookType as WebhookType]}>
                      {webhookTypeLabels[template.webhookType as WebhookType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.isDefault ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(template.updatedAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreviewTemplate(template)}
                        title="预览"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTemplate(template)}
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(template.id)}
                        title="删除"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无消息模板</p>
            <p className="text-sm mt-2">点击"初始化默认模板"快速创建常用模板</p>
          </div>
        )}
      </CardContent>
      
      {/* Edit Template Dialog */}
      <Dialog open={showEditTemplateDialog} onOpenChange={setShowEditTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑消息模板</DialogTitle>
            <DialogDescription>修改Webhook消息模板</DialogDescription>
          </DialogHeader>
          <TemplateForm
            formData={templateForm}
            setFormData={setTemplateForm}
            eventTypeOptions={eventTypeOptions}
            onSubmit={handleUpdateTemplate}
            isLoading={updateMutation.isPending}
            submitLabel="保存"
          />
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>预览消息模板</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} - 输入变量值查看效果
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Variable Inputs */}
            <div className="space-y-2">
              <Label>变量值</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {Object.keys(previewVariables).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <Label className="w-24 text-sm text-muted-foreground">{`{{${key}}}`}</Label>
                    <Input
                      value={previewVariables[key]}
                      onChange={(e) => setPreviewVariables(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <Button onClick={handleGeneratePreview} disabled={previewMutation.isPending}>
              {previewMutation.isPending ? "生成中..." : "生成预览"}
            </Button>
            
            {/* Preview Result */}
            {previewResult && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">标题</Label>
                  <div className="font-medium">{previewResult.title}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">内容</Label>
                  <div className="whitespace-pre-wrap text-sm">{previewResult.content}</div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================
// Template Form Component
// ============================================

function TemplateForm({
  formData,
  setFormData,
  eventTypeOptions,
  onSubmit,
  isLoading,
  submitLabel,
}: {
  formData: {
    name: string;
    eventType: string;
    webhookType: WebhookType;
    titleTemplate: string;
    contentTemplate: string;
    availableVariables: string;
    isDefault: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  eventTypeOptions: { value: string; label: string }[];
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  // Extended variable hints with categories
  const variableHints: Record<string, { category: string; vars: { key: string; name: string; example: string }[] }[]> = {
    meeting_reminder: [
      { category: '会议信息', vars: [
        { key: 'meeting_title', name: '会议标题', example: '项目周会' },
        { key: 'meeting_time', name: '会议时间', example: '2026-01-16 14:00' },
        { key: 'meeting_location', name: '会议地点', example: '会议室A301' },
        { key: 'meeting_description', name: '会议描述', example: '讨论项目进度' },
        { key: 'meeting_participants', name: '参会人员', example: '张三, 李四' },
      ]},
      { category: '用户信息', vars: [
        { key: 'user_name', name: '用户名称', example: '张三' },
        { key: 'user_list', name: '用户列表', example: '张三, 李四, 王五' },
        { key: 'user_count', name: '用户数量', example: '5' },
      ]},
      { category: '链接', vars: [
        { key: 'detail_url', name: '详情链接', example: 'https://...' },
      ]},
    ],
    cost_alert: [
      { category: '项目信息', vars: [
        { key: 'project_name', name: '项目名称', example: '智能制造一期' },
        { key: 'project_code', name: '项目编号', example: 'GRT-2026-001' },
        { key: 'project_status', name: '项目状态', example: '进行中' },
      ]},
      { category: '预警信息', vars: [
        { key: 'alert_level', name: '预警级别', example: '严重' },
        { key: 'alert_type', name: '预警类型', example: '预算超支' },
        { key: 'alert_rule', name: '预警规则', example: '预算使用率95%' },
        { key: 'current_value', name: '当前值', example: '95,000' },
        { key: 'threshold_value', name: '阈值', example: '100,000' },
      ]},
      { category: '预算信息', vars: [
        { key: 'budget_used', name: '已用预算', example: '95,000' },
        { key: 'budget_total', name: '总预算', example: '100,000' },
        { key: 'budget_percent', name: '预算使用率', example: '95%' },
      ]},
      { category: '链接', vars: [
        { key: 'detail_url', name: '详情链接', example: 'https://...' },
        { key: 'action_url', name: '操作链接', example: 'https://...' },
      ]},
    ],
    training_complete: [
      { category: '培训信息', vars: [
        { key: 'training_name', name: '培训名称', example: '安全生产培训' },
        { key: 'training_type', name: '培训类型', example: '安全培训' },
        { key: 'training_time', name: '培训时间', example: '2026-01-20 09:00' },
        { key: 'training_location', name: '培训地点', example: '培训室B201' },
        { key: 'trainer_name', name: '培训师', example: '王老师' },
      ]},
      { category: '统计信息', vars: [
        { key: 'participant_count', name: '参与人数', example: '20' },
        { key: 'pass_rate', name: '通过率', example: '90%' },
        { key: 'certificate_number', name: '证书编号', example: 'CERT-2026-001' },
      ]},
      { category: '用户信息', vars: [
        { key: 'user_name', name: '用户名称', example: '张三' },
        { key: 'user_list', name: '用户列表', example: '张三, 李四' },
      ]},
    ],
    system_notification: [
      { category: '基础信息', vars: [
        { key: 'event_type', name: '事件类型', example: '系统通知' },
        { key: 'event_time', name: '事件时间', example: '2026-01-16 14:30:00' },
        { key: 'system_name', name: '系统名称', example: 'GRT智能系统' },
      ]},
      { category: '附件', vars: [
        { key: 'attachment_url', name: '附件链接', example: 'https://...' },
        { key: 'attachment_name', name: '附件名称', example: '报告.pdf' },
        { key: 'attachment_count', name: '附件数量', example: '3' },
      ]},
      { category: '自定义', vars: [
        { key: 'custom_field_1', name: '自定义字1', example: '自定义内容' },
        { key: 'custom_field_2', name: '自定义字2', example: '自定义内容' },
        { key: 'custom_field_3', name: '自定义字3', example: '自定义内容' },
      ]},
    ],
  };
  
  const currentHintCategories = variableHints[formData.eventType] || [];
  const allVarKeys = currentHintCategories.flatMap(cat => cat.vars.map(v => v.key));
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>模板名称</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="如：成本预警-企业微信"
          />
        </div>
        
        <div className="space-y-2">
          <Label>事件类型</Label>
          <Select
            value={formData.eventType}
            onValueChange={(value) => {
              setFormData(prev => ({
                ...prev,
                eventType: value,
                availableVariables: JSON.stringify(variableHints[value] || []),
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Webhook类型</Label>
          <Select
            value={formData.webhookType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, webhookType: value as WebhookType }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wecom">企业微信</SelectItem>
              <SelectItem value="dingtalk">钉钉</SelectItem>
              <SelectItem value="feishu">飞书</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between pt-6">
          <Label>设为默认模板</Label>
          <Switch
            checked={formData.isDefault}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
          />
        </div>
      </div>
      
      {/* Variable Hints - Categorized */}
      {currentHintCategories.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          <Label className="text-xs text-muted-foreground">可用变量（点击复制）</Label>
          {currentHintCategories.map((category) => (
            <div key={category.category}>
              <span className="text-xs font-medium text-muted-foreground">{category.category}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {category.vars.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${v.key}}}`);
                      toast.success(`已复制 {{${v.key}}}`);
                    }}
                    title={`${v.name}: ${v.example}`}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {v.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground mt-2">
            提示：支持条件语法 {`{{#if variable}}...内容...{{/if}}`} 和 {`{{#unless variable}}...内容...{{/unless}}`}
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label>标题模板</Label>
        <Input
          value={formData.titleTemplate}
          onChange={(e) => setFormData(prev => ({ ...prev, titleTemplate: e.target.value }))}
          placeholder="如：⚠️ 成本预警: {{title}}"
        />
      </div>
      
      <div className="space-y-2">
        <Label>内容模板</Label>
        <Textarea
          value={formData.contentTemplate}
          onChange={(e) => setFormData(prev => ({ ...prev, contentTemplate: e.target.value }))}
          placeholder={`**项目**: {{projectName}}\n**预警级别**: {{alertLevel}}\n**当前值**: {{currentValue}}`}
          rows={8}
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button
          onClick={onSubmit}
          disabled={isLoading || !formData.name || !formData.titleTemplate || !formData.contentTemplate}
        >
          {isLoading ? "处理中..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
