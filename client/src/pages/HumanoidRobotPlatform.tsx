import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Bot,
  Camera,
  Play,
  Pause,
  Square,
  Home,
  Plus,
  AlertTriangle,
  Wrench,
  Eye,
  Package,
  Settings,
  BarChart3,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Upload,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CameraFeedView } from "@/components/camera/CameraFeedView";
import { GripperStatus } from "@/components/humanoid/GripperStatus";
import { MaterialFlowDiagram } from "@/components/humanoid/MaterialFlowDiagram";
import { MaintenanceCalendar } from "@/components/humanoid/MaintenanceCalendar";
import { MaintenanceStepExecutor } from "@/components/humanoid/MaintenanceStepExecutor";

// ─── Demo Data ────────────────────────────────────────────────

const robots = [
  { id: "GRT-H1", name: "GRT-H1", model: "HRX-200", station: "装配线A", status: "working" as const, task: "零件清洗 #J-0041", runtime: 1245 },
  { id: "GRT-H2", name: "GRT-H2", model: "HRX-200", station: "装配线B", status: "idle" as const, task: "—", runtime: 980 },
  { id: "GRT-H3", name: "GRT-H3", model: "HRX-300", station: "清洗区", status: "loading" as const, task: "上料 #J-0043", runtime: 1560 },
  { id: "GRT-H4", name: "GRT-H4", model: "HRX-300", station: "测试区", status: "maintenance" as const, task: "季度检修", runtime: 2100 },
];

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  idle: { bg: "bg-gray-100", text: "text-gray-700", label: "空闲" },
  working: { bg: "bg-green-100", text: "text-green-700", label: "作业中" },
  loading: { bg: "bg-blue-100", text: "text-blue-700", label: "上下料" },
  maintenance: { bg: "bg-yellow-100", text: "text-yellow-700", label: "维护中" },
  error: { bg: "bg-red-100", text: "text-red-700", label: "故障" },
};

const alerts = [
  { id: 1, time: "14:32", level: "warning", msg: "GRT-H4 季度全面检修已到期", robot: "GRT-H4" },
  { id: 2, time: "13:15", level: "error", msg: "GRT-H1 视觉系统通信超时 (Camera-03)", robot: "GRT-H1" },
  { id: 3, time: "11:48", level: "error", msg: "GRT-H3 夹爪力传感器异常 (Force>150N)", robot: "GRT-H3" },
  { id: 4, time: "10:22", level: "warning", msg: "GRT-H2 UWB定位显示电池电量 <15%", robot: "GRT-H2" },
  { id: 5, time: "09:05", level: "error", msg: "GRT-H1 与PLC通信中断 30s", robot: "GRT-H1" },
];

const visionTasks = [
  { id: 1, name: "零件识别", type: "part_recognition", recipe: "超声粗洗", active: true },
  { id: 2, name: "清洁度检测", type: "cleanliness_check", recipe: "超声精洗", active: true },
  { id: 3, name: "尺寸测量", type: "dimension_measure", recipe: "全自动清洗", active: false },
  { id: 4, name: "缺陷检测", type: "defect_detection", recipe: "喷淋漂洗", active: true },
  { id: 5, name: "条码扫描", type: "barcode_scan", recipe: "—", active: true },
];

const visionHistory = [
  { date: "03-22 14:30", part: "齿轮轴-A01", result: "pass", confidence: 97.2 },
  { date: "03-22 14:28", part: "壳体-B03", result: "pass", confidence: 95.8 },
  { date: "03-22 14:25", part: "密封圈-C12", result: "fail", confidence: 62.3 },
  { date: "03-22 14:20", part: "齿轮轴-A02", result: "pass", confidence: 98.1 },
  { date: "03-22 14:18", part: "法兰盘-D05", result: "pass", confidence: 94.5 },
  { date: "03-22 14:15", part: "壳体-B04", result: "pass", confidence: 96.7 },
  { date: "03-22 14:12", part: "齿轮轴-A03", result: "pass", confidence: 99.0 },
  { date: "03-22 14:08", part: "密封圈-C13", result: "fail", confidence: 58.1 },
  { date: "03-22 14:05", part: "法兰盘-D06", result: "pass", confidence: 93.2 },
  { date: "03-22 14:00", part: "壳体-B05", result: "pass", confidence: 97.9 },
];

const handlingJobs = [
  { id: "J-0041", robot: "GRT-H1", part: "齿轮轴-A01", source: "料架-01", target: "清洗槽-A", priority: "high", currentStep: 2 },
  { id: "J-0042", robot: "GRT-H2", part: "壳体-B03", source: "料架-02", target: "清洗槽-B", priority: "normal", currentStep: 4 },
  { id: "J-0043", robot: "GRT-H3", part: "法兰盘-D05", source: "料架-03", target: "清洗槽-A", priority: "normal", currentStep: 1 },
  { id: "J-0044", robot: "GRT-H1", part: "密封圈-C12", source: "料架-01", target: "清洗槽-C", priority: "low", currentStep: 5 },
  { id: "J-0045", robot: "GRT-H3", part: "齿轮轴-A02", source: "料架-04", target: "清洗槽-A", priority: "high", currentStep: 0 },
  { id: "J-0046", robot: "GRT-H2", part: "壳体-B04", source: "料架-02", target: "清洗槽-B", priority: "normal", currentStep: 3 },
];

const handlingSteps = ["Pick", "Load", "Clean", "Unload", "Place"];

const inputBuffer = [
  { part: "齿轮轴-A03", qty: 5 },
  { part: "壳体-B05", qty: 3 },
  { part: "法兰盘-D07", qty: 8 },
];
const outputBuffer = [
  { part: "齿轮轴-A01", qty: 4 },
  { part: "密封圈-C10", qty: 12 },
];

const recipes = [
  { id: "R01", name: "超声粗洗", temp: 55, freq: 40, pressure: 2.0, dryTemp: 80 },
  { id: "R02", name: "超声精洗", temp: 45, freq: 80, pressure: 1.5, dryTemp: 70 },
  { id: "R03", name: "喷淋漂洗", temp: 50, freq: 0, pressure: 3.5, dryTemp: 75 },
  { id: "R04", name: "真空干燥", temp: 60, freq: 0, pressure: 0, dryTemp: 110 },
  { id: "R05", name: "防锈处理", temp: 40, freq: 0, pressure: 1.0, dryTemp: 60 },
  { id: "R06", name: "全自动清洗", temp: 55, freq: 60, pressure: 2.5, dryTemp: 90 },
];

const hmiStates = ["Idle", "Preparing", "Loading", "Running", "Unloading", "Complete"];

const maintenanceSchedules = [
  { id: 1, scheduleName: "日常点检", maintenanceType: "daily", robotId: "ALL", intervalDesc: "每日", nextDueDate: "2026-03-22", estimatedHours: 0.5 },
  { id: 2, scheduleName: "每周润滑", maintenanceType: "weekly", robotId: "ALL", intervalDesc: "每周", nextDueDate: "2026-03-24", estimatedHours: 1 },
  { id: 3, scheduleName: "月度校准", maintenanceType: "monthly", robotId: "GRT-H1", intervalDesc: "每月", nextDueDate: "2026-03-28", estimatedHours: 2 },
  { id: 4, scheduleName: "季度全面检修", maintenanceType: "quarterly", robotId: "GRT-H4", intervalDesc: "每季度", nextDueDate: "2026-03-20", estimatedHours: 8 },
  { id: 5, scheduleName: "夹爪更换", maintenanceType: "runtime_based", robotId: "GRT-H1", intervalDesc: "500h", nextDueDate: "2026-04-05", estimatedHours: 1.5 },
  { id: 6, scheduleName: "传感器校验", maintenanceType: "runtime_based", robotId: "GRT-H3", intervalDesc: "1000h", nextDueDate: "2026-04-15", estimatedHours: 3 },
  { id: 7, scheduleName: "振动异常", maintenanceType: "event_triggered", robotId: "GRT-H2", intervalDesc: "事件触发", nextDueDate: "2026-03-21", estimatedHours: 2 },
  { id: 8, scheduleName: "温度预警", maintenanceType: "event_triggered", robotId: "GRT-H1", intervalDesc: "事件触发", nextDueDate: "2026-03-19", estimatedHours: 1 },
];

const workOrders = [
  { id: "WO-001", code: "WO-2026-001", equipment: "GRT-H4", title: "季度全面检修", priority: "critical", assignee: "洪香龙", status: "in_progress" },
  { id: "WO-002", code: "WO-2026-002", equipment: "GRT-H1", title: "夹爪更换 (500h)", priority: "high", assignee: "李大鹏", status: "scheduled" },
  { id: "WO-003", code: "WO-2026-003", equipment: "GRT-H2", title: "振动异常排查", priority: "medium", assignee: "朱宇浩", status: "review" },
  { id: "WO-004", code: "WO-2026-004", equipment: "ALL", title: "日常点检 03-22", priority: "low", assignee: "洪香龙", status: "draft" },
  { id: "WO-005", code: "WO-2026-005", equipment: "GRT-H3", title: "传感器零点校验", priority: "medium", assignee: "李大鹏", status: "completed" },
  { id: "WO-006", code: "WO-2026-006", equipment: "GRT-H1", title: "温度预警处理", priority: "high", assignee: "朱宇浩", status: "completed" },
];

const demoSteps = [
  { stepNumber: 1, description: "断电锁机 — LOTO程序", status: "completed" as const, estimatedMinutes: 10, actualMinutes: 8, evidenceUrl: "/img/loto.jpg" },
  { stepNumber: 2, description: "检查润滑系统 — 油位/油质", status: "completed" as const, estimatedMinutes: 15, actualMinutes: 12, measuredValue: "油位 85%", expectedValue: "≥80%", measurementPass: true },
  { stepNumber: 3, description: "更换密封圈 — 主轴/夹爪", status: "in_progress" as const, estimatedMinutes: 30, expectedValue: "扭矩 25±2 Nm" },
  { stepNumber: 4, description: "校准力传感器 — 零点/满量程", status: "pending" as const, estimatedMinutes: 20, expectedValue: "偏差 <0.5%" },
  { stepNumber: 5, description: "验收签字 — 空运行测试", status: "pending" as const, estimatedMinutes: 15, expectedValue: "运行 3 周期无报警" },
];

const woStatusFilters = ["draft", "scheduled", "in_progress", "review", "completed"] as const;
const woStatusLabels: Record<string, string> = {
  draft: "草稿",
  scheduled: "已排期",
  in_progress: "执行中",
  review: "待审核",
  completed: "已完成",
};

const priorityStyles: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700" },
  high: { bg: "bg-orange-100", text: "text-orange-700" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700" },
  low: { bg: "bg-gray-100", text: "text-gray-600" },
};

// Analytics demo data
const uptimeByRobot = [
  { name: "GRT-H1", hours: 680 },
  { name: "GRT-H2", hours: 590 },
  { name: "GRT-H3", hours: 710 },
  { name: "GRT-H4", hours: 420 },
];
const costByMonth = [
  { month: "10月", cost: 12500 },
  { month: "11月", cost: 8200 },
  { month: "12月", cost: 15800 },
  { month: "1月", cost: 9400 },
  { month: "2月", cost: 11200 },
  { month: "3月", cost: 7600 },
];
const visionPassRateByDay = [
  { day: "03-16", rate: 96.2 },
  { day: "03-17", rate: 94.8 },
  { day: "03-18", rate: 97.1 },
  { day: "03-19", rate: 88.5 },
  { day: "03-20", rate: 95.6 },
  { day: "03-21", rate: 93.2 },
  { day: "03-22", rate: 96.8 },
];
const throughputByDay = [
  { day: "03-16", jobs: 42 },
  { day: "03-17", jobs: 38 },
  { day: "03-18", jobs: 45 },
  { day: "03-19", jobs: 30 },
  { day: "03-20", jobs: 48 },
  { day: "03-21", jobs: 44 },
  { day: "03-22", jobs: 41 },
];

// ─── Component ────────────────────────────────────────────────

export default function HumanoidRobotPlatform() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRobot, setSelectedRobot] = useState("GRT-H1");
  const [selectedCamera, setSelectedCamera] = useState("cam-01");
  const [selectedRecipe, setSelectedRecipe] = useState("R01");
  const [hmiState, setHmiState] = useState(3); // Running
  const [params, setParams] = useState({ temp: [55], freq: [40], pressure: [2.0], dryTemp: [80] });
  const [woFilter, setWoFilter] = useState<string>("all");
  const [selectedWo, setSelectedWo] = useState<string | null>("WO-001");

  const recipe = recipes.find((r) => r.id === selectedRecipe) ?? recipes[0];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-7 w-7" /> 人型机器人工业清洗平台
        </h1>
        <p className="text-muted-foreground">Humanoid Robot Platform — 视觉·上下料·HMI·维护</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1" />总览</TabsTrigger>
          <TabsTrigger value="vision"><Eye className="h-4 w-4 mr-1" />视觉系统</TabsTrigger>
          <TabsTrigger value="handling"><Package className="h-4 w-4 mr-1" />上下料</TabsTrigger>
          <TabsTrigger value="hmi"><Settings className="h-4 w-4 mr-1" />HMI控制</TabsTrigger>
          <TabsTrigger value="schedule"><ClipboardList className="h-4 w-4 mr-1" />维护计划</TabsTrigger>
          <TabsTrigger value="execution"><Wrench className="h-4 w-4 mr-1" />维护执行</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />数据分析</TabsTrigger>
        </TabsList>

        {/* ═══════ Tab 1: Overview ═══════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "活跃机器人", value: "3 / 4", icon: Bot, color: "text-blue-600" },
              { label: "进行中作业", value: "4", icon: Zap, color: "text-green-600" },
              { label: "待维护", value: "2", icon: Wrench, color: "text-yellow-600" },
              { label: "今日视觉通过率", value: "96.8%", icon: Eye, color: "text-purple-600" },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <kpi.icon className={cn("h-8 w-8", kpi.color)} />
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Robot fleet grid */}
          <div>
            <h3 className="font-semibold mb-3">机器人舰队</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {robots.map((r) => {
                const st = statusStyles[r.status];
                return (
                  <Card key={r.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{r.name}</span>
                        <Badge variant="outline" className="text-xs">{r.model}</Badge>
                      </div>
                      <Badge className={cn("text-xs", st.bg, st.text)}>{st.label}</Badge>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>当前任务: {r.task}</div>
                        <div>工位: {r.station}</div>
                        <div>累计运行: {r.runtime}h</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Alerts + Quick actions */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">告警时间线</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.map((a) => (
                    <div key={a.id} className={cn("flex items-start gap-2 p-2 rounded text-sm", a.level === "error" ? "bg-red-50" : "bg-yellow-50")}>
                      <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", a.level === "error" ? "text-red-500" : "text-yellow-500")} />
                      <div className="flex-1">
                        <span className="text-muted-foreground mr-2">{a.time}</span>
                        <span>{a.msg}</span>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{a.robot}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">快速操作</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline"><Plus className="h-4 w-4 mr-2" />创建作业</Button>
                <Button className="w-full justify-start" variant="outline"><FileText className="h-4 w-4 mr-2" />生成工单</Button>
                <Button className="w-full justify-start" variant="outline"><Camera className="h-4 w-4 mr-2" />摄像头视图</Button>
                <Button className="w-full justify-start" variant="outline"><Activity className="h-4 w-4 mr-2" />舰队状态</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════ Tab 2: Vision System ═══════ */}
        <TabsContent value="vision" className="space-y-4">
          <div className="grid lg:grid-cols-10 gap-4">
            {/* Left: Task list (4/10) */}
            <Card className="lg:col-span-4">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">视觉任务</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />新建</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>新建视觉任务</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><label className="text-sm font-medium">任务名称</label><Input placeholder="例: 零件识别" /></div>
                      <div>
                        <label className="text-sm font-medium">任务类型</label>
                        <Select><SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="part_recognition">零件识别</SelectItem>
                            <SelectItem value="cleanliness_check">清洁度检测</SelectItem>
                            <SelectItem value="dimension_measure">尺寸测量</SelectItem>
                            <SelectItem value="defect_detection">缺陷检测</SelectItem>
                            <SelectItem value="barcode_scan">条码扫描</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><label className="text-sm font-medium">阈值</label><Input placeholder="置信度阈值 (0-100%)" type="number" /></div>
                      <div><label className="text-sm font-medium">参考图像URL</label><Input placeholder="https://..." /></div>
                      <div><label className="text-sm font-medium">关联配方ID</label><Input placeholder="R01" /></div>
                      <Button className="w-full">创建任务</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr><th className="text-left p-2">任务名</th><th className="text-left p-2">类型</th><th className="p-2">配方</th><th className="p-2">启用</th></tr></thead>
                    <tbody>
                      {visionTasks.map((t) => (
                        <tr key={t.id} className="border-t hover:bg-muted/30">
                          <td className="p-2 font-medium">{t.name}</td>
                          <td className="p-2"><Badge variant="outline" className="text-xs">{t.type}</Badge></td>
                          <td className="p-2 text-center text-xs">{t.recipe}</td>
                          <td className="p-2 text-center">{t.active ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-gray-300 mx-auto" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Center: Camera feed (3/10) */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-base">相机视图</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={selectedRobot} onValueChange={setSelectedRobot}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{robots.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cam-01">Camera-01 (顶部)</SelectItem>
                      <SelectItem value="cam-02">Camera-02 (侧面)</SelectItem>
                      <SelectItem value="cam-03">Camera-03 (底部)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CameraFeedView cameraId={selectedCamera} cameraName={`${selectedRobot} ${selectedCamera}`} />
                <Button className="w-full" size="sm"><Eye className="h-4 w-4 mr-1" />执行视觉任务</Button>
              </CardContent>
            </Card>

            {/* Right: Inspection results (3/10) */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-base">检测结果</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Latest result */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">齿轮轴-A01</span>
                    <Badge className="bg-green-100 text-green-700">PASS</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">置信度</div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "97.2%" }} />
                  </div>
                  <div className="text-xs text-right font-mono">97.2%</div>
                  <div className="text-xs text-muted-foreground">测量值: 外径 45.02mm (标准 45.00±0.05)</div>
                </div>

                {/* Bounding boxes placeholder */}
                <div className="relative bg-gray-200 rounded-lg h-32 flex items-center justify-center overflow-hidden">
                  <span className="text-xs text-gray-500">视觉检测区域</span>
                  <div className="absolute top-3 left-4 w-16 h-12 border-2 border-green-500 rounded" />
                  <div className="absolute top-6 right-6 w-12 h-10 border-2 border-red-500 rounded" />
                  <div className="absolute bottom-4 left-10 w-20 h-8 border-2 border-green-500 rounded" />
                </div>

                {/* History */}
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0"><tr><th className="text-left p-1.5">时间</th><th className="text-left p-1.5">零件</th><th className="p-1.5">结果</th><th className="p-1.5">置信度</th></tr></thead>
                    <tbody>
                      {visionHistory.map((h, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1.5 text-muted-foreground">{h.date}</td>
                          <td className="p-1.5">{h.part}</td>
                          <td className="p-1.5 text-center">
                            <Badge className={cn("text-[10px]", h.result === "pass" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                              {h.result === "pass" ? "PASS" : "FAIL"}
                            </Badge>
                          </td>
                          <td className="p-1.5 text-center font-mono">{h.confidence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════ Tab 3: Material Handling ═══════ */}
        <TabsContent value="handling" className="space-y-4">
          {/* Job queue with progress */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">作业队列</CardTitle>
              <Dialog>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />创建作业</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>创建上下料作业</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">机器人</label>
                      <Select><SelectTrigger><SelectValue placeholder="选择机器人" /></SelectTrigger>
                        <SelectContent>{robots.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><label className="text-sm font-medium">零件编号</label><Input placeholder="例: 齿轮轴-A01" /></div>
                    <div><label className="text-sm font-medium">取料源</label><Input placeholder="例: 料架-01" /></div>
                    <div><label className="text-sm font-medium">放料目标</label><Input placeholder="例: 清洗槽-A" /></div>
                    <div>
                      <label className="text-sm font-medium">优先级</label>
                      <Select><SelectTrigger><SelectValue placeholder="选择优先级" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="normal">中</SelectItem>
                          <SelectItem value="low">低</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full">创建</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">作业号</th>
                      <th className="text-left p-2">机器人</th>
                      <th className="text-left p-2">零件</th>
                      <th className="p-2">优先级</th>
                      <th className="p-2 min-w-[280px]">进度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handlingJobs.map((j) => (
                      <tr key={j.id} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-mono font-medium">{j.id}</td>
                        <td className="p-2">{j.robot}</td>
                        <td className="p-2">{j.part}</td>
                        <td className="p-2 text-center">
                          <Badge className={cn("text-xs", priorityStyles[j.priority]?.bg, priorityStyles[j.priority]?.text)}>
                            {j.priority === "high" ? "高" : j.priority === "normal" ? "中" : "低"}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {handlingSteps.map((step, si) => (
                              <div key={step} className="flex items-center">
                                <div className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                                  si < j.currentStep ? "bg-green-500 text-white" :
                                  si === j.currentStep ? "bg-blue-500 text-white animate-pulse" :
                                  "bg-gray-200 text-gray-500"
                                )}>
                                  {step}
                                </div>
                                {si < handlingSteps.length - 1 && (
                                  <div className={cn("w-3 h-0.5 mx-0.5", si < j.currentStep ? "bg-green-400" : "bg-gray-200")} />
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Station buffer + components */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">入料缓冲区</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inputBuffer.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                      <span>{item.part}</span>
                      <Badge variant="outline">{item.qty} 件</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">出料缓冲区</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {outputBuffer.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-green-50 rounded text-sm">
                      <span>{item.part}</span>
                      <Badge variant="outline">{item.qty} 件</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <GripperStatus gripperType="平行夹爪 PJ-200" status="closed" forceN={85} maxForceN={150} />
          </div>

          <MaterialFlowDiagram currentStep="machine" inputCount={3} outputCount={2} machineStatus="running" />
        </TabsContent>

        {/* ═══════ Tab 4: HMI Control ═══════ */}
        <TabsContent value="hmi" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Recipe + Controls */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">配方与控制</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Recipe selector */}
                <div>
                  <label className="text-sm font-medium mb-1 block">清洗配方</label>
                  <Select value={selectedRecipe} onValueChange={(v) => {
                    setSelectedRecipe(v);
                    const r = recipes.find((x) => x.id === v);
                    if (r) setParams({ temp: [r.temp], freq: [r.freq], pressure: [r.pressure], dryTemp: [r.dryTemp] });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{recipes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* Control buttons */}
                <div className="flex gap-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-lg" onClick={() => setHmiState(3)}><Play className="h-5 w-5 mr-1" />启动</Button>
                  <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white h-12" variant="secondary" onClick={() => setHmiState(1)}><Pause className="h-5 w-5 mr-1" />暂停</Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12" variant="destructive" onClick={() => setHmiState(0)}><Square className="h-5 w-5 mr-1" />停止</Button>
                  <Button className="flex-1 h-12" variant="outline" onClick={() => setHmiState(0)}><Home className="h-5 w-5 mr-1" />归零</Button>
                </div>

                {/* Parameter sliders */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm"><span>清洗温度</span><span className="font-mono">{params.temp[0]}°C</span></div>
                    <Slider value={params.temp} onValueChange={(v) => setParams((p) => ({ ...p, temp: v }))} min={40} max={80} step={1} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm"><span>超声频率</span><span className="font-mono">{params.freq[0]} kHz</span></div>
                    <Slider value={params.freq} onValueChange={(v) => setParams((p) => ({ ...p, freq: v }))} min={25} max={130} step={1} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm"><span>喷淋压力</span><span className="font-mono">{params.pressure[0].toFixed(1)} bar</span></div>
                    <Slider value={params.pressure} onValueChange={(v) => setParams((p) => ({ ...p, pressure: v }))} min={0.5} max={5} step={0.1} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm"><span>干燥温度</span><span className="font-mono">{params.dryTemp[0]}°C</span></div>
                    <Slider value={params.dryTemp} onValueChange={(v) => setParams((p) => ({ ...p, dryTemp: v }))} min={60} max={120} step={1} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* State machine + Status */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">状态机</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {hmiStates.map((state, i) => (
                      <div key={state} className="flex items-center shrink-0">
                        <div className={cn(
                          "px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all",
                          i === hmiState
                            ? "bg-blue-500 text-white border-blue-400 shadow-lg animate-pulse"
                            : i < hmiState
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          {state}
                        </div>
                        {i < hmiStates.length - 1 && (
                          <div className={cn("w-4 h-0.5 mx-0.5", i < hmiState ? "bg-green-400" : "bg-gray-200")} />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">状态仪表盘</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "当前任务", value: "零件清洗 #J-0041" },
                      { label: "下一任务", value: "#J-0043 排队中" },
                      { label: "今日运行时间", value: "6.5h" },
                      { label: "今日周期数", value: "23 次" },
                      { label: "夹爪状态", value: "正常 (85N)" },
                      { label: "通信状态", value: "已连接" },
                    ].map((item) => (
                      <div key={item.label} className="border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="text-sm font-medium mt-1">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ Tab 5: Maintenance Schedule ═══════ */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <MaintenanceCalendar
              schedules={maintenanceSchedules}
              workOrders={workOrders.map((wo) => ({ id: wo.id, scheduledStartAt: "2026-03-22", status: wo.status, priority: wo.priority }))}
              className="lg:col-span-1"
            />

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">维护计划</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline"><FileText className="h-3 w-3 mr-1" />生成工单 (2)</Button>
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />新建计划</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>新建维护计划</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><label className="text-sm font-medium">计划名称</label><Input placeholder="例: 月度校准" /></div>
                        <div>
                          <label className="text-sm font-medium">维护类型</label>
                          <Select><SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">日常</SelectItem>
                              <SelectItem value="weekly">每周</SelectItem>
                              <SelectItem value="monthly">月度</SelectItem>
                              <SelectItem value="quarterly">季度</SelectItem>
                              <SelectItem value="runtime_based">运行时</SelectItem>
                              <SelectItem value="event_triggered">事件触发</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><label className="text-sm font-medium">关联机器人</label><Input placeholder="GRT-H1 或 ALL" /></div>
                        <div><label className="text-sm font-medium">下次到期</label><Input type="date" /></div>
                        <div><label className="text-sm font-medium">预计耗时 (小时)</label><Input type="number" /></div>
                        <Button className="w-full">创建</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">计划名称</th>
                        <th className="p-2">类型</th>
                        <th className="p-2">机器人</th>
                        <th className="p-2">周期</th>
                        <th className="p-2">下次到期</th>
                        <th className="p-2">预计耗时</th>
                        <th className="p-2">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenanceSchedules.map((s) => {
                        const overdue = s.nextDueDate < "2026-03-22";
                        return (
                          <tr key={s.id} className={cn("border-t hover:bg-muted/30", overdue && "bg-red-50")}>
                            <td className="p-2 font-medium">{s.scheduleName}</td>
                            <td className="p-2 text-center"><Badge variant="outline" className="text-xs">{s.maintenanceType}</Badge></td>
                            <td className="p-2 text-center">{s.robotId}</td>
                            <td className="p-2 text-center text-xs">{s.intervalDesc}</td>
                            <td className={cn("p-2 text-center text-xs font-mono", overdue && "text-red-600 font-bold")}>{s.nextDueDate}</td>
                            <td className="p-2 text-center text-xs">{s.estimatedHours}h</td>
                            <td className="p-2 text-center">
                              {overdue ? <Badge className="bg-red-100 text-red-700 text-xs">逾期</Badge> : <Badge className="bg-green-100 text-green-700 text-xs">正常</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════ Tab 6: Maintenance Execution ═══════ */}
        <TabsContent value="execution" className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={woFilter === "all" ? "default" : "outline"} onClick={() => setWoFilter("all")}>全部 ({workOrders.length})</Button>
            {woStatusFilters.map((f) => {
              const count = workOrders.filter((w) => w.status === f).length;
              return (
                <Button key={f} size="sm" variant={woFilter === f ? "default" : "outline"} onClick={() => setWoFilter(f)}>
                  {woStatusLabels[f]} ({count})
                </Button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* WO list (2/5) */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">工单列表</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workOrders
                    .filter((w) => woFilter === "all" || w.status === woFilter)
                    .map((wo) => (
                      <div
                        key={wo.id}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedWo === wo.id && "ring-2 ring-blue-500 bg-blue-50/50"
                        )}
                        onClick={() => setSelectedWo(wo.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground">{wo.code}</span>
                            <div className="font-medium text-sm">{wo.title}</div>
                          </div>
                          <Badge className={cn("text-xs shrink-0", priorityStyles[wo.priority]?.bg, priorityStyles[wo.priority]?.text)}>
                            {wo.priority}
                          </Badge>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{wo.equipment}</span>
                          <span>{wo.assignee}</span>
                          <Badge variant="outline" className="text-[10px]">{woStatusLabels[wo.status]}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* WO Detail (3/5) */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-base">工单详情 — {workOrders.find((w) => w.id === selectedWo)?.title ?? "—"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {selectedWo ? (
                  <>
                    {/* Step executor */}
                    <MaintenanceStepExecutor steps={demoSteps} onStepComplete={(n) => console.info("Step complete:", n)} onAddEvidence={(n) => console.info("Add evidence:", n)} />

                    {/* Parts consumed */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">消耗备件</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50"><tr><th className="text-left p-2">备件</th><th className="p-2">数量</th><th className="p-2">单价</th></tr></thead>
                          <tbody>
                            <tr className="border-t"><td className="p-2">密封圈 O-Ring 45x3</td><td className="p-2 text-center">2</td><td className="p-2 text-center">¥35</td></tr>
                            <tr className="border-t"><td className="p-2">润滑脂 SKF LGMT3</td><td className="p-2 text-center">1</td><td className="p-2 text-center">¥180</td></tr>
                            <tr className="border-t"><td className="p-2">传感器校准片</td><td className="p-2 text-center">1</td><td className="p-2 text-center">¥520</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sign-off */}
                    <div className="border rounded-lg p-3 space-y-3">
                      <h4 className="text-sm font-semibold">验收签字</h4>
                      <div className="flex items-center gap-2">
                        <Checkbox id="qv" />
                        <label htmlFor="qv" className="text-sm">质量验证已通过</label>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">审核人</label>
                        <Input placeholder="审核人姓名" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">备注</label>
                        <Textarea placeholder="验收备注..." className="mt-1 min-h-[60px]" />
                      </div>
                      <Button size="sm"><CheckCircle2 className="h-4 w-4 mr-1" />确认验收</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-12">请选择一个工单查看详情</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════ Tab 7: Analytics ═══════ */}
        <TabsContent value="analytics" className="space-y-4">
          {/* Top KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Uptime 可用率", value: "98.2%", sub: "本月累计" },
              { label: "MTBF 平均故障间隔", value: "720h", sub: "最近 90 天" },
              { label: "MTTR 平均修复时间", value: "2.5h", sub: "最近 90 天" },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold mt-1">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bar charts row */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Runtime per robot */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">运行时间 (小时/月)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uptimeByRobot.map((r) => {
                    const pct = (r.hours / 720) * 100;
                    return (
                      <div key={r.name} className="flex items-center gap-3">
                        <span className="text-sm w-16 shrink-0">{r.name}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${pct}%` }}>
                            <span className="text-[10px] text-white font-mono">{r.hours}h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Maintenance cost */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">维护成本 (元/月)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {costByMonth.map((m) => {
                    const pct = (m.cost / 20000) * 100;
                    return (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="text-sm w-12 shrink-0">{m.month}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${pct}%` }}>
                            <span className="text-[10px] text-white font-mono">¥{m.cost.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vision pass rate + throughput */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">视觉通过率 (7天)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {visionPassRateByDay.map((d) => {
                    const h = (d.rate / 100) * 100;
                    const color = d.rate >= 95 ? "bg-green-500" : d.rate >= 90 ? "bg-yellow-500" : "bg-red-500";
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-mono">{d.rate}%</span>
                        <div className="w-full bg-muted rounded-t flex flex-col justify-end" style={{ height: "80px" }}>
                          <div className={cn("w-full rounded-t", color)} style={{ height: `${h * 0.8}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{d.day.slice(3)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">上下料吞吐量 (作业/天)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {throughputByDay.map((d) => {
                    const maxJobs = 60;
                    const h = (d.jobs / maxJobs) * 100;
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-mono">{d.jobs}</span>
                        <div className="w-full bg-muted rounded-t flex flex-col justify-end" style={{ height: "80px" }}>
                          <div className="w-full bg-blue-500 rounded-t" style={{ height: `${h * 0.8}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{d.day.slice(3)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
