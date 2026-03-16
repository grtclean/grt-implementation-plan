/**
 * SharePointSetupWizard — 6-step guided wizard for configuring
 * GRT ↔ SharePoint department mapping, site architecture, folder mappings, and sync policies.
 *
 * Steps: 0=Connection  1=Dept Mapping  2=Site Config  3=Folder Mapping  4=Review  5=Apply
 */
import { useState, useCallback } from "react";
import {
  CheckCircle2, AlertTriangle, ArrowRightLeft, ArrowRight, ArrowLeft,
  Cloud, FolderOpen, Loader2, Settings, ChevronRight, Building2, Globe,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { icon: Cloud,          labelZh: "连接检测",   labelEn: "Connection" },
  { icon: Building2,      labelZh: "部门映射",   labelEn: "Dept Mapping" },
  { icon: Globe,          labelZh: "站点配置",   labelEn: "Site Config" },
  { icon: FolderOpen,     labelZh: "文件夹映射", labelEn: "Folder Mapping" },
  { icon: ArrowRightLeft, labelZh: "策略确认",   labelEn: "Review" },
  { icon: Settings,       labelZh: "执行配置",   labelEn: "Apply" },
];

type SyncDir = "bidirectional" | "grt_to_sp" | "sp_to_grt";

interface MappingRow {
  grtFolderId: number;
  grtFolderName: string;
  sharepointPath: string;
  syncDirection: SyncDir;
  autoSync: boolean;
  dirty: boolean;
}

const SYNC_DIR_LABELS: Record<SyncDir, { zh: string; en: string }> = {
  bidirectional: { zh: "双向同步", en: "Bi-directional" },
  grt_to_sp:     { zh: "GRT→SP", en: "GRT→SP" },
  sp_to_grt:     { zh: "SP→GRT", en: "SP→GRT" },
};

function SyncDirIcon({ d }: { d: SyncDir }) {
  switch (d) {
    case "bidirectional": return <ArrowRightLeft className="w-3.5 h-3.5 text-[#0078d4]" />;
    case "grt_to_sp":     return <ArrowRight className="w-3.5 h-3.5 text-[#107c10]" />;
    case "sp_to_grt":     return <ArrowLeft className="w-3.5 h-3.5 text-[#8764b8]" />;
  }
}

export default function SharePointSetupWizard({ open, onOpenChange }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const utils = trpc.useUtils();

  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [applyResults, setApplyResults] = useState<{ id: number; ok: boolean; error?: string }[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyDone, setApplyDone] = useState(false);

  // ── Queries ──
  const configQuery = trpc.microsoftGraph.folderMapping.checkConfig.useQuery(undefined, {
    ...QUERY_OPTS, enabled: open,
  });
  const mappingsQuery = trpc.microsoftGraph.folderMapping.list.useQuery(undefined, {
    ...QUERY_OPTS, enabled: open,
  });
  const foldersQuery = trpc.collaborationDocs.listFolders.useQuery(undefined, {
    ...QUERY_OPTS, enabled: open,
  });
  const orgNodesQuery = trpc.microsoftGraph.orgNodes.list.useQuery(undefined, {
    ...QUERY_OPTS, enabled: open,
  });
  const deptMappingsQuery = trpc.microsoftGraph.departmentMapping.list.useQuery(undefined, {
    ...QUERY_OPTS, enabled: open,
  });

  // Sites queries
  const sitesQuery = trpc.microsoftGraph.sites.list.useQuery(undefined, {
    ...QUERY_OPTS, enabled: open,
  });
  const siteFolderTemplatesQuery = trpc.microsoftGraph.sites.folderTemplates.useQuery(
    { siteCode: "07_Project_Hub" }, { ...QUERY_OPTS, enabled: open },
  );

  // ── Mutations ──
  const seedMut = trpc.microsoftGraph.folderMapping.seedDefaults.useMutation();
  const upsertMut = trpc.microsoftGraph.folderMapping.upsert.useMutation();
  const seedOrgMut = trpc.microsoftGraph.orgNodes.seed.useMutation();
  const upsertDeptMut = trpc.microsoftGraph.departmentMapping.upsert.useMutation();
  const seedSitesMut = trpc.microsoftGraph.sites.seedDefaults.useMutation();
  const upsertSiteMut = trpc.microsoftGraph.sites.upsert.useMutation();

  // ── Init rows when entering step 1 ──
  const initRows = useCallback(() => {
    const existingMap = new Map<number, any>();
    for (const m of (mappingsQuery.data ?? []) as any[]) {
      existingMap.set(m.grtFolderId, m);
    }
    const folders = (foldersQuery.data ?? []) as any[];
    const newRows: MappingRow[] = folders.map((f: any) => {
      const ex = existingMap.get(f.id);
      return {
        grtFolderId: f.id,
        grtFolderName: f.name,
        sharepointPath: ex?.sharepointPath ?? "",
        syncDirection: ex?.syncDirection ?? "bidirectional",
        autoSync: ex?.autoSync ?? false,
        dirty: false,
      };
    });
    setRows(newRows);
  }, [mappingsQuery.data, foldersQuery.data]);

  const goNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      initRows();
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      runApply();
    }
  };
  const goBack = () => setStep(s => Math.max(0, s - 1));

  // ── Dept mapping helpers ──
  const orgNodes = orgNodesQuery.data ?? [] as any[];
  const deptMappings = deptMappingsQuery.data ?? [] as any[];

  const handleSeedOrg = async () => {
    try {
      await seedOrgMut.mutateAsync();
      await orgNodesQuery.refetch();
      await deptMappingsQuery.refetch();
    } catch { /* silent */ }
  };

  // ── Site config helpers ──
  const sitesList = sitesQuery.data ?? [] as any[];
  const siteTemplates = siteFolderTemplatesQuery.data ?? [] as any[];

  const handleSeedSites = async () => {
    try {
      await seedSitesMut.mutateAsync();
      await sitesQuery.refetch();
      await siteFolderTemplatesQuery.refetch();
    } catch { /* silent */ }
  };

  const handleSiteSyncPolicyChange = async (siteCode: string, syncPolicy: string) => {
    const site = (sitesList as any[]).find((s: any) => s.siteCode === siteCode);
    if (!site) return;
    try {
      await upsertSiteMut.mutateAsync({
        siteCode: site.siteCode, cluster: site.cluster, name: site.name,
        syncPolicy: syncPolicy as any, accessLevel: site.accessLevel,
      });
      await sitesQuery.refetch();
    } catch { /* silent */ }
  };

  const handleDeptAutoMirrorToggle = async (deptCode: string, currentAutoMirror: boolean) => {
    const node = (orgNodes as any[]).find((n: any) => n.code === deptCode);
    if (!node) return;
    try {
      await upsertDeptMut.mutateAsync({
        deptCode,
        spSiteId: node.spSiteId ?? "",
        spRootPath: node.spRootPath ?? "",
        autoMirror: !currentAutoMirror,
      });
      await deptMappingsQuery.refetch();
    } catch { /* silent */ }
  };

  const updateRow = (idx: number, patch: Partial<MappingRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch, dirty: true } : r));
  };

  const handleSeedDefaults = async () => {
    try {
      await seedMut.mutateAsync();
      await mappingsQuery.refetch();
      initRows();
    } catch {
      // silent
    }
  };

  const activeRows = rows.filter(r => r.sharepointPath.trim() !== "");

  const runApply = async () => {
    setStep(5);
    setApplying(true);
    setApplyDone(false);
    const results: { id: number; ok: boolean; error?: string }[] = [];
    for (const r of activeRows) {
      try {
        await upsertMut.mutateAsync({
          grtFolderId: r.grtFolderId,
          grtFolderName: r.grtFolderName,
          sharepointPath: r.sharepointPath,
          syncDirection: r.syncDirection,
          autoSync: r.autoSync,
        });
        results.push({ id: r.grtFolderId, ok: true });
      } catch (e: any) {
        results.push({ id: r.grtFolderId, ok: false, error: e?.message ?? "unknown" });
      }
      setApplyResults([...results]);
    }
    setApplying(false);
    setApplyDone(true);
  };

  const handleFinish = () => {
    utils.microsoftGraph.folderMapping.list.invalidate();
    utils.microsoftGraph.folderMapping.checkConfig.invalidate();
    setStep(0);
    setApplyResults([]);
    setApplyDone(false);
    onOpenChange(false);
  };

  // ── Stats for review ──
  const biCount = activeRows.filter(r => r.syncDirection === "bidirectional").length;
  const grtToSpCount = activeRows.filter(r => r.syncDirection === "grt_to_sp").length;
  const spToGrtCount = activeRows.filter(r => r.syncDirection === "sp_to_grt").length;
  const autoCount = activeRows.filter(r => r.autoSync).length;

  const configured = configQuery.data?.configured ?? false;
  const progressPct = activeRows.length > 0 ? (applyResults.length / activeRows.length) * 100 : 0;
  const successCount = applyResults.filter(r => r.ok).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#edebe9]">
          <DialogTitle className="text-base font-semibold text-[#323130]">
            {isEn ? "SharePoint Folder Mapping Setup" : "SharePoint 文件夹映射配置向导"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Stepper ── */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-[#edebe9] bg-[#faf9f8]">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-[#c8c6c4] mx-0.5" />}
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive ? "bg-[#0078d4] text-white" :
                    isDone ? "bg-[#deecf9] text-[#0078d4] cursor-pointer" :
                    "bg-[#f3f2f1] text-[#a19f9d]"
                  }`}
                  onClick={() => isDone && setStep(i)}
                  disabled={!isDone && !isActive}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {isEn ? s.labelEn : s.labelZh}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[300px]">

          {/* Step 0: Connection check */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-[#605e5c]">
                {isEn
                  ? "Checking Microsoft Graph API connection status..."
                  : "正在检测 Microsoft Graph API 连接状态..."}
              </p>
              {configQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#605e5c]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEn ? "Checking..." : "检测中..."}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${configured ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                    {configured
                      ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-[#323130]">
                        {configured
                          ? (isEn ? "Microsoft Graph Connected" : "Microsoft Graph 连接就绪")
                          : (isEn ? "Microsoft Graph Not Configured" : "Microsoft Graph 未配置")}
                      </p>
                      <p className="text-xs text-[#605e5c] mt-0.5">
                        {configured
                          ? (isEn ? "MICROSOFT_CLIENT_ID, CLIENT_SECRET, TENANT_ID are set." : "MICROSOFT_CLIENT_ID、CLIENT_SECRET、TENANT_ID 已配置。")
                          : (isEn ? "Please configure credentials in .env file. You can still pre-configure folder mappings." : "请在 .env 文件中配置凭证。您仍可预配文件夹映射规则。")}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${configQuery.data?.hasMappings ? "bg-[#deecf9] border-[#c7e0f4]" : "bg-[#f3f2f1] border-[#edebe9]"}`}>
                    <FolderOpen className="w-4 h-4 text-[#0078d4] shrink-0" />
                    <p className="text-xs text-[#323130]">
                      {configQuery.data?.hasMappings
                        ? (isEn ? "Existing folder mappings found. You can review and update them." : "已找到现有文件夹映射。您可以在下一步中查看和更新。")
                        : (isEn ? "No folder mappings yet. You can create them in the next step." : "尚无文件夹映射。您可以在下一步中创建。")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Department mapping (NEW) */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#605e5c]">
                  {isEn
                    ? "Configure each department's SharePoint site root. BU departments are data-isolated; functional departments have cross-BU access."
                    : "配置各部门的 SharePoint 站点根路径。BU部门数据隔离，职能部门跨BU访问。"}
                </p>
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0 ml-2"
                  onClick={handleSeedOrg} disabled={seedOrgMut.isPending}>
                  {seedOrgMut.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  {isEn ? "Seed Defaults" : "填充默认值"}
                </Button>
              </div>

              <div className="border border-[#edebe9] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#faf9f8]">
                    <tr className="border-b border-[#edebe9]">
                      <th className="text-left px-3 py-2 font-medium text-[#605e5c] w-[80px]">{isEn ? "Code" : "代码"}</th>
                      <th className="text-left px-3 py-2 font-medium text-[#605e5c] w-[120px]">{isEn ? "Department" : "部门"}</th>
                      <th className="text-left px-3 py-2 font-medium text-[#605e5c] w-[70px]">{isEn ? "Type" : "类型"}</th>
                      <th className="text-left px-3 py-2 font-medium text-[#605e5c]">{isEn ? "SP Site Path" : "SP站点路径"}</th>
                      <th className="text-center px-3 py-2 font-medium text-[#605e5c] w-[70px]">{isEn ? "Mirror" : "镜像"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orgNodes as any[]).map((node: any) => {
                      const mapping = (deptMappings as any[]).find((m: any) => m.deptCode === node.code);
                      const typeColors: Record<string, string> = {
                        bu: "bg-[#deecf9] text-[#0078d4]",
                        functional: "bg-[#dff6dd] text-[#107c10]",
                        support: "bg-[#e8daef] text-[#8764b8]",
                      };
                      return (
                        <tr key={node.code} className="border-b border-[#faf9f8] hover:bg-[#f3f2f1]">
                          <td className="px-3 py-1.5 font-mono font-medium text-[#323130]">{node.code}</td>
                          <td className="px-3 py-1.5 text-[#323130]">{node.name}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[node.type] ?? "bg-[#f3f2f1] text-[#605e5c]"}`}>
                              {node.type}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-[#605e5c] font-mono text-[10px]">{node.spRootPath || "-"}</td>
                          <td className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={mapping?.autoMirror ?? false}
                              onChange={() => handleDeptAutoMirrorToggle(node.code, mapping?.autoMirror ?? false)}
                              className="w-4 h-4 accent-[#0078d4]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {(orgNodes as any[]).length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-[#a19f9d]">
                        {isEn ? "No org nodes. Click 'Seed Defaults' to create." : "暂无组织节点。点击\"填充默认值\"创建。"}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-[#a19f9d]">
                {isEn
                  ? "When 'Mirror' is enabled, new GRT folders in this department will auto-create matching SharePoint folders."
                  : "启用\"镜像\"后，该部门新建的GRT文件夹将自动在SharePoint创建对应文件夹。"}
              </p>
            </div>
          )}

          {/* Step 2: Site configuration (NEW) */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#605e5c]">
                  {isEn
                    ? "Configure SharePoint site architecture (4 clusters). Each site represents a SharePoint site collection."
                    : "配置 SharePoint 站点架构 (4集群)。每个站点代表一个 SharePoint 站点集合。"}
                </p>
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0 ml-2"
                  onClick={handleSeedSites} disabled={seedSitesMut.isPending}>
                  {seedSitesMut.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  {isEn ? "Seed Sites" : "填充默认站点"}
                </Button>
              </div>

              {(["A", "B", "C", "D"] as const).map(cluster => {
                const clusterNames: Record<string, { zh: string; en: string }> = {
                  A: { zh: "公司级", en: "Company Wide" },
                  B: { zh: "支持职能", en: "Support Functions" },
                  C: { zh: "核心业务", en: "Core Business" },
                  D: { zh: "个人/外部", en: "Personal / External" },
                };
                const clusterColors: Record<string, string> = { A: "#0078d4", B: "#8764b8", C: "#107c10", D: "#d83b01" };
                const clusterSites = (sitesList as any[]).filter((s: any) => s.cluster === cluster);
                if (clusterSites.length === 0) return null;
                return (
                  <div key={cluster} className="border border-[#edebe9] rounded-lg overflow-hidden">
                    <div className="bg-[#faf9f8] px-3 py-1.5 flex items-center gap-2 border-b border-[#edebe9]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: clusterColors[cluster] }} />
                      <span className="text-xs font-bold" style={{ color: clusterColors[cluster] }}>Cluster {cluster}</span>
                      <span className="text-[10px] text-[#605e5c]">{isEn ? clusterNames[cluster].en : clusterNames[cluster].zh}</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-[#faf9f8]">
                        <tr className="border-b border-[#edebe9]">
                          <th className="text-left px-3 py-1.5 font-medium text-[#605e5c] w-[160px]">{isEn ? "Site Code" : "站点代码"}</th>
                          <th className="text-left px-3 py-1.5 font-medium text-[#605e5c]">{isEn ? "Name" : "名称"}</th>
                          <th className="text-left px-3 py-1.5 font-medium text-[#605e5c] w-[100px]">{isEn ? "Sync Policy" : "同步策略"}</th>
                          <th className="text-left px-3 py-1.5 font-medium text-[#605e5c] w-[80px]">{isEn ? "Template" : "模板"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clusterSites.map((site: any) => (
                          <tr key={site.siteCode} className="border-b border-[#faf9f8] hover:bg-[#f3f2f1]">
                            <td className="px-3 py-1.5 font-mono font-medium text-[#323130]">{site.siteCode}</td>
                            <td className="px-3 py-1.5 text-[#605e5c]">{isEn ? (site.nameEn ?? site.name) : site.name}</td>
                            <td className="px-3 py-1.5">
                              <select
                                className="h-6 w-full rounded border border-[#edebe9] bg-white text-[10px] px-1 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                                value={site.syncPolicy}
                                onChange={e => handleSiteSyncPolicyChange(site.siteCode, e.target.value)}
                              >
                                <option value="auto">{isEn ? "Auto" : "自动"}</option>
                                <option value="manual">{isEn ? "Manual" : "手动"}</option>
                                <option value="scheduled">{isEn ? "Scheduled" : "定时"}</option>
                                <option value="disabled">{isEn ? "Disabled" : "禁用"}</option>
                              </select>
                            </td>
                            <td className="px-3 py-1.5 text-[10px] text-[#a19f9d]">{site.folderTemplate ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {(sitesList as any[]).length === 0 && (
                <div className="text-center py-6 text-sm text-[#a19f9d]">
                  {isEn ? "No sites configured. Click 'Seed Sites' to populate defaults." : "暂无站点。点击\"填充默认站点\"创建。"}
                </div>
              )}

              {/* Project folder template preview */}
              {(siteTemplates as any[]).length > 0 && (
                <div className="border border-[#edebe9] rounded-lg p-3 bg-[#faf9f8]">
                  <p className="text-xs font-medium text-[#323130] mb-1.5">
                    {isEn ? "07_Project_Hub — 12-Folder Template:" : "07_项目中心 — 12子文件夹模板:"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(siteTemplates as any[]).map((t: any) => (
                      <span key={t.folderName} className="text-[9px] px-1.5 py-0.5 rounded bg-[#deecf9] text-[#0078d4] font-mono">
                        {isEn ? t.folderName : (t.folderNameZh ?? t.folderName)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Folder mapping */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#605e5c]">
                  {isEn ? "Configure SharePoint path for each GRT folder:" : "为每个 GRT 文件夹配置 SharePoint 路径:"}
                </p>
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  onClick={handleSeedDefaults} disabled={seedMut.isPending}>
                  {seedMut.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  {isEn ? "Fill Defaults" : "一键填充默认值"}
                </Button>
              </div>

              <div className="border border-[#edebe9] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#faf9f8]">
                    <tr className="border-b border-[#edebe9]">
                      <th className="text-left px-3 py-2 font-medium text-[#605e5c] w-[140px]">{isEn ? "GRT Folder" : "GRT 文件夹"}</th>
                      <th className="text-left px-3 py-2 font-medium text-[#605e5c]">{isEn ? "SharePoint Path" : "SharePoint 路径"}</th>
                      <th className="text-left px-3 py-2 font-medium text-[#605e5c] w-[130px]">{isEn ? "Direction" : "同步方向"}</th>
                      <th className="text-center px-3 py-2 font-medium text-[#605e5c] w-[70px]">{isEn ? "Auto" : "自动"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={r.grtFolderId} className="border-b border-[#faf9f8] hover:bg-[#f3f2f1]">
                        <td className="px-3 py-1.5 text-[#323130] font-medium">{r.grtFolderName}</td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            placeholder="/Engineering/..."
                            value={r.sharepointPath}
                            onChange={e => updateRow(idx, { sharepointPath: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            className="h-7 w-full rounded border border-[#edebe9] bg-white text-xs px-2 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                            value={r.syncDirection}
                            onChange={e => updateRow(idx, { syncDirection: e.target.value as SyncDir })}
                          >
                            {(Object.keys(SYNC_DIR_LABELS) as SyncDir[]).map(d => (
                              <option key={d} value={d}>{isEn ? SYNC_DIR_LABELS[d].en : SYNC_DIR_LABELS[d].zh}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={r.autoSync}
                            onChange={e => updateRow(idx, { autoSync: e.target.checked })}
                            className="w-4 h-4 accent-[#0078d4]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-[#a19f9d]">
                {isEn
                  ? "Leave SharePoint path empty to skip a folder. Only folders with a path will be synced."
                  : "SharePoint 路径留空表示跳过该文件夹。仅有路径的文件夹会被同步。"}
              </p>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-[#605e5c]">
                {isEn ? "Review the mappings before applying:" : "执行前请确认以下映射配置:"}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs px-2 py-1">
                  {isEn ? `${activeRows.length} mappings` : `${activeRows.length} 条映射`}
                </Badge>
                {biCount > 0 && <Badge className="bg-[#deecf9] text-[#0078d4] text-xs px-2 py-1">{biCount} {isEn ? "bi-dir" : "双向"}</Badge>}
                {grtToSpCount > 0 && <Badge className="bg-green-50 text-green-700 text-xs px-2 py-1">{grtToSpCount} GRT→SP</Badge>}
                {spToGrtCount > 0 && <Badge className="bg-purple-50 text-purple-700 text-xs px-2 py-1">{spToGrtCount} SP→GRT</Badge>}
                {autoCount > 0 && <Badge className="bg-amber-50 text-amber-700 text-xs px-2 py-1">{autoCount} {isEn ? "auto-sync" : "自动同步"}</Badge>}
              </div>

              {/* Mapping preview */}
              <div className="space-y-1.5">
                {activeRows.map(r => (
                  <div key={r.grtFolderId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#faf9f8] border border-[#edebe9] text-xs">
                    <FolderOpen className="w-3.5 h-3.5 text-[#ffb900] shrink-0" />
                    <span className="font-medium text-[#323130] w-[110px] truncate">{r.grtFolderName}</span>
                    <SyncDirIcon d={r.syncDirection} />
                    <Cloud className="w-3.5 h-3.5 text-[#0078d4] shrink-0" />
                    <span className="text-[#605e5c] flex-1 truncate">{r.sharepointPath}</span>
                    {r.autoSync && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{isEn ? "auto" : "自动"}</Badge>}
                  </div>
                ))}
              </div>

              {activeRows.length === 0 && (
                <div className="text-center py-6 text-sm text-[#a19f9d]">
                  {isEn ? "No mappings configured. Go back to add SharePoint paths." : "未配置任何映射。请返回上一步添加 SharePoint 路径。"}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Apply */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-[#605e5c]">
                {applying
                  ? (isEn ? "Applying folder mappings..." : "正在应用文件夹映射...")
                  : applyDone
                    ? (isEn ? `Configuration complete. ${successCount}/${activeRows.length} mappings saved.` : `配置完成。${successCount}/${activeRows.length} 条映射已保存。`)
                    : ""}
              </p>

              <Progress value={progressPct} className="h-2" />

              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {applyResults.map(r => {
                  const row = rows.find(x => x.grtFolderId === r.id);
                  return (
                    <div key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${r.ok ? "bg-green-50" : "bg-red-50"}`}>
                      {r.ok
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                      <span className="font-medium text-[#323130]">{row?.grtFolderName ?? `#${r.id}`}</span>
                      {r.ok
                        ? <span className="text-green-700">{isEn ? "saved" : "已保存"}</span>
                        : <span className="text-red-600 truncate">{r.error}</span>}
                    </div>
                  );
                })}
              </div>

              {applying && (
                <div className="flex items-center gap-2 text-xs text-[#605e5c]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {isEn ? "Processing..." : "处理中..."}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#edebe9] bg-[#faf9f8]">
          <Button variant="ghost" size="sm" onClick={goBack}
            disabled={step === 0 || step === 5}
            className="text-xs">
            {isEn ? "Back" : "上一步"}
          </Button>

          <div className="flex items-center gap-2">
            {step < 4 && (
              <Button size="sm" onClick={goNext} className="text-xs bg-[#0078d4] hover:bg-[#106ebe]">
                {isEn ? "Next" : "下一步"} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            )}
            {step === 4 && (
              <Button size="sm" onClick={goNext} disabled={activeRows.length === 0}
                className="text-xs bg-[#107c10] hover:bg-[#0e6027]">
                {isEn ? `Apply ${activeRows.length} Mappings` : `应用 ${activeRows.length} 条映射`}
              </Button>
            )}
            {step === 5 && applyDone && (
              <Button size="sm" onClick={handleFinish} className="text-xs bg-[#0078d4] hover:bg-[#106ebe]">
                {isEn ? "Done" : "完成"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
