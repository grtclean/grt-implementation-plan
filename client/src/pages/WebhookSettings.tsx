import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { 
  Webhook, Plus, Edit, Trash2, TestTube, History, 
  CheckCircle2, XCircle, Clock, Send, Settings2,
  MessageSquare, Bell, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

// Webhook类型定义
interface WebhookConfig {
  id: number;
  name: string;
  description?: string;
  webhookUrl: string;
  webhookType: "wecom" | "dingtalk" | "feishu" | "custom";
  enabled: number;
  triggerEvents: string;
  maxRetries: number;
  retryIntervalSeconds: number;
  createdAt: string;
  updatedAt: string;
}

interface WebhookLog {
  id: number;
  webhookId: number;
  eventType: string;
  payload: string | null;
  response: string | null;
  statusCode: number | null;
  success: number;
  errorMessage: string | null;
  sentAt: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  retryStatus: string;
  // Computed compat fields
  requestPayload?: string;
  responseStatus?: number;
  responseBody?: string;
  executionTimeMs?: number;
  status?: string;
  createdAt?: string;
}

// 事件类型选项
const EVENT_TYPES = [
  { value: "gate_check_pass", label: "Gate检查通过", icon: CheckCircle2, color: "text-green-500" },
  { value: "gate_check_conditional_pass", label: "Gate有条件通过", icon: AlertTriangle, color: "text-yellow-500" },
  { value: "gate_check_fail", label: "Gate检查不通过", icon: XCircle, color: "text-red-500" },
  { value: "ai_diagnosis_complete", label: "AI诊断完成", icon: MessageSquare, color: "text-blue-500" },
  { value: "risk_alert", label: "风险预警", icon: Bell, color: "text-orange-500" },
  { value: "issue_escalation", label: "问题升级", icon: AlertTriangle, color: "text-red-500" },
];

// Webhook类型选项
const WEBHOOK_TYPES = [
  { value: "wecom", label: "企业微信", icon: "🏢" },
  { value: "dingtalk", label: "钉钉", icon: "📌" },
  { value: "feishu", label: "飞书", icon: "🐦" },
  { value: "custom", label: "自定义", icon: "⚙️" },
];

export default function WebhookSettings() {
  const { t } = useLanguage();
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState("webhooks");

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    webhookUrl: "",
    webhookType: "wecom" as "wecom" | "dingtalk" | "feishu" | "custom",
    enabled: true,
    triggerEvents: [] as string[],
    maxRetries: 3,
    retryIntervalSeconds: 60,
  });

  // 获取Webhook列表
  const { data: webhooksRaw, isLoading, refetch } = trpc.webhook.list.useQuery();
  const webhooks = ((webhooksRaw as any)?.items || webhooksRaw || []) as WebhookConfig[];
  
  // 获取Webhook日志
  const { data: logs, isLoading: logsLoading } = trpc.webhook.getLogs.useQuery(
    { webhookId: selectedWebhook?.id, limit: 50 },
    { enabled: !!selectedWebhook }
  );

  // 创建Webhook
  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook创建成功");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新Webhook
  const updateMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook更新成功");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除Webhook
  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 测试Webhook
  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (result) => {
      setTestResult({ success: result.success, message: result.response?.message || '' });
    },
    onError: (error) => {
      setTestResult({ success: false, message: error.message });
    },
  });

  // 切换启用状态
  const toggleMutation = trpc.webhook.toggle.useMutation({
    onSuccess: () => {
      toast.success("状态已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 导入预设模板
  const importMutation = trpc.webhook.seedDefaultWebhooks.useMutation({
    onSuccess: (result) => {
      toast.success(`成功导入 ${(result as any).imported} 个Webhook模板`);
      refetch();
    },
    onError: (error) => {
      toast.error(`导入失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      webhookUrl: "",
      webhookType: "wecom",
      enabled: true,
      triggerEvents: [],
      maxRetries: 3,
      retryIntervalSeconds: 60,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      ...formData,
      triggerEvents: JSON.stringify(formData.triggerEvents),
      enabled: formData.enabled,
    } as any);
  };

  const handleUpdate = () => {
    if (!selectedWebhook) return;
    updateMutation.mutate({
      id: String(selectedWebhook.id),
      ...formData,
      triggerEvents: JSON.stringify(formData.triggerEvents),
      enabled: formData.enabled,
    } as any);
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      description: webhook.description || "",
      webhookUrl: webhook.webhookUrl,
      webhookType: webhook.webhookType,
      enabled: webhook.enabled === 1,
      triggerEvents: JSON.parse(webhook.triggerEvents || "[]"),
      maxRetries: webhook.maxRetries,
      retryIntervalSeconds: webhook.retryIntervalSeconds,
    });
    setIsEditDialogOpen(true);
  };

  const handleTest = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setTestResult(null);
    setIsTestDialogOpen(true);
  };

  const handleViewLogs = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setActiveTab("logs");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">成功</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">失败</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">等待中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWebhookTypeIcon = (type: string) => {
    const typeConfig = WEBHOOK_TYPES.find(t => t.value === type);
    return typeConfig?.icon || "⚙️";
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Webhook}
          title="Webhook通知配置"
          description="配置Gate检查结果和AI诊断通知推送到企业微信、钉钉等平台"
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  新增Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新增Webhook配置</DialogTitle>
                  <DialogDescription>
                    配置Webhook接收Gate检查结果和AI诊断通知
                  </DialogDescription>
                </DialogHeader>
                <WebhookForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleCreate}
                  isLoading={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          }
        />

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="webhooks" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Webhook配置
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="w-4 h-4" />
              发送日志
            </TabsTrigger>
          </TabsList>

          {/* Webhook列表 */}
          <TabsContent value="webhooks" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : webhooks && webhooks.length > 0 ? (
              <div className="grid gap-4">
                {webhooks.map((webhook: WebhookConfig) => (
                  <Card key={webhook.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getWebhookTypeIcon(webhook.webhookType)}</span>
                          <div>
                            <CardTitle className="text-lg">{webhook.name}</CardTitle>
                            <CardDescription>{webhook.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.enabled === 1}
                            onCheckedChange={(checked) => {
                              toggleMutation.mutate({ id: String(webhook.id), enabled: checked } as any);
                            }}
                          />
                          <Badge variant={webhook.enabled === 1 ? "default" : "secondary"}>
                            {webhook.enabled === 1 ? "已启用" : "已禁用"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono bg-muted px-2 py-1 rounded text-xs truncate max-w-md">
                            {webhook.webhookUrl}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(webhook.triggerEvents || "[]").map((event: string) => {
                            const eventConfig = EVENT_TYPES.find(e => e.value === event);
                            return (
                              <Badge key={event} variant="outline" className="gap-1">
                                {eventConfig && <eventConfig.icon className={`w-3 h-3 ${eventConfig.color}`} />}
                                {eventConfig?.label || event}
                              </Badge>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(webhook)}>
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleTest(webhook)}>
                            <TestTube className="w-4 h-4 mr-1" />
                            测试
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewLogs(webhook)}>
                            <History className="w-4 h-4 mr-1" />
                            日志
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (confirm("确定要删除此Webhook吗？")) {
                                deleteMutation.mutate({ id: String(webhook.id) } as any);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Webhook className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无Webhook配置</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    添加Webhook配置以接收Gate检查结果和AI诊断通知
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      新增Webhook
                    </Button>
                    <Button variant="outline" onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                      {importMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      导入预设模板
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 发送日志 */}
          <TabsContent value="logs" className="space-y-4">
            {selectedWebhook && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{getWebhookTypeIcon(selectedWebhook.webhookType)}</span>
                <span className="font-medium">{selectedWebhook.name}</span>
                <span className="text-muted-foreground">的发送日志</span>
              </div>
            )}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>事件类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>响应码</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead>错误信息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : logs && logs.length > 0 ? (
                    logs.map((log: WebhookLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt as any).toLocaleString("zh-CN")}
                        </TableCell>
                        <TableCell>
                          {EVENT_TYPES.find(e => e.value === log.eventType)?.label || log.eventType}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status!)}</TableCell>
                        <TableCell>{log.responseStatus}</TableCell>
                        <TableCell>{log.executionTimeMs}ms</TableCell>
                        <TableCell className="text-red-500 text-sm max-w-xs truncate">
                          {log.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无发送日志
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 编辑对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑Webhook配置</DialogTitle>
              <DialogDescription>
                修改Webhook配置信息
              </DialogDescription>
            </DialogHeader>
            <WebhookForm 
              formData={formData} 
              setFormData={setFormData}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* 测试对话框 */}
        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>测试Webhook连接</DialogTitle>
              <DialogDescription>
                发送测试消息验证Webhook配置是否正确
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedWebhook && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedWebhook.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {selectedWebhook.webhookUrl}
                  </p>
                </div>
              )}
              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.success ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={testResult.success ? "text-green-500" : "text-red-500"}>
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                关闭
              </Button>
              <Button 
                onClick={() => selectedWebhook && testMutation.mutate({ id: String(selectedWebhook.id) } as any)}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    发送测试消息
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}

// Webhook URL格式验证函数
function validateWebhookUrl(url: string, type: string): { valid: boolean; message: string } {
  if (!url) {
    return { valid: false, message: "请输入Webhook URL" };
  }

  try {
    const urlObj = new URL(url);
    
    // 基本协议检查
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, message: "必须使用HTTP或HTTPS协议" };
    }

    // 根据类型验证URL格式
    switch (type) {
      case 'wecom':
        // 企业微信: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
        if (!url.includes('qyapi.weixin.qq.com') && !url.includes('webhook')) {
          return { valid: false, message: "企业微信Webhook URL格式不正确，应包含qyapi.weixin.qq.com" };
        }
        if (!urlObj.searchParams.has('key')) {
          return { valid: false, message: "企业微信Webhook URL缺少key参数" };
        }
        break;
      case 'dingtalk':
        // 钉钉: https://oapi.dingtalk.com/robot/send?access_token=xxx
        if (!url.includes('oapi.dingtalk.com') && !url.includes('dingtalk')) {
          return { valid: false, message: "钉钉Webhook URL格式不正确，应包含oapi.dingtalk.com" };
        }
        if (!urlObj.searchParams.has('access_token')) {
          return { valid: false, message: "钉钉Webhook URL缺少access_token参数" };
        }
        break;
      case 'feishu':
        // 飞书: https://open.feishu.cn/open-apis/bot/v2/hook/xxx
        if (!url.includes('feishu.cn') && !url.includes('larksuite.com')) {
          return { valid: false, message: "飞书Webhook URL格式不正确，应包含feishu.cn或larksuite.com" };
        }
        break;
      case 'custom':
        // 自定义类型只检查基本URL格式
        break;
    }

    return { valid: true, message: "URL格式正确" };
  } catch (e) {
    return { valid: false, message: "URL格式无效" };
  }
}

// 获取URL示例
function getUrlPlaceholder(type: string): string {
  switch (type) {
    case 'wecom':
      return 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    case 'dingtalk':
      return 'https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    case 'feishu':
      return 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    default:
      return 'https://your-webhook-endpoint.com/webhook';
  }
}

// Webhook表单组件
function WebhookForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  isLoading 
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  const [urlValidation, setUrlValidation] = useState<{ valid: boolean; message: string } | null>(null);

  // URL变化时验证
  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, webhookUrl: url });
    if (url) {
      const validation = validateWebhookUrl(url, formData.webhookType);
      setUrlValidation(validation);
    } else {
      setUrlValidation(null);
    }
  };

  // 类型变化时重新验证URL
  const handleTypeChange = (type: string) => {
    setFormData({ ...formData, webhookType: type });
    if (formData.webhookUrl) {
      const validation = validateWebhookUrl(formData.webhookUrl, type);
      setUrlValidation(validation);
    }
  };

  const toggleEvent = (event: string) => {
    const events = formData.triggerEvents.includes(event)
      ? formData.triggerEvents.filter((e: string) => e !== event)
      : [...formData.triggerEvents, event];
    setFormData({ ...formData, triggerEvents: events });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>名称 *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例如：项目群通知"
          />
        </div>
        <div className="space-y-2">
          <Label>类型 *</Label>
          <Select
            value={formData.webhookType}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEBHOOK_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    {type.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Webhook URL *</Label>
        <Input
          value={formData.webhookUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder={getUrlPlaceholder(formData.webhookType)}
          className={urlValidation ? (urlValidation.valid ? "border-green-500" : "border-red-500") : ""}
        />
        {urlValidation && (
          <p className={`text-xs ${urlValidation.valid ? "text-green-500" : "text-red-500"}`}>
            {urlValidation.valid ? "✓ " : "✗ "}{urlValidation.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          企业微信/钉钉/飞书群机器人的Webhook地址
        </p>
      </div>

      <div className="space-y-2">
        <Label>描述</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="用于接收项目Gate检查结果通知"
        />
      </div>

      <div className="space-y-2">
        <Label>触发事件</Label>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_TYPES.map((event) => (
            <div
              key={event.value}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.triggerEvents.includes(event.value)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => toggleEvent(event.value)}
            >
              <event.icon className={`w-4 h-4 ${event.color}`} />
              <span className="text-sm">{event.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>最大重试次数</Label>
          <Input
            type="number"
            value={formData.maxRetries}
            onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) })}
            min={0}
            max={10}
          />
        </div>
        <div className="space-y-2">
          <Label>重试间隔（秒）</Label>
          <Input
            type="number"
            value={formData.retryIntervalSeconds}
            onChange={(e) => setFormData({ ...formData, retryIntervalSeconds: parseInt(e.target.value) })}
            min={10}
            max={3600}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
        />
        <Label>启用此Webhook</Label>
      </div>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={isLoading || !formData.name || !formData.webhookUrl}>
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </div>
  );
}
