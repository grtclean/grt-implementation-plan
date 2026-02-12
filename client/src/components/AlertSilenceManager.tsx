/**
 * 告警静默规则管理组件
 * v2.5.20 - 维护窗口期间静默、静默规则配置、静默时间段设置
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  VolumeX, 
  Plus, 
  Clock, 
  Calendar, 
  Settings, 
  Trash2, 
  Play, 
  Pause,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  History,
  Filter
} from 'lucide-react';

// 类型定义
type SilenceType = 'maintenance' | 'scheduled' | 'manual' | 'recurring';
type SilenceStatus = 'active' | 'expired' | 'cancelled' | 'pending';
type MatchType = 'exact' | 'prefix' | 'suffix' | 'contains' | 'regex';

interface SilenceMatcher {
  field: string;
  matchType: MatchType;
  value: string;
  caseSensitive: boolean;
}

interface SilenceRule {
  id: string;
  name: string;
  description: string;
  type: SilenceType;
  status: SilenceStatus;
  enabled: boolean;
  matchers: SilenceMatcher[];
  matchMode: 'all' | 'any';
  startTime: Date;
  endTime: Date;
  silencedCount: number;
  lastSilencedAt: Date | null;
  createdAt: Date;
}

interface SilencedAlert {
  id: string;
  ruleId: string;
  alertTitle: string;
  alertLevel: string;
  alertSource: string;
  silencedAt: Date;
}

// 模拟数据
const mockRules: SilenceRule[] = [
  {
    id: 'silence-001',
    name: '周末维护窗口',
    description: '每周六凌晨2-6点的系统维护期间静默所有告警',
    type: 'recurring',
    status: 'active',
    enabled: true,
    matchers: [],
    matchMode: 'all',
    startTime: new Date(),
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    silencedCount: 156,
    lastSilencedAt: new Date(Date.now() - 30 * 60 * 1000),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'silence-002',
    name: '数据库升级维护',
    description: '数据库升级期间静默数据库相关告警',
    type: 'maintenance',
    status: 'pending',
    enabled: true,
    matchers: [
      { field: 'source', matchType: 'contains', value: 'database', caseSensitive: false }
    ],
    matchMode: 'any',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
    silencedCount: 0,
    lastSilencedAt: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'silence-003',
    name: '测试环境告警静默',
    description: '静默所有来自测试环境的告警',
    type: 'manual',
    status: 'active',
    enabled: true,
    matchers: [
      { field: 'source', matchType: 'prefix', value: 'test-', caseSensitive: false }
    ],
    matchMode: 'all',
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    silencedCount: 423,
    lastSilencedAt: new Date(Date.now() - 5 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
];

const mockSilencedAlerts: SilencedAlert[] = [
  {
    id: 'silenced-001',
    ruleId: 'silence-001',
    alertTitle: 'CPU使用率过高',
    alertLevel: 'warning',
    alertSource: 'server-01',
    silencedAt: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    id: 'silenced-002',
    ruleId: 'silence-003',
    alertTitle: '测试服务响应超时',
    alertLevel: 'critical',
    alertSource: 'test-api-server',
    silencedAt: new Date(Date.now() - 5 * 60 * 1000)
  }
];

export default function AlertSilenceManager() {
  const [rules, setRules] = useState<SilenceRule[]>(mockRules);
  const [silencedAlerts] = useState<SilencedAlert[]>(mockSilencedAlerts);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');
  
  // 新规则表单状态
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    type: 'maintenance' as SilenceType,
    matchMode: 'all' as 'all' | 'any',
    startTime: '',
    endTime: '',
    matchers: [] as SilenceMatcher[]
  });

  // 获取状态徽章
  const getStatusBadge = (status: SilenceStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">活跃</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">待生效</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">已过期</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">已取消</Badge>;
      default:
        return null;
    }
  };

  // 获取类型徽章
  const getTypeBadge = (type: SilenceType) => {
    switch (type) {
      case 'maintenance':
        return <Badge variant="outline" className="border-orange-500/50 text-orange-400">维护窗口</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-400">计划任务</Badge>;
      case 'manual':
        return <Badge variant="outline" className="border-purple-500/50 text-purple-400">手动静默</Badge>;
      case 'recurring':
        return <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">周期性</Badge>;
      default:
        return null;
    }
  };

  // 获取告警级别徽章
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400">严重</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-400">警告</Badge>;
      case 'info':
        return <Badge className="bg-blue-500/20 text-blue-400">信息</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  // 切换规则启用状态
  const toggleRuleEnabled = (ruleId: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  // 取消规则
  const cancelRule = (ruleId: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, status: 'cancelled' as SilenceStatus } : rule
    ));
  };

  // 添加匹配器
  const addMatcher = () => {
    setNewRule({
      ...newRule,
      matchers: [
        ...newRule.matchers,
        { field: 'source', matchType: 'contains', value: '', caseSensitive: false }
      ]
    });
  };

  // 删除匹配器
  const removeMatcher = (index: number) => {
    setNewRule({
      ...newRule,
      matchers: newRule.matchers.filter((_, i) => i !== index)
    });
  };

  // 更新匹配器
  const updateMatcher = (index: number, updates: Partial<SilenceMatcher>) => {
    setNewRule({
      ...newRule,
      matchers: newRule.matchers.map((m, i) => i === index ? { ...m, ...updates } : m)
    });
  };

  // 创建规则
  const handleCreateRule = () => {
    const rule: SilenceRule = {
      id: `silence-${Date.now()}`,
      name: newRule.name,
      description: newRule.description,
      type: newRule.type,
      status: 'pending',
      enabled: true,
      matchers: newRule.matchers,
      matchMode: newRule.matchMode,
      startTime: new Date(newRule.startTime),
      endTime: new Date(newRule.endTime),
      silencedCount: 0,
      lastSilencedAt: null,
      createdAt: new Date()
    };
    
    setRules([rule, ...rules]);
    setIsCreateDialogOpen(false);
    setNewRule({
      name: '',
      description: '',
      type: 'maintenance',
      matchMode: 'all',
      startTime: '',
      endTime: '',
      matchers: []
    });
  };

  // 统计数据
  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter(r => r.status === 'active').length,
    pendingRules: rules.filter(r => r.status === 'pending').length,
    totalSilenced: rules.reduce((sum, r) => sum + r.silencedCount, 0)
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <VolumeX className="w-6 h-6 text-primary" />
            告警静默规则管理
          </h1>
          <p className="text-muted-foreground mt-1">
            配置维护窗口和静默规则，避免计划内维护期间的告警干扰
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              创建静默规则
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建静默规则</DialogTitle>
              <DialogDescription>
                配置告警静默规则，在指定时间段内静默匹配的告警
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>规则名称</Label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="例如：周末维护窗口"
                  />
                </div>
                <div className="space-y-2">
                  <Label>规则类型</Label>
                  <Select
                    value={newRule.type}
                    onValueChange={(v) => setNewRule({ ...newRule, type: v as SilenceType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">维护窗口</SelectItem>
                      <SelectItem value="scheduled">计划任务</SelectItem>
                      <SelectItem value="manual">手动静默</SelectItem>
                      <SelectItem value="recurring">周期性</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="描述此静默规则的用途..."
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始时间</Label>
                  <Input
                    type="datetime-local"
                    value={newRule.startTime}
                    onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Input
                    type="datetime-local"
                    value={newRule.endTime}
                    onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })}
                  />
                </div>
              </div>
              
              {/* 匹配条件 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>匹配条件</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={newRule.matchMode}
                      onValueChange={(v) => setNewRule({ ...newRule, matchMode: v as 'all' | 'any' })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部匹配</SelectItem>
                        <SelectItem value="any">任一匹配</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={addMatcher}>
                      <Plus className="w-4 h-4 mr-1" />
                      添加条件
                    </Button>
                  </div>
                </div>
                
                {newRule.matchers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                    未设置匹配条件，将静默所有告警
                  </p>
                ) : (
                  <div className="space-y-2">
                    {newRule.matchers.map((matcher, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <Select
                          value={matcher.field}
                          onValueChange={(v) => updateMatcher(index, { field: v })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="source">来源</SelectItem>
                            <SelectItem value="alertLevel">级别</SelectItem>
                            <SelectItem value="title">标题</SelectItem>
                            <SelectItem value="message">消息</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={matcher.matchType}
                          onValueChange={(v) => updateMatcher(index, { matchType: v as MatchType })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exact">等于</SelectItem>
                            <SelectItem value="contains">包含</SelectItem>
                            <SelectItem value="prefix">前缀</SelectItem>
                            <SelectItem value="suffix">后缀</SelectItem>
                            <SelectItem value="regex">正则</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Input
                          className="flex-1"
                          value={matcher.value}
                          onChange={(e) => updateMatcher(index, { value: e.target.value })}
                          placeholder="匹配值"
                        />
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMatcher(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateRule} disabled={!newRule.name || !newRule.startTime || !newRule.endTime}>
                  创建规则
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总规则数</p>
                <p className="text-2xl font-bold">{stats.totalRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">活跃规则</p>
                <p className="text-2xl font-bold">{stats.activeRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Timer className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">待生效</p>
                <p className="text-2xl font-bold">{stats.pendingRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <VolumeX className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已静默告警</p>
                <p className="text-2xl font-bold">{stats.totalSilenced}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            静默规则
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            静默历史
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      {getStatusBadge(rule.status)}
                      {getTypeBadge(rule.type)}
                    </div>
                    <CardDescription>{rule.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRuleEnabled(rule.id)}
                      disabled={rule.status === 'cancelled' || rule.status === 'expired'}
                    />
                    {rule.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelRule(rule.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        取消
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      开始时间
                    </p>
                    <p className="font-medium">{rule.startTime.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      结束时间
                    </p>
                    <p className="font-medium">{rule.endTime.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <VolumeX className="w-4 h-4" />
                      已静默
                    </p>
                    <p className="font-medium">{rule.silencedCount} 条告警</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      最后静默
                    </p>
                    <p className="font-medium">
                      {rule.lastSilencedAt ? rule.lastSilencedAt.toLocaleString() : '-'}
                    </p>
                  </div>
                </div>
                
                {rule.matchers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Filter className="w-4 h-4" />
                      匹配条件 ({rule.matchMode === 'all' ? '全部匹配' : '任一匹配'})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rule.matchers.map((matcher, index) => (
                        <Badge key={index} variant="outline" className="font-mono text-xs">
                          {matcher.field} {matcher.matchType} "{matcher.value}"
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">最近被静默的告警</CardTitle>
              <CardDescription>显示最近被静默规则拦截的告警记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {silencedAlerts.map((alert) => {
                  const rule = rules.find(r => r.id === alert.ruleId);
                  return (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-medium">{alert.alertTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            来源: {alert.alertSource} | 规则: {rule?.name || '未知'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getLevelBadge(alert.alertLevel)}
                        <span className="text-sm text-muted-foreground">
                          {alert.silencedAt.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {silencedAlerts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    暂无被静默的告警记录
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
