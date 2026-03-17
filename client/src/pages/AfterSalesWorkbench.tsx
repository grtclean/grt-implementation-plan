/**
 * After-Sales & Warranty Tracking Workbench (售后与保修工作台)
 * Microsoft Fluent Design — no shadcn imports
 *
 * 5 tabs: Warranty Tracker | Spare Parts | Complaints | Supplier Penalties | Dashboard
 * Wired to afterSales.* and supplyChain.* tRPC routers
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useZodForm, schemas, z } from "@/lib/form-validation";
import {
  Shield, Package, MessageSquareWarning, Gavel, LayoutDashboard,
  Search, Plus, X, AlertTriangle, CheckCircle2, Clock, XCircle,
  Wrench, ChevronRight, Star, ArrowRight, Filter, RefreshCw,
  BarChart3, Box, Truck, CalendarClock, Activity, Ban,
  CircleDot, TrendingDown, TrendingUp, Settings2,
} from "lucide-react";

// ─── Zod Schemas ─────────────────────────────────────────────────
const sparePartSchema = z.object({
  materialCode: schemas.materialCode("Material code is required / 物料编码必填"),
  materialName: schemas.requiredString("Material name is required / 物料名称必填"),
  specification: schemas.optionalString(),
  category: z.string().default("mechanical"),
  minStockLevel: z.coerce.number().nonnegative("Must be >= 0").default(0),
  reorderPoint: z.coerce.number().nonnegative("Must be >= 0").default(0),
  maxStockLevel: z.coerce.number().nonnegative("Must be >= 0").default(100),
  currentStock: z.coerce.number().nonnegative("Must be >= 0").default(0),
  unitPrice: z.coerce.number().nonnegative("Must be >= 0").default(0),
  isCritical: z.boolean().default(false),
});
type SparePartValues = z.infer<typeof sparePartSchema>;

const complaintSchema = z.object({
  customerName: schemas.requiredString("Customer name is required / 客户名称必填"),
  severity: schemas.severity(),
  equipmentSerialNumber: schemas.optionalString(),
  description: schemas.requiredString("Description is required / 问题描述必填"),
});
type ComplaintValues = z.infer<typeof complaintSchema>;

/* Fluent Design tokens */
const F = {
  page: "bg-[#faf9f8] min-h-screen",
  card: "bg-white border border-[#edebe9] rounded-xl shadow-sm",
  primary: "#0078d4",
  text: "text-[#323130]",
  muted: "text-[#605e5c]",
  border: "border-[#edebe9]",
  inputBase:
    "w-full rounded-lg border border-[#edebe9] bg-white px-3 py-2 text-sm text-[#323130] placeholder:text-[#a19f9d] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition",
  btnPrimary:
    "inline-flex items-center gap-2 rounded-lg bg-[#0078d4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#106ebe] transition shadow-sm",
  btnSecondary:
    "inline-flex items-center gap-2 rounded-lg border border-[#edebe9] bg-white px-4 py-2 text-sm font-medium text-[#323130] hover:bg-[#f3f2f1] transition",
  btnGhost:
    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#605e5c] hover:bg-[#f3f2f1] transition",
  badge: (bg: string, text: string) =>
    `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg} ${text}`,
} as const;

/* Shared tiny components */

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 w-full rounded-lg bg-[#f3f2f1] animate-pulse" />
      ))}
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  accent = "#0078d4",
}: {
  icon: any;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className={`${F.card} p-4 flex items-center gap-4`}>
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ backgroundColor: accent + "14" }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#323130]">{value}</div>
        <div className="text-xs text-[#605e5c]">{label}</div>
      </div>
    </div>
  );
}

function FluentDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-[#edebe9] w-full max-w-[95vw] md:max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#edebe9]">
          <h2 className="text-lg font-semibold text-[#323130]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f3f2f1] transition min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-[#605e5c]" />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-[#323130] mb-1">{children}</label>;
}

/* Tab definitions */

const TABS = [
  { key: "warranty", labelKey: "afterSales.workbench.warranty", icon: Shield },
  { key: "spare", labelKey: "afterSales.workbench.spareParts", icon: Package },
  { key: "complaints", labelKey: "afterSales.workbench.complaints", icon: MessageSquareWarning },
  { key: "penalties", labelKey: "afterSales.workbench.penalties", icon: Gavel },
  { key: "dashboard", labelKey: "afterSales.workbench.dashboard", icon: LayoutDashboard },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* Helpers */

function warrantyColor(daysRemaining: number | null | undefined): {
  bg: string; text: string; dot: string; labelKey: string;
} {
  if (daysRemaining == null || daysRemaining <= 0)
    return { bg: "bg-[#f3f2f1]", text: "text-[#a19f9d]", dot: "bg-[#a19f9d]", labelKey: "afterSales.workbench.expired" };
  if (daysRemaining < 30)
    return { bg: "bg-[#fed9cc]", text: "text-[#d83b01]", dot: "bg-[#d83b01]", labelKey: "afterSales.workbench.expiringSoon" };
  if (daysRemaining <= 90)
    return { bg: "bg-[#fff4ce]", text: "text-[#797673]", dot: "bg-[#c19c00]", labelKey: "afterSales.workbench.warrantyNotice" };
  return { bg: "bg-[#dff6dd]", text: "text-[#107c10]", dot: "bg-[#107c10]", labelKey: "afterSales.workbench.normal" };
}

function severityBadge(severity: string | null | undefined, t: (k: string) => string) {
  const s = (severity || "").toLowerCase();
  if (s === "critical")
    return <span className={F.badge("bg-[#fde7e9]", "text-[#c50f1f]")}>{t("afterSales.complaints.severityCritical")}</span>;
  if (s === "high")
    return <span className={F.badge("bg-[#fed9cc]", "text-[#d83b01]")}>{t("afterSales.complaints.severityHigh")}</span>;
  if (s === "medium")
    return <span className={F.badge("bg-[#deecf9]", "text-[#0078d4]")}>{t("afterSales.complaints.severityMedium")}</span>;
  return <span className={F.badge("bg-[#f3f2f1]", "text-[#605e5c]")}>{t("afterSales.complaints.severityLow")}</span>;
}

function complaintStatusBadge(status: string | null | undefined, t: (k: string) => string) {
  const s = (status || "").toLowerCase();
  if (s === "open")
    return <span className={F.badge("bg-[#fed9cc]", "text-[#d83b01]")}>{t("afterSales.complaints.open")}</span>;
  if (s === "investigating")
    return <span className={F.badge("bg-[#deecf9]", "text-[#0078d4]")}>{t("afterSales.complaints.investigating")}</span>;
  if (s === "resolved")
    return <span className={F.badge("bg-[#dff6dd]", "text-[#107c10]")}>{t("afterSales.complaints.resolved")}</span>;
  if (s === "closed")
    return <span className={F.badge("bg-[#f3f2f1]", "text-[#605e5c]")}>{t("afterSales.complaints.closed")}</span>;
  return <span className={F.badge("bg-[#f3f2f1]", "text-[#605e5c]")}>{status || "--"}</span>;
}

function escalationBadge(level: number | null | undefined, t: (k: string) => string) {
  const l = level ?? 0;
  const map: Record<number, { bg: string; text: string; labelKey: string }> = {
    1: { bg: "bg-[#fff4ce]", text: "text-[#797673]", labelKey: "afterSales.penalties.levelWarning" },
    2: { bg: "bg-[#fed9cc]", text: "text-[#d83b01]", labelKey: "afterSales.penalties.levelFine" },
    3: { bg: "bg-[#fde7e9]", text: "text-[#c50f1f]", labelKey: "afterSales.penalties.levelObservation" },
    4: { bg: "bg-[#fde7e9]", text: "text-[#a80000]", labelKey: "afterSales.penalties.levelSuspend" },
    5: { bg: "bg-[#323130]", text: "text-white", labelKey: "afterSales.penalties.levelBlacklist" },
  };
  const cfg = map[l] || { bg: "bg-[#f3f2f1]", text: "text-[#605e5c]", labelKey: "" };
  return <span className={F.badge(cfg.bg, cfg.text)}>{cfg.labelKey ? t(cfg.labelKey) : `L${l}`}</span>;
}

function triggerTypeBadge(type: string | null | undefined, tr: (k: string) => string) {
  const tp = (type || "").toLowerCase();
  const map: Record<string, { labelKey: string; bg: string; text: string }> = {
    quality_reject: { labelKey: "afterSales.penalties.triggerQuality", bg: "bg-[#fde7e9]", text: "text-[#c50f1f]" },
    late_delivery: { labelKey: "afterSales.penalties.triggerDelivery", bg: "bg-[#fff4ce]", text: "text-[#797673]" },
    missing_report: { labelKey: "afterSales.penalties.triggerReport", bg: "bg-[#deecf9]", text: "text-[#0078d4]" },
    safety_violation: { labelKey: "afterSales.penalties.triggerSafety", bg: "bg-[#fed9cc]", text: "text-[#d83b01]" },
  };
  const cfg = map[tp] || { labelKey: "", bg: "bg-[#f3f2f1]", text: "text-[#605e5c]" };
  return <span className={F.badge(cfg.bg, cfg.text)}>{cfg.labelKey ? tr(cfg.labelKey) : (type || "--")}</span>;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "--";
  try {
    return new Date(d).toLocaleDateString("zh-CN");
  } catch {
    return d;
  }
}

function fmtCurrency(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (n == null || isNaN(n)) return "¥0";
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Tab 1: Warranty Tracker (保修追踪) */
function WarrantyTab() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const equipQ = trpc.afterSales.equipments.list.useQuery();
  const dueSoonQ = trpc.afterSales.equipments.getDueSoon.useQuery({} as any);

  const equipments: any[] = Array.isArray((equipQ.data as any)?.items) ? (equipQ.data as any).items : Array.isArray(equipQ.data) ? equipQ.data : [];
  const dueSoon: any[] = Array.isArray((dueSoonQ.data as any)?.items) ? (dueSoonQ.data as any).items : Array.isArray(dueSoonQ.data) ? dueSoonQ.data : [];

  const filtered = useMemo(() => {
    let list = equipments;
    if (statusFilter === "active") list = list.filter((e: any) => (e.daysRemaining ?? -1) > 0);
    if (statusFilter === "expiring")
      list = list.filter((e: any) => (e.daysRemaining ?? -1) > 0 && (e.daysRemaining ?? 999) <= 90);
    if (statusFilter === "expired") list = list.filter((e: any) => (e.daysRemaining ?? -1) <= 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e: any) =>
          (e.serialNumber || "").toLowerCase().includes(q) ||
          (e.modelName || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [equipments, statusFilter, search]);

  const stats = useMemo(() => {
    const total = equipments.length;
    const active = equipments.filter((e: any) => (e.daysRemaining ?? -1) > 0).length;
    const expiring = equipments.filter(
      (e: any) => (e.daysRemaining ?? -1) > 0 && (e.daysRemaining ?? 999) <= 90,
    ).length;
    const expired = equipments.filter((e: any) => (e.daysRemaining ?? -1) <= 0).length;
    return { total, active, expiring, expired };
  }, [equipments]);

  if (equipQ.isLoading) return <Skeleton rows={5} />;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={Box} label={t("afterSales.workbench.totalEquipment")} value={stats.total} accent="#0078d4" />
        <StatBox icon={CheckCircle2} label={t("afterSales.workbench.warrantyActive")} value={stats.active} accent="#107c10" />
        <StatBox icon={AlertTriangle} label={t("afterSales.workbench.expiringSoon")} value={stats.expiring} accent="#c19c00" />
        <StatBox icon={XCircle} label={t("afterSales.workbench.expired")} value={stats.expired} accent="#d83b01" />
      </div>

      {dueSoon.length > 0 && (
        <div className="rounded-xl border border-[#c19c00]/30 bg-[#fff4ce]/40 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#c19c00]" />
            <span className="text-sm font-semibold text-[#323130]">
              {dueSoon.length} {t("afterSales.workbench.devicesExpiring")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dueSoon.slice(0, 8).map((e: any, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#edebe9] px-2.5 py-1 text-xs text-[#323130]">
                {e.serialNumber || e.modelName}
                <span className="text-[#d83b01] font-semibold">{e.daysRemaining}{t("afterSales.workbench.days")}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
          <input className={`${F.inputBase} pl-9`} placeholder={t("afterSales.workbench.searchSerial")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${F.inputBase} w-auto max-w-[160px]`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t("afterSales.workbench.allStatus")}</option>
          <option value="active">{t("afterSales.workbench.active")}</option>
          <option value="expiring">{t("afterSales.workbench.expiring")}</option>
          <option value="expired">{t("afterSales.workbench.expired")}</option>
        </select>
        <button className={F.btnGhost} onClick={() => { equipQ.refetch(); dueSoonQ.refetch(); }}>
          <RefreshCw className="w-4 h-4" /> {t("afterSales.workbench.refresh")}
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#a19f9d] text-sm">{t("afterSales.workbench.noEquipment")}</div>
        )}
        {filtered.map((eq: any, idx: number) => {
          const wc = warrantyColor(eq.daysRemaining);
          return (
            <div key={eq.id ?? idx} className={`${F.card} p-4`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${wc.dot}`} />
                    <span className="font-semibold text-[#323130] truncate">{eq.serialNumber || "--"}</span>
                    <span className={`${F.badge(wc.bg, wc.text)}`}>{t(wc.labelKey)}</span>
                  </div>
                  <div className="text-sm text-[#605e5c]">
                    {t("afterSales.workbench.model")}: {eq.modelName || "--"} &nbsp;|&nbsp; {t("afterSales.workbench.opStatus")}: {eq.operationalStatus || "--"}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-[#605e5c]">
                  <div>
                    <div className="text-xs text-[#a19f9d]">{t("afterSales.workbench.warrantyExpiry")}</div>
                    <div className="font-medium text-[#323130]">{fmtDate(eq.warrantyEndDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a19f9d]">{t("afterSales.workbench.daysRemaining")}</div>
                    <div className="font-bold" style={{ color: (eq.daysRemaining ?? -1) <= 0 ? "#a19f9d" : (eq.daysRemaining ?? 999) < 30 ? "#d83b01" : (eq.daysRemaining ?? 999) <= 90 ? "#c19c00" : "#107c10" }}>
                      {eq.daysRemaining != null ? `${eq.daysRemaining}${t("afterSales.workbench.days")}` : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a19f9d]">{t("afterSales.workbench.lastMaintenance")}</div>
                    <div className="text-[#323130]">{fmtDate(eq.lastMaintenanceDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a19f9d]">{t("afterSales.workbench.nextMaintenance")}</div>
                    <div className="text-[#323130]">{fmtDate(eq.nextDueDate)}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Tab 2: Spare Parts */
function SparePartsTab() {
  const { t } = useLanguage();
  const [catFilter, setCatFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const spForm = useZodForm({
    schema: sparePartSchema,
    defaultValues: {
      materialCode: "", materialName: "", specification: "", category: "mechanical",
      minStockLevel: 0, reorderPoint: 0, maxStockLevel: 100, currentStock: 0,
      unitPrice: 0, isCritical: false,
    },
  });

  const utils = trpc.useUtils();
  const partsQ = trpc.supplyChain.sparePart.list.useQuery();
  const lowStockQ = trpc.supplyChain.sparePart.lowStockAlerts.useQuery();
  const createM = trpc.supplyChain.sparePart.create.useMutation({
    onSuccess: () => {
      utils.supplyChain.sparePart.list.invalidate(); utils.supplyChain.sparePart.lowStockAlerts.invalidate(); setShowCreate(false);
      spForm.reset();
    },
  });

  const parts: any[] = Array.isArray((partsQ.data as any)?.items) ? (partsQ.data as any).items : Array.isArray(partsQ.data) ? partsQ.data : [];
  const lowStock: any[] = Array.isArray((lowStockQ.data as any)?.items) ? (lowStockQ.data as any).items : Array.isArray(lowStockQ.data) ? lowStockQ.data : [];

  const filtered = useMemo(() => {
    let list = parts;
    if (catFilter !== "all") list = list.filter((p: any) => p.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) => (p.materialCode || "").toLowerCase().includes(q) || (p.materialName || "").toLowerCase().includes(q));
    }
    return list;
  }, [parts, catFilter, search]);

  const stats = useMemo(() => {
    const total = parts.length;
    const critical = parts.filter((p: any) => p.isCritical).length;
    const lowCount = lowStock.length;
    const totalValue = parts.reduce((sum: number, p: any) => sum + (parseFloat(p.unitPrice || 0) * (p.currentStock || 0)), 0);
    return { total, critical, lowCount, totalValue };
  }, [parts, lowStock]);

  const categories = [
    { value: "all", label: t("afterSales.spare.allCategories") }, { value: "mechanical", label: t("afterSales.spare.mechanical") },
    { value: "electrical", label: t("afterSales.spare.electrical") }, { value: "hydraulic", label: t("afterSales.spare.hydraulic") },
    { value: "pneumatic", label: t("afterSales.spare.pneumatic") }, { value: "consumable", label: t("afterSales.spare.consumable") },
  ];

  if (partsQ.isLoading) return <Skeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={Package} label={t("afterSales.spare.totalParts")} value={stats.total} accent="#0078d4" />
        <StatBox icon={AlertTriangle} label={t("afterSales.spare.criticalParts")} value={stats.critical} accent="#d83b01" />
        <StatBox icon={TrendingDown} label={t("afterSales.spare.lowStockAlert")} value={stats.lowCount} accent="#c19c00" />
        <StatBox icon={BarChart3} label={t("afterSales.spare.inventoryValue")} value={`¥${(stats.totalValue / 10000).toFixed(1)}万`} accent="#107c10" />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-[#d83b01]/30 bg-[#fed9cc]/30 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#d83b01]" />
            <span className="text-sm font-semibold text-[#323130]">{lowStock.length} {t("afterSales.spare.lowStockItems")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.slice(0, 10).map((p: any, i: number) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#edebe9] px-2.5 py-1 text-xs">
                <span className="text-[#323130]">{p.materialName || p.materialCode}</span>
                <span className="text-[#d83b01] font-semibold">{p.currentStock}/{p.reorderPoint}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
          <input className={`${F.inputBase} pl-9`} placeholder={t("afterSales.spare.searchParts")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${F.inputBase} w-auto max-w-[140px]`} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          {categories.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
        </select>
        <button className={F.btnPrimary} onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> {t("afterSales.spare.newPart")}
        </button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-[#a19f9d] text-sm">{t("afterSales.spare.noParts")}</div>}
        {filtered.map((p: any, idx: number) => {
          const current = p.currentStock ?? 0;
          const max = p.maxStockLevel ?? 100;
          const reorder = p.reorderPoint ?? 0;
          const isLow = current <= reorder;
          const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
          return (
            <div key={p.id ?? idx} className={`${F.card} p-4 space-y-3`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-[#323130] truncate">{p.materialName || "--"}</span>
                    {p.isCritical && <span className={F.badge("bg-[#fde7e9]", "text-[#c50f1f]")}>{t("afterSales.spare.critical")}</span>}
                  </div>
                  <div className="text-xs text-[#605e5c]">{p.materialCode || "--"} &middot; {p.specification || "--"}</div>
                </div>
                <span className="text-xs text-[#a19f9d] whitespace-nowrap">{p.category || "--"}</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={isLow ? "text-[#d83b01] font-semibold" : "text-[#605e5c]"}>{t("afterSales.spare.stock")}: {current}</span>
                  <span className="text-[#a19f9d]">{t("afterSales.spare.max")}: {max}</span>
                </div>
                <div className="h-2 rounded-full bg-[#f3f2f1] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: pct + "%", backgroundColor: isLow ? "#d83b01" : pct > 70 ? "#107c10" : "#0078d4" }} />
                </div>
                {isLow && <div className="text-[10px] text-[#d83b01] mt-0.5">{t("afterSales.spare.belowReorder")} ({reorder})</div>}
              </div>
              <div className="flex items-center justify-between text-xs text-[#605e5c]">
                <span>{t("afterSales.spare.unitPrice")}: {fmtCurrency(p.unitPrice)}</span>
                <span>{t("afterSales.spare.subtotal")}: {fmtCurrency((parseFloat(p.unitPrice || 0) * current).toFixed(2))}</span>
              </div>
            </div>
          );
        })}
      </div>

      <FluentDialog open={showCreate} onClose={() => { setShowCreate(false); spForm.reset(); }} title={t("afterSales.spare.newPart")}>
        <form onSubmit={spForm.handleSubmit((data) => createM.mutate(data as any))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>{t("afterSales.spare.materialCode")} *</FieldLabel>
              <input className={F.inputBase} value={spForm.watch("materialCode")} onChange={(e) => spForm.setValue("materialCode", e.target.value, { shouldValidate: true })} />
              {spForm.formState.errors.materialCode && <p className="text-[#d83b01] text-xs mt-1">{spForm.formState.errors.materialCode.message}</p>}
            </div>
            <div>
              <FieldLabel>{t("afterSales.spare.materialName")} *</FieldLabel>
              <input className={F.inputBase} value={spForm.watch("materialName")} onChange={(e) => spForm.setValue("materialName", e.target.value, { shouldValidate: true })} />
              {spForm.formState.errors.materialName && <p className="text-[#d83b01] text-xs mt-1">{spForm.formState.errors.materialName.message}</p>}
            </div>
          </div>
          <div><FieldLabel>{t("afterSales.spare.specification")}</FieldLabel><input className={F.inputBase} value={spForm.watch("specification") || ""} onChange={(e) => spForm.setValue("specification", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel>{t("afterSales.spare.category")}</FieldLabel><select className={F.inputBase} value={spForm.watch("category")} onChange={(e) => spForm.setValue("category", e.target.value)}><option value="mechanical">{t("afterSales.spare.mechanical")}</option><option value="electrical">{t("afterSales.spare.electrical")}</option><option value="hydraulic">{t("afterSales.spare.hydraulic")}</option><option value="pneumatic">{t("afterSales.spare.pneumatic")}</option><option value="consumable">{t("afterSales.spare.consumable")}</option></select></div>
            <div><FieldLabel>{t("afterSales.spare.price")}</FieldLabel><input type="number" className={F.inputBase} value={spForm.watch("unitPrice")} onChange={(e) => spForm.setValue("unitPrice", parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><FieldLabel>{t("afterSales.spare.minStock")}</FieldLabel><input type="number" className={F.inputBase} value={spForm.watch("minStockLevel")} onChange={(e) => spForm.setValue("minStockLevel", parseInt(e.target.value) || 0)} /></div>
            <div><FieldLabel>{t("afterSales.spare.reorderPoint")}</FieldLabel><input type="number" className={F.inputBase} value={spForm.watch("reorderPoint")} onChange={(e) => spForm.setValue("reorderPoint", parseInt(e.target.value) || 0)} /></div>
            <div><FieldLabel>{t("afterSales.spare.maxStock")}</FieldLabel><input type="number" className={F.inputBase} value={spForm.watch("maxStockLevel")} onChange={(e) => spForm.setValue("maxStockLevel", parseInt(e.target.value) || 0)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><FieldLabel>{t("afterSales.spare.currentStock")}</FieldLabel><input type="number" className={F.inputBase} value={spForm.watch("currentStock")} onChange={(e) => spForm.setValue("currentStock", parseInt(e.target.value) || 0)} /></div>
            <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={spForm.watch("isCritical")} onChange={(e) => spForm.setValue("isCritical", e.target.checked)} className="w-4 h-4 accent-[#0078d4]" /><span className="text-sm text-[#323130]">{t("afterSales.spare.isCritical")}</span></label></div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#edebe9]">
            <button type="button" className={F.btnSecondary} onClick={() => { setShowCreate(false); spForm.reset(); }}>{t("afterSales.spare.cancel")}</button>
            <button type="submit" className={F.btnPrimary} disabled={createM.isPending}>{createM.isPending ? t("afterSales.spare.creating") : t("afterSales.spare.create")}</button>
          </div>
        </form>
      </FluentDialog>
    </div>
  );
}

/* Tab 3: Complaints (客户投诉) */
function ComplaintsTab() {
  const { t } = useLanguage();
  const [sevFilter, setSevFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const cForm = useZodForm({
    schema: complaintSchema,
    defaultValues: { customerName: "", severity: "medium", description: "", equipmentSerialNumber: "" },
  });

  const utils = trpc.useUtils();
  const listQ = trpc.supplyChain.complaint.list.useQuery();
  const statsQ = trpc.supplyChain.complaint.stats.useQuery();
  const createM = trpc.supplyChain.complaint.create.useMutation({
    onSuccess: () => { utils.supplyChain.complaint.list.invalidate(); utils.supplyChain.complaint.stats.invalidate(); setShowCreate(false); cForm.reset(); },
  });

  const complaints: any[] = Array.isArray((listQ.data as any)?.items) ? (listQ.data as any).items : Array.isArray(listQ.data) ? listQ.data : [];
  const cStats: any = statsQ.data || {};

  const filtered = useMemo(() => {
    let list = complaints;
    if (sevFilter !== "all") list = list.filter((c: any) => c.severity === sevFilter);
    if (statusFilter !== "all") list = list.filter((c: any) => c.status === statusFilter);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((c: any) => (c.customerName || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q) || (c.equipmentSerialNumber || "").toLowerCase().includes(q)); }
    return list;
  }, [complaints, sevFilter, statusFilter, search]);

  if (listQ.isLoading) return <Skeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={MessageSquareWarning} label={t("afterSales.complaints.totalComplaints")} value={cStats.total ?? complaints.length} accent="#0078d4" />
        <StatBox icon={Clock} label={t("afterSales.complaints.pending")} value={cStats.open ?? complaints.filter((c: any) => c.status === "open").length} accent="#d83b01" />
        <StatBox icon={AlertTriangle} label={t("afterSales.complaints.criticalCount")} value={cStats.critical ?? complaints.filter((c: any) => c.severity === "critical").length} accent="#c50f1f" />
        <StatBox icon={Star} label={t("afterSales.complaints.avgSatisfaction")} value={cStats.avgSatisfaction != null ? Number(cStats.avgSatisfaction).toFixed(1) + "/10" : "--"} accent="#107c10" />
      </div>

      <div className={`${F.card} p-4`}>
        <div className="text-sm font-semibold text-[#323130] mb-3">{t("afterSales.complaints.workflow")}</div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {["open", "investigating", "resolved", "closed"].map((s, i) => {
            const count = complaints.filter((c: any) => c.status === s).length;
            const labels: Record<string, string> = { open: t("afterSales.complaints.open"), investigating: t("afterSales.complaints.investigating"), resolved: t("afterSales.complaints.resolved"), closed: t("afterSales.complaints.closed") };
            const colors: Record<string, string> = { open: "#d83b01", investigating: "#0078d4", resolved: "#107c10", closed: "#605e5c" };
            return (
              <div key={s} className="flex items-center gap-2">
                <button className="flex flex-col items-center rounded-lg px-5 py-3 min-h-[44px] transition hover:bg-[#f3f2f1]" style={{ backgroundColor: statusFilter === s ? colors[s] + "14" : undefined, borderBottom: statusFilter === s ? "2px solid " + colors[s] : "2px solid transparent" }} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}>
                  <span className="text-xl font-bold" style={{ color: colors[s] }}>{count}</span>
                  <span className="text-xs text-[#605e5c]">{labels[s]}</span>
                </button>
                {i < 3 && <ArrowRight className="w-4 h-4 text-[#a19f9d] flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
          <input className={`${F.inputBase} pl-9`} placeholder={t("afterSales.complaints.searchCustomer")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${F.inputBase} w-auto max-w-[130px]`} value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
          <option value="all">{t("afterSales.complaints.allSeverity")}</option><option value="critical">{t("afterSales.complaints.severityCritical")}</option><option value="high">{t("afterSales.complaints.severityHigh")}</option><option value="medium">{t("afterSales.complaints.severityMedium")}</option><option value="low">{t("afterSales.complaints.severityLow")}</option>
        </select>
        <button className={F.btnPrimary} onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> {t("afterSales.complaints.newComplaint")}</button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-center py-12 text-[#a19f9d] text-sm">{t("afterSales.complaints.noData")}</div>}
        {filtered.map((c: any, idx: number) => (
          <div key={c.id ?? idx} className={`${F.card} p-4`}>
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-[#323130]">{c.customerName || t("afterSales.complaints.unknownCustomer")}</span>
                  {severityBadge(c.severity, t)}
                  {complaintStatusBadge(c.status, t)}
                  {c.eightDReportId && <span className={F.badge("bg-[#deecf9]", "text-[#0078d4]")}>{t("afterSales.complaints.eightDLinked")}</span>}
                  {c.capaId && <span className={F.badge("bg-[#e8def8]", "text-[#6b21a8]")}>{t("afterSales.complaints.capaLinked")}</span>}
                </div>
                <p className="text-sm text-[#605e5c] line-clamp-2 mb-1">{c.description || t("afterSales.complaints.noDescription")}</p>
                <div className="flex items-center gap-4 text-xs text-[#a19f9d]">
                  {c.equipmentSerialNumber && <span>{t("afterSales.complaints.equipment")}: {c.equipmentSerialNumber}</span>}
                  <span>{t("afterSales.complaints.created")}: {fmtDate(c.createdAt)}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-center">
                <div className="text-xs text-[#a19f9d] mb-1">{t("afterSales.complaints.satisfaction")}</div>
                {c.satisfactionScore != null ? (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 10 }).map((_, si) => (
                      <div key={si} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: si < (c.satisfactionScore ?? 0) ? "#0078d4" : "#edebe9" }} />
                    ))}
                    <span className="ml-1.5 text-sm font-semibold text-[#323130]">{c.satisfactionScore}</span>
                  </div>
                ) : <span className="text-sm text-[#a19f9d]">--</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <FluentDialog open={showCreate} onClose={() => { setShowCreate(false); cForm.reset(); }} title={t("afterSales.complaints.newComplaint")}>
        <form onSubmit={cForm.handleSubmit((data) => createM.mutate(data as any))} className="space-y-4">
          <div>
            <FieldLabel>{t("afterSales.complaints.customerName")} *</FieldLabel>
            <input className={F.inputBase} value={cForm.watch("customerName")} onChange={(e) => cForm.setValue("customerName", e.target.value, { shouldValidate: true })} placeholder={t("afterSales.complaints.customerName")} />
            {cForm.formState.errors.customerName && <p className="text-[#d83b01] text-xs mt-1">{cForm.formState.errors.customerName.message}</p>}
          </div>
          <div><FieldLabel>{t("afterSales.complaints.severity")}</FieldLabel><select className={F.inputBase} value={cForm.watch("severity")} onChange={(e) => cForm.setValue("severity", e.target.value as any)}><option value="critical">{t("afterSales.complaints.severityCritical")}</option><option value="high">{t("afterSales.complaints.severityHigh")}</option><option value="medium">{t("afterSales.complaints.severityMedium")}</option><option value="low">{t("afterSales.complaints.severityLow")}</option></select></div>
          <div><FieldLabel>{t("afterSales.complaints.serialNo")}</FieldLabel><input className={F.inputBase} value={cForm.watch("equipmentSerialNumber") || ""} onChange={(e) => cForm.setValue("equipmentSerialNumber", e.target.value)} placeholder={t("afterSales.complaints.serialNoPlaceholder")} /></div>
          <div>
            <FieldLabel>{t("afterSales.complaints.description")} *</FieldLabel>
            <textarea className={`${F.inputBase} min-h-[100px] resize-y`} value={cForm.watch("description")} onChange={(e) => cForm.setValue("description", e.target.value, { shouldValidate: true })} placeholder={t("afterSales.complaints.descPlaceholder")} />
            {cForm.formState.errors.description && <p className="text-[#d83b01] text-xs mt-1">{cForm.formState.errors.description.message}</p>}
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#edebe9]">
            <button type="button" className={F.btnSecondary} onClick={() => { setShowCreate(false); cForm.reset(); }}>{t("afterSales.complaints.cancel")}</button>
            <button type="submit" className={F.btnPrimary} disabled={createM.isPending}>{createM.isPending ? t("afterSales.complaints.submitting") : t("afterSales.complaints.submit")}</button>
          </div>
        </form>
      </FluentDialog>
    </div>
  );
}

/* Tab 4: Supplier Penalties (供应商处罚) */
function PenaltiesTab() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const listQ = trpc.supplyChain.penalty.list.useQuery();
  const statsQ = trpc.supplyChain.penalty.stats.useQuery();

  const penalties: any[] = Array.isArray((listQ.data as any)?.items) ? (listQ.data as any).items : Array.isArray(listQ.data) ? listQ.data : [];
  const pStats: any = statsQ.data || {};

  const filtered = useMemo(() => {
    if (!search.trim()) return penalties;
    const q = search.toLowerCase();
    return penalties.filter((p: any) => (p.supplierName || "").toLowerCase().includes(q) || (p.reason || "").toLowerCase().includes(q));
  }, [penalties, search]);

  if (listQ.isLoading) return <Skeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={Gavel} label={t("afterSales.penalties.totalPenalties")} value={pStats.total ?? penalties.length} accent="#0078d4" />
        <StatBox icon={Activity} label={t("afterSales.penalties.activePenalties")} value={pStats.active ?? 0} accent="#d83b01" />
        <StatBox icon={CheckCircle2} label={t("afterSales.penalties.resolvedCount")} value={pStats.resolved ?? 0} accent="#107c10" />
        <StatBox icon={Ban} label={t("afterSales.penalties.blacklisted")} value={pStats.blacklisted ?? 0} accent="#323130" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
          <input className={`${F.inputBase} pl-9`} placeholder={t("afterSales.penalties.searchSupplier")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className={F.btnGhost} onClick={() => listQ.refetch()}><RefreshCw className="w-4 h-4" /> {t("afterSales.workbench.refresh")}</button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-center py-12 text-[#a19f9d] text-sm">{t("afterSales.penalties.noData")}</div>}
        {filtered.map((p: any, idx: number) => {
          const level = p.escalationLevel ?? p.currentLevel ?? 0;
          const isBlacklisted = level >= 5;
          return (
            <div key={p.id ?? idx} className={`${F.card} p-4 ${isBlacklisted ? "bg-[#fde7e9]/50 border-[#c50f1f]/30" : ""}`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-[#323130]">{p.supplierName || `供应商 #${p.supplierId || "--"}`}</span>
                    {escalationBadge(level, t)}
                    {triggerTypeBadge(p.triggerType, t)}
                    {p.status && <span className={F.badge(p.status === "resolved" ? "bg-[#dff6dd]" : p.status === "active" ? "bg-[#fed9cc]" : "bg-[#f3f2f1]", p.status === "resolved" ? "text-[#107c10]" : p.status === "active" ? "text-[#d83b01]" : "text-[#605e5c]")}>{p.status}</span>}
                  </div>
                  <p className="text-sm text-[#605e5c] line-clamp-2 mb-1">{p.reason || p.description || t("afterSales.complaints.noDescription")}</p>
                  <div className="text-xs text-[#a19f9d]">{t("afterSales.complaints.created")}: {fmtDate(p.createdAt)}</div>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-xs text-[#a19f9d] mb-1.5 text-center">{t("afterSales.penalties.escalationLevel")}</div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((step) => {
                      const stepColors: Record<number, string> = { 1: "#c19c00", 2: "#d83b01", 3: "#c50f1f", 4: "#a80000", 5: "#323130" };
                      const stepLabels: Record<number, string> = { 1: t("afterSales.penalties.levelWarning"), 2: t("afterSales.penalties.levelFine"), 3: t("afterSales.penalties.levelObservation"), 4: t("afterSales.penalties.levelSuspend"), 5: t("afterSales.penalties.levelBlacklist") };
                      const active = step <= level;
                      return (
                        <div key={step} className="flex items-center gap-1">
                          <div className="flex flex-col items-center" title={stepLabels[step]}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition" style={{ backgroundColor: active ? stepColors[step] : "#f3f2f1", color: active ? "#fff" : "#a19f9d" }}>{step}</div>
                            <span className="text-[9px] text-[#a19f9d] mt-0.5">{stepLabels[step]}</span>
                          </div>
                          {step < 5 && <div className="w-3 h-0.5 mb-3" style={{ backgroundColor: step < level ? stepColors[step] : "#edebe9" }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Tab 5: Dashboard (综合看板) */
function DashboardTab() {
  const { t } = useLanguage();
  const dashQ = trpc.supplyChain.dashboardStats.useQuery();
  const equipQ = trpc.afterSales.equipments.list.useQuery();
  const dueSoonQ = trpc.afterSales.equipments.getDueSoon.useQuery({} as any);
  const complaintsQ = trpc.supplyChain.complaint.list.useQuery();
  const complaintStatsQ = trpc.supplyChain.complaint.stats.useQuery();
  const penaltiesQ = trpc.supplyChain.penalty.list.useQuery();
  const penaltyStatsQ = trpc.supplyChain.penalty.stats.useQuery();
  const lowStockQ = trpc.supplyChain.sparePart.lowStockAlerts.useQuery();

  const equipments: any[] = Array.isArray((equipQ.data as any)?.items) ? (equipQ.data as any).items : Array.isArray(equipQ.data) ? equipQ.data : [];
  const dueSoon: any[] = Array.isArray((dueSoonQ.data as any)?.items) ? (dueSoonQ.data as any).items : Array.isArray(dueSoonQ.data) ? dueSoonQ.data : [];
  const complaints: any[] = Array.isArray((complaintsQ.data as any)?.items) ? (complaintsQ.data as any).items : Array.isArray(complaintsQ.data) ? complaintsQ.data : [];
  const cStats: any = complaintStatsQ.data || {};
  const penalties: any[] = Array.isArray((penaltiesQ.data as any)?.items) ? (penaltiesQ.data as any).items : Array.isArray(penaltiesQ.data) ? penaltiesQ.data : [];
  const pStats: any = penaltyStatsQ.data || {};
  const lowStock: any[] = Array.isArray((lowStockQ.data as any)?.items) ? (lowStockQ.data as any).items : Array.isArray(lowStockQ.data) ? lowStockQ.data : [];

  const isLoading = dashQ.isLoading || equipQ.isLoading || complaintsQ.isLoading || penaltiesQ.isLoading;
  const queryError = dashQ.error || equipQ.error || dueSoonQ.error || complaintsQ.error || complaintStatsQ.error || penaltiesQ.error || penaltyStatsQ.error || lowStockQ.error;
  if (isLoading) return <Skeleton rows={6} />;
  if (queryError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
        <p className="font-semibold text-red-700">Dashboard data loading error</p>
        <p className="mt-1 text-red-600 font-mono text-xs">{queryError.message}</p>
        <button onClick={() => { dashQ.refetch(); equipQ.refetch(); complaintsQ.refetch(); penaltiesQ.refetch(); }} className="mt-2 rounded bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200">Retry</button>
      </div>
    );
  }

  const recentComplaints = [...complaints].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);
  const recentPenalties = [...penalties].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);
  const warrantyTimeline = [...equipments].filter((e: any) => (e.daysRemaining ?? -1) > 0).sort((a: any, b: any) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999)).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatBox icon={Box} label={t("afterSales.workbench.totalEquipment")} value={equipments.length} accent="#0078d4" />
        <StatBox icon={CalendarClock} label={t("afterSales.workbench.expiringSoon")} value={dueSoon.length} accent="#c19c00" />
        <StatBox icon={MessageSquareWarning} label={t("afterSales.dashboard.pendingComplaints")} value={cStats.open ?? complaints.filter((c: any) => c.status === "open").length} accent="#d83b01" />
        <StatBox icon={Gavel} label={t("afterSales.penalties.activePenalties")} value={pStats.active ?? 0} accent="#c50f1f" />
        <StatBox icon={TrendingDown} label={t("afterSales.dashboard.lowStockParts")} value={lowStock.length} accent="#8b5cf6" />
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <div className={`${F.card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#323130]">{t("afterSales.dashboard.recentComplaints")}</h3>
            <span className="text-xs text-[#a19f9d]">{t("afterSales.dashboard.last5")}</span>
          </div>
          <div className="space-y-3">
            {recentComplaints.length === 0 && <div className="text-sm text-[#a19f9d] text-center py-4">{t("afterSales.dashboard.noComplaints")}</div>}
            {recentComplaints.map((c: any, i: number) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-[#f3f2f1] last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: c.severity === "critical" ? "#fde7e9" : c.severity === "high" ? "#fed9cc" : "#deecf9" }}>
                  <MessageSquareWarning className="w-4 h-4" style={{ color: c.severity === "critical" ? "#c50f1f" : c.severity === "high" ? "#d83b01" : "#0078d4" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#323130] truncate">{c.customerName || t("afterSales.complaints.unknownCustomer")}</span>
                    {severityBadge(c.severity, t)}{complaintStatusBadge(c.status, t)}
                  </div>
                  <p className="text-xs text-[#605e5c] line-clamp-1 mt-0.5">{c.description || "--"}</p>
                  <span className="text-[10px] text-[#a19f9d]">{fmtDate(c.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${F.card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#323130]">{t("afterSales.dashboard.recentPenalties")}</h3>
            <span className="text-xs text-[#a19f9d]">{t("afterSales.dashboard.last5")}</span>
          </div>
          <div className="space-y-3">
            {recentPenalties.length === 0 && <div className="text-sm text-[#a19f9d] text-center py-4">{t("afterSales.dashboard.noPenalties")}</div>}
            {recentPenalties.map((p: any, i: number) => {
              const level = p.escalationLevel ?? p.currentLevel ?? 0;
              return (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-[#f3f2f1] last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-[#fed9cc] flex items-center justify-center flex-shrink-0 mt-0.5"><Gavel className="w-4 h-4 text-[#d83b01]" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#323130] truncate">{p.supplierName || `供应商 #${p.supplierId || "--"}`}</span>
                      {escalationBadge(level, t)}{triggerTypeBadge(p.triggerType, t)}
                    </div>
                    <p className="text-xs text-[#605e5c] line-clamp-1 mt-0.5">{p.reason || p.description || "--"}</p>
                    <span className="text-[10px] text-[#a19f9d]">{fmtDate(p.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${F.card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#323130]">{t("afterSales.dashboard.spareStockAlerts")}</h3>
            <span className={F.badge("bg-[#fed9cc]", "text-[#d83b01]")}>{lowStock.length} {t("afterSales.dashboard.items")}</span>
          </div>
          <div className="space-y-2">
            {lowStock.length === 0 && <div className="text-sm text-[#a19f9d] text-center py-4">{t("afterSales.dashboard.stockSufficient")}</div>}
            {lowStock.slice(0, 8).map((p: any, i: number) => {
              const current = p.currentStock ?? 0; const max = p.maxStockLevel ?? 100;
              const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-[#323130] truncate">{p.materialName || p.materialCode}</span>
                      <span className="text-xs text-[#d83b01] font-semibold flex-shrink-0 ml-2">{current}/{p.reorderPoint ?? "--"}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#f3f2f1] overflow-hidden"><div className="h-full rounded-full bg-[#d83b01]" style={{ width: pct + "%" }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${F.card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#323130]">{t("afterSales.dashboard.warrantyTimeline")}</h3>
            <span className="text-xs text-[#a19f9d]">{t("afterSales.dashboard.nearestFirst")}</span>
          </div>
          <div className="space-y-2">
            {warrantyTimeline.length === 0 && <div className="text-sm text-[#a19f9d] text-center py-4">{t("afterSales.dashboard.noEquipment")}</div>}
            {warrantyTimeline.map((eq: any, i: number) => {
              const wc = warrantyColor(eq.daysRemaining);
              return (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#f3f2f1] last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wc.dot}`} />
                  <div className="flex-1 min-w-0"><span className="text-xs font-medium text-[#323130] truncate block">{eq.serialNumber || eq.modelName || "--"}</span></div>
                  <span className="text-xs text-[#605e5c] flex-shrink-0">{fmtDate(eq.warrantyEndDate)}</span>
                  <span className="text-xs font-semibold flex-shrink-0 w-14 text-right" style={{ color: (eq.daysRemaining ?? 999) < 30 ? "#d83b01" : (eq.daysRemaining ?? 999) <= 90 ? "#c19c00" : "#107c10" }}>{eq.daysRemaining}{t("afterSales.workbench.days")}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Main export */
export default function AfterSalesWorkbench() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("warranty");

  return (
    <div className={F.page}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#323130]">{t("afterSales.workbench.title")}</h1>
          <p className="text-sm text-[#605e5c] mt-1">{t("afterSales.workbench.desc")}</p>
        </div>

        <div className="border-b border-[#edebe9]">
          <nav className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const Icon: any = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 min-h-[44px] text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${isActive ? "border-[#0078d4] text-[#0078d4]" : "border-transparent text-[#605e5c] hover:text-[#323130] hover:border-[#c8c6c4]"}`}>
                  <Icon className="w-4 h-4" />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {activeTab === "warranty" && <WarrantyTab />}
          {activeTab === "spare" && <SparePartsTab />}
          {activeTab === "complaints" && <ComplaintsTab />}
          {activeTab === "penalties" && <PenaltiesTab />}
          {activeTab === "dashboard" && <DashboardTab />}
        </div>
      </div>
    </div>
  );
}
