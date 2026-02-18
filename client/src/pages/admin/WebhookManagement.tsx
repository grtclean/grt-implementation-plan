/**
 * Webhook管理页面
 * 配置社群Bridge、告警通知、ERP回调等Webhook端点
 */
import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Webhook, Plus, TestTube, History, CheckCircle, XCircle, Clock, Loader2, Copy, Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";

// 模拟Webhook数据（实际应从后端获取）
const mockWebhooks = [
  {
    id: 1,
    name: "企业微信社群Bridge",
    type: "social_bridge",
    url: "https://api.weixin.qq.com/cgi-bin/webhook/send",
    secret: "wechat_secret_xxx",
    isActive: true,
    lastTriggered: "2025-01-31T10:30:00Z",
    lastStatus: "success",
    triggerCount: 156
  },
  {
    id: 2,
    name: "飞书消息通知",
    type: "social_bridge",
    url: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
    secret: "feishu_secret_xxx",
    isActive: true,
    lastTriggered: "2025-01-31T09:15:00Z",
    lastStatus: "success",
    triggerCount: 89
  },
  {
    id: 3,
    name: "安全告警通知",
    type: "alert",
    url: "https://alert.company.com/webhook/security",
    secret: "alert_secret_xxx",
    isActive: true,
    lastTriggered: "2025-01-30T14:22:00Z",
    lastStatus: "failed",
    triggerCount: 23
  },
  {
    id: 4,
    name: "SAP订单回调",
    type: "erp_callback",
    url: "https://sap.company.com/api/callback",
    secret: "sap_callback_xxx",
    isActive: false,
    lastTriggered: null,
    lastStatus: null,
    triggerCount: 0
  }
];

const mockLogs = [
  { id: 1, webhookId: 1, timestamp: "2025-01-31T10:30:00Z", status: "success", responseCode: 200, duration: 156 },
  { id: 2, webhookId: 1, timestamp: "2025-01-31T10:25:00Z", status: "success", responseCode: 200, duration: 142 },
  { id: 3, webhookId: 3, timestamp: "2025-01-30T14:22:00Z", status: "failed", responseCode: 500, duration: 3000 },
  { id: 4, webhookId: 2, timestamp: "2025-01-31T09:15:00Z", status: "success", responseCode: 200, duration: 89 }
];

export default function WebhookManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<number | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [webhooks, setWebhooks] = useState(mockWebhooks);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    type: "social_bridge" as "social_bridge" | "alert" | "erp_callback" | "custom",
    url: "",
    secret: "",
    headers: ""
  });
  const [testPayload, setTestPayload] = useState('{\n  "event": "test",\n  "message": "Hello from GRT System"\n}');

  const handleCreateWebhook = () => {
    const newId = Math.max(...webhooks.map(w => w.id)) + 1;
    setWebhooks([...webhooks, {
      id: newId,
      name: newWebhook.name,
      type: newWebhook.type,
      url: newWebhook.url,
      secret: newWebhook.secret,
      isActive: true,
      lastTriggered: null,
      lastStatus: null,
      triggerCount: 0
    }]);
    toast.success("Webhook创建成功");
    setIsAddDialogOpen(false);
    setNewWebhook({ name: "", type: "social_bridge", url: "", secret: "", headers: "" });
  };

  const handleTestWebhook = (id: number) => {
    toast.info("正在发送测试请求...");
    setTimeout(() => {
      toast.success("测试请求发送成功，响应码: 200");
    }, 1000);
  };

  const handleToggleActive = (id: number) => {
    setWebhooks(webhooks.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ));
    toast.success("状态已更新");
  };

  const handleDeleteWebhook = (id: number) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    toast.success("Webhook已删除");
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      social_bridge: { label: "社群Bridge", className: "bg-blue-500" },
      alert: { label: "告警通知", className: "bg-red-500" },
      erp_callback: { label: "ERP回调", className: "bg-orange-500" },
      custom: { label: "自定义", className: "bg-gray-500" }
    };
    const c = config[type] || config.custom;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />未触发</Badge>;
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />成功</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Webhook}
        title="Webhook管理"
        description="配置社群Bridge、告警通知、ERP回调等Webhook端点"
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                添加Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>添加Webhook</DialogTitle>
                <DialogDescription>配置新的Webhook端点</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input
                    placeholder="例如：企业微信通知"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select
                    value={newWebhook.type}
                    onValueChange={(value: any) => setNewWebhook({ ...newWebhook, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social_bridge">社群Bridge</SelectItem>
                      <SelectItem value="alert">告警通知</SelectItem>
                      <SelectItem value="erp_callback">ERP回调</SelectItem>
                      <SelectItem value="custom">自定义</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>密钥 (可选)</Label>
                  <Input
                    type="password"
                    placeholder="用于签名验证"
                    value={newWebhook.secret}
                    onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>自定义Headers (JSON格式，可选)</Label>
                  <Textarea
                    placeholder='{"Authorization": "Bearer xxx"}'
                    value={newWebhook.headers}
                    onChange={(e) => setNewWebhook({ ...newWebhook, headers: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
                <Button onClick={handleCreateWebhook}>创建</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Webhook} label="总Webhook数" value={webhooks.length} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={CheckCircle} label="已启用" value={webhooks.filter(w => w.isActive).length} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={RefreshCw} label="总触发次数" value={webhooks.reduce((sum, w) => sum + w.triggerCount, 0)} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={XCircle} label="最近失败" value={webhooks.filter(w => w.lastStatus === "failed").length} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      {/* Webhook列表 */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="social_bridge">社群Bridge</TabsTrigger>
          <TabsTrigger value="alert">告警通知</TabsTrigger>
          <TabsTrigger value="erp_callback">ERP回调</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{webhook.name}</CardTitle>
                      {getTypeBadge(webhook.type)}
                      {webhook.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">已启用</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400">已禁用</Badge>
                      )}
                    </div>
                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={() => handleToggleActive(webhook.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">URL:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs flex-1 truncate">{webhook.url}</code>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(webhook.url)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">密钥:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {showSecrets[webhook.id] ? webhook.secret : "••••••••••••"}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => setShowSecrets({ ...showSecrets, [webhook.id]: !showSecrets[webhook.id] })}>
                        {showSecrets[webhook.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-muted-foreground">
                        {webhook.lastTriggered ? (
                          <span>
                            上次触发: {new Date(webhook.lastTriggered).toLocaleString()} 
                            <span className="ml-2">{getStatusBadge(webhook.lastStatus)}</span>
                            <span className="ml-2">共 {webhook.triggerCount} 次</span>
                          </span>
                        ) : (
                          <span>尚未触发</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleTestWebhook(webhook.id)}>
                          <TestTube className="w-4 h-4 mr-1" />
                          测试
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedWebhook(webhook.id)}>
                          <History className="w-4 h-4 mr-1" />
                          日志
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteWebhook(webhook.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {["social_bridge", "alert", "erp_callback"].map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <div className="grid gap-4">
              {webhooks.filter(w => w.type === type).map((webhook) => (
                <Card key={webhook.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{webhook.name}</CardTitle>
                        {webhook.isActive ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">已启用</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400">已禁用</Badge>
                        )}
                      </div>
                      <Switch
                        checked={webhook.isActive}
                        onCheckedChange={() => handleToggleActive(webhook.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground truncate">{webhook.url}</div>
                  </CardContent>
                </Card>
              ))}
              {webhooks.filter(w => w.type === type).length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Webhook className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暂无此类型的Webhook</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* 调用日志对话框 */}
      {selectedWebhook && (
        <Dialog open={!!selectedWebhook} onOpenChange={() => setSelectedWebhook(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>调用日志</DialogTitle>
              <DialogDescription>
                {webhooks.find(w => w.id === selectedWebhook)?.name} 的最近调用记录
              </DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>响应码</TableHead>
                  <TableHead>耗时(ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLogs.filter(l => l.webhookId === selectedWebhook).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>{log.responseCode}</TableCell>
                    <TableCell>{log.duration}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
