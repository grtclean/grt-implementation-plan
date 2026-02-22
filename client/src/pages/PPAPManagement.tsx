/**
 * PPAP管理页面
 * IATF 16949 — 生产件批准流程（18元素管理）
 *
 * Tab 1: PPAP提交列表 — stat cards, create, status badges, L1-L5, submit/approve
 * Tab 2: PPAP详情 — 18-element checklist, progress bar, element toggles, doc path
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ClipboardList, Plus, Search, FileCheck2, Send, CheckCircle2,
  XCircle, Clock, AlertTriangle, ArrowLeft, FileText, Loader2,
  ShieldCheck, FolderOpen,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-500/15 text-gray-700" },
  submitted: { label: "已提交", color: "bg-blue-500/15 text-blue-700" },
  approved: { label: "已批准", color: "bg-green-500/15 text-green-700" },
  rejected: { label: "已驳回", color: "bg-red-500/15 text-red-700" },
  interim_approved: { label: "有条件批准", color: "bg-orange-500/15 text-orange-700" },
};

const LEVEL_COLORS: Record<string, string> = {
  "1": "bg-sky-500/15 text-sky-700",
  "2": "bg-indigo-500/15 text-indigo-700",
  "3": "bg-violet-500/15 text-violet-700",
  "4": "bg-fuchsia-500/15 text-fuchsia-700",
  "5": "bg-rose-500/15 text-rose-700",
};

const ELEMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  not_started: { label: "未开始", color: "bg-gray-500/15 text-gray-700" },
  in_progress: { label: "进行中", color: "bg-blue-500/15 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-500/15 text-green-700" },
  not_applicable: { label: "不适用", color: "bg-yellow-500/15 text-yellow-700" },
  rejected: { label: "已驳回", color: "bg-red-500/15 text-red-700" },
};

function StatusBadgeInline({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const s = map[status] ?? { label: status, color: "bg-gray-200 text-gray-700" };
  return <Badge variant="outline" className={`${s.color} border-0 text-xs`}>{s.label}</Badge>;
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
}

// ─── Tab 1: PPAP提交列表 ────────────────────────────────────────

function SubmissionListTab({ onSelect }: { onSelect: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ partName: "", partNumber: "", revision: "", customerName: "", submissionLevel: "3" as string, submissionReason: "", notes: "" });

  const utils = trpc.useUtils();
  const statsQ = trpc.ppap.getStats.useQuery({});
  const listQ = trpc.ppap.list.useQuery({});
  const createMut = trpc.ppap.create.useMutation({
    onSuccess: () => { toast.success("PPAP提交已创建"); setShowCreate(false); resetForm(); utils.ppap.list.invalidate(); utils.ppap.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.ppap.update.useMutation({
    onSuccess: () => { toast.success("状态已更新"); utils.ppap.list.invalidate(); utils.ppap.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() { setForm({ partName: "", partNumber: "", revision: "", customerName: "", submissionLevel: "3", submissionReason: "", notes: "" }); }

  function handleCreate() {
    if (!form.partName || !form.partNumber) { toast.error("零件名称和零件号为必填项"); return; }
    createMut.mutate({ partName: form.partName, partNumber: form.partNumber, revision: form.revision || undefined, customerName: form.customerName || undefined, submissionLevel: form.submissionLevel as "1" | "2" | "3" | "4" | "5", submissionReason: form.submissionReason || undefined, notes: form.notes || undefined });
  }

  const stats = statsQ.data;
  const items = (listQ.data?.items ?? []).filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return it.partName?.toLowerCase().includes(q) || it.partNumber?.toLowerCase().includes(q) || it.submissionCode?.toLowerCase().includes(q) || it.customerName?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={ClipboardList} label="总提交数" value={stats?.total ?? 0} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={FileText} label="草稿" value={stats?.byStatus?.draft ?? 0} iconColor="text-gray-500" iconBg="bg-gray-500/10" />
        <StatCard icon={Send} label="已提交" value={stats?.byStatus?.submitted ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="已批准" value={stats?.byStatus?.approved ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={XCircle} label="已驳回" value={stats?.byStatus?.rejected ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索零件名称 / 编号 / 客户..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />新建PPAP</Button>
      </div>

      {/* List */}
      {listQ.isLoading ? <LoadingSkeleton rows={5} /> : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">暂无PPAP提交记录</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => onSelect(it.id)}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{it.partName}</span>
                    <Badge variant="secondary" className="text-xs font-mono">{it.partNumber}</Badge>
                    <Badge variant="outline" className={`text-xs border-0 ${LEVEL_COLORS[it.submissionLevel ?? "3"]}`}>L{it.submissionLevel}</Badge>
                    <StatusBadgeInline status={it.status ?? "draft"} map={STATUS_MAP} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {it.submissionCode} {it.customerName ? `· ${it.customerName}` : ""} {it.revision ? `· Rev.${it.revision}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {it.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: it.id, status: "submitted" }); }}>
                      <Send className="w-3.5 h-3.5 mr-1" />提交
                    </Button>
                  )}
                  {it.status === "submitted" && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-600" onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: it.id, status: "approved" }); }}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />批准
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: it.id, status: "rejected" }); }}>
                        <XCircle className="w-3.5 h-3.5 mr-1" />驳回
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>新建PPAP提交</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>零件名称 *</Label><Input value={form.partName} onChange={(e) => setForm({ ...form, partName: e.target.value })} placeholder="例: 左前悬挂臂" /></div>
              <div><Label>零件号 *</Label><Input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} placeholder="例: P-12345" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>版本</Label><Input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} placeholder="例: A1" /></div>
              <div><Label>客户名称</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="例: 大众汽车" /></div>
            </div>
            <div>
              <Label>提交等级</Label>
              <Select value={form.submissionLevel} onValueChange={(v) => setForm({ ...form, submissionLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">等级1 — 仅PSW</SelectItem>
                  <SelectItem value="2">等级2 — PSW + 有限支持数据</SelectItem>
                  <SelectItem value="3">等级3 — PSW + 完整支持数据（默认）</SelectItem>
                  <SelectItem value="4">等级4 — 按客户定义</SelectItem>
                  <SelectItem value="5">等级5 — PSW + 现场审查</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>提交原因</Label><Input value={form.submissionReason} onChange={(e) => setForm({ ...form, submissionReason: e.target.value })} placeholder="例: 新零件初始提交" /></div>
            <div><Label>备注</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 2: PPAP详情 ───────────────────────────────────────────

function SubmissionDetailTab({ id, onBack }: { id: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const detailQ = trpc.ppap.getById.useQuery({ id });
  const updateElemMut = trpc.ppap.updateElement.useMutation({
    onSuccess: () => { toast.success("元素已更新"); utils.ppap.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.ppap.update.useMutation({
    onSuccess: () => { toast.success("状态已更新"); utils.ppap.getById.invalidate({ id }); utils.ppap.list.invalidate(); utils.ppap.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const sub = detailQ.data;

  if (detailQ.isLoading) return <LoadingSkeleton rows={6} />;
  if (!sub) return <Card><CardContent className="py-12 text-center text-muted-foreground">未找到PPAP记录</CardContent></Card>;

  const progress = sub.progress ?? { completed: 0, total: 18, percent: 0 };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />返回列表</Button>
        <div className="flex items-center gap-2">
          {sub.status === "draft" && (
            <Button size="sm" onClick={() => updateMut.mutate({ id, status: "submitted" })}><Send className="w-4 h-4 mr-1" />提交审批</Button>
          )}
          {sub.status === "submitted" && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateMut.mutate({ id, status: "approved" })}><CheckCircle2 className="w-4 h-4 mr-1" />批准</Button>
              <Button size="sm" variant="outline" className="text-orange-600" onClick={() => updateMut.mutate({ id, status: "interim_approved" })}><AlertTriangle className="w-4 h-4 mr-1" />有条件批准</Button>
              <Button size="sm" variant="destructive" onClick={() => updateMut.mutate({ id, status: "rejected" })}><XCircle className="w-4 h-4 mr-1" />驳回</Button>
            </>
          )}
        </div>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {sub.partName}
            <Badge variant="secondary" className="font-mono text-xs">{sub.partNumber}</Badge>
            <Badge variant="outline" className={`text-xs border-0 ${LEVEL_COLORS[sub.submissionLevel ?? "3"]}`}>L{sub.submissionLevel}</Badge>
            <StatusBadgeInline status={sub.status ?? "draft"} map={STATUS_MAP} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div><span className="text-muted-foreground">编号:</span> {sub.submissionCode}</div>
            <div><span className="text-muted-foreground">版本:</span> {sub.revision || "-"}</div>
            <div><span className="text-muted-foreground">客户:</span> {sub.customerName || "-"}</div>
            <div><span className="text-muted-foreground">原因:</span> {sub.submissionReason || "-"}</div>
          </div>
          {sub.notes && <p className="text-sm text-muted-foreground mb-4">备注: {sub.notes}</p>}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">元素完成进度</span>
              <span className="text-muted-foreground">{progress.completed} / {progress.total} ({progress.percent}%)</span>
            </div>
            <Progress value={progress.percent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* 18 Elements checklist */}
      <Card>
        <CardHeader><CardTitle className="text-base">AIAG 18元素清单</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(sub.elements ?? []).map((elem: any) => (
            <ElementRow key={elem.id} elem={elem} onUpdate={(status, docPath, notes) => updateElemMut.mutate({ id: elem.id, status: status as any, documentPath: docPath, reviewNotes: notes })} isPending={updateElemMut.isPending} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Element Row ────────────────────────────────────────────────

function ElementRow({ elem, onUpdate, isPending }: { elem: any; onUpdate: (status: string, docPath?: string, notes?: string) => void; isPending: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [docPath, setDocPath] = useState(elem.documentPath ?? "");
  const [notes, setNotes] = useState(elem.reviewNotes ?? "");
  const isRequired = elem.required === 1;

  const cycleOptions = ["not_started", "in_progress", "completed", "not_applicable"] as const;

  return (
    <div className={`border rounded-lg p-3 ${isRequired ? "border-border" : "border-dashed border-muted-foreground/30 opacity-70"}`}>
      <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">#{elem.elementNumber}</span>
          <span className="text-sm font-medium truncate">{elem.elementName}</span>
          {!isRequired && <Badge variant="outline" className="text-[10px] shrink-0">可选</Badge>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadgeInline status={elem.status ?? "not_started"} map={ELEMENT_STATUS_MAP} />
          {elem.documentPath && <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div className="flex flex-wrap gap-2">
            {cycleOptions.map((s) => (
              <Button key={s} size="sm" variant={elem.status === s ? "default" : "outline"} className="text-xs h-7" disabled={isPending}
                onClick={() => onUpdate(s, docPath || undefined, notes || undefined)}>
                {ELEMENT_STATUS_MAP[s].label}
              </Button>
            ))}
          </div>
          <div>
            <Label className="text-xs">文档路径</Label>
            <div className="flex gap-2">
              <Input value={docPath} onChange={(e) => setDocPath(e.target.value)} placeholder="例: /docs/ppap/design-fmea.pdf" className="text-sm h-8" />
              <Button size="sm" variant="outline" className="h-8 shrink-0" disabled={isPending}
                onClick={() => onUpdate(elem.status ?? "not_started", docPath || undefined, notes || undefined)}>
                保存
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">审核备注</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm" placeholder="添加审核备注..." />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function PPAPManagement() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  function handleSelect(id: number) {
    setSelectedId(id);
    setActiveTab("detail");
  }

  function handleBack() {
    setSelectedId(null);
    setActiveTab("list");
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader icon={FileCheck2} title="PPAP管理" description="生产件批准流程 — AIAG 18元素管理（IATF 16949）" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">PPAP提交列表</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedId}>PPAP详情</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <SubmissionListTab onSelect={handleSelect} />
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          {selectedId ? <SubmissionDetailTab id={selectedId} onBack={handleBack} /> : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">请从列表中选择一个PPAP提交</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
