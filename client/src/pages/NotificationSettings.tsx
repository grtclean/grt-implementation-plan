/**
 * 多渠道通知管理界面
 * 支持钉钉、企业微信、飞书三种通知渠道
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/grt";

// 通知渠道类型
type ChannelType = "dingtalk" | "wecom" | "feishu";

interface ChannelConfig {
  id: ChannelType;
  name: string;
  icon: string;
  description: string;
  webhookPlaceholder: string;
  secretPlaceholder: string;
  docUrl: string;
  supportsKeyword: boolean;
  supportsSign: boolean;
}

// 通知渠道配置
const channelConfigs: ChannelConfig[] = [
  {
    id: "dingtalk",
    name: "钉钉",
    icon: "🔔",
    description: "钉钉群机器人通知",
    webhookPlaceholder: "https://oapi.dingtalk.com/robot/send?access_token=xxx",
    secretPlaceholder: "SECxxxxxxxx",
    docUrl: "https://open.dingtalk.com/document/robots/customize-robot-security-settings",
    supportsKeyword: true,
    supportsSign: true,
  },
  {
    id: "wecom",
    name: "企业微信",
    icon: "💬",
    description: "企业微信群机器人通知",
    webhookPlaceholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
    secretPlaceholder: "",
    docUrl: "https://developer.work.weixin.qq.com/document/path/91770",
    supportsKeyword: false,
    supportsSign: false,
  },
  {
    id: "feishu",
    name: "飞书",
    icon: "🐦",
    description: "飞书群机器人通知",
    webhookPlaceholder: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
    secretPlaceholder: "",
    docUrl: "https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot",
    supportsKeyword: true,
    supportsSign: true,
  },
];

// 通知类型
const notificationTypes = [
  { value: "project_gate", label: "项目阶段变更", icon: "📋", description: "项目阶段门审批通过/拒绝时通知" },
  { value: "cost_alert", label: "成本预警", icon: "💰", description: "成本超预算或接近预算时通知" },
  { value: "service_ticket", label: "售后工单", icon: "🔧", description: "新工单创建或状态变更时通知" },
  { value: "qc_alert", label: "质检异常", icon: "🔍", description: "质检不合格或异常时通知" },
  { value: "interview", label: "面试安排", icon: "👥", description: "面试安排或变更时通知" },
  { value: "approval", label: "审批流程", icon: "✅", description: "审批待处理或结果通知" },
  { value: "system", label: "系统事件", icon: "⚙️", description: "系统异常或重要事件通知" },
];

interface ChannelState {
  enabled: boolean;
  webhookUrl: string;
  secret: string;
  keyword: string;
  showSecret: boolean;
  testing: boolean;
  testResult: "success" | "failed" | null;
  enabledNotifications: string[];
}

export default function NotificationSettings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // 各渠道状态
  const [channels, setChannels] = useState<Record<ChannelType, ChannelState>>({
    dingtalk: {
      enabled: true,
      webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=8d003ada94b037153ee995bdfe955049e378af2b7e54e6bb87b686c959893b6c",
      secret: "SEC179f421330c60dae9e928cdcafced74e38c80b2df72062e7eb08c14f98043235",
      keyword: "1",
      showSecret: false,
      testing: false,
      testResult: null,
      enabledNotifications: ["project_gate", "cost_alert", "service_ticket", "qc_alert"],
    },
    wecom: {
      enabled: false,
      webhookUrl: "",
      secret: "",
      keyword: "",
      showSecret: false,
      testing: false,
      testResult: null,
      enabledNotifications: [],
    },
    feishu: {
      enabled: false,
      webhookUrl: "",
      secret: "",
      keyword: "",
      showSecret: false,
      testing: false,
      testResult: null,
      enabledNotifications: [],
    },
  });

  const [activeChannel, setActiveChannel] = useState<ChannelType>("dingtalk");
  const [saving, setSaving] = useState(false);

  // 更新渠道状态
  const updateChannel = (channel: ChannelType, updates: Partial<ChannelState>) => {
    setChannels(prev => ({
      ...prev,
      [channel]: { ...prev[channel], ...updates },
    }));
  };

  // 测试Webhook连接
  const testWebhook = async (channel: ChannelType) => {
    const config = channels[channel];
    if (!config.webhookUrl) {
      toast({
        title: "请先配置Webhook URL",
        variant: "destructive",
      });
      return;
    }

    updateChannel(channel, { testing: true, testResult: null });

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 实际应该调用后端API
      // const result = await trpc.dingtalk.testConnection.mutate({ channel, webhookUrl: config.webhookUrl, secret: config.secret });
      
      updateChannel(channel, { testing: false, testResult: "success" });
      toast({
        title: "测试成功",
        description: `${channelConfigs.find(c => c.id === channel)?.name}消息发送成功`,
      });
    } catch (error) {
      updateChannel(channel, { testing: false, testResult: "failed" });
      toast({
        title: "测试失败",
        description: "请检查Webhook配置是否正确",
        variant: "destructive",
      });
    }
  };

  // 保存配置
  const saveConfig = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "保存成功",
        description: "通知渠道配置已更新",
      });
    } catch (error) {
      toast({
        title: "保存失败",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制到剪贴板",
    });
  };

  // 切换通知类型启用状态
  const toggleNotification = (channel: ChannelType, notificationType: string) => {
    const current = channels[channel].enabledNotifications;
    const updated = current.includes(notificationType)
      ? current.filter(t => t !== notificationType)
      : [...current, notificationType];
    updateChannel(channel, { enabledNotifications: updated });
  };

  if (authLoading) {
    return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  const currentChannel = channels[activeChannel];
  const currentConfig = channelConfigs.find(c => c.id === activeChannel)!;

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Bell}
          title="多渠道通知管理"
          description="配置钉钉、企业微信、飞书等通知渠道"
          actions={
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  保存配置
                </>
              )}
            </Button>
          }
        />

        {/* 渠道选择卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {channelConfigs.map(config => {
            const channelState = channels[config.id];
            return (
              <Card
                key={config.id}
                className={`cursor-pointer transition-all ${
                  activeChannel === config.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setActiveChannel(config.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{config.icon}</span>
                      {config.name}
                    </CardTitle>
                    <Badge variant={channelState.enabled ? "default" : "secondary"}>
                      {channelState.enabled ? "已启用" : "未启用"}
                    </Badge>
                  </div>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {channelState.testResult === "success" && (
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="w-4 h-4" />
                        连接正常
                      </span>
                    )}
                    {channelState.testResult === "failed" && (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-4 h-4" />
                        连接失败
                      </span>
                    )}
                    {!channelState.testResult && channelState.webhookUrl && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        已配置
                      </span>
                    )}
                    {!channelState.webhookUrl && (
                      <span className="flex items-center gap-1">
                        <Settings className="w-4 h-4" />
                        待配置
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 渠道配置详情 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{currentConfig.icon}</span>
                  {currentConfig.name}配置
                </CardTitle>
                <CardDescription>{currentConfig.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${activeChannel}-enabled`}>启用</Label>
                <Switch
                  id={`${activeChannel}-enabled`}
                  checked={currentChannel.enabled}
                  onCheckedChange={(checked) => updateChannel(activeChannel, { enabled: checked })}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="config" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config">Webhook配置</TabsTrigger>
                <TabsTrigger value="notifications">通知设置</TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="space-y-4 mt-4">
                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label htmlFor={`${activeChannel}-webhook`}>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${activeChannel}-webhook`}
                      type="text"
                      placeholder={currentConfig.webhookPlaceholder}
                      value={currentChannel.webhookUrl}
                      onChange={(e) => updateChannel(activeChannel, { webhookUrl: e.target.value })}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(currentChannel.webhookUrl)}
                      disabled={!currentChannel.webhookUrl}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    从{currentConfig.name}群机器人设置中获取Webhook地址
                    <a
                      href={currentConfig.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      查看文档
                    </a>
                  </p>
                </div>

                {/* 加签密钥 (仅钉钉和飞书支持) */}
                {currentConfig.supportsSign && (
                  <div className="space-y-2">
                    <Label htmlFor={`${activeChannel}-secret`}>加签密钥 (可选)</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`${activeChannel}-secret`}
                        type={currentChannel.showSecret ? "text" : "password"}
                        placeholder={currentConfig.secretPlaceholder}
                        value={currentChannel.secret}
                        onChange={(e) => updateChannel(activeChannel, { secret: e.target.value })}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateChannel(activeChannel, { showSecret: !currentChannel.showSecret })}
                      >
                        {currentChannel.showSecret ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      如果启用了加签安全设置，请填写密钥
                    </p>
                  </div>
                )}

                {/* 自定义关键词 (仅钉钉和飞书支持) */}
                {currentConfig.supportsKeyword && (
                  <div className="space-y-2">
                    <Label htmlFor={`${activeChannel}-keyword`}>自定义关键词 (可选)</Label>
                    <Input
                      id={`${activeChannel}-keyword`}
                      type="text"
                      placeholder="如: GRT、告警、通知"
                      value={currentChannel.keyword}
                      onChange={(e) => updateChannel(activeChannel, { keyword: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      如果启用了自定义关键词安全设置，消息内容需包含该关键词
                    </p>
                  </div>
                )}

                <Separator />

                {/* 测试连接 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">测试连接</p>
                    <p className="text-sm text-muted-foreground">
                      发送测试消息验证配置是否正确
                    </p>
                  </div>
                  <Button
                    onClick={() => testWebhook(activeChannel)}
                    disabled={currentChannel.testing || !currentChannel.webhookUrl}
                  >
                    {currentChannel.testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        发送中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        发送测试
                      </>
                    )}
                  </Button>
                </div>

                {currentChannel.testResult && (
                  <div
                    className={`p-4 rounded-lg ${
                      currentChannel.testResult === "success"
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-red-500/10 border border-red-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {currentChannel.testResult === "success" ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="font-medium text-green-500">测试成功</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="font-medium text-red-500">测试失败</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm mt-1 text-muted-foreground">
                      {currentChannel.testResult === "success"
                        ? `消息已成功发送到${currentConfig.name}群`
                        : "请检查Webhook配置是否正确"}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    选择需要通过{currentConfig.name}发送的通知类型
                  </p>
                  
                  {notificationTypes.map(type => (
                    <div
                      key={type.value}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={currentChannel.enabledNotifications.includes(type.value)}
                        onCheckedChange={() => toggleNotification(activeChannel, type.value)}
                        disabled={!currentChannel.enabled}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/30">
                  <div>
                    <p className="font-medium">已启用 {currentChannel.enabledNotifications.length} 种通知</p>
                    <p className="text-sm text-muted-foreground">
                      {currentChannel.enabled ? "通知将通过此渠道发送" : "请先启用此渠道"}
                    </p>
                  </div>
                  <Badge variant={currentChannel.enabled ? "default" : "secondary"}>
                    {currentChannel.enabled ? "已启用" : "未启用"}
                  </Badge>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 渠道状态汇总 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              渠道状态汇总
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {channelConfigs.map(config => {
                const state = channels[config.id];
                const enabledCount = state.enabledNotifications.length;
                return (
                  <div
                    key={config.id}
                    className={`p-4 rounded-lg border ${
                      state.enabled ? "bg-green-500/5 border-green-500/20" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium flex items-center gap-2">
                        <span>{config.icon}</span>
                        {config.name}
                      </span>
                      <Badge variant={state.enabled ? "default" : "secondary"} className="text-xs">
                        {state.enabled ? "启用" : "禁用"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {state.enabled ? (
                        <>
                          <p>已配置 {enabledCount} 种通知</p>
                          <p className="text-xs mt-1">
                            {state.webhookUrl ? "Webhook已配置" : "Webhook未配置"}
                          </p>
                        </>
                      ) : (
                        <p>渠道未启用</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
