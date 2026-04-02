import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  Play,
  Pause,
  Square,
  AlertTriangle,
  Camera,
  Upload,
  Plus,
  Crosshair,
  Thermometer,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  RotateCcw,
} from "lucide-react";

// ─── Demo Data ─────────────────────────────────────────────────

const DEMO_ROBOTS = [
  { id: 1, name: "KUKA KR360-R2830", brand: "KUKA", cell: "Cell-A1" },
  { id: 2, name: "FANUC M-20iD/25", brand: "FANUC", cell: "Cell-A2" },
  { id: 3, name: "ABB IRB6700-205/2.80", brand: "ABB", cell: "Cell-B1" },
  { id: 4, name: "Staubli TX2-90L", brand: "Staubli", cell: "Cell-B2" },
];

const SESSION_TYPES = [
  { value: "commissioning", label: "调试验收", color: "bg-blue-100 text-blue-700" },
  { value: "parameter_tuning", label: "参数调优", color: "bg-purple-100 text-purple-700" },
  { value: "collision_test", label: "碰撞测试", color: "bg-red-100 text-red-700" },
  { value: "program_debug", label: "程序调试", color: "bg-green-100 text-green-700" },
  { value: "calibration", label: "标定校准", color: "bg-orange-100 text-orange-700" },
];

const DEMO_SESSIONS = [
  { id: 1, sessionName: "KR360 M8调试-清洗工位", sessionType: "commissioning", status: "in_progress", operatorName: "李大鹏", createdAt: "2026-03-20 09:30" },
  { id: 2, sessionName: "FANUC 速度优化", sessionType: "parameter_tuning", status: "completed", operatorName: "洪香龙", createdAt: "2026-03-19 14:00" },
  { id: 3, sessionName: "IRB6700 碰撞包络验证", sessionType: "collision_test", status: "paused", operatorName: "朱宇浩", createdAt: "2026-03-18 10:15" },
  { id: 4, sessionName: "TX2-90 零点标定", sessionType: "calibration", status: "created", operatorName: "孙坚", createdAt: "2026-03-21 08:00" },
];

const DEMO_PROGRAMS = [
  { id: 1, name: "清洗主程序", file: "WASH_MAIN.src", type: "robot_motion", lines: 342 },
  { id: 2, name: "上料程序", file: "LOAD_PART.src", type: "robot_motion", lines: 128 },
  { id: 3, name: "下料程序", file: "UNLOAD_PART.src", type: "robot_motion", lines: 115 },
  { id: 4, name: "标定程序", file: "CALIB_TCP.src", type: "robot_motion", lines: 89 },
  { id: 5, name: "急停恢复", file: "ESTOP_RECOVER.st", type: "plc_st", lines: 56 },
  { id: 6, name: "回零程序", file: "HOME_ALL.src", type: "robot_motion", lines: 67 },
];

const DEMO_EXEC_LOG = [
  { ts: "2026-03-20 10:15:32", program: "清洗主程序", result: "success", durationMs: 12400 },
  { ts: "2026-03-20 10:12:08", program: "上料程序", result: "success", durationMs: 5200 },
  { ts: "2026-03-20 10:08:45", program: "标定程序", result: "failed", durationMs: 3100 },
  { ts: "2026-03-20 09:55:10", program: "回零程序", result: "success", durationMs: 8700 },
];

const JOINT_LIMITS = [
  { joint: "J1", limit: 185 },
  { joint: "J2", limit: 130 },
  { joint: "J3", limit: 120 },
  { joint: "J4", limit: 350 },
  { joint: "J5", limit: 125 },
  { joint: "J6", limit: 350 },
];

const DEMO_JOINTS = [45.2, -30.8, 65.1, 12.5, -88.3, 170.0];
const DEMO_TCP = { x: 1245.3, y: -320.8, z: 890.5, rx: 12.4, ry: -5.7, rz: 178.2 };
const DEMO_MOTOR_TEMPS = [42.5, 55.3, 48.7, 38.1, 61.2, 44.8];

const DEMO_SNAPSHOTS = [
  { id: 1, label: "初始状态", speedPct: 30, accelPct: 25, overridePct: 50, payloadKg: 15.0, j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 },
  { id: 2, label: "速度优化后", speedPct: 65, accelPct: 50, overridePct: 80, payloadKg: 15.0, j1: 45.2, j2: -30.8, j3: 65.1, j4: 12.5, j5: -88.3, j6: 170.0 },
  { id: 3, label: "最终参数", speedPct: 80, accelPct: 70, overridePct: 100, payloadKg: 12.5, j1: 45.2, j2: -30.8, j3: 65.1, j4: 12.5, j5: -88.3, j6: 170.0 },
];

const DEMO_CAMERAS = [
  { id: 1, name: "工位正面 CAM-01", position: "Front" },
  { id: 2, name: "侧面监控 CAM-02", position: "Side" },
  { id: 3, name: "顶部鸟瞰 CAM-03", position: "Top" },
  { id: 4, name: "TCP特写 CAM-04", position: "TCP Close-up" },
];

const CHECKLIST_ITEMS = [
  "机械安装验收",
  "电气接线检查",
  "通讯测试完成",
  "零点标定完成",
  "运动测试通过",
  "速度调整完毕",
  "碰撞设置验证",
  "验收签字确认",
];

// ─── Helpers ───────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    created: { variant: "outline", label: "待开始" },
    in_progress: { variant: "default", label: "进行中" },
    paused: { variant: "secondary", label: "已暂停" },
    completed: { variant: "default", label: "已完成" },
    aborted: { variant: "destructive", label: "已终止" },
  };
  const s = map[status] ?? { variant: "outline" as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function typeBadge(type: string) {
  const found = SESSION_TYPES.find((t) => t.value === type);
  if (!found) return <Badge variant="outline">{type}</Badge>;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${found.color}`}>{found.label}</span>;
}

function programTypeBadge(type: string) {
  const map: Record<string, string> = {
    robot_motion: "bg-blue-100 text-blue-700",
    plc_ladder: "bg-amber-100 text-amber-700",
    plc_st: "bg-teal-100 text-teal-700",
  };
  const cls = map[type] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{type}</span>;
}

function resultBadge(result: string) {
  if (result === "success") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">SUCCESS</Badge>;
  if (result === "failed") return <Badge variant="destructive">FAILED</Badge>;
  return <Badge variant="outline">{result}</Badge>;
}

function tempColor(temp: number): string {
  if (temp >= 80) return "bg-red-500";
  if (temp >= 60) return "bg-yellow-500";
  return "bg-green-500";
}

// ─── SVG Radar Chart ───────────────────────────────────────────

function RadarChart({
  joints,
  limits,
  size = 300,
}: {
  joints: number[];
  limits: { joint: string; limit: number }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 40;
  const n = 6;

  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointOnAxis = (i: number, value: number, maxVal: number) => {
    const a = angleFor(i);
    const r = (Math.abs(value) / maxVal) * radius;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  // Limit polygon (red dashed)
  const limitPoints = limits.map((l, i) => pointOnAxis(i, l.limit, Math.max(...limits.map((x) => x.limit))));
  const limitPath = limitPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Current polygon (blue)
  const maxVal = Math.max(...limits.map((x) => x.limit));
  const currentPoints = joints.map((j, i) => pointOnAxis(i, j, maxVal));
  const currentPath = currentPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid circles */}
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <circle
          key={scale}
          cx={cx}
          cy={cy}
          r={radius * scale}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}
      {/* Axis lines + labels */}
      {limits.map((l, i) => {
        const a = angleFor(i);
        const ex = cx + (radius + 20) * Math.cos(a);
        const ey = cy + (radius + 20) * Math.sin(a);
        const lx = cx + radius * Math.cos(a);
        const ly = cy + radius * Math.sin(a);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={lx} y2={ly} stroke="#d1d5db" strokeWidth={1} />
            <text x={ex} y={ey} textAnchor="middle" dominantBaseline="central" className="text-[10px] fill-gray-500">
              {l.joint} {"\u00B1"}{l.limit}{"\u00B0"}
            </text>
          </g>
        );
      })}
      {/* Limit polygon */}
      <path d={limitPath} fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 3" />
      {/* Current polygon */}
      <path d={currentPath} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth={2} />
      {/* Current dots */}
      {currentPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function RobotDebugSandbox() {
  const [activeTab, setActiveTab] = useState("commissioning");
  const [selectedRobot, setSelectedRobot] = useState("1");
  const [checklist, setChecklist] = useState<boolean[]>(new Array(8).fill(false));
  const [joints, setJoints] = useState(DEMO_JOINTS);
  const [speedPct, setSpeedPct] = useState(65);
  const [accelPct, setAccelPct] = useState(50);
  const [overridePct, setOverridePct] = useState(80);
  const [payloadKg, setPayloadKg] = useState(15);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [compareA, setCompareA] = useState("1");
  const [compareB, setCompareB] = useState("3");
  const [selectedCamera, setSelectedCamera] = useState("1");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionType, setNewSessionType] = useState("commissioning");

  const checklistPct = useMemo(() => {
    const done = checklist.filter(Boolean).length;
    return Math.round((done / checklist.length) * 100);
  }, [checklist]);

  const toggleCheck = useCallback((idx: number) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }, []);

  const robot = DEMO_ROBOTS.find((r) => r.id === parseInt(selectedRobot));

  // Compare snapshots
  const snapA = DEMO_SNAPSHOTS.find((s) => s.id === parseInt(compareA));
  const snapB = DEMO_SNAPSHOTS.find((s) => s.id === parseInt(compareB));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7" /> 工业机器人调试沙盘
          </h1>
          <p className="text-muted-foreground">Robot Debug Sandbox — M8 调试平台</p>
        </div>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          SB 沙盘
        </Badge>
      </div>

      {/* Robot Selector */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap font-medium">选择机器人:</Label>
            <Select value={selectedRobot} onValueChange={setSelectedRobot}>
              <SelectTrigger className="w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEMO_ROBOTS.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name} — {r.cell}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {robot && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{robot.brand}</Badge>
                <span>{robot.cell}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="commissioning" className="text-xs sm:text-sm">
            <Crosshair className="h-4 w-4 mr-1" /> 调试工位
          </TabsTrigger>
          <TabsTrigger value="program" className="text-xs sm:text-sm">
            <Play className="h-4 w-4 mr-1" /> 程序管理
          </TabsTrigger>
          <TabsTrigger value="joints" className="text-xs sm:text-sm">
            <RotateCcw className="h-4 w-4 mr-1" /> 关节可视化
          </TabsTrigger>
          <TabsTrigger value="tuning" className="text-xs sm:text-sm">
            <SlidersHorizontal className="h-4 w-4 mr-1" /> 参数调优
          </TabsTrigger>
          <TabsTrigger value="camera" className="text-xs sm:text-sm">
            <Camera className="h-4 w-4 mr-1" /> 视觉验证
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Commissioning ═══ */}
        <TabsContent value="commissioning" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Session List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">调试会话</CardTitle>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" /> 新建会话
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>创建调试会话</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div>
                            <Label>会话名称</Label>
                            <Input
                              value={newSessionName}
                              onChange={(e) => setNewSessionName(e.target.value)}
                              placeholder="例: KR360 M8调试-清洗工位"
                            />
                          </div>
                          <div>
                            <Label>会话类型</Label>
                            <Select value={newSessionType} onValueChange={setNewSessionType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SESSION_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => setCreateDialogOpen(false)}
                          >
                            创建
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>会话名称</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作员</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEMO_SESSIONS.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.sessionName}</TableCell>
                          <TableCell>{typeBadge(s.sessionType)}</TableCell>
                          <TableCell>{statusBadge(s.status)}</TableCell>
                          <TableCell>{s.operatorName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.createdAt}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {s.status === "in_progress" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 px-2">
                                    <Pause className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {s.status === "paused" && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-blue-600">
                                  <Play className="h-3 w-3" />
                                </Button>
                              )}
                              {s.status === "created" && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-blue-600">
                                  <Play className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* M8 Checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">M8 调试验收清单</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={checklistPct} className="h-3" />
                <p className="text-sm text-muted-foreground text-right">{checklistPct}% 完成</p>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        checked={checklist[i]}
                        onCheckedChange={() => toggleCheck(i)}
                        id={`check-${i}`}
                      />
                      <label
                        htmlFor={`check-${i}`}
                        className={`text-sm cursor-pointer ${checklist[i] ? "line-through text-muted-foreground" : ""}`}
                      >
                        {i + 1}. {item}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Tab 2: Program ═══ */}
        <TabsContent value="program" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Program List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">程序列表</CardTitle>
                  <Button size="sm" variant="outline">
                    <Upload className="h-4 w-4 mr-1" /> 上传程序
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>程序名称</TableHead>
                      <TableHead>文件</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>行数</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEMO_PROGRAMS.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{p.file}</TableCell>
                        <TableCell>{programTypeBadge(p.type)}</TableCell>
                        <TableCell>{p.lines}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 px-2">
                            <Play className="h-3 w-3 mr-1" /> 执行
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Execution Log */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">执行日志</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>程序</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead>耗时</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEMO_EXEC_LOG.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{e.ts}</TableCell>
                        <TableCell>{e.program}</TableCell>
                        <TableCell>{resultBadge(e.result)}</TableCell>
                        <TableCell>{(e.durationMs / 1000).toFixed(1)}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Tab 3: Joint Visualization ═══ */}
        <TabsContent value="joints" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radar Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">关节角度雷达图</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <RadarChart joints={joints} limits={JOINT_LIMITS} size={300} />
                <div className="flex gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500" /> 当前角度
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 border-t-2 border-dashed border-red-500 mt-0.5" style={{ width: 12 }} /> 关节极限
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sliders + TCP + Temps */}
            <div className="space-y-4">
              {/* Joint Sliders */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">关节角度控制</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {JOINT_LIMITS.map((jl, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-8 text-sm font-mono font-medium">{jl.joint}</span>
                      <Slider
                        value={[joints[i]]}
                        min={-jl.limit}
                        max={jl.limit}
                        step={0.1}
                        onValueChange={(v) => {
                          setJoints((prev) => {
                            const next = [...prev];
                            next[i] = v[0];
                            return next;
                          });
                        }}
                        className="flex-1"
                      />
                      <span className="w-20 text-right text-sm font-mono">{joints[i].toFixed(1)}{"\u00B0"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* TCP Position */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">TCP 位姿</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "X", value: DEMO_TCP.x, unit: "mm" },
                      { label: "Y", value: DEMO_TCP.y, unit: "mm" },
                      { label: "Z", value: DEMO_TCP.z, unit: "mm" },
                      { label: "Rx", value: DEMO_TCP.rx, unit: "\u00B0" },
                      { label: "Ry", value: DEMO_TCP.ry, unit: "\u00B0" },
                      { label: "Rz", value: DEMO_TCP.rz, unit: "\u00B0" },
                    ].map((t) => (
                      <div key={t.label} className="rounded-lg border px-3 py-2 text-center">
                        <div className="text-xs text-muted-foreground">{t.label}</div>
                        <div className="text-sm font-mono font-medium">{t.value} {t.unit}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Motor Temps */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    <CardTitle className="text-base">电机温度</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {DEMO_MOTOR_TEMPS.map((temp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-8 text-sm font-mono">J{i + 1}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${tempColor(temp)}`}
                          style={{ width: `${(temp / 100) * 100}%` }}
                        />
                      </div>
                      <span className={`w-16 text-right text-sm font-mono ${temp >= 80 ? "text-red-600 font-bold" : temp >= 60 ? "text-yellow-600" : "text-green-600"}`}>
                        {temp.toFixed(1)}{"\u00B0"}C
                      </span>
                    </div>
                  ))}
                  <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500" /> &lt;60{"\u00B0"}C</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-yellow-500" /> 60-80{"\u00B0"}C</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500" /> &gt;80{"\u00B0"}C</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══ Tab 4: Parameter Tuning ═══ */}
        <TabsContent value="tuning" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sliders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">运行参数</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>速度 Speed</Label>
                    <span className="font-mono">{speedPct}%</span>
                  </div>
                  <Slider value={[speedPct]} min={0} max={100} step={1} onValueChange={(v) => setSpeedPct(v[0])} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>加速度 Acceleration</Label>
                    <span className="font-mono">{accelPct}%</span>
                  </div>
                  <Slider value={[accelPct]} min={0} max={100} step={1} onValueChange={(v) => setAccelPct(v[0])} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>倍率 Override</Label>
                    <span className="font-mono">{overridePct}%</span>
                  </div>
                  <Slider value={[overridePct]} min={0} max={100} step={1} onValueChange={(v) => setOverridePct(v[0])} />
                </div>
                <div className="space-y-2">
                  <Label>负载 Payload (kg)</Label>
                  <Input
                    type="number"
                    value={payloadKg}
                    onChange={(e) => setPayloadKg(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={360}
                    step={0.5}
                  />
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Label>快照标签</Label>
                  <div className="flex gap-2">
                    <Input
                      value={snapshotLabel}
                      onChange={(e) => setSnapshotLabel(e.target.value)}
                      placeholder="例: 速度优化后"
                    />
                    <Button>
                      <Camera className="h-4 w-4 mr-1" /> 抓取快照
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Snapshot Comparison */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">快照对比</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs">基准快照 (A)</Label>
                    <Select value={compareA} onValueChange={setCompareA}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEMO_SNAPSHOTS.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">对比快照 (B)</Label>
                    <Select value={compareB} onValueChange={setCompareB}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEMO_SNAPSHOTS.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {snapA && snapB && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>参数</TableHead>
                        <TableHead className="text-right">A: {snapA.label}</TableHead>
                        <TableHead className="text-right">B: {snapB.label}</TableHead>
                        <TableHead className="text-right">Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { name: "速度%", a: snapA.speedPct, b: snapB.speedPct },
                        { name: "加速度%", a: snapA.accelPct, b: snapB.accelPct },
                        { name: "倍率%", a: snapA.overridePct, b: snapB.overridePct },
                        { name: "负载kg", a: snapA.payloadKg, b: snapB.payloadKg },
                        { name: "J1", a: snapA.j1, b: snapB.j1 },
                        { name: "J2", a: snapA.j2, b: snapB.j2 },
                        { name: "J3", a: snapA.j3, b: snapB.j3 },
                        { name: "J4", a: snapA.j4, b: snapB.j4 },
                        { name: "J5", a: snapA.j5, b: snapB.j5 },
                        { name: "J6", a: snapA.j6, b: snapB.j6 },
                      ].map((row) => {
                        const delta = row.b - row.a;
                        const deltaColor = delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground";
                        return (
                          <TableRow key={row.name}>
                            <TableCell className="font-medium">{row.name}</TableCell>
                            <TableCell className="text-right font-mono">{row.a}</TableCell>
                            <TableCell className="text-right font-mono">{row.b}</TableCell>
                            <TableCell className={`text-right font-mono font-medium ${deltaColor}`}>
                              {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}

                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">历史快照</p>
                  <div className="space-y-1">
                    {DEMO_SNAPSHOTS.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                        <span>{s.label}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                          SPD:{s.speedPct}% ACC:{s.accelPct}% OVR:{s.overridePct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Tab 5: Camera Verification ═══ */}
        <TabsContent value="camera" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Camera Feed */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">相机视图</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEMO_CAMERAS.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm">
                        <Camera className="h-4 w-4 mr-1" /> 截图调试
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center text-gray-500 border border-gray-700">
                    <Camera className="h-16 w-16 mb-3 text-gray-600" />
                    <p className="text-sm">
                      {DEMO_CAMERAS.find((c) => c.id === parseInt(selectedCamera))?.name ?? "Camera"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">实时视频流 (需连接网关)</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Snapshot Gallery */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">调试截图</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: 1, ts: "10:15:32", cam: "CAM-01", desc: "清洗工位正面" },
                  { id: 2, ts: "10:12:08", cam: "CAM-02", desc: "TCP接近工件" },
                  { id: 3, ts: "10:08:45", cam: "CAM-04", desc: "标定板对准" },
                  { id: 4, ts: "09:55:10", cam: "CAM-03", desc: "全局鸟瞰" },
                ].map((snap) => (
                  <div key={snap.id} className="border rounded-lg overflow-hidden">
                    <div className="aspect-video bg-gray-800 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-600" />
                    </div>
                    <div className="p-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">{snap.desc}</span>
                        <Badge variant="outline" className="text-[10px] h-4">{snap.cam}</Badge>
                      </div>
                      <span className="text-muted-foreground">{snap.ts}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
