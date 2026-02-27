/**
 * IoT Fleet Dashboard — IoT设备舰队 (/iot-fleet)
 *
 * Fleet KPI cards, machine status grid, and predictive alerts table.
 * All data is mock (no tRPC wiring).
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_MACHINES = [
  { id: "MC-001", name: "超声清洗机 A1",  nameEn: "Ultrasonic A1",  status: "online",  utilization: 87, temp: 45, uptime: "142h" },
  { id: "MC-002", name: "喷淋清洗机 B2",  nameEn: "Spray B2",       status: "online",  utilization: 72, temp: 38, uptime: "98h" },
  { id: "MC-003", name: "浸泡清洗线 C1",  nameEn: "Immersion C1",   status: "warning", utilization: 45, temp: 62, uptime: "210h" },
  { id: "MC-004", name: "组合清洗线 D1",  nameEn: "Combination D1", status: "online",  utilization: 91, temp: 41, uptime: "76h" },
  { id: "MC-005", name: "超声清洗机 A2",  nameEn: "Ultrasonic A2",  status: "offline", utilization: 0,  temp: 22, uptime: "0h" },
  { id: "MC-006", name: "喷淋清洗机 B3",  nameEn: "Spray B3",       status: "online",  utilization: 65, temp: 36, uptime: "184h" },
  { id: "MC-007", name: "真空干燥机 E1",  nameEn: "Vacuum Dryer E1",status: "online",  utilization: 78, temp: 55, uptime: "120h" },
  { id: "MC-008", name: "超声清洗机 A3",  nameEn: "Ultrasonic A3",  status: "warning", utilization: 33, temp: 58, uptime: "305h" },
];

const MOCK_ALERTS = [
  { id: 1, machine: "MC-003", typeZh: "温度异常",     typeEn: "High Temperature", severity: "warning", time: "10 min",  descZh: "清洗液温度超过60°C阈值", descEn: "Cleaning fluid exceeded 60°C threshold" },
  { id: 2, machine: "MC-008", typeZh: "振子衰减",     typeEn: "Transducer Decay", severity: "warning", time: "35 min",  descZh: "超声振子功率下降15%，建议维护", descEn: "Ultrasonic transducer power down 15%" },
  { id: 3, machine: "MC-005", typeZh: "设备离线",     typeEn: "Device Offline",   severity: "error",   time: "2h",      descZh: "通信断开，请检查PLC网络连接", descEn: "Communication lost, check PLC network" },
  { id: 4, machine: "MC-001", typeZh: "预测性维护",   typeEn: "Predictive Maint", severity: "info",    time: "6h",      descZh: "基于运行时长，建议72小时内更换过滤器", descEn: "Filter replacement suggested within 72h" },
  { id: 5, machine: "MC-004", typeZh: "清洗液浓度低", typeEn: "Low Fluid Conc.",  severity: "warning", time: "1h",      descZh: "清洗液浓度低于3%，建议补充", descEn: "Fluid concentration below 3%, refill suggested" },
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

  const totalMachines = MOCK_MACHINES.length;
  const onlineCount = MOCK_MACHINES.filter((m) => m.status === "online").length;
  const alertCount = MOCK_MACHINES.filter((m) => m.status === "warning").length;
  const avgUtil = Math.round(MOCK_MACHINES.reduce((s, m) => s + m.utilization, 0) / totalMachines);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isZh ? "IoT 设备舰队" : "IoT Fleet Dashboard"}</h1>
            <p className="text-sm text-muted-foreground">{isZh ? "设备实时监控、预测性维护与运维洞察" : "Real-time monitoring, predictive maintenance & ops insights"}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {/* Fleet KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{totalMachines}</p>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "设备总数" : "Total Machines"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <p className="text-3xl font-bold text-green-600">{onlineCount}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "在线" : "Online"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-3xl font-bold text-amber-600">{alertCount}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "告警中" : "Alerts"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Gauge className="w-4 h-4 text-indigo-500" />
                <p className="text-3xl font-bold text-indigo-600">{avgUtil}%</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isZh ? "平均稼动率" : "Avg Utilization"}</p>
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
              {MOCK_MACHINES.map((m) => {
                const status = STATUS_CONFIG[m.status] ?? STATUS_CONFIG["offline"];
                return (
                  <div key={m.id} className="rounded-lg border border-border p-3 space-y-2 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">{m.id}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${status.dotClass}`} />
                        <span className="text-xs">{isZh ? status.labelZh : status.labelEn}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold truncate">{isZh ? m.name : m.nameEn}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {m.utilization}%</span>
                      <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {m.temp}°C</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {m.uptime}</span>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">{isZh ? "设备" : "Machine"}</th>
                    <th className="pb-2 font-medium text-muted-foreground">{isZh ? "类型" : "Type"}</th>
                    <th className="pb-2 font-medium text-muted-foreground">{isZh ? "级别" : "Severity"}</th>
                    <th className="pb-2 font-medium text-muted-foreground">{isZh ? "时间" : "Time"}</th>
                    <th className="pb-2 font-medium text-muted-foreground">{isZh ? "描述" : "Description"}</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ALERTS.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{a.machine}</td>
                      <td className="py-2 font-medium">{isZh ? a.typeZh : a.typeEn}</td>
                      <td className="py-2">
                        <Badge className={`text-[10px] ${SEVERITY_BADGE[a.severity] ?? ""}`}>{a.severity}</Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">{a.time}</td>
                      <td className="py-2 text-muted-foreground text-xs">{isZh ? a.descZh : a.descEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
