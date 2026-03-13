/**
 * SystemTelemetryWidget — Real-time SSE-connected dashboard widget
 * Shows live CPU%, memory%, active robots, recent alerts
 */
import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, MemoryStick, Bot, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { useTelemetryStream } from "../hooks/useTelemetryStream";

interface SystemMetrics {
  cpu: number;
  memory: number;
  activeRobots: number;
  recentAlerts: Array<{ message: string; severity: string; timestamp: string }>;
}

export default function SystemTelemetryWidget() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    activeRobots: 0,
    recentAlerts: [],
  });

  const [flash, setFlash] = useState<string | null>(null);

  const handleEvent = useCallback((event: { topic: string; data: unknown }) => {
    if (event.topic === "system:health") {
      const data = event.data as Partial<SystemMetrics>;
      setMetrics(prev => ({
        ...prev,
        cpu: data.cpu ?? prev.cpu,
        memory: data.memory ?? prev.memory,
        activeRobots: data.activeRobots ?? prev.activeRobots,
      }));
      setFlash("system");
    } else if (event.topic === "robot:alert" || event.topic === "oiling:alert") {
      const alert = event.data as { message: string; severity: string };
      setMetrics(prev => ({
        ...prev,
        recentAlerts: [
          { ...alert, timestamp: new Date().toISOString() },
          ...prev.recentAlerts.slice(0, 4),
        ],
      }));
      setFlash("alert");
    } else if (event.topic === "hr:penalty") {
      setFlash("penalty");
    }

    setTimeout(() => setFlash(null), 1000);
  }, []);

  const { connected } = useTelemetryStream({
    topics: ["system:health", "robot:alert", "oiling:alert", "hr:penalty"],
    enabled: true,
    onEvent: handleEvent,
  });

  const cpuColor = metrics.cpu > 80 ? "text-red-500" : metrics.cpu > 60 ? "text-yellow-500" : "text-green-500";
  const memColor = metrics.memory > 85 ? "text-red-500" : metrics.memory > 65 ? "text-yellow-500" : "text-green-500";

  return (
    <Card className={`transition-all duration-300 ${flash === "alert" ? "ring-2 ring-red-400" : flash === "system" ? "ring-2 ring-blue-400" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">System Telemetry</CardTitle>
          <Badge variant={connected ? "default" : "destructive"} className="text-xs">
            {connected ? <><Wifi className="h-3 w-3 mr-1" /> Live</> : <><WifiOff className="h-3 w-3 mr-1" /> Offline</>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Cpu className={`h-4 w-4 ${cpuColor}`} />
            <div>
              <div className="text-xs text-muted-foreground">CPU</div>
              <div className={`text-lg font-bold ${cpuColor}`}>{metrics.cpu}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick className={`h-4 w-4 ${memColor}`} />
            <div>
              <div className="text-xs text-muted-foreground">Memory</div>
              <div className={`text-lg font-bold ${memColor}`}>{metrics.memory}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Robots</div>
              <div className="text-lg font-bold">{metrics.activeRobots}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${metrics.recentAlerts.length > 0 ? "text-orange-500" : "text-gray-400"}`} />
            <div>
              <div className="text-xs text-muted-foreground">Alerts</div>
              <div className="text-lg font-bold">{metrics.recentAlerts.length}</div>
            </div>
          </div>
        </div>
        {metrics.recentAlerts.length > 0 && (
          <div className="mt-3 space-y-1 max-h-24 overflow-y-auto">
            {metrics.recentAlerts.slice(0, 3).map((a, i) => (
              <div key={i} className="text-xs flex items-center gap-1 text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${a.severity === "critical" ? "bg-red-500" : "bg-yellow-500"}`} />
                <span className="truncate">{a.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
