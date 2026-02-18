/**
 * 系统告警通知管理页面
 * v2.5.23 - 健康检查异常自动告警
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  Eye,
  Send,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, StatCard } from "@/components/grt";

// 类型定义
type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';
type NotificationChannel = 'email' | 'wechat' | 'dingtalk' | 'feishu' | 'webhook';
type AlertCategory = 'system' | 'database' | 'disk' | 'memory' | 'cpu' | 'network' | 'service';

interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  enabled: boolean;
  level: AlertLevel;
  metric: string;
  threshold: number;
  channels: NotificationChannel[];
}

interface Alert {
  id: string;
  ruleName: string;
  level: AlertLevel;
  category: AlertCategory;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: number;
}

interface NotificationConfig {
  id: string;
  channel: NotificationChannel;
  name: string;
  enabled: boolean;
}

export default function SystemAlertNotificationManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('alerts');
  
  // 模拟数据
  const [rules, setRules] = useState<AlertRule[]>([
    {
      id: 'rule-1',
      name: 'CPU使用率过高',
      category: 'cpu',
      enabled: true,
      level: 'warning',
      metric: 'cpu_usage',
      threshold: 80,
      channels: ['email', 'wechat'],
    },
    {
      id: 'rule-2',
      name: '内存使用率过高',
      category: 'memory',
      enabled: true,
      level: 'critical',
      metric: 'memory_usage',
      threshold: 90,
      channels: ['email', 'wechat', 'dingtalk'],
    },
    {
      id: 'rule-3',
      name: '磁盘空间不足',
      category: 'disk',
      enabled: true,
      level: 'emergency',
      metric: 'disk_usage',
      threshold: 95,
      channels: ['email', 'wechat', 'dingtalk'],
    },
    {
      id: 'rule-4',
      name: '数据库连接失败',
      category: 'database',
      enabled: true,
      level: 'critical',
      metric: 'db_connection',
      threshold: 0,
      channels: ['email', 'wechat'],
    },
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alert-1',
      ruleName: 'CPU使用率过高',
      level: 'warning',
      category: 'cpu',
      message: 'CPU使用率 85% 超过阈值 80%',
      status: 'active',
      triggeredAt: Date.now() - 300000,
    },
    {
      id: 'alert-2',
      ruleName: '磁盘空间不足',
      level: 'emergency',
      category: 'disk',
      message: '磁盘使用率 96% 超过阈值 95%',
      status: 'acknowledged',
      triggeredAt: Date.now() - 3600000,
    },
  ]);

  const [notificationConfigs, setNotificationConfigs] = useState<NotificationConfig[]>([
    { id: 'config-1', channel: 'email', name: '邮件通知', enabled: true },
    { id: 'config-2', channel: 'wechat', name: '企业微信', enabled: true },
    { id: 'config-3', channel: 'dingtalk', name: '钉钉机器人', enabled: false },
    { id: 'config-4', channel: 'feishu', name: '飞书机器人', enabled: false },
  ]);

  // 对话框状态
  const [showAddRuleDialog, setShowAddRuleDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<NotificationConfig | null>(null);

  // 表单状态
  const [ruleForm, setRuleForm] = useState({
    name: '',
    category: 'cpu' as AlertCategory,
    level: 'warning' as AlertLevel,
    metric: '',
    threshold: 80,
    channels: [] as NotificationChannel[],
  });

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 获取级别徽章
  const getLevelBadge = (level: AlertLevel) => {
    const variants: Record<AlertLevel, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; text: string }> = {
      info: { variant: 'outline', text: '信息' },
      warning: { variant: 'secondary', text: '警告' },
      critical: { variant: 'destructive', text: '严重' },
      emergency: { variant: 'destructive', text: '紧急' },
    };
    const config = variants[level];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  // 获取状态徽章
  const getStatusBadge = (status: Alert['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />活跃</Badge>;
      case 'acknowledged':
        return <Badge variant="secondary"><Eye className="w-3 h-3 mr-1" />已确认</Badge>;
      case 'resolved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />已解决</Badge>;
    }
  };

  // 获取渠道图标
  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'wechat':
      case 'dingtalk':
      case 'feishu':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // 获取渠道名称
  const getChannelName = (channel: NotificationChannel) => {
    const names: Record<NotificationChannel, string> = {
      email: '邮件',
      wechat: '企业微信',
      dingtalk: '钉钉',
      feishu: '飞书',
      webhook: 'Webhook',
    };
    return names[channel];
  };

  // 获取分类名称
  const getCategoryName = (category: AlertCategory) => {
    const names: Record<AlertCategory, string> = {
      system: '系统',
      database: '数据库',
      disk: '磁盘',
      memory: '内存',
      cpu: 'CPU',
      network: '网络',
      service: '服务',
    };
    return names[category];
  };

  // 切换规则启用状态
  const toggleRuleEnabled = (id: string) => {
    setRules(rules.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  // 删除规则
  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    toast({ title: '规则已删除' });
  };

  // 确认告警
  const acknowledgeAlert = (id: string) => {
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, status: 'acknowledged' } : a
    ));
    toast({ title: '告警已确认' });
  };

  // 解决告警
  const resolveAlert = (id: string) => {
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, status: 'resolved' } : a
    ));
    toast({ title: '告警已解决' });
  };

  // 切换通知配置启用状态
  const toggleConfigEnabled = (id: string) => {
    setNotificationConfigs(notificationConfigs.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  // 测试通知配置
  const testNotificationConfig = (id: string) => {
    toast({ title: '测试通知', description: '正在发送测试通知...' });
    setTimeout(() => {
      toast({ title: '发送成功', description: '测试通知已发送' });
    }, 1000);
  };

  // 添加规则
  const handleAddRule = () => {
    const newRule: AlertRule = {
      id: `rule-${Date.now()}`,
      enabled: true,
      ...ruleForm,
    };
    setRules([...rules, newRule]);
    setShowAddRuleDialog(false);
    setRuleForm({
      name: '',
      category: 'cpu',
      level: 'warning',
      metric: '',
      threshold: 80,
      channels: [],
    });
    toast({ title: '规则已添加' });
  };

  // 计算统计数据
  const stats = {
    totalRules: rules.length,
    enabledRules: rules.filter(r => r.enabled).length,
    activeAlerts: alerts.filter(a => a.status === 'active').length,
    acknowledgedAlerts: alerts.filter(a => a.status === 'acknowledged').length,
    resolvedAlerts: alerts.filter(a => a.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="系统告警通知"
        description="配置告警规则和通知渠道，实时监控系统健康状态"
        actions={
          <Button onClick={() => setShowAddRuleDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加规则
          </Button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard icon={Settings} label="告警规则" value={`${stats.enabledRules}/${stats.totalRules}`} />
        <StatCard icon={AlertTriangle} label="活跃告警" value={stats.activeAlerts} iconColor="text-destructive" iconBg="bg-destructive/10" />
        <StatCard icon={Eye} label="已确认" value={stats.acknowledgedAlerts} />
        <StatCard icon={CheckCircle} label="已解决" value={stats.resolvedAlerts} iconColor="text-green-600" iconBg="bg-green-500/10" />
        <StatCard icon={Send} label="通知渠道" value={`${notificationConfigs.filter(c => c.enabled).length}/${notificationConfigs.length}`} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts">
            告警列表
            {stats.activeAlerts > 0 && (
              <Badge variant="destructive" className="ml-2">{stats.activeAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules">告警规则</TabsTrigger>
          <TabsTrigger value="channels">通知渠道</TabsTrigger>
        </TabsList>

        {/* 告警列表 */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>告警列表</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无告警
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>规则名称</TableHead>
                      <TableHead>级别</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>消息</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>触发时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map(alert => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.ruleName}</TableCell>
                        <TableCell>{getLevelBadge(alert.level)}</TableCell>
                        <TableCell>{getCategoryName(alert.category)}</TableCell>
                        <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                        <TableCell>{getStatusBadge(alert.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(alert.triggeredAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {alert.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                确认
                              </Button>
                            )}
                            {alert.status !== 'resolved' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resolveAlert(alert.id)}
                              >
                                解决
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警规则 */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>告警规则配置</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>规则名称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>阈值</TableHead>
                    <TableHead>通知渠道</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{getCategoryName(rule.category)}</TableCell>
                      <TableCell>{getLevelBadge(rule.level)}</TableCell>
                      <TableCell>{rule.threshold}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rule.channels.map(channel => (
                            <Badge key={channel} variant="outline" className="text-xs">
                              {getChannelName(channel)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRuleEnabled(rule.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知渠道 */}
        <TabsContent value="channels">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notificationConfigs.map(config => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(config.channel)}
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={() => toggleConfigEnabled(config.id)}
                    />
                  </div>
                  <CardDescription>
                    {getChannelName(config.channel)}通知渠道
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedConfig(config);
                        setShowConfigDialog(true);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      配置
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => testNotificationConfig(config.id)}
                      disabled={!config.enabled}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      测试
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 添加规则对话框 */}
      <Dialog open={showAddRuleDialog} onOpenChange={setShowAddRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加告警规则</DialogTitle>
            <DialogDescription>
              配置告警触发条件和通知方式
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input
                placeholder="例如：CPU使用率过高"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={ruleForm.category}
                  onValueChange={(value: AlertCategory) => setRuleForm({ ...ruleForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpu">CPU</SelectItem>
                    <SelectItem value="memory">内存</SelectItem>
                    <SelectItem value="disk">磁盘</SelectItem>
                    <SelectItem value="database">数据库</SelectItem>
                    <SelectItem value="network">网络</SelectItem>
                    <SelectItem value="service">服务</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>级别</Label>
                <Select
                  value={ruleForm.level}
                  onValueChange={(value: AlertLevel) => setRuleForm({ ...ruleForm, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">信息</SelectItem>
                    <SelectItem value="warning">警告</SelectItem>
                    <SelectItem value="critical">严重</SelectItem>
                    <SelectItem value="emergency">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>阈值 (%)</Label>
              <Input
                type="number"
                value={ruleForm.threshold}
                onChange={(e) => setRuleForm({ ...ruleForm, threshold: parseInt(e.target.value) })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRuleDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddRule}>
              添加规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
