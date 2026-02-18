/**
 * v2.5.15 消息聚合可视化页面
 */

import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { Bell, Clock, Users, Mail, MessageSquare, Send, RefreshCw, Eye, Trash2, Settings } from "lucide-react";

interface AggregatedNotification {
  id: string;
  recipientId: string;
  recipientName: string;
  channel: 'email' | 'system' | 'wechat' | 'dingtalk' | 'feishu';
  messages: { id: string; title: string; content: string; priority: string; source: string; createdAt: number; }[];
  aggregatedContent: string;
  scheduledTime: number;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

export default function NotificationAggregationPreview() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("queue");
  const [notifications, setNotifications] = useState<AggregatedNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<AggregatedNotification | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = () => {
    setIsRefreshing(true);
    const mockData: AggregatedNotification[] = [
      {
        id: 'agg-1', recipientId: 'user-1', recipientName: '张三', channel: 'email',
        messages: [
          { id: 'm1', title: '设备保养提醒', content: '设备A需要保养', priority: 'high', source: '保养系统', createdAt: Date.now() - 300000 },
          { id: 'm2', title: '设备保养提醒', content: '设备B需要保养', priority: 'normal', source: '保养系统', createdAt: Date.now() - 200000 },
        ],
        aggregatedContent: '您有2条待处理通知：\n1. 设备A需要保养（高优先级）\n2. 设备B需要保养',
        scheduledTime: Date.now() + 600000, status: 'pending',
      },
      {
        id: 'agg-2', recipientId: 'user-2', recipientName: '李四', channel: 'wechat',
        messages: [
          { id: 'm4', title: '会议提醒', content: '明天上午9点项目评审会', priority: 'normal', source: '日程系统', createdAt: Date.now() - 400000 },
        ],
        aggregatedContent: '您有1条待处理通知：\n1. 明天上午9点项目评审会',
        scheduledTime: Date.now() + 300000, status: 'pending',
      },
    ];
    setTimeout(() => { setNotifications(mockData); setIsRefreshing(false); }, 500);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'system': return <Bell className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getChannelName = (channel: string) => {
    const names: Record<string, string> = { email: '邮件', system: '系统通知', wechat: '企业微信', dingtalk: '钉钉', feishu: '飞书' };
    return names[channel] || channel;
  };

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const getTimeRemaining = (scheduledTime: number) => {
    const remaining = scheduledTime - Date.now();
    if (remaining <= 0) return '即将发送';
    const minutes = Math.floor(remaining / 60000);
    return minutes < 60 ? `${minutes}分钟后` : `${Math.floor(minutes / 60)}小时${minutes % 60}分钟后`;
  };

  const handleSendNow = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'sending' as const } : n));
    setTimeout(() => { setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'sent' as const } : n)); }, 1000);
  };

  const handleCancel = (id: string) => { setNotifications(prev => prev.filter(n => n.id !== id)); };

  const stats = {
    totalPending: notifications.filter(n => n.status === 'pending').length,
    totalMessages: notifications.reduce((sum, n) => sum + n.messages.length, 0),
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Bell}
          title="消息聚合预览"
          description="查看待发送的聚合通知队列"
          actions={
            <Button variant="outline" size="sm" onClick={loadNotifications} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Clock} label="待发送批次" value={stats.totalPending} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard icon={MessageSquare} label="聚合消息数" value={stats.totalMessages} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Users} label="接收人数" value={notifications.length} iconColor="text-green-500" iconBg="bg-green-500/10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="queue">待发送队列</TabsTrigger>
            <TabsTrigger value="preview">内容预览</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {notifications.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground"><Bell className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>暂无待发送的聚合通知</p></CardContent></Card>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card key={notification.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">{getChannelIcon(notification.channel)}</div>
                          <div>
                            <CardTitle className="text-base">{notification.recipientName}</CardTitle>
                            <CardDescription>{getChannelName(notification.channel)} • {notification.messages.length}条消息</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={notification.status === 'pending' ? 'outline' : 'default'}>
                            {notification.status === 'pending' ? '待发送' : notification.status === 'sending' ? '发送中' : notification.status === 'sent' ? '已发送' : '失败'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{getTimeRemaining(notification.scheduledTime)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-muted-foreground">预计发送: {formatTime(notification.scheduledTime)}</div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedNotification(notification)}><Eye className="w-4 h-4 mr-1" />预览</Button>
                          <Button variant="outline" size="sm" onClick={() => handleSendNow(notification.id)} disabled={notification.status !== 'pending'}><Send className="w-4 h-4 mr-1" />立即发送</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(notification.id)} disabled={notification.status !== 'pending'}><Trash2 className="w-4 h-4 mr-1" />取消</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>聚合内容预览</CardTitle><CardDescription>选择一个通知批次查看聚合后的内容</CardDescription></CardHeader>
              <CardContent>
                {selectedNotification ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                      <div className="p-3 rounded-lg bg-background">{getChannelIcon(selectedNotification.channel)}</div>
                      <div><p className="font-medium">{selectedNotification.recipientName}</p><p className="text-sm text-muted-foreground">{getChannelName(selectedNotification.channel)}</p></div>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <p className="text-sm font-medium mb-2">聚合内容:</p>
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{selectedNotification.aggregatedContent}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground"><Eye className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>请从队列中选择一个通知批次进行预览</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
