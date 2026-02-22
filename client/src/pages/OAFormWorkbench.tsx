import { useState } from "react";
import {
  FileText, Plus, Clock, CheckCircle, XCircle, Eye, Send, Star, StarOff,
  Filter, Search, ChevronRight, AlertCircle, Stamp, ShoppingCart, Plane,
  Receipt, FolderOpen, BarChart3,
} from "lucide-react";
import UniversalDynamicForm from "@/components/UniversalDynamicForm";
import { trpc } from "@/lib/trpc";

const oaForms = trpc.oaForms;

// ── Icon / label / color maps ──────────────────────────────────
const ICON_MAP: Record<string, any> = {
  plane: Plane, "shopping-cart": ShoppingCart, receipt: Receipt,
  stamp: Stamp, "folder-open": FolderOpen, "file-text": FileText,
  "bar-chart": BarChart3, clock: Clock, "alert-circle": AlertCircle,
};
const resolveIcon = (n?: string | null) => (n && ICON_MAP[n]) || FileText;

const CATEGORIES = [
  { key: "all", label: "全部" }, { key: "hr", label: "人事" },
  { key: "admin", label: "行政" }, { key: "finance", label: "财务" },
  { key: "project", label: "项目" },
] as const;
const CAT_LABEL: Record<string, string> = { hr: "人事", admin: "行政", finance: "财务", project: "项目", general: "通用" };

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "草稿", bg: "bg-[#f3f2f1]", text: "text-[#605e5c]" },
  pending: { label: "审批中", bg: "bg-[#deecf9]", text: "text-[#0078d4]" },
  approved: { label: "已通过", bg: "bg-[#dff6dd]", text: "text-[#107c10]" },
  rejected: { label: "已驳回", bg: "bg-[#fde7e9]", text: "text-[#d83b01]" },
  withdrawn: { label: "已撤回", bg: "bg-[#fff4ce]", text: "text-[#c19c00]" },
  cancelled: { label: "已取消", bg: "bg-[#f3f2f1]", text: "text-[#a19f9d]" },
};
const PRIO_CFG: Record<string, { label: string; bg: string; text: string }> = {
  normal: { label: "普通", bg: "bg-[#f3f2f1]", text: "text-[#605e5c]" },
  high: { label: "高", bg: "bg-[#fff4ce]", text: "text-[#c19c00]" },
  urgent: { label: "紧急", bg: "bg-[#fde7e9]", text: "text-[#d83b01]" },
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
function FluentButton({ children, variant = "default", size = "md", onClick, disabled = false, className = "" }: {
  children: React.ReactNode; variant?: "default" | "primary" | "danger" | "success" | "ghost";
  size?: "sm" | "md"; onClick?: () => void; disabled?: boolean; className?: string;
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
  return <button className={`${base} ${sz} ${v[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
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
  { key: "gallery", label: "表单中心", en: "Form Gallery" },
  { key: "submissions", label: "我的申请", en: "My Submissions" },
  { key: "approvals", label: "待审批", en: "Pending Approvals" },
  { key: "admin", label: "模板管理", en: "Template Management" },
  { key: "fill", label: "填写表单", en: "Fill Form" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function OAFormWorkbench() {
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
  const [nt, setNt] = useState({ code: "", name: "", nameEn: "", desc: "", cat: "general", icon: "", color: "", fields: "[]" });

  // Data
  const tplQ = oaForms.listTemplates.useQuery({ activeOnly: tab === "gallery" });
  const subQ = oaForms.listSubmissions.useQuery({ applicantId: 1 }); // TODO: replace with auth context
  const pendQ = oaForms.getMyPendingApprovals.useQuery({ approverId: 1 }); // TODO: replace with auth context
  const statsQ = oaForms.getStats.useQuery();
  const favQ = oaForms.listFavorites.useQuery({ userId: 1 }); // TODO: replace with auth context
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
    fn.mutate({ userId: 1, templateId: id }, { onSuccess: () => favQ.refetch() }); // TODO: replace with auth context
  }

  function pickTemplate(t: any) { setSelTpl(t); setSuccess(false); setTab("fill"); }

  async function submitForm(values: Record<string, unknown>) {
    if (!selTpl) return;
    try {
      await createSub.mutateAsync({
        templateId: selTpl.id, applicantId: 1, applicantName: "当前用户", // TODO: replace with auth context
        title: `${selTpl.templateName} - ${new Date().toLocaleDateString("zh-CN")}`,
        formData: values, priority: "normal",
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
      { submissionId: approveDlg.id, approverId: 1, approverName: "当前用户", comment: appComment || undefined }, // TODO: replace with auth context
      { onSuccess: () => { setApproveDlg(null); setAppComment(""); pendQ.refetch(); } },
    );
  }
  function doReject() {
    if (!rejectDlg || !rejReason.trim()) return;
    rejectMut.mutate(
      { submissionId: rejectDlg.id, approverId: 1, approverName: "当前用户", comment: rejReason }, // TODO: replace with auth context
      { onSuccess: () => { setRejectDlg(null); setRejReason(""); pendQ.refetch(); } },
    );
  }
  function doCreateTpl() {
    let f: any[];
    try { f = JSON.parse(nt.fields); } catch { alert("字段 JSON 格式错误"); return; }
    createTpl.mutate({
      templateCode: nt.code, templateName: nt.name, templateNameEn: nt.nameEn || undefined,
      description: nt.desc || undefined, category: nt.cat, icon: nt.icon || undefined,
      color: nt.color || undefined, fields: f,
    }, {
      onSuccess: () => {
        setCreateDlg(false);
        setNt({ code: "", name: "", nameEn: "", desc: "", cat: "general", icon: "", color: "", fields: "[]" });
        allTplQ.refetch(); tplQ.refetch();
      },
    });
  }
  function toggleActive(t: any) {
    updateTpl.mutate({ id: t.id, isActive: !t.isActive }, { onSuccess: () => { allTplQ.refetch(); tplQ.refetch(); } });
  }

  // Filtered data
  const templates = (tplQ.data?.items ?? []).filter((t: any) => {
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (search && !t.templateName?.includes(search) && !t.templateCode?.includes(search)) return false;
    return true;
  });
  const subs = (subQ.data?.items ?? []).filter((s: any) => {
    if (statusF !== "all" && s.status !== statusF) return false;
    if (search && !s.title?.includes(search) && !s.submissionCode?.includes(search)) return false;
    return true;
  });

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("zh-CN") : "-";

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Header + Tabs */}
      <div className="bg-white border-b border-[#edebe9] px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#323130]">OA 动态表单引擎</h1>
            <p className="text-xs sm:text-sm text-[#605e5c] mt-0.5">Dynamic Form Engine -- 创建、提交、审批一站式管理</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
            <input type="text" placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-[#edebe9] rounded bg-white text-[#323130] placeholder:text-[#a19f9d] focus:outline-none focus:border-[#0078d4] w-full sm:w-48" />
          </div>
        </div>
        <div className="flex gap-0 mt-4 -mb-4 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            if (t.key === "fill" && !selTpl) return null;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} title={t.en}
                className={`px-4 py-2.5 min-h-[44px] text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.key ? "border-[#0078d4] text-[#0078d4]" : "border-transparent text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"}`}>
                {t.label}
                {t.key === "approvals" && pendItems.length > 0 && (
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
              <StatCard label="表单模板" value={stats?.totalTemplates ?? 0} icon={FileText} color="#0078d4" />
              <StatCard label="进行中申请" value={stats?.pendingSubmissions ?? 0} icon={Clock} color="#c19c00" />
              <StatCard label="我的收藏" value={favQ.data?.total ?? 0} icon={Star} color="#8764b8" />
            </div>
            <div className="flex items-center gap-1 bg-white rounded-lg border border-[#edebe9] p-1 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => setCatFilter(c.key)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${catFilter === c.key ? "bg-[#0078d4] text-white font-semibold" : "text-[#605e5c] hover:bg-[#f3f2f1]"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            {tplQ.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map((i) => <Skeleton key={i} type="card" />)}</div>
            ) : templates.length === 0 ? (
              <FluentCard className="p-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto text-[#a19f9d] mb-3" />
                <p className="text-[#605e5c] font-medium">暂无表单模板</p>
                <p className="text-sm text-[#a19f9d] mt-1">当前分类下没有可用模板</p>
              </FluentCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t: any) => {
                  const Icon = resolveIcon(t.icon);
                  const fav = favIds.has(t.id);
                  return (
                    <FluentCard key={t.id} className="relative overflow-hidden" onClick={() => pickTemplate(t)}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${resolveColorBar(t.color)}`} />
                      <div className="p-4 pl-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#f3f2f1] flex items-center justify-center">
                              <Icon className="w-5 h-5 text-[#0078d4]" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-[#323130] truncate">{t.templateName}</h3>
                              <p className="text-xs text-[#a19f9d] mt-0.5 line-clamp-1">{t.description || t.templateNameEn || t.templateCode}</p>
                            </div>
                          </div>
                          <button onClick={(e) => toggleFav(t.id, e)} className="p-1 hover:bg-[#f3f2f1] rounded" title={fav ? "取消收藏" : "收藏"}>
                            {fav ? <Star className="w-4 h-4 text-[#c19c00] fill-[#c19c00]" /> : <StarOff className="w-4 h-4 text-[#a19f9d]" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <FluentBadge bg="bg-[#f3f2f1]" text="text-[#605e5c]">{CAT_LABEL[t.category] ?? t.category}</FluentBadge>
                          <span className="text-xs text-[#a19f9d]">v{t.version ?? 1}</span>
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
                <option value="all">全部状态</option>
                <option value="draft">草稿</option><option value="pending">审批中</option>
                <option value="approved">已通过</option><option value="rejected">已驳回</option>
                <option value="withdrawn">已撤回</option>
              </select>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a19f9d]" />
                <input type="text" placeholder="搜索编号或标题..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className={`pl-8 pr-3 py-1 ${inputCls}`} />
              </div>
            </FluentCard>
            <FluentCard className="overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#edebe9] bg-[#faf9f8]">
                    {["申请编号","表单类型","标题","状态","优先级","创建时间","操作"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subQ.isLoading ? [1,2,3].map((i) => <tr key={i} className="border-b border-[#edebe9]"><td colSpan={7} className="px-4"><Skeleton type="row" /></td></tr>)
                  : subs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12"><FileText className="w-10 h-10 mx-auto text-[#a19f9d] mb-2" /><p className="text-[#605e5c] text-sm">暂无申请记录</p></td></tr>
                  ) : subs.map((s: any) => {
                    const sc = STATUS_CFG[s.status] || STATUS_CFG.draft;
                    const pc = PRIO_CFG[s.priority] || PRIO_CFG.normal;
                    return (
                      <tr key={s.id} className="border-b border-[#edebe9] hover:bg-[#f3f2f1] transition-colors">
                        <td className="px-4 py-3 text-sm text-[#0078d4] font-medium">{s.submissionCode}</td>
                        <td className="px-4 py-3 text-sm text-[#605e5c]">{s.templateName}</td>
                        <td className="px-4 py-3 text-sm text-[#323130] max-w-[200px] truncate">{s.title}</td>
                        <td className="px-4 py-3"><FluentBadge bg={sc.bg} text={sc.text}>{sc.label}</FluentBadge></td>
                        <td className="px-4 py-3"><FluentBadge bg={pc.bg} text={pc.text}>{pc.label}</FluentBadge></td>
                        <td className="px-4 py-3 text-sm text-[#605e5c]">{fmtDate(s.createdAt)}</td>
                        <td className="px-4 py-3">
                          <FluentButton size="sm" variant="ghost" onClick={() => setViewSub(s)}><Eye className="w-3.5 h-3.5" /> 查看</FluentButton>
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
              待审批申请{pendItems.length > 0 && <span className="ml-2 text-sm font-normal text-[#605e5c]">({pendItems.length} 项)</span>}
            </h2>
            {pendQ.isLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <FluentCard key={i} className="p-4"><Skeleton type="row" /></FluentCard>)}</div>
            ) : pendItems.length === 0 ? (
              <FluentCard className="p-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-[#107c10] mb-3" />
                <p className="text-[#323130] font-medium">暂无待审批申请</p>
                <p className="text-sm text-[#a19f9d] mt-1">所有申请已处理完毕</p>
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
                              <FluentBadge bg={pc.bg} text={pc.text}>{pc.label}</FluentBadge>
                            </div>
                            <p className="text-sm text-[#605e5c] truncate mt-0.5">{it.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-[#a19f9d]">
                              <span>申请人: {it.applicantName || "未知"}</span>
                              <span>提交: {fmtDate(it.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <FluentButton size="sm" variant="success" onClick={() => setApproveDlg(it)}>
                            <CheckCircle className="w-3.5 h-3.5" /> 通过
                          </FluentButton>
                          <FluentButton size="sm" variant="danger" onClick={() => setRejectDlg(it)}>
                            <XCircle className="w-3.5 h-3.5" /> 驳回
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
                <h2 className="text-lg font-semibold text-[#323130]">模板管理</h2>
                <FluentButton variant="primary" onClick={() => setCreateDlg(true)}><Plus className="w-4 h-4" /> 新建模板</FluentButton>
              </div>
              <FluentCard className="overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#edebe9] bg-[#faf9f8]">
                      {["编码","名称","分类","字段数","版本","审批步骤","状态","操作"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[#605e5c] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTplQ.isLoading ? [1,2,3].map((i) => <tr key={i} className="border-b border-[#edebe9]"><td colSpan={8} className="px-4"><Skeleton type="row" /></td></tr>)
                    : all.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12"><FolderOpen className="w-10 h-10 mx-auto text-[#a19f9d] mb-2" /><p className="text-[#605e5c] text-sm">暂无模板，请新建</p></td></tr>
                    ) : all.map((t: any) => {
                      const fc = Array.isArray(t.fields) ? t.fields.length : 0;
                      const steps = t.approvalFlow?.steps?.length ?? 0;
                      return (
                        <tr key={t.id} className="border-b border-[#edebe9] hover:bg-[#f3f2f1] transition-colors">
                          <td className="px-4 py-3 text-sm text-[#0078d4] font-mono">{t.templateCode}</td>
                          <td className="px-4 py-3 text-sm text-[#323130] font-medium">{t.templateName}</td>
                          <td className="px-4 py-3"><FluentBadge bg="bg-[#f3f2f1]" text="text-[#605e5c]">{CAT_LABEL[t.category] ?? t.category}</FluentBadge></td>
                          <td className="px-4 py-3 text-sm text-[#605e5c]">{fc}</td>
                          <td className="px-4 py-3 text-sm text-[#605e5c]">v{t.version ?? 1}</td>
                          <td className="px-4 py-3 text-sm text-[#605e5c]">{steps > 0 ? `${steps} 步` : <span className="text-[#a19f9d]">无审批</span>}</td>
                          <td className="px-4 py-3">
                            {t.isActive ? <FluentBadge bg="bg-[#dff6dd]" text="text-[#107c10]">启用</FluentBadge> : <FluentBadge bg="bg-[#f3f2f1]" text="text-[#a19f9d]">停用</FluentBadge>}
                          </td>
                          <td className="px-4 py-3">
                            <FluentButton size="sm" variant={t.isActive ? "default" : "primary"} onClick={() => toggleActive(t)}>{t.isActive ? "停用" : "启用"}</FluentButton>
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
              <p className="text-[#605e5c] font-medium">请先从表单中心选择一个模板</p>
              <FluentButton variant="primary" className="mt-4" onClick={() => setTab("gallery")}>前往表单中心</FluentButton>
            </FluentCard>
          ) : success ? (
            <FluentCard className="p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-[#107c10] mb-4" />
              <p className="text-lg font-semibold text-[#323130]">提交成功!</p>
              <p className="text-sm text-[#605e5c] mt-1">您的申请已提交，正在跳转至我的申请...</p>
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
                      <FluentButton variant="ghost" onClick={() => { setSelTpl(null); setTab("gallery"); }}>返回表单中心</FluentButton>
                    </div>
                  </div>
                </FluentCard>
                <UniversalDynamicForm
                  fields={Array.isArray(selTpl.fields) ? selTpl.fields : []}
                  onSubmit={submitForm}
                  onCancel={() => { setSelTpl(null); setTab("gallery"); }}
                  submitLabel="提交申请" cancelLabel="返回"
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
              {(STATUS_CFG[viewSub.status] || STATUS_CFG.draft).label}
            </FluentBadge>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[["申请人", viewSub.applicantName], ["创建时间", viewSub.createdAt ? new Date(viewSub.createdAt).toLocaleString("zh-CN") : "-"],
                ["表单类型", viewSub.templateName], ["当前审批人", viewSub.currentApproverName || "-"]].map(([l, v]) => (
                <div key={l as string}><p className="text-xs text-[#a19f9d] font-medium">{l}</p><p className="text-sm text-[#323130]">{v as string}</p></div>
              ))}
            </div>
            {viewSub.rejectionReason && (
              <div className="bg-[#fde7e9] rounded p-3">
                <p className="text-xs font-medium text-[#d83b01]">驳回原因</p>
                <p className="text-sm text-[#323130] mt-1">{viewSub.rejectionReason}</p>
              </div>
            )}
            <div className="border-t border-[#edebe9] pt-3">
              <p className="text-xs text-[#605e5c] font-semibold mb-2 uppercase tracking-wide">表单数据</p>
              {!viewSub.formData || Object.keys(viewSub.formData).length === 0 ? (
                <p className="text-sm text-[#a19f9d]">无表单数据</p>
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
            <FluentButton variant="default" onClick={() => setViewSub(null)}>关闭</FluentButton>
          </div>
        </Overlay>
      )}

      {/* Approve Dialog */}
      {approveDlg && (
        <Overlay onClose={() => { setApproveDlg(null); setAppComment(""); }}>
          <div className="px-5 py-4 border-b border-[#edebe9]">
            <h3 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#107c10]" /> 确认通过
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-[#605e5c]">确认通过申请: <span className="font-medium text-[#323130]">{approveDlg.title}</span></p>
            <div>
              <label className="text-sm font-medium text-[#323130]">审批意见 (可选)</label>
              <textarea value={appComment} onChange={(e) => setAppComment(e.target.value)}
                placeholder="输入审批意见..." rows={3} className={`mt-1.5 ${textareaCls}`} />
            </div>
          </div>
          <div className="px-5 py-3 border-t border-[#edebe9] flex justify-end gap-2">
            <FluentButton variant="default" onClick={() => { setApproveDlg(null); setAppComment(""); }}>取消</FluentButton>
            <FluentButton variant="success" onClick={doApprove} disabled={approveMut.isPending}>
              <CheckCircle className="w-4 h-4" /> 确认通过
            </FluentButton>
          </div>
        </Overlay>
      )}

      {/* Reject Dialog */}
      {rejectDlg && (
        <Overlay onClose={() => { setRejectDlg(null); setRejReason(""); }}>
          <div className="px-5 py-4 border-b border-[#edebe9]">
            <h3 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <XCircle className="w-5 h-5 text-[#d83b01]" /> 驳回申请
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-[#605e5c]">驳回申请: <span className="font-medium text-[#323130]">{rejectDlg.title}</span></p>
            <div>
              <label className="text-sm font-medium text-[#323130]">驳回原因 <span className="text-[#d83b01]">*</span></label>
              <textarea value={rejReason} onChange={(e) => setRejReason(e.target.value)}
                placeholder="请输入驳回原因 (必填)..." rows={3} className={`mt-1.5 ${textareaCls}`} />
              {!rejReason.trim() && (
                <p className="text-xs text-[#d83b01] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 驳回原因为必填项</p>
              )}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-[#edebe9] flex justify-end gap-2">
            <FluentButton variant="default" onClick={() => { setRejectDlg(null); setRejReason(""); }}>取消</FluentButton>
            <FluentButton variant="danger" onClick={doReject} disabled={rejectMut.isPending || !rejReason.trim()}>
              <XCircle className="w-4 h-4" /> 确认驳回
            </FluentButton>
          </div>
        </Overlay>
      )}

      {/* Create Template Dialog */}
      {createDlg && (
        <Overlay onClose={() => setCreateDlg(false)}>
          <div className="sticky top-0 bg-white px-5 py-4 border-b border-[#edebe9]">
            <h3 className="text-base font-semibold text-[#323130] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#0078d4]" /> 新建表单模板
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#323130]">模板编码 <span className="text-[#d83b01]">*</span></label>
                <input value={nt.code} onChange={(e) => setNt({ ...nt, code: e.target.value })} placeholder="如: TRAVEL_REQ" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">模板名称 <span className="text-[#d83b01]">*</span></label>
                <input value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} placeholder="如: 出差申请" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">英文名称</label>
                <input value={nt.nameEn} onChange={(e) => setNt({ ...nt, nameEn: e.target.value })} placeholder="如: Travel Request" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">分类</label>
                <select value={nt.cat} onChange={(e) => setNt({ ...nt, cat: e.target.value })} className={`mt-1 ${inputCls}`}>
                  <option value="general">通用</option><option value="hr">人事</option>
                  <option value="admin">行政</option><option value="finance">财务</option>
                  <option value="project">项目</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">图标</label>
                <input value={nt.icon} onChange={(e) => setNt({ ...nt, icon: e.target.value })} placeholder="如: plane, receipt" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#323130]">颜色</label>
                <input value={nt.color} onChange={(e) => setNt({ ...nt, color: e.target.value })} placeholder="如: blue-500" className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#323130]">描述</label>
              <textarea value={nt.desc} onChange={(e) => setNt({ ...nt, desc: e.target.value })} placeholder="模板用途描述..." rows={2} className={`mt-1 ${textareaCls}`} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#323130]">字段定义 (JSON) <span className="text-[#d83b01]">*</span></label>
              <textarea value={nt.fields} onChange={(e) => setNt({ ...nt, fields: e.target.value })}
                placeholder='[{ "name": "reason", "label": "事由", "type": "textarea", "required": true }]'
                rows={8} className={`mt-1 ${textareaCls} font-mono`} />
              <p className="text-xs text-[#a19f9d] mt-1">JSON 数组，每个元素包含 name, label, type, required 等字段</p>
            </div>
          </div>
          <div className="sticky bottom-0 bg-white px-5 py-3 border-t border-[#edebe9] flex justify-end gap-2">
            <FluentButton variant="default" onClick={() => setCreateDlg(false)}>取消</FluentButton>
            <FluentButton variant="primary" onClick={doCreateTpl} disabled={createTpl.isPending || !nt.code.trim() || !nt.name.trim()}>
              <Send className="w-4 h-4" /> 创建模板
            </FluentButton>
          </div>
        </Overlay>
      )}
    </div>
  );
}
