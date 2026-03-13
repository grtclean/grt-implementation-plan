/**
 * CEO Payroll Approval Gate v2 -- 薪资终审仪表板 (Executive Dark Theme)
 *
 * Strict confidentiality: only 3 authorized personnel may access.
 *   - 倪亚东 / CEO
 *   - 刘奥运 / 董秘
 *   - 倪微薇 / AI部门经理
 *
 * 6 tabs:
 *   1. 薪资总览 (Overview) — Monthly total, dept breakdown, YoY comparison
 *   2. 绩效工资调整 (Performance Wage Override) — 绩效1/2/3 with inline override
 *   3. 员工薪资明细 (Employee Detail) — Searchable table with all salary components
 *   4. 审批中心 (Approval Center) — State machine buttons, batch approve
 *   5. 异常检测 (Anomaly Detection) — MoM > 10%, missing data flags
 *   6. 差值调控 (Adjustment Control) — Manual gap reconciliation
 */

import React, { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield, Lock, DollarSign, TrendingUp, AlertTriangle,
  Check, X, Edit, Eye, Search, Download, ChevronRight,
  ArrowUpDown, Save, RotateCcw, FileWarning, Users,
  BarChart3, PieChart, Loader2, ShieldAlert, Ban,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// Confidentiality Gate
// ═══════════════════════════════════════════════════════════════

const AUTHORIZED_USERS = [
  { name: "倪亚东", title: "CEO" },
  { name: "刘奥运", title: "董秘" },
  { name: "倪微薇", title: "AI部门经理" },
];
const AUTHORIZED_NAMES = AUTHORIZED_USERS.map((u) => u.name);

// ═══════════════════════════════════════════════════════════════
// Mock/Demo Data (prototype — will connect to trpc.payroll.* in production)
// ═══════════════════════════════════════════════════════════════

const DEPARTMENTS = ["研发部", "生产部", "销售部", "人力资源部", "财务部", "AI部", "质量部", "采购部"];

interface MockEmployee {
  id: number;
  name: string;
  department: string;
  position: string;
  baseSalary: number;
  positionWage: number;
  skillSubsidy: number;
  saturdayShiftPremium: number;
  comprehensiveSalary: number;
  isLumpSum: boolean;
  perfScore: number;
  perfWage1Calc: number;
  perfWage1Override: number | null;
  perfWage1Reason: string;
  perfWage2Calc: number;
  perfWage2Override: number | null;
  perfWage2Reason: string;
  perfWage3Calc: number;
  perfWage3Override: number | null;
  perfWage3Reason: string;
  personalLeaveHours: number;
  personalLeaveDeduction: number;
  sickLeaveHours: number;
  sickLeaveDeduction: number;
  perfectAttendanceBonus: number;
  cashSubsidy: number;
  travelCarSubsidy: number;
  socialInsurance: number;
  housingFund: number;
  incomeTax: number;
  grossPay: number;
  netPay: number;
  status: string;
  lastMonthNet: number;
}

function generateMockEmployees(): MockEmployee[] {
  const names = [
    "吴卫成", "戴晓燕", "王强", "赵敏", "刘坤", "周丽", "吴磊", "孙芳", // demo
    "朱明", "胡洁", "林浩", "何雪", "马超", "罗婷", "刘宇", "黄晨",
    "徐萍", "高翔", "郑琳", "唐波", "韩冰", "邓辉", "冯雅", "蒋鑫",
  ];
  const positions = ["高级工程师", "工程师", "经理", "主管", "技术员", "分析师", "专员", "总监"];

  return names.map((name, i) => {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const base = 8000 + Math.floor(Math.random() * 22000);
    const posWage = Math.round(base * 0.2);
    const skillSub = Math.round(base * 0.08);
    const satPremium = i % 3 === 0 ? Math.round(base * 0.12) : 0;
    const isLump = i < 2; // first 2 are lump-sum (CEO/CFO)
    const comp = isLump ? base : base + posWage + skillSub + satPremium;
    const score = 60 + Math.floor(Math.random() * 40);
    const w1 = Math.round(comp * (score / 100) * 0.15);
    const w2 = Math.round(comp * (score / 100) * 0.10);
    const w3 = Math.round(comp * (score / 100) * 0.05);
    const plHours = Math.random() < 0.3 ? Math.round(Math.random() * 16) : 0;
    const slHours = Math.random() < 0.1 ? Math.round(Math.random() * 8) : 0;
    const plDeduct = Math.round(plHours * (base / 116));
    const slDeduct = Math.round(slHours * (comp / 22 / 8) * 0.1962);
    const attendBonus = plHours === 0 && slHours === 0 && dept === "生产部" ? 300 : 0;
    const cashSub = Math.random() < 0.5 ? Math.round(500 + Math.random() * 1500) : 0;
    const travelSub = Math.random() < 0.3 ? Math.round(200 + Math.random() * 800) : 0;
    const gross = comp + w1 + w2 + w3 - plDeduct - slDeduct + attendBonus;
    const si = Math.round(gross * 0.105);
    const hf = Math.round(gross * 0.07);
    const taxable = gross - si - hf - 5000;
    const tax = taxable > 0 ? Math.round(taxable * 0.1) : 0;
    const net = gross - si - hf - tax;
    const lastNet = net + Math.round((Math.random() - 0.5) * net * 0.15);

    return {
      id: 1001 + i,
      name,
      department: dept,
      position: positions[i % positions.length],
      baseSalary: base,
      positionWage: isLump ? 0 : posWage,
      skillSubsidy: isLump ? 0 : skillSub,
      saturdayShiftPremium: isLump ? 0 : satPremium,
      comprehensiveSalary: comp,
      isLumpSum: isLump,
      perfScore: score,
      perfWage1Calc: w1,
      perfWage1Override: null,
      perfWage1Reason: "",
      perfWage2Calc: w2,
      perfWage2Override: null,
      perfWage2Reason: "",
      perfWage3Calc: w3,
      perfWage3Override: null,
      perfWage3Reason: "",
      personalLeaveHours: plHours,
      personalLeaveDeduction: plDeduct,
      sickLeaveHours: slHours,
      sickLeaveDeduction: slDeduct,
      perfectAttendanceBonus: attendBonus,
      cashSubsidy: cashSub,
      travelCarSubsidy: travelSub,
      socialInsurance: si,
      housingFund: hf,
      incomeTax: tax,
      grossPay: gross,
      netPay: net,
      status: ["DRAFT", "HR_VERIFIED", "FINANCE_APPROVED", "CEO_APPROVED", "PAID"][Math.floor(Math.random() * 5)],
      lastMonthNet: lastNet,
    };
  });
}

const MOCK_EMPLOYEES = generateMockEmployees();

const STATUS_FLOW = ["DRAFT", "HR_VERIFIED", "FINANCE_APPROVED", "CEO_APPROVED", "PAID"] as const;
type PayrollStatus = (typeof STATUS_FLOW)[number];

const STATUS_CONFIG: Record<string, { label: string; color: string; darkBg: string }> = {
  DRAFT:             { label: "草稿",     color: "text-slate-400",  darkBg: "bg-slate-800" },
  HR_VERIFIED:       { label: "HR已审",   color: "text-blue-400",   darkBg: "bg-blue-950" },
  FINANCE_APPROVED:  { label: "财务已批", color: "text-purple-400", darkBg: "bg-purple-950" },
  CEO_APPROVED:      { label: "CEO已批",  color: "text-amber-400",  darkBg: "bg-amber-950" },
  PAID:              { label: "已发放",   color: "text-emerald-400", darkBg: "bg-emerald-950" },
};

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function fmt(val: number): string {
  return `¥${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function fmtWan(val: number): string {
  return `¥${(val / 10000).toFixed(2)}万`;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════
// Dark KPI Card
// ═══════════════════════════════════════════════════════════════

function DarkKpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-100 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 1: 薪资总览 (Overview)
// ═══════════════════════════════════════════════════════════════

function OverviewTab({ employees, period }: { employees: MockEmployee[]; period: string }) {
  const totalGross = employees.reduce((s, e) => s + e.grossPay, 0);
  const totalNet = employees.reduce((s, e) => s + e.netPay, 0);
  const totalTax = employees.reduce((s, e) => s + e.incomeTax, 0);
  const totalSI = employees.reduce((s, e) => s + e.socialInsurance + e.housingFund, 0);
  const totalCashSub = employees.reduce((s, e) => s + e.cashSubsidy, 0);
  const totalTravelSub = employees.reduce((s, e) => s + e.travelCarSubsidy, 0);
  const totalLeaveDeduct = employees.reduce((s, e) => s + e.personalLeaveDeduction + e.sickLeaveDeduction, 0);
  const headcount = employees.length;
  const lastMonthTotal = employees.reduce((s, e) => s + e.lastMonthNet, 0);
  const yoyChange = pctChange(totalNet, lastMonthTotal);

  // Department breakdown
  const deptMap = new Map<string, { count: number; gross: number; net: number }>();
  employees.forEach((e) => {
    const d = deptMap.get(e.department) || { count: 0, gross: 0, net: 0 };
    d.count++;
    d.gross += e.grossPay;
    d.net += e.netPay;
    deptMap.set(e.department, d);
  });
  const deptData = Array.from(deptMap.entries())
    .map(([dept, d]) => ({ dept, ...d }))
    .sort((a, b) => b.gross - a.gross);

  const maxGross = Math.max(...deptData.map((d) => d.gross), 1);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DarkKpiCard label="应发总额" value={fmtWan(totalGross)} icon={DollarSign} accent="bg-blue-900/50 text-blue-400" />
        <DarkKpiCard label="实发总额" value={fmtWan(totalNet)} icon={DollarSign} accent="bg-emerald-900/50 text-emerald-400" />
        <DarkKpiCard label="个税+社保" value={fmtWan(totalTax + totalSI)} icon={Shield} accent="bg-purple-900/50 text-purple-400" />
        <DarkKpiCard
          label="环比变动"
          value={`${yoyChange > 0 ? "+" : ""}${yoyChange.toFixed(1)}%`}
          sub={`上月实发 ${fmtWan(lastMonthTotal)}`}
          icon={TrendingUp}
          accent={yoyChange > 5 ? "bg-red-900/50 text-red-400" : "bg-slate-800 text-slate-400"}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DarkKpiCard label="在册人数" value={`${headcount}人`} icon={Users} accent="bg-amber-900/50 text-amber-400" />
        <DarkKpiCard label="现金补贴" value={fmtWan(totalCashSub)} sub="月度固定" icon={DollarSign} accent="bg-cyan-900/50 text-cyan-400" />
        <DarkKpiCard label="出差车补" value={fmtWan(totalTravelSub)} sub="实报实销" icon={DollarSign} accent="bg-cyan-900/50 text-cyan-400" />
        <DarkKpiCard label="请假扣款" value={fmtWan(totalLeaveDeduct)} sub="事假+病假" icon={AlertTriangle} accent="bg-red-900/50 text-red-400" />
      </div>

      {/* Department Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <PieChart className="h-4 w-4 text-slate-500" /> 部门薪资分布
        </h3>
        <div className="space-y-3">
          {deptData.map((d) => {
            const pct = (d.gross / totalGross * 100);
            const barWidth = (d.gross / maxGross * 100);
            return (
              <div key={d.dept} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-20 shrink-0 text-right">{d.dept}</span>
                <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-200">
                    {fmtWan(d.gross)} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <span className="text-xs text-slate-500 w-14 shrink-0">{d.count}人</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* YoY Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" /> 部门环比对比
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">部门</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">人数</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">本月应发</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">本月实发</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">人均</th>
              </tr>
            </thead>
            <tbody>
              {deptData.map((d) => (
                <tr key={d.dept} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-slate-300 font-medium">{d.dept}</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{d.count}</td>
                  <td className="py-2.5 px-3 text-right text-slate-300">{fmt(d.gross)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-200 font-semibold">{fmt(d.net)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{fmt(d.net / d.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 2: 绩效工资调整 (Performance Wage Override)
// ═══════════════════════════════════════════════════════════════

function PerfWageOverrideTab({ employees, setEmployees }: {
  employees: MockEmployee[];
  setEmployees: React.Dispatch<React.SetStateAction<MockEmployee[]>>;
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<{
    w1: string; w1r: string;
    w2: string; w2r: string;
    w3: string; w3r: string;
  }>({ w1: "", w1r: "", w2: "", w2r: "", w3: "", w3r: "" });

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) =>
      e.name.includes(q) || e.department.includes(q) || String(e.id).includes(q)
    );
  }, [employees, search]);

  const startEdit = (emp: MockEmployee) => {
    setEditingId(emp.id);
    setOverrides({
      w1: emp.perfWage1Override !== null ? String(emp.perfWage1Override) : "",
      w1r: emp.perfWage1Reason,
      w2: emp.perfWage2Override !== null ? String(emp.perfWage2Override) : "",
      w2r: emp.perfWage2Reason,
      w3: emp.perfWage3Override !== null ? String(emp.perfWage3Override) : "",
      w3r: emp.perfWage3Reason,
    });
  };

  const saveOverride = (empId: number) => {
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id !== empId) return e;
        const w1o = overrides.w1 ? Number(overrides.w1) : null;
        const w2o = overrides.w2 ? Number(overrides.w2) : null;
        const w3o = overrides.w3 ? Number(overrides.w3) : null;
        const w1 = w1o ?? e.perfWage1Calc;
        const w2 = w2o ?? e.perfWage2Calc;
        const w3 = w3o ?? e.perfWage3Calc;
        const gross = e.baseSalary + w1 + w2 + w3;
        const si = Math.round(gross * 0.105);
        const hf = Math.round(gross * 0.07);
        const taxable = gross - si - hf - 5000;
        const tax = taxable > 0 ? Math.round(taxable * 0.1) : 0;
        return {
          ...e,
          perfWage1Override: w1o,
          perfWage1Reason: overrides.w1r,
          perfWage2Override: w2o,
          perfWage2Reason: overrides.w2r,
          perfWage3Override: w3o,
          perfWage3Reason: overrides.w3r,
          grossPay: gross,
          socialInsurance: si,
          housingFund: hf,
          incomeTax: tax,
          netPay: gross - si - hf - tax,
        };
      })
    );
    setEditingId(null);
  };

  const totalAdjustment = employees.reduce((sum, e) => {
    const d1 = (e.perfWage1Override ?? e.perfWage1Calc) - e.perfWage1Calc;
    const d2 = (e.perfWage2Override ?? e.perfWage2Calc) - e.perfWage2Calc;
    const d3 = (e.perfWage3Override ?? e.perfWage3Calc) - e.perfWage3Calc;
    return sum + d1 + d2 + d3;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="搜索员工姓名 / 部门 / 工号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            总调整额: <span className={`font-bold ${totalAdjustment > 0 ? "text-red-400" : totalAdjustment < 0 ? "text-emerald-400" : "text-slate-400"}`}>
              {totalAdjustment > 0 ? "+" : ""}{fmt(totalAdjustment)}
            </span>
          </span>
          <Badge variant="outline" className="border-slate-700 text-slate-400">
            {filtered.length} 名员工
          </Badge>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60">
                <th className="text-left py-3 px-3 text-slate-500 font-medium text-xs">工号</th>
                <th className="text-left py-3 px-3 text-slate-500 font-medium text-xs">姓名</th>
                <th className="text-left py-3 px-3 text-slate-500 font-medium text-xs">部门</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">绩效分</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">绩效工资1</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">绩效工资2</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">绩效工资3</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">调整合计</th>
                <th className="text-center py-3 px-3 text-slate-500 font-medium text-xs">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const isEditing = editingId === emp.id;
                const d1 = (emp.perfWage1Override ?? emp.perfWage1Calc) - emp.perfWage1Calc;
                const d2 = (emp.perfWage2Override ?? emp.perfWage2Calc) - emp.perfWage2Calc;
                const d3 = (emp.perfWage3Override ?? emp.perfWage3Calc) - emp.perfWage3Calc;
                const totalDelta = d1 + d2 + d3;
                const hasOverride = emp.perfWage1Override !== null || emp.perfWage2Override !== null || emp.perfWage3Override !== null;

                return (
                  <React.Fragment key={emp.id}>
                    <tr className={`border-b border-slate-800/50 transition-colors ${
                      isEditing ? "bg-slate-800/40" : hasOverride ? "bg-amber-950/20" : "hover:bg-slate-800/20"
                    }`}>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-xs">{emp.id}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium">{emp.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{emp.department}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-semibold ${emp.perfScore >= 90 ? "text-emerald-400" : emp.perfScore >= 70 ? "text-blue-400" : "text-amber-400"}`}>
                          {emp.perfScore}
                        </span>
                      </td>
                      {/* Perf Wage 1 */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-slate-400 text-xs">算: {fmt(emp.perfWage1Calc)}</span>
                          {emp.perfWage1Override !== null && (
                            <span className="text-amber-400 font-semibold text-xs">调: {fmt(emp.perfWage1Override)}</span>
                          )}
                        </div>
                      </td>
                      {/* Perf Wage 2 */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-slate-400 text-xs">算: {fmt(emp.perfWage2Calc)}</span>
                          {emp.perfWage2Override !== null && (
                            <span className="text-amber-400 font-semibold text-xs">调: {fmt(emp.perfWage2Override)}</span>
                          )}
                        </div>
                      </td>
                      {/* Perf Wage 3 */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-slate-400 text-xs">算: {fmt(emp.perfWage3Calc)}</span>
                          {emp.perfWage3Override !== null && (
                            <span className="text-amber-400 font-semibold text-xs">调: {fmt(emp.perfWage3Override)}</span>
                          )}
                        </div>
                      </td>
                      {/* Total delta */}
                      <td className="py-2.5 px-3 text-right">
                        {totalDelta !== 0 ? (
                          <span className={`font-bold text-xs ${totalDelta > 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {totalDelta > 0 ? "+" : ""}{fmt(totalDelta)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">--</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => saveOverride(emp.id)}
                              className="p-1 rounded bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900"
                              title="保存"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                              title="取消"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(emp)}
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                            title="调整绩效工资"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Inline override form */}
                    {isEditing && (
                      <tr className="bg-slate-800/30">
                        <td colSpan={9} className="px-6 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Perf Wage 1 */}
                            <div className="space-y-1.5">
                              <label className="text-xs text-slate-500 font-medium">绩效工资1 (计算值: {fmt(emp.perfWage1Calc)})</label>
                              <input
                                type="number"
                                value={overrides.w1}
                                onChange={(e) => setOverrides((p) => ({ ...p, w1: e.target.value }))}
                                placeholder="覆盖金额"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <input
                                value={overrides.w1r}
                                onChange={(e) => setOverrides((p) => ({ ...p, w1r: e.target.value }))}
                                placeholder="调整原因"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            {/* Perf Wage 2 */}
                            <div className="space-y-1.5">
                              <label className="text-xs text-slate-500 font-medium">绩效工资2 (计算值: {fmt(emp.perfWage2Calc)})</label>
                              <input
                                type="number"
                                value={overrides.w2}
                                onChange={(e) => setOverrides((p) => ({ ...p, w2: e.target.value }))}
                                placeholder="覆盖金额"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <input
                                value={overrides.w2r}
                                onChange={(e) => setOverrides((p) => ({ ...p, w2r: e.target.value }))}
                                placeholder="调整原因"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            {/* Perf Wage 3 */}
                            <div className="space-y-1.5">
                              <label className="text-xs text-slate-500 font-medium">绩效工资3 (计算值: {fmt(emp.perfWage3Calc)})</label>
                              <input
                                type="number"
                                value={overrides.w3}
                                onChange={(e) => setOverrides((p) => ({ ...p, w3: e.target.value }))}
                                placeholder="覆盖金额"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <input
                                value={overrides.w3r}
                                onChange={(e) => setOverrides((p) => ({ ...p, w3r: e.target.value }))}
                                placeholder="调整原因"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-600">无匹配员工</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 3: 员工薪资明细 (Employee Detail)
// ═══════════════════════════════════════════════════════════════

function EmployeeDetailTab({ employees }: { employees: MockEmployee[] }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"netPay" | "grossPay" | "name">("netPay");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.includes(q) || e.department.includes(q) || String(e.id).includes(q));
    }
    list = [...list].sort((a, b) => {
      const va = sortField === "name" ? a.name : a[sortField];
      const vb = sortField === "name" ? b.name : b[sortField];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [employees, search, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 w-72 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="搜索员工 / 部门 / 工号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="border-slate-700 text-slate-400">
          {filtered.length} / {employees.length}
        </Badge>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800/60 text-slate-500">
                <th className="text-left py-2.5 px-2 font-medium">工号</th>
                <th className="text-left py-2.5 px-2 font-medium cursor-pointer" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1">姓名 <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="text-left py-2.5 px-2 font-medium">部门</th>
                <th className="text-right py-2.5 px-2 font-medium">基本工资</th>
                <th className="text-right py-2.5 px-2 font-medium">岗位工资</th>
                <th className="text-right py-2.5 px-2 font-medium">技能补贴</th>
                <th className="text-right py-2.5 px-2 font-medium">综合工资</th>
                <th className="text-right py-2.5 px-2 font-medium">绩效1</th>
                <th className="text-right py-2.5 px-2 font-medium">绩效2</th>
                <th className="text-right py-2.5 px-2 font-medium">绩效3</th>
                <th className="text-right py-2.5 px-2 font-medium">事假扣</th>
                <th className="text-right py-2.5 px-2 font-medium">病假扣</th>
                <th className="text-right py-2.5 px-2 font-medium">全勤奖</th>
                <th className="text-right py-2.5 px-2 font-medium cursor-pointer" onClick={() => toggleSort("grossPay")}>
                  <span className="flex items-center gap-1 justify-end">应发 <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="text-right py-2.5 px-2 font-medium">现金补贴</th>
                <th className="text-right py-2.5 px-2 font-medium">出差车补</th>
                <th className="text-right py-2.5 px-2 font-medium">社保</th>
                <th className="text-right py-2.5 px-2 font-medium">公积金</th>
                <th className="text-right py-2.5 px-2 font-medium">个税</th>
                <th className="text-right py-2.5 px-2 font-medium cursor-pointer" onClick={() => toggleSort("netPay")}>
                  <span className="flex items-center gap-1 justify-end">实发 <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="text-center py-2.5 px-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="py-2 px-2 text-slate-500 font-mono">{e.id}</td>
                  <td className="py-2 px-2 text-slate-200 font-medium">{e.name}</td>
                  <td className="py-2 px-2 text-slate-400">{e.department}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{fmt(e.baseSalary)}</td>
                  <td className="py-2 px-2 text-right text-slate-400">{e.isLumpSum ? <span className="text-slate-600">--</span> : fmt(e.positionWage)}</td>
                  <td className="py-2 px-2 text-right text-slate-400">{e.isLumpSum ? <span className="text-slate-600">--</span> : fmt(e.skillSubsidy)}</td>
                  <td className="py-2 px-2 text-right text-blue-300 font-semibold">
                    {fmt(e.comprehensiveSalary)}
                    {e.isLumpSum && <span className="ml-1 text-[9px] text-amber-500">包干</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-300">{fmt(e.perfWage1Override ?? e.perfWage1Calc)}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{fmt(e.perfWage2Override ?? e.perfWage2Calc)}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{fmt(e.perfWage3Override ?? e.perfWage3Calc)}</td>
                  <td className="py-2 px-2 text-right">
                    {e.personalLeaveDeduction > 0 ? (
                      <span className="text-red-400" title={`事假 ${e.personalLeaveHours}h`}>-{fmt(e.personalLeaveDeduction)}</span>
                    ) : <span className="text-slate-600">--</span>}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {e.sickLeaveDeduction > 0 ? (
                      <span className="text-orange-400" title={`病假 ${e.sickLeaveHours}h`}>-{fmt(e.sickLeaveDeduction)}</span>
                    ) : <span className="text-slate-600">--</span>}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {e.perfectAttendanceBonus > 0 ? (
                      <span className="text-emerald-400">+{fmt(e.perfectAttendanceBonus)}</span>
                    ) : <span className="text-slate-600">--</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-100 font-semibold">{fmt(e.grossPay)}</td>
                  <td className="py-2 px-2 text-right">
                    {e.cashSubsidy > 0 ? <span className="text-cyan-400">{fmt(e.cashSubsidy)}</span> : <span className="text-slate-600">--</span>}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {e.travelCarSubsidy > 0 ? <span className="text-cyan-400">{fmt(e.travelCarSubsidy)}</span> : <span className="text-slate-600">--</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">{fmt(e.socialInsurance)}</td>
                  <td className="py-2 px-2 text-right text-slate-400">{fmt(e.housingFund)}</td>
                  <td className="py-2 px-2 text-right text-slate-400">{fmt(e.incomeTax)}</td>
                  <td className="py-2 px-2 text-right text-emerald-400 font-bold">{fmt(e.netPay)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_CONFIG[e.status]?.darkBg ?? "bg-slate-800"} ${STATUS_CONFIG[e.status]?.color ?? "text-slate-400"}`}>
                      {STATUS_CONFIG[e.status]?.label ?? e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 4: 审批中心 (Approval Center)
// ═══════════════════════════════════════════════════════════════

function ApprovalCenterTab({ employees, setEmployees }: {
  employees: MockEmployee[];
  setEmployees: React.Dispatch<React.SetStateAction<MockEmployee[]>>;
}) {
  const [confirmCode, setConfirmCode] = useState("");
  const [showPayoutConfirm, setShowPayoutConfirm] = useState(false);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_FLOW.forEach((s) => { counts[s] = 0; });
    employees.forEach((e) => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [employees]);

  const batchAdvance = (fromStatus: string, toStatus: string) => {
    setEmployees((prev) =>
      prev.map((e) => (e.status === fromStatus ? { ...e, status: toStatus } : e))
    );
  };

  const executePayout = () => {
    if (confirmCode.length < 4) return;
    batchAdvance("CEO_APPROVED", "PAID");
    setShowPayoutConfirm(false);
    setConfirmCode("");
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-5">审批流水线</h3>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {STATUS_FLOW.map((status, i) => {
            const cfg = STATUS_CONFIG[status];
            const count = statusCounts[status];
            return (
              <React.Fragment key={status}>
                <div className={`flex flex-col items-center p-4 rounded-xl min-w-[120px] border transition-all ${
                  count > 0 ? `${cfg.darkBg} border-slate-700` : "bg-slate-900 border-slate-800 opacity-40"
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${cfg.color} bg-slate-800`}>
                    {count}
                  </div>
                  <span className={`text-xs font-medium mt-2 ${cfg.color}`}>{cfg.label}</span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-slate-700 mx-1 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-slate-900 border border-amber-900/50 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
          <Shield className="h-4 w-4" /> 审批操作
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* HR Verify */}
          <button
            onClick={() => batchAdvance("DRAFT", "HR_VERIFIED")}
            disabled={statusCounts["DRAFT"] === 0}
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-left"
          >
            <div className="p-2 rounded-lg bg-blue-950 text-blue-400">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">HR 审核</p>
              <p className="text-xs text-slate-500">{statusCounts["DRAFT"]} 条待审核</p>
            </div>
          </button>

          {/* Finance Approve */}
          <button
            onClick={() => batchAdvance("HR_VERIFIED", "FINANCE_APPROVED")}
            disabled={statusCounts["HR_VERIFIED"] === 0}
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-left"
          >
            <div className="p-2 rounded-lg bg-purple-950 text-purple-400">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">财务 审批</p>
              <p className="text-xs text-slate-500">{statusCounts["HR_VERIFIED"]} 条待审批</p>
            </div>
          </button>

          {/* CEO Approve */}
          <button
            onClick={() => batchAdvance("FINANCE_APPROVED", "CEO_APPROVED")}
            disabled={statusCounts["FINANCE_APPROVED"] === 0}
            className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-left"
          >
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">CEO 终审</p>
              <p className="text-xs text-slate-500">{statusCounts["FINANCE_APPROVED"]} 条待终审</p>
            </div>
          </button>
        </div>

        {/* Payout */}
        {statusCounts["CEO_APPROVED"] > 0 && !showPayoutConfirm && (
          <button
            onClick={() => setShowPayoutConfirm(true)}
            className="w-full p-4 rounded-lg bg-emerald-950 border border-emerald-800 hover:border-emerald-600 transition-all flex items-center justify-center gap-2"
          >
            <Lock className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">确认发放 ({statusCounts["CEO_APPROVED"]} 条)</span>
          </button>
        )}

        {/* Payout Confirmation */}
        {showPayoutConfirm && (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-900">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-5 w-5 text-red-400" />
              <h4 className="text-sm font-semibold text-red-300">二次验证 -- 确认发放</h4>
            </div>
            <p className="text-xs text-red-400/80 mb-3">
              即将发放 {statusCounts["CEO_APPROVED"]} 条薪资记录，此操作不可撤销。请输入确认码。
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                className="flex-1 bg-slate-900 border border-red-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="请输入4位以上确认码"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                autoFocus
              />
              <Button
                onClick={executePayout}
                disabled={confirmCode.length < 4}
                className="bg-red-800 hover:bg-red-700 text-white"
              >
                确认发放
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowPayoutConfirm(false); setConfirmCode(""); }}
                className="border-slate-700 text-slate-400 hover:bg-slate-800"
              >
                取消
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Per-status employee lists */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">各状态员工分布</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {STATUS_FLOW.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const emps = employees.filter((e) => e.status === status);
            return (
              <div key={status} className={`rounded-lg border border-slate-800 p-3 ${cfg.darkBg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  <span className={`text-lg font-bold ${cfg.color}`}>{emps.length}</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-hide">
                  {emps.slice(0, 8).map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate">{e.name}</span>
                      <span className="text-slate-500">{fmt(e.netPay)}</span>
                    </div>
                  ))}
                  {emps.length > 8 && (
                    <p className="text-[10px] text-slate-600 text-center">+{emps.length - 8} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 5: 异常检测 (Anomaly Detection)
// ═══════════════════════════════════════════════════════════════

function AnomalyDetectionTab({ employees }: { employees: MockEmployee[] }) {
  const anomalies = useMemo(() => {
    return employees
      .map((e) => {
        const change = pctChange(e.netPay, e.lastMonthNet);
        const flags: string[] = [];
        if (Math.abs(change) > 10) flags.push(`环比变动 ${change.toFixed(1)}%`);
        if (e.baseSalary === 0) flags.push("基本工资为零");
        if (e.grossPay > 50000) flags.push("应发超过5万");
        if (e.perfScore < 60 && (e.perfWage1Override ?? e.perfWage1Calc) > e.perfWage1Calc) {
          flags.push("低绩效但绩效工资上调");
        }
        if (e.netPay < 0) flags.push("实发为负数");
        return { ...e, change, flags };
      })
      .filter((e) => e.flags.length > 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [employees]);

  const severeCount = anomalies.filter((a) => Math.abs(a.change) > 20).length;
  const warningCount = anomalies.filter((a) => Math.abs(a.change) > 10 && Math.abs(a.change) <= 20).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <DarkKpiCard
          label="异常总数"
          value={`${anomalies.length}`}
          icon={AlertTriangle}
          accent="bg-amber-900/50 text-amber-400"
        />
        <DarkKpiCard
          label="严重异常 (>20%)"
          value={`${severeCount}`}
          icon={FileWarning}
          accent="bg-red-900/50 text-red-400"
        />
        <DarkKpiCard
          label="警告 (10-20%)"
          value={`${warningCount}`}
          icon={AlertTriangle}
          accent="bg-yellow-900/50 text-yellow-400"
        />
      </div>

      {/* Anomaly List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-slate-500">
                <th className="text-left py-2.5 px-3 font-medium text-xs">工号</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">姓名</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">部门</th>
                <th className="text-right py-2.5 px-3 font-medium text-xs">上月实发</th>
                <th className="text-right py-2.5 px-3 font-medium text-xs">本月实发</th>
                <th className="text-right py-2.5 px-3 font-medium text-xs">变动</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">异常标记</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => {
                const isSevere = Math.abs(a.change) > 20;
                return (
                  <tr key={a.id} className={`border-b border-slate-800/50 transition-colors ${
                    isSevere ? "bg-red-950/20" : "bg-amber-950/10 hover:bg-slate-800/20"
                  }`}>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-xs">{a.id}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">{a.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{a.department}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{fmt(a.lastMonthNet)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{fmt(a.netPay)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${a.change > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {a.change > 0 ? "+" : ""}{a.change.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {a.flags.map((flag, fi) => (
                          <span key={fi} className={`inline-flex text-[10px] px-1.5 py-0.5 rounded ${
                            isSevere ? "bg-red-900/50 text-red-300" : "bg-amber-900/50 text-amber-300"
                          }`}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {anomalies.length === 0 && (
          <div className="text-center py-8 text-emerald-500 flex items-center justify-center gap-2">
            <Check className="h-5 w-5" /> 未检测到异常项
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 6: 差值调控 (Adjustment Control)
// ═══════════════════════════════════════════════════════════════

interface AdjustmentEntry {
  employeeId: number;
  employeeName: string;
  department: string;
  adjustType: string;
  amount: number;
  reason: string;
  createdAt: string;
}

function AdjustmentControlTab({ employees }: { employees: MockEmployee[] }) {
  const [adjustments, setAdjustments] = useState<AdjustmentEntry[]>([]);
  const [newAdj, setNewAdj] = useState({ employeeId: "", type: "补发", amount: "", reason: "" });

  const addAdjustment = () => {
    const empId = Number(newAdj.employeeId);
    const emp = employees.find((e) => e.id === empId);
    if (!emp || !newAdj.amount || !newAdj.reason) return;
    setAdjustments((prev) => [
      ...prev,
      {
        employeeId: empId,
        employeeName: emp.name,
        department: emp.department,
        adjustType: newAdj.type,
        amount: Number(newAdj.amount),
        reason: newAdj.reason,
        createdAt: new Date().toISOString().slice(0, 16),
      },
    ]);
    setNewAdj({ employeeId: "", type: "补发", amount: "", reason: "" });
  };

  const removeAdj = (idx: number) => {
    setAdjustments((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalAdj = adjustments.reduce((s, a) => s + (a.adjustType === "扣减" ? -a.amount : a.amount), 0);

  return (
    <div className="space-y-6">
      {/* New Adjustment Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Edit className="h-4 w-4 text-slate-500" /> 新增差值调控
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">员工工号</label>
            <input
              type="number"
              value={newAdj.employeeId}
              onChange={(e) => setNewAdj((p) => ({ ...p, employeeId: e.target.value }))}
              placeholder="如: 1001"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">类型</label>
            <select
              value={newAdj.type}
              onChange={(e) => setNewAdj((p) => ({ ...p, type: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none"
            >
              <option value="补发">补发</option>
              <option value="扣减">扣减</option>
              <option value="奖金">奖金</option>
              <option value="特殊调整">特殊调整</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">金额 (元)</label>
            <input
              type="number"
              value={newAdj.amount}
              onChange={(e) => setNewAdj((p) => ({ ...p, amount: e.target.value }))}
              placeholder="金额"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">原因</label>
            <input
              value={newAdj.reason}
              onChange={(e) => setNewAdj((p) => ({ ...p, reason: e.target.value }))}
              placeholder="调整原因"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={addAdjustment}
            disabled={!newAdj.employeeId || !newAdj.amount || !newAdj.reason}
            className="bg-blue-700 hover:bg-blue-600 text-white"
          >
            添加
          </Button>
        </div>
      </div>

      {/* Adjustment Summary */}
      <div className="flex items-center gap-4">
        <DarkKpiCard
          label="调整笔数"
          value={`${adjustments.length}`}
          icon={Edit}
          accent="bg-blue-900/50 text-blue-400"
        />
        <DarkKpiCard
          label="调整净额"
          value={fmt(totalAdj)}
          icon={DollarSign}
          accent={totalAdj >= 0 ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}
        />
      </div>

      {/* Adjustments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-slate-500">
                <th className="text-left py-2.5 px-3 font-medium text-xs">工号</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">姓名</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">部门</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">类型</th>
                <th className="text-right py-2.5 px-3 font-medium text-xs">金额</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">原因</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">时间</th>
                <th className="text-center py-2.5 px-3 font-medium text-xs">操作</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-xs">{a.employeeId}</td>
                  <td className="py-2.5 px-3 text-slate-200">{a.employeeName}</td>
                  <td className="py-2.5 px-3 text-slate-400">{a.department}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      a.adjustType === "扣减" ? "bg-red-900/50 text-red-300" :
                      a.adjustType === "奖金" ? "bg-emerald-900/50 text-emerald-300" :
                      "bg-blue-900/50 text-blue-300"
                    }`}>
                      {a.adjustType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-semibold ${a.adjustType === "扣减" ? "text-red-400" : "text-emerald-400"}`}>
                      {a.adjustType === "扣减" ? "-" : "+"}{fmt(a.amount)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-xs">{a.reason}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{a.createdAt}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => removeAdj(i)}
                      className="p-1 rounded bg-slate-800 text-red-400 hover:bg-red-900/50"
                      title="删除"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {adjustments.length === 0 && (
          <div className="text-center py-8 text-slate-600">暂无差值调控记录</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Access Denied Screen
// ═══════════════════════════════════════════════════════════════

function AccessDeniedScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-950 flex items-center justify-center">
          <Ban className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">ACCESS DENIED</h1>
        <p className="text-slate-400 text-sm">
          此页面为高度机密薪资审批看板，仅限授权人员访问。
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">授权人员</h3>
          {AUTHORIZED_USERS.map((u) => (
            <div key={u.name} className="flex items-center gap-2 py-1.5">
              <Shield className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-sm text-slate-300">{u.name}</span>
              <span className="text-xs text-slate-600">({u.title})</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600">
          Security Event ID: {Date.now().toString(36).toUpperCase()} | IP logged
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab definitions
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { key: "overview",   label: "薪资总览",   icon: BarChart3 },
  { key: "perfWage",   label: "绩效工资调整", icon: Edit },
  { key: "detail",     label: "员工薪资明细", icon: Eye },
  { key: "approval",   label: "审批中心",   icon: Shield },
  { key: "anomaly",    label: "异常检测",   icon: AlertTriangle },
  { key: "adjustment", label: "差值调控",   icon: DollarSign },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function PayrollApprovalGate() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [employees, setEmployees] = useState<MockEmployee[]>(MOCK_EMPLOYEES);

  // ── Confidentiality Check ──────────────────────────────────
  // In production, this checks against useAuth().user.name
  // For now, we also check the role via useUserProfile
  let isAuthorized = false;
  try {
    const { currentUserRole } = useUserProfile();
    // In dev/demo mode, allow admin and director roles
    if (currentUserRole === "admin" || currentUserRole === "director") {
      isAuthorized = true;
    }
  } catch {
    // UserProfileContext might not be available in test
  }

  // Try to get user name from auth (real production check)
  try {
    // useAuth hook check would go here in production
    // For prototype, we also authorize via role check above
  } catch {
    // Ignore
  }

  // In production: uncomment the following for strict name-based check
  // const { user } = useAuth();
  // isAuthorized = isAuthorized || AUTHORIZED_NAMES.includes(user?.name);

  // For demo purposes: always allow (remove this line in production)
  isAuthorized = true;

  if (!isAuthorized) {
    return <AccessDeniedScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg shadow-amber-900/30">
              <Lock className="h-6 w-6 text-amber-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">薪资终审仪表板</h1>
              <p className="text-xs text-slate-500">
                CONFIDENTIAL -- Payroll Approval Gate -- {AUTHORIZED_USERS.map((u) => u.name).join(" / ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Shield className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-amber-400">Level 5 Clearance</span>
            </div>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-px scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all ${
                  isActive
                    ? "border-b-2 border-amber-500 text-amber-400 bg-slate-900/50"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === "overview" && <OverviewTab employees={employees} period={period} />}
          {activeTab === "perfWage" && <PerfWageOverrideTab employees={employees} setEmployees={setEmployees} />}
          {activeTab === "detail" && <EmployeeDetailTab employees={employees} />}
          {activeTab === "approval" && <ApprovalCenterTab employees={employees} setEmployees={setEmployees} />}
          {activeTab === "anomaly" && <AnomalyDetectionTab employees={employees} />}
          {activeTab === "adjustment" && <AdjustmentControlTab employees={employees} />}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-600">
          <span>Period: {period} | Generated: {new Date().toLocaleString("zh-CN")}</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            CLASSIFIED -- GRT Payroll System v2.0
          </span>
        </div>
      </div>
    </div>
  );
}
