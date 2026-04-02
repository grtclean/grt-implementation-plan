import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Activity, Cpu, Database, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function LiveDashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState<{ time: string; value: number }[]>([]);
  const [metrics, setMetrics] = useState({
    cpu: 12,
    memory: 45,
    requests: 128,
    latency: 24
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize data
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      time: new Date(Date.now() - (20 - i) * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: 30 + Math.random() * 40
    }));
    setData(initialData);

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setData(prev => {
        const newData = [...prev.slice(1), { time: timeStr, value: 30 + Math.random() * 40 }];
        return newData;
      });

      setMetrics({
        cpu: Math.floor(20 + Math.random() * 30),
        memory: Math.floor(40 + Math.random() * 20),
        requests: Math.floor(100 + Math.random() * 100),
        latency: Math.floor(15 + Math.random() * 20)
      });
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 骨架屏组件
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-pulse">
        {/* 图表骨架 */}
        <Card className="lg:col-span-2 bg-card/50 border-border">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-12" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>
        {/* 指标卡片骨架 */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Real-time Chart */}
      <Card className="lg:col-span-2 bg-card/50 border-border">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              {t("dashboard.systemLoad")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-green-500 font-mono">{t("dashboard.live")}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="var(--muted-foreground)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="var(--muted-foreground)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '4px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelStyle={{ color: 'var(--muted-foreground)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border flex flex-col justify-center">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Cpu className="w-4 h-4" />
              <span className="text-xs font-mono uppercase">{t("dashboard.cpuUsage")}</span>
            </div>
            <div className="text-2xl font-heading font-bold text-foreground">{metrics.cpu}%</div>
            <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-500" style={{ width: `${metrics.cpu}%` }}></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border flex flex-col justify-center">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Database className="w-4 h-4" />
              <span className="text-xs font-mono uppercase">{t("dashboard.memory")}</span>
            </div>
            <div className="text-2xl font-heading font-bold text-foreground">{metrics.memory}%</div>
            <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${metrics.memory}%` }}></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border flex flex-col justify-center">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Server className="w-4 h-4" />
              <span className="text-xs font-mono uppercase">{t("dashboard.requests")}</span>
            </div>
            <div className="text-2xl font-heading font-bold text-foreground">{metrics.requests}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border flex flex-col justify-center">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-mono uppercase">{t("dashboard.latency")}</span>
            </div>
            <div className="text-2xl font-heading font-bold text-foreground">{metrics.latency}ms</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
