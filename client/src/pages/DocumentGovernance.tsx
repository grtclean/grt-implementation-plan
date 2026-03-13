/**
 * Document Governance Workbench — 文档治理中心
 *
 * 4-tab workbench:
 * 1. Registry (文档全览) — DataTable with filters, domain/type/status breakdown
 * 2. Templates (模板管理) — Card grid by domain, version history, usage stats
 * 3. Instances (文档实例) — Instance list with approval status badges
 * 4. Compliance (合规追踪) — Domain freshness heatmap, overdue reviews, owner coverage
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Library, FileText, FolderOpen, ShieldCheck, Search, Plus, Eye,
  Download, Edit, Clock, AlertTriangle, CheckCircle, XCircle,
  BarChart3, RefreshCw, Users, TrendingUp, Calendar,
} from "lucide-react";
import DocumentDetailDrawer from "@/components/DocumentDetailDrawer";
import TemplateEditor from "@/components/TemplateEditor";
import InstanceCreator from "@/components/InstanceCreator";

const DOMAINS = [
  "00-公司治理", "01-市场与销售", "02-研发设计", "03-项目管理", "04-生产制造",
  "05-质量管理", "06-供应链管理", "07-客户服务", "08-人力资源", "09-财务管理",
  "10-能力体系", "11-行政与OA", "12-IT与数字化", "13-事业部运营", "14-KPI与报表中心",
];

const DOC_TYPES = ["readme", "template", "policy", "sop", "register", "report"];
const STATUSES = ["draft", "active", "under_review", "superseded", "archived"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  under_review: "bg-yellow-100 text-yellow-700",
  superseded: "bg-orange-100 text-orange-700",
  archived: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function DocumentGovernance() {
  const { language } = useLanguage();
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const [activeTab, setActiveTab] = useState("registry");

  // Filters
  const [domainFilter, setDomainFilter] = useState("__all__");
  const [typeFilter, setTypeFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [searchQuery, setSearchQuery] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [registryPage, setRegistryPage] = useState(1);

  // Detail drawer
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Editor / Creator
  const [editorDocId, setEditorDocId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorTemplateId, setCreatorTemplateId] = useState<number | null>(null);

  // Instance filters
  const [instanceStatus, setInstanceStatus] = useState("__all__");
  const [instancePage, setInstancePage] = useState(1);

  // ─── Queries ────────────────────────────────────────────
  const registryQuery = trpc.orgDocument.registry.listDocuments.useQuery({
    domain: domainFilter === "__all__" ? undefined : domainFilter,
    docType: typeFilter === "__all__" ? undefined : typeFilter,
    status: statusFilter === "__all__" ? undefined : statusFilter,
    search: searchQuery || undefined,
    reviewOverdue: overdueOnly || undefined,
    page: registryPage,
    pageSize: 20,
  });

  const statsQuery = trpc.orgDocument.registry.getRegistryStats.useQuery();

  const instancesQuery = trpc.orgDocument.instance.listInstances.useQuery({
    status: instanceStatus === "__all__" ? undefined : instanceStatus,
    page: instancePage,
    pageSize: 20,
  });

  const complianceQuery = trpc.orgDocument.compliance.getComplianceDashboard.useQuery();
  const overdueQuery = trpc.orgDocument.compliance.getOverdueReviews.useQuery();

  // ─── Tab 1: Registry ───────────────────────────────────

  function renderRegistry() {
    const items = registryQuery.data?.items ?? [];
    const total = registryQuery.data?.total ?? 0;

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[160px]">
            <Label className="text-xs">{t("域", "Domain")}</Label>
            <Select value={domainFilter} onValueChange={(v) => { setDomainFilter(v); setRegistryPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("全部域", "All Domains")}</SelectItem>
                {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px]">
            <Label className="text-xs">{t("类型", "Type")}</Label>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setRegistryPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("全部", "All")}</SelectItem>
                {DOC_TYPES.map((dt) => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px]">
            <Label className="text-xs">{t("状态", "Status")}</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setRegistryPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("全部", "All")}</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <Label className="text-xs">{t("搜索", "Search")}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("搜索文档编号/标题...", "Search doc code/title...")}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setRegistryPage(1); }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={overdueOnly} onCheckedChange={(v) => { setOverdueOnly(v); setRegistryPage(1); }} />
            <Label className="text-xs text-red-600">{t("仅逾期", "Overdue Only")}</Label>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 whitespace-nowrap">{t("编号", "Code")}</th>
                <th className="text-left p-3">{t("标题", "Title")}</th>
                <th className="text-left p-3 whitespace-nowrap">{t("域", "Domain")}</th>
                <th className="text-left p-3 whitespace-nowrap">{t("类型", "Type")}</th>
                <th className="text-left p-3 whitespace-nowrap">{t("状态", "Status")}</th>
                <th className="text-left p-3 whitespace-nowrap">{t("版本", "Version")}</th>
                <th className="text-left p-3 whitespace-nowrap">{t("Owner", "Owner")}</th>
                <th className="text-right p-3 whitespace-nowrap">{t("使用", "Uses")}</th>
                <th className="text-left p-3 whitespace-nowrap">{t("操作", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((doc) => (
                <tr key={doc.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedDocId(doc.id); setDrawerOpen(true); }}>
                  <td className="p-3 font-mono text-xs whitespace-nowrap">{doc.docCode}</td>
                  <td className="p-3 max-w-[300px] truncate">
                    {doc.title}
                    {doc.reviewOverdue && <AlertTriangle className="inline ml-1 h-3.5 w-3.5 text-red-500" />}
                  </td>
                  <td className="p-3 text-xs whitespace-nowrap">{doc.domain?.split("-").pop()}</td>
                  <td className="p-3"><Badge variant="outline" className="text-xs">{doc.docType}</Badge></td>
                  <td className="p-3"><Badge className={`text-xs ${STATUS_COLORS[doc.status] || ""}`}>{doc.status}</Badge></td>
                  <td className="p-3 font-mono text-xs">{doc.currentVersion}</td>
                  <td className="p-3 text-xs whitespace-nowrap">{doc.ownerRole || "—"}</td>
                  <td className="p-3 text-right text-xs">{doc.usageCount}</td>
                  <td className="p-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedDocId(doc.id); setDrawerOpen(true); }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditorDocId(doc.id); setEditorOpen(true); }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">{t("暂无文档", "No documents found")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t(`共 ${total} 条`, `${total} documents total`)}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={registryPage <= 1} onClick={() => setRegistryPage((p) => p - 1)}>
              {t("上一页", "Prev")}
            </Button>
            <Button size="sm" variant="outline" disabled={items.length < 20} onClick={() => setRegistryPage((p) => p + 1)}>
              {t("下一页", "Next")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tab 2: Templates ──────────────────────────────────

  function renderTemplates() {
    const items = registryQuery.data?.items?.filter((d) => d.docType === "template") ?? [];
    // Group by domain
    const grouped = useMemo(() => {
      const map: Record<string, typeof items> = {};
      for (const item of items) {
        if (!map[item.domain]) map[item.domain] = [];
        map[item.domain].push(item);
      }
      return map;
    }, [items]);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{t("模板库", "Template Library")}</h3>
          <Badge variant="outline" className="text-sm">
            {items.length} {t("个模板", "templates")}
          </Badge>
        </div>

        {Object.entries(grouped).map(([domain, templates]) => (
          <div key={domain}>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              <FolderOpen className="inline h-4 w-4 mr-1" />
              {domain}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="truncate">{tpl.title}</span>
                      <Badge variant="outline" className="text-xs ml-2 shrink-0">{tpl.currentVersion}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{t("使用", "Uses")}: {tpl.usageCount}</span>
                      <span>{tpl.ownerRole || "—"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setCreatorTemplateId(tpl.id); setCreatorOpen(true); }}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t("使用", "Use")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditorDocId(tpl.id); setEditorOpen(true); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedDocId(tpl.id); setDrawerOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {t("暂无模板。请先导入文档。", "No templates yet. Import documents first.")}
          </div>
        )}
      </div>
    );
  }

  // ─── Tab 3: Instances ──────────────────────────────────

  function renderInstances() {
    const items = instancesQuery.data?.items ?? [];
    const total = instancesQuery.data?.total ?? 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={instanceStatus} onValueChange={(v) => { setInstanceStatus(v); setInstancePage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("全部状态", "All Status")}</SelectItem>
                <SelectItem value="draft">{t("草稿", "Draft")}</SelectItem>
                <SelectItem value="pending">{t("审批中", "Pending")}</SelectItem>
                <SelectItem value="approved">{t("已通过", "Approved")}</SelectItem>
                <SelectItem value="rejected">{t("已驳回", "Rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => setCreatorOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />{t("创建实例", "Create Instance")}
          </Button>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">{t("编号", "Code")}</th>
                <th className="text-left p-3">{t("标题", "Title")}</th>
                <th className="text-left p-3">{t("模板版本", "Template Ver.")}</th>
                <th className="text-left p-3">{t("项目", "Project")}</th>
                <th className="text-left p-3">{t("BU", "BU")}</th>
                <th className="text-left p-3">{t("状态", "Status")}</th>
                <th className="text-left p-3">{t("创建人", "Creator")}</th>
                <th className="text-left p-3">{t("创建时间", "Created")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inst) => (
                <tr key={inst.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{inst.instanceCode}</td>
                  <td className="p-3 max-w-[250px] truncate">{inst.title}</td>
                  <td className="p-3 text-xs">{inst.templateVersion}</td>
                  <td className="p-3 text-xs">{inst.projectCode || "—"}</td>
                  <td className="p-3 text-xs">{inst.buCode || "—"}</td>
                  <td className="p-3">
                    <Badge className={`text-xs ${STATUS_COLORS[inst.status] || ""}`}>{inst.status}</Badge>
                  </td>
                  <td className="p-3 text-xs">{inst.createdByName || "—"}</td>
                  <td className="p-3 text-xs">{inst.createdAt ? new Date(inst.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t("暂无实例", "No instances")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t(`共 ${total} 条`, `${total} total`)}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={instancePage <= 1} onClick={() => setInstancePage((p) => p - 1)}>{t("上一页", "Prev")}</Button>
            <Button size="sm" variant="outline" disabled={items.length < 20} onClick={() => setInstancePage((p) => p + 1)}>{t("下一页", "Next")}</Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tab 4: Compliance ─────────────────────────────────

  function renderCompliance() {
    const data = complianceQuery.data;
    const overdueList = overdueQuery.data ?? [];

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("文档总数", "Total Docs")}</p>
                  <p className="text-2xl font-bold">{data?.totalDocs ?? 0}</p>
                </div>
                <Library className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("活跃文档", "Active Docs")}</p>
                  <p className="text-2xl font-bold text-green-600">{data?.activeDocs ?? 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("逾期评审", "Overdue")}</p>
                  <p className="text-2xl font-bold text-red-600">{data?.overdueCount ?? 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("Owner覆盖率", "Owner Coverage")}</p>
                  <p className="text-2xl font-bold">{data?.ownerCoverage ?? 0}%</p>
                </div>
                <Users className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Domain Freshness Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("域级新鲜度热力图", "Domain Freshness Heatmap")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {data?.domainFreshness && Object.entries(data.domainFreshness).map(([domain, info]) => {
                const rate = info.total > 0 ? Math.round(((info.total - info.overdue) / info.total) * 100) : 100;
                const color = rate >= 80 ? "bg-green-100 border-green-300" : rate >= 50 ? "bg-yellow-100 border-yellow-300" : "bg-red-100 border-red-300";
                return (
                  <div key={domain} className={`p-3 rounded-lg border ${color} text-center`}>
                    <p className="text-xs font-medium truncate">{domain.split("-").pop()}</p>
                    <p className="text-lg font-bold">{rate}%</p>
                    <p className="text-[10px] text-muted-foreground">{info.total} {t("文档", "docs")}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {t("逾期未评审文档", "Overdue Reviews")}
              <Badge variant="destructive" className="ml-auto">{overdueList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueList.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {overdueList.slice(0, 20).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.domain} / {doc.subdomain} — {doc.ownerRole || "No owner"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600">{doc.nextReviewDueAt ? new Date(doc.nextReviewDueAt).toLocaleDateString() : "—"}</p>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedDocId(doc.id); setDrawerOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("无逾期文档", "No overdue documents")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────

  const stats = statsQuery.data;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Library className="h-5 w-5" />
            {t("文档治理中心", "Document Governance Center")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "企业文档注册表 · 模板版本控制 · 实例审批 · 合规追踪",
              "Enterprise registry · Template versioning · Instance approvals · Compliance tracking",
            )}
          </p>
        </div>
        {stats && (
          <div className="hidden md:flex gap-4 text-sm text-muted-foreground">
            <span>{stats.total} {t("文档", "docs")}</span>
            <span>{stats.byType?.template ?? 0} {t("模板", "templates")}</span>
            <span className={stats.overdueCount > 0 ? "text-red-600 font-medium" : ""}>
              {stats.overdueCount} {t("逾期", "overdue")}
            </span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="registry" className="gap-1">
            <FileText className="h-4 w-4" />{t("文档全览", "Registry")}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1">
            <FolderOpen className="h-4 w-4" />{t("模板管理", "Templates")}
          </TabsTrigger>
          <TabsTrigger value="instances" className="gap-1">
            <Library className="h-4 w-4" />{t("文档实例", "Instances")}
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1">
            <ShieldCheck className="h-4 w-4" />{t("合规追踪", "Compliance")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry">{renderRegistry()}</TabsContent>
        <TabsContent value="templates">{renderTemplates()}</TabsContent>
        <TabsContent value="instances">{renderInstances()}</TabsContent>
        <TabsContent value="compliance">{renderCompliance()}</TabsContent>
      </Tabs>

      {/* Detail Drawer */}
      {selectedDocId && (
        <DocumentDetailDrawer
          docId={selectedDocId}
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelectedDocId(null); }}
          onEdit={(id) => { setEditorDocId(id); setEditorOpen(true); setDrawerOpen(false); }}
        />
      )}

      {/* Template Editor */}
      {editorDocId && (
        <TemplateEditor
          docId={editorDocId}
          open={editorOpen}
          onClose={() => { setEditorOpen(false); setEditorDocId(null); }}
          onSaved={() => { registryQuery.refetch(); toast.success(t("保存成功", "Saved")); }}
        />
      )}

      {/* Instance Creator */}
      <InstanceCreator
        open={creatorOpen}
        templateId={creatorTemplateId}
        onClose={() => { setCreatorOpen(false); setCreatorTemplateId(null); }}
        onCreated={() => { instancesQuery.refetch(); setActiveTab("instances"); toast.success(t("创建成功", "Created")); }}
      />
    </div>
  );
}
