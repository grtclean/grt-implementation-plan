/**
 * 钉钉通知管理界面
 * 支持启用/禁用、测试连接、查看发送历史
 */

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { PageHeader } from "@/components/grt";

// 通知类型
const notificationTypes = [
  { value: "project_gate", labelKey: "admin.dingtalk.typeProjectGate", descKey: "admin.dingtalk.descProjectGate", icon: "📋" },
  { value: "cost_alert", labelKey: "admin.dingtalk.typeCostAlert", descKey: "admin.dingtalk.descCostAlert", icon: "💰" },
  { value: "service_ticket", labelKey: "admin.dingtalk.typeServiceTicket", descKey: "admin.dingtalk.descServiceTicket", icon: "🔧" },
  { value: "qc_alert", labelKey: "admin.dingtalk.typeQcAlert", descKey: "admin.dingtalk.descQcAlert", icon: "🔍" },
  { value: "interview", labelKey: "admin.dingtalk.typeInterview", descKey: "admin.dingtalk.descInterview", icon: "👥" },
  { value: "approval", labelKey: "admin.dingtalk.typeApproval", descKey: "admin.dingtalk.descApproval", icon: "✅" },
  { value: "system", labelKey: "admin.dingtalk.typeSystem", descKey: "admin.dingtalk.descSystem", icon: "⚙️" },
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
  const { t, tpl } = useLanguage();
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
        message: t("admin.dingtalk.connectionSuccess"),
        latency: Math.floor(Math.random() * 100) + 100,
      });

      toast({
        title: t("admin.dingtalk.testSuccessTitle"),
        description: t("admin.dingtalk.testSuccessDesc"),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: t("admin.dingtalk.connectionFailed") + (error as Error).message,
      });

      toast({
        title: t("admin.dingtalk.testFailedTitle"),
        description: t("admin.dingtalk.testFailedDesc"),
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
        title: t("admin.dingtalk.sendSuccessTitle"),
        description: t("admin.dingtalk.sendSuccessDesc"),
      });

      setTestDialogOpen(false);
    } catch (error) {
      toast({
        title: t("admin.dingtalk.sendFailedTitle"),
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Save config
  const handleSaveConfig = async () => {
    setIsSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: t("admin.dingtalk.saveSuccessTitle"),
        description: t("admin.dingtalk.saveSuccessDesc"),
      });
    } catch (error) {
      toast({
        title: t("admin.dingtalk.saveFailedTitle"),
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
      title: t("admin.dingtalk.copied"),
      description: t("admin.dingtalk.copiedDesc"),
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
  const getTypeLabel = (typeVal: string) => {
    const found = notificationTypes.find((nt) => nt.value === typeVal);
    return found ? `${found.icon} ${t(found.labelKey)}` : typeVal;
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Bell}
          title={t("admin.dingtalk.title")}
          description={t("admin.dingtalk.description")}
          actions={
            <Button onClick={handleSaveConfig} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              {t("admin.dingtalk.saveConfig")}
            </Button>
          }
        />

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              {t("admin.dingtalk.tabConfig")}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              {t("admin.dingtalk.tabNotifications")}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              {t("admin.dingtalk.tabHistory")}
            </TabsTrigger>
          </TabsList>

          {/* 基础配置 */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t("admin.dingtalk.webhookConfig")}</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="enabled" className="text-sm font-normal">
                      {t("admin.dingtalk.enableNotify")}
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
                  {t("admin.dingtalk.webhookConfigDesc")}
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
                  <Label htmlFor="secret">{t("admin.dingtalk.signSecret")}</Label>
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
                  <Label htmlFor="keyword">{t("admin.dingtalk.customKeyword")}</Label>
                  <Input
                    id="keyword"
                    value={config.keyword}
                    onChange={(e) =>
                      setConfig({ ...config, keyword: e.target.value })
                    }
                    placeholder={t("admin.dingtalk.keywordPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("admin.dingtalk.keywordHelp")}
                  </p>
                </div>

                <Separator />

                {/* 测试连接 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t("admin.dingtalk.connectionTestLabel")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("admin.dingtalk.verifyConfig")}
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
                      {t("admin.dingtalk.testConnection")}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* 发送测试消息 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t("admin.dingtalk.sendTestLabel")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("admin.dingtalk.sendTestDesc")}
                    </p>
                  </div>
                  <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Send className="w-4 h-4 mr-2" />
                        {t("admin.dingtalk.sendTest")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("admin.dingtalk.sendTestTitle")}</DialogTitle>
                        <DialogDescription>
                          {t("admin.dingtalk.sendTestDialogDesc")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t("admin.dingtalk.msgType")}</Label>
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
                              <SelectItem value="text">{t("admin.dingtalk.msgTypeText")}</SelectItem>
                              <SelectItem value="markdown">{t("admin.dingtalk.msgTypeMarkdown")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("admin.dingtalk.msgTitle")}</Label>
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
                          <Label>{t("admin.dingtalk.msgContent")}</Label>
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
                            {tpl("admin.dingtalk.msgKeywordHint", { keyword: config.keyword })}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setTestDialogOpen(false)}
                        >
                          {t("admin.dingtalk.cancel")}
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
                          {t("admin.dingtalk.send")}
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
                <CardTitle className="text-base">{t("admin.dingtalk.configGuide")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{t("admin.dingtalk.guide1")}</p>
                <p>{t("admin.dingtalk.guide2")}</p>
                <p>{t("admin.dingtalk.guide3")}</p>
                <p>{t("admin.dingtalk.guide4")}</p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a
                    href="https://open.dingtalk.com/document/robots/customize-robot-security-settings"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {t("admin.dingtalk.viewDocs")}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 通知设置 */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.dingtalk.businessNotify")}</CardTitle>
                <CardDescription>
                  {t("admin.dingtalk.businessNotifyDesc")}
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
                          <h4 className="font-medium">{t(type.labelKey)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t(type.descKey)}
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
                <CardTitle>{t("admin.dingtalk.advancedSettings")}</CardTitle>
                <CardDescription>
                  {t("admin.dingtalk.advancedSettingsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t("admin.dingtalk.urgentAtAll")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("admin.dingtalk.urgentAtAllDesc")}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t("admin.dingtalk.silentPeriod")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("admin.dingtalk.silentPeriodDesc")}
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
                    <h4 className="font-medium">{t("admin.dingtalk.msgMerge")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("admin.dingtalk.msgMergeDesc")}
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
                  <span>{t("admin.dingtalk.sendHistory")}</span>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder={t("admin.dingtalk.filterType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("admin.dingtalk.allTypes")}</SelectItem>
                        {notificationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {t(type.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder={t("admin.dingtalk.filterStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("admin.dingtalk.allStatus")}</SelectItem>
                        <SelectItem value="success">{t("admin.dingtalk.statusSuccess")}</SelectItem>
                        <SelectItem value="failed">{t("admin.dingtalk.statusFailed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
                <CardDescription>
                  {t("admin.dingtalk.sendHistoryDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.dingtalk.thTime")}</TableHead>
                      <TableHead>{t("admin.dingtalk.thType")}</TableHead>
                      <TableHead>{t("admin.dingtalk.thTitle")}</TableHead>
                      <TableHead>{t("admin.dingtalk.thStatus")}</TableHead>
                      <TableHead>{t("admin.dingtalk.thLatency")}</TableHead>
                      <TableHead className="text-right">{t("admin.dingtalk.thAction")}</TableHead>
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
                              {t("admin.dingtalk.success")}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              {t("admin.dingtalk.failed")}
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
                              {t("admin.dingtalk.retry")}
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
                    <p>{t("admin.dingtalk.noHistory")}</p>
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
                      {t("admin.dingtalk.todayTotal")}
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
                      {t("admin.dingtalk.sendSuccessCount")}
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
                      {t("admin.dingtalk.sendFailedCount")}
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
                      {t("admin.dingtalk.avgLatency")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
