/**
 * 工作流告警通知管理组件
 * v2.5.18 - 告警接入Webhook通道、企业微信/钉钉推送、告警级别过滤
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bell, 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Send,
  Clock,
  Loader2,
  MessageSquare,
  Mail,
  Webhook,
  Users
} from 'lucide-react';

// 类型定义
type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';
type NotificationChannel = 'webhook' | 'wechat_work' | 'dingtalk' | 'feishu' | 'email' | 'system';

interface AlertNotificationConfig {
  id: string;
  name: string;
  enabled: boolean;
  channels: NotificationChannel[];
  levelFilter: AlertLevel[];
  workflowFilter: string[];
  webhookUrl?: string;
  wechatWorkKey?: string;
  dingtalkToken?: string;
  feishuToken?: string;
  emailRecipients?: string[];
  mentionAll: boolean;
  mentionUsers?: string[];
}

interface WorkflowAlert {
  id: string;
  workflowId: string;
  workflowName: string;
  executionId: string;
  level: AlertLevel;
  type: string;
  title: string;
  message: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

interface NotificationLog {
  id: string;
  alertId: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  lastAttemptAt: string | null;
  error: string | null;
  createdAt: string;
}

// 模拟数据
const generateMockConfigs = (): AlertNotificationConfig[] => [
  {
    id: 'config-1',
    name: '默认告警通知',
    enabled: true,
    channels: ['system', 'wechat_work'],
    levelFilter: ['warning', 'critical', 'emergency'],
    workflowFilter: [],
    wechatWorkKey: 'xxx-xxx-xxx',
    mentionAll: true,
    mentionUsers: ['admin', 'ops']
  },
  {
    id: 'config-2',
    name: '邮件告警通知',
    enabled: true,
    channels: ['email'],
    levelFilter: ['critical', 'emergency'],
    workflowFilter: [],
    emailRecipients: ['admin@example.com', 'ops@example.com'],
    mentionAll: false
  },
  {
    id: 'config-3',
    name: 'Webhook集成',
    enabled: false,
    channels: ['webhook'],
    levelFilter: ['warning', 'critical', 'emergency'],
    workflowFilter: ['wf-1', 'wf-2'],
    webhookUrl: 'https://hooks.example.com/alerts',
    mentionAll: false
  }
];

const generateMockAlerts = (): WorkflowAlert[] => [
  {
    id: 'alert-1',
    workflowId: 'wf-1',
    workflowName: '设备保养扫描',
    executionId: 'exec-1',
    level: 'critical',
    type: 'execution_failed',
    title: '工作流执行失败',
    message: '设备保养扫描工作流在节点3执行失败，错误：连接超时',
    triggeredAt: new Date(Date.now() - 300000).toISOString(),
    acknowledgedAt: null,
    resolvedAt: null
  },
  {
    id: 'alert-2',
    workflowId: 'wf-2',
    workflowName: '通知聚合发送',
    executionId: 'exec-2',
    level: 'warning',
    type: 'queue_overflow',
    title: '消息队列积压',
    message: '通知聚合发送队列积压超过100条，建议检查发送服务',
    triggeredAt: new Date(Date.now() - 600000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 300000).toISOString(),
    resolvedAt: null
  },
  {
    id: 'alert-3',
    workflowId: 'wf-3',
    workflowName: '数据同步',
    executionId: 'exec-3',
    level: 'info',
    type: 'custom',
    title: '同步完成',
    message: '数据同步工作流已完成，共同步1234条记录',
    triggeredAt: new Date(Date.now() - 1200000).toISOString(),
    acknowledgedAt: null,
    resolvedAt: new Date(Date.now() - 900000).toISOString()
  }
];

const generateMockLogs = (): NotificationLog[] => [
  {
    id: 'log-1',
    alertId: 'alert-1',
    channel: 'wechat_work',
    status: 'sent',
    attempts: 1,
    lastAttemptAt: new Date(Date.now() - 290000).toISOString(),
    error: null,
    createdAt: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'log-2',
    alertId: 'alert-1',
    channel: 'email',
    status: 'failed',
    attempts: 2,
    lastAttemptAt: new Date(Date.now() - 280000).toISOString(),
    error: 'SMTP连接失败',
    createdAt: new Date(Date.now() - 300000).toISOString()
  }
];

// 辅助函数
const getLevelIcon = (level: AlertLevel) => {
  switch (level) {
    case 'info': return <Info className="w-4 h-4 text-blue-500" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'emergency': return <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />;
  }
};

const getLevelLabel = (level: AlertLevel): string => {
  const labels: Record<AlertLevel, string> = {
    info: '信息',
    warning: '警告',
    critical: '严重',
    emergency: '紧急'
  };
  return labels[level];
};

const getChannelIcon = (channel: NotificationChannel) => {
  switch (channel) {
    case 'webhook': return <Webhook className="w-4 h-4" />;
    case 'wechat_work': return <MessageSquare className="w-4 h-4" />;
    case 'dingtalk': return <MessageSquare className="w-4 h-4" />;
    case 'feishu': return <MessageSquare className="w-4 h-4" />;
    case 'email': return <Mail className="w-4 h-4" />;
    case 'system': return <Bell className="w-4 h-4" />;
  }
};

const getChannelLabel = (channel: NotificationChannel): string => {
  const labels: Record<NotificationChannel, string> = {
    webhook: 'Webhook',
    wechat_work: '企业微信',
    dingtalk: '钉钉',
    feishu: '飞书',
    email: '邮件',
    system: '系统通知'
  };
  return labels[channel];
};

// 配置编辑对话框
const ConfigEditDialog = ({ 
  config, 
  onSave, 
  onClose 
}: { 
  config?: AlertNotificationConfig; 
  onSave: (config: Partial<AlertNotificationConfig>) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState<Partial<AlertNotificationConfig>>(config || {
    name: '',
    enabled: true,
    channels: ['system'],
    levelFilter: ['warning', 'critical', 'emergency'],
    workflowFilter: [],
    mentionAll: false
  });

  const handleChannelToggle = (channel: NotificationChannel) => {
    const channels = formData.channels || [];
    if (channels.includes(channel)) {
      setFormData({ ...formData, channels: channels.filter(c => c !== channel) });
    } else {
      setFormData({ ...formData, channels: [...channels, channel] });
    }
  };

  const handleLevelToggle = (level: AlertLevel) => {
    const levels = formData.levelFilter || [];
    if (levels.includes(level)) {
      setFormData({ ...formData, levelFilter: levels.filter(l => l !== level) });
    } else {
      setFormData({ ...formData, levelFilter: [...levels, level] });
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{config ? '编辑配置' : '新建配置'}</DialogTitle>
        <DialogDescription>配置告警通知渠道和过滤规则</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>配置名称</Label>
          <Input 
            value={formData.name || ''} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="输入配置名称"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>启用配置</Label>
          <Switch 
            checked={formData.enabled} 
            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>通知渠道</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['system', 'wechat_work', 'dingtalk', 'feishu', 'email', 'webhook'] as NotificationChannel[]).map(channel => (
              <div key={channel} className="flex items-center gap-2">
                <Checkbox 
                  checked={(formData.channels || []).includes(channel)}
                  onCheckedChange={() => handleChannelToggle(channel)}
                />
                <span className="flex items-center gap-1 text-sm">
                  {getChannelIcon(channel)}
                  {getChannelLabel(channel)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>告警级别过滤</Label>
          <div className="flex gap-4">
            {(['info', 'warning', 'critical', 'emergency'] as AlertLevel[]).map(level => (
              <div key={level} className="flex items-center gap-2">
                <Checkbox 
                  checked={(formData.levelFilter || []).includes(level)}
                  onCheckedChange={() => handleLevelToggle(level)}
                />
                <span className="flex items-center gap-1 text-sm">
                  {getLevelIcon(level)}
                  {getLevelLabel(level)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {(formData.channels || []).includes('wechat_work') && (
          <div className="space-y-2">
            <Label>企业微信机器人Key</Label>
            <Input 
              value={formData.wechatWorkKey || ''} 
              onChange={(e) => setFormData({ ...formData, wechatWorkKey: e.target.value })}
              placeholder="输入企业微信机器人Key"
            />
          </div>
        )}

        {(formData.channels || []).includes('webhook') && (
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input 
              value={formData.webhookUrl || ''} 
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              placeholder="https://hooks.example.com/alerts"
            />
          </div>
        )}

        {(formData.channels || []).includes('email') && (
          <div className="space-y-2">
            <Label>邮件收件人（逗号分隔）</Label>
            <Input 
              value={(formData.emailRecipients || []).join(', ')} 
              onChange={(e) => setFormData({ 
                ...formData, 
                emailRecipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="admin@example.com, ops@example.com"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label>严重告警@所有人</Label>
            <p className="text-xs text-muted-foreground">严重和紧急告警时@所有人</p>
          </div>
          <Switch 
            checked={formData.mentionAll} 
            onCheckedChange={(checked) => setFormData({ ...formData, mentionAll: checked })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={() => onSave(formData)}>保存</Button>
      </DialogFooter>
    </DialogContent>
  );
};

// 主组件
export default function WorkflowAlertNotificationManager() {
  const [configs, setConfigs] = useState<AlertNotificationConfig[]>([]);
  const [alerts, setAlerts] = useState<WorkflowAlert[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<AlertNotificationConfig | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'all' | 'pending' | 'acknowledged' | 'resolved'>('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setConfigs(generateMockConfigs());
      setAlerts(generateMockAlerts());
      setLogs(generateMockLogs());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = (data: Partial<AlertNotificationConfig>) => {
    if (editingConfig) {
      setConfigs(prev => prev.map(c => c.id === editingConfig.id ? { ...c, ...data } : c));
    } else {
      const newConfig: AlertNotificationConfig = {
        ...data as AlertNotificationConfig,
        id: `config-${Date.now()}`
      };
      setConfigs(prev => [...prev, newConfig]);
    }
    setIsDialogOpen(false);
    setEditingConfig(undefined);
  };

  const handleDeleteConfig = (id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleConfig = (id: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const handleAcknowledgeAlert = (id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, acknowledgedAt: new Date().toISOString() } : a
    ));
  };

  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, resolvedAt: new Date().toISOString() } : a
    ));
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (alertFilter) {
      case 'pending': return !alert.acknowledgedAt && !alert.resolvedAt;
      case 'acknowledged': return alert.acknowledgedAt && !alert.resolvedAt;
      case 'resolved': return !!alert.resolvedAt;
      default: return true;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            告警通知管理
          </h2>
          <p className="text-muted-foreground">配置工作流监控告警的通知渠道和规则</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-1" />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待处理告警</p>
                <p className="text-2xl font-bold text-red-500">
                  {alerts.filter(a => !a.acknowledgedAt && !a.resolvedAt).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已确认</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {alerts.filter(a => a.acknowledgedAt && !a.resolvedAt).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已解决</p>
                <p className="text-2xl font-bold text-green-500">
                  {alerts.filter(a => a.resolvedAt).length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">通知配置</p>
                <p className="text-2xl font-bold">
                  {configs.filter(c => c.enabled).length}/{configs.length}
                </p>
              </div>
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">告警列表</TabsTrigger>
          <TabsTrigger value="configs">通知配置</TabsTrigger>
          <TabsTrigger value="logs">发送日志</TabsTrigger>
        </TabsList>

        {/* 告警列表 */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>告警列表</CardTitle>
                  <CardDescription>查看和处理工作流监控告警</CardDescription>
                </div>
                <Select value={alertFilter} onValueChange={(v) => setAlertFilter(v as typeof alertFilter)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="acknowledged">已确认</SelectItem>
                    <SelectItem value="resolved">已解决</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无告警</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAlerts.map(alert => (
                    <div 
                      key={alert.id}
                      className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getLevelIcon(alert.level)}
                          <span className="font-medium">{alert.title}</span>
                          <Badge variant="outline">{alert.workflowName}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.resolvedAt ? (
                            <Badge className="bg-green-500/10 text-green-500">已解决</Badge>
                          ) : alert.acknowledgedAt ? (
                            <Badge className="bg-yellow-500/10 text-yellow-500">已确认</Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-500">待处理</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>触发时间: {new Date(alert.triggeredAt).toLocaleString('zh-CN')}</span>
                        <div className="flex items-center gap-2">
                          {!alert.acknowledgedAt && !alert.resolvedAt && (
                            <Button size="sm" variant="outline" onClick={() => handleAcknowledgeAlert(alert.id)}>
                              确认
                            </Button>
                          )}
                          {!alert.resolvedAt && (
                            <Button size="sm" onClick={() => handleResolveAlert(alert.id)}>
                              解决
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知配置 */}
        <TabsContent value="configs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>通知配置</CardTitle>
                  <CardDescription>管理告警通知渠道和过滤规则</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingConfig(undefined)}>
                      <Plus className="w-4 h-4 mr-1" />
                      新建配置
                    </Button>
                  </DialogTrigger>
                  <ConfigEditDialog 
                    config={editingConfig}
                    onSave={handleSaveConfig}
                    onClose={() => {
                      setIsDialogOpen(false);
                      setEditingConfig(undefined);
                    }}
                  />
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configs.map(config => (
                  <div 
                    key={config.id}
                    className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={config.enabled}
                          onCheckedChange={() => handleToggleConfig(config.id)}
                        />
                        <span className="font-medium">{config.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingConfig(config);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteConfig(config.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">渠道:</span>
                        {config.channels.map(channel => (
                          <Badge key={channel} variant="outline" className="flex items-center gap-1">
                            {getChannelIcon(channel)}
                            {getChannelLabel(channel)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">告警级别:</span>
                      {config.levelFilter.map(level => (
                        <span key={level} className="flex items-center gap-1">
                          {getLevelIcon(level)}
                          {getLevelLabel(level)}
                        </span>
                      ))}
                    </div>
                    {config.mentionAll && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        严重告警时@所有人
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 发送日志 */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>发送日志</CardTitle>
              <CardDescription>查看告警通知发送记录</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无发送记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map(log => (
                    <div 
                      key={log.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getChannelIcon(log.channel)}
                        <div>
                          <p className="font-medium">{getChannelLabel(log.channel)}</p>
                          <p className="text-xs text-muted-foreground">
                            告警ID: {log.alertId} | 尝试次数: {log.attempts}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {log.status === 'sent' && (
                          <Badge className="bg-green-500/10 text-green-500">已发送</Badge>
                        )}
                        {log.status === 'failed' && (
                          <Badge className="bg-red-500/10 text-red-500">失败</Badge>
                        )}
                        {log.status === 'retrying' && (
                          <Badge className="bg-yellow-500/10 text-yellow-500">重试中</Badge>
                        )}
                        {log.status === 'pending' && (
                          <Badge variant="outline">待发送</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
