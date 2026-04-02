import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Award, Filter, Pencil, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  { code: "T", labelKey: "hr.capMatrix.domainT", field: "tScore" as const },
  { code: "S", labelKey: "hr.capMatrix.domainS", field: "sScore" as const },
  { code: "D", labelKey: "hr.capMatrix.domainD", field: "dScore" as const },
  { code: "C", labelKey: "hr.capMatrix.domainC", field: "cScore" as const },
  { code: "K", labelKey: "hr.capMatrix.domainK", field: "kScore" as const },
  { code: "L", labelKey: "hr.capMatrix.domainL", field: "lScore" as const },
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

// ── DB field mapping ──

const FIELD_MAP: Record<string, string> = {
  tScore: "t_score", sScore: "s_score", dScore: "d_score",
  cScore: "c_score", kScore: "k_score", lScore: "l_score",
};

// ── Editable Score Cell ──

function EditableScoreCell({ row, field, onSaved }: { row: Assessment; field: ScoreField; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const mutation = trpc.competency.updateScore.useMutation({ onSuccess: () => { setEditing(false); onSaved(); } });

  const start = useCallback(() => {
    setVal(row[field] || "");
    setEditing(true);
  }, [row, field]);

  const save = useCallback(() => {
    if (!val.trim()) return;
    mutation.mutate({ employeeId: row.employeeId, field: FIELD_MAP[field] as any, value: val.trim() });
  }, [val, row.employeeId, field, mutation]);

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-center">
        <input
          autoFocus
          type="number" min={0} max={100} step={1}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="w-14 h-7 text-center text-xs border border-[#0078d4] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
        />
        <button onClick={save} className="text-[#107c10] hover:text-[#0b6a0b]"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setEditing(false)} className="text-[#a19f9d] hover:text-[#605e5c]"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <span className="group cursor-pointer inline-flex items-center gap-1" onClick={start}>
      {scoreBadge(row[field])}
      <Pencil className="w-3 h-3 text-[#c8c6c4] opacity-0 group-hover:opacity-100 transition-opacity" />
    </span>
  );
}

// ── Main Component ──

export default function CapabilityMatrixBoard() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showPending, setShowPending] = useState(false);

  const assessmentsQuery = trpc.competency.getAssessments.useQuery(
    {
      ...(deptFilter !== "all" ? { department: deptFilter } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }
  );

  const departmentsQuery = trpc.competency.getDepartments.useQuery();

  const allItems: Assessment[] = assessmentsQuery.data?.items ?? [];
  const items = showPending
    ? allItems.filter(r => !r.tScore && !r.sScore && !r.dScore && !r.cScore && !r.kScore && !r.lScore)
    : allItems;
  const total = items.length;
  const pendingCount = allItems.filter(r => !r.tScore && !r.sScore && !r.dScore && !r.cScore && !r.kScore && !r.lScore).length;
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
              {t("hr.capMatrix.subtitle")}
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
                <option value="all">{t("hr.capMatrix.allDepartments")}</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Pending filter */}
            <button
              onClick={() => setShowPending(v => !v)}
              className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded border transition-colors ${
                showPending
                  ? "bg-[#fff4ce] border-[#d83b01] text-[#d83b01]"
                  : "bg-white border-[#8a8886] text-[#605e5c] hover:bg-[#f3f2f1]"
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              待评估 ({pendingCount})
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#605e5c]" />
              <Input
                placeholder={t("hr.capMatrix.searchPlaceholder")}
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
                  {t("hr.capMatrix.colName")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider min-w-[100px]">
                  {t("hr.capMatrix.colDept")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider min-w-[90px]">
                  {t("hr.capMatrix.colPosition")}
                </th>
                {DOMAINS.map((d) => (
                  <th
                    key={d.code}
                    className="text-center px-3 py-3 text-xs font-semibold text-[#605e5c] uppercase tracking-wider min-w-[90px]"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[#0078d4] font-bold">{d.code}</span>
                      <span className="text-[10px] font-normal text-[#a19f9d] normal-case">
                        {t(d.labelKey)}
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
                        {t("hr.capMatrix.noData")}
                      </p>
                      <p className="text-xs text-[#a19f9d]">
                        {t("hr.capMatrix.noDataHint")}
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
                        <EditableScoreCell row={row} field={d.field} onSaved={() => assessmentsQuery.refetch()} />
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
            <span>{t("hr.capMatrix.employees")}</span>
          </div>

          <div className="h-3 w-px bg-[#edebe9]" />

          <span className="text-[#a19f9d]">{t("hr.capMatrix.avgScore")}</span>
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
