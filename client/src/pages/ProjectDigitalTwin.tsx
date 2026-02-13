/**
 * 项目数字孪生仪表盘
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Cpu, TrendingUp, DollarSign, Shield, Users, AlertTriangle,
  Clock, Sparkles, Play, RotateCcw,
} from "lucide-react";
import StagePipeline from "./rd-verification/StagePipeline";
import { STAGES } from "../../../shared/stage-definitions";

// -- mock project --
const PROJECT = {
  id: "PRJ-2026-018",
  name: "上海大众 IC-2000 缸体清洗线",
  customer: "上海大众汽车",
  model: "IC-2000",
  currentStage: "M5",
  completedStages: ["M0", "M1", "M2", "M3", "M4"],
  pm: "张工",
  startDate: "2025-09-15",
  targetDate: "2026-06-30",
};

interface GaugeProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

function GaugeCard({ label, value, unit, color, icon }: GaugeProps) {
  const angle = Math.min(Math.max(value, -50), 150) / 150 * 180;
  return (
    <Card>
      <CardContent className="pt-6 flex flex-col items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          {icon}{label}
        </div>
        <svg width="120" height="70" viewBox="0 0 120 70">
          <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="currentColor" className="text-muted" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(angle / 180) * 157} 157`} />
          <text x="60" y="55" textAnchor="middle" className="fill-foreground text-lg font-bold" fontSize="18">{value}{unit}</text>
        </svg>
        <Badge variant={value > 10 ? "destructive" : value > 0 ? "secondary" : "default"} className="mt-1">
          {value > 10 ? "偏差大" : value > 0 ? "轻微偏差" : "正常"}
        </Badge>
      </CardContent>
    </Card>
  );
}

// Milestone prediction data
const MILESTONES = STAGES.map((s, i) => {
  const planned = new Date(2025, 8 + i, 15);
  const jitter = Math.floor(Math.random() * 15) - 3;
  const predicted = new Date(planned.getTime() + jitter * 86400000);
  const done = PROJECT.completedStages.includes(s.id);
  return { ...s, planned, predicted, done, delay: jitter };
});

// Risk radar data (5 axes)
const RISK_AXES = [
  { label: "进度", value: 65 },
  { label: "成本", value: 45 },
  { label: "质量", value: 80 },
  { label: "资源", value: 55 },
  { label: "技术", value: 70 },
];

function RadarChart() {
  const cx = 100, cy = 100, r = 80;
  const n = RISK_AXES.length;
  const points = RISK_AXES.map((a, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const pr = (a.value / 100) * r;
    return { x: cx + pr * Math.cos(angle), y: cy + pr * Math.sin(angle), label: a.label, value: a.value, lx: cx + (r + 18) * Math.cos(angle), ly: cy + (r + 18) * Math.sin(angle) };
  });
  const polygon = points.map(p => `${p.x},${p.y}`).join(" ");
  const gridLevels = [0.25, 0.5, 0.75, 1];
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
      {gridLevels.map(level => {
        const gp = Array.from({ length: n }, (_, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          return `${cx + r * level * Math.cos(angle)},${cy + r * level * Math.sin(angle)}`;
        }).join(" ");
        return <polygon key={level} points={gp} fill="none" stroke="currentColor" className="text-muted" strokeWidth="0.5" />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="currentColor" className="text-muted" strokeWidth="0.5" />;
      })}
      <polygon points={polygon} fill="rgba(59,130,246,0.2)" stroke="rgb(59,130,246)" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="rgb(59,130,246)" />
          <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central" className="fill-foreground" fontSize="11">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ProjectDigitalTwin() {
  const [simDelay, setSimDelay] = useState(0);
  const [simCost, setSimCost] = useState(0);
  const [simResult, setSimResult] = useState<string | null>(null);

  const handleSimulate = () => {
    const impact = [];
    if (simDelay > 0) impact.push(`交期延迟 ${simDelay} 天，项目完成日期推迟至 2026-07-${15 + simDelay}`);
    if (simCost > 0) impact.push(`追加成本 ¥${simCost.toLocaleString()}，总预算偏差率上升至 ${(3.2 + simCost / 100000).toFixed(1)}%`);
    if (impact.length === 0) impact.push("无参数变化，项目按原计划推进");
    setSimResult(impact.join("；"));
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cpu className="h-6 w-6 text-primary" />项目数字孪生
            </h1>
            <p className="text-muted-foreground mt-1">{PROJECT.id} · {PROJECT.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{PROJECT.model}</Badge>
            <Badge variant="secondary">{PROJECT.customer}</Badge>
          </div>
        </div>

        {/* Stage Pipeline */}
        <Card>
          <CardContent className="pt-4 pb-2">
            <StagePipeline currentStage={PROJECT.currentStage} completedStages={PROJECT.completedStages} />
          </CardContent>
        </Card>

        {/* KPI Gauges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GaugeCard label="进度偏差" value={5} unit="%" color="#f59e0b" icon={<Clock className="h-4 w-4" />} />
          <GaugeCard label="成本偏差" value={3.2} unit="%" color="#3b82f6" icon={<DollarSign className="h-4 w-4" />} />
          <GaugeCard label="质量指数" value={94} unit="分" color="#22c55e" icon={<Shield className="h-4 w-4" />} />
          <GaugeCard label="资源利用率" value={82} unit="%" color="#8b5cf6" icon={<Users className="h-4 w-4" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Milestone prediction */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />里程碑预测</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {MILESTONES.map(m => (
                  <div key={m.id} className="flex items-center gap-3 text-sm">
                    <Badge variant={m.done ? "default" : "outline"} className="w-10 justify-center">{m.id}</Badge>
                    <span className="flex-1">{m.name}</span>
                    <span className="text-muted-foreground w-20 text-right">{m.planned.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>
                    <span className={"w-20 text-right font-mono " + (m.delay > 5 ? "text-red-400" : m.delay > 0 ? "text-yellow-400" : "text-green-400")}>
                      {m.delay > 0 ? `+${m.delay}d` : m.delay < 0 ? `${m.delay}d` : "准时"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk radar */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />风险雷达图</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              <RadarChart />
              <div className="flex gap-3 mt-3 flex-wrap justify-center">
                {RISK_AXES.map(a => (
                  <Badge key={a.label} variant={a.value >= 70 ? "destructive" : a.value >= 50 ? "secondary" : "default"}>
                    {a.label}: {a.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What-If Simulator */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" />What-If 模拟器</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">增加延迟 (天)</label>
                <Input type="number" min={0} value={simDelay} onChange={e => setSimDelay(Number(e.target.value))} className="w-28" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">追加成本 (¥)</label>
                <Input type="number" min={0} step={10000} value={simCost} onChange={e => setSimCost(Number(e.target.value))} className="w-36" />
              </div>
              <Button onClick={handleSimulate}><Play className="h-4 w-4 mr-2" />模拟</Button>
              <Button variant="outline" onClick={() => { setSimDelay(0); setSimCost(0); setSimResult(null); }}>
                <RotateCcw className="h-4 w-4 mr-2" />重置
              </Button>
            </div>
            {simResult && (
              <div className="mt-4 p-4 rounded-lg border bg-accent/30">
                <p className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />模拟结果</p>
                <p className="text-sm mt-1">{simResult}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
