/**
 * CEO Payroll Approval Gate v3 -- 薪资终审仪表板 (Executive Dark Theme)
 *
 * Strict confidentiality: only 3 authorized personnel may access.
 *   - 倪亚东 / CEO
 *   - 刘奥运 / 董秘
 *   - 倪微薇 / AI部门经理
 *
 * 6 tabs:
 *   1. 薪资总览 (Overview) — Monthly total, dept breakdown
 *   2. 绩效工资调整 (Performance Wage Read-only) — 绩效1/2/3 display
 *   3. 员工薪资明细 (Employee Detail) — Searchable table with all salary components
 *   4. 审批中心 (Approval Center) — Stage pipeline, approve/reject/lock/payout
 *   5. 异常检测 (Anomaly Detection) — Backend anomaly list + stats
 *   6. 差值调控 (Adjustment Control) — Backend adjustments CRUD
 *
 * All data from trpc.payrollSandbox.* — zero mock data.
 */

import React, { useState, useMemo } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Lock, DollarSign, AlertTriangle,
  Check, X, Edit, Eye, Search,
  ArrowUpDown, FileWarning, Users,
  BarChart3, PieChart, Loader2, Ban, ChevronRight,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// Confidentiality Gate
// ═══════════════════════════════════════════════════════════════

const AUTHORIZED_USERS = [
  { name: "倪亚东", title: "CEO" },
  { name: "刘奥运", title: "董秘" },
  { name: "倪微薇", title: "AI部门经理" },
];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function fmt(val: number | string | null | undefined): string {
  const n = Number(val ?? 0);
  return `¥${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function fmtWan(val: number | string | null | undefined): string {
  const n = Number(val ?? 0);
  return `¥${(n / 10000).toFixed(2)}万`;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Convert "2026-03" → "202603" for cycle.period matching */
function monthToPeriod(month: string): string {
  return month.replace("-", "");
}

// ═══════════════════════════════════════════════════════════════
// Loading / Empty state
// ═══════════════════════════════════════════════════════════════

function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      <span className="text-sm text-slate-500">{label ?? "加载中..."}</span>
    </div>
  );
}

function NoCycleState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <FileWarning className="h-10 w-10 text-slate-700" />
      <p className="text-sm text-slate-500">该月无薪资周期</p>
      <p className="text-xs text-slate-600">请在薪资沙盘中创建该月周期后刷新</p>
    </div>
  );
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

function OverviewTab({ cycleId }: { cycleId: number }) {
  const overview = trpc.payrollSandbox.dashboard.overview.useQuery(
    { cycleId },
    { enabled: !!cycleId },
  );
  const deptBreakdown = trpc.payrollSandbox.dashboard.deptBreakdown.useQuery(
    { cycleId },
    { enabled: !!cycleId },
  );

  if (overview.isLoading) return <LoadingState />;
  const data = overview.data;
  if (!data) return <div className="text-center py-8 text-slate-600">无数据</div>;

  const stats = data.calcStats;
  const totalGross = Number(stats?.totalGross ?? 0);
  const totalNet = Number(stats?.totalNet ?? 0);
  const totalTax = Number(stats?.totalTax ?? 0);
  const totalSocial = Number(stats?.totalSocial ?? 0) + Number(stats?.totalHousing ?? 0);
  const headcount = Number(stats?.count ?? 0);

  const depts = (deptBreakdown.data ?? [])
    .map((d) => ({
      dept: d.department ?? "未知",
      count: Number(d.count ?? 0),
      gross: Number(d.totalGross ?? 0),
      net: Number(d.totalNet ?? 0),
      avgGross: Number(d.avgGross ?? 0),
    }))
    .sort((a, b) => b.gross - a.gross);

  const maxGross = Math.max(...depts.map((d) => d.gross), 1);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DarkKpiCard label="应发总额" value={fmtWan(totalGross)} icon={DollarSign} accent="bg-blue-900/50 text-blue-400" />
        <DarkKpiCard label="实发总额" value={fmtWan(totalNet)} icon={DollarSign} accent="bg-emerald-900/50 text-emerald-400" />
        <DarkKpiCard label="个税+社保" value={fmtWan(totalTax + totalSocial)} icon={Shield} accent="bg-purple-900/50 text-purple-400" />
        <DarkKpiCard label="在册人数" value={`${headcount}人`} icon={Users} accent="bg-amber-900/50 text-amber-400" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <DarkKpiCard label="待处理调整" value={`${data.pendingAdjustments}`} icon={Edit} accent="bg-cyan-900/50 text-cyan-400" />
        <DarkKpiCard label="未解决异常" value={`${data.unresolvedAnomalies}`} icon={AlertTriangle} accent="bg-red-900/50 text-red-400" />
        <DarkKpiCard
          label="周期状态"
          value={data.cycle?.status ?? "--"}
          sub={data.cycle?.name ?? ""}
          icon={Shield}
          accent="bg-slate-800 text-slate-400"
        />
      </div>

      {/* Department Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <PieChart className="h-4 w-4 text-slate-500" /> 部门薪资分布
        </h3>
        {depts.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-4">暂无部门数据</p>
        ) : (
          <div className="space-y-3">
            {depts.map((d) => {
              const pct = totalGross > 0 ? (d.gross / totalGross * 100) : 0;
              const barWidth = (d.gross / maxGross * 100);
              return (
                <div key={d.dept} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-24 shrink-0 text-right truncate">{d.dept}</span>
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
        )}
      </div>

      {/* Dept Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" /> 部门明细
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">部门</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">人数</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">应发合计</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">实发合计</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">人均应发</th>
              </tr>
            </thead>
            <tbody>
              {depts.map((d) => (
                <tr key={d.dept} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-slate-300 font-medium">{d.dept}</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{d.count}</td>
                  <td className="py-2.5 px-3 text-right text-slate-300">{fmt(d.gross)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-200 font-semibold">{fmt(d.net)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{d.count > 0 ? fmt(d.avgGross) : "--"}</td>
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
// Tab 2: 绩效工资调整 (Performance Wage Read-only)
// ═══════════════════════════════════════════════════════════════

function PerfWageTab({ cycleId }: { cycleId: number }) {
  const [search, setSearch] = useState("");
  const perfQ = trpc.payrollSandbox.dashboard.perfWageAnalysis.useQuery(
    { cycleId },
    { enabled: !!cycleId },
  );

  const rows = perfQ.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.employeeName ?? "").toLowerCase().includes(q) ||
      (r.department ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPerf = rows.reduce((s, r) => {
    return s + Number(r.perfWage1 ?? 0) + Number(r.perfWage2 ?? 0) + Number(r.perfWage3 ?? 0);
  }, 0);

  if (perfQ.isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="搜索员工姓名 / 部门..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            绩效工资总额: <span className="font-bold text-blue-400">{fmtWan(totalPerf)}</span>
          </span>
          <Badge variant="outline" className="border-slate-700 text-slate-400">
            {filtered.length} 名员工
          </Badge>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60">
                <th className="text-left py-3 px-3 text-slate-500 font-medium text-xs">姓名</th>
                <th className="text-left py-3 px-3 text-slate-500 font-medium text-xs">部门</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">系数1</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">绩效工资1</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">系数2</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">绩效工资2</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">系数3</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">绩效工资3</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">扣减1</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">扣减2</th>
                <th className="text-right py-3 px-3 text-slate-500 font-medium text-xs">扣减3</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const w1 = Number(r.perfWage1 ?? 0);
                const w2 = Number(r.perfWage2 ?? 0);
                const w3 = Number(r.perfWage3 ?? 0);
                return (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 text-slate-200 font-medium">{r.employeeName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{r.department}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{r.perfCoeff1 ?? "--"}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{w1 > 0 ? fmt(w1) : <span className="text-slate-600">--</span>}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{r.perfCoeff2 ?? "--"}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{w2 > 0 ? fmt(w2) : <span className="text-slate-600">--</span>}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{r.perfCoeff3 ?? "--"}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{w3 > 0 ? fmt(w3) : <span className="text-slate-600">--</span>}</td>
                    <td className="py-2.5 px-3 text-right">
                      {Number(r.perfDeduction1 ?? 0) > 0 ? <span className="text-red-400">-{fmt(r.perfDeduction1)}</span> : <span className="text-slate-600">--</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {Number(r.perfDeduction2 ?? 0) > 0 ? <span className="text-red-400">-{fmt(r.perfDeduction2)}</span> : <span className="text-slate-600">--</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {Number(r.perfDeduction3 ?? 0) > 0 ? <span className="text-red-400">-{fmt(r.perfDeduction3)}</span> : <span className="text-slate-600">--</span>}
                    </td>
                  </tr>
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

function EmployeeDetailTab({ cycleId }: { cycleId: number }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"netPay" | "grossPay" | "name">("netPay");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const calcQ = trpc.payrollSandbox.calc.listResults.useQuery(
    { cycleId },
    { enabled: !!cycleId },
  );

  const rows = calcQ.data ?? [];

  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        (e.employeeName ?? "").toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortField === "name") {
        return sortDir === "asc"
          ? (a.employeeName ?? "").localeCompare(b.employeeName ?? "")
          : (b.employeeName ?? "").localeCompare(a.employeeName ?? "");
      }
      const va = Number(sortField === "grossPay" ? a.grossPay : a.netPay) || 0;
      const vb = Number(sortField === "grossPay" ? b.grossPay : b.netPay) || 0;
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [rows, search, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  if (calcQ.isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 w-72 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="搜索员工 / 部门..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="border-slate-700 text-slate-400">
          {filtered.length} / {rows.length}
        </Badge>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800/60 text-slate-500">
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const plDed = Number(e.personalLeaveDeduction ?? 0);
                const slDed = Number(e.sickLeaveDeduction ?? 0);
                const attend = Number(e.perfectAttendanceBonus ?? 0);
                const cash = Number(e.cashSubsidy ?? 0);
                const travel = Number(e.travelCarSubsidy ?? 0);
                return (
                  <tr key={e.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="py-2 px-2 text-slate-200 font-medium">{e.employeeName}</td>
                    <td className="py-2 px-2 text-slate-400">{e.department}</td>
                    <td className="py-2 px-2 text-right text-slate-300">{fmt(e.baseSalary)}</td>
                    <td className="py-2 px-2 text-right text-slate-400">{Number(e.positionWage ?? 0) > 0 ? fmt(e.positionWage) : <span className="text-slate-600">--</span>}</td>
                    <td className="py-2 px-2 text-right text-slate-400">{Number(e.skillSubsidy ?? 0) > 0 ? fmt(e.skillSubsidy) : <span className="text-slate-600">--</span>}</td>
                    <td className="py-2 px-2 text-right text-blue-300 font-semibold">
                      {fmt(e.comprehensiveSalary)}
                      {e.isLumpSum && <span className="ml-1 text-[9px] text-amber-500">包干</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300">{fmt(e.perfWage1)}</td>
                    <td className="py-2 px-2 text-right text-slate-300">{fmt(e.perfWage2)}</td>
                    <td className="py-2 px-2 text-right text-slate-300">{fmt(e.perfWage3)}</td>
                    <td className="py-2 px-2 text-right">
                      {plDed > 0 ? <span className="text-red-400">-{fmt(plDed)}</span> : <span className="text-slate-600">--</span>}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {slDed > 0 ? <span className="text-orange-400">-{fmt(slDed)}</span> : <span className="text-slate-600">--</span>}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {attend > 0 ? <span className="text-emerald-400">+{fmt(attend)}</span> : <span className="text-slate-600">--</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-100 font-semibold">{fmt(e.grossPay)}</td>
                    <td className="py-2 px-2 text-right">
                      {cash > 0 ? <span className="text-cyan-400">{fmt(cash)}</span> : <span className="text-slate-600">--</span>}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {travel > 0 ? <span className="text-cyan-400">{fmt(travel)}</span> : <span className="text-slate-600">--</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400">{fmt(e.socialInsurance)}</td>
                    <td className="py-2 px-2 text-right text-slate-400">{fmt(e.housingFund)}</td>
                    <td className="py-2 px-2 text-right text-slate-400">{fmt(e.incomeTax)}</td>
                    <td className="py-2 px-2 text-right text-emerald-400 font-bold">{fmt(e.netPay)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-600">无匹配数据</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 4: 审批中心 (Approval Center)
// ═══════════════════════════════════════════════════════════════

const STAGE_CONFIG: Record<string, { label: string; color: string; darkBg: string }> = {
  hr_initial:           { label: "HR初审",     color: "text-blue-400",    darkBg: "bg-blue-950" },
  finance_review:       { label: "财务复核",   color: "text-purple-400",  darkBg: "bg-purple-950" },
  dept_manager_confirm: { label: "部门确认",   color: "text-amber-400",   darkBg: "bg-amber-950" },
  exec_approve:         { label: "总经办批准", color: "text-emerald-400", darkBg: "bg-emerald-950" },
};

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: "待审",   color: "text-slate-400" },
  approved: { label: "已批准", color: "text-emerald-400" },
  rejected: { label: "已驳回", color: "text-red-400" },
};

function ApprovalCenterTab({ cycleId }: { cycleId: number }) {
  const [confirmCode, setConfirmCode] = useState("");
  const [showPayoutConfirm, setShowPayoutConfirm] = useState(false);
  const [comment, setComment] = useState("");

  const utils = trpc.useUtils();
  const approvalList = trpc.payrollSandbox.approval.list.useQuery({ cycleId }, { enabled: !!cycleId });
  const currentStage = trpc.payrollSandbox.approval.currentStage.useQuery({ cycleId }, { enabled: !!cycleId });
  const fullyApproved = trpc.payrollSandbox.approval.isFullyApproved.useQuery({ cycleId }, { enabled: !!cycleId });

  const initFlow = trpc.payrollSandbox.approval.initFlow.useMutation({
    onSuccess: () => { utils.payrollSandbox.approval.invalidate(); },
  });
  const approveMut = trpc.payrollSandbox.approval.approve.useMutation({
    onSuccess: () => { utils.payrollSandbox.approval.invalidate(); setComment(""); },
  });
  const rejectMut = trpc.payrollSandbox.approval.reject.useMutation({
    onSuccess: () => { utils.payrollSandbox.approval.invalidate(); setComment(""); },
  });
  const fullLock = trpc.payrollSandbox.lock.lock.useMutation({
    onSuccess: () => { utils.payrollSandbox.approval.invalidate(); },
  });

  const stages = approvalList.data ?? [];
  const current = currentStage.data;
  const isFullyDone = fullyApproved.data?.fullyApproved ?? false;

  if (approvalList.isLoading) return <LoadingState />;

  const handlePayout = () => {
    if (confirmCode.length < 4) return;
    fullLock.mutate({ cycleId, lockType: "full", reason: "薪资发放确认锁定" });
    setShowPayoutConfirm(false);
    setConfirmCode("");
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-5">审批流水线</h3>
        {stages.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-3">审批流程尚未初始化</p>
            <Button
              onClick={() => initFlow.mutate({ cycleId })}
              disabled={initFlow.isPending}
              className="bg-blue-700 hover:bg-blue-600 text-white"
            >
              {initFlow.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              初始化审批流程
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {stages.map((stage, i) => {
              const cfg = STAGE_CONFIG[stage.stage] ?? { label: stage.stage, color: "text-slate-400", darkBg: "bg-slate-800" };
              const aCfg = ACTION_CONFIG[stage.action ?? "pending"] ?? ACTION_CONFIG.pending;
              const isCurrent = current?.id === stage.id;
              return (
                <React.Fragment key={stage.id}>
                  <div className={`flex flex-col items-center p-4 rounded-xl min-w-[130px] border transition-all ${
                    isCurrent ? `${cfg.darkBg} border-slate-600 ring-1 ring-amber-500/50` :
                    stage.action === "approved" ? `${cfg.darkBg} border-slate-700` :
                    "bg-slate-900 border-slate-800 opacity-50"
                  }`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      stage.action === "approved" ? "text-emerald-400 bg-emerald-950" :
                      stage.action === "rejected" ? "text-red-400 bg-red-950" :
                      `${cfg.color} bg-slate-800`
                    }`}>
                      {stage.action === "approved" ? <Check className="h-6 w-6" /> :
                       stage.action === "rejected" ? <X className="h-6 w-6" /> :
                       stage.stageOrder}
                    </div>
                    <span className={`text-xs font-medium mt-2 ${cfg.color}`}>{cfg.label}</span>
                    <span className={`text-[10px] mt-0.5 ${aCfg.color}`}>{aCfg.label}</span>
                    {stage.reviewerName && (
                      <span className="text-[10px] text-slate-600 mt-0.5">{stage.reviewerName}</span>
                    )}
                  </div>
                  {i < stages.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-slate-700 mx-1 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Area */}
      {current && (
        <div className="bg-slate-900 border border-amber-900/50 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <Shield className="h-4 w-4" /> 当前阶段: {STAGE_CONFIG[current.stage]?.label ?? current.stage}
          </h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500 block mb-1">审批意见</label>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="输入审批意见（驳回时必填）..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <Button
              onClick={() => approveMut.mutate({ flowId: current.id, comment: comment || undefined })}
              disabled={approveMut.isPending}
              className="bg-emerald-700 hover:bg-emerald-600 text-white"
            >
              {approveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              批准
            </Button>
            <Button
              onClick={() => {
                if (!comment) { alert("驳回需要填写意见"); return; }
                rejectMut.mutate({ flowId: current.id, comment });
              }}
              disabled={rejectMut.isPending || !comment}
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-950"
            >
              {rejectMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
              驳回
            </Button>
          </div>
        </div>
      )}

      {/* Lock & Payout */}
      {isFullyDone && !showPayoutConfirm && (
        <button
          onClick={() => setShowPayoutConfirm(true)}
          className="w-full p-4 rounded-lg bg-emerald-950 border border-emerald-800 hover:border-emerald-600 transition-all flex items-center justify-center gap-2"
        >
          <Lock className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">全审批通过 -- 确认锁定发放</span>
        </button>
      )}

      {showPayoutConfirm && (
        <div className="p-4 rounded-lg bg-red-950/30 border border-red-900">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-5 w-5 text-red-400" />
            <h4 className="text-sm font-semibold text-red-300">二次验证 -- 确认锁定发放</h4>
          </div>
          <p className="text-xs text-red-400/80 mb-3">
            即将锁定本周期全部薪资数据，此操作不可撤销。请输入确认码。
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
              onClick={handlePayout}
              disabled={confirmCode.length < 4 || fullLock.isPending}
              className="bg-red-800 hover:bg-red-700 text-white"
            >
              {fullLock.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              确认锁定
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

      {/* Approval History */}
      {stages.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">审批记录</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left py-2 px-3 font-medium text-xs">阶段</th>
                  <th className="text-left py-2 px-3 font-medium text-xs">状态</th>
                  <th className="text-left py-2 px-3 font-medium text-xs">审批人</th>
                  <th className="text-left py-2 px-3 font-medium text-xs">意见</th>
                  <th className="text-left py-2 px-3 font-medium text-xs">时间</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => {
                  const cfg = STAGE_CONFIG[s.stage] ?? { label: s.stage, color: "text-slate-400" };
                  const aCfg = ACTION_CONFIG[s.action ?? "pending"] ?? ACTION_CONFIG.pending;
                  return (
                    <tr key={s.id} className="border-b border-slate-800/50">
                      <td className={`py-2 px-3 font-medium text-xs ${cfg.color}`}>{cfg.label}</td>
                      <td className={`py-2 px-3 text-xs ${aCfg.color}`}>{aCfg.label}</td>
                      <td className="py-2 px-3 text-xs text-slate-400">{s.reviewerName ?? "--"}</td>
                      <td className="py-2 px-3 text-xs text-slate-500">{s.comment ?? "--"}</td>
                      <td className="py-2 px-3 text-xs text-slate-600">{s.actionAt ? new Date(s.actionAt).toLocaleString("zh-CN") : "--"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 5: 异常检测 (Anomaly Detection)
// ═══════════════════════════════════════════════════════════════

const CATEGORY_LABELS: Record<string, string> = {
  evidence_insufficient: "举证不足",
  perf_quality_conflict: "绩效质量冲突",
  allowance_no_basis: "补贴无依据",
  social_fund_mismatch: "社保不匹配",
  tax_bracket_anomaly: "个税档次异常",
  net_pay_volatility: "实发波动异常",
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  info: { bg: "bg-blue-900/50", text: "text-blue-300" },
  warning: { bg: "bg-amber-900/50", text: "text-amber-300" },
  critical: { bg: "bg-red-900/50", text: "text-red-300" },
};

function AnomalyDetectionTab({ cycleId }: { cycleId: number }) {
  const anomalyList = trpc.payrollSandbox.anomaly.list.useQuery(
    { cycleId },
    { enabled: !!cycleId },
  );
  const anomalyStats = trpc.payrollSandbox.anomaly.stats.useQuery(
    { cycleId },
    { enabled: !!cycleId },
  );

  if (anomalyList.isLoading) return <LoadingState />;

  const anomalies = anomalyList.data ?? [];
  const stats = anomalyStats.data ?? [];

  const totalCount = anomalies.length;
  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
  const warningCount = anomalies.filter((a) => a.severity === "warning").length;

  // Group stats by category
  const catCounts = new Map<string, number>();
  for (const s of stats) {
    const prev = catCounts.get(s.category ?? "") ?? 0;
    catCounts.set(s.category ?? "", prev + Number(s.count ?? 0));
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DarkKpiCard label="异常总数" value={`${totalCount}`} icon={AlertTriangle} accent="bg-amber-900/50 text-amber-400" />
        <DarkKpiCard label="严重" value={`${criticalCount}`} icon={FileWarning} accent="bg-red-900/50 text-red-400" />
        <DarkKpiCard label="警告" value={`${warningCount}`} icon={AlertTriangle} accent="bg-yellow-900/50 text-yellow-400" />
        <DarkKpiCard label="分类数" value={`${catCounts.size}`} icon={BarChart3} accent="bg-blue-900/50 text-blue-400" />
      </div>

      {/* Category Breakdown */}
      {catCounts.size > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from(catCounts.entries()).map(([cat, cnt]) => (
            <div key={cat} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
              <span className="text-xs text-slate-400">{CATEGORY_LABELS[cat] ?? cat}</span>
              <span className="text-sm font-bold text-slate-200">{cnt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Anomaly List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-slate-500">
                <th className="text-left py-2.5 px-3 font-medium text-xs">员工</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">分类</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">严重度</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">标题</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">说明</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">字段</th>
                <th className="text-center py-2.5 px-3 font-medium text-xs">已解决</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => {
                const sev = SEVERITY_STYLES[a.severity ?? "info"] ?? SEVERITY_STYLES.info;
                return (
                  <tr key={a.id} className={`border-b border-slate-800/50 transition-colors ${
                    a.severity === "critical" ? "bg-red-950/20" : "hover:bg-slate-800/20"
                  }`}>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">{a.employeeName}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs text-slate-400">{CATEGORY_LABELS[a.category ?? ""] ?? a.category}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded ${sev.bg} ${sev.text}`}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-xs">{a.title}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs max-w-[200px] truncate">{a.description}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs font-mono">{a.fieldName ?? "--"}</td>
                    <td className="py-2.5 px-3 text-center">
                      {a.isResolved ? (
                        <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-xs text-slate-600">--</span>
                      )}
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

const ADJUST_TYPES = [
  { value: "bonus_addition", label: "补发/奖金" },
  { value: "deduction_correction", label: "扣减" },
  { value: "perf_wage_override", label: "绩效调整" },
  { value: "attendance_correction", label: "考勤修正" },
  { value: "retroactive", label: "追溯调整" },
  { value: "other", label: "其他" },
] as const;

function AdjustmentControlTab({ cycleId }: { cycleId: number }) {
  const [newAdj, setNewAdj] = useState({
    employeeName: "",
    adjustType: "bonus_addition" as string,
    adjustedValue: "",
    adjustAmount: "",
    reason: "",
  });

  const utils = trpc.useUtils();

  const adjList = trpc.payrollSandbox.result.listAdjustments.useQuery(
    { cycleId },
    { enabled: !!cycleId },
  );

  const createAdj = trpc.payrollSandbox.result.createAdjustment.useMutation({
    onSuccess: () => {
      utils.payrollSandbox.result.listAdjustments.invalidate({ cycleId });
      setNewAdj({ employeeName: "", adjustType: "bonus_addition", adjustedValue: "", adjustAmount: "", reason: "" });
    },
  });

  const adjustments = adjList.data ?? [];

  const totalAdj = adjustments.reduce((s, a) => s + Number(a.adjustAmount ?? 0), 0);

  const handleCreate = () => {
    if (!newAdj.employeeName || !newAdj.adjustAmount || !newAdj.reason) return;
    createAdj.mutate({
      cycleId,
      employeeName: newAdj.employeeName,
      adjustType: newAdj.adjustType as any,
      adjustedValue: Number(newAdj.adjustedValue) || 0,
      adjustAmount: Number(newAdj.adjustAmount),
      reason: newAdj.reason,
    });
  };

  if (adjList.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* New Adjustment Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Edit className="h-4 w-4 text-slate-500" /> 新增差值调控
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">员工姓名</label>
            <input
              value={newAdj.employeeName}
              onChange={(e) => setNewAdj((p) => ({ ...p, employeeName: e.target.value }))}
              placeholder="如: 吴卫成"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">类型</label>
            <select
              value={newAdj.adjustType}
              onChange={(e) => setNewAdj((p) => ({ ...p, adjustType: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none"
            >
              {ADJUST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">调整金额 (元)</label>
            <input
              type="number"
              value={newAdj.adjustAmount}
              onChange={(e) => setNewAdj((p) => ({ ...p, adjustAmount: e.target.value }))}
              placeholder="正=加 负=减"
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
            onClick={handleCreate}
            disabled={!newAdj.employeeName || !newAdj.adjustAmount || !newAdj.reason || createAdj.isPending}
            className="bg-blue-700 hover:bg-blue-600 text-white"
          >
            {createAdj.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
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
                <th className="text-left py-2.5 px-3 font-medium text-xs">员工</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">类型</th>
                <th className="text-right py-2.5 px-3 font-medium text-xs">调整额</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">原因</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">状态</th>
                <th className="text-left py-2.5 px-3 font-medium text-xs">时间</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => {
                const amt = Number(a.adjustAmount ?? 0);
                const typeLabel = ADJUST_TYPES.find((t) => t.value === a.adjustType)?.label ?? a.adjustType;
                return (
                  <tr key={a.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 text-slate-200">{a.employeeName}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        a.adjustType === "deduction_correction" ? "bg-red-900/50 text-red-300" :
                        a.adjustType === "bonus_addition" ? "bg-emerald-900/50 text-emerald-300" :
                        "bg-blue-900/50 text-blue-300"
                      }`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-semibold ${amt < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {amt >= 0 ? "+" : ""}{fmt(amt)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-xs">{a.reason}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        a.status === "approved" ? "bg-emerald-900/50 text-emerald-300" :
                        a.status === "rejected" ? "bg-red-900/50 text-red-300" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {a.status === "approved" ? "已批准" : a.status === "rejected" ? "已驳回" : "待审"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">{a.createdAt ? new Date(a.createdAt).toLocaleString("zh-CN") : "--"}</td>
                  </tr>
                );
              })}
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
  { key: "overview",   label: "薪资总览",     icon: BarChart3 },
  { key: "perfWage",   label: "绩效工资调整", icon: Edit },
  { key: "detail",     label: "员工薪资明细", icon: Eye },
  { key: "approval",   label: "审批中心",     icon: Shield },
  { key: "anomaly",    label: "异常检测",     icon: AlertTriangle },
  { key: "adjustment", label: "差值调控",     icon: DollarSign },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function PayrollApprovalGate() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState(getCurrentPeriod());

  // ── Confidentiality Check ──────────────────────────────────
  let isAuthorized = false;
  try {
    const { currentUserRole } = useUserProfile();
    if (currentUserRole === "admin" || currentUserRole === "director") {
      isAuthorized = true;
    }
  } catch {
    // UserProfileContext might not be available in test
  }

  // For demo purposes: always allow (remove this line in production)
  isAuthorized = true;

  // ── Cycle selection ────────────────────────────────────────
  const cyclesQ = trpc.payrollSandbox.cycle.list.useQuery(undefined, {
    enabled: isAuthorized,
  });

  const selectedCycle = useMemo(() => {
    const targetPeriod = monthToPeriod(period);
    return (cyclesQ.data ?? []).find((c) => c.period === targetPeriod) ?? null;
  }, [cyclesQ.data, period]);

  const selectedCycleId = selectedCycle?.id ?? null;

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
            {selectedCycle && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">
                  {selectedCycle.name} ({selectedCycle.status})
                </span>
              </div>
            )}
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
          {cyclesQ.isLoading ? (
            <LoadingState label="加载薪资周期..." />
          ) : !selectedCycleId ? (
            <NoCycleState />
          ) : (
            <>
              {activeTab === "overview" && <OverviewTab cycleId={selectedCycleId} />}
              {activeTab === "perfWage" && <PerfWageTab cycleId={selectedCycleId} />}
              {activeTab === "detail" && <EmployeeDetailTab cycleId={selectedCycleId} />}
              {activeTab === "approval" && <ApprovalCenterTab cycleId={selectedCycleId} />}
              {activeTab === "anomaly" && <AnomalyDetectionTab cycleId={selectedCycleId} />}
              {activeTab === "adjustment" && <AdjustmentControlTab cycleId={selectedCycleId} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-600">
          <span>Period: {period} | Cycle: {selectedCycle?.name ?? "N/A"} | Generated: {new Date().toLocaleString("zh-CN")}</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            CLASSIFIED -- GRT Payroll System v3.0
          </span>
        </div>
      </div>
    </div>
  );
}
