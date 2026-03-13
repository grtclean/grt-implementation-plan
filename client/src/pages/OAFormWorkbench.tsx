import { useState } from "react";
import {
  FileText, Plus, Clock, CheckCircle, XCircle, Eye, Send, Star, StarOff,
  Filter, Search, ChevronRight, AlertCircle, Stamp, ShoppingCart, Plane,
  Receipt, FolderOpen, BarChart3,
} from "lucide-react";
import UniversalDynamicForm from "@/components/UniversalDynamicForm";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useZodForm, schemas, z } from "@/lib/form-validation";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Zod Schema for Template Creation ──────────────────────────
const createTemplateSchema = z.object({
  code: schemas.requiredString("Template code is required / 模板编码必填"),
  name: schemas.requiredString("Template name is required / 模板名称必填"),
  nameEn: z.string().optional(),
  desc: z.string().optional(),
  cat: z.string().default("general"),
  icon: z.string().optional(),
  color: z.string().optional(),
  fields: z.string().min(2, "Fields JSON is required / 字段定义必填").refine((val) => {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed); } catch { return false; }
  }, { message: "Invalid JSON array / 字段 JSON 格式错误" }),
});
type CreateTemplateValues = z.infer<typeof createTemplateSchema>;

const oaForms = trpc.oaForms;

// ── Icon / label / color maps ──────────────────────────────────
const ICON_MAP: Record<string, any> = {
  plane: Plane, "shopping-cart": ShoppingCart, receipt: Receipt,
  stamp: Stamp, "folder-open": FolderOpen, "file-text": FileText,
  "bar-chart": BarChart3, clock: Clock, "alert-circle": AlertCircle,
};
const resolveIcon = (n?: string | null) => (n && ICON_MAP[n]) || FileText;

const CATEGORY_KEYS = [
  { key: "all", labelKey: "admin.oaForm.catAll" }, { key: "hr", labelKey: "admin.oaForm.catHr" },
  { key: "admin", labelKey: "admin.oaForm.catAdmin" }, { key: "finance", labelKey: "admin.oaForm.catFinance" },
  { key: "project", labelKey: "admin.oaForm.catProject" },
] as const;
const CAT_LABEL_KEY: Record<string, string> = { hr: "admin.oaForm.catHr", admin: "admin.oaForm.catAdmin", finance: "admin.oaForm.catFinance", project: "admin.oaForm.catProject", general: "admin.oaForm.catGeneral" };

const STATUS_CFG: Record<string, { labelKey: string; bg: string; text: string }> = {
  draft: { labelKey: "admin.oaForm.statusDraft", bg: "bg-[#f3f2f1]", text: "text-[#605e5c]" },
  pending: { labelKey: "admin.oaForm.statusPending", bg: "bg-[#deecf9]", text: "text-[#0078d4]" },
  approved: { labelKey: "admin.oaForm.statusApproved", bg: "bg-[#dff6dd]", text: "text-[#107c10]" },
  rejected: { labelKey: "admin.oaForm.statusRejected", bg: "bg-[#fde7e9]", text: "text-[#d83b01]" },
  withdrawn: { labelKey: "admin.oaForm.statusWithdrawn", bg: "bg-[#fff4ce]", text: "text-[#c19c00]" },
  cancelled: { labelKey: "admin.oaForm.statusCancelled", bg: "bg-[#f3f2f1]", text: "text-[#a19f9d]" },
};
const PRIO_CFG: Record<string, { labelKey: string; bg: string; text: string }> = {
  normal: { labelKey: "admin.oaForm.prioNormal", bg: "bg-[#f3f2f1]", text: "text-[#605e5c]" },
  high: { labelKey: "admin.oaForm.prioHigh", bg: "bg-[#fff4ce]", text: "text-[#c19c00]" },
  urgent: { labelKey: "admin.oaForm.prioUrgent", bg: "bg-[#fde7e9]", text: "text-[#d83b01]" },
};

const COLOR_BAR: Record<string, string> = {
  blue: "bg-[#0078d4]", green: "bg-[#107c10]", orange: "bg-[#c19c00]",
  red: "bg-[#d83b01]", purple: "bg-[#8764b8]", teal: "bg-[#00b7c3]",
};
function resolveColorBar(c?: string | null) {
  if (!c) return "bg-[#0078d4]";
  for (const [k, v] of Object.entries(COLOR_BAR)) if (c.includes(k)) return v;
  return "bg-[#0078d4]";
}

// ── Inline Fluent components ───────────────────────────────────
function FluentCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`bg-white rounded-lg border border-[#edebe9] shadow-sm ${onClick ? "cursor-pointer hover:shadow-md hover:border-[#c8c6c4] transition-all" : ""} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
function FluentBadge({ children, bg, text }: { children: React.ReactNode; bg: string; text: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>{children}</span>;
}
function FluentButton({ children, variant = "default", size = "md", onClick, disabled = false, className = "", type }: {
  children: React.ReactNode; variant?: "default" | "primary" | "danger" | "success" | "ghost";
  size?: "sm" | "md"; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  const base = "inline-flex items-center justify-center font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sz = size === "sm" ? "px-2.5 py-1 text-xs gap-1" : "px-4 py-2 text-sm gap-2";
  const v: Record<string, string> = {
    default: "border border-[#8a8886] text-[#323130] bg-white hover:bg-[#f3f2f1]",
    primary: "bg-[#0078d4] text-white hover:bg-[#106ebe]",
    danger: "bg-[#d83b01] text-white hover:bg-[#c43501]",
    success: "bg-[#107c10] text-white hover:bg-[#0b6a0b]",
    ghost: "text-[#0078d4] hover:bg-[#f3f2f1]",
  };
  return <button type={type} className={`${base} ${sz} ${v[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
function StatCard({ label, value, icon: Icon, color = "#0078d4" }: { label: string; value: number | string; icon: any; color?: string }) {
  return (
    <FluentCard className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#323130]">{value}</p>
        <p className="text-xs text-[#605e5c]">{label}</p>
      </div>
    </FluentCard>
  );
}
function Skeleton({ type }: { type: "row" | "card" }) {
  if (type === "card") return (
    <div className="animate-pulse bg-white rounded-lg border border-[#edebe9] p-4 h-32">
      <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-[#f3f2f1] rounded-lg" /><div className="flex-1"><div className="h-4 bg-[#f3f2f1] rounded w-3/4 mb-2" /><div className="h-3 bg-[#f3f2f1] rounded w-1/2" /></div></div>
      <div className="h-3 bg-[#f3f2f1] rounded w-full" />
    </div>
  );
  return <div className="animate-pulse flex gap-4 py-3"><div className="h-4 bg-[#f3f2f1] rounded w-24" /><div className="h-4 bg-[#f3f2f1] rounded w-32" /><div className="h-4 bg-[#f3f2f1] rounded w-48" /><div className="h-4 bg-[#f3f2f1] rounded w-16" /></div>;
}
/** Reusable modal shell */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl border border-[#edebe9] w-full max-w-[95vw] md:max-w-lg max-h-[85vh] overflow-y-auto">{children}</div>
    </div>
  );
}

// ── Input helper (fluent text input) ───────────────────────────
const inputCls = "w-full px-3 py-2 text-sm border border-[#edebe9] rounded bg-white text-[#323130] placeholder:text-[#a19f9d] focus:outline-none focus:border-[#0078d4]";
const textareaCls = `${inputCls} resize-none`;

// ══════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════
const TABS = [
  { key: "gallery", labelKey: "admin.oaForm.tabGallery" },
  { key: "submissions", labelKey: "admin.oaForm.tabSubmissions" },
  { key: "approvals", labelKey: "admin.oaForm.tabApprovals" },
  { key: "admin", labelKey: "admin.oaForm.tabAdmin" },
  { key: "fill", labelKey: "admin.oaForm.tabFill" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function OAFormWorkbench() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const currentUserId = user?.id ?? 0;
  const [tab, setTab] = useState<TabKey>("gallery");
  const [catFilter, setCatFilter] = useState("all");
  const [selTpl, setSelTpl] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [success, setSuccess] = useState(false);
  // Dialogs
  const [viewSub, setViewSub] = useState<any>(null);
  const [approveDlg, setApproveDlg] = useState<any>(null);
  const [rejectDlg, setRejectDlg] = useState<any>(null);
  const [appComment, setAppComment] = useState("");
  const [rejReason, setRejReason] = useState("");
  const [createDlg, setCreateDlg] = useState(false);
  const ntForm = useZodForm({
    schema: createTemplateSchema,
    defaultValues: { code: "", name: "", nameEn: "", desc: "", cat: "general", icon: "", color: "", fields: "[]" },
  });

  // Data
  const tplQ = oaForms.listTemplates.useQuery({ activeOnly: tab === "gallery" });
  const subQ = oaForms.listSubmissions.useQuery({ applicantId: currentUserId }, { enabled: currentUserId > 0 });
  const pendQ = oaForms.getMyPendingApprovals.useQuery();
  const statsQ = oaForms.getStats.useQuery();
  const favQ = oaForms.listFavorites.useQuery();
  const allTplQ = oaForms.listTemplates.useQuery({ activeOnly: false });

  // Mutations
  const createSub = oaForms.createSubmission.useMutation();
  const approveMut = oaForms.approveSubmission.useMutation();
  const rejectMut = oaForms.rejectSubmission.useMutation();
  const addFav = oaForms.addFavorite.useMutation();
  const rmFav = oaForms.removeFavorite.useMutation();
  const createTpl = oaForms.createTemplate.useMutation();
  const updateTpl = oaForms.updateTemplate.useMutation();

  // Helpers
  const favIds = new Set((favQ.data?.items ?? []).map((f: any) => f.templateId));
  const pendItems = pendQ.data?.items ?? [];
  const stats = statsQ.data;

  function toggleFav(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    const fn = favIds.has(id) ? rmFav : addFav;
    fn.mutate({ templateId: id }, { onSuccess: () => favQ.refetch() });
  }

  function pickTemplate(tpl: any) { setSelTpl(tpl); setSuccess(false); setTab("fill"); }

  async function submitForm(values: Record<string, unknown>) {
    if (!selTpl) return;
    try {
      await createSub.mutateAsync({
        templateId: selTpl.id,
        title: `${selTpl.templateName} - ${new Date().toLocaleDateString("zh-CN")}`,
        formData: values as any, priority: "normal",
      });
      setSuccess(true); subQ.refetch();
      setTimeout(() => { setTab("submissions"); setSelTpl(null); setSuccess(false); }, 1500);
    } catch (err) {
      console.error("Submit failed:", err);
    }
  }

  function doApprove() {
    if (!approveDlg) return;
    approveMut.mutate(
      { submissionId: approveDlg.id, comment: appComment || undefined },
      { onSuccess: () => { setApproveDlg(null); setAppComment(""); pendQ.refetch(); } },
    );
  }
  function doReject() {
    if (!rejectDlg || !rejReason.trim()) return;
    rejectMut.mutate(
      { submissionId: rejectDlg.id, comment: rejReason },
      { onSuccess: () => { setRejectDlg(null); setRejReason(""); pendQ.refetch(); } },
    );
  }
  const doCreateTpl = ntForm.handleSubmit((data) => {
    const f = JSON.parse(data.fields); // Already validated by Zod refine
    createTpl.mutate({
      templateCode: data.code, templateName: data.name, templateNameEn: data.nameEn || undefined,
      description: data.desc || undefined, category: data.cat, icon: data.icon || undefined,
      color: data.color || undefined, fields: f,
    }, {
      onSuccess: () => {
        setCreateDlg(false);
        ntForm.reset();
        allTplQ.refetch(); tplQ.refetch();
      },
    });
  });
  function toggleActive(tpl: any) {
    updateTpl.mutate({ id: tpl.id, isActive: !tpl.isActive }, { onSuccess: () => { allTplQ.refetch(); tplQ.refetch(); } });
  }

  // Filtered data
  const templates = (tplQ.data?.items ?? []).filter((tpl: any) => {
    if (catFilter !== "all" && tpl.category !== catFilter) return false;
    if (search && !tpl.templateName?.includes(search) && !tpl.templateCode?.includes(search)) return false;
    return true;
  });
  const subs = (subQ.data?.items ?? []).filter((s: any) => {
    if (statusF !== "all" && s.status !== statusF) return false;
    if (search && !s.title?.includes(search) && !s.submissionCode?.includes(search)) return false;
    return true;
  });

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("zh-CN") : "-";

  // Top-level loading skeleton for initial page load
  if (tplQ.isLoading && statsQ.isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f8] p-6 space-y-6 animate-pulse">
        <div className="bg-white border-b border-[#edebe9] px-6 py-4 rounded-lg">
          <div className="h-6 bg-[#f3f2f1] rounded w-48 mb-2" />
          <div className="h-4 bg-[#f3f2f1] rounded w-80" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <FluentCard key={i} className="p-4 h-20"><Skeleton type="row" /></FluentCard>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <FluentCard key={i} className="p-4"><Skeleton type="card" /></FluentCard>)}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Header + Tabs */}
      <div className="bg-white border-b border-[#edebe9] px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#323130]">{t("admin.oaForm.title")}</h1>
            <p className="text-xs sm:text-sm text-[#605e5c] mt-0.5">{t("admin.oaForm.subtitle")}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
            <input type="text" placeholder={t("admin.oaForm.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-[#edebe9] rounded bg-white text-[#323130] placeholder:text-[#a19f9d] focus:outline-none focus:border-[#0078d4] w-full sm:w-48" />
          </div>
        </div>
        <div className="flex gap-0 mt-4 -mb-4 overflow-x-auto scrollbar-hide">
          {TABS.map((tb) => {
            if (tb.key === "fill" && !selTpl) return null;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className={`px-4 py-2.5 min-h-[44px] text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === tb.key ? "border-[#0078d4] text-[#0078d4]" : "border-transparent text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"}`}>
                {t(tb.labelKey)}
                {tb.key === "approvals" && pendItems.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#d83b01] text-white text-xs">{pendItems.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* ── Tab 1: Gallery ── */}
        {tab === "gallery" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label={t("admin.oaForm.statTemplates")} value={stats?.totalTemplates ?? 0} icon={FileText} color="#0078d4" />
              <StatCard label={t("admin.oaForm.statPending")} value={stats?.pendingSubmissions ?? 0} icon={Clock} color="#c19c00" />
              <StatCard label={t("admin.oaForm.statFavorites")} value={favQ.data?.total ?? 0} icon={Star} color="#8764b8" />
            </div>
            <div className="flex items-center gap-1 bg-white rounded-lg border border-[#edebe9] p-1 overflow-x-auto scrollbar-hide">
              {CATEGORY_KEYS.map((c) => (
                <button key={c.key} onClick={() => setCatFilter(c.key)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${catFilter === c.key ? "bg-[#0078d4] text-white font-semibold" : "text-[#605e5c] hover:bg-[#f3f2f1]"}`}>
                  {t(c.labelKey)}
                </button>
              ))}
            </div>
            {tplQ.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map((i) => <Skeleton key={i} type="card" />)}</div>
            ) : templates.length === 0 ? (
              <FluentCard className="p-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto text-[#a19f9d] mb-3" />
                <p className="text-[#605e5c] font-medium">{t("admin.oaForm.noTemplates")}</p>
                <p className="text-sm text-[#a19f9d] mt-1">{t("admin.oaForm.noTemplatesHint")}</p>
              </FluentCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl: any) => {
                  const Icon = resolveIcon(tpl.icon);
                  const fav = favIds.has(tpl.id);
                  return (
                    <FluentCard key={tpl.id} className="relative overflow-hidden" onClick={() => pickTemplate(tpl)}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${resolveColorBar(tpl.color)}`} />
                      <div className="p-4 pl-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#f3f2f1] flex items-center justify-center">
                              <Icon className="w-5 h-5 text-[#0078d4]" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-[#323130] truncate">{tpl.templateName}</h3>
                              <p className="text-xs text-[#a19f9d] mt-0.5 line-clamp-1">{tpl.description || tpl.templateNameEn || tpl.templateCode}</p>
                            </div>
                          </div>
                          <button onClick={(e) => toggleFav(tpl.id, e)} className="p-1 hover:bg-[#f3f2f1] rounded" title={fav ? t("admin.oaForm.removeFav") : t("admin.oaForm.addFav")}>
                            {fav ? <Star className="w-4 h-4 text-[#c19c00] fill-[#c19c00]" /> : <StarOff className="w-4 h-4 text-[#a19f9d]" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <FluentBadge bg="bg-[#f3f2f1]" text="text-[#605e5c]">{CAT_LABEL_KEY[tpl.category] ? t(CAT_LABEL_KEY[tpl.category]) : tpl.category}</FluentBadge>
                          <span className="text-xs text-[#a19f9d]">v{tpl.version ?? 1}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#a19f9d] ml-auto" />
                        </div>
                      </div>
                    </FluentCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: My Submissions ── */}
        {tab === "submissions" && (
          <div className="space-y-4">
            <FluentCard className="p-3 flex items-center gap-3">
              <Filter className="w-4 h-4 text-[#605e5c]" />
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)}
                className="border border-[#edebe9] rounded px-2 py-1 text-sm text-[#323130] bg-white focus:outline-none focus:border-[#0078d4]">
                <option value="all">{t("admin.oaForm.allStatus")}</option>
                <option value="draft">{t("admin.oaForm.statusDraft")}</option><option value="pending">{t("admin.oaForm.statusPending")}</option>
                <option value="approved">{t("admin.oaForm.statusApproved")}</option><option value="rejected">{t("admin.oaForm.statusRejected")}</option>
                <option value="withdrawn">{t("admin.oaForm.statusWithdrawn")}</option>
              </select>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
                <input type="text" placeholder={t("admin.oaForm.searchCodeTitle")} value={search} onChange={(e) => setSearch(e.target.value)}
                  className={`pl-8 pr-3 py-1 ${inputCls}`} />
              </div>
            </FluentCard>
            <FluentCard className="overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#edebe9] bg-[#faf9f8]">
                    {[t("admin.oaForm.thCode"),t("admin.oaForm.thFormType"),t("admin.oaForm.thTitle"),t("admin.oaForm.thStatus"),t("admin.oaForm.thPriority"),t("admin.oaForm.thCreatedAt"),t("admin.oaForm.thActions")].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subQ.isLoading ? [1,2,3].map((i) => <tr key={i} className="border-b border-[#edebe9]"><td colSpan={7} className="px-4"><Skeleton type="row" /></td></tr>)
                  : subs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12"><FileText className="w-10 h-10 mx-auto text-[#a19f9d] mb-2" /><p className="text-[#605e5c] text-sm">{t("admin.oaForm.noSubmissions")}</p></td></tr>
                  ) : subs.map((s: any) => {
                    const sc = STATUS_CFG[s.status] || STATUS_CFG.draft;
                    const pc = PRIO_CFG[s.priority] || PRIO_CFG.normal;
                    return (
                      <tr key={s.id} className="border-b border-[#edebe9] hover:bg-[#f3f2f1] transition-colors">
                        <td className="px-4 py-3 text-sm text-[#0078d4] font-medium">{s.submissionCode}</td>
                        <td className="px-4 py-3 text-sm text-[#605e5c]">{s.templateName}</td>
                        <td className="px-4 py-3 text-sm text-[#323130] max-w-[200px] truncate">{s.title}</td>
                        <td className="px-4 py-3"><FluentBadge bg={sc.bg} text={sc.text}>{t(sc.labelKey)}</FluentBadge></td>
                        <td className="px-4 py-3"><FluentBadge bg={pc.bg} text={pc.text}>{t(pc.labelKey)}</FluentBadge></td>
                        <td className="px-4 py-3 text-sm text-[#605e5c]">{fmtDate(s.createdAt)}</td>
                        <td className="px-4 py-3">
                          <FluentButton size="sm" variant="ghost" onClick={() => setViewSub(s)}><Eye className="w-3.5 h-3.5" /> {t("admin.oaForm.view")}</FluentButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </FluentCard>
          </div>
        )}

        {/* ── Tab 3: Pending Approvals ── */}
        {tab === "approvals" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#323130]">
              {t("admin.oaForm.pendingApprovals")}{pendItems.length > 0 && <span className="ml-2 text-sm font-normal text-[#605e5c]">({t("admin.oaForm.pendingCount").replace("{count}", String(pendItems.length))})</span>}
            </h2>
            {pendQ.isLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <FluentCard key={i} className="p-4"><Skeleton type="row" /></FluentCard>)}</div>
            ) : pendItems.length === 0 ? (
              <FluentCard className="p-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-[#107c10] mb-3" />
                <p className="text-[#323130] font-medium">{t("admin.oaForm.noPendingApprovals")}</p>
                <p className="text-sm text-[#a19f9d] mt-1">{t("admin.oaForm.allProcessed")}</p>
              </FluentCard>
            ) : (
              <div className="space-y-3">
                {pendItems.map((it: any) => {
                  const pc = PRIO_CFG[it.priority] || PRIO_CFG.normal;
                  return (
                    <FluentCard key={it.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#deecf9] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#0078d4]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-[#323130] truncate">{it.templateName}</h3>
                              <FluentBadge bg={pc.bg} text={pc.text}>{t(pc.labelKey)}</FluentBadge>
                            </div>
                            <p className="text-sm text-[#605e5c] truncate mt-0.5">{it.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-[#a19f9d]">
                              <span>{t("admin.oaForm.applicantLabel")}: {it.applicantName || t("admin.oaForm.unknown")}</span>
                              <span>{t("admin.oaForm.submitLabel")}: {fmtDate(it.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <FluentButton size="sm" variant="success" onClick={() => setApproveDlg(it)}>
                            <CheckCircle className="w-3.5 h-3.5" /> {t("admin.oaForm.passBtn")}
                          </FluentButton>
                          <FluentButton size="sm" variant="danger" onClick={() => setRejectDlg(it)}>
                            <XCircle className="w-3.5 h-3.5" /> {t("admin.oaForm.rejectBtn")}
                          </FluentButton>
                        </div>
                      </div>
                    </FluentCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: Template Management ── */}
        {tab === "admin" && (() => {
          const all = allTplQ.data?.items ?? [];
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#323130]">{t("admin.oaForm.templateMgmt")}</h2>
                <FluentButton variant="primary" onClick={() => setCreateDlg(true)}><Plus className="w-4 h-4" /> {t("admin.oaForm.newTemplate")}</FluentButton>
              </div>
              <FluentCard className="overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#edebe9] bg-[#faf9f8]">
                      {[t("admin.oaForm.thTplCode"),t("admin.oaForm.thTplName"),t("admin.oaForm.thCategory"),t("admin.oaForm.thFieldCount"),t("admin.oaForm.thVersion"),t("admin.oaForm.thApprovalSteps"),t("admin.oaForm.thStatus"),t("admin.oaForm.thActions")].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTplQ.isLoading ? [1,2,3].map((i) => <tr key={i} className="border-b border-[#edebe9]"><td colSpan={8} className="px-4"><Skeleton type="row" /></td></tr>)
                    : all.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12"><FolderOpen className="w-10 h-10 mx-auto text-[#a19f9d] mb-2" /><p className="text-[#605e5c] text-sm">{t("admin.oaForm.noTemplatesAdmin")}</p></td></tr>
                    ) : all.map((tpl: any) => {
                      const fc = Array.isArray(tpl.fields) ? tpl.fields.length : 0;
                      const steps = tpl.approvalFlow?.steps?.length ?? 0;
                      return (
                        <tr key={tpl.id} className="border-b border-[#edebe9] hover:bg-[#f3f2f1] transition-colors">
                          <td className="px-4 py-3 text-sm text-[#0078d4] font-mono">{tpl.templateCode}</td>
                          <td className="px-4 py-3 text-sm text-[#323130] font-medium">{tpl.templateName}</td>
                          <td className="px-4 py-3"><FluentBadge bg="bg-[#f3f2f1]" text="text-[#605e5c]">{CAT_LABEL_KEY[tpl.category] ? t(CAT_LABEL_KEY[tpl.category]) : tpl.category}</FluentBadge></td>
                          <td className="px-4 py-3 text-sm text-[#605e5c]">{fc}</td>
                          <td className="px-4 py-3 text-sm text-[#605e5c]">v{tpl.version ?? 1}</td>
                          <td className="px-4 py-3 text-sm text-[#605e5c]">{steps > 0 ? t("admin.oaForm.steps").replace("{count}", String(steps)) : <span className="text-[#a19f9d]">{t("admin.oaForm.noApproval")}</span>}</td>
                          <td className="px-4 py-3">
                            {tpl.isActive ? <FluentBadge bg="bg-[#dff6dd]" text="text-[#107c10]">{t("admin.oaForm.active")}</FluentBadge> : <FluentBadge bg="bg-[#f3f2f1]" text="text-[#a19f9d]">{t("admin.oaForm.inactive")}</FluentBadge>}
                          </td>
                          <td className="px-4 py-3">
                            <FluentButton size="sm" variant={tpl.isActive ? "default" : "primary"} onClick={() => toggleActive(tpl)}>{tpl.isActive ? t("admin.oaForm.inactive") : t("admin.oaForm.active")}</FluentButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </FluentCard>
            </div>
          );
        })()}

        {/* ── Tab 5: Fill Form ── */}
        {tab === "fill" && (
          !selTpl ? (
            <FluentCard className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-[#a19f9d] mb-3" />
              <p className="text-[#605e5c] font-medium">{t("admin.oaForm.selectTemplate")}</p>
              <FluentButton variant="primary" className="mt-4" onClick={() => setTab("gallery")}>{t("admin.oaForm.goToGallery")}</FluentButton>
            </FluentCard>
          ) : success ? (
            <FluentCard className="p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-[#107c10] mb-4" />
              <p className="text-lg font-semibold text-[#323130]">{t("admin.oaForm.submitSuccess")}</p>
              <p className="text-sm text-[#605e5c] mt-1">{t("admin.oaForm.redirecting")}</p>
            </FluentCard>
          ) : (() => {
            const Icon = resolveIcon(selTpl.icon);
            return (
              <div className="space-y-4">
                <FluentCard className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#deecf9] flex items-center justify-center">
                      <Icon className="w-6 h-6 text-[#0078d4]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[#323130]">{selTpl.templateName}</h2>
                      {selTpl.description && <p className="text-sm text-[#605e5c] mt-0.5">{selTpl.description}</p>}
                    </div>
                    <div className="ml-auto">
                      <FluentButton variant="ghost" onClick={() => { setSelTpl(null); setTab("gallery"); }}>{t("admin.oaForm.backToGallery")}</FluentButton>
                    </div>
                  </div>
                </FluentCard>
                <UniversalDynamicForm
                  fields={Array.isArray(selTpl.fields) ? selTpl.fields : []}
                  onSubmit={submitForm}
                  onCancel={() => { setSelTpl(null); setTab("gallery"); }}
                  submitLabel={t("admin.oaForm.submitApplication")} cancelLabel={t("admin.oaForm.backBtn")}
                  loading={createSub.isPending}
                />
              </div>
            );
          })()
        )}
      </div>

      {/* ══ Dialogs ═══════════════════════════════════════════ */}

      {/* View Submission */}
      {viewSub && (
        <Overlay onClose={() => setViewSub(null)}>
          <div className="sticky top-0 bg-white border-b border-[#edebe9] px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#323130]">{viewSub.title}</h3>
              <p className="text-xs text-[#a19f9d] mt-0.5">{viewSub.submissionCode}</p>
            </div>
            <FluentBadge bg={(STATUS_CFG[viewSub.status] || STATUS_CFG.draft).bg} text={(STATUS_CFG[viewSub.status] || STATUS_CFG.draft).text}>
              {t((STATUS_CFG[viewSub.status] || STATUS_CFG.draft).labelKey)}
            </FluentBadge>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[[t("admin.oaForm.viewApplicant"), viewSub.applicantName], [t("admin.oaForm.viewCreatedAt"), viewSub.createdAt ? new Date(viewSub.createdAt).toLocaleString() : "-"],
                [t("admin.oaForm.viewFormType"), viewSub.templateName], [t("admin.oaForm.viewCurrentApprover"), viewSub.currentApproverName || "-"]].map(([l, v]) => (
                <div key={l as string}><p className="text-xs text-[#a19f9d] font-medium">{l}</p><p className="text-sm text-[#323130]">{v as string}</p></div>
              ))}
            </div>
            {viewSub.rejectionReason && (
              <div className="bg-[#fde7e9] rounded p-3">
                <p className="text-xs font-medium text-[#d83b01]">{t("admin.oaForm.rejectionReason")}</p>
                <p className="text-sm text-[#323130] mt-1">{viewSub.rejectionReason}</p>
              </div>
            )}
            <div className="border-t border-[#edebe9] pt-3">
              <p className="text-xs text-[#605e5c] font-semibold mb-2 uppercase tracking-wide">{t("admin.oaForm.formData")}</p>
              {!viewSub.formData || Object.keys(viewSub.formData).length === 0 ? (
                <p className="text-sm text-[#a19f9d]">{t("admin.oaForm.noFormData")}</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(viewSub.formData).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="text-xs text-[#605e5c] font-medium min-w-[80px]">{k}:</span>
                      <span className="text-sm text-[#323130]">{v != null ? String(v) : "-"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-[#edebe9] px-5 py-3 flex justify-end">
            <FluentButton variant="default" onClick={() => setViewSub(null)}>{t("admin.oaForm.close")}</FluentButton>
          </div>
        </Overlay>
      )}

      {/* Approve Dialog */}
      {approveDlg && (
        <Overlay onClose={() => { setApproveDlg(null); setAppComment(""); }}>
          <div className="px-5 py-4 border-b border-[#edebe9]">
            <h3 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#107c10]" /> {t("admin.oaForm.confirmApprove")}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-[#605e5c]">{t("admin.oaForm.confirmApproveMsg")} <span className="font-medium text-[#323130]">{approveDlg.title}</span></p>
            <div>
              <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.approvalComment")}</label>
              <textarea value={appComment} onChange={(e) => setAppComment(e.target.value)}
                placeholder={t("admin.oaForm.approvalCommentPlaceholder")} rows={3} className={`mt-1.5 ${textareaCls}`} />
            </div>
          </div>
          <div className="px-5 py-3 border-t border-[#edebe9] flex justify-end gap-2">
            <FluentButton variant="default" onClick={() => { setApproveDlg(null); setAppComment(""); }}>{t("common.cancel")}</FluentButton>
            <FluentButton variant="success" onClick={doApprove} disabled={approveMut.isPending}>
              <CheckCircle className="w-4 h-4" /> {t("admin.oaForm.confirmApprove")}
            </FluentButton>
          </div>
        </Overlay>
      )}

      {/* Reject Dialog */}
      {rejectDlg && (
        <Overlay onClose={() => { setRejectDlg(null); setRejReason(""); }}>
          <div className="px-5 py-4 border-b border-[#edebe9]">
            <h3 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <XCircle className="w-5 h-5 text-[#d83b01]" /> {t("admin.oaForm.rejectApplication")}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-[#605e5c]">{t("admin.oaForm.rejectMsg")} <span className="font-medium text-[#323130]">{rejectDlg.title}</span></p>
            <div>
              <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.rejectReasonLabel")} <span className="text-[#d83b01]">*</span></label>
              <textarea value={rejReason} onChange={(e) => setRejReason(e.target.value)}
                placeholder={t("admin.oaForm.rejectReasonPlaceholder")} rows={3} className={`mt-1.5 ${textareaCls}`} />
              {!rejReason.trim() && (
                <p className="text-xs text-[#d83b01] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {t("admin.oaForm.rejectReasonRequired")}</p>
              )}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-[#edebe9] flex justify-end gap-2">
            <FluentButton variant="default" onClick={() => { setRejectDlg(null); setRejReason(""); }}>{t("common.cancel")}</FluentButton>
            <FluentButton variant="danger" onClick={doReject} disabled={rejectMut.isPending || !rejReason.trim()}>
              <XCircle className="w-4 h-4" /> {t("admin.oaForm.confirmReject")}
            </FluentButton>
          </div>
        </Overlay>
      )}

      {/* Create Template Dialog */}
      {createDlg && (
        <Overlay onClose={() => { setCreateDlg(false); ntForm.reset(); }}>
          <form onSubmit={doCreateTpl}>
          <div className="sticky top-0 bg-white px-5 py-4 border-b border-[#edebe9]">
            <h3 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#0078d4]" /> {t("admin.oaForm.createTemplate")}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.tplCode")} <span className="text-[#d83b01]">*</span></label>
                <input value={ntForm.watch("code")} onChange={(e) => ntForm.setValue("code", e.target.value, { shouldValidate: true })} placeholder={t("admin.oaForm.tplCodePlaceholder")} className={`mt-1 ${inputCls}`} />
                {ntForm.formState.errors.code && <p className="text-[#d83b01] text-xs mt-1">{ntForm.formState.errors.code.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.tplName")} <span className="text-[#d83b01]">*</span></label>
                <input value={ntForm.watch("name")} onChange={(e) => ntForm.setValue("name", e.target.value, { shouldValidate: true })} placeholder={t("admin.oaForm.tplNamePlaceholder")} className={`mt-1 ${inputCls}`} />
                {ntForm.formState.errors.name && <p className="text-[#d83b01] text-xs mt-1">{ntForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.tplNameEn")}</label>
                <input value={ntForm.watch("nameEn") || ""} onChange={(e) => ntForm.setValue("nameEn", e.target.value)} placeholder={t("admin.oaForm.tplNameEnPlaceholder")} className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.tplCategory")}</label>
                <select value={ntForm.watch("cat")} onChange={(e) => ntForm.setValue("cat", e.target.value)} className={`mt-1 ${inputCls}`}>
                  <option value="general">{t("admin.oaForm.catGeneral")}</option><option value="hr">{t("admin.oaForm.catHr")}</option>
                  <option value="admin">{t("admin.oaForm.catAdmin")}</option><option value="finance">{t("admin.oaForm.catFinance")}</option>
                  <option value="project">{t("admin.oaForm.catProject")}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.tplIcon")}</label>
                <input value={ntForm.watch("icon") || ""} onChange={(e) => ntForm.setValue("icon", e.target.value)} placeholder={t("admin.oaForm.tplIconPlaceholder")} className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.tplColor")}</label>
                <input value={ntForm.watch("color") || ""} onChange={(e) => ntForm.setValue("color", e.target.value)} placeholder={t("admin.oaForm.tplColorPlaceholder")} className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.tplDescription")}</label>
              <textarea value={ntForm.watch("desc") || ""} onChange={(e) => ntForm.setValue("desc", e.target.value)} placeholder={t("admin.oaForm.tplDescPlaceholder")} rows={2} className={`mt-1 ${textareaCls}`} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#323130]">{t("admin.oaForm.tplFields")} <span className="text-[#d83b01]">*</span></label>
              <textarea value={ntForm.watch("fields")} onChange={(e) => ntForm.setValue("fields", e.target.value, { shouldValidate: true })}
                placeholder='[{ "name": "reason", "label": "事由", "type": "textarea", "required": true }]'
                rows={8} className={`mt-1 ${textareaCls} font-mono`} />
              {ntForm.formState.errors.fields && <p className="text-[#d83b01] text-xs mt-1">{ntForm.formState.errors.fields.message}</p>}
              <p className="text-xs text-[#a19f9d] mt-1">{t("admin.oaForm.tplFieldsHint")}</p>
            </div>
          </div>
          <div className="sticky bottom-0 bg-white px-5 py-3 border-t border-[#edebe9] flex justify-end gap-2">
            <FluentButton type="button" variant="default" onClick={() => { setCreateDlg(false); ntForm.reset(); }}>{t("common.cancel")}</FluentButton>
            <FluentButton type="submit" variant="primary" disabled={createTpl.isPending}>
              <Send className="w-4 h-4" /> {t("admin.oaForm.createBtn")}
            </FluentButton>
          </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}
