import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Cpu, AlertTriangle, Activity, Wrench, ThermometerSun, Gauge, Vibrate, RotateCcw } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
  offline: "bg-gray-400",
};

const METRIC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  temperature: ThermometerSun,
  pressure: Gauge,
  vibration: Vibrate,
  cycle_count: RotateCcw,
};

export default function IoTDashboard() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const alertsQuery = trpc.iotDigitalTwin.alerts.useQuery({});
  const twinQuery = trpc.iotDigitalTwin.getTwin.useQuery(
    { equipmentId: selectedEquipmentId ?? 0 },
    { enabled: selectedEquipmentId !== null }
  );
  const alerts = alertsQuery.data ?? [];
  const twin = twinQuery.data;

  // Mock equipment list for demo
  const mockEquipment = [
    { id: 1, equipmentId: 1, equipmentCode: "CNC-001", equipmentName: "CNC Lathe A", status: "online", location: "Workshop 1" },
    { id: 2, equipmentId: 2, equipmentCode: "PMP-001", equipmentName: "Hydraulic Press B", status: "warning", location: "Workshop 2" },
    { id: 3, equipmentId: 3, equipmentCode: "WLD-001", equipmentName: "Welding Robot C", status: "online", location: "Workshop 3" },
    { id: 4, equipmentId: 4, equipmentCode: "ASM-001", equipmentName: "Assembly Line D", status: "offline", location: "Workshop 1" },
  ];

  return (
      <div className="space-y-6">
        <PageHeader icon={Cpu} title={isZh ? "IoT数字孪生" : "IoT Digital Twin"} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mockEquipment.map((eq) => (
            <Card key={eq.id} className={"cursor-pointer transition-all " + (selectedEquipmentId === eq.equipmentId ? "ring-2 ring-blue-500" : "")}
              onClick={() => setSelectedEquipmentId(eq.equipmentId)}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm">{eq.equipmentCode}</span>
                  <span className={"w-3 h-3 rounded-full " + (STATUS_COLORS[eq.status] ?? "bg-gray-400")} />
                </div>
                <div className="font-semibold text-sm">{eq.equipmentName}</div>
                <div className="text-xs text-muted-foreground">{eq.location}</div>
                <Badge variant="outline" className="mt-1">{eq.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{isZh ? "遥测数据" : "Telemetry Data"}</CardTitle>
                <CardDescription>{isZh ? "实时设备数据" : "Real-time equipment data"}</CardDescription>
              </CardHeader>
              <CardContent>
                {twin?.telemetry?.length ? (
                  <div className="space-y-3">
                    {twin.telemetry.slice(0, 10).map((t: { id: number; metricType: string; value: number; unit: string | null; isAlert: boolean | null; recordedAt: string | null }) => {
                      const MetricIcon = METRIC_ICONS[t.metricType] ?? Activity;
                      return (
                        <div key={t.id} className={"flex items-center justify-between p-3 rounded-lg " + (t.isAlert ? "bg-red-500/10" : "bg-muted/50")}>
                          <div className="flex items-center gap-2">
                            <MetricIcon className="h-4 w-4" />
                            <span className="font-medium">{t.metricType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{t.value.toFixed(1)} {t.unit}</span>
                            {t.isAlert && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="text-center py-8 text-muted-foreground">{isZh ? "请选择设备查看遥测数据" : "Select equipment to view telemetry"}</div>}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  {isZh ? "活跃警报" : "Active Alerts"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">{isZh ? "暂无警报" : "No alerts"}</div>
                  ) : alerts.slice(0, 8).map((a: { id: number; metricType: string; value: number; unit: string | null }) => (
                    <div key={a.id} className="flex justify-between p-2 bg-red-500/10 rounded">
                      <span className="text-sm">{a.metricType}</span>
                      <span className="font-mono text-sm">{a.value} {a.unit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {isZh ? "维护预测" : "Maintenance Predictions"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {twin?.predictions?.length ? (
                  <div className="space-y-2">
                    {twin.predictions.map((p: { id: number; predictedIssue: string | null; confidence: number | null; recommendedAction: string | null; predictedDate: string | null }) => (
                      <div key={p.id} className="p-2 border rounded">
                        <div className="font-medium text-sm">{p.predictedIssue}</div>
                        <div className="text-xs text-muted-foreground">{p.recommendedAction}</div>
                        <div className="flex justify-between mt-1">
                          <Badge variant="outline">{Math.round((p.confidence ?? 0) * 100)}% confidence</Badge>
                          <span className="text-xs">{p.predictedDate ? new Date(p.predictedDate).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-4 text-muted-foreground">{isZh ? "暂无预测" : "No predictions"}</div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}