/**
 * GRT 能力雷达驾驶舱 — Capability Radar Cockpit
 *
 * CTO-level TSDCKL capability assessment cockpit.
 * 5 tabs:
 *  1. 全员总览 — Overview (dimension stats, department heatmap, level distribution)
 *  2. 个人雷达 — Individual Radar (SVG hexagonal radar, gap table, dev path)
 *  3. 团队对比 — Team Comparison (overlay radar, summary stats)
 *  4. 差距分析 — Gap Analysis (all-employee gap table sorted by total gap)
 *  5. 培养路径 — Development Paths (per-employee dev priorities, rubric, actions)
 *
 * Data: Real CEO assessment data from GRT人员能力测评(202602).xlsx — 30 employees
 * Scores: L1-L5 levels + 0-100 numeric from CEO evaluation
 */

import React, { useState, useMemo } from "react";
import {
  Radar, Users, Target, TrendingUp, BarChart3, ArrowRight,
  ChevronDown, Search, Filter, User, Award, AlertTriangle,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════
// DATA — Embedded from seed-capability-assessment.ts
// ══════════════════════════════════════════════════════════════

interface Employee {
  id: string; name: string; position: string; department: string;
  T: string; S: string; D: string; C: string; K: string; L: string;
  /** Raw 0-100 score from CEO assessment */
  Ts: number; Ss: number; Ds: number; Cs: number; Ks: number; Ls: number;
}

// ── REAL data from CEO assessment (GRT人员能力测评 202602.xlsx) ──
// Names corrected to match employees.json master roster
const ASSESSMENTS: Employee[] = [
  { id: "GRT001", name: "倪亚东", position: "董事长", department: "总裁办", T: "L4", S: "L5", D: "L4", C: "L5", K: "L4", L: "L5", Ts: 85, Ss: 92, Ds: 80, Cs: 95, Ks: 88, Ls: 96 },
  { id: "GRT080", name: "刘奥运", position: "董事长助理", department: "AI数智部", T: "L4", S: "L4", D: "L3", C: "L4", K: "L4", L: "L3", Ts: 82, Ss: 78, Ds: 72, Cs: 85, Ks: 80, Ls: 75 },
  { id: "GRT002", name: "黄晓兰", position: "会计", department: "财务部", T: "L2", S: "L3", D: "L1", C: "L3", K: "L4", L: "L1", Ts: 45, Ss: 68, Ds: 30, Cs: 65, Ks: 82, Ls: 25 },
  { id: "GRT054", name: "王秀萍", position: "总账会计", department: "财务部", T: "L2", S: "L3", D: "L1", C: "L3", K: "L4", L: "L1", Ts: 48, Ss: 65, Ds: 28, Cs: 62, Ks: 85, Ls: 22 },
  { id: "GRT101", name: "王汝月", position: "会计助理", department: "财务部", T: "L1", S: "L2", D: "L1", C: "L2", K: "L3", L: "L1", Ts: 32, Ss: 52, Ds: 25, Cs: 55, Ks: 68, Ls: 18 },
  { id: "GRT066", name: "李新正", position: "仓库管理员", department: "财务部", T: "L2", S: "L2", D: "L1", C: "L2", K: "L3", L: "L1", Ts: 42, Ss: 55, Ds: 28, Cs: 58, Ks: 65, Ls: 20 },
  { id: "GRT067", name: "沙建梅", position: "人事行政主管", department: "人事行政部", T: "L2", S: "L4", D: "L2", C: "L4", K: "L3", L: "L3", Ts: 40, Ss: 82, Ds: 45, Cs: 85, Ks: 72, Ls: 70 },
  { id: "GRT053", name: "段天珠", position: "前法", department: "人事行政部", T: "L2", S: "L3", D: "L2", C: "L3", K: "L4", L: "L2", Ts: 38, Ss: 65, Ds: 42, Cs: 68, Ks: 80, Ls: 48 },
  { id: "GRT100", name: "田炜钰", position: "行政前台", department: "人事行政部", T: "L1", S: "L3", D: "L1", C: "L3", K: "L2", L: "L1", Ts: 30, Ss: 62, Ds: 25, Cs: 65, Ks: 55, Ls: 22 },
  { id: "GRT049", name: "胡杨", position: "IT工程师", department: "AI数智部", T: "L4", S: "L3", D: "L3", C: "L3", K: "L3", L: "L2", Ts: 88, Ss: 65, Ds: 72, Cs: 68, Ks: 70, Ls: 42 },
  { id: "GRT062", name: "朱宇浩", position: "生产工程师兼项目及IT工程师", department: "事业二部", T: "L4", S: "L3", D: "L3", C: "L3", K: "L3", L: "L2", Ts: 85, Ss: 62, Ds: 70, Cs: 65, Ks: 68, Ls: 40 },
  { id: "GRT096", name: "侯晓薇", position: "部门经理", department: "AI数智部", T: "L3", S: "L3", D: "L3", C: "L3", K: "L3", L: "L2", Ts: 72, Ss: 68, Ds: 75, Cs: 62, Ks: 65, Ls: 38 },
  { id: "GRT083", name: "刘坤", position: "市场主管", department: "AI数智部", T: "L3", S: "L3", D: "L2", C: "L4", K: "L3", L: "L2", Ts: 68, Ss: 72, Ds: 55, Cs: 80, Ks: 65, Ls: 45 },
  { id: "GRT103", name: "朱文韬", position: "市场专员", department: "AI数智部", T: "L2", S: "L3", D: "L2", C: "L4", K: "L3", L: "L2", Ts: 48, Ss: 65, Ds: 52, Cs: 78, Ks: 62, Ls: 42 },
  { id: "GRT004", name: "戴晓燕", position: "高级销售经理", department: "事业一部", T: "L3", S: "L4", D: "L2", C: "L5", K: "L3", L: "L4", Ts: 65, Ss: 82, Ds: 48, Cs: 90, Ks: 72, Ls: 78 },
  { id: "GRT005", name: "金晓锋", position: "制造质量经理", department: "事业一部", T: "L4", S: "L3", D: "L3", C: "L3", K: "L4", L: "L3", Ts: 85, Ss: 68, Ds: 72, Cs: 70, Ks: 88, Ls: 68 },
  { id: "GRT022", name: "李大鹏", position: "电气工程师", department: "事业一部", T: "L4", S: "L2", D: "L3", C: "L2", K: "L3", L: "L1", Ts: 82, Ss: 55, Ds: 75, Cs: 52, Ks: 70, Ls: 28 },
  { id: "GRT063", name: "刘健康", position: "销售与项目工程师", department: "事业一部", T: "L3", S: "L4", D: "L2", C: "L4", K: "L3", L: "L3", Ts: 62, Ss: 78, Ds: 45, Cs: 85, Ks: 68, Ls: 65 },
  { id: "GRT006", name: "洪香龙", position: "机械设计经理", department: "事业二部", T: "L5", S: "L3", D: "L5", C: "L3", K: "L4", L: "L3", Ts: 92, Ss: 68, Ds: 90, Cs: 65, Ks: 82, Ls: 72 },
  { id: "GRT044", name: "洪小东", position: "机械研发工程师", department: "事业二部", T: "L4", S: "L2", D: "L4", C: "L2", K: "L3", L: "L1", Ts: 80, Ss: 55, Ds: 82, Cs: 52, Ks: 70, Ls: 28 },
  { id: "GRT097", name: "钱佳奇", position: "电气工程师", department: "事业二部", T: "L4", S: "L2", D: "L3", C: "L2", K: "L3", L: "L1", Ts: 78, Ss: 52, Ds: 72, Cs: 55, Ks: 68, Ls: 25 },
  { id: "GRT003", name: "倪亚琴", position: "采购与项目工程师", department: "事业三部", T: "L3", S: "L3", D: "L2", C: "L3", K: "L3", L: "L2", Ts: 65, Ss: 68, Ds: 52, Cs: 72, Ks: 70, Ls: 45 },
  { id: "GRT007", name: "孙坚", position: "电气主管", department: "事业三部", T: "L4", S: "L3", D: "L4", C: "L3", K: "L4", L: "L3", Ts: 85, Ss: 65, Ds: 78, Cs: 62, Ks: 80, Ls: 68 },
  { id: "GRT055", name: "沈迎凤", position: "采购经理", department: "事业三部", T: "L2", S: "L4", D: "L2", C: "L4", K: "L3", L: "L3", Ts: 48, Ss: 80, Ds: 45, Cs: 82, Ks: 68, Ls: 65 },
  { id: "GRT019", name: "冯艳", position: "销售与项目工程师", department: "事业三部", T: "L3", S: "L3", D: "L2", C: "L4", K: "L3", L: "L2", Ts: 62, Ss: 72, Ds: 48, Cs: 78, Ks: 65, Ls: 42 },
  { id: "GRT018", name: "孙国祥", position: "电气工程师", department: "事业四部", T: "L4", S: "L2", D: "L3", C: "L2", K: "L3", L: "L1", Ts: 82, Ss: 55, Ds: 72, Cs: 52, Ks: 70, Ls: 28 },
  { id: "GRT024", name: "张腾飞", position: "机加工班组长", department: "事业四部", T: "L3", S: "L3", D: "L2", C: "L3", K: "L3", L: "L2", Ts: 72, Ss: 65, Ds: 48, Cs: 68, Ks: 72, Ls: 52 },
  { id: "GRT008", name: "马柯", position: "质量专员", department: "事业十部", T: "L3", S: "L3", D: "L2", C: "L3", K: "L4", L: "L2", Ts: 68, Ss: 62, Ds: 48, Cs: 65, Ks: 80, Ls: 42 },
  { id: "GRT009", name: "史龙昌", position: "激光切作班组长", department: "事业十部", T: "L3", S: "L2", D: "L2", C: "L2", K: "L3", L: "L2", Ts: 72, Ss: 55, Ds: 45, Cs: 58, Ks: 68, Ls: 40 },
  { id: "GRT045", name: "杨勇", position: "生产工程师兼项目经理", department: "事业三部", T: "L3", S: "L4", D: "L2", C: "L4", K: "L3", L: "L3", Ts: 65, Ss: 78, Ds: 48, Cs: 82, Ks: 72, Ls: 68 },
];

const DOMAIN_NAMES: Record<string, string> = {
  T: "硬核技术力", S: "软性通用力", D: "设计与创新力",
  C: "沟通协作力", K: "专业标准力", L: "领导与战略力",
};

const DOMAIN_COLORS: Record<string, string> = {
  T: "#3b82f6", S: "#8b5cf6", D: "#f59e0b",
  C: "#10b981", K: "#ef4444", L: "#ec4899",
};

const DOMAINS = ["T", "S", "D", "C", "K", "L"] as const;
type DomainKey = typeof DOMAINS[number];

const ROLE_TARGETS: Record<string, Record<DomainKey, number>> = {
  "事业部经理":   { T: 4, S: 4, D: 4, C: 4, K: 4, L: 4 },
  "机械研发":     { T: 4, S: 3, D: 4, C: 3, K: 3, L: 2 },
  "电气工程":     { T: 4, S: 3, D: 3, C: 3, K: 3, L: 2 },
  "销售与项目":   { T: 3, S: 4, D: 2, C: 4, K: 3, L: 3 },
  "售后服务":     { T: 3, S: 3, D: 2, C: 4, K: 3, L: 3 },
  "IT&EHS":       { T: 4, S: 3, D: 4, C: 3, K: 3, L: 2 },
  "董助":         { T: 3, S: 4, D: 3, C: 4, K: 3, L: 4 },
  "制造质量":     { T: 4, S: 3, D: 3, C: 3, K: 4, L: 3 },
  "仓库市场销售": { T: 2, S: 3, D: 2, C: 4, K: 3, L: 2 },
  "HR行政":       { T: 2, S: 4, D: 2, C: 4, K: 3, L: 3 },
  "财务":         { T: 3, S: 3, D: 2, C: 3, K: 4, L: 2 },
  "通用":         { T: 3, S: 3, D: 3, C: 3, K: 3, L: 2 },
};

// ══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

function parseLevel(s: string | null | undefined): number {
  if (!s || typeof s !== "string") return 0;
  const m = s.match(/L([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function getJobFamily(position: string): string {
  if (/经理/.test(position) && /事业[一二三四十]部/.test(position)) return "事业部经理";
  if (/机械设计|机械研发/.test(position)) return "机械研发";
  if (/电气/.test(position)) return "电气工程";
  if (/销售|采购|项目/.test(position)) return "销售与项目";
  if (/售后|服务/.test(position)) return "售后服务";
  if (/IT|软件|EHS/.test(position)) return "IT&EHS";
  if (/董事长助理|董助/.test(position)) return "董助";
  if (/制造|质量|班组/.test(position)) return "制造质量";
  if (/仓库|市场|供应链/.test(position)) return "仓库市场销售";
  if (/人事|行政|前台/.test(position)) return "HR行政";
  if (/会计|财务/.test(position)) return "财务";
  return "通用";
}

interface DevPathItem {
  domain: string;
  domainName: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: "critical" | "high" | "medium" | "low";
  nextLevelRubric: string;
  actionItems: string[];
}

function generateDevPath(emp: Employee): DevPathItem[] {
  const jobFamily = getJobFamily(emp.position);
  const targets = ROLE_TARGETS[jobFamily] || ROLE_TARGETS["通用"];
  const items: DevPathItem[] = [];

  for (const d of DOMAINS) {
    const current = parseLevel(emp[d]);
    const target = targets[d];
    const gap = target - current;
    if (gap <= 0) continue;

    const actions: string[] = [];
    if (current < 2) actions.push(`完成${DOMAIN_NAMES[d]}基础培训课程`);
    if (current < 2) actions.push("安排导师一对一带教（每周2次）");
    if (current >= 2 && current < 3) actions.push("主导一个实际项目中的相关任务");
    if (current >= 2 && current < 3) actions.push("提交能力提升证据至能力OS系统");
    if (current >= 3) actions.push("参与跨部门/跨BU协作项目");
    if (d === "K") actions.push("参加ISO/VDA标准认证培训");
    if (d === "C") actions.push("参与客户现场交流或内部跨部门工作坊");
    if (d === "L" && current < 2) actions.push("完成GRT内部领导力基础课程");
    if (d === "L" && current >= 2) actions.push("带教至少1名L1级员工");

    const nextLevel = Math.min(Math.ceil(current) + 1, 5);
    const rubricText = `达到${DOMAIN_NAMES[d]} L${nextLevel}标准`;

    items.push({
      domain: d,
      domainName: DOMAIN_NAMES[d],
      currentLevel: current,
      targetLevel: target,
      gap: Math.round(gap * 10) / 10,
      priority: gap >= 2 ? "critical" : gap >= 1.5 ? "high" : gap >= 1 ? "medium" : "low",
      nextLevelRubric: rubricText,
      actionItems: actions,
    });
  }

  return items.sort((a, b) => b.gap - a.gap);
}

function avgLevel(emp: Employee): number {
  const sum = DOMAINS.reduce((acc, d) => acc + parseLevel(emp[d]), 0);
  return Math.round((sum / 6) * 100) / 100;
}

function totalGap(emp: Employee): number {
  const jobFamily = getJobFamily(emp.position);
  const targets = ROLE_TARGETS[jobFamily] || ROLE_TARGETS["通用"];
  return DOMAINS.reduce((acc, d) => {
    const gap = targets[d] - parseLevel(emp[d]);
    return acc + Math.max(0, gap);
  }, 0);
}

function estimateTimeToNext(avgGap: number): string {
  if (avgGap <= 0) return "已达标";
  if (avgGap <= 0.5) return "~3个月";
  if (avgGap <= 1.0) return "~6个月";
  if (avgGap <= 1.5) return "~9个月";
  return "~12个月+";
}

// ══════════════════════════════════════════════════════════════
// SVG RADAR CHART COMPONENT
// ══════════════════════════════════════════════════════════════

const RADAR_SIZE = 280;
const MAX_LEVEL = 5;

interface RadarDataSet {
  values: number[];
  color: string;
  fillOpacity?: number;
  dashed?: boolean;
  label?: string;
}

function RadarChart({ datasets, labels, size }: {
  datasets: RadarDataSet[];
  labels: string[];
  size?: number;
}) {
  const s = size || RADAR_SIZE;
  const center = s / 2;
  const radius = (s / 2) - 30;
  const angleStep = 360 / labels.length;

  function toCart(angleDeg: number, r: number): [number, number] {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [center + r * Math.cos(rad), center + r * Math.sin(rad)];
  }

  // Grid rings
  const rings = [1, 2, 3, 4, 5];
  const gridLines = rings.map(level => {
    const r = (level / MAX_LEVEL) * radius;
    const pts = labels.map((_, i) => toCart(i * angleStep, r));
    return pts.map(p => `${p[0]},${p[1]}`).join(" ");
  });

  // Axis lines
  const axes = labels.map((_, i) => {
    const [x, y] = toCart(i * angleStep, radius);
    return { x, y };
  });

  // Label positions
  const labelPositions = labels.map((label, i) => {
    const [x, y] = toCart(i * angleStep, radius + 18);
    return { label, x, y };
  });

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="mx-auto">
      {/* Grid polygons */}
      {gridLines.map((pts, i) => (
        <polygon key={i} points={pts}
          fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
      ))}
      {/* Ring level labels */}
      {rings.map(level => {
        const r = (level / MAX_LEVEL) * radius;
        return (
          <text key={level} x={center + 4} y={center - r + 4}
            fill="rgba(148,163,184,0.5)" fontSize="9" textAnchor="start">
            L{level}
          </text>
        );
      })}
      {/* Axis lines */}
      {axes.map((a, i) => (
        <line key={i} x1={center} y1={center} x2={a.x} y2={a.y}
          stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
      ))}
      {/* Data polygons */}
      {datasets.map((ds, di) => {
        const pts = ds.values.map((v, i) => {
          const r = (Math.min(v, MAX_LEVEL) / MAX_LEVEL) * radius;
          return toCart(i * angleStep, r);
        });
        const polyPoints = pts.map(p => `${p[0]},${p[1]}`).join(" ");
        return (
          <g key={di}>
            <polygon points={polyPoints}
              fill={ds.color} fillOpacity={ds.fillOpacity ?? 0.15}
              stroke={ds.color} strokeWidth={ds.dashed ? 1.5 : 2}
              strokeDasharray={ds.dashed ? "6,3" : undefined} />
            {/* Dots */}
            {!ds.dashed && pts.map((p, pi) => (
              <circle key={pi} cx={p[0]} cy={p[1]} r="3.5"
                fill={ds.color} stroke="#0f172a" strokeWidth="1.5" />
            ))}
          </g>
        );
      })}
      {/* Labels */}
      {labelPositions.map((lp, i) => (
        <text key={i} x={lp.x} y={lp.y}
          fill="#e2e8f0" fontSize="11" fontWeight="600"
          textAnchor="middle" dominantBaseline="middle">
          {lp.label}
        </text>
      ))}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// PRIORITY BADGE
// ══════════════════════════════════════════════════════════════

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/40",
  high:     "bg-amber-500/20 text-amber-400 border-amber-500/40",
  medium:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  low:      "bg-green-500/20 text-green-400 border-green-500/40",
};
const PRIORITY_LABELS: Record<string, string> = {
  critical: "紧急", high: "高", medium: "中", low: "低",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════
// HEATMAP CELL COLOR
// ══════════════════════════════════════════════════════════════

function heatColor(val: number): string {
  if (val >= 3.0) return "bg-emerald-500/30 text-emerald-300";
  if (val >= 2.5) return "bg-blue-500/30 text-blue-300";
  if (val >= 2.0) return "bg-sky-500/20 text-sky-300";
  if (val >= 1.5) return "bg-amber-500/20 text-amber-300";
  return "bg-red-500/20 text-red-300";
}

// ══════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ══════════════════════════════════════════════════════════════

function OverviewTab() {
  const dimensionStats = useMemo(() => {
    return DOMAINS.map(d => {
      const scores = ASSESSMENTS.map(e => parseLevel(e[d]));
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const l3Plus = scores.filter(s => s >= 3).length;
      return { domain: d, name: DOMAIN_NAMES[d], avg: Math.round(avg * 100) / 100, l3Plus, color: DOMAIN_COLORS[d] };
    });
  }, []);

  const departments = useMemo(() => {
    const deptMap = new Map<string, Employee[]>();
    ASSESSMENTS.forEach(e => {
      const arr = deptMap.get(e.department) || [];
      arr.push(e);
      deptMap.set(e.department, arr);
    });
    return Array.from(deptMap.entries()).map(([dept, emps]) => {
      const avgs: Record<string, number> = {};
      for (const d of DOMAINS) {
        const scores = emps.map(e => parseLevel(e[d]));
        avgs[d] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
      }
      return { dept, count: emps.length, avgs };
    }).sort((a, b) => b.count - a.count);
  }, []);

  const levelDist = useMemo(() => {
    const buckets: Record<string, number> = { "L1": 0, "L1.5": 0, "L2": 0, "L2.5": 0, "L3": 0, "L3.5": 0 };
    ASSESSMENTS.forEach(e => {
      for (const d of DOMAINS) {
        const lv = parseLevel(e[d]);
        if (lv <= 1) buckets["L1"]++;
        else if (lv <= 1.5) buckets["L1.5"]++;
        else if (lv <= 2) buckets["L2"]++;
        else if (lv <= 2.5) buckets["L2.5"]++;
        else if (lv <= 3) buckets["L3"]++;
        else buckets["L3.5"]++;
      }
    });
    return Object.entries(buckets);
  }, []);

  const maxBucket = Math.max(...levelDist.map(([, v]) => v));

  return (
    <div className="space-y-6">
      {/* Dimension stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {dimensionStats.map(ds => (
          <div key={ds.domain}
            className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ds.color }} />
              <span className="text-xs text-slate-400 font-medium">{ds.domain}</span>
            </div>
            <div className="text-lg font-bold text-slate-100">{ds.name}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: ds.color }}>
                {ds.avg.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500">全员均值</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              L3+ : <span className="text-slate-200 font-medium">{ds.l3Plus}</span> 人
              ({Math.round(ds.l3Plus / ASSESSMENTS.length * 100)}%)
            </div>
          </div>
        ))}
      </div>

      {/* Department heatmap */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            部门能力热力图
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-2 text-slate-400 font-medium">部门</th>
                <th className="text-center px-3 py-2 text-slate-400 font-medium">人数</th>
                {DOMAINS.map(d => (
                  <th key={d} className="text-center px-3 py-2 font-medium" style={{ color: DOMAIN_COLORS[d] }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.dept} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2 text-slate-200 font-medium whitespace-nowrap">{dept.dept}</td>
                  <td className="text-center px-3 py-2 text-slate-400">{dept.count}</td>
                  {DOMAINS.map(d => (
                    <td key={d} className="text-center px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${heatColor(dept.avgs[d])}`}>
                        {dept.avgs[d].toFixed(2)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Level distribution */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          全员能力等级分布 (所有维度计数)
        </h3>
        <div className="space-y-2">
          {levelDist.map(([label, count]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-10 text-xs text-slate-400 text-right font-mono">{label}</span>
              <div className="flex-1 h-7 bg-slate-800/50 rounded overflow-hidden relative">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${(count / maxBucket) * 100}%`,
                    background: label.includes("3") ? "linear-gradient(90deg, #10b981, #059669)" :
                      label.includes("2") ? "linear-gradient(90deg, #3b82f6, #2563eb)" :
                      "linear-gradient(90deg, #f59e0b, #d97706)",
                  }}
                />
                <span className="absolute inset-y-0 flex items-center px-2 text-xs font-bold text-white">
                  {count}
                </span>
              </div>
              <span className="w-12 text-xs text-slate-500 text-right">
                {Math.round(count / (ASSESSMENTS.length * 6) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2: INDIVIDUAL RADAR
// ══════════════════════════════════════════════════════════════

function IndividualRadarTab() {
  const [selectedId, setSelectedId] = useState(ASSESSMENTS[0].id);

  const emp = ASSESSMENTS.find(e => e.id === selectedId) || ASSESSMENTS[0];
  const jobFamily = getJobFamily(emp.position);
  const targets = ROLE_TARGETS[jobFamily] || ROLE_TARGETS["通用"];

  const currentValues = DOMAINS.map(d => parseLevel(emp[d]));
  const targetValues = DOMAINS.map(d => targets[d]);
  const devPath = generateDevPath(emp);

  const radarLabels = DOMAINS.map(d => `${d} ${DOMAIN_NAMES[d].slice(0, 2)}`);

  return (
    <div className="space-y-6">
      {/* Employee selector */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-300">选择员工:</span>
          </div>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-slate-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {ASSESSMENTS.map(e => (
              <option key={e.id} value={e.id}>
                {e.id} {e.name} — {e.position} ({e.department})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-4 ml-auto text-xs text-slate-400">
            <span>岗位族: <span className="text-blue-400 font-medium">{jobFamily}</span></span>
            <span>均值: <span className="text-emerald-400 font-bold">{avgLevel(emp).toFixed(2)}</span></span>
            <span>总差距: <span className="text-amber-400 font-bold">{totalGap(emp).toFixed(1)}</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar chart */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            {emp.name} — TSDCKL 雷达图
          </h3>
          <RadarChart
            size={300}
            labels={radarLabels}
            datasets={[
              { values: targetValues, color: "#64748b", fillOpacity: 0.05, dashed: true, label: "岗位目标" },
              { values: currentValues, color: "#3b82f6", fillOpacity: 0.2, label: "当前水平" },
            ]}
          />
          <div className="flex items-center gap-6 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-blue-500 inline-block rounded" /> 当前水平
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-slate-500 inline-block rounded border-dashed border-t border-slate-500" style={{ borderStyle: "dashed" }} /> 岗位目标
            </span>
          </div>
        </div>

        {/* Gap analysis table */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              差距分析
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-2 text-slate-400">维度</th>
                <th className="text-center px-3 py-2 text-slate-400">当前</th>
                <th className="text-center px-3 py-2 text-slate-400">目标</th>
                <th className="text-center px-3 py-2 text-slate-400">差距</th>
                <th className="text-center px-3 py-2 text-slate-400">优先级</th>
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map(d => {
                const current = parseLevel(emp[d]);
                const target = targets[d];
                const gap = Math.max(0, target - current);
                const priority = gap >= 2 ? "critical" : gap >= 1.5 ? "high" : gap >= 1 ? "medium" : gap > 0 ? "low" : "";
                return (
                  <tr key={d} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[d] }} />
                        <span className="text-slate-200 font-medium">{DOMAIN_NAMES[d]}</span>
                        <span className="text-slate-500 text-xs">({d})</span>
                      </span>
                    </td>
                    <td className="text-center px-3 py-2 text-slate-300 font-mono">{current.toFixed(1)}</td>
                    <td className="text-center px-3 py-2 text-slate-400 font-mono">{target.toFixed(1)}</td>
                    <td className="text-center px-3 py-2 font-mono font-bold">
                      <span className={gap > 0 ? "text-amber-400" : "text-emerald-400"}>
                        {gap > 0 ? `-${gap.toFixed(1)}` : "OK"}
                      </span>
                    </td>
                    <td className="text-center px-3 py-2">
                      {priority ? <PriorityBadge priority={priority} /> : (
                        <span className="text-xs text-emerald-400">达标</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Development path recommendations */}
      {devPath.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            培养路径建议
            <span className="text-xs text-slate-500 font-normal ml-2">
              预计达标时间: {estimateTimeToNext(devPath[0]?.gap || 0)}
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {devPath.slice(0, 6).map(dp => (
              <div key={dp.domain}
                className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">{dp.domainName}</span>
                  <PriorityBadge priority={dp.priority} />
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  L{dp.currentLevel.toFixed(1)} → L{dp.targetLevel} (差距: {dp.gap.toFixed(1)})
                </div>
                <div className="text-xs text-blue-300/80 mb-2 italic">
                  {dp.nextLevelRubric}
                </div>
                <ul className="space-y-1">
                  {dp.actionItems.map((a, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">*</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 3: TEAM COMPARISON
// ══════════════════════════════════════════════════════════════

const COMPARE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ec4899"];

function TeamComparisonTab() {
  const [selected, setSelected] = useState<string[]>([ASSESSMENTS[1].id, ASSESSMENTS[2].id]);

  function toggleEmployee(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  const selectedEmps = selected.map(id => ASSESSMENTS.find(e => e.id === id)!).filter(Boolean);
  const radarLabels = DOMAINS.map(d => `${d} ${DOMAIN_NAMES[d].slice(0, 2)}`);

  const datasets: RadarDataSet[] = selectedEmps.map((emp, i) => ({
    values: DOMAINS.map(d => parseLevel(emp[d])),
    color: COMPARE_COLORS[i % COMPARE_COLORS.length],
    fillOpacity: 0.1,
    label: emp.name,
  }));

  return (
    <div className="space-y-6">
      {/* Employee multi-selector */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">选择2-4名员工对比 ({selected.length}/4):</span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {ASSESSMENTS.map(e => {
            const isSelected = selected.includes(e.id);
            const idx = selected.indexOf(e.id);
            return (
              <button key={e.id}
                onClick={() => toggleEmployee(e.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${
                  isSelected
                    ? "border-blue-500/60 bg-blue-500/20 text-blue-300"
                    : "border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                {isSelected && (
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: COMPARE_COLORS[idx % COMPARE_COLORS.length] }} />
                )}
                {e.name}
              </button>
            );
          })}
        </div>
      </div>

      {selectedEmps.length >= 2 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overlay radar */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">能力雷达叠加图</h3>
            <RadarChart size={320} labels={radarLabels} datasets={datasets} />
            <div className="flex items-center gap-4 mt-3 flex-wrap justify-center">
              {selectedEmps.map((emp, i) => (
                <span key={emp.id} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-3 h-1 rounded inline-block"
                    style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }} />
                  {emp.name}
                </span>
              ))}
            </div>
          </div>

          {/* Summary stats table */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-200">对比汇总</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-2 text-slate-400">指标</th>
                    {selectedEmps.map((emp, i) => (
                      <th key={emp.id} className="text-center px-3 py-2 font-medium"
                        style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                        {emp.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/50">
                    <td className="px-4 py-2 text-slate-300">岗位</td>
                    {selectedEmps.map(emp => (
                      <td key={emp.id} className="text-center px-3 py-2 text-slate-400 text-xs">{emp.position}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="px-4 py-2 text-slate-300">部门</td>
                    {selectedEmps.map(emp => (
                      <td key={emp.id} className="text-center px-3 py-2 text-slate-400 text-xs">{emp.department}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="px-4 py-2 text-slate-300 font-medium">综合均值</td>
                    {selectedEmps.map(emp => (
                      <td key={emp.id} className="text-center px-3 py-2 text-slate-200 font-bold">{avgLevel(emp).toFixed(2)}</td>
                    ))}
                  </tr>
                  {DOMAINS.map(d => (
                    <tr key={d} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-4 py-2 text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[d] }} />
                          {DOMAIN_NAMES[d]}
                        </span>
                      </td>
                      {selectedEmps.map(emp => {
                        const lv = parseLevel(emp[d]);
                        const maxInGroup = Math.max(...selectedEmps.map(e => parseLevel(e[d])));
                        return (
                          <td key={emp.id} className={`text-center px-3 py-2 font-mono text-sm ${lv === maxInGroup && selectedEmps.length > 1 ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                            {lv.toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-b border-slate-800/50">
                    <td className="px-4 py-2 text-slate-300 font-medium">总差距</td>
                    {selectedEmps.map(emp => {
                      const gap = totalGap(emp);
                      return (
                        <td key={emp.id} className={`text-center px-3 py-2 font-mono font-bold ${gap <= 2 ? "text-emerald-400" : gap <= 5 ? "text-amber-400" : "text-red-400"}`}>
                          {gap.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-300">岗位族</td>
                    {selectedEmps.map(emp => (
                      <td key={emp.id} className="text-center px-3 py-2 text-blue-400 text-xs">{getJobFamily(emp.position)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-12 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">请至少选择2名员工进行对比</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 4: GAP ANALYSIS
// ══════════════════════════════════════════════════════════════

function GapAnalysisTab() {
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => {
    return ASSESSMENTS.map(emp => {
      const jobFamily = getJobFamily(emp.position);
      const targets = ROLE_TARGETS[jobFamily] || ROLE_TARGETS["通用"];
      const gaps = DOMAINS.map(d => ({
        domain: d,
        gap: Math.max(0, targets[d] - parseLevel(emp[d])),
      }));
      const tGap = gaps.reduce((a, g) => a + g.gap, 0);
      const critical = gaps.filter(g => g.gap >= 2).length;
      const high = gaps.filter(g => g.gap >= 1.5 && g.gap < 2).length;
      const weakest = gaps.sort((a, b) => b.gap - a.gap).slice(0, 3).filter(g => g.gap > 0);
      return {
        emp,
        avgLvl: avgLevel(emp),
        totalGap: Math.round(tGap * 10) / 10,
        critical,
        high,
        weakest,
        jobFamily,
      };
    }).sort((a, b) => sortAsc ? a.totalGap - b.totalGap : b.totalGap - a.totalGap);
  }, [sortAsc]);

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          全员差距分析 ({ASSESSMENTS.length}人)
        </h3>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded bg-slate-800/50"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${sortAsc ? "rotate-180" : ""}`} />
          {sortAsc ? "差距升序" : "差距降序"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/30">
              <th className="text-left px-4 py-2 text-slate-400 font-medium">#</th>
              <th className="text-left px-3 py-2 text-slate-400 font-medium">工号</th>
              <th className="text-left px-3 py-2 text-slate-400 font-medium">姓名</th>
              <th className="text-left px-3 py-2 text-slate-400 font-medium">岗位</th>
              <th className="text-center px-3 py-2 text-slate-400 font-medium">均值</th>
              <th className="text-center px-3 py-2 text-slate-400 font-medium">总差距</th>
              <th className="text-center px-3 py-2 text-slate-400 font-medium">#紧急</th>
              <th className="text-center px-3 py-2 text-slate-400 font-medium">#高</th>
              <th className="text-left px-3 py-2 text-slate-400 font-medium">Top 3 弱项</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.emp.id}
                className={`border-b border-slate-800/40 hover:bg-slate-800/30 ${
                  r.totalGap >= 8 ? "bg-red-950/10" : r.totalGap >= 5 ? "bg-amber-950/10" : ""
                }`}>
                <td className="px-4 py-2 text-slate-500 text-xs">{idx + 1}</td>
                <td className="px-3 py-2 text-slate-400 text-xs font-mono">{r.emp.id}</td>
                <td className="px-3 py-2 text-slate-200 font-medium whitespace-nowrap">{r.emp.name}</td>
                <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">{r.emp.position}</td>
                <td className="text-center px-3 py-2 font-mono text-slate-300">{r.avgLvl.toFixed(2)}</td>
                <td className="text-center px-3 py-2">
                  <span className={`font-mono font-bold ${
                    r.totalGap >= 8 ? "text-red-400" : r.totalGap >= 5 ? "text-amber-400" : r.totalGap >= 2 ? "text-yellow-400" : "text-emerald-400"
                  }`}>
                    {r.totalGap.toFixed(1)}
                  </span>
                </td>
                <td className="text-center px-3 py-2">
                  {r.critical > 0 ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">{r.critical}</span>
                  ) : <span className="text-slate-600">-</span>}
                </td>
                <td className="text-center px-3 py-2">
                  {r.high > 0 ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">{r.high}</span>
                  ) : <span className="text-slate-600">-</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {r.weakest.length > 0 ? r.weakest.map(w => (
                      <span key={w.domain}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-slate-800/80 border border-slate-700/40">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[w.domain] }} />
                        <span className="text-slate-300">{DOMAIN_NAMES[w.domain]}</span>
                        <span className="text-red-400 font-mono font-bold">-{w.gap.toFixed(1)}</span>
                      </span>
                    )) : (
                      <span className="text-xs text-emerald-400">全部达标</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 5: DEVELOPMENT PATHS
// ══════════════════════════════════════════════════════════════

function DevelopmentPathsTab() {
  const departments = useMemo(() => {
    const set = new Set<string>();
    ASSESSMENTS.forEach(e => set.add(e.department));
    return ["全部", ...Array.from(set).sort()];
  }, []);

  const [deptFilter, setDeptFilter] = useState("全部");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    return ASSESSMENTS.filter(e => {
      if (deptFilter !== "全部" && e.department !== deptFilter) return false;
      if (searchTerm && !e.name.includes(searchTerm) && !e.id.includes(searchTerm.toUpperCase())) return false;
      return true;
    }).map(emp => ({
      emp,
      devPath: generateDevPath(emp),
      avg: avgLevel(emp),
    })).sort((a, b) => {
      const aMaxGap = a.devPath.length > 0 ? a.devPath[0].gap : 0;
      const bMaxGap = b.devPath.length > 0 ? b.devPath[0].gap : 0;
      return bMaxGap - aMaxGap;
    });
  }, [deptFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-400" />
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-slate-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索姓名/工号..."
            className="bg-slate-800 border border-slate-600 text-slate-200 rounded px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500"
          />
        </div>
        <span className="text-xs text-slate-400">
          显示 {filtered.length} / {ASSESSMENTS.length} 人
        </span>
      </div>

      {/* Employee development cards */}
      <div className="space-y-4">
        {filtered.map(({ emp, devPath, avg }) => (
          <div key={emp.id}
            className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    {emp.name}
                    <span className="text-slate-500 font-normal ml-2 text-xs">{emp.id}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {emp.position} · {emp.department} · 岗位族: {getJobFamily(emp.position)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">
                  均值: <span className={`font-bold font-mono ${avg >= 2.5 ? "text-emerald-400" : avg >= 1.5 ? "text-blue-400" : "text-amber-400"}`}>
                    {avg.toFixed(2)}
                  </span>
                </span>
                <span className="text-slate-400">
                  预计达标: <span className="text-blue-300 font-medium">
                    {estimateTimeToNext(devPath.length > 0 ? devPath[0].gap : 0)}
                  </span>
                </span>
              </div>
            </div>

            {devPath.length > 0 ? (
              <div className="px-4 py-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {devPath.slice(0, 3).map((dp, idx) => (
                    <div key={dp.domain}
                      className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200 bg-slate-700/60 w-5 h-5 rounded-full flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-semibold" style={{ color: DOMAIN_COLORS[dp.domain] }}>
                            {dp.domainName}
                          </span>
                        </div>
                        <PriorityBadge priority={dp.priority} />
                      </div>
                      <div className="flex items-center gap-2 mb-2 text-xs">
                        <span className="text-slate-400">
                          L{dp.currentLevel.toFixed(1)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-emerald-400 font-medium">
                          L{dp.targetLevel}
                        </span>
                        <span className="text-red-400 font-mono ml-auto">
                          gap: {dp.gap.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-xs text-blue-300/70 italic mb-2 border-l-2 border-blue-500/30 pl-2">
                        {dp.nextLevelRubric}
                      </div>
                      <ul className="space-y-1">
                        {dp.actionItems.map((a, i) => (
                          <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                            <Award className="w-3 h-3 text-amber-500/60 mt-0.5 shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                  <Award className="w-3.5 h-3.5" />
                  所有维度均已达标 — 可考虑挑战下一职级目标
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════

const TABS = [
  { key: "overview",    label: "全员总览",    icon: BarChart3 },
  { key: "radar",       label: "个人雷达",    icon: Radar },
  { key: "comparison",  label: "团队对比",    icon: Users },
  { key: "gap",         label: "差距分析",    icon: Target },
  { key: "devpath",     label: "培养路径",    icon: TrendingUp },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function CapabilityRadarCockpit() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Summary stats for header
  const overall = useMemo(() => {
    const allLevels = ASSESSMENTS.flatMap(e => DOMAINS.map(d => parseLevel(e[d])));
    const avg = allLevels.reduce((a, b) => a + b, 0) / allLevels.length;
    const l3Count = allLevels.filter(v => v >= 3).length;
    const gapCount = ASSESSMENTS.filter(e => totalGap(e) > 0).length;
    return {
      avg: Math.round(avg * 100) / 100,
      l3Percent: Math.round(l3Count / allLevels.length * 100),
      gapCount,
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-[1440px] mx-auto px-4 py-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Radar className="w-6 h-6 text-blue-400" />
                GRT 能力雷达驾驶舱
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                TSDCKL六维能力模型 · 2026年2月测评
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">{ASSESSMENTS.length}</div>
                <div className="text-slate-500">测评人数</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-400">{overall.avg.toFixed(2)}</div>
                <div className="text-slate-500">全员均值</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{overall.l3Percent}%</div>
                <div className="text-slate-500">L3+占比</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-400">{overall.gapCount}</div>
                <div className="text-slate-500">有差距人数</div>
              </div>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-slate-900/80 text-blue-400 border border-slate-700/50 border-b-slate-900"
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[1440px] mx-auto px-4 py-6">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "radar" && <IndividualRadarTab />}
        {activeTab === "comparison" && <TeamComparisonTab />}
        {activeTab === "gap" && <GapAnalysisTab />}
        {activeTab === "devpath" && <DevelopmentPathsTab />}
      </div>
    </div>
  );
}
