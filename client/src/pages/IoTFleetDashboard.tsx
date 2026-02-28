/**
 * IoT Fleet Dashboard — IoT设备舰队 (/iot-fleet)
 *
 * Fleet KPI cards, machine status grid, and predictive alerts table.
 * Wired to tRPC: iotDigitalTwin.fleetDashboard (with mock fallback).
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  Activity,
  Gauge,
  Thermometer,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Database,
} from "lucide-react";

// Fallback mock data when DB is empty
const FALLBACK_MACHINES = [
  { id: 0, machineId: "MC-001", plantName: "GRT苏州工厂", lineName: "Line-A", country: "CN", machineType: "超声清洗机", status: "online", customerName: "比亚迪", lastHeartbeat: null, customerId: null, installDate: null, warrantyExpiry: null, createdAt: null },
  { id: 0, machineId: "MC-002", plantName: "GRT苏州工厂", lineName: "Line-A", country: "CN", machineType: "喷淋清洗机", status: "online", customerName: "比亚迪", lastHeartbeat: null, customerId: null, installDate: null, warrantyExpiry: null, createdAt: null },
  { id: 0, machineId: "MC-003", plantName: "GRT苏州工厂", lineName: "Line-B", country: "CN", machineType: "浸泡清洗线", status: "warning", customerName: "宁德时代", lastHeartbeat: null, customerId: null, installDate: null, warrantyExpiry: null, createdAt: null },
  { id: 0, machineId: "MC-004", plantName: "GRT德国工厂", lineName: "Line-C", country: "DE", machineType: "组合清洗线", status: "online", customerName: "BMW", lastHeartbeat: null, customerId: null, installDate: null, warrantyExpiry: null, createdAt: null },
  { id: 0, machineId: "MC-005", plantName: "GRT德国工厂", lineName: "Line-C", country: "DE", machineType: "超声清洗机", status: "offline", customerName: "BMW", lastHeartbeat: null, customerId: null, installDate: null, warrantyExpiry: null, createdAt: null },
];

const STATUS_CONFIG: Record<string, { dotClass: string; labelZh: string; labelEn: string }> = {
  online:  { dotClass: "bg-green-500",  labelZh: "在线", labelEn: "Online" },
  warning: { dotClass: "bg-amber-500",  labelZh: "告警", labelEn: "Warning" },
  offline: { dotClass: "bg-red-500",    labelZh: "离线", labelEn: "Offline" },
};

const SEVERITY_BADGE: Record<string, string> = {
  error:   "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info:    "bg-blue-100 text-blue-700",
};

export default function IoTFleetDashboard() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Real backend data
  const fleetQuery = trpc.iotDigitalTwin.fleetDashboard.useQuery(undefined, { retry: false });
  const seedMutation = trpc.iotDigitalTwin.seedFleet.useMutation({
    onSuccess: () => fleetQuery.refetch(),
  });

  const data = fleetQuery.data;
  const machines = data?.machines?.length ? data.machines : FALLBACK_MACHINES;
  const alerts = data?.alerts ?? [];
  const kpi = data?.kpi ?? {
    total: machines.length,
    online: machines.filter(m => m.status === "online").length,
    warning: machines.filter(m => m.status === "warning").length,
    offline: machines.filter(m => m.status === "offline").length,
    avgUtilization: 0,
    activeAlerts: 0,
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{isZh ? "IoT 设备舰队" : "IoT Fleet Dashboard"}</h1>
              <p className="text-sm text-muted-foreground">{isZh ? "设备实时监控、预测性维护与运维洞察" : "Real-time monitoring, predictive maintenance & ops insights"}</p>
            </div>
          </div>
          {(!data?.machines?.length) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Database className="w-4 h-4 mr-1" />}
              {isZh ? "载入演示数据" : "Seed Demo"}
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {/* Fleet KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{kpi.total}</p>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "设备总数" : "Total Machines"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <p className="text-3xl font-bold text-green-600">{kpi.online}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "在线" : "Online"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-3xl font-bold text-amber-600">{kpi.warning}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "告警中" : "Alerts"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Gauge className="w-4 h-4 text-indigo-500" />
                <p className="text-3xl font-bold text-indigo-600">{kpi.offline}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "离线" : "Offline"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Machine Status Grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              {isZh ? "设备状态" : "Machine Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {machines.map((m) => {
                const status = STATUS_CONFIG[m.status ?? "offline"] ?? STATUS_CONFIG["offline"];
                return (
                  <div key={m.machineId} className="rounded-lg border border-border p-3 space-y-2 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">{m.machineId}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
                        <span className="text-xs">{isZh ? status.labelZh : status.labelEn}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold truncate">{m.machineType}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{m.plantName}</span>
                      <span>{m.customerName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Predictive Alerts Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {isZh ? "预测性告警" : "Predictive Alerts"}
              {alerts.length > 0 && <Badge variant="secondary" className="ml-2">{alerts.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{isZh ? "暂无告警" : "No active alerts"}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">{isZh ? "设备" : "Machine"}</th>
                      <th className="pb-2 font-medium text-muted-foreground">{isZh ? "类型" : "Type"}</th>
                      <th className="pb-2 font-medium text-muted-foreground">{isZh ? "级别" : "Severity"}</th>
                      <th className="pb-2 font-medium text-muted-foreground">{isZh ? "预测故障(天)" : "Predicted (days)"}</th>
                      <th className="pb-2 font-medium text-muted-foreground">{isZh ? "建议备件" : "Recommended Part"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs">{a.machineId}</td>
                        <td className="py-2 font-medium">{a.alertType}</td>
                        <td className="py-2">
                          <Badge className={`text-[10px] ${SEVERITY_BADGE[a.severity ?? "info"] ?? ""}`}>{a.severity}</Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">{a.predictedFailureDays ?? "—"}</td>
                        <td className="py-2 text-muted-foreground text-xs">{a.recommendedPartName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
