/**
 * 同步冲突通知配置组件
 * v1.3.83 - 通知设置面板
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  BellOff,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  Save,
  RotateCcw,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 类型定义
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

interface NotificationConfig {
  enabled: boolean;
  severityThreshold: SeverityLevel[];
  notifyOnManualOnly: boolean;
  cooldownMinutes: number;
  channels: {
    system: boolean;
    email: boolean;
    dingtalk: boolean;
    sms: boolean;
  };
  recipients: string[];
  batchNotification: boolean;
  batchIntervalMinutes: number;
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
}

const defaultConfig: NotificationConfig = {
  enabled: true,
  severityThreshold: ['high', 'critical'],
  notifyOnManualOnly: true,
  cooldownMinutes: 60,
  channels: {
    system: true,
    email: true,
    dingtalk: false,
    sms: false,
  },
  recipients: [],
  batchNotification: true,
  batchIntervalMinutes: 15,
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 8,
  },
};

const severityLevels: { value: SeverityLevel; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'low', label: '低', icon: <Info className="w-4 h-4" />, color: 'bg-green-500' },
  { value: 'medium', label: '中', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-yellow-500' },
  { value: 'high', label: '高', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-orange-500' },
  { value: 'critical', label: '严重', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-500' },
];

export default function NotificationConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState<NotificationConfig>(defaultConfig);
  const [newRecipient, setNewRecipient] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // 更新配置
  const updateConfig = (updates: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // 切换严重程度
  const toggleSeverity = (severity: SeverityLevel) => {
    const current = config.severityThreshold;
    const updated = current.includes(severity)
      ? current.filter(s => s !== severity)
      : [...current, severity];
    updateConfig({ severityThreshold: updated });
  };

  // 切换通知渠道
  const toggleChannel = (channel: keyof NotificationConfig['channels']) => {
    updateConfig({
      channels: {
        ...config.channels,
        [channel]: !config.channels[channel],
      },
    });
  };

  // 添加接收人
  const addRecipient = () => {
    if (newRecipient && !config.recipients.includes(newRecipient)) {
      updateConfig({ recipients: [...config.recipients, newRecipient] });
      setNewRecipient('');
    }
  };

  // 移除接收人
  const removeRecipient = (email: string) => {
    updateConfig({ recipients: config.recipients.filter(r => r !== email) });
  };

  // 保存配置
  const saveConfig = () => {
    // 这里会调用API保存配置
    toast({ title: '配置已保存', description: '通知设置已成功更新' });
    setHasChanges(false);
  };

  // 重置配置
  const resetConfig = () => {
    setConfig(defaultConfig);
    setHasChanges(false);
    toast({ title: '配置已重置', description: '已恢复默认设置' });
  };

  return (
    <div className="space-y-6">
      {/* 主开关 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.enabled ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle>冲突通知</CardTitle>
                <CardDescription>
                  当检测到需要处理的同步冲突时发送通知
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
            />
          </div>
        </CardHeader>
      </Card>

      {config.enabled && (
        <>
          {/* 严重程度阈值 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">严重程度阈值</CardTitle>
              <CardDescription>
                选择需要通知的冲突严重程度级别
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {severityLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => toggleSeverity(level.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      config.severityThreshold.includes(level.value)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${level.color}`} />
                    {level.icon}
                    <span>{level.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Checkbox
                  id="manualOnly"
                  checked={config.notifyOnManualOnly}
                  onCheckedChange={(checked) => 
                    updateConfig({ notifyOnManualOnly: checked as boolean })
                  }
                />
                <Label htmlFor="manualOnly" className="text-sm">
                  仅通知需要手动解决的冲突
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* 通知渠道 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">通知渠道</CardTitle>
              <CardDescription>
                选择接收通知的渠道
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="text-sm">系统通知</span>
                  </div>
                  <Switch
                    checked={config.channels.system}
                    onCheckedChange={() => toggleChannel('system')}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">邮件</span>
                  </div>
                  <Switch
                    checked={config.channels.email}
                    onCheckedChange={() => toggleChannel('email')}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">钉钉</span>
                  </div>
                  <Switch
                    checked={config.channels.dingtalk}
                    onCheckedChange={() => toggleChannel('dingtalk')}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm">短信</span>
                  </div>
                  <Switch
                    checked={config.channels.sms}
                    onCheckedChange={() => toggleChannel('sms')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 冷却时间和批量通知 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">通知频率控制</CardTitle>
              <CardDescription>
                设置通知发送的频率限制
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    冷却时间（分钟）
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={config.cooldownMinutes}
                    onChange={(e) => updateConfig({ cooldownMinutes: parseInt(e.target.value) || 60 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    同一冲突在此时间内不会重复通知
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      批量通知
                    </Label>
                    <Switch
                      checked={config.batchNotification}
                      onCheckedChange={(checked) => updateConfig({ batchNotification: checked })}
                    />
                  </div>
                  {config.batchNotification && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        批量间隔（分钟）
                      </Label>
                      <Input
                        type="number"
                        min={5}
                        max={60}
                        value={config.batchIntervalMinutes}
                        onChange={(e) => updateConfig({ batchIntervalMinutes: parseInt(e.target.value) || 15 })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 静默时段 */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    静默时段
                  </Label>
                  <Switch
                    checked={config.quietHours.enabled}
                    onCheckedChange={(enabled) => 
                      updateConfig({ quietHours: { ...config.quietHours, enabled } })
                    }
                  />
                </div>
                {config.quietHours.enabled && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">从</Label>
                      <Select
                        value={config.quietHours.startHour.toString()}
                        onValueChange={(v) => 
                          updateConfig({ quietHours: { ...config.quietHours, startHour: parseInt(v) } })
                        }
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">到</Label>
                      <Select
                        value={config.quietHours.endHour.toString()}
                        onValueChange={(v) => 
                          updateConfig({ quietHours: { ...config.quietHours, endHour: parseInt(v) } })
                        }
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      此时段内不发送通知
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 接收人管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">通知接收人</CardTitle>
              <CardDescription>
                添加需要接收冲突通知的邮箱地址
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="输入邮箱地址"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                />
                <Button onClick={addRecipient} variant="secondary">
                  添加
                </Button>
              </div>
              {config.recipients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {config.recipients.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="px-3 py-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => removeRecipient(email)}
                    >
                      {email}
                      <span className="ml-2 text-muted-foreground">×</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  暂无接收人，通知将发送给系统管理员
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetConfig}>
          <RotateCcw className="w-4 h-4 mr-2" />
          重置
        </Button>
        <Button onClick={saveConfig} disabled={!hasChanges}>
          <Save className="w-4 h-4 mr-2" />
          保存配置
        </Button>
      </div>
    </div>
  );
}
