/**
 * SOP Template Library — DB-backed
 * Browse, search, and create Standard Operating Procedures.
 *
 * Data source: trpc.sopDb.* (DB-backed via sopTemplates table)
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PageHeader, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Search, Plus, FileText, ChevronDown, ChevronUp,
  Clock, User, CheckCircle, AlertCircle, Archive, Edit,
  Copy, Filter, Tag,
} from "lucide-react";
import { STAGES } from "@shared/stage-definitions";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================
// Types & Constants
// ============================================================

type SOPCategory = "清洗工艺" | "质量检测" | "设备维护" | "安全操作" | "客户验收" | "包装运输";
type SOPStatus = "draft" | "review" | "approved" | "archived";

const CATEGORIES: SOPCategory[] = ["清洗工艺", "质量检测", "设备维护", "安全操作", "客户验收", "包装运输"];
const EQUIPMENT_MODELS = ["USC-3000", "USC-2000", "SPR-5000", "SPR-3000", "ASC-5000"];

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const statusColors = createStatusColorMap({
  draft: "slate",
  review: "yellow",
  approved: "green",
  archived: "slate",
});

const CATEGORY_COLORS: Record<string, string> = {
  "清洗工艺": "bg-blue-500/20 text-blue-400",
  "质量检测": "bg-green-500/20 text-green-400",
  "设备维护": "bg-orange-500/20 text-orange-400",
  "安全操作": "bg-red-500/20 text-red-400",
  "客户验收": "bg-purple-500/20 text-purple-400",
  "包装运输": "bg-cyan-500/20 text-cyan-400",
};

function deriveStatus(item: any): SOPStatus {
  if (item.isActive && item.approvedAt) return "approved";
  if (!item.isActive && item.approvedAt) return "archived";
  return "draft";
}

function stepsToContent(steps: any): string {
  if (!steps || !Array.isArray(steps)) return "";
  return steps.map((s: any, i: number) => `${i + 1}. ${s.description || s.title || ""}`).join("\n");
}

// ============================================================
// Component
// ============================================================

export default function SOPLibrary() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSOP, setNewSOP] = useState({ title: "", category: "" as string, content: "", equipmentModels: [] as string[], stages: [] as string[] });

  // ─── tRPC ───
  const listQuery = trpc.sop.list.useQuery(
    {
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    QUERY_OPTS,
  );
  const rawItems = (listQuery.data ?? []) as any[];

  const createMut = trpc.sop.create.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      setShowCreateDialog(false);
      setNewSOP({ title: "", category: "", content: "", equipmentModels: [], stages: [] });
      toast.success("SOP已创建");
    },
    onError: (err) => toast.error(err.message),
  });

  const versionMut = trpc.sop.version.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      toast.success("版本已升级");
    },
    onError: (err) => toast.error(err.message),
  });

  // Map DB items to display shape
  const allSOPs = useMemo(() => rawItems.map((item: any) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    category: item.category ?? "清洗工艺",
    version: item.version ?? "1.0",
    status: deriveStatus(item) as SOPStatus,
    content: stepsToContent(item.steps),
    equipmentModels: item.applicableProducts ?? [],
    stages: [] as string[],
    author: "",
    approver: "",
    effectiveDate: item.approvedAt ? String(item.approvedAt).slice(0, 10) : "",
  })), [rawItems]);

  // Client-side search filtering (server handles category/status)
  const filteredSOPs = useMemo(() => {
    if (!searchQuery) return allSOPs;
    const q = searchQuery.toLowerCase();
    return allSOPs.filter((s: any) => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [allSOPs, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) { counts[cat] = allSOPs.filter((s: any) => s.category === cat).length; }
    return counts;
  }, [allSOPs]);

  const handleCreate = () => {
    if (!newSOP.title.trim()) { toast.error("请输入SOP标题"); return; }
    if (!newSOP.category) { toast.error("请选择分类"); return; }
    createMut.mutate({
      title: newSOP.title.trim(),
      category: newSOP.category,
      content: newSOP.content.trim(),
      equipmentModels: newSOP.equipmentModels,
      stages: newSOP.stages,
    });
  };

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader icon={BookOpen} title={t("quality.sop.title")} description="..." />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={BookOpen}
          title={t("quality.sop.title")}
          description={t("quality.sop.description")}
          actions={
            <Button onClick={() => setShowCreateDialog(!showCreateDialog)}>
              <Plus className="w-4 h-4 mr-2" />{t("quality.sop.createSOP")}
            </Button>
          }
        />

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list"><FileText className="w-4 h-4 mr-1" />{t("quality.sop.tabList")}</TabsTrigger>
            <TabsTrigger value="categories"><Tag className="w-4 h-4 mr-1" />{t("quality.sop.tabCategories")}</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t("quality.sop.search")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]"><Filter className="w-4 h-4 mr-1" /><SelectValue placeholder={t("quality.sop.categoryField")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("quality.sop.allCategories")}</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("quality.common.status")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("quality.sop.allStatuses")}</SelectItem>
                  <SelectItem value="draft">{t("quality.sop.statusDraft")}</SelectItem>
                  <SelectItem value="review">{t("quality.sop.statusReviewing")}</SelectItem>
                  <SelectItem value="approved">{t("quality.sop.statusApproved")}</SelectItem>
                  <SelectItem value="archived">{t("quality.sop.statusArchived")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">{filteredSOPs.length} {t("quality.sop.sopRecords")}</p>

            {/* SOP List */}
            <div className="space-y-3">
              {filteredSOPs.map((sop: any) => {
                const statusLabelMap: Record<SOPStatus, string> = { draft: t("quality.sop.statusDraft"), review: t("quality.sop.statusReviewing"), approved: t("quality.sop.statusApproved"), archived: t("quality.sop.statusArchived") };
                const isExpanded = expandedId === sop.id;
                return (
                  <Card key={sop.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : sop.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground">{sop.code}</span>
                            <CardTitle className="text-base">{sop.title}</CardTitle>
                            <Badge className={CATEGORY_COLORS[sop.category] ?? ""}>{({ "清洗工艺": t("quality.sop.categoryCleaning"), "质量检测": t("quality.sop.categoryQuality"), "设备维护": t("quality.sop.categoryMaintenance"), "安全操作": t("quality.sop.categorySafety"), "客户验收": t("quality.sop.categoryAcceptance"), "包装运输": t("quality.sop.categoryPackaging") } as Record<string, string>)[sop.category] ?? sop.category}</Badge>
                            <StatusBadge color={(statusColors as any)[sop.status]}>{(statusLabelMap as any)[sop.status]}</StatusBadge>
                            <Badge variant="outline">v{sop.version}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {sop.author && <span className="flex items-center gap-1"><User className="w-3 h-3" />{sop.author}</span>}
                            {sop.effectiveDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("quality.sop.effectiveDate")} {sop.effectiveDate}</span>}
                            {sop.equipmentModels.length > 0 && <span>{t("quality.sop.applicableEquipment")} {sop.equipmentModels.join(", ")}</span>}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-0 space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="border-t pt-3">
                          <h4 className="font-medium mb-2">{t("quality.sop.operationLabel")}</h4>
                          <pre className="whitespace-pre-wrap text-sm bg-muted/50 rounded p-3">{sop.content || "—"}</pre>
                        </div>
                        {sop.stages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-sm text-muted-foreground mr-1">{t("quality.sop.phaseLabel")}:</span>
                            {sop.stages.map((s: string) => { const stage = STAGES.find(st => st.code === s); return <Badge key={s} variant="outline" className="text-xs">{s} {stage?.name}</Badge>; })}
                          </div>
                        )}
                        {sop.approver && <p className="text-sm text-muted-foreground">{t("quality.sop.approverLabel")}: {sop.approver}</p>}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => versionMut.mutate({ id: sop.id })} disabled={versionMut.isPending}><Copy className="w-3 h-3 mr-1" />{t("quality.sop.createNewVersion")}</Button>
                          <Button size="sm" variant="outline"><Edit className="w-3 h-3 mr-1" />{t("quality.sop.edit")}</Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
              {filteredSOPs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">暂无SOP记录</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="categories">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map(cat => (
                <Card key={cat} className="cursor-pointer hover:border-primary/50" onClick={() => { setCategoryFilter(cat); }}>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Badge className={CATEGORY_COLORS[cat]}>{({ "清洗工艺": t("quality.sop.categoryCleaning"), "质量检测": t("quality.sop.categoryQuality"), "设备维护": t("quality.sop.categoryMaintenance"), "安全操作": t("quality.sop.categorySafety"), "客户验收": t("quality.sop.categoryAcceptance"), "包装运输": t("quality.sop.categoryPackaging") } as Record<string, string>)[cat] ?? cat}</Badge></CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{categoryCounts[cat] ?? 0}</p><p className="text-sm text-muted-foreground">{t("quality.sop.sopCount")}</p></CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create SOP Dialog - inline panel */}
        {showCreateDialog && (
          <Card className="border-primary">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" />{t("quality.sop.createSOP")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("quality.sop.sopTitle")}</Label><Input placeholder={t("quality.sop.sopTitle")} value={newSOP.title} onChange={e => setNewSOP(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("quality.sop.categoryField")}</Label>
                  <Select value={newSOP.category} onValueChange={v => setNewSOP(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("quality.sop.categoryField")} /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{t("quality.sop.equipmentModel")}</Label>
                  <div className="flex flex-wrap gap-2">{EQUIPMENT_MODELS.map(m => (<Badge key={m} variant={newSOP.equipmentModels.includes(m) ? "default" : "outline"} className="cursor-pointer" onClick={() => setNewSOP(p => ({ ...p, equipmentModels: p.equipmentModels.includes(m) ? p.equipmentModels.filter(x => x !== m) : [...p.equipmentModels, m] }))}>{m}</Badge>))}</div>
                </div>
                <div className="space-y-2"><Label>{t("quality.sop.applicablePhase")}</Label>
                  <div className="flex flex-wrap gap-2">{STAGES.map(s => (<Badge key={s.code} variant={newSOP.stages.includes(s.code) ? "default" : "outline"} className="cursor-pointer" onClick={() => setNewSOP(p => ({ ...p, stages: p.stages.includes(s.code) ? p.stages.filter(x => x !== s.code) : [...p.stages, s.code] }))}>{s.code} {s.name}</Badge>))}</div>
                </div>
              </div>
              <div className="space-y-2"><Label>{t("quality.sop.operationContent")}</Label><Textarea placeholder={t("quality.sop.operationContent")} value={newSOP.content} onChange={e => setNewSOP(p => ({ ...p, content: e.target.value }))} rows={5} /></div>
              <div className="space-y-2"><Label>{t("quality.sop.attachmentUpload")}</Label><div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground"><AlertCircle className="w-6 h-6 mx-auto mb-2" /><p className="text-sm">{t("quality.sop.dragOrClickUpload")}</p></div></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("quality.sop.cancel")}</Button>
                <Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? "创建中..." : t("quality.sop.saveDraft")}</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
