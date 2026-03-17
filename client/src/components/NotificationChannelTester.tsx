/**
 * 通知渠道测试组件
 * 用于测试各种通知渠道的配置是否正确
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Bell, Mail, Webhook, MessageSquare, Play, Clock } from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  channel: string;
  success: boolean;
  message: string;
  responseTime?: number;
  errorDetails?: string;
  testedAt: Date;
}

export default function NotificationChannelTester() {
  const [activeTab, setActiveTab] = useState("system");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  // 邮件配置
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("告警通知测试");
  
  // Webhook配置
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookMethod, setWebhookMethod] = useState<"GET" | "POST">("POST");
  
  // 企业微信配置
  const [wechatWebhookUrl, setWechatWebhookUrl] = useState("");
  const [wechatMentions, setWechatMentions] = useState("");

  // 测试系统通知
  const testSystemMutation = (trpc.notificationChannelTest as any).testSystem.useMutation({
    onSuccess: (result: any) => {
      addTestResult(result);
      if (result.success) {
        toast.success("系统通知测试成功");
      } else {
        toast.error(`系统通知测试失败: ${result.message}`);
      }
    },
    onError: (error: any) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  // 测试邮件通知
  const testEmailMutation = (trpc.notificationChannelTest as any).testEmail.useMutation({
    onSuccess: (result: any) => {
      addTestResult(result);
      if (result.success) {
        toast.success("邮件通知测试成功");
      } else {
        toast.error(`邮件通知测试失败: ${result.message}`);
      }
    },
    onError: (error: any) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  // 测试Webhook通知
  const testWebhookMutation = (trpc.notificationChannelTest as any).testWebhook.useMutation({
    onSuccess: (result: any) => {
      addTestResult(result);
      if (result.success) {
        toast.success("Webhook测试成功");
      } else {
        toast.error(`Webhook测试失败: ${result.message}`);
      }
    },
    onError: (error: any) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  // 测试企业微信通知
  const testWechatMutation = (trpc.notificationChannelTest as any).testWechat.useMutation({
    onSuccess: (result: any) => {
      addTestResult(result);
      if (result.success) {
        toast.success("企业微信通知测试成功");
      } else {
        toast.error(`企业微信通知测试失败: ${result.message}`);
      }
    },
    onError: (error: any) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  const addTestResult = (result: TestResult) => {
    setTestResults((prev) => [result, ...prev].slice(0, 20));
  };

  const handleTestSystem = () => {
    testSystemMutation.mutate();
  };

  const handleTestEmail = () => {
    if (!emailTo) {
      toast.error("请输入收件人邮箱");
      return;
    }
    testEmailMutation.mutate({ to: emailTo, subject: emailSubject });
  };

  const handleTestWebhook = () => {
    if (!webhookUrl) {
      toast.error("请输入Webhook URL");
      return;
    }
    testWebhookMutation.mutate({ url: webhookUrl, method: webhookMethod });
  };

  const handleTestWechat = () => {
    if (!wechatWebhookUrl) {
      toast.error("请输入企业微信Webhook URL");
      return;
    }
    const mentions = wechatMentions
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    testWechatMutation.mutate({ webhookUrl: wechatWebhookUrl, mentions });
  };

  const isLoading =
    testSystemMutation.isPending ||
    testEmailMutation.isPending ||
    testWebhookMutation.isPending ||
    testWechatMutation.isPending;

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "system":
        return <Bell className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "webhook":
        return <Webhook className="w-4 h-4" />;
      case "wechat":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getChannelName = (channel: string) => {
    switch (channel) {
      case "system":
        return "系统通知";
      case "email":
        return "邮件";
      case "webhook":
        return "Webhook";
      case "wechat":
        return "企业微信";
      default:
        return channel;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            通知渠道测试
          </CardTitle>
          <CardDescription>
            测试各种通知渠道的配置是否正确，确保告警能够正常发送
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                系统通知
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                邮件
              </TabsTrigger>
              <TabsTrigger value="webhook" className="flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Webhook
              </TabsTrigger>
              <TabsTrigger value="wechat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                企业微信
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  系统通知将发送给项目所有者，无需额外配置。
                </p>
              </div>
              <Button
                onClick={handleTestSystem}
                disabled={isLoading}
                className="w-full"
              >
                {testSystemMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                发送测试通知
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailTo">收件人邮箱 *</Label>
                  <Input
                    id="emailTo"
                    type="email"
                    placeholder="admin@example.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailSubject">邮件主题</Label>
                  <Input
                    id="emailSubject"
                    placeholder="告警通知测试"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleTestEmail}
                disabled={isLoading || !emailTo}
                className="w-full"
              >
                {testEmailMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                发送测试邮件
              </Button>
            </TabsContent>

            <TabsContent value="webhook" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL *</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    placeholder="https://api.example.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>请求方法</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={webhookMethod === "POST" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWebhookMethod("POST")}
                    >
                      POST
                    </Button>
                    <Button
                      variant={webhookMethod === "GET" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWebhookMethod("GET")}
                    >
                      GET
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleTestWebhook}
                disabled={isLoading || !webhookUrl}
                className="w-full"
              >
                {testWebhookMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                发送测试请求
              </Button>
            </TabsContent>

            <TabsContent value="wechat" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wechatWebhookUrl">企业微信Webhook URL *</Label>
                  <Input
                    id="wechatWebhookUrl"
                    type="url"
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                    value={wechatWebhookUrl}
                    onChange={(e) => setWechatWebhookUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wechatMentions">@提醒人员（逗号分隔）</Label>
                  <Input
                    id="wechatMentions"
                    placeholder="@all 或 user1,user2"
                    value={wechatMentions}
                    onChange={(e) => setWechatMentions(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleTestWechat}
                disabled={isLoading || !wechatWebhookUrl}
                className="w-full"
              >
                {testWechatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                发送测试消息
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 测试结果历史 */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">测试结果历史</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div className="flex items-center gap-2">
                        {getChannelIcon(result.channel)}
                        <span className="font-medium">
                          {getChannelName(result.channel)}
                        </span>
                      </div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "成功" : "失败"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {result.responseTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {result.responseTime}ms
                        </span>
                      )}
                      <span>
                        {new Date(result.testedAt).toLocaleTimeString("zh-CN")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm">{result.message}</p>
                  {result.errorDetails && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      错误详情: {result.errorDetails}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
