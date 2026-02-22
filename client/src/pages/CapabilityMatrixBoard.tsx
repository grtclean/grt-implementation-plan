import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Award, Filter } from "lucide-react";

// ── Types ──

interface Assessment {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string | null;
  position: string | null;
  tScore: string | null;
  sScore: string | null;
  dScore: string | null;
  cScore: string | null;
  kScore: string | null;
  lScore: string | null;
  assessedAt: string;
}

// ── Domain Configuration ──

const DOMAINS = [
  { code: "T", label: "硬核技术力", field: "tScore" as const },
  { code: "S", label: "软性通用力", field: "sScore" as const },
  { code: "D", label: "设计与创新力", field: "dScore" as const },
  { code: "C", label: "沟通协作力", field: "cScore" as const },
  { code: "K", label: "专业标准力", field: "kScore" as const },
  { code: "L", label: "领导与战略力", field: "lScore" as const },
] as const;

type ScoreField = (typeof DOMAINS)[number]["field"];

// ── Helpers ──

function parseScore(raw: string | null): { level: number; score: number } {
  if (!raw) return { level: 0, score: 0 };
  const num = parseFloat(raw);
  if (isNaN(num)) return { level: 0, score: 0 };
  if (num >= 90) return { level: 5, score: num };
  if (num >= 75) return { level: 4, score: num };
  if (num >= 60) return { level: 3, score: num };
  if (num >= 40) return { level: 2, score: num };
  return { level: 1, score: num };
}

function scoreBadge(raw: string | null) {
  const { level, score } = parseScore(raw);

  if (level === 0) {
    return (
      <span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium bg-[#f3f2f1] text-[#a19f9d]">
        --
      </span>
    );
  }

  let bg: string;
  let text: string;
  let tag: string;

  if (level >= 4) {
    bg = "bg-[#dff6dd]";
    text = "text-[#107c10]";
    tag = `L${level}`;
  } else if (level === 3) {
    bg = "bg-[#deecf9]";
    text = "text-[#0078d4]";
    tag = "L3";
  } else if (level === 2) {
    bg = "bg-[#fff4ce]";
    text = "text-[#797673]";
    tag = "L2";
  } else {
    bg = "bg-[#fed9cc]";
    text = "text-[#d83b01]";
    tag = "L1";
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-semibold ${bg} ${text}`}
    >
      {tag} ({Math.round(score)})
    </span>
  );
}

function avgScore(row: Assessment): number {
  const fields: ScoreField[] = ["tScore", "sScore", "dScore", "cScore", "kScore", "lScore"];
  let sum = 0;
  let count = 0;
  for (const f of fields) {
    const v = parseFloat(row[f] || "");
    if (!isNaN(v)) {
      sum += v;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ── Skeleton Row ──

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 rounded bg-[#f3f2f1] animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ── Main Component ──

export default function CapabilityMatrixBoard() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const assessmentsQuery = trpc.competency.getAssessments.useQuery(
    {
      ...(deptFilter !== "all" ? { department: deptFilter } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }
  );

  const departmentsQuery = trpc.competency.getDepartments.useQuery();

  const items: Assessment[] = assessmentsQuery.data?.items ?? [];
  const total = assessmentsQuery.data?.total ?? 0;
  const departments: string[] = departmentsQuery.data ?? [];
  const isLoading = assessmentsQuery.isLoading;

  // Summary statistics
  const summary = useMemo(() => {
    if (!items.length) {
      return { count: 0, t: 0, s: 0, d: 0, c: 0, k: 0, l: 0 };
    }

    const avg = (field: ScoreField) => {
      let sum = 0;
      let cnt = 0;
      for (const row of items) {
        const v = parseFloat(row[field] || "");
        if (!isNaN(v)) {
          sum += v;
          cnt++;
        }
      }
      return cnt > 0 ? Math.round(sum / cnt) : 0;
    };

    return {
      count: items.length,
      t: avg("tScore"),
      s: avg("sScore"),
      d: avg("dScore"),
      c: avg("cScore"),
      k: avg("kScore"),
      l: avg("lScore"),
    };
  }, [items]);

  return (
    <div className="flex flex-col h-full bg-[#faf9f8]">
      {/* ── Header ── */}
      <div className="bg-white border-b border-[#edebe9] px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Award className="h-5 w-5 text-[#0078d4]" />
              <h1 className="text-xl font-semibold text-[#323130]">
                GRT Global Competence Matrix (IATF 16949 Standard)
              </h1>
            </div>
            <p className="text-sm text-[#605e5c] mt-1 ml-[30px]">
              六大能力模型评估看板
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Department Filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#605e5c]" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none pl-8 pr-8 h-9 text-sm rounded border border-[#8a8886] bg-white text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] cursor-pointer"
              >
                <option value="all">全部部门</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#605e5c]" />
              <Input
                placeholder="搜索姓名或部门..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-full sm:w-[220px] text-sm border-[#8a8886] bg-white text-[#323130] placeholder:text-[#a19f9d] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f3f2f1]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider w-[50px]">
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider min-w-[100px]">
                  姓名
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider min-w-[100px]">
                  部门
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider min-w-[90px]">
                  岗位
                </th>
                {DOMAINS.map((d) => (
                  <th
                    key={d.code}
                    className="text-center px-3 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider min-w-[90px]"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[#0078d4] font-bold">{d.code}</span>
                      <span className="text-[10px] font-normal text-[#a19f9d] normal-case">
                        {d.label}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edebe9]">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} cols={4 + DOMAINS.length} />
                ))
              ) : items.length === 0 ? (
                // Empty state
                <tr>
                  <td
                    colSpan={4 + DOMAINS.length}
                    className="text-center py-16 text-[#a19f9d]"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-10 w-10 text-[#c8c6c4]" />
                      <p className="text-sm font-medium text-[#605e5c]">
                        暂无评估数据
                      </p>
                      <p className="text-xs text-[#a19f9d]">
                        请先完成员工能力评估录入
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data rows
                items.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#f3f2f1] transition-colors duration-150"
                  >
                    <td className="px-4 py-3 text-[#a19f9d] text-xs font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#323130]">
                        {row.employeeName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#605e5c]">
                      {row.department || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#605e5c]">
                      {row.position || "—"}
                    </td>
                    {DOMAINS.map((d) => (
                      <td key={d.code} className="px-3 py-3 text-center">
                        {scoreBadge(row[d.field])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Summary Footer ── */}
      <div className="bg-white border-t border-[#edebe9] px-4 sm:px-6 py-3">
        <div className="flex items-center gap-5 text-xs text-[#605e5c] flex-wrap">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#0078d4]" />
            <span className="font-semibold text-[#323130]">{summary.count}</span>
            <span>位员工</span>
          </div>

          <div className="h-3 w-px bg-[#edebe9]" />

          <span className="text-[#a19f9d]">平均分:</span>
          <span>
            T <span className="font-semibold text-[#323130]">{summary.t}</span>
          </span>
          <span>
            S <span className="font-semibold text-[#323130]">{summary.s}</span>
          </span>
          <span>
            D <span className="font-semibold text-[#323130]">{summary.d}</span>
          </span>
          <span>
            C <span className="font-semibold text-[#323130]">{summary.c}</span>
          </span>
          <span>
            K <span className="font-semibold text-[#323130]">{summary.k}</span>
          </span>
          <span>
            L <span className="font-semibold text-[#323130]">{summary.l}</span>
          </span>

          <div className="h-3 w-px bg-[#edebe9]" />

          <Badge
            variant="outline"
            className="text-[10px] border-[#edebe9] text-[#605e5c] font-normal"
          >
            IATF 16949 Compliant
          </Badge>
        </div>
      </div>
    </div>
  );
}
