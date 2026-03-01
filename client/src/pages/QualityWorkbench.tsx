/**
 * M9-M10 Quality 8D Problem Solving + CAPA Management Workbench
 * Microsoft Fluent Design — strict adherence
 * 4 tabs: 8D Reports | 8D Detail | CAPA Tracker | Dashboard
 */
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Shield, Plus, AlertTriangle, CheckCircle2, XCircle,
  ChevronRight, ClipboardList, FileSearch, Target,
  ArrowRight, Clock, Users, Bug, Lightbulb, Search,
  BarChart3, TrendingUp, X, ChevronDown, Loader2,
  Ruler, FlaskConical, Eye, Hash, Trash2,
} from "lucide-react";
import QueryErrorBanner from "@/components/QueryErrorBanner";

// ─── Constants ────────────────────────────────────────────────
const D_STEPS = ["open", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "closed", "verified"] as const;
type DStep = (typeof D_STEPS)[number];

const D_LABEL_KEYS: Record<string, string> = {
  open: "quality.eightDCapa.dInitiation", D1: "quality.eightDCapa.dTeam", D2: "quality.eightDCapa.dDescription", D3: "quality.eightDCapa.dContainment", D4: "quality.eightDCapa.dRootCause",
  D5: "quality.eightDCapa.dCorrective", D6: "quality.eightDCapa.dVerification", D7: "quality.eightDCapa.dPrevention", D8: "quality.eightDCapa.dSummary", closed: "quality.eightDCapa.dClosed", verified: "quality.eightDCapa.dVerified",
};

const SEVERITY_KEYS: Record<string, { key: string; bg: string }> = {
  critical: { key: "quality.eightDCapa.severityCritical", bg: "bg-[#fed9cc] text-[#d83b01]" },
  high:     { key: "quality.eightDCapa.severityHigh",     bg: "bg-[#fff4ce] text-[#797673]" },
  medium:   { key: "quality.eightDCapa.severityMedium",   bg: "bg-[#deecf9] text-[#0078d4]" },
  low:      { key: "quality.eightDCapa.severityLow",      bg: "bg-[#f3f2f1] text-[#605e5c]" },
};

const CAPA_STATUS_KEYS: Record<string, { key: string; bg: string }> = {
  open:           { key: "quality.eightDCapa.capaPending",       bg: "bg-[#f3f2f1] text-[#605e5c]" },
  investigation:  { key: "quality.eightDCapa.capaInvestigating", bg: "bg-[#deecf9] text-[#0078d4]" },
  action_planned: { key: "quality.eightDCapa.capaPlanned",       bg: "bg-[#fff4ce] text-[#797673]" },
  implemented:    { key: "quality.eightDCapa.capaImplemented",   bg: "bg-[#fed9cc] text-[#d83b01]" },
  verified:       { key: "quality.eightDCapa.capaVerified",      bg: "bg-[#dff6dd] text-[#107c10]" },
  closed:         { key: "quality.eightDCapa.capaClosed",        bg: "bg-[#c8e6c9] text-[#0b6a0b]" },
};

const CAPA_STATUS_ORDER = ["open", "investigation", "action_planned", "implemented", "verified", "closed"] as const;

const ANALYSIS_METHOD_KEYS = [
  { value: "5why", key: "5-Why" },
  { value: "fishbone", key: "quality.workbench.fishbone" },
  { value: "fault_tree", key: "quality.workbench.faultTree" },
];

// ─── Helpers ──────────────────────────────────────────────────
function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try { return new Date(d).toISOString().slice(0, 10); } catch { return "-"; }
}

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
}

function stepIndex(step: string): number {
  return D_STEPS.indexOf(step as DStep);
}

function analysisMethodLabel(t: (k: string) => string, key: string): string {
  return key.startsWith("quality.") ? t(key) : key;
}

// ─── Skeleton Loading ─────────────────────────────────────────
function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-[#f3f2f1] animate-pulse rounded" />
      ))}
    </div>
  );
}

// ─── Modal Overlay ────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${wide ? "max-w-[95vw] md:max-w-[720px]" : "max-w-[95vw] md:max-w-[540px]"} max-h-[85vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#edebe9]">
          <h3 className="text-base font-semibold text-[#323130]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#f3f2f1] text-[#605e5c] min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="px-4 sm:px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Inline Select ────────────────────────────────────────────
function InlineSelect({ value, onChange, options, placeholder, className }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; className?: string;
}) {
  return (
    <div className={`relative ${className || ""}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 pr-8 bg-white border border-[#8a8886] rounded-md text-sm text-[#323130] appearance-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#605e5c] pointer-events-none" />
    </div>
  );
}

// ─── Step Progress Bar (horizontal 11-node) ───────────────────
function StepProgressBar({ currentStep }: { currentStep: string }) {
  const { t } = useLanguage();
  const idx = stepIndex(currentStep);
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide pb-1">
      {D_STEPS.map((step, i) => {
        const isActive = i === idx;
        const isCompleted = i < idx;
        const bg = isActive ? "bg-[#0078d4] text-white" : isCompleted ? "bg-[#107c10] text-white" : "bg-[#f3f2f1] text-[#a19f9d]";
        return (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-full text-[10px] font-semibold ${bg}`}>
              {t(D_LABEL_KEYS[step])}
            </div>
            {i < D_STEPS.length - 1 && (
              <div className={`w-3 h-0.5 ${i < idx ? "bg-[#107c10]" : "bg-[#edebe9]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Vertical Timeline ────────────────────────────────────────
function VerticalTimeline({ currentStep, onClickStep }: { currentStep: string; onClickStep: (step: DStep) => void }) {
  const { t } = useLanguage();
  const idx = stepIndex(currentStep);
  return (
    <div className="space-y-0">
      {D_STEPS.map((step, i) => {
        const isActive = i === idx;
        const isCompleted = i < idx;
        const dotColor = isActive ? "bg-[#0078d4] ring-2 ring-[#0078d4]/30" : isCompleted ? "bg-[#107c10]" : "bg-[#c8c6c4]";
        const textColor = isActive ? "text-[#0078d4] font-semibold" : isCompleted ? "text-[#107c10]" : "text-[#a19f9d]";
        return (
          <div key={step} className="flex items-start">
            <div className="flex flex-col items-center mr-3">
              <button
                onClick={() => onClickStep(step)}
                className={`w-5 h-5 rounded-full ${dotColor} flex items-center justify-center shrink-0`}
              >
                {isCompleted && <CheckCircle2 size={12} className="text-white" />}
              </button>
              {i < D_STEPS.length - 1 && (
                <div className={`w-0.5 h-6 ${isCompleted ? "bg-[#107c10]" : "bg-[#edebe9]"}`} />
              )}
            </div>
            <button
              onClick={() => onClickStep(step)}
              className={`text-sm ${textColor} pb-4 text-left hover:underline`}
            >
              {step}: {t(D_LABEL_KEYS[step])}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 1: 8D Reports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ReportsTab({ onSelectReport }: { onSelectReport: (id: number) => void }) {
  const { t } = useLanguage();
  const [severity, setSeverity] = useState("");
  const [step, setStep] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const statsQ = trpc.eightDCapa.getStats.useQuery();
  const listQ = trpc.eightDCapa.list8D.useQuery({
    severity: severity || undefined,
    currentStep: step || undefined,
  });
  const createMut = trpc.eightDCapa.create8D.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setShowCreate(false);
      listQ.refetch();
      statsQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Create form state
  const [cf, setCf] = useState({
    title: "", problemDescription: "", severity: "medium", source: "",
    customerName: "", partNumber: "", defectQuantity: 0, dueDate: "",
  });

  const stats = statsQ.data;
  const items = listQ.data?.items ?? [];
  const filtered = search
    ? items.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.reportCode.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-4">
      <QueryErrorBanner error={statsQ.error || listQ.error} onRetry={() => { statsQ.refetch(); listQ.refetch(); }} />
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("quality.eightDCapa.total8D"), value: stats?.eightD.total ?? "-", icon: ClipboardList, color: "text-[#0078d4]" },
          { label: t("quality.eightDCapa.inProgress"), value: stats?.eightD.open ?? "-", icon: Clock, color: "text-[#d83b01]" },
          { label: t("quality.eightDCapa.closed"), value: stats?.eightD.closed ?? "-", icon: CheckCircle2, color: "text-[#107c10]" },
          { label: t("quality.eightDCapa.critical"), value: stats?.eightD.bySeverity?.critical ?? "-", icon: AlertTriangle, color: "text-[#d83b01]" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon size={16} className={c.color} />
              <span className="text-xs text-[#605e5c]">{c.label}</span>
            </div>
            <div className="text-2xl font-bold text-[#323130]">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <InlineSelect
          value={severity} onChange={setSeverity} className="w-36"
          placeholder={t("quality.eightDCapa.severityLevel")}
          options={[
            { value: "critical", label: t("quality.eightDCapa.severityCritical") },
            { value: "high", label: t("quality.eightDCapa.severityHigh") },
            { value: "medium", label: t("quality.eightDCapa.severityMedium") },
            { value: "low", label: t("quality.eightDCapa.severityLow") },
          ]}
        />
        <InlineSelect
          value={step} onChange={setStep} className="w-40"
          placeholder={t("quality.workbench.stepFilter")}
          options={D_STEPS.map((s) => ({ value: s, label: `${s} - ${t(D_LABEL_KEYS[s])}` }))}
        />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a19f9d]" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("quality.common.search") + "..."}
            className="w-full h-9 pl-9 pr-3 bg-white border border-[#8a8886] rounded-md text-sm text-[#323130] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md flex items-center gap-1.5"
        >
          <Plus size={14} /> {t("quality.eightDCapa.new8D")}
        </button>
      </div>

      {/* Data Table */}
      {listQ.isLoading ? <SkeletonRows rows={6} /> : (
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-[#f3f2f1]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">Report Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.eightDCapa.reportTitle")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.eightDCapa.severityLevel")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.workbench.currentStep")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.eightDCapa.source")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.eightDCapa.targetCloseDate")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#a19f9d]">{t("quality.eightDCapa.no8D")}</td></tr>
              ) : filtered.map((r) => {
                const sev = SEVERITY_KEYS[r.severity ?? "medium"];
                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReport(r.id)}
                    className="border-t border-[#edebe9] cursor-pointer hover:bg-[#f3f2f1]/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#0078d4]">{r.reportCode}</td>
                    <td className="px-4 py-3 text-[#323130] font-medium max-w-[260px] truncate">{r.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sev.bg}`}>{t(sev.key)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StepProgressBar currentStep={r.currentStep} />
                    </td>
                    <td className="px-4 py-3 text-[#605e5c] text-xs">{r.source || "-"}</td>
                    <td className="px-4 py-3 text-[#605e5c] text-xs">{fmtDate(r.dueDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create 8D Dialog */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("quality.workbench.new8DDialog")} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.reportTitle")} *</label>
            <input
              type="text" value={cf.title} onChange={(e) => setCf({ ...cf, title: e.target.value })}
              className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.problemDesc")}</label>
            <textarea
              value={cf.problemDescription} onChange={(e) => setCf({ ...cf, problemDescription: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.severityLevel")}</label>
              <InlineSelect value={cf.severity} onChange={(v) => setCf({ ...cf, severity: v })}
                options={[
                  { value: "critical", label: t("quality.eightDCapa.severityCritical") },
                  { value: "high", label: t("quality.eightDCapa.severityHigh") },
                  { value: "medium", label: t("quality.eightDCapa.severityMedium") },
                  { value: "low", label: t("quality.eightDCapa.severityLow") },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.source")}</label>
              <input
                type="text" value={cf.source} onChange={(e) => setCf({ ...cf, source: e.target.value })}
                placeholder="customer_complaint / internal_audit / ..."
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.customerName")}</label>
              <input
                type="text" value={cf.customerName} onChange={(e) => setCf({ ...cf, customerName: e.target.value })}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.partNumber")}</label>
              <input
                type="text" value={cf.partNumber} onChange={(e) => setCf({ ...cf, partNumber: e.target.value })}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.workbench.defectQuantity")}</label>
              <input
                type="number" value={cf.defectQuantity || ""} onChange={(e) => setCf({ ...cf, defectQuantity: parseInt(e.target.value) || 0 })}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.targetCloseDate")}</label>
              <input
                type="date" value={cf.dueDate} onChange={(e) => setCf({ ...cf, dueDate: e.target.value })}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#edebe9]">
            <button onClick={() => setShowCreate(false)}
              className="h-9 px-4 text-sm text-[#323130] border border-[#8a8886] rounded-md hover:bg-[#f3f2f1]">
              {t("quality.common.cancel")}
            </button>
            <button
              disabled={!cf.title || createMut.isPending}
              onClick={() => createMut.mutate({
                title: cf.title,
                problemDescription: cf.problemDescription || undefined,
                severity: cf.severity as "critical" | "high" | "medium" | "low",
                source: cf.source || undefined,
                customerName: cf.customerName || undefined,
                partNumber: cf.partNumber || undefined,
                defectQuantity: cf.defectQuantity || undefined,
                dueDate: cf.dueDate || undefined,
              })}
              className="h-9 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("quality.common.create")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 2: 8D Detail
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DetailTab({ reportId, onBack }: { reportId: number; onBack: () => void }) {
  const { t } = useLanguage();
  const detailQ = trpc.eightDCapa.get8D.useQuery({ id: reportId });
  const updateMut = trpc.eightDCapa.update8DStep.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      detailQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [focusedStep, setFocusedStep] = useState<DStep | null>(null);

  // Step-specific form state
  const [d2Desc, setD2Desc] = useState("");
  const [d3Actions, setD3Actions] = useState("");
  const [d4Causes, setD4Causes] = useState("");
  const [d4Method, setD4Method] = useState("");
  const [d5Actions, setD5Actions] = useState("");
  const [d6Result, setD6Result] = useState("");
  const [d7Actions, setD7Actions] = useState("");
  const [d8Lessons, setD8Lessons] = useState("");

  const report = detailQ.data;
  if (detailQ.isLoading) return <SkeletonRows rows={8} />;
  if (!report) {
    return (
      <div className="text-center py-16">
        <XCircle size={40} className="mx-auto text-[#a19f9d] mb-3" />
        <p className="text-[#605e5c]">{t("quality.workbench.reportNotFound")}</p>
        <button onClick={onBack} className="mt-3 text-sm text-[#0078d4] hover:underline">{t("quality.common.back")}</button>
      </div>
    );
  }

  const currentIdx = stepIndex(report.currentStep);
  const activeStep = focusedStep ?? (report.currentStep as DStep);
  const nextStep = currentIdx < D_STEPS.length - 1 ? D_STEPS[currentIdx + 1] : null;

  async function handleAdvance() {
    if (!nextStep) return;
    const payload: Record<string, unknown> = { id: reportId, currentStep: nextStep };

    // Also submit the step data if active step matches current step
    if (report?.currentStep === "D2" && d2Desc) payload.d2Description = d2Desc;
    if (report?.currentStep === "D3" && d3Actions) payload.d3ContainmentActions = d3Actions.split("\n").filter(Boolean);
    if (report?.currentStep === "D4") {
      if (d4Causes) payload.d4RootCauses = d4Causes.split("\n").filter(Boolean);
      if (d4Method) payload.d4AnalysisMethod = d4Method;
    }
    if (report?.currentStep === "D5" && d5Actions) payload.d5CorrectiveActions = d5Actions.split("\n").filter(Boolean);
    if (report?.currentStep === "D6" && d6Result) payload.d6VerificationResult = d6Result;
    if (report?.currentStep === "D7" && d7Actions) payload.d7PreventionActions = d7Actions.split("\n").filter(Boolean);
    if (report?.currentStep === "D8" && d8Lessons) payload.d8LessonsLearned = d8Lessons;

    try {
      await updateMut.mutateAsync(payload as Parameters<typeof updateMut.mutate>[0]);
    } catch (err) {
      console.error("Advance 8D step failed:", err);
    }
  }

  async function handleSaveStep() {
    const payload: Record<string, unknown> = { id: reportId };
    const s = activeStep;

    if (s === "D2" && d2Desc) payload.d2Description = d2Desc;
    if (s === "D3" && d3Actions) payload.d3ContainmentActions = d3Actions.split("\n").filter(Boolean);
    if (s === "D4") {
      if (d4Causes) payload.d4RootCauses = d4Causes.split("\n").filter(Boolean);
      if (d4Method) payload.d4AnalysisMethod = d4Method;
    }
    if (s === "D5" && d5Actions) payload.d5CorrectiveActions = d5Actions.split("\n").filter(Boolean);
    if (s === "D6" && d6Result) payload.d6VerificationResult = d6Result;
    if (s === "D7" && d7Actions) payload.d7PreventionActions = d7Actions.split("\n").filter(Boolean);
    if (s === "D8" && d8Lessons) payload.d8LessonsLearned = d8Lessons;

    if (Object.keys(payload).length > 1) {
      try {
        await updateMut.mutateAsync(payload as Parameters<typeof updateMut.mutate>[0]);
      } catch (err) {
        console.error("Save 8D step failed:", err);
      }
    }
  }

  function renderStepData(step: DStep) {
    switch (step) {
      case "D2":
        return report.d2Description ? (
          <div className="text-sm text-[#323130] space-y-1">
            <div><span className="font-medium text-[#605e5c]">Description:</span> {report.d2Description}</div>
            {report.d2IsWhat && <div><span className="font-medium text-[#605e5c]">Is:</span> {report.d2IsWhat}</div>}
            {report.d2IsNotWhat && <div><span className="font-medium text-[#605e5c]">Is Not:</span> {report.d2IsNotWhat}</div>}
          </div>
        ) : null;
      case "D3": {
        const acts = parseJsonArray(report.d3ContainmentActions);
        return acts.length > 0 ? (
          <ul className="list-disc list-inside text-sm text-[#323130] space-y-0.5">
            {acts.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        ) : null;
      }
      case "D4": {
        const causes = parseJsonArray(report.d4RootCauses);
        return (
          <div className="text-sm text-[#323130] space-y-1">
            {report.d4AnalysisMethod && <div><span className="font-medium text-[#605e5c]">Method:</span> {report.d4AnalysisMethod}</div>}
            {causes.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5">
                {causes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
          </div>
        );
      }
      case "D5": {
        const acts = parseJsonArray(report.d5CorrectiveActions);
        return acts.length > 0 ? (
          <ul className="list-disc list-inside text-sm text-[#323130] space-y-0.5">
            {acts.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        ) : null;
      }
      case "D6":
        return report.d6VerificationResult ? (
          <div className="text-sm text-[#323130]">{report.d6VerificationResult}</div>
        ) : null;
      case "D7": {
        const acts = parseJsonArray(report.d7PreventionActions);
        return acts.length > 0 ? (
          <ul className="list-disc list-inside text-sm text-[#323130] space-y-0.5">
            {acts.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        ) : null;
      }
      case "D8":
        return report.d8LessonsLearned ? (
          <div className="text-sm text-[#323130]">{report.d8LessonsLearned}</div>
        ) : null;
      default:
        return null;
    }
  }

  function renderActiveStepForm() {
    const isEditable = stepIndex(activeStep) <= currentIdx || activeStep === report.currentStep;
    if (!isEditable && activeStep !== report.currentStep) return null;

    switch (activeStep) {
      case "D2":
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#323130]">{t("quality.eightDCapa.problemDesc")} (Is / Is Not Analysis)</label>
            <textarea value={d2Desc} onChange={(e) => setD2Desc(e.target.value)} rows={4} placeholder="Detailed problem description..."
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
        );
      case "D3":
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#323130]">{t("quality.workbench.containmentActions")}</label>
            <textarea value={d3Actions} onChange={(e) => setD3Actions(e.target.value)} rows={4} placeholder="Action 1&#10;Action 2..."
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
        );
      case "D4":
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#323130]">{t("quality.workbench.rootCauses")}</label>
            <textarea value={d4Causes} onChange={(e) => setD4Causes(e.target.value)} rows={3} placeholder="Root cause 1&#10;Root cause 2..."
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            <label className="block text-sm font-medium text-[#323130]">{t("quality.workbench.analysisMethod")}</label>
            <InlineSelect value={d4Method} onChange={setD4Method} placeholder={t("quality.workbench.selectMethod")}
              options={ANALYSIS_METHOD_KEYS.map((m) => ({ value: m.value, label: analysisMethodLabel(t, m.key) }))} />
          </div>
        );
      case "D5":
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#323130]">{t("quality.workbench.correctiveActions")}</label>
            <textarea value={d5Actions} onChange={(e) => setD5Actions(e.target.value)} rows={4} placeholder="Action 1&#10;Action 2..."
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
        );
      case "D6":
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#323130]">{t("quality.workbench.verificationResult")}</label>
            <textarea value={d6Result} onChange={(e) => setD6Result(e.target.value)} rows={4} placeholder="Describe verification outcome..."
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
        );
      case "D7":
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#323130]">{t("quality.workbench.preventionActions")}</label>
            <textarea value={d7Actions} onChange={(e) => setD7Actions(e.target.value)} rows={4} placeholder="Prevention 1&#10;Prevention 2..."
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
        );
      case "D8":
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#323130]">{t("quality.workbench.lessonsLearned")}</label>
            <textarea value={d8Lessons} onChange={(e) => setD8Lessons(e.target.value)} rows={4} placeholder="Key lessons and team recognition..."
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
        );
      default:
        return null;
    }
  }

  const sev = SEVERITY_KEYS[report.severity ?? "medium"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-[#0078d4] hover:underline flex items-center gap-1">
          <ChevronRight size={14} className="rotate-180" /> {t("quality.common.back")}
        </button>
        <span className="text-xs text-[#a19f9d]">|</span>
        <span className="font-mono text-sm text-[#0078d4]">{report.reportCode}</span>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sev.bg}`}>{t(sev.key)}</span>
      </div>

      <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-5">
        <h2 className="text-lg font-semibold text-[#323130] mb-1">{report.title}</h2>
        {report.problemDescription && <p className="text-sm text-[#605e5c] mb-3">{report.problemDescription}</p>}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#605e5c] mb-4">
          {report.customerName && <span>{t("quality.eightDCapa.customerLabel")} {report.customerName}</span>}
          {report.partNumber && <span>{t("quality.eightDCapa.partLabel")} {report.partNumber}</span>}
          {report.defectQuantity != null && <span>Qty: {report.defectQuantity}</span>}
          <span>{t("quality.eightDCapa.targetCloseDate")}: {fmtDate(report.dueDate)}</span>
          <span>{t("quality.eightDCapa.source")}: {report.source || "-"}</span>
        </div>
        <StepProgressBar currentStep={report.currentStep} />
      </div>

      {/* Main content: timeline + form */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* Vertical Timeline */}
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-4">
          <VerticalTimeline currentStep={report.currentStep} onClickStep={(s) => setFocusedStep(s)} />
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-5 space-y-4">
          <h3 className="text-base font-semibold text-[#323130]">
            {activeStep}: {t(D_LABEL_KEYS[activeStep])}
          </h3>

          {/* Show existing data for this step */}
          {renderStepData(activeStep)}

          {/* Show form if this is the current active step */}
          {activeStep === report.currentStep && renderActiveStepForm()}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#edebe9]">
            {activeStep === report.currentStep && (
              <>
                <button onClick={handleSaveStep} disabled={updateMut.isPending}
                  className="h-9 px-4 text-sm text-[#323130] border border-[#8a8886] rounded-md hover:bg-[#f3f2f1] flex items-center gap-1.5 disabled:opacity-50">
                  {updateMut.isPending && <Loader2 size={14} className="animate-spin" />}
                  {t("quality.workbench.saveStepData")}
                </button>
                {nextStep && (
                  <button onClick={handleAdvance} disabled={updateMut.isPending}
                    className="h-9 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50">
                    {updateMut.isPending && <Loader2 size={14} className="animate-spin" />}
                    <ArrowRight size={14} /> {t("quality.workbench.advanceNext")} ({nextStep})
                  </button>
                )}
              </>
            )}
          </div>

          {/* Linked CAPAs */}
          {report.capas && report.capas.length > 0 && (
            <div className="pt-3 border-t border-[#edebe9]">
              <h4 className="text-sm font-semibold text-[#605e5c] mb-2">{t("quality.workbench.linkedCapas")}</h4>
              <div className="space-y-2">
                {report.capas.map((c) => {
                  const st = CAPA_STATUS_KEYS[c.status ?? "open"];
                  return (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-[#faf9f8] rounded border border-[#edebe9]">
                      <div>
                        <span className="font-mono text-xs text-[#0078d4] mr-2">{c.capaCode}</span>
                        <span className="text-sm text-[#323130]">{c.title}</span>
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.bg}`}>{t(st.key)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 3: CAPA Tracker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CapaTab() {
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCapa, setSelectedCapa] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [verificationResult, setVerificationResult] = useState("");
  const [effectivenessCheck, setEffectivenessCheck] = useState("");

  const listQ = trpc.eightDCapa.listCAPA.useQuery({
    capaType: (typeFilter as "corrective" | "preventive") || undefined,
    status: statusFilter || undefined,
  });
  const createMut = trpc.eightDCapa.createCAPA.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setShowCreate(false);
      listQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const updateMut = trpc.eightDCapa.updateCAPA.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setSelectedCapa(null);
      listQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [cf, setCf] = useState({
    capaType: "corrective" as "corrective" | "preventive",
    title: "", description: "", rootCause: "", actionPlan: "",
    responsibleName: "", targetDate: "",
  });

  const items = listQ.data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <InlineSelect
          value={typeFilter} onChange={setTypeFilter} className="w-40"
          placeholder={t("quality.workbench.allTypes")}
          options={[
            { value: "corrective", label: t("quality.eightDCapa.typeCorrective") },
            { value: "preventive", label: t("quality.eightDCapa.typePreventive") },
          ]}
        />
        <InlineSelect
          value={statusFilter} onChange={setStatusFilter} className="w-44"
          placeholder={t("quality.workbench.allStatuses")}
          options={CAPA_STATUS_ORDER.map((s) => ({ value: s, label: t(CAPA_STATUS_KEYS[s].key) }))}
        />
        <div className="flex-1" />
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md flex items-center gap-1.5"
        >
          <Plus size={14} /> {t("quality.eightDCapa.newCAPA")}
        </button>
      </div>

      {/* Table */}
      {listQ.isLoading ? <SkeletonRows rows={6} /> : (
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-[#f3f2f1]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">CAPA Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.eightDCapa.reportTitle")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.eightDCapa.capaType")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.common.status")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.eightDCapa.capaResponsible")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.eightDCapa.capaTargetDate")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#a19f9d]">{t("quality.eightDCapa.noCAPA")}</td></tr>
              ) : items.map((c) => {
                const st = CAPA_STATUS_KEYS[c.status ?? "open"];
                const typeBg = c.capaType === "corrective" ? "bg-[#deecf9] text-[#0078d4]" : "bg-[#dff6dd] text-[#107c10]";
                const typeLabel = c.capaType === "corrective" ? t("quality.eightDCapa.typeCorrectiveShort") : t("quality.eightDCapa.typePreventiveShort");
                return (
                  <tr
                    key={c.id}
                    onClick={() => { setSelectedCapa(c.id); setNewStatus(c.status ?? "open"); }}
                    className="border-t border-[#edebe9] cursor-pointer hover:bg-[#f3f2f1]/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#0078d4]">{c.capaCode}</td>
                    <td className="px-4 py-3 text-[#323130] font-medium max-w-[240px] truncate">{c.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeBg}`}>{typeLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.bg}`}>{t(st.key)}</span>
                    </td>
                    <td className="px-4 py-3 text-[#605e5c] text-xs">{c.responsibleName || "-"}</td>
                    <td className="px-4 py-3 text-[#605e5c] text-xs">{fmtDate(c.targetDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create CAPA Dialog */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("quality.workbench.newCapaDialog")} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.capaType")} *</label>
            <InlineSelect value={cf.capaType} onChange={(v) => setCf({ ...cf, capaType: v as "corrective" | "preventive" })}
              options={[
                { value: "corrective", label: t("quality.eightDCapa.typeCorrective") },
                { value: "preventive", label: t("quality.eightDCapa.typePreventive") },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.reportTitle")} *</label>
            <input type="text" value={cf.title} onChange={(e) => setCf({ ...cf, title: e.target.value })}
              className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.capaDesc")}</label>
            <textarea value={cf.description} onChange={(e) => setCf({ ...cf, description: e.target.value })} rows={2}
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.rootCause")}</label>
            <textarea value={cf.rootCause} onChange={(e) => setCf({ ...cf, rootCause: e.target.value })} rows={2}
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.workbench.actionPlan")}</label>
            <textarea value={cf.actionPlan} onChange={(e) => setCf({ ...cf, actionPlan: e.target.value })} rows={3}
              className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.capaResponsible")}</label>
              <input type="text" value={cf.responsibleName} onChange={(e) => setCf({ ...cf, responsibleName: e.target.value })}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.eightDCapa.capaTargetDate")}</label>
              <input type="date" value={cf.targetDate} onChange={(e) => setCf({ ...cf, targetDate: e.target.value })}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#edebe9]">
            <button onClick={() => setShowCreate(false)}
              className="h-9 px-4 text-sm text-[#323130] border border-[#8a8886] rounded-md hover:bg-[#f3f2f1]">{t("quality.common.cancel")}</button>
            <button
              disabled={!cf.title || createMut.isPending}
              onClick={() => createMut.mutate({
                capaType: cf.capaType,
                title: cf.title,
                description: cf.description || undefined,
                rootCause: cf.rootCause || undefined,
                actionPlan: cf.actionPlan ? cf.actionPlan.split("\n").filter(Boolean) : undefined,
                responsibleName: cf.responsibleName || undefined,
                targetDate: cf.targetDate || undefined,
              })}
              className="h-9 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("quality.common.create")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Update Status Dialog */}
      <Modal open={selectedCapa !== null} onClose={() => setSelectedCapa(null)} title={t("quality.workbench.updateCapaStatus")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.workbench.newStatus")}</label>
            <InlineSelect value={newStatus} onChange={setNewStatus}
              options={CAPA_STATUS_ORDER.map((s) => ({ value: s, label: t(CAPA_STATUS_KEYS[s].key) }))}
            />
          </div>
          {(newStatus === "verified" || newStatus === "closed") && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.workbench.verificationResult")}</label>
                <textarea value={verificationResult} onChange={(e) => setVerificationResult(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.workbench.effectivenessCheck")}</label>
                <textarea value={effectivenessCheck} onChange={(e) => setEffectivenessCheck(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-sm resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-[#edebe9]">
            <button onClick={() => setSelectedCapa(null)}
              className="h-9 px-4 text-sm text-[#323130] border border-[#8a8886] rounded-md hover:bg-[#f3f2f1]">{t("quality.common.cancel")}</button>
            <button
              disabled={updateMut.isPending}
              onClick={() => {
                if (selectedCapa === null) return;
                updateMut.mutate({
                  id: selectedCapa,
                  status: newStatus as "open" | "investigation" | "action_planned" | "implemented" | "verified" | "closed",
                  verificationResult: verificationResult || undefined,
                  effectivenessCheck: effectivenessCheck || undefined,
                });
              }}
              className="h-9 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {updateMut.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("quality.workbench.update")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 4: Dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DashboardTab() {
  const { t } = useLanguage();
  const statsQ = trpc.eightDCapa.getStats.useQuery();
  const capaListQ = trpc.eightDCapa.listCAPA.useQuery({});

  if (statsQ.isLoading) return <SkeletonRows rows={6} />;
  if (statsQ.error || capaListQ.error) return <QueryErrorBanner error={statsQ.error || capaListQ.error} onRetry={() => { statsQ.refetch(); capaListQ.refetch(); }} />;
  const stats = statsQ.data;
  if (!stats) return <p className="text-[#a19f9d] text-center py-12">{t("quality.common.noData")}</p>;

  const sevData = stats.eightD.bySeverity;
  const maxSev = Math.max(sevData.critical, sevData.high, sevData.medium, sevData.low, 1);

  // Count CAPAs by status
  const capaItems = capaListQ.data?.items ?? [];
  const capaPipeline: Record<string, number> = {};
  for (const s of CAPA_STATUS_ORDER) capaPipeline[s] = 0;
  for (const c of capaItems) {
    const st = c.status ?? "open";
    if (st in capaPipeline) capaPipeline[st]++;
  }
  const maxPipeline = Math.max(...Object.values(capaPipeline), 1);

  return (
    <div className="space-y-6">
      {/* 6 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: t("quality.eightDCapa.total8D"), value: stats.eightD.total, icon: ClipboardList, color: "text-[#0078d4]" },
          { label: t("quality.eightDCapa.inProgress"), value: stats.eightD.open, icon: Clock, color: "text-[#d83b01]" },
          { label: t("quality.eightDCapa.closed"), value: stats.eightD.closed, icon: CheckCircle2, color: "text-[#107c10]" },
          { label: t("quality.eightDCapa.totalCAPA"), value: stats.capa.total, icon: Target, color: "text-[#0078d4]" },
          { label: t("quality.eightDCapa.corrective"), value: stats.capa.corrective, icon: Bug, color: "text-[#d83b01]" },
          { label: t("quality.eightDCapa.preventive"), value: stats.capa.preventive, icon: Shield, color: "text-[#107c10]" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon size={16} className={c.color} />
              <span className="text-xs text-[#605e5c]">{c.label}</span>
            </div>
            <div className="text-2xl font-bold text-[#323130]">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution */}
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#323130] mb-4">{t("quality.workbench.sevDistribution")}</h3>
          <div className="space-y-3">
            {(["critical", "high", "medium", "low"] as const).map((sev) => {
              const count = sevData[sev];
              const pct = maxSev > 0 ? (count / maxSev) * 100 : 0;
              const sevStyle = SEVERITY_KEYS[sev];
              return (
                <div key={sev} className="flex items-center gap-3">
                  <span className={`w-16 text-xs font-medium px-2 py-0.5 rounded ${sevStyle.bg}`}>{t(sevStyle.key)}</span>
                  <div className="flex-1 h-6 bg-[#f3f2f1] rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${
                        sev === "critical" ? "bg-[#d83b01]" :
                        sev === "high" ? "bg-[#ffaa44]" :
                        sev === "medium" ? "bg-[#0078d4]" : "bg-[#a19f9d]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-[#323130]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CAPA Pipeline */}
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#323130] mb-4">{t("quality.workbench.capaPipeline")}</h3>
          <div className="space-y-2">
            {CAPA_STATUS_ORDER.map((status, i) => {
              const count = capaPipeline[status];
              const pct = maxPipeline > 0 ? (count / maxPipeline) * 100 : 0;
              const stStyle = CAPA_STATUS_KEYS[status];
              const barColors = [
                "bg-[#a19f9d]", "bg-[#0078d4]", "bg-[#ffaa44]",
                "bg-[#d83b01]", "bg-[#107c10]", "bg-[#0b6a0b]",
              ];
              return (
                <div key={status}>
                  <div className="flex items-center gap-3">
                    <span className={`w-20 text-xs font-medium px-2 py-0.5 rounded ${stStyle.bg}`}>{t(stStyle.key)}</span>
                    <div className="flex-1 h-5 bg-[#f3f2f1] rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${barColors[i]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-semibold text-[#323130]">{count}</span>
                  </div>
                  {i < CAPA_STATUS_ORDER.length - 1 && (
                    <div className="flex items-center justify-center py-0.5">
                      <ChevronDown size={12} className="text-[#c8c6c4]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 5: MSA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const STUDY_TYPE_OPTIONS = [
  { value: "gage_rr", label: "Gage R&R" },
  { value: "bias", label: "Bias" },
  { value: "linearity", label: "Linearity" },
  { value: "stability", label: "Stability" },
  { value: "attribute_agreement", label: "Attribute Agreement" },
];

const STUDY_TYPE_LABELS: Record<string, string> = {
  gage_rr: "Gage R&R", bias: "Bias", linearity: "Linearity",
  stability: "Stability", attribute_agreement: "Attr. Agreement",
};

const MSA_STATUS_KEYS: Record<string, { key: string; bg: string }> = {
  planned:     { key: "quality.msa.statusPlanned",    bg: "bg-[#f3f2f1] text-[#605e5c]" },
  in_progress: { key: "quality.msa.statusInProgress", bg: "bg-[#deecf9] text-[#0078d4]" },
  completed:   { key: "quality.msa.statusCompleted",  bg: "bg-[#dff6dd] text-[#107c10]" },
  failed:      { key: "quality.msa.statusFailed",     bg: "bg-[#fed9cc] text-[#d83b01]" },
  archived:    { key: "quality.msa.statusArchived",   bg: "bg-[#f3f2f1] text-[#a19f9d]" },
};

const CONCLUSION_KEYS: Record<string, { key: string; bg: string; desc: string }> = {
  acceptable:   { key: "quality.msa.conclusionAcceptable",   bg: "bg-[#dff6dd] text-[#107c10]", desc: "%GR&R < 10%" },
  marginal:     { key: "quality.msa.conclusionMarginal",     bg: "bg-[#fff4ce] text-[#797673]", desc: "10% <= %GR&R < 30%" },
  unacceptable: { key: "quality.msa.conclusionUnacceptable", bg: "bg-[#fed9cc] text-[#d83b01]", desc: "%GR&R >= 30%" },
};

function MsaTab() {
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<number | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);

  // List + stats
  const listQ = trpc.msa.list.useQuery({
    studyType: (typeFilter as "gage_rr" | "bias" | "linearity" | "stability" | "attribute_agreement") || undefined,
  });
  const statsQ = trpc.msa.getStats.useQuery();

  // Create form
  const [cf, setCf] = useState({
    studyType: "gage_rr" as "gage_rr" | "bias" | "linearity" | "stability" | "attribute_agreement",
    gaugeName: "", gaugeId: "", gaugeResolution: "",
    partName: "", characteristicName: "", specification: "", tolerance: "",
    numOperators: 3, numParts: 10, numTrials: 3,
  });
  const createMut = trpc.msa.create.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setShowCreate(false);
      setCf({ ...cf, gaugeName: "", gaugeId: "", gaugeResolution: "", partName: "", characteristicName: "", specification: "", tolerance: "" });
      listQ.refetch();
      statsQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMut = trpc.msa.delete.useMutation({
    onSuccess: () => {
      toast.success(t("quality.workbench.msaDeleted"));
      listQ.refetch();
      statsQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const items = listQ.data?.items ?? [];
  const stats = statsQ.data;

  return (
    <div className="space-y-4">
      <QueryErrorBanner error={listQ.error || statsQ.error} onRetry={() => { listQ.refetch(); statsQ.refetch(); }} />
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t("quality.msa.totalStudies"), value: stats?.total ?? "-", icon: Ruler, color: "text-[#0078d4]" },
          { label: t("quality.msa.grrStudies"), value: stats?.byType.gage_rr ?? "-", icon: FlaskConical, color: "text-[#0078d4]" },
          { label: t("quality.msa.conclusionAcceptable"), value: stats?.byConclusion.acceptable ?? "-", icon: CheckCircle2, color: "text-[#107c10]" },
          { label: t("quality.msa.conclusionMarginal"), value: stats?.byConclusion.marginal ?? "-", icon: AlertTriangle, color: "text-[#797673]" },
          { label: t("quality.msa.conclusionUnacceptable"), value: stats?.byConclusion.unacceptable ?? "-", icon: XCircle, color: "text-[#d83b01]" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-lg border border-[#edebe9] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon size={16} className={c.color} />
              <span className="text-xs text-[#605e5c]">{c.label}</span>
            </div>
            <div className="text-2xl font-bold text-[#323130]">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter + Create */}
      <div className="flex flex-wrap items-center gap-3">
        <InlineSelect
          value={typeFilter} onChange={setTypeFilter} className="w-44"
          placeholder={t("quality.workbench.allStudyTypes")}
          options={STUDY_TYPE_OPTIONS}
        />
        <div className="flex-1" />
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md flex items-center gap-1.5"
        >
          <Plus size={14} /> {t("quality.msa.newStudy")}
        </button>
      </div>

      {/* Studies Table */}
      {listQ.isLoading ? <SkeletonRows rows={6} /> : (
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-[#f3f2f1]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">Study Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.msa.studyType")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.msa.gage")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.msa.characteristic")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.common.status")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">%GR&R</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.msa.conclusion")}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase">{t("quality.common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#a19f9d]">{t("quality.msa.noStudies")}</td></tr>
              ) : items.map((s) => {
                const st = MSA_STATUS_KEYS[s.status ?? "planned"];
                const concl = s.conclusion ? CONCLUSION_KEYS[s.conclusion] : null;
                return (
                  <tr key={s.id} className="border-t border-[#edebe9] hover:bg-[#f3f2f1]/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#0078d4]">{s.studyCode}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#deecf9] text-[#0078d4]">
                        {STUDY_TYPE_LABELS[s.studyType ?? "gage_rr"]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#323130] text-xs max-w-[160px] truncate">{s.gaugeName}</td>
                    <td className="px-4 py-3 text-[#605e5c] text-xs max-w-[140px] truncate">{s.characteristicName || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.bg}`}>{t(st.key)}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#323130]">
                      {s.grrPercent ? `${Number(s.grrPercent).toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {concl ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${concl.bg}`}>{t(concl.key)}</span>
                      ) : <span className="text-xs text-[#a19f9d]">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedStudy(s.id); setShowMeasurements(true); }}
                          className="p-1.5 rounded hover:bg-[#deecf9] text-[#0078d4]" title="Measurements"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm(t("quality.workbench.confirmDeleteMsa"))) deleteMut.mutate({ id: s.id }); }}
                          className="p-1.5 rounded hover:bg-[#fed9cc] text-[#d83b01]" title={t("quality.common.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create MSA Dialog */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("quality.workbench.newMsaDialog")} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.studyType")} *</label>
            <InlineSelect value={cf.studyType} onChange={(v) => setCf({ ...cf, studyType: v as typeof cf.studyType })}
              options={STUDY_TYPE_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.gageName")} *</label>
              <input type="text" value={cf.gaugeName} onChange={(e) => setCf({ ...cf, gaugeName: e.target.value })}
                placeholder="e.g. Mitutoyo Caliper 500-196"
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.gageId")}</label>
              <input type="text" value={cf.gaugeId} onChange={(e) => setCf({ ...cf, gaugeId: e.target.value })}
                placeholder="GG-001"
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.partName")}</label>
              <input type="text" value={cf.partName} onChange={(e) => setCf({ ...cf, partName: e.target.value })}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.characteristicName")}</label>
              <input type="text" value={cf.characteristicName} onChange={(e) => setCf({ ...cf, characteristicName: e.target.value })}
                placeholder="e.g. Outer Diameter"
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.specification")}</label>
              <input type="text" value={cf.specification} onChange={(e) => setCf({ ...cf, specification: e.target.value })}
                placeholder="25.00 +/- 0.05 mm"
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.tolerance")}</label>
              <input type="text" value={cf.tolerance} onChange={(e) => setCf({ ...cf, tolerance: e.target.value })}
                placeholder="0.10"
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.operators")}</label>
              <input type="number" value={cf.numOperators} onChange={(e) => setCf({ ...cf, numOperators: parseInt(e.target.value) || 3 })}
                min={1} max={10}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.parts")}</label>
              <input type="number" value={cf.numParts} onChange={(e) => setCf({ ...cf, numParts: parseInt(e.target.value) || 10 })}
                min={1} max={30}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">{t("quality.msa.trials")}</label>
              <input type="number" value={cf.numTrials} onChange={(e) => setCf({ ...cf, numTrials: parseInt(e.target.value) || 3 })}
                min={1} max={10}
                className="w-full h-9 px-3 border border-[#8a8886] rounded-md text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
            </div>
          </div>
          <p className="text-xs text-[#605e5c]">
            {t("quality.workbench.totalMeasurements")}: {cf.numOperators * cf.numParts * cf.numTrials}
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#edebe9]">
            <button onClick={() => setShowCreate(false)}
              className="h-9 px-4 text-sm text-[#323130] border border-[#8a8886] rounded-md hover:bg-[#f3f2f1]">{t("quality.common.cancel")}</button>
            <button
              disabled={!cf.gaugeName || createMut.isPending}
              onClick={() => createMut.mutate({
                studyType: cf.studyType,
                gaugeName: cf.gaugeName,
                gaugeId: cf.gaugeId || undefined,
                gaugeResolution: cf.gaugeResolution || undefined,
                partName: cf.partName || undefined,
                characteristicName: cf.characteristicName || undefined,
                specification: cf.specification || undefined,
                tolerance: cf.tolerance || undefined,
                numOperators: cf.numOperators,
                numParts: cf.numParts,
                numTrials: cf.numTrials,
              })}
              className="h-9 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("quality.common.create")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Measurement Detail / GR&R Calculation Dialog */}
      {selectedStudy !== null && (
        <MsaDetailModal studyId={selectedStudy} open={showMeasurements}
          onClose={() => { setShowMeasurements(false); setSelectedStudy(null); listQ.refetch(); statsQ.refetch(); }} />
      )}
    </div>
  );
}

// ─── MSA Detail Modal (measurements + GR&R calc) ──────────
function MsaDetailModal({ studyId, open, onClose }: { studyId: number; open: boolean; onClose: () => void }) {
  const { t, tpl } = useLanguage();
  const detailQ = trpc.msa.getById.useQuery({ id: studyId });
  const calcMut = trpc.msa.calculateGRR.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
        detailQ.refetch();
      } else {
        toast.error(res.message);
      }
    },
    onError: (err) => toast.error(err.message),
  });
  const addMut = trpc.msa.addMeasurement.useMutation({
    onSuccess: () => {
      detailQ.refetch();
      setMf({ operatorName: mf.operatorName, partNumber: mf.partNumber + 1, trialNumber: 1, measuredValue: "" });
    },
    onError: (err) => toast.error(err.message),
  });
  const batchMut = trpc.msa.addMeasurementsBatch.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      detailQ.refetch();
      setBatchText("");
    },
    onError: (err) => toast.error(err.message),
  });

  const [mf, setMf] = useState({ operatorName: "", partNumber: 1, trialNumber: 1, measuredValue: "" });
  const [batchText, setBatchText] = useState("");
  const [showBatch, setShowBatch] = useState(false);

  const study = detailQ.data;

  return (
    <Modal open={open} onClose={onClose} title={study ? `MSA: ${study.studyCode}` : t("quality.common.loading")} wide>
      {detailQ.isLoading ? <SkeletonRows rows={5} /> : !study ? (
        <p className="text-[#a19f9d] text-center py-8">{t("quality.workbench.studyNotFound")}</p>
      ) : (
        <div className="space-y-4">
          {/* Study Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-[#605e5c]">{t("quality.msa.studyType")}:</span> <span className="font-medium text-[#323130]">{STUDY_TYPE_LABELS[study.studyType ?? "gage_rr"]}</span></div>
            <div><span className="text-[#605e5c]">{t("quality.msa.gage")}:</span> <span className="font-medium text-[#323130]">{study.gaugeName}</span></div>
            <div><span className="text-[#605e5c]">{t("quality.msa.part")}:</span> <span className="font-medium text-[#323130]">{study.partName || "-"}</span></div>
            <div><span className="text-[#605e5c]">{t("quality.msa.specification")}:</span> <span className="font-medium text-[#323130]">{study.specification || "-"}</span></div>
            <div><span className="text-[#605e5c]">{t("quality.msa.operators")}:</span> <span className="font-medium text-[#323130]">{study.numOperators}</span></div>
            <div><span className="text-[#605e5c]">{t("quality.msa.parts")}:</span> <span className="font-medium text-[#323130]">{study.numParts}</span></div>
            <div><span className="text-[#605e5c]">{t("quality.msa.trials")}:</span> <span className="font-medium text-[#323130]">{study.numTrials}</span></div>
            <div>
              <span className="text-[#605e5c]">{t("quality.common.status")}:</span>{" "}
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${MSA_STATUS_KEYS[study.status ?? "planned"].bg}`}>
                {t(MSA_STATUS_KEYS[study.status ?? "planned"].key)}
              </span>
            </div>
          </div>

          {/* GR&R Results (if completed) */}
          {study.conclusion && (
            <div className="bg-[#faf9f8] rounded-lg border border-[#edebe9] p-4">
              <h4 className="text-sm font-semibold text-[#323130] mb-3">{t("quality.workbench.grrResults")}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-[#605e5c] block">{t("quality.msa.repeatability")} (EV)</span>
                  <span className="text-lg font-bold text-[#323130]">{Number(study.repeatability).toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-xs text-[#605e5c] block">{t("quality.msa.reproducibility")} (AV)</span>
                  <span className="text-lg font-bold text-[#323130]">{Number(study.reproducibility).toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-xs text-[#605e5c] block">%GR&R</span>
                  <span className="text-lg font-bold text-[#323130]">{Number(study.grrPercent).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-xs text-[#605e5c] block">ndc</span>
                  <span className="text-lg font-bold text-[#323130]">{study.ndc}</span>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xs text-[#605e5c]">{t("quality.msa.conclusion")}: </span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CONCLUSION_KEYS[study.conclusion]?.bg ?? ""}`}>
                  {t(CONCLUSION_KEYS[study.conclusion]?.key ?? study.conclusion)}
                </span>
                <span className="text-xs text-[#a19f9d] ml-2">{CONCLUSION_KEYS[study.conclusion]?.desc ?? ""}</span>
              </div>
            </div>
          )}

          {/* Measurement Data Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-[#323130]">
                {t("quality.workbench.measurements")} ({study.measurements?.length ?? 0} / {(study.numOperators ?? 3) * (study.numParts ?? 10) * (study.numTrials ?? 3)})
              </h4>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowBatch(!showBatch)}
                  className="text-xs text-[#0078d4] hover:underline">{showBatch ? t("quality.workbench.singleEntry") : t("quality.workbench.batchEntry")}</button>
                {(study.measurements?.length ?? 0) > 0 && (
                  <button
                    onClick={() => calcMut.mutate({ studyId: study.id })}
                    disabled={calcMut.isPending}
                    className="h-8 px-3 bg-[#107c10] hover:bg-[#0b6a0b] text-white text-xs font-medium rounded-md flex items-center gap-1 disabled:opacity-50"
                  >
                    {calcMut.isPending && <Loader2 size={12} className="animate-spin" />}
                    <FlaskConical size={12} /> {t("quality.msa.calculateGRR")}
                  </button>
                )}
              </div>
            </div>

            {/* Single measurement entry */}
            {!showBatch && (
              <div className="flex flex-wrap items-end gap-2 mb-3">
                <div className="w-28">
                  <label className="block text-xs text-[#605e5c] mb-0.5">{t("quality.workbench.operator")}</label>
                  <input type="text" value={mf.operatorName} onChange={(e) => setMf({ ...mf, operatorName: e.target.value })}
                    placeholder="Op A"
                    className="w-full h-8 px-2 text-xs border border-[#8a8886] rounded focus:outline-none focus:border-[#0078d4]" />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-[#605e5c] mb-0.5">{t("quality.workbench.partNo")}</label>
                  <input type="number" value={mf.partNumber} onChange={(e) => setMf({ ...mf, partNumber: parseInt(e.target.value) || 1 })}
                    min={1}
                    className="w-full h-8 px-2 text-xs border border-[#8a8886] rounded focus:outline-none focus:border-[#0078d4]" />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-[#605e5c] mb-0.5">{t("quality.workbench.trialNo")}</label>
                  <input type="number" value={mf.trialNumber} onChange={(e) => setMf({ ...mf, trialNumber: parseInt(e.target.value) || 1 })}
                    min={1}
                    className="w-full h-8 px-2 text-xs border border-[#8a8886] rounded focus:outline-none focus:border-[#0078d4]" />
                </div>
                <div className="w-28">
                  <label className="block text-xs text-[#605e5c] mb-0.5">{t("quality.workbench.value")}</label>
                  <input type="text" value={mf.measuredValue} onChange={(e) => setMf({ ...mf, measuredValue: e.target.value })}
                    placeholder="25.03"
                    className="w-full h-8 px-2 text-xs border border-[#8a8886] rounded focus:outline-none focus:border-[#0078d4]" />
                </div>
                <button
                  disabled={!mf.measuredValue || !mf.operatorName || addMut.isPending}
                  onClick={() => addMut.mutate({
                    studyId: study.id,
                    partNumber: mf.partNumber,
                    trialNumber: mf.trialNumber,
                    measuredValue: mf.measuredValue,
                  })}
                  className="h-8 px-3 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs rounded flex items-center gap-1 disabled:opacity-50"
                >
                  {addMut.isPending && <Loader2 size={12} className="animate-spin" />}
                  <Plus size={12} /> {t("quality.workbench.add")}
                </button>
              </div>
            )}

            {/* Batch measurement entry */}
            {showBatch && (
              <div className="mb-3 space-y-2">
                <p className="text-xs text-[#605e5c]">
                  {t("quality.workbench.batchHint")}: <code className="bg-[#f3f2f1] px-1 rounded">OperatorName, PartNumber, TrialNumber, MeasuredValue</code>
                </p>
                <textarea value={batchText} onChange={(e) => setBatchText(e.target.value)}
                  rows={5} placeholder="Op A, 1, 1, 25.03&#10;Op A, 1, 2, 25.01&#10;Op B, 1, 1, 24.98"
                  className="w-full px-3 py-2 border border-[#8a8886] rounded-md text-xs font-mono resize-none focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]" />
                <button
                  disabled={!batchText.trim() || batchMut.isPending}
                  onClick={() => {
                    const lines = batchText.trim().split("\n").filter(Boolean);
                    const measurements = lines.map((line) => {
                      const parts = line.split(/[,\t]+/).map((s) => s.trim());
                      return {
                        operatorName: parts[0] || "Unknown",
                        partNumber: parseInt(parts[1]) || 1,
                        trialNumber: parseInt(parts[2]) || 1,
                        measuredValue: parts[3] || "0",
                      };
                    });
                    batchMut.mutate({ studyId: study.id, measurements });
                  }}
                  className="h-8 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-medium rounded flex items-center gap-1 disabled:opacity-50"
                >
                  {batchMut.isPending && <Loader2 size={12} className="animate-spin" />}
                  {tpl("quality.workbench.importRows", { count: String(batchText.trim().split("\n").filter(Boolean).length) })}
                </button>
              </div>
            )}

            {/* Existing measurements grid */}
            {(study.measurements?.length ?? 0) > 0 && (
              <div className="max-h-[240px] overflow-y-auto border border-[#edebe9] rounded">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#f3f2f1]">
                    <tr>
                      <th className="text-left px-3 py-2 text-[#605e5c] font-semibold">{t("quality.workbench.operator")}</th>
                      <th className="text-left px-3 py-2 text-[#605e5c] font-semibold">{t("quality.msa.part")}</th>
                      <th className="text-left px-3 py-2 text-[#605e5c] font-semibold">{t("quality.workbench.trial")}</th>
                      <th className="text-left px-3 py-2 text-[#605e5c] font-semibold">{t("quality.workbench.value")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {study.measurements!.map((m, i) => (
                      <tr key={i} className="border-t border-[#edebe9]">
                        <td className="px-3 py-1.5 text-[#323130]">{m.operatorName || "-"}</td>
                        <td className="px-3 py-1.5 text-[#323130]">{m.partNumber}</td>
                        <td className="px-3 py-1.5 text-[#323130]">{m.trialNumber}</td>
                        <td className="px-3 py-1.5 font-mono text-[#323130]">{m.measuredValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main QualityWorkbench
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type TabKey = "reports" | "detail" | "capa" | "msa" | "dashboard";

const TAB_KEYS: { key: TabKey; labelKey: string; icon: typeof Shield }[] = [
  { key: "reports", labelKey: "quality.workbench.tabProblemReport", icon: ClipboardList },
  { key: "detail", labelKey: "quality.workbench.tabStepDetails", icon: FileSearch },
  { key: "capa", labelKey: "quality.workbench.tabCAPA", icon: Target },
  { key: "msa", labelKey: "quality.workbench.tabMSA", icon: Ruler },
  { key: "dashboard", labelKey: "quality.workbench.tabOverview", icon: BarChart3 },
];

export default function QualityWorkbench() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("reports");
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  function handleSelectReport(id: number) {
    setSelectedReportId(id);
    setActiveTab("detail");
  }

  function handleBackToList() {
    setSelectedReportId(null);
    setActiveTab("reports");
  }

  return (
    <div className="flex flex-col h-full bg-[#faf9f8]">
      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#0078d4] flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#323130]">{t("quality.workbench.title")}</h1>
            <p className="text-xs text-[#605e5c]">{t("quality.workbench.subtitle")}</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-[#edebe9] overflow-x-auto scrollbar-hide">
          {TAB_KEYS.map((tab) => {
            const isActive = activeTab === tab.key;
            const isDetailDisabled = tab.key === "detail" && selectedReportId === null;
            return (
              <button
                key={tab.key}
                disabled={isDetailDisabled}
                onClick={() => {
                  if (!isDetailDisabled) setActiveTab(tab.key);
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-white text-[#0078d4] border-[#0078d4]"
                    : isDetailDisabled
                    ? "text-[#c8c6c4] border-transparent cursor-not-allowed"
                    : "text-[#605e5c] border-transparent hover:text-[#323130] hover:bg-[#f3f2f1]"
                }`}
              >
                <tab.icon size={15} />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {activeTab === "reports" && <ReportsTab onSelectReport={handleSelectReport} />}
        {activeTab === "detail" && selectedReportId !== null && (
          <DetailTab reportId={selectedReportId} onBack={handleBackToList} />
        )}
        {activeTab === "detail" && selectedReportId === null && (
          <div className="text-center py-16 text-[#a19f9d]">
            <FileSearch size={48} className="mx-auto mb-3" />
            <p>{t("quality.workbench.selectReportHint")}</p>
          </div>
        )}
        {activeTab === "capa" && <CapaTab />}
        {activeTab === "msa" && <MsaTab />}
        {activeTab === "dashboard" && <DashboardTab />}
      </div>
    </div>
  );
}
