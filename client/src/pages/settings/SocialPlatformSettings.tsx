/**
 * 社群平台配置页面
 * Social Platform Settings Page
 * 
 * 配置企业微信、钉钉、飞书等平台的连接
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Layout from '@/components/Layout';
import { PageHeader } from "@/components/grt";
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  MessageSquare,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  AlertTriangle,
  Loader2,
  Building2,
  Link2,
  Key,
  Shield,
  Clock,
  Zap,
} from 'lucide-react';

// 平台图标组件
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className }) => {
  switch (platform) {
    case 'wecom':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
      );
    case 'dingtalk':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
        </svg>
      );
    case 'feishu':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      );
    default:
      return <MessageSquare className={className} />;
  }
};

// 企业微信配置表单
const WeComConfigForm: React.FC<{
  config: any;
  onSave: (config: any) => void;
  onTest: () => void;
  isSaving: boolean;
  isTesting: boolean;
}> = ({ config, onSave, onTest, isSaving, isTesting }) => {
  const [formData, setFormData] = useState({
    corpId: config?.corpId || '',
    agentId: config?.agentId || '',
    secret: '',
    token: config?.token || '',
    encodingAESKey: '',
    webhookUrl: '',
    webhookSecret: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      config: {
        corpId: formData.corpId,
        agentId: formData.agentId,
        secret: formData.secret,
        token: formData.token,
        encodingAESKey: formData.encodingAESKey,
      },
      webhookUrl: formData.webhookUrl,
      webhookSecret: formData.webhookSecret,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="corpId" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            企业ID (Corp ID) *
          </Label>
          <Input
            id="corpId"
            value={formData.corpId}
            onChange={(e) => setFormData({ ...formData, corpId: e.target.value })}
            placeholder="ww1234567890abcdef"
            required
          />
          <p className="text-xs text-muted-foreground">
            在企业微信管理后台 → 我的企业 → 企业信息中查看
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agentId" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            应用ID (Agent ID)
          </Label>
          <Input
            id="agentId"
            value={formData.agentId}
            onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
            placeholder="1000001"
          />
          <p className="text-xs text-muted-foreground">
            在应用管理 → 自建应用中查看
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            应用Secret *
          </Label>
          <Input
            id="secret"
            type="password"
            value={formData.secret}
            onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
            placeholder="输入新的Secret（留空则保持不变）"
          />
          <p className="text-xs text-muted-foreground">
            在应用详情页面查看，注意保密
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="token" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            回调Token
          </Label>
          <Input
            id="token"
            value={formData.token}
            onChange={(e) => setFormData({ ...formData, token: e.target.value })}
            placeholder="用于验证消息来源"
          />
          <p className="text-xs text-muted-foreground">
            接收消息回调时使用，可自定义
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="encodingAESKey" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            消息加密密钥 (EncodingAESKey)
          </Label>
          <Input
            id="encodingAESKey"
            type="password"
            value={formData.encodingAESKey}
            onChange={(e) => setFormData({ ...formData, encodingAESKey: e.target.value })}
            placeholder="43位字符"
          />
          <p className="text-xs text-muted-foreground">
            用于消息加解密，在接收消息配置中设置
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Webhook配置（可选）
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret</Label>
            <Input
              id="webhookSecret"
              type="password"
              value={formData.webhookSecret}
              onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
              placeholder="签名密钥"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          保存配置
        </Button>
        <Button type="button" variant="outline" onClick={onTest} disabled={isTesting}>
          {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          测试连接
        </Button>
      </div>
    </form>
  );
};

// 钉钉配置表单
const DingTalkConfigForm: React.FC<{
  config: any;
  onSave: (config: any) => void;
  onTest: () => void;
  isSaving: boolean;
  isTesting: boolean;
}> = ({ config, onSave, onTest, isSaving, isTesting }) => {
  const [formData, setFormData] = useState({
    appKey: config?.appKey || '',
    appSecret: '',
    agentId: config?.agentId || '',
    robotWebhook: config?.robotWebhook || '',
    robotSecret: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      config: {
        appKey: formData.appKey,
        appSecret: formData.appSecret,
        agentId: formData.agentId,
        robotWebhook: formData.robotWebhook,
        robotSecret: formData.robotSecret,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="appKey" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            AppKey *
          </Label>
          <Input
            id="appKey"
            value={formData.appKey}
            onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
            placeholder="dingxxxxxxxx"
            required
          />
          <p className="text-xs text-muted-foreground">
            在钉钉开放平台 → 应用开发 → 企业内部应用中查看
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="appSecret" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            AppSecret *
          </Label>
          <Input
            id="appSecret"
            type="password"
            value={formData.appSecret}
            onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
            placeholder="输入新的AppSecret（留空则保持不变）"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agentId" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            AgentId
          </Label>
          <Input
            id="agentId"
            value={formData.agentId}
            onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
            placeholder="应用的AgentId"
          />
          <p className="text-xs text-muted-foreground">
            发送工作通知时需要
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          群机器人配置（推荐）
        </h4>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>推荐使用群机器人</AlertTitle>
          <AlertDescription>
            群机器人Webhook是最简单的消息发送方式，无需复杂的API权限配置。
            在钉钉群设置 → 智能群助手 → 添加机器人 → 自定义机器人中获取。
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="robotWebhook">机器人Webhook URL</Label>
            <Input
              id="robotWebhook"
              value={formData.robotWebhook}
              onChange={(e) => setFormData({ ...formData, robotWebhook: e.target.value })}
              placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="robotSecret">签名密钥 (Secret)</Label>
            <Input
              id="robotSecret"
              type="password"
              value={formData.robotSecret}
              onChange={(e) => setFormData({ ...formData, robotSecret: e.target.value })}
              placeholder="SEC..."
            />
            <p className="text-xs text-muted-foreground">
              安全设置选择"加签"时需要
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          保存配置
        </Button>
        <Button type="button" variant="outline" onClick={onTest} disabled={isTesting}>
          {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          测试连接
        </Button>
      </div>
    </form>
  );
};

// 飞书配置表单
const FeishuConfigForm: React.FC<{
  config: any;
  onSave: (config: any) => void;
  onTest: () => void;
  isSaving: boolean;
  isTesting: boolean;
}> = ({ config, onSave, onTest, isSaving, isTesting }) => {
  const [formData, setFormData] = useState({
    appId: config?.appId || '',
    appSecret: '',
    encryptKey: config?.encryptKey || '',
    verificationToken: config?.verificationToken || '',
    webhookUrl: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      config: {
        appId: formData.appId,
        appSecret: formData.appSecret,
        encryptKey: formData.encryptKey,
        verificationToken: formData.verificationToken,
      },
      webhookUrl: formData.webhookUrl,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>功能开发中</AlertTitle>
        <AlertDescription>
          飞书集成功能正在开发中，敬请期待。您可以先保存配置信息。
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="appId" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            App ID *
          </Label>
          <Input
            id="appId"
            value={formData.appId}
            onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
            placeholder="cli_xxxxxxxx"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="appSecret" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            App Secret *
          </Label>
          <Input
            id="appSecret"
            type="password"
            value={formData.appSecret}
            onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
            placeholder="输入新的App Secret"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="encryptKey">Encrypt Key</Label>
          <Input
            id="encryptKey"
            value={formData.encryptKey}
            onChange={(e) => setFormData({ ...formData, encryptKey: e.target.value })}
            placeholder="事件订阅加密密钥"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="verificationToken">Verification Token</Label>
          <Input
            id="verificationToken"
            value={formData.verificationToken}
            onChange={(e) => setFormData({ ...formData, verificationToken: e.target.value })}
            placeholder="事件订阅验证Token"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          保存配置
        </Button>
        <Button type="button" variant="outline" onClick={onTest} disabled={isTesting || true}>
          {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          测试连接（开发中）
        </Button>
      </div>
    </form>
  );
};

// 主页面组件
export default function SocialPlatformSettings() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('wecom');
  const [testMessage, setTestMessage] = useState('');

  // 获取所有平台配置
  const { data: configs, isLoading, refetch } = trpc.socialPlatformConfig.getAll.useQuery();

  // 保存配置mutations
  const saveWeComMutation = trpc.socialPlatformConfig.saveWeComConfig.useMutation({
    onSuccess: () => {
      toast.success('企业微信配置已保存');
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const saveDingTalkMutation = trpc.socialPlatformConfig.saveDingTalkConfig.useMutation({
    onSuccess: () => {
      toast.success('钉钉配置已保存');
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const saveFeishuMutation = trpc.socialPlatformConfig.saveFeishuConfig.useMutation({
    onSuccess: () => {
      toast.success('飞书配置已保存');
      refetch();
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  // 测试连接mutation
  const testConnectionMutation = trpc.socialPlatformConfig.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  // 启用/禁用平台mutation
  const togglePlatformMutation = trpc.socialPlatformConfig.togglePlatform.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 同步数据mutation
  const syncDataMutation = trpc.socialPlatformConfig.syncData.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`同步失败: ${error.message}`);
    },
  });

  // 发送测试消息mutation
  const sendTestMessageMutation = trpc.socialPlatformConfig.sendTestMessage.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        setTestMessage('');
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(`发送失败: ${error.message}`);
    },
  });

  // 获取特定平台配置
  const getConfigByPlatform = (platform: string) => {
    return configs?.find((c: any) => c.platform === platform);
  };

  // 渲染平台状态卡片
  const renderPlatformStatusCard = (platform: string, name: string) => {
    const config = getConfigByPlatform(platform);
    const isEnabled = config?.enabled === 1;
    const syncStatus = config?.syncStatus || 'idle';
    const lastSyncAt = config?.lastSyncAt;

    return (
      <Card className={`${isEnabled ? 'border-primary/50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PlatformIcon platform={platform} className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-lg">{name}</CardTitle>
                <CardDescription>
                  {config ? '已配置' : '未配置'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config && (
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => {
                    togglePlatformMutation.mutate({ platform: platform as any, enabled: checked });
                  }}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {syncStatus === 'syncing' ? (
                <Badge variant="outline" className="text-yellow-600">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  同步中
                </Badge>
              ) : syncStatus === 'error' ? (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  同步错误
                </Badge>
              ) : isEnabled ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  已启用
                </Badge>
              ) : (
                <Badge variant="secondary">
                  已禁用
                </Badge>
              )}
            </div>
            {lastSyncAt && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                上次同步: {new Date(lastSyncAt).toLocaleString()}
              </span>
            )}
          </div>
          {config?.syncErrorMsg && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {config.syncErrorMsg}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Settings}
          title="社群平台配置"
          description="配置企业微信、钉钉、飞书等平台的连接，实现社群消息同步和自动回复"
        />

        {/* 平台状态概览 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderPlatformStatusCard('wecom', '企业微信')}
          {renderPlatformStatusCard('dingtalk', '钉钉')}
          {renderPlatformStatusCard('feishu', '飞书')}
        </div>

        {/* 配置详情 */}
        <Card>
          <CardHeader>
            <CardTitle>平台配置详情</CardTitle>
            <CardDescription>
              选择平台并配置API凭据，完成后可测试连接
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="wecom" className="flex items-center gap-2">
                  <PlatformIcon platform="wecom" className="w-4 h-4" />
                  企业微信
                </TabsTrigger>
                <TabsTrigger value="dingtalk" className="flex items-center gap-2">
                  <PlatformIcon platform="dingtalk" className="w-4 h-4" />
                  钉钉
                </TabsTrigger>
                <TabsTrigger value="feishu" className="flex items-center gap-2">
                  <PlatformIcon platform="feishu" className="w-4 h-4" />
                  飞书
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wecom" className="mt-6">
                <WeComConfigForm
                  config={getConfigByPlatform('wecom')?.config}
                  onSave={(data) => saveWeComMutation.mutate(data)}
                  onTest={() => testConnectionMutation.mutate({ platform: 'wecom' })}
                  isSaving={saveWeComMutation.isPending}
                  isTesting={testConnectionMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="dingtalk" className="mt-6">
                <DingTalkConfigForm
                  config={getConfigByPlatform('dingtalk')?.config}
                  onSave={(data) => saveDingTalkMutation.mutate(data)}
                  onTest={() => testConnectionMutation.mutate({ platform: 'dingtalk' })}
                  isSaving={saveDingTalkMutation.isPending}
                  isTesting={testConnectionMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="feishu" className="mt-6">
                <FeishuConfigForm
                  config={getConfigByPlatform('feishu')?.config}
                  onSave={(data) => saveFeishuMutation.mutate(data)}
                  onTest={() => testConnectionMutation.mutate({ platform: 'feishu' })}
                  isSaving={saveFeishuMutation.isPending}
                  isTesting={testConnectionMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 测试消息发送 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              发送测试消息
            </CardTitle>
            <CardDescription>
              向已配置的平台发送测试消息，验证消息推送功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>消息内容</Label>
                <Textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="输入测试消息内容..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  disabled={!testMessage || sendTestMessageMutation.isPending}
                  onClick={() => {
                    sendTestMessageMutation.mutate({
                      platform: activeTab as any,
                      message: testMessage,
                    });
                  }}
                >
                  {sendTestMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  发送到{activeTab === 'wecom' ? '企业微信' : activeTab === 'dingtalk' ? '钉钉' : '飞书'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据同步 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              数据同步
            </CardTitle>
            <CardDescription>
              从平台同步群组、成员和消息数据到本地数据库
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={syncDataMutation.isPending}
                onClick={() => {
                  syncDataMutation.mutate({ platform: activeTab as any });
                }}
              >
                {syncDataMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                同步{activeTab === 'wecom' ? '企业微信' : activeTab === 'dingtalk' ? '钉钉' : '飞书'}数据
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
