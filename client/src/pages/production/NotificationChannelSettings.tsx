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
import { 
  AlertCircle, Bell, CheckCircle2, Clock, Edit2, ExternalLink, 
  Mail, MessageCircle, MessageSquare, Phone, Plus, RefreshCw, 
  Send, Settings2, Shield, Smartphone, TestTube, Trash2, Webhook,
  Zap, Globe, Key, Lock, Eye, EyeOff, Copy, Check
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ============================================================================
// 类型定义
// ============================================================================

type ChannelType = "wecom" | "dingtalk" | "feishu" | "email" | "sms" | "system";
type ChannelStatus = "active" | "inactive" | "error" | "testing";

interface NotificationChannel {
  id: number;
  name: string;
  type: ChannelType;
  webhookUrl: string | null;
  config: string | null;
  enabled: boolean;
  status: ChannelStatus;
  lastTestAt: Date | null;
  lastTestResult: boolean | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationTemplate {
  id: number;
  name: string;
  channelType: ChannelType;
  eventType: string;
  subject: string;
  content: string;
  variables: string[];
  enabled: boolean;
}

// ============================================================================
// 常量配置
// ============================================================================

const channelTypeLabels: Record<ChannelType, string> = {
  wecom: "企业微信",
  dingtalk: "钉钉",
  feishu: "飞书",
  email: "邮件",
  sms: "短信",
  system: "系统通知",
};

const channelTypeIcons: Record<ChannelType, React.ReactNode> = {
  wecom: <MessageCircle className="w-4 h-4" />,
  dingtalk: <MessageSquare className="w-4 h-4" />,
  feishu: <Send className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  sms: <Phone className="w-4 h-4" />,
  system: <Bell className="w-4 h-4" />,
};

const channelTypeColors: Record<ChannelType, string> = {
  wecom: "bg-green-500/10 text-green-500 border-green-500/20",
  dingtalk: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  feishu: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  email: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  sms: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  system: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusLabels: Record<ChannelStatus, string> = {
  active: "正常",
  inactive: "未激活",
  error: "错误",
  testing: "测试中",
};

const statusColors: Record<ChannelStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  inactive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  error: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  testing: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const eventTypeLabels: Record<string, string> = {
  approval_request: "审批请求",
  approval_result: "审批结果",
  stage_change: "阶段变更",
  time_record: "工时记录",
  device_alert: "设备告警",
  system_notification: "系统通知",
};

// ============================================================================
// 主组件
// ============================================================================

export default function NotificationChannelSettings() {
  const [activeTab, setActiveTab] = useState("channels");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    type: "wecom" as ChannelType,
    webhookUrl: "",
    config: "",
    description: "",
    enabled: true,
  });

  // 模拟渠道数据
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 1,
      name: "生产部企业微信群",
      type: "wecom",
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx-xxx-xxx",
      config: null,
      enabled: true,
      status: "active",
      lastTestAt: new Date(Date.now() - 86400000),
      lastTestResult: true,
      description: "生产部门审批通知群",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: "项目管理钉钉群",
      type: "dingtalk",
      webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=xxx",
      config: JSON.stringify({ secret: "SEC-xxx-hidden" }),
      enabled: true,
      status: "active",
      lastTestAt: new Date(Date.now() - 172800000),
      lastTestResult: true,
      description: "项目管理审批和进度通知",
      createdAt: new Date("2024-02-20"),
      updatedAt: new Date(),
    },
    {
      id: 3,
      name: "系统管理员邮箱",
      type: "email",
      webhookUrl: null,
      config: JSON.stringify({
        smtpHost: "smtp.company.com",
        smtpPort: 587,
        smtpUser: "system@company.com",
        smtpPass: "***",
        fromName: "GRT系统",
        fromEmail: "system@company.com",
      }),
      enabled: true,
      status: "active",
      lastTestAt: new Date(Date.now() - 259200000),
      lastTestResult: true,
      description: "系统管理员邮件通知",
      createdAt: new Date("2024-03-10"),
      updatedAt: new Date(),
    },
    {
      id: 4,
      name: "紧急短信通知",
      type: "sms",
      webhookUrl: null,
      config: JSON.stringify({
        provider: "aliyun",
        accessKeyId: "LTAI-xxx",
        accessKeySecret: "***",
        signName: "GRT系统",
        templateCode: "SMS_123456",
      }),
      enabled: false,
      status: "inactive",
      lastTestAt: null,
      lastTestResult: null,
      description: "紧急情况短信通知（未启用）",
      createdAt: new Date("2024-04-05"),
      updatedAt: new Date(),
    },
  ]);

  // 模拟模板数据
  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: 1,
      name: "审批请求通知",
      channelType: "wecom",
      eventType: "approval_request",
      subject: "【审批请求】{{stage_name}} 阶段需要您的审批",
      content: "项目：{{project_name}}\n阶段：{{stage_name}}\n申请人：{{applicant}}\n申请时间：{{apply_time}}\n\n请及时处理审批请求。",
      variables: ["project_name", "stage_name", "applicant", "apply_time"],
      enabled: true,
    },
    {
      id: 2,
      name: "审批结果通知",
      channelType: "wecom",
      eventType: "approval_result",
      subject: "【审批结果】{{stage_name}} 阶段审批{{result}}",
      content: "项目：{{project_name}}\n阶段：{{stage_name}}\n审批人：{{approver}}\n审批结果：{{result}}\n审批意见：{{comment}}\n审批时间：{{approve_time}}",
      variables: ["project_name", "stage_name", "approver", "result", "comment", "approve_time"],
      enabled: true,
    },
    {
      id: 3,
      name: "阶段变更通知",
      channelType: "dingtalk",
      eventType: "stage_change",
      subject: "【阶段变更】{{project_name}} 进入 {{new_stage}} 阶段",
      content: "项目：{{project_name}}\n原阶段：{{old_stage}}\n新阶段：{{new_stage}}\n变更时间：{{change_time}}\n操作人：{{operator}}",
      variables: ["project_name", "old_stage", "new_stage", "change_time", "operator"],
      enabled: true,
    },
    {
      id: 4,
      name: "设备告警通知",
      channelType: "email",
      eventType: "device_alert",
      subject: "【设备告警】{{device_name}} 发生异常",
      content: "设备编号：{{device_code}}\n设备名称：{{device_name}}\n告警类型：{{alert_type}}\n告警详情：{{alert_detail}}\n发生时间：{{alert_time}}\n\n请及时处理。",
      variables: ["device_code", "device_name", "alert_type", "alert_detail", "alert_time"],
      enabled: true,
    },
  ]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      type: "wecom",
      webhookUrl: "",
      config: "",
      description: "",
      enabled: true,
    });
    setShowSecrets(false);
  };

  // 打开编辑对话框
  const openEditDialog = (channel: NotificationChannel) => {
    setSelectedChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      webhookUrl: channel.webhookUrl || "",
      config: channel.config || "",
      description: channel.description || "",
      enabled: channel.enabled,
    });
    setIsEditDialogOpen(true);
  };

  // 测试渠道连接
  const testChannel = async (channel: NotificationChannel) => {
    setSelectedChannel(channel);
    setIsTestDialogOpen(true);
    setIsTesting(true);
    setTestResult(null);

    // 模拟测试过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟测试结果
    const success = Math.random() > 0.2;
    setTestResult({
      success,
      message: success 
        ? "测试消息发送成功！请检查目标渠道是否收到测试通知。"
        : "测试失败：无法连接到目标服务，请检查Webhook URL和认证配置。",
    });
    setIsTesting(false);

    // 更新渠道状态
    setChannels(channels.map(c => 
      c.id === channel.id 
        ? { ...c, lastTestAt: new Date(), lastTestResult: success, status: success ? "active" : "error" }
        : c
    ));
  };

  // 添加渠道
  const handleAddChannel = () => {
    const newChannel: NotificationChannel = {
      id: channels.length + 1,
      name: formData.name,
      type: formData.type,
      webhookUrl: formData.webhookUrl || null,
      config: formData.config || null,
      enabled: formData.enabled,
      status: "inactive",
      lastTestAt: null,
      lastTestResult: null,
      description: formData.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChannels([...channels, newChannel]);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success("通知渠道添加成功");
  };

  // 更新渠道
  const handleUpdateChannel = () => {
    if (!selectedChannel) return;
    setChannels(channels.map(c => 
      c.id === selectedChannel.id 
        ? {
            ...c,
            name: formData.name,
            type: formData.type,
            webhookUrl: formData.webhookUrl || null,
            config: formData.config || null,
            description: formData.description || null,
            enabled: formData.enabled,
            updatedAt: new Date(),
          }
        : c
    ));
    setIsEditDialogOpen(false);
    resetForm();
    toast.success("通知渠道更新成功");
  };

  // 删除渠道
  const handleDeleteChannel = (channelId: number) => {
    setChannels(channels.filter(c => c.id !== channelId));
    toast.success("通知渠道已删除");
  };

  // 切换渠道启用状态
  const toggleChannelEnabled = (channelId: number) => {
    setChannels(channels.map(c => 
      c.id === channelId ? { ...c, enabled: !c.enabled, updatedAt: new Date() } : c
    ));
    toast.success("渠道状态已更新");
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("已复制到剪贴板");
  };

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return "从未";
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(date).toLocaleDateString("zh-CN");
  };

  // 获取渠道配置表单
  const getChannelConfigForm = () => {
    switch (formData.type) {
      case "wecom":
      case "dingtalk":
      case "feishu":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL *</Label>
              <div className="flex gap-2">
                <Input
                  id="webhookUrl"
                  placeholder={
                    formData.type === "wecom" 
                      ? "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" 
                      : formData.type === "dingtalk"
                      ? "https://oapi.dingtalk.com/robot/send?access_token=xxx"
                      : "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
                  }
                  value={formData.webhookUrl}
                  onChange={e => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(formData.webhookUrl, "webhookUrl")}
                >
                  {copiedField === "webhookUrl" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.type === "wecom" && "在企业微信群设置中创建机器人获取Webhook地址"}
                {formData.type === "dingtalk" && "在钉钉群设置中添加自定义机器人获取Webhook地址"}
                {formData.type === "feishu" && "在飞书群设置中添加自定义机器人获取Webhook地址"}
              </p>
            </div>
            {formData.type === "dingtalk" && (
              <div className="space-y-2">
                <Label htmlFor="secret">签名密钥 (可选)</Label>
                <Input
                  id="secret"
                  type={showSecrets ? "text" : "password"}
                  placeholder="SEC-xxx-xxx-xxx"
                  value={formData.config ? JSON.parse(formData.config).secret || "" : ""}
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    config: JSON.stringify({ secret: e.target.value })
                  }))}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  如果启用了加签安全设置，请填写签名密钥
                </p>
              </div>
            )}
          </div>
        );
      case "email":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP服务器 *</Label>
                <Input
                  id="smtpHost"
                  placeholder="smtp.company.com"
                  value={formData.config ? JSON.parse(formData.config).smtpHost || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, smtpHost: e.target.value }) }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">端口 *</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="587"
                  value={formData.config ? JSON.parse(formData.config).smtpPort || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, smtpPort: parseInt(e.target.value) }) }));
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUser">用户名 *</Label>
                <Input
                  id="smtpUser"
                  placeholder="system@company.com"
                  value={formData.config ? JSON.parse(formData.config).smtpUser || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, smtpUser: e.target.value }) }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPass">密码 *</Label>
                <Input
                  id="smtpPass"
                  type={showSecrets ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.config ? JSON.parse(formData.config).smtpPass || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, smtpPass: e.target.value }) }));
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName">发件人名称</Label>
                <Input
                  id="fromName"
                  placeholder="GRT系统"
                  value={formData.config ? JSON.parse(formData.config).fromName || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, fromName: e.target.value }) }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail">发件人邮箱</Label>
                <Input
                  id="fromEmail"
                  placeholder="system@company.com"
                  value={formData.config ? JSON.parse(formData.config).fromEmail || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, fromEmail: e.target.value }) }));
                  }}
                />
              </div>
            </div>
          </div>
        );
      case "sms":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>短信服务商</Label>
              <Select 
                value={formData.config ? JSON.parse(formData.config).provider || "aliyun" : "aliyun"}
                onValueChange={v => {
                  const config = formData.config ? JSON.parse(formData.config) : {};
                  setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, provider: v }) }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aliyun">阿里云短信</SelectItem>
                  <SelectItem value="tencent">腾讯云短信</SelectItem>
                  <SelectItem value="huawei">华为云短信</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accessKeyId">Access Key ID *</Label>
                <Input
                  id="accessKeyId"
                  placeholder="LTAI-xxx"
                  value={formData.config ? JSON.parse(formData.config).accessKeyId || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, accessKeyId: e.target.value }) }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessKeySecret">Access Key Secret *</Label>
                <Input
                  id="accessKeySecret"
                  type={showSecrets ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.config ? JSON.parse(formData.config).accessKeySecret || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, accessKeySecret: e.target.value }) }));
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signName">签名名称 *</Label>
                <Input
                  id="signName"
                  placeholder="GRT系统"
                  value={formData.config ? JSON.parse(formData.config).signName || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, signName: e.target.value }) }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateCode">模板代码 *</Label>
                <Input
                  id="templateCode"
                  placeholder="SMS_123456"
                  value={formData.config ? JSON.parse(formData.config).templateCode || "" : ""}
                  onChange={e => {
                    const config = formData.config ? JSON.parse(formData.config) : {};
                    setFormData(prev => ({ ...prev, config: JSON.stringify({ ...config, templateCode: e.target.value }) }));
                  }}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // 统计数据
  const stats = {
    total: channels.length,
    active: channels.filter(c => c.status === "active").length,
    enabled: channels.filter(c => c.enabled).length,
    error: channels.filter(c => c.status === "error").length,
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Bell}
          title="通知渠道配置"
          description="配置企业微信、钉钉、邮件、短信等通知渠道，管理消息模板"
          actions={
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  添加渠道
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>添加通知渠道</DialogTitle>
                  <DialogDescription>
                    配置新的通知渠道，支持企业微信、钉钉、邮件、短信等
                  </DialogDescription>
                </DialogHeader>
                <ChannelForm
                  formData={formData}
                  setFormData={setFormData}
                  showSecrets={showSecrets}
                  setShowSecrets={setShowSecrets}
                  getChannelConfigForm={getChannelConfigForm}
                  onSubmit={handleAddChannel}
                  submitLabel="添加渠道"
                />
              </DialogContent>
            </Dialog>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Webhook} label="渠道总数" value={stats.total} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard icon={CheckCircle2} label="正常" value={stats.active} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
          <StatCard icon={Zap} label="已启用" value={stats.enabled} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertCircle} label="错误" value={stats.error} iconColor="text-rose-500" iconBg="bg-rose-500/10" />
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="channels" className="gap-2">
              <Webhook className="w-4 h-4" />
              通知渠道
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              消息模板
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2">
              <Globe className="w-4 h-4" />
              配置指南
            </TabsTrigger>
          </TabsList>

          {/* 通知渠道列表 */}
          <TabsContent value="channels" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">已配置渠道</CardTitle>
                <CardDescription>管理所有通知渠道的连接配置</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>渠道名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>最后测试</TableHead>
                      <TableHead>启用</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.map(channel => (
                      <TableRow key={channel.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{channel.name}</p>
                            {channel.description && (
                              <p className="text-xs text-muted-foreground">{channel.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={channelTypeColors[channel.type]}>
                            <span className="mr-1">{channelTypeIcons[channel.type]}</span>
                            {channelTypeLabels[channel.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[channel.status]}>
                            {statusLabels[channel.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{formatTime(channel.lastTestAt)}</span>
                            {channel.lastTestResult !== null && (
                              channel.lastTestResult 
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                : <AlertCircle className="w-4 h-4 text-rose-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={channel.enabled}
                            onCheckedChange={() => toggleChannelEnabled(channel.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => testChannel(channel)}
                              title="测试连接"
                            >
                              <TestTube className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditDialog(channel)}
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteChannel(channel.id)}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* 消息模板 */}
          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">消息模板</CardTitle>
                <CardDescription>配置不同事件类型的通知消息模板</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>模板名称</TableHead>
                      <TableHead>渠道类型</TableHead>
                      <TableHead>事件类型</TableHead>
                      <TableHead>变量数</TableHead>
                      <TableHead>启用</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={channelTypeColors[template.channelType]}>
                            {channelTypeLabels[template.channelType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {eventTypeLabels[template.eventType] || template.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell>{template.variables.length}</TableCell>
                        <TableCell>
                          <Switch checked={template.enabled} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="编辑"
                              onClick={() => toast.info(`编辑模板: ${template.name}`)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="预览"
                              onClick={() => toast.info(`预览模板: ${template.name}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 配置指南 */}
          <TabsContent value="guide" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 企业微信配置指南 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    企业微信配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>打开企业微信，进入目标群聊</li>
                    <li>点击群设置 → 群机器人 → 添加机器人</li>
                    <li>输入机器人名称，点击添加</li>
                    <li>复制Webhook地址到系统配置中</li>
                  </ol>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href="https://developer.work.weixin.qq.com/document/path/91770" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      查看官方文档
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* 钉钉配置指南 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    钉钉配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>打开钉钉，进入目标群聊</li>
                    <li>点击群设置 → 智能群助手 → 添加机器人</li>
                    <li>选择"自定义"机器人</li>
                    <li>设置安全设置（建议使用加签）</li>
                    <li>复制Webhook地址和签名密钥</li>
                  </ol>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href="https://open.dingtalk.com/document/robots/custom-robot-access" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      查看官方文档
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* 邮件配置指南 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5 text-amber-500" />
                    邮件SMTP配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>常用SMTP服务器配置：</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>QQ邮箱: smtp.qq.com:587</li>
                      <li>163邮箱: smtp.163.com:465</li>
                      <li>Gmail: smtp.gmail.com:587</li>
                      <li>Outlook: smtp.office365.com:587</li>
                    </ul>
                    <p className="text-xs mt-2">注意：部分邮箱需要开启SMTP服务并使用授权码</p>
                  </div>
                </CardContent>
              </Card>

              {/* 短信配置指南 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5 text-rose-500" />
                    短信网关配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>登录云服务商控制台（阿里云/腾讯云）</li>
                    <li>开通短信服务并完成企业认证</li>
                    <li>创建签名和模板并等待审核</li>
                    <li>获取AccessKey和模板代码</li>
                    <li>在系统中配置相关参数</li>
                  </ol>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href="https://www.aliyun.com/product/sms" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        阿里云短信
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href="https://cloud.tencent.com/product/sms" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        腾讯云短信
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 编辑渠道对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑通知渠道</DialogTitle>
              <DialogDescription>
                修改通知渠道配置信息
              </DialogDescription>
            </DialogHeader>
            <ChannelForm 
              formData={formData}
              setFormData={setFormData}
              showSecrets={showSecrets}
              setShowSecrets={setShowSecrets}
              getChannelConfigForm={getChannelConfigForm}
              onSubmit={handleUpdateChannel}
              submitLabel="保存更改"
            />
          </DialogContent>
        </Dialog>

        {/* 测试连接对话框 */}
        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>测试通知渠道</DialogTitle>
              <DialogDescription>
                向 {selectedChannel?.name} 发送测试消息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isTesting ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-muted-foreground">正在发送测试消息...</p>
                </div>
              ) : testResult ? (
                <div className={`p-4 rounded-lg border ${
                  testResult.success 
                    ? "bg-emerald-500/10 border-emerald-500/20" 
                    : "bg-rose-500/10 border-rose-500/20"
                }`}>
                  <div className="flex items-start gap-3">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${testResult.success ? "text-emerald-500" : "text-rose-500"}`}>
                        {testResult.success ? "发送成功" : "发送失败"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                  关闭
                </Button>
                {selectedChannel && (
                  <Button onClick={() => testChannel(selectedChannel)} disabled={isTesting}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isTesting ? "animate-spin" : ""}`} />
                    重新测试
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}

// ============================================================================
// 渠道表单组件
// ============================================================================

interface ChannelFormProps {
  formData: {
    name: string;
    type: ChannelType;
    webhookUrl: string;
    config: string;
    description: string;
    enabled: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<ChannelFormProps["formData"]>>;
  showSecrets: boolean;
  setShowSecrets: React.Dispatch<React.SetStateAction<boolean>>;
  getChannelConfigForm: () => React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
}

function ChannelForm({ 
  formData, 
  setFormData, 
  showSecrets,
  setShowSecrets,
  getChannelConfigForm,
  onSubmit,
  submitLabel 
}: ChannelFormProps) {
  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">渠道名称 *</Label>
          <Input
            id="name"
            placeholder="例如: 生产部企业微信群"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>渠道类型 *</Label>
          <Select 
            value={formData.type} 
            onValueChange={(v: ChannelType) => setFormData(prev => ({ ...prev, type: v, webhookUrl: "", config: "" }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(channelTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    {channelTypeIcons[value as ChannelType]}
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 显示/隐藏密钥 */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
        <span className="text-sm text-muted-foreground">显示敏感信息</span>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowSecrets(!showSecrets)}
        >
          {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>

      {/* 渠道特定配置 */}
      {getChannelConfigForm()}

      {/* 描述 */}
      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea
          id="description"
          placeholder="渠道用途和备注..."
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      {/* 启用状态 */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
        <div>
          <Label>启用渠道</Label>
          <p className="text-xs text-muted-foreground">启用后将自动发送通知消息</p>
        </div>
        <Switch
          checked={formData.enabled}
          onCheckedChange={checked => setFormData(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onSubmit} disabled={!formData.name}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
