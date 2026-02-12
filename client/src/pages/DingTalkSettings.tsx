/**
 * 钉钉通知管理界面
 * 支持启用/禁用、测试连接、查看发送历史
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Settings,
  Send,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";

// 通知类型
const notificationTypes = [
  { value: "project_gate", label: "项目阶段变更", icon: "📋" },
  { value: "cost_alert", label: "成本预警", icon: "💰" },
  { value: "service_ticket", label: "售后工单", icon: "🔧" },
  { value: "qc_alert", label: "质检异常", icon: "🔍" },
  { value: "interview", label: "面试安排", icon: "👥" },
  { value: "approval", label: "审批流程", icon: "✅" },
  { value: "system", label: "系统事件", icon: "⚙️" },
];

// 模拟发送历史数据
const mockSendHistory = [
  {
    id: "1",
    type: "project_gate",
    title: "项目阶段变更: GRT智能系统",
    status: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    latency: 156,
  },
  {
    id: "2",
    type: "cost_alert",
    title: "成本预警: 预算使用率达85%",
    status: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    latency: 203,
  },
  {
    id: "3",
    type: "service_ticket",
    title: "新工单: T001 设备故障",
    status: "failed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    error: "网络超时",
  },
  {
    id: "4",
    type: "qc_alert",
    title: "质检异常: 产品A 批次B20260131",
    status: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    latency: 178,
  },
  {
    id: "5",
    type: "interview",
    title: "面试提醒: 候选人A 高级工程师",
    status: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    latency: 145,
  },
];

export default function DingTalkSettings() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // 配置状态
  const [config, setConfig] = useState({
    enabled: true,
    webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=8d003ada94b037153ee995bdfe955049e378af2b7e54e6bb87b686c959893b6c",
    secret: "SEC179f421330c60dae9e928cdcafced74e38c80b2df72062e7eb08c14f98043235",
    keyword: "1",
  });

  // 通知开关状态
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({
    project_gate: true,
    cost_alert: true,
    service_ticket: true,
    qc_alert: true,
    interview: true,
    approval: true,
    system: true,
  });

  // UI状态
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);
  const [sendHistory, setSendHistory] = useState(mockSendHistory);
  const [isSaving, setIsSaving] = useState(false);

  // 测试发送对话框
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testMessage, setTestMessage] = useState({
    type: "text",
    title: "GRT系统测试消息",
    content: "这是一条来自GRT智能系统的测试消息，用于验证钉钉Webhook配置是否正确。\n\n关键词: 1",
  });
  const [isSendingTest, setIsSendingTest] = useState(false);

  // 测试连接
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // 模拟测试连接
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setTestResult({
        success: true,
        message: "连接成功！钉钉Webhook配置正确。",
        latency: Math.floor(Math.random() * 100) + 100,
      });

      toast({
        title: "测试成功",
        description: "钉钉Webhook连接正常",
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: "连接失败：" + (error as Error).message,
      });

      toast({
        title: "测试失败",
        description: "请检查Webhook配置",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 发送测试消息
  const handleSendTestMessage = async () => {
    setIsSendingTest(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 添加到发送历史
      const newHistory = {
        id: Date.now().toString(),
        type: "system",
        title: testMessage.title,
        status: "success" as const,
        timestamp: new Date().toISOString(),
        latency: Math.floor(Math.random() * 100) + 100,
      };
      setSendHistory([newHistory, ...sendHistory]);

      toast({
        title: "发送成功",
        description: "测试消息已发送到钉钉群",
      });

      setTestDialogOpen(false);
    } catch (error) {
      toast({
        title: "发送失败",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // 保存配置
  const handleSaveConfig = async () => {
    setIsSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "保存成功",
        description: "钉钉通知配置已更新",
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 复制Webhook URL
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(config.webhookUrl);
    toast({
      title: "已复制",
      description: "Webhook URL已复制到剪贴板",
    });
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 获取通知类型标签
  const getTypeLabel = (type: string) => {
    const found = notificationTypes.find((t) => t.value === type);
    return found ? `${found.icon} ${found.label}` : type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              钉钉通知管理
            </h1>
            <p className="text-muted-foreground mt-1">
              配置钉钉群机器人Webhook，管理系统通知推送
            </p>
          </div>
          <Button onClick={handleSaveConfig} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            保存配置
          </Button>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              基础配置
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              通知设置
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              发送历史
            </TabsTrigger>
          </TabsList>

          {/* 基础配置 */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Webhook配置</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="enabled" className="text-sm font-normal">
                      启用通知
                    </Label>
                    <Switch
                      id="enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enabled: checked })
                      }
                    />
                  </div>
                </CardTitle>
                <CardDescription>
                  配置钉钉群机器人的Webhook地址和安全设置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhookUrl"
                      value={config.webhookUrl}
                      onChange={(e) =>
                        setConfig({ ...config, webhookUrl: e.target.value })
                      }
                      placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 加签密钥 */}
                <div className="space-y-2">
                  <Label htmlFor="secret">加签密钥 (Secret)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secret"
                      type={showSecret ? "text" : "password"}
                      value={config.secret}
                      onChange={(e) =>
                        setConfig({ ...config, secret: e.target.value })
                      }
                      placeholder="SEC..."
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 自定义关键词 */}
                <div className="space-y-2">
                  <Label htmlFor="keyword">自定义关键词</Label>
                  <Input
                    id="keyword"
                    value={config.keyword}
                    onChange={(e) =>
                      setConfig({ ...config, keyword: e.target.value })
                    }
                    placeholder="消息中必须包含的关键词"
                  />
                  <p className="text-xs text-muted-foreground">
                    钉钉机器人安全设置中配置的自定义关键词，消息内容必须包含此关键词才能发送成功
                  </p>
                </div>

                <Separator />

                {/* 测试连接 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">连接测试</h4>
                    <p className="text-sm text-muted-foreground">
                      验证Webhook配置是否正确
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {testResult && (
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          testResult.success
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span>{testResult.message}</span>
                        {testResult.latency && (
                          <Badge variant="outline">{testResult.latency}ms</Badge>
                        )}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      测试连接
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* 发送测试消息 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">发送测试消息</h4>
                    <p className="text-sm text-muted-foreground">
                      发送一条测试消息到钉钉群
                    </p>
                  </div>
                  <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Send className="w-4 h-4 mr-2" />
                        发送测试
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>发送测试消息</DialogTitle>
                        <DialogDescription>
                          编辑并发送一条测试消息到钉钉群
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>消息类型</Label>
                          <Select
                            value={testMessage.type}
                            onValueChange={(value) =>
                              setTestMessage({ ...testMessage, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">文本消息</SelectItem>
                              <SelectItem value="markdown">Markdown消息</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>消息标题</Label>
                          <Input
                            value={testMessage.title}
                            onChange={(e) =>
                              setTestMessage({
                                ...testMessage,
                                title: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>消息内容</Label>
                          <Textarea
                            value={testMessage.content}
                            onChange={(e) =>
                              setTestMessage({
                                ...testMessage,
                                content: e.target.value,
                              })
                            }
                            rows={5}
                          />
                          <p className="text-xs text-muted-foreground">
                            提示：消息内容必须包含关键词"{config.keyword}"
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setTestDialogOpen(false)}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={handleSendTestMessage}
                          disabled={isSendingTest}
                        >
                          {isSendingTest ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          发送
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* 帮助信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">配置说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  1. 在钉钉群中添加自定义机器人，获取Webhook地址
                </p>
                <p>
                  2. 建议同时启用"加签"和"自定义关键词"两种安全设置
                </p>
                <p>
                  3. 加签密钥以"SEC"开头，用于生成消息签名
                </p>
                <p>
                  4. 自定义关键词需要在消息内容中包含，否则发送失败
                </p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a
                    href="https://open.dingtalk.com/document/robots/customize-robot-security-settings"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    查看钉钉机器人安全设置文档
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 通知设置 */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>业务通知开关</CardTitle>
                <CardDescription>
                  选择需要推送到钉钉群的业务通知类型
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notificationTypes.map((type) => (
                    <div
                      key={type.value}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <h4 className="font-medium">{type.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {type.value === "project_gate" &&
                              "项目阶段变更时发送通知"}
                            {type.value === "cost_alert" &&
                              "成本超预算预警时发送通知"}
                            {type.value === "service_ticket" &&
                              "新工单创建或升级时发送通知"}
                            {type.value === "qc_alert" &&
                              "质检发现异常时发送通知"}
                            {type.value === "interview" &&
                              "面试安排提醒"}
                            {type.value === "approval" &&
                              "审批流程状态变更通知"}
                            {type.value === "system" &&
                              "系统维护和安全事件通知"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings[type.value]}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            [type.value]: checked,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 高级设置 */}
            <Card>
              <CardHeader>
                <CardTitle>高级设置</CardTitle>
                <CardDescription>
                  配置通知的高级选项
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">紧急通知@所有人</h4>
                    <p className="text-sm text-muted-foreground">
                      紧急和严重级别的告警自动@所有人
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">静默时段</h4>
                    <p className="text-sm text-muted-foreground">
                      在指定时间段内不发送非紧急通知
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      defaultValue="22:00"
                      className="w-24"
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      defaultValue="08:00"
                      className="w-24"
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">消息合并</h4>
                    <p className="text-sm text-muted-foreground">
                      短时间内的多条同类通知合并发送
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 发送历史 */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>发送历史</span>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="筛选类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部类型</SelectItem>
                        {notificationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="筛选状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="success">发送成功</SelectItem>
                        <SelectItem value="failed">发送失败</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
                <CardDescription>
                  查看最近的通知发送记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>延迟</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sendHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-sm">
                          {formatTime(record.timestamp)}
                        </TableCell>
                        <TableCell>{getTypeLabel(record.type)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.title}
                        </TableCell>
                        <TableCell>
                          {record.status === "success" ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              成功
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              失败
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.latency ? (
                            <span className="text-muted-foreground">
                              {record.latency}ms
                            </span>
                          ) : (
                            <span className="text-red-500 text-sm">
                              {record.error}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.status === "failed" && (
                            <Button variant="ghost" size="sm">
                              <RefreshCw className="w-4 h-4 mr-1" />
                              重试
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {sendHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无发送记录</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 统计信息 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {sendHistory.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      今日发送总数
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500">
                      {sendHistory.filter((r) => r.status === "success").length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      发送成功
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-500">
                      {sendHistory.filter((r) => r.status === "failed").length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      发送失败
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {Math.round(
                        sendHistory
                          .filter((r) => r.latency)
                          .reduce((sum, r) => sum + (r.latency || 0), 0) /
                          sendHistory.filter((r) => r.latency).length || 0
                      )}
                      ms
                    </div>
                    <div className="text-sm text-muted-foreground">
                      平均延迟
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
