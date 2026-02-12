/**
 * 告警升级管理组件
 * v2.5.19 - 告警升级策略配置、升级状态监控、多级通知管理
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  Clock, 
  Plus, 
  Settings, 
  TrendingUp,
  Users,
  Zap,
  ArrowUp,
  Eye,
  Check,
  X
} from 'lucide-react';

type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';
type EscalationStatus = 'pending' | 'escalated' | 'acknowledged' | 'resolved' | 'expired';

interface EscalationLevel {
  level: number;
  alertLevel: AlertLevel;
  waitTimeMinutes: number;
  notifyChannels: string[];
  notifyUsers: string[];
  mentionAll: boolean;
  repeatNotification: boolean;
  repeatIntervalMinutes: number;
}

interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  levels: EscalationLevel[];
  defaultNotifyChannels: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface EscalatedAlert {
  id: string;
  originalAlertId: string;
  policyId: string;
  currentLevel: number;
  maxLevel: number;
  status: EscalationStatus;
  alertLevel: AlertLevel;
  title: string;
  message: string;
  source: string;
  createdAt: Date;
  lastEscalatedAt: Date | null;
  nextEscalationAt: Date | null;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
}

// 模拟数据
const mockPolicies: EscalationPolicy[] = [
  {
    id: 'default',
    name: '默认升级策略',
    description: '标准告警升级策略，从警告到紧急逐级升级',
    enabled: true,
    levels: [
      { level: 1, alertLevel: 'warning', waitTimeMinutes: 15, notifyChannels: ['system'], notifyUsers: [], mentionAll: false, repeatNotification: false, repeatIntervalMinutes: 0 },
      { level: 2, alertLevel: 'critical', waitTimeMinutes: 30, notifyChannels: ['system', 'email'], notifyUsers: [], mentionAll: false, repeatNotification: true, repeatIntervalMinutes: 15 },
      { level: 3, alertLevel: 'emergency', waitTimeMinutes: 60, notifyChannels: ['system', 'email', 'webhook'], notifyUsers: [], mentionAll: true, repeatNotification: true, repeatIntervalMinutes: 10 }
    ],
    defaultNotifyChannels: ['system'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'urgent',
    name: '紧急升级策略',
    description: '快速升级策略，适用于关键业务告警',
    enabled: true,
    levels: [
      { level: 1, alertLevel: 'critical', waitTimeMinutes: 5, notifyChannels: ['system', 'email'], notifyUsers: [], mentionAll: false, repeatNotification: false, repeatIntervalMinutes: 0 },
      { level: 2, alertLevel: 'emergency', waitTimeMinutes: 10, notifyChannels: ['system', 'email', 'webhook'], notifyUsers: [], mentionAll: true, repeatNotification: true, repeatIntervalMinutes: 5 }
    ],
    defaultNotifyChannels: ['system', 'email'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockAlerts: EscalatedAlert[] = [
  {
    id: 'esc-1',
    originalAlertId: 'alert-001',
    policyId: 'default',
    currentLevel: 2,
    maxLevel: 3,
    status: 'escalated',
    alertLevel: 'critical',
    title: '工作流执行超时',
    message: '工作流 WF-001 执行时间超过阈值',
    source: 'workflow-engine',
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
    lastEscalatedAt: new Date(Date.now() - 15 * 60 * 1000),
    nextEscalationAt: new Date(Date.now() + 15 * 60 * 1000),
    acknowledgedAt: null,
    acknowledgedBy: null
  },
  {
    id: 'esc-2',
    originalAlertId: 'alert-002',
    policyId: 'urgent',
    currentLevel: 1,
    maxLevel: 2,
    status: 'pending',
    alertLevel: 'critical',
    title: '数据库连接池耗尽',
    message: '数据库连接池使用率达到100%',
    source: 'database-monitor',
    createdAt: new Date(Date.now() - 3 * 60 * 1000),
    lastEscalatedAt: null,
    nextEscalationAt: new Date(Date.now() + 2 * 60 * 1000),
    acknowledgedAt: null,
    acknowledgedBy: null
  },
  {
    id: 'esc-3',
    originalAlertId: 'alert-003',
    policyId: 'default',
    currentLevel: 1,
    maxLevel: 3,
    status: 'acknowledged',
    alertLevel: 'warning',
    title: '磁盘空间不足',
    message: '服务器磁盘使用率超过85%',
    source: 'system-monitor',
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    lastEscalatedAt: null,
    nextEscalationAt: null,
    acknowledgedAt: new Date(Date.now() - 30 * 60 * 1000),
    acknowledgedBy: 'admin'
  }
];

const alertLevelConfig: Record<AlertLevel, { label: string; color: string; bgColor: string }> = {
  info: { label: '信息', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  warning: { label: '警告', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  critical: { label: '严重', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  emergency: { label: '紧急', color: 'text-red-600', bgColor: 'bg-red-100' }
};

const statusConfig: Record<EscalationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待处理', variant: 'secondary' },
  escalated: { label: '已升级', variant: 'destructive' },
  acknowledged: { label: '已确认', variant: 'default' },
  resolved: { label: '已解决', variant: 'outline' },
  expired: { label: '已过期', variant: 'outline' }
};

export default function AlertEscalationManager() {
  const [policies] = useState<EscalationPolicy[]>(mockPolicies);
  const [alerts, setAlerts] = useState<EscalatedAlert[]>(mockAlerts);
  const [selectedPolicy, setSelectedPolicy] = useState<EscalationPolicy | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<EscalatedAlert | null>(null);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);

  // 统计数据
  const stats = {
    totalPolicies: policies.length,
    activePolicies: policies.filter(p => p.enabled).length,
    totalAlerts: alerts.length,
    pendingAlerts: alerts.filter(a => a.status === 'pending').length,
    escalatedAlerts: alerts.filter(a => a.status === 'escalated').length,
    acknowledgedAlerts: alerts.filter(a => a.status === 'acknowledged').length
  };

  // 确认告警
  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, status: 'acknowledged' as EscalationStatus, acknowledgedAt: new Date(), acknowledgedBy: 'current-user', nextEscalationAt: null }
        : a
    ));
  };

  // 解决告警
  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, status: 'resolved' as EscalationStatus, resolvedAt: new Date(), resolvedBy: 'current-user', nextEscalationAt: null }
        : a
    ));
  };

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  // 计算剩余时间
  const getTimeRemaining = (date: Date | null) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return '即将升级';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分钟`;
    return `${Math.floor(minutes / 60)}小时${minutes % 60}分钟`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">告警升级管理</h1>
          <p className="text-muted-foreground">配置告警升级策略，管理未确认告警的自动升级</p>
        </div>
        <Button onClick={() => setShowPolicyDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建策略
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">升级策略</p>
                <p className="text-2xl font-bold">{stats.totalPolicies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已启用</p>
                <p className="text-2xl font-bold">{stats.activePolicies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">待处理</p>
                <p className="text-2xl font-bold">{stats.pendingAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已升级</p>
                <p className="text-2xl font-bold">{stats.escalatedAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已确认</p>
                <p className="text-2xl font-bold">{stats.acknowledgedAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总告警</p>
                <p className="text-2xl font-bold">{stats.totalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">告警列表</TabsTrigger>
          <TabsTrigger value="policies">升级策略</TabsTrigger>
          <TabsTrigger value="timeline">升级时间线</TabsTrigger>
        </TabsList>

        {/* 告警列表 */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>待处理告警</CardTitle>
              <CardDescription>需要确认或已升级的告警列表</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>告警</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>升级进度</TableHead>
                    <TableHead>下次升级</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map(alert => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.source}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${alertLevelConfig[alert.alertLevel].bgColor} ${alertLevelConfig[alert.alertLevel].color}`}>
                          {alertLevelConfig[alert.alertLevel].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[alert.status].variant}>
                          {statusConfig[alert.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={(alert.currentLevel / alert.maxLevel) * 100} className="w-20" />
                          <span className="text-sm text-muted-foreground">
                            {alert.currentLevel}/{alert.maxLevel}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.nextEscalationAt ? (
                          <div className="flex items-center gap-1 text-orange-600">
                            <ArrowUp className="w-4 h-4" />
                            <span className="text-sm">{getTimeRemaining(alert.nextEscalationAt)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(alert.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setShowAlertDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {alert.status !== 'acknowledged' && alert.status !== 'resolved' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              确认
                            </Button>
                          )}
                          {alert.status !== 'resolved' && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleResolve(alert.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              解决
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 升级策略 */}
        <TabsContent value="policies">
          <div className="grid gap-4">
            {policies.map(policy => (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{policy.name}</CardTitle>
                      <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                        {policy.enabled ? '已启用' : '已禁用'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={policy.enabled} />
                      <Button variant="outline" size="sm" onClick={() => setSelectedPolicy(policy)}>
                        <Settings className="w-4 h-4 mr-1" />
                        配置
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{policy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {policy.levels.map((level, index) => (
                      <div key={level.level} className="flex items-center">
                        <div className={`p-3 rounded-lg border ${alertLevelConfig[level.alertLevel].bgColor}`}>
                          <div className="flex items-center gap-2">
                            <Zap className={`w-4 h-4 ${alertLevelConfig[level.alertLevel].color}`} />
                            <span className={`font-medium ${alertLevelConfig[level.alertLevel].color}`}>
                              L{level.level}: {alertLevelConfig[level.alertLevel].label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            等待 {level.waitTimeMinutes} 分钟
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {level.notifyChannels.map(ch => (
                              <Badge key={ch} variant="outline" className="text-xs">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {index < policy.levels.length - 1 && (
                          <ArrowUp className="w-6 h-6 text-muted-foreground mx-2 rotate-90" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 升级时间线 */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>升级时间线</CardTitle>
              <CardDescription>即将发生的告警升级事件</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts
                  .filter(a => a.nextEscalationAt && (a.status === 'pending' || a.status === 'escalated'))
                  .sort((a, b) => (a.nextEscalationAt?.getTime() || 0) - (b.nextEscalationAt?.getTime() || 0))
                  .map(alert => (
                    <div key={alert.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className={`p-2 rounded-full ${alertLevelConfig[alert.alertLevel].bgColor}`}>
                        <ArrowUp className={`w-5 h-5 ${alertLevelConfig[alert.alertLevel].color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">
                          将在 {getTimeRemaining(alert.nextEscalationAt)} 后升级到 L{alert.currentLevel + 1}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${alertLevelConfig[alert.alertLevel].bgColor} ${alertLevelConfig[alert.alertLevel].color}`}>
                          当前 L{alert.currentLevel}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => handleAcknowledge(alert.id)}>
                          确认
                        </Button>
                      </div>
                    </div>
                  ))}
                {alerts.filter(a => a.nextEscalationAt && (a.status === 'pending' || a.status === 'escalated')).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无即将升级的告警</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 告警详情对话框 */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>告警详情</DialogTitle>
            <DialogDescription>查看告警的详细信息和升级历史</DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">告警标题</Label>
                  <p className="font-medium">{selectedAlert.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">来源</Label>
                  <p>{selectedAlert.source}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">当前级别</Label>
                  <Badge className={`${alertLevelConfig[selectedAlert.alertLevel].bgColor} ${alertLevelConfig[selectedAlert.alertLevel].color}`}>
                    {alertLevelConfig[selectedAlert.alertLevel].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge variant={statusConfig[selectedAlert.status].variant}>
                    {statusConfig[selectedAlert.status].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">创建时间</Label>
                  <p>{formatTime(selectedAlert.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">下次升级</Label>
                  <p>{selectedAlert.nextEscalationAt ? formatTime(selectedAlert.nextEscalationAt) : '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">告警消息</Label>
                <p className="p-3 bg-muted rounded-lg mt-1">{selectedAlert.message}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">升级进度</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={(selectedAlert.currentLevel / selectedAlert.maxLevel) * 100} className="flex-1" />
                  <span className="text-sm font-medium">
                    {selectedAlert.currentLevel}/{selectedAlert.maxLevel}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlertDialog(false)}>
              关闭
            </Button>
            {selectedAlert && selectedAlert.status !== 'resolved' && (
              <Button onClick={() => {
                handleResolve(selectedAlert.id);
                setShowAlertDialog(false);
              }}>
                <CheckCircle className="w-4 h-4 mr-1" />
                标记为已解决
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建策略对话框 */}
      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建升级策略</DialogTitle>
            <DialogDescription>配置告警升级的级别和通知规则</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>策略名称</Label>
                <Input placeholder="输入策略名称" />
              </div>
              <div>
                <Label>默认通知渠道</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择通知渠道" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">系统通知</SelectItem>
                    <SelectItem value="email">邮件</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>策略描述</Label>
              <Input placeholder="输入策略描述" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="enabled" defaultChecked />
              <Label htmlFor="enabled">启用策略</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPolicyDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setShowPolicyDialog(false)}>
              创建策略
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
