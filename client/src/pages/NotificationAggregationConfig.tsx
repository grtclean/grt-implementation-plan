/**
 * 消息聚合规则配置页面
 * 支持时间窗口设置、消息数量阈值、聚合策略管理
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, Save, RotateCcw, Clock, Hash, Layers, Bell, 
  TrendingUp, AlertCircle, CheckCircle2, Info 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 聚合规则配置
interface AggregationRule {
  id: string;
  name: string;
  enabled: boolean;
  timeWindowMinutes: number;
  maxMessagesPerWindow: number;
  strategy: 'time' | 'count' | 'hybrid';
  channels: string[];
  priority: 'low' | 'medium' | 'high';
  minInterval: number; // 最小发送间隔（秒）
  description?: string;
}

// 聚合策略选项
const STRATEGY_OPTIONS = [
  { value: 'time', label: '时间窗口', description: '在指定时间窗口内聚合所有消息' },
  { value: 'count', label: '数量阈值', description: '达到指定消息数量后立即发送' },
  { value: 'hybrid', label: '混合模式', description: '时间窗口或数量阈值任一满足即发送' },
];

// 通知渠道选项
const CHANNEL_OPTIONS = [
  { value: 'email', label: '邮件', icon: '📧' },
  { value: 'wechat', label: '企业微信', icon: '💬' },
  { value: 'dingtalk', label: '钉钉', icon: '📱' },
  { value: 'feishu', label: '飞书', icon: '🚀' },
  { value: 'webhook', label: 'Webhook', icon: '🔗' },
];

// 默认规则
const DEFAULT_RULES: AggregationRule[] = [
  {
    id: 'rule-1',
    name: '设备保养提醒',
    enabled: true,
    timeWindowMinutes: 60,
    maxMessagesPerWindow: 10,
    strategy: 'hybrid',
    channels: ['email', 'wechat'],
    priority: 'high',
    minInterval: 3600,
    description: '设备保养相关通知的聚合规则'
  },
  {
    id: 'rule-2',
    name: '系统通知',
    enabled: true,
    timeWindowMinutes: 30,
    maxMessagesPerWindow: 5,
    strategy: 'time',
    channels: ['email'],
    priority: 'medium',
    minInterval: 1800,
    description: '系统级通知的聚合规则'
  },
  {
    id: 'rule-3',
    name: '工作流执行结果',
    enabled: false,
    timeWindowMinutes: 15,
    maxMessagesPerWindow: 3,
    strategy: 'count',
    channels: ['wechat', 'dingtalk'],
    priority: 'low',
    minInterval: 900,
    description: '工作流执行结果通知的聚合规则'
  },
];

export default function NotificationAggregationConfig() {
  const [rules, setRules] = useState<AggregationRule[]>(DEFAULT_RULES);
  const [selectedRuleId, setSelectedRuleId] = useState<string>(DEFAULT_RULES[0].id);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const selectedRule = rules.find(r => r.id === selectedRuleId);

  // 更新规则
  const updateRule = (id: string, updates: Partial<AggregationRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    setHasChanges(true);
  };

  // 保存配置
  const handleSave = () => {
    // TODO: 调用API保存配置
    console.log('保存聚合规则:', rules);
    toast({
      title: '保存成功',
      description: '消息聚合规则已更新',
    });
    setHasChanges(false);
  };

  // 重置配置
  const handleReset = () => {
    setRules(DEFAULT_RULES);
    setHasChanges(false);
    toast({
      title: '已重置',
      description: '配置已恢复为默认值',
    });
  };

  // 获取策略描述
  const getStrategyDescription = (strategy: string) => {
    return STRATEGY_OPTIONS.find(s => s.value === strategy)?.description || '';
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  if (!selectedRule) return null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            消息聚合规则配置
          </h1>
          <p className="text-muted-foreground mt-2">
            管理通知消息的聚合策略，防止消息轰炸并优化通知体验
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-500">
              <AlertCircle className="h-3 w-3 mr-1" />
              未保存
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-1" />
            保存配置
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总规则数</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已启用</p>
                <p className="text-2xl font-bold text-green-500">
                  {rules.filter(r => r.enabled).length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均时间窗口</p>
                <p className="text-2xl font-bold">
                  {Math.round(rules.reduce((sum, r) => sum + r.timeWindowMinutes, 0) / rules.length)}分钟
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">覆盖渠道</p>
                <p className="text-2xl font-bold">
                  {new Set(rules.flatMap(r => r.channels)).size}
                </p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 规则列表 */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>规则列表</CardTitle>
            <CardDescription>选择要配置的聚合规则</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRuleId === rule.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedRuleId(rule.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{rule.name}</span>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={getPriorityColor(rule.priority)}>
                    {rule.priority}
                  </Badge>
                  <span>{rule.timeWindowMinutes}分钟</span>
                  <span>·</span>
                  <span>{rule.maxMessagesPerWindow}条</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 规则配置 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedRule.name}</CardTitle>
                <CardDescription>{selectedRule.description}</CardDescription>
              </div>
              <Badge variant={selectedRule.enabled ? 'default' : 'secondary'}>
                {selectedRule.enabled ? '已启用' : '已禁用'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基础配置</TabsTrigger>
                <TabsTrigger value="strategy">聚合策略</TabsTrigger>
                <TabsTrigger value="channels">通知渠道</TabsTrigger>
              </TabsList>

              {/* 基础配置 */}
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">规则名称</Label>
                  <Input
                    id="rule-name"
                    value={selectedRule.name}
                    onChange={(e) => updateRule(selectedRule.id, { name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-desc">规则描述</Label>
                  <Input
                    id="rule-desc"
                    value={selectedRule.description || ''}
                    onChange={(e) => updateRule(selectedRule.id, { description: e.target.value })}
                    placeholder="简要描述此规则的用途"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">优先级</Label>
                  <Select
                    value={selectedRule.priority}
                    onValueChange={(value: any) => updateRule(selectedRule.id, { priority: value })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低优先级</SelectItem>
                      <SelectItem value="medium">中优先级</SelectItem>
                      <SelectItem value="high">高优先级</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    高优先级规则将优先处理和发送
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>启用规则</Label>
                    <Switch
                      checked={selectedRule.enabled}
                      onCheckedChange={(checked) => updateRule(selectedRule.id, { enabled: checked })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    禁用后，此规则将不会生效
                  </p>
                </div>
              </TabsContent>

              {/* 聚合策略 */}
              <TabsContent value="strategy" className="space-y-4">
                <div className="space-y-2">
                  <Label>聚合策略</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {STRATEGY_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedRule.strategy === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => updateRule(selectedRule.id, { strategy: option.value as any })}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    当前策略: {getStrategyDescription(selectedRule.strategy)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-window">
                    时间窗口: {selectedRule.timeWindowMinutes} 分钟
                  </Label>
                  <Slider
                    id="time-window"
                    min={5}
                    max={120}
                    step={5}
                    value={[selectedRule.timeWindowMinutes]}
                    onValueChange={([value]) => updateRule(selectedRule.id, { timeWindowMinutes: value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    在此时间窗口内收集的消息将被聚合
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-messages">
                    消息数量阈值: {selectedRule.maxMessagesPerWindow} 条
                  </Label>
                  <Slider
                    id="max-messages"
                    min={1}
                    max={50}
                    step={1}
                    value={[selectedRule.maxMessagesPerWindow]}
                    onValueChange={([value]) => updateRule(selectedRule.id, { maxMessagesPerWindow: value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    达到此数量后将触发聚合发送
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-interval">
                    最小发送间隔: {Math.round(selectedRule.minInterval / 60)} 分钟
                  </Label>
                  <Slider
                    id="min-interval"
                    min={300}
                    max={7200}
                    step={300}
                    value={[selectedRule.minInterval]}
                    onValueChange={([value]) => updateRule(selectedRule.id, { minInterval: value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    两次发送之间的最小时间间隔，防止频繁通知
                  </p>
                </div>
              </TabsContent>

              {/* 通知渠道 */}
              <TabsContent value="channels" className="space-y-4">
                <div className="space-y-2">
                  <Label>选择通知渠道</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHANNEL_OPTIONS.map((channel) => {
                      const isSelected = selectedRule.channels.includes(channel.value);
                      return (
                        <div
                          key={channel.value}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            const newChannels = isSelected
                              ? selectedRule.channels.filter(c => c !== channel.value)
                              : [...selectedRule.channels, channel.value];
                            updateRule(selectedRule.id, { channels: newChannels });
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{channel.icon}</span>
                            <span className="font-medium">{channel.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    已选择 {selectedRule.channels.length} 个渠道
                  </p>
                </div>

                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">渠道说明</p>
                        <ul className="space-y-1 text-xs">
                          <li>• 邮件: 适合详细内容和正式通知</li>
                          <li>• 企业微信/钉钉/飞书: 适合即时消息和团队协作</li>
                          <li>• Webhook: 适合系统集成和自定义处理</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 预览效果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            聚合效果预览
          </CardTitle>
          <CardDescription>
            基于当前配置，以下是消息聚合的预期效果
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-1">预计聚合率</div>
                <div className="text-2xl font-bold">
                  {Math.round((1 - 1 / selectedRule.maxMessagesPerWindow) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  相比单独发送，减少约 {Math.round((1 - 1 / selectedRule.maxMessagesPerWindow) * 100)}% 的通知数量
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-1">最大延迟时间</div>
                <div className="text-2xl font-bold">
                  {selectedRule.timeWindowMinutes}分钟
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  消息最多延迟 {selectedRule.timeWindowMinutes} 分钟后发送
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-1">发送频率限制</div>
                <div className="text-2xl font-bold">
                  {Math.round(selectedRule.minInterval / 60)}分钟
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  最少每 {Math.round(selectedRule.minInterval / 60)} 分钟发送一次
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-dashed">
              <div className="text-sm font-medium mb-2">示例场景</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  • 如果在 {selectedRule.timeWindowMinutes} 分钟内收到 {selectedRule.maxMessagesPerWindow} 条消息，
                  将立即聚合发送
                </p>
                <p>
                  • 如果在 {selectedRule.timeWindowMinutes} 分钟内收到少于 {selectedRule.maxMessagesPerWindow} 条消息，
                  将在时间窗口结束时聚合发送
                </p>
                <p>
                  • 两次发送之间至少间隔 {Math.round(selectedRule.minInterval / 60)} 分钟，
                  避免频繁通知
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
