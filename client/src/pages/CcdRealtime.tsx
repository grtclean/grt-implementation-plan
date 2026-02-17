/**
 * v1.7.2 CCD检测实时推送面板
 * CCD Detection Real-time Push Dashboard
 * 
 * 功能：
 * - WebSocket连接状态监控
 * - 实时检测结果推送展示
 * - 频道订阅管理
 * - 推送统计与连接诊断
 */

import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Radio, Wifi, WifiOff, Activity, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, Zap, Eye, Bell, Settings2, BarChart3
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

// 工序名称映射
const PROCESS_NAMES: Record<string, string> = {
  T1: "来料检验", T2: "零件加工", T3: "表面处理", T4: "焊接工序",
  T5: "装配工序", T6: "电气接线", T7: "气密测试", T8: "功能调试",
  T9: "老化测试", T10: "外观检查", T11: "包装入库", T12: "出货检验",
  T13: "安装调试", T14: "客户验收", T15: "质保服务"
};

// 模拟实时消息类型
interface RealtimeMessage {
  id: string;
  timestamp: number;
  processCode: string;
  defectType: string;
  severity: "critical" | "major" | "minor";
  confidence: number;
  interlockTriggered: boolean;
  imageUrl?: string;
}

export default function CcdRealtime() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [wsConnected, setWsConnected] = useState(false);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>(["ccd_detection", "quality_interlock"]);
  const [isPaused, setIsPaused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 获取WebSocket统计
  const statsQuery = trpc.ccdWebSocket.getStats.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // 获取连接诊断
  const diagnosticsQuery = (trpc.ccdWebSocket as any).getDiagnostics.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // 手动推送测试
  const pushTestMutation = (trpc.ccdWebSocket as any).pushDetectionResult.useMutation({
    onSuccess: (data) => {
      toast({
        title: "推送成功",
        description: `已向 ${data.subscriberCount} 个订阅者推送检测结果`,
      });
    },
    onError: (err) => {
      toast({
        title: "推送失败",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 模拟WebSocket连接建立（仅在挂载时触发一次）
  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setWsConnected(true);
      toast({
        title: "WebSocket已连接",
        description: "CCD检测实时推送频道已建立",
      });
    }, 1500);
    return () => clearTimeout(connectTimer);
  }, []);

  // 模拟实时消息推送
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    const messageInterval = setInterval(() => {
      if (isPausedRef.current) return;
      const processes = Object.keys(PROCESS_NAMES);
      const severities: ("critical" | "major" | "minor")[] = ["critical", "major", "minor"];
      const defectTypes = ["表面划痕", "焊接气孔", "尺寸偏差", "装配松动", "涂层脱落", "电气短路"];

      const newMsg: RealtimeMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        processCode: processes[Math.floor(Math.random() * 6) + 1], // T2-T7
        defectType: defectTypes[Math.floor(Math.random() * defectTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        confidence: 0.75 + Math.random() * 0.24,
        interlockTriggered: Math.random() > 0.7,
      };

      setMessages(prev => {
        const updated = [...prev, newMsg];
        return updated.slice(-100); // 保留最近100条
      });
    }, 4000);

    return () => clearInterval(messageInterval);
  }, []);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  const handleTestPush = () => {
    pushTestMutation.mutate({
      processCode: "T4",
      defectType: "焊接气孔",
      severity: "major",
      confidence: 0.92,
      detectedAt: Date.now(),
    });
  };

  const toggleChannel = (channel: string) => {
    setSubscribedChannels(prev => 
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "major": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "minor": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "critical": return "严重";
      case "major": return "主要";
      case "minor": return "轻微";
      default: return severity;
    }
  };

  const stats = statsQuery.data;
  const diagnostics = diagnosticsQuery.data;

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Radio}
        title="CCD检测实时推送"
        description="WebSocket实时推送CCD检测结果，替代轮询查询模式"
        actions={
          <>
            <Badge variant="outline" className={wsConnected ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>
              {wsConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {wsConnected ? "已连接" : "未连接"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleTestPush} disabled={pushTestMutation.isPending}>
              <Zap className="w-4 h-4 mr-1" />
              测试推送
            </Button>
          </>
        }
      />

      {/* 连接状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={wsConnected ? Wifi : WifiOff} label="连接状态" value={wsConnected ? "在线" : "离线"} iconColor={wsConnected ? "text-green-400" : "text-red-400"} iconBg={wsConnected ? "bg-green-500/10" : "bg-red-500/10"} />
        <StatCard icon={Activity} label="消息总数" value={(stats as any)?.totalPushCount ?? messages.length} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Bell} label="订阅频道" value={subscribedChannels.length} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        <StatCard icon={Clock} label="在线时长" value={diagnostics?.uptime ? `${Math.floor(diagnostics.uptime / 60)}m` : "0m"} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 实时消息流 */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    实时检测消息流
                  </CardTitle>
                  <CardDescription>最近100条CCD检测结果推送</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">自动滚动</span>
                    <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">暂停</span>
                    <Switch checked={isPaused} onCheckedChange={setIsPaused} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Radio className="w-10 h-10 mx-auto opacity-30" />
                      <p>等待CCD检测数据推送...</p>
                      <p className="text-xs">消息将在检测到缺陷时实时显示</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors"
                    >
                      <div className={`mt-0.5 p-1.5 rounded-sm ${getSeverityColor(msg.severity)}`}>
                        {msg.severity === "critical" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : msg.severity === "major" ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {msg.processCode}
                          </Badge>
                          <span className="text-sm font-medium">{PROCESS_NAMES[msg.processCode] || msg.processCode}</span>
                          <Badge className={`text-[10px] ${getSeverityColor(msg.severity)}`}>
                            {getSeverityLabel(msg.severity)}
                          </Badge>
                          {msg.interlockTriggered && (
                            <Badge variant="destructive" className="text-[10px]">
                              联动已触发
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>缺陷: {msg.defectType}</span>
                          <span>置信度: {(msg.confidence * 100).toFixed(1)}%</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧面板 */}
        <div className="space-y-4">
          {/* 频道订阅 */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                频道订阅管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: "ccd_detection", label: "CCD检测结果", desc: "所有CCD检测数据" },
                { id: "quality_interlock", label: "质量联动事件", desc: "工序锁定/解锁通知" },
                { id: "system_alert", label: "系统预警", desc: "设备异常/阈值告警" },
                { id: "maintenance", label: "维护通知", desc: "设备维护提醒" },
              ].map((channel) => (
                <div key={channel.id} className="flex items-center justify-between p-2 rounded-md bg-background/50">
                  <div>
                    <p className="text-sm font-medium">{channel.label}</p>
                    <p className="text-xs text-muted-foreground">{channel.desc}</p>
                  </div>
                  <Switch
                    checked={subscribedChannels.includes(channel.id)}
                    onCheckedChange={() => toggleChannel(channel.id)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 推送统计 */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                推送统计
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stats as any)?.channelStats ? (
                (stats as any).channelStats.map((ch: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{ch.channel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{ch.messageCount}</span>
                      <span className="text-xs text-muted-foreground">msgs</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ccd_detection</span>
                    <span className="font-mono">{messages.filter(m => !m.interlockTriggered).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">quality_interlock</span>
                    <span className="font-mono">{messages.filter(m => m.interlockTriggered).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">total</span>
                    <span className="font-mono font-bold">{messages.length}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 连接诊断 */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wifi className="w-4 h-4 text-primary" />
                连接诊断
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">协议</span>
                <span className="font-mono">WSS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">延迟</span>
                <span className="font-mono">{diagnostics?.latency ?? "12"}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">重连次数</span>
                <span className="font-mono">{diagnostics?.reconnectCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">心跳间隔</span>
                <span className="font-mono">30s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">消息压缩</span>
                <Badge variant="outline" className="text-[10px]">启用</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </Layout>
  );
}
