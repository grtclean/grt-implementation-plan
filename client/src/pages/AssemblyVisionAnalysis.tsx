import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  Maximize,
  Search,
  BarChart3,
  Clock,
  User,
  Calendar,
  ChevronRight,
} from "lucide-react";

// --- Demo Data ---

interface Recording {
  id: number;
  workOrder: string;
  station: string;
  operator: string;
  date: string;
  duration: number; // seconds
  deviationPct: number; // vs standard
  steps: StepTime[];
}

interface StepTime {
  name: string;
  label: string;
  standardSec: number;
  actualSec: number;
}

const SOP_STEPS = [
  { name: "T1", label: "上料", standardSec: 45 },
  { name: "T2", label: "粗洗", standardSec: 60 },
  { name: "T3", label: "精洗", standardSec: 55 },
  { name: "T4", label: "干燥", standardSec: 40 },
  { name: "T5", label: "检测", standardSec: 50 },
];

const WORK_ORDERS = ["WO-2026-0301", "WO-2026-0302", "WO-2026-0303"];
const STATIONS = ["ST-A1", "ST-A2", "ST-B1"];
const OPERATORS = ["吴卫成", "曹庆伟", "焦斌", "赵强"];

function genSteps(deviation: number): StepTime[] {
  return SOP_STEPS.map((s) => {
    const factor = 1 + deviation / 100 + (Math.random() - 0.5) * 0.12;
    return {
      name: s.name,
      label: s.label,
      standardSec: s.standardSec,
      actualSec: Math.round(s.standardSec * factor),
    };
  });
}

const RECORDINGS: Recording[] = [
  { id: 1, workOrder: "WO-2026-0301", station: "ST-A1", operator: "吴卫成", date: "2026-03-20 08:12", duration: 262, deviationPct: 4.8, steps: genSteps(4.8) },
  { id: 2, workOrder: "WO-2026-0301", station: "ST-A1", operator: "曹庆伟", date: "2026-03-20 09:45", duration: 278, deviationPct: 11.2, steps: genSteps(11.2) },
  { id: 3, workOrder: "WO-2026-0301", station: "ST-A2", operator: "焦斌", date: "2026-03-20 10:30", duration: 310, deviationPct: 24.0, steps: genSteps(24.0) },
  { id: 4, workOrder: "WO-2026-0302", station: "ST-B1", operator: "赵强", date: "2026-03-19 14:20", duration: 245, deviationPct: -2.0, steps: genSteps(-2.0) },
  { id: 5, workOrder: "WO-2026-0302", station: "ST-A1", operator: "吴卫成", date: "2026-03-19 15:50", duration: 255, deviationPct: 2.0, steps: genSteps(2.0) },
  { id: 6, workOrder: "WO-2026-0303", station: "ST-A2", operator: "曹庆伟", date: "2026-03-18 08:00", duration: 290, deviationPct: 16.0, steps: genSteps(16.0) },
  { id: 7, workOrder: "WO-2026-0303", station: "ST-B1", operator: "焦斌", date: "2026-03-18 11:10", duration: 335, deviationPct: 34.0, steps: genSteps(34.0) },
  { id: 8, workOrder: "WO-2026-0301", station: "ST-A1", operator: "赵强", date: "2026-03-17 16:40", duration: 248, deviationPct: -0.8, steps: genSteps(-0.8) },
];

const EFFICIENCY_TREND = [
  { day: "03-14", avgSec: 268 },
  { day: "03-15", avgSec: 275 },
  { day: "03-16", avgSec: 260 },
  { day: "03-17", avgSec: 252 },
  { day: "03-18", avgSec: 258 },
  { day: "03-19", avgSec: 250 },
  { day: "03-20", avgSec: 262 },
];

const STANDARD_TOTAL = SOP_STEPS.reduce((s, v) => s + v.standardSec, 0); // 250

// --- Helpers ---

function deviationColor(pct: number): string {
  const abs = Math.abs(pct);
  if (pct < -50) return "text-red-400";
  if (abs <= 10) return "text-green-400";
  if (abs <= 25) return "text-yellow-400";
  return "text-red-400";
}

function deviationBadge(pct: number) {
  const abs = Math.abs(pct);
  if (pct < -50) return <Badge variant="destructive">异常低</Badge>;
  if (abs <= 10) return <Badge className="bg-green-600 hover:bg-green-700 text-white">正常</Badge>;
  if (abs <= 25) return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">偏高</Badge>;
  return <Badge variant="destructive">超标</Badge>;
}

function stepDeviationColor(standard: number, actual: number): string {
  const pct = ((actual - standard) / standard) * 100;
  if (actual < standard * 0.5) return "text-red-400";
  if (pct <= 10) return "text-green-400";
  if (pct <= 25) return "text-yellow-400";
  return "text-red-400";
}

function stepSegmentColor(idx: number): string {
  const palette = ["bg-blue-500", "bg-teal-500", "bg-indigo-500", "bg-amber-500", "bg-purple-500"];
  return palette[idx % palette.length];
}

// --- Component ---

export default function AssemblyVisionAnalysis() {
  const [workOrder, setWorkOrder] = useState<string>("");
  const [station, setStation] = useState<string>("");
  const [operator, setOperator] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<number>(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1x");
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return RECORDINGS.filter((r) => {
      if (workOrder && r.workOrder !== workOrder) return false;
      if (station && r.station !== station) return false;
      if (operator && r.operator !== operator) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo + " 23:59") return false;
      return true;
    });
  }, [workOrder, station, operator, dateFrom, dateTo]);

  const current = RECORDINGS.find((r) => r.id === selectedId) ?? RECORDINGS[0];
  const totalActual = current.steps.reduce((s, v) => s + v.actualSec, 0);
  const totalDeviation = ((totalActual - STANDARD_TOTAL) / STANDARD_TOTAL) * 100;

  const maxTrend = Math.max(...EFFICIENCY_TREND.map((d) => d.avgSec));

  return (
    <div className="flex h-full gap-3 p-4 bg-gray-950 text-gray-100 min-h-screen">
      {/* ========== LEFT PANEL (20%) ========== */}
      <div className="w-[20%] flex flex-col gap-3 shrink-0">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300">筛选条件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">工单</label>
              <Select value={workOrder} onValueChange={setWorkOrder}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-sm h-8">
                  <SelectValue placeholder="全部工单" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">全部工单</SelectItem>
                  {WORK_ORDERS.map((wo) => (
                    <SelectItem key={wo} value={wo}>{wo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">工位</label>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-sm h-8">
                  <SelectValue placeholder="全部工位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">全部工位</SelectItem>
                  {STATIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">操作员</label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-sm h-8">
                  <SelectValue placeholder="全部操作员" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">全部操作员</SelectItem>
                  {OPERATORS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">开始日期</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-sm h-8"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">结束日期</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-sm h-8"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                if (workOrder === "__all") setWorkOrder("");
                if (station === "__all") setStation("");
                if (operator === "__all") setOperator("");
              }}
            >
              <Search className="w-3.5 h-3.5 mr-1" />
              搜索
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700 flex-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300">
              录像列表 ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 space-y-2 pr-1">
            {filtered.map((rec) => (
              <div
                key={rec.id}
                onClick={() => setSelectedId(rec.id)}
                className={`flex gap-2 p-2 rounded cursor-pointer transition-colors ${
                  rec.id === selectedId
                    ? "bg-blue-900/40 border border-blue-500/50"
                    : "bg-gray-800/60 border border-transparent hover:bg-gray-800"
                }`}
              >
                <div className="w-16 h-11 bg-gray-700 rounded flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs text-gray-300">
                    <User className="w-3 h-3" />
                    <span className="truncate">{rec.operator}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>{rec.date}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {rec.duration}s
                    </span>
                    {deviationBadge(rec.deviationPct)}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">无匹配录像</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== CENTER PANEL (50%) ========== */}
      <div className="w-[50%] flex flex-col gap-3 shrink-0">
        {/* Video player */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-0">
            <div className="relative h-80 bg-gray-950 flex items-center justify-center rounded-t-lg">
              <div className="text-center">
                <Play className="w-16 h-16 text-gray-600 mx-auto" />
                <p className="text-gray-500 text-sm mt-2">装配过程回放</p>
              </div>
              <div className="absolute top-3 left-3 text-xs bg-black/60 px-2 py-0.5 rounded text-gray-300">
                {current.station} &mdash; {current.operator}
              </div>
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                  {current.workOrder}
                </Badge>
              </div>
              <div className="absolute bottom-3 left-3 text-xs text-gray-400">
                {current.date} &bull; {current.duration}s
              </div>
            </div>

            {/* SOP Step Timeline */}
            <div className="px-4 py-3 border-t border-gray-800">
              <div className="text-xs text-gray-400 mb-2">SOP 工步时间线</div>
              <div className="relative flex h-7 rounded overflow-hidden">
                {current.steps.map((step, idx) => {
                  const widthPct = (step.actualSec / totalActual) * 100;
                  return (
                    <div
                      key={step.name}
                      className={`${stepSegmentColor(idx)} relative cursor-pointer transition-opacity ${
                        activeStep !== null && activeStep !== idx ? "opacity-40" : "opacity-100"
                      }`}
                      style={{ width: `${widthPct}%` }}
                      onClick={() => setActiveStep(activeStep === idx ? null : idx)}
                      title={`${step.name} ${step.label}: ${step.actualSec}s (标准 ${step.standardSec}s)`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white truncate px-1">
                        {step.name}
                      </span>
                      {idx < current.steps.length - 1 && (
                        <div className="absolute right-0 top-0 h-full w-px bg-gray-900" />
                      )}
                    </div>
                  );
                })}
                {/* Current position indicator */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-yellow-400 z-10"
                  style={{ left: "35%" }}
                />
              </div>
              <div className="flex mt-1">
                {current.steps.map((step, idx) => {
                  const widthPct = (step.actualSec / totalActual) * 100;
                  return (
                    <div
                      key={step.name}
                      className="text-[10px] text-gray-500 text-center truncate"
                      style={{ width: `${widthPct}%` }}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-300"
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Select value={speed} onValueChange={setSpeed}>
                <SelectTrigger className="w-20 h-7 bg-gray-800 border-gray-600 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5x">0.5x</SelectItem>
                  <SelectItem value="1x">1x</SelectItem>
                  <SelectItem value="2x">2x</SelectItem>
                  <SelectItem value="4x">4x</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <div className="text-xs text-gray-400">
                <span className="text-gray-300">{current.operator}</span> &bull; {current.date} &bull; {current.duration}s &bull; {current.workOrder} &bull; {current.station}
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-300">
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== RIGHT PANEL (30%) ========== */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Top: SOP Step Time Comparison */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300">SOP 工步时间对比</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left py-2 px-3 font-medium">工步</th>
                  <th className="text-right py-2 px-3 font-medium">标准(s)</th>
                  <th className="text-right py-2 px-3 font-medium">实际(s)</th>
                  <th className="text-right py-2 px-3 font-medium">偏差</th>
                </tr>
              </thead>
              <tbody>
                {current.steps.map((step) => {
                  const devPct = ((step.actualSec - step.standardSec) / step.standardSec) * 100;
                  return (
                    <tr key={step.name} className="border-b border-gray-800 hover:bg-gray-800/40">
                      <td className="py-1.5 px-3 text-gray-300">
                        {step.name} {step.label}
                      </td>
                      <td className="py-1.5 px-3 text-right text-gray-400">{step.standardSec}</td>
                      <td className="py-1.5 px-3 text-right text-gray-200">{step.actualSec}</td>
                      <td className={`py-1.5 px-3 text-right font-medium ${stepDeviationColor(step.standardSec, step.actualSec)}`}>
                        {devPct > 0 ? "+" : ""}{devPct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-800/50 font-medium">
                  <td className="py-1.5 px-3 text-gray-200">合计</td>
                  <td className="py-1.5 px-3 text-right text-gray-300">{STANDARD_TOTAL}</td>
                  <td className="py-1.5 px-3 text-right text-gray-100">{totalActual}</td>
                  <td className={`py-1.5 px-3 text-right font-bold ${deviationColor(totalDeviation)}`}>
                    {totalDeviation > 0 ? "+" : ""}{totalDeviation.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Bottom: Operator Efficiency + Station Stats */}
        <Card className="bg-gray-900 border-gray-700 flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              操作员效率趋势
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mini horizontal bar chart */}
            <div className="space-y-1.5">
              {EFFICIENCY_TREND.map((d) => {
                const pct = (d.avgSec / maxTrend) * 100;
                const stdPct = (STANDARD_TOTAL / maxTrend) * 100;
                const over = d.avgSec > STANDARD_TOTAL;
                return (
                  <div key={d.day} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-10 shrink-0">{d.day}</span>
                    <div className="flex-1 relative h-4 bg-gray-800 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${over ? "bg-yellow-600/70" : "bg-green-600/70"}`}
                        style={{ width: `${pct}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-px bg-red-400/80"
                        style={{ left: `${stdPct}%` }}
                        title={`标准 ${STANDARD_TOTAL}s`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-8 text-right">{d.avgSec}s</span>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-gray-400">
              红线 = 标准 {STANDARD_TOTAL}s &bull; 平均偏差:{" "}
              <span className={deviationColor(
                ((EFFICIENCY_TREND.reduce((s, d) => s + d.avgSec, 0) / EFFICIENCY_TREND.length - STANDARD_TOTAL) / STANDARD_TOTAL) * 100
              )}>
                {(((EFFICIENCY_TREND.reduce((s, d) => s + d.avgSec, 0) / EFFICIENCY_TREND.length - STANDARD_TOTAL) / STANDARD_TOTAL) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs border-gray-600 h-7">
                <ChevronRight className="w-3 h-3 mr-1" />
                对比
              </Button>
            </div>

            <div className="border-t border-gray-800 pt-3 mt-2">
              <div className="text-xs text-gray-400 mb-2">工位统计 ({current.station})</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-800 rounded p-2 text-center">
                  <div className="text-lg font-bold text-gray-100">
                    {RECORDINGS.filter((r) => r.station === current.station).length}
                  </div>
                  <div className="text-[10px] text-gray-500">总录像数</div>
                </div>
                <div className="bg-gray-800 rounded p-2 text-center">
                  <div className="text-lg font-bold text-gray-100">
                    {Math.round(
                      RECORDINGS.filter((r) => r.station === current.station).reduce((s, r) => s + r.duration, 0) /
                        Math.max(1, RECORDINGS.filter((r) => r.station === current.station).length)
                    )}s
                  </div>
                  <div className="text-[10px] text-gray-500">平均周期</div>
                </div>
                <div className="bg-gray-800 rounded p-2 text-center">
                  <div className="text-lg font-bold text-green-400">96.2%</div>
                  <div className="text-[10px] text-gray-500">FPY</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
