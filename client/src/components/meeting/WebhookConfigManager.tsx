import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  TestTube,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  Send
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

// Webhook平台类型
const WEBHOOK_PLATFORMS = [
  { 
    id: 'wechat_work', 
    name: '企业微信', 
    icon: '💬',
    urlPattern: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=',
    placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    docUrl: 'https://developer.work.weixin.qq.com/document/path/91770'
  },
  { 
    id: 'dingtalk', 
    name: '钉钉', 
    icon: '📌',
    urlPattern: 'https://oapi.dingtalk.com/robot/send?access_token=',
    placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docUrl: 'https://open.dingtalk.com/document/robots/custom-robot-access'
  },
  { 
    id: 'feishu', 
    name: '飞书', 
    icon: '🐦',
    urlPattern: 'https://open.feishu.cn/open-apis/bot/v2/hook/',
    placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    docUrl: 'https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot'
  },
  { 
    id: 'slack', 
    name: 'Slack', 
    icon: '💼',
    urlPattern: 'https://hooks.slack.com/services/...',
    placeholder: 'https://hooks.slack.com/services/TXXXXX/BXXXXX/XXXXX',
    docUrl: 'https://api.slack.com/messaging/webhooks'
  },
  { 
    id: 'custom', 
    name: '自定义Webhook', 
    icon: '🔗',
    urlPattern: '',
    placeholder: 'https://your-server.com/webhook',
    docUrl: ''
  }
];

// 通知事件类型
const NOTIFICATION_EVENTS = [
  { id: 'task_created', name: '任务创建', description: '新任务分发时通知' },
  { id: 'task_completed', name: '任务完成', description: '任务标记完成时通知' },
  { id: 'task_overdue', name: '任务逾期', description: '任务超过截止日期时通知' },
  { id: 'task_reminder', name: '任务提醒', description: '任务即将到期时提醒' },
  { id: 'meeting_created', name: '会议创建', description: '新会议创建时通知' },
  { id: 'meeting_minutes', name: '会议纪要', description: '会议纪要生成时通知' },
  { id: 'evidence_uploaded', name: '举证上传', description: '任务举证材料上传时通知' },
  { id: 'mo_report', name: 'MO上报', description: '向Meeting Owner上报时通知' }
];

interface WebhookConfig {
  id: string;
  name: string;
  platform: string;
  webhookUrl: string;
  secret?: string;
  isActive: boolean;
  events: string[];
  meetingTypes: string[];
  createdAt: string;
  lastTestedAt?: string;
  lastTestResult?: 'success' | 'failed';
}

interface WebhookConfigManagerProps {
  meetingTypes?: { id: string; name: string }[];
}

export default function WebhookConfigManager({ meetingTypes = [] }: WebhookConfigManagerProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WebhookConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // 获取Webhook配置列表
  const { data: configsData, isLoading, refetch } = trpc.taskNotification.getWebhookConfigs.useQuery({});
  const configs: WebhookConfig[] = configsData?.configs || [];

  // 保存Webhook配置
  const saveMutation = trpc.taskNotification.saveWebhookConfig.useMutation({
    onSuccess: () => {
      toast({ title: '保存成功', description: 'Webhook配置已保存' });
      setShowAddDialog(false);
      setEditingConfig(null);
      refetch();
    },
    onError: (error) => {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' });
    }
  });

  // 删除Webhook配置
  const deleteMutation = trpc.taskNotification.deleteWebhookConfig.useMutation({
    onSuccess: () => {
      toast({ title: '删除成功' });
      refetch();
    },
    onError: (error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    }
  });

  // 测试Webhook
  const testMutation = trpc.taskNotification.testWebhook.useMutation({
    onSuccess: (result) => {
      setTestingId(null);
      if (result.success) {
        toast({ title: '测试成功', description: '消息已成功发送到Webhook' });
      } else {
        toast({ title: '测试失败', description: result.error || '发送失败', variant: 'destructive' });
      }
      refetch();
    },
    onError: (error) => {
      setTestingId(null);
      toast({ title: '测试失败', description: error.message, variant: 'destructive' });
    }
  });

  // 切换启用状态
  const toggleMutation = trpc.taskNotification.toggleWebhookConfig.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const handleTest = (config: WebhookConfig) => {
    setTestingId(config.id);
    testMutation.mutate({ id: config.id });
  };

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook 通知配置
          </h3>
          <p className="text-sm text-muted-foreground">
            配置企业微信、钉钉、飞书等平台的Webhook通知
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          添加Webhook
        </Button>
      </div>

      {/* 配置列表 */}
      <ScrollArea className="h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : configs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-40">
              <Webhook className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">暂无Webhook配置</p>
              <Button variant="link" onClick={() => setShowAddDialog(true)}>
                点击添加
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => {
              const platform = WEBHOOK_PLATFORMS.find(p => p.id === config.platform);
              return (
                <Card key={config.id} className={!config.isActive ? 'opacity-60' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{platform?.icon || '🔗'}</span>
                          <span className="font-medium">{config.name}</span>
                          <Badge variant={config.isActive ? 'default' : 'secondary'}>
                            {config.isActive ? '启用' : '禁用'}
                          </Badge>
                          {config.lastTestResult && (
                            <Badge variant={config.lastTestResult === 'success' ? 'outline' : 'destructive'}>
                              {config.lastTestResult === 'success' ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" />测试通过</>
                              ) : (
                                <><XCircle className="h-3 w-3 mr-1" />测试失败</>
                              )}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {config.webhookUrl.substring(0, 60)}...
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {config.events.slice(0, 4).map((event) => {
                            const eventInfo = NOTIFICATION_EVENTS.find(e => e.id === event);
                            return (
                              <Badge key={event} variant="outline" className="text-xs">
                                {eventInfo?.name || event}
                              </Badge>
                            );
                          })}
                          {config.events.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{config.events.length - 4}
                            </Badge>
                          )}
                        </div>

                        {config.lastTestedAt && (
                          <p className="text-xs text-muted-foreground">
                            上次测试: {new Date(config.lastTestedAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.isActive}
                          onCheckedChange={(checked) => 
                            toggleMutation.mutate({ id: config.id, isActive: checked })
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(config)}
                          disabled={testingId === config.id}
                        >
                          {testingId === config.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingConfig(config);
                            setShowAddDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('确定删除该Webhook配置？')) {
                              deleteMutation.mutate({ id: config.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* 添加/编辑对话框 */}
      <WebhookConfigDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingConfig(null);
        }}
        config={editingConfig}
        meetingTypes={meetingTypes}
        onSave={(data) => saveMutation.mutate(data)}
      />
    </div>
  );
}

// Webhook配置对话框
interface WebhookConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WebhookConfig | null;
  meetingTypes: { id: string; name: string }[];
  onSave: (data: any) => void;
}

function WebhookConfigDialog({ open, onOpenChange, config, meetingTypes, onSave }: WebhookConfigDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    platform: 'wechat_work',
    webhookUrl: '',
    secret: '',
    isActive: true,
    events: ['task_completed', 'task_overdue'] as string[],
    meetingTypes: [] as string[]
  });

  const [urlError, setUrlError] = useState('');

  // 初始化表单数据
  useState(() => {
    if (config) {
      setFormData({
        name: config.name,
        platform: config.platform,
        webhookUrl: config.webhookUrl,
        secret: config.secret || '',
        isActive: config.isActive,
        events: config.events,
        meetingTypes: config.meetingTypes
      });
    }
  });

  const selectedPlatform = WEBHOOK_PLATFORMS.find(p => p.id === formData.platform);

  // 验证URL
  const validateUrl = (url: string) => {
    if (!url) {
      setUrlError('请输入Webhook URL');
      return false;
    }
    try {
      new URL(url);
      if (selectedPlatform?.urlPattern && !url.startsWith(selectedPlatform.urlPattern)) {
        setUrlError(`URL格式不正确，应以 ${selectedPlatform.urlPattern} 开头`);
        return false;
      }
      setUrlError('');
      return true;
    } catch {
      setUrlError('请输入有效的URL');
      return false;
    }
  };

  const handleSubmit = () => {
    if (!formData.name) {
      return;
    }
    if (!validateUrl(formData.webhookUrl)) {
      return;
    }
    if (formData.events.length === 0) {
      return;
    }
    onSave({
      id: config?.id,
      ...formData
    });
  };

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? '编辑' : '添加'} Webhook 配置</DialogTitle>
          <DialogDescription>
            配置通知推送的Webhook地址和触发事件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>配置名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：生产部企业微信群"
              />
            </div>

            <div className="space-y-2">
              <Label>平台类型 *</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, platform: value, webhookUrl: '' }));
                  setUrlError('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEBHOOK_PLATFORMS.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      <span className="flex items-center gap-2">
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Webhook URL *</Label>
                {selectedPlatform?.docUrl && (
                  <a
                    href={selectedPlatform.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    查看文档 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <Input
                value={formData.webhookUrl}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, webhookUrl: e.target.value }));
                  validateUrl(e.target.value);
                }}
                placeholder={selectedPlatform?.placeholder}
                className={urlError ? 'border-destructive' : ''}
              />
              {urlError && (
                <p className="text-xs text-destructive">{urlError}</p>
              )}
              {selectedPlatform && selectedPlatform.id !== 'custom' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    请在{selectedPlatform.name}中创建机器人，获取Webhook地址后粘贴到此处
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {(formData.platform === 'dingtalk' || formData.platform === 'custom') && (
              <div className="space-y-2">
                <Label>签名密钥 (可选)</Label>
                <Input
                  type="password"
                  value={formData.secret}
                  onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="如果启用了签名验证，请输入密钥"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* 触发事件 */}
          <div className="space-y-4">
            <Label>触发事件 *</Label>
            <p className="text-xs text-muted-foreground">选择哪些事件会触发Webhook通知</p>
            <div className="grid grid-cols-2 gap-3">
              {NOTIFICATION_EVENTS.map((event) => (
                <label
                  key={event.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.events.includes(event.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.id)}
                    onChange={() => toggleEvent(event.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm">{event.name}</p>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* 适用会议类型 */}
          {meetingTypes.length > 0 && (
            <div className="space-y-4">
              <Label>适用会议类型 (可选)</Label>
              <p className="text-xs text-muted-foreground">不选择则适用于所有会议类型</p>
              <div className="flex flex-wrap gap-2">
                {meetingTypes.map((type) => (
                  <Badge
                    key={type.id}
                    variant={formData.meetingTypes.includes(type.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        meetingTypes: prev.meetingTypes.includes(type.id)
                          ? prev.meetingTypes.filter(t => t !== type.id)
                          : [...prev.meetingTypes, type.id]
                      }));
                    }}
                  >
                    {type.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 启用状态 */}
          <div className="flex items-center justify-between">
            <div>
              <Label>启用状态</Label>
              <p className="text-xs text-muted-foreground">关闭后将不会发送通知</p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-1" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
