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
import { useLanguage } from "@/contexts/LanguageContext";
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
import { useZodForm, schemas, z } from "@/lib/form-validation";

// ─── Zod Schema ──────────────────────────────────────────────────
const ppapCreateSchema = z.object({
  partName: schemas.requiredString("Part name is required / 零件名称必填"),
  partNumber: schemas.requiredString("Part number is required / 零件号必填"),
  revision: schemas.optionalString(),
  customerName: schemas.optionalString(),
  submissionLevel: schemas.submissionLevel(),
  submissionReason: schemas.optionalString(),
  notes: z.string().optional(),
});
type PpapCreateValues = z.infer<typeof ppapCreateSchema>;

// ─── Helpers ────────────────────────────────────────────────────

const PPAP_STATUS_KEYS: Record<string, { key: string; color: string }> = {
  draft: { key: "quality.ppap.statusDraft", color: "bg-gray-500/15 text-gray-700" },
  submitted: { key: "quality.ppap.statusSubmitted", color: "bg-blue-500/15 text-blue-700" },
  approved: { key: "quality.ppap.statusApproved", color: "bg-green-500/15 text-green-700" },
  rejected: { key: "quality.ppap.statusRejected", color: "bg-red-500/15 text-red-700" },
  interim_approved: { key: "quality.ppap.statusConditional", color: "bg-orange-500/15 text-orange-700" },
};

const LEVEL_COLORS: Record<string, string> = {
  "1": "bg-sky-500/15 text-sky-700",
  "2": "bg-indigo-500/15 text-indigo-700",
  "3": "bg-violet-500/15 text-violet-700",
  "4": "bg-fuchsia-500/15 text-fuchsia-700",
  "5": "bg-rose-500/15 text-rose-700",
};

const ELEM_STATUS_KEYS: Record<string, { key: string; color: string }> = {
  not_started: { key: "quality.ppap.elemNotStarted", color: "bg-gray-500/15 text-gray-700" },
  in_progress: { key: "quality.ppap.elemInProgress", color: "bg-blue-500/15 text-blue-700" },
  completed: { key: "quality.ppap.elemCompleted", color: "bg-green-500/15 text-green-700" },
  not_applicable: { key: "quality.ppap.elemNA", color: "bg-yellow-500/15 text-yellow-700" },
  rejected: { key: "quality.ppap.elemRejected", color: "bg-red-500/15 text-red-700" },
};

function StatusBadgeInline({ status, map }: { status: string; map: Record<string, { key: string; color: string }> }) {
  const { t } = useLanguage();
  const s = map[status] ?? { key: status, color: "bg-gray-200 text-gray-700" };
  return <Badge variant="outline" className={`${s.color} border-0 text-xs`}>{t(s.key)}</Badge>;
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
}

// ─── Tab 1: PPAP提交列表 ────────────────────────────────────────

function SubmissionListTab({ onSelect }: { onSelect: (id: number) => void }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const form = useZodForm({
    schema: ppapCreateSchema,
    defaultValues: { partName: "", partNumber: "", revision: "", customerName: "", submissionLevel: "3", submissionReason: "", notes: "" },
  });

  const utils = trpc.useUtils();
  const statsQ = trpc.ppap.getStats.useQuery({});
  const listQ = trpc.ppap.list.useQuery({});
  const createMut = trpc.ppap.create.useMutation({
    onSuccess: () => { toast.success(t("quality.ppap.createSuccess")); setShowCreate(false); form.reset(); utils.ppap.list.invalidate(); utils.ppap.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.ppap.update.useMutation({
    onSuccess: () => { toast.success(t("quality.ppap.statusUpdateSuccess")); utils.ppap.list.invalidate(); utils.ppap.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = form.handleSubmit((data) => {
    createMut.mutate({
      partName: data.partName,
      partNumber: data.partNumber,
      revision: data.revision || undefined,
      customerName: data.customerName || undefined,
      submissionLevel: data.submissionLevel as "1" | "2" | "3" | "4" | "5",
      submissionReason: data.submissionReason || undefined,
      notes: data.notes || undefined,
    });
  });

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
        <StatCard icon={ClipboardList} label={t("quality.ppap.totalSubmissions")} value={stats?.total ?? 0} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={FileText} label={t("quality.ppap.drafts")} value={stats?.byStatus?.draft ?? 0} iconColor="text-gray-500" iconBg="bg-gray-500/10" />
        <StatCard icon={Send} label={t("quality.ppap.submitted")} value={stats?.byStatus?.submitted ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label={t("quality.ppap.approved")} value={stats?.byStatus?.approved ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={XCircle} label={t("quality.ppap.rejected")} value={stats?.byStatus?.rejected ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("quality.ppap.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />{t("quality.ppap.newSubmission")}</Button>
      </div>

      {/* List */}
      {listQ.isLoading ? <LoadingSkeleton rows={5} /> : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("quality.ppap.noSubmissions")}</CardContent></Card>
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
                    <StatusBadgeInline status={it.status ?? "draft"} map={PPAP_STATUS_KEYS} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {it.submissionCode} {it.customerName ? `· ${it.customerName}` : ""} {it.revision ? `· Rev.${it.revision}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {it.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: it.id, status: "submitted" }); }}>
                      <Send className="w-3.5 h-3.5 mr-1" />{t("quality.ppap.submit")}
                    </Button>
                  )}
                  {it.status === "submitted" && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-600" onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: it.id, status: "approved" }); }}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{t("quality.ppap.approve")}
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: it.id, status: "rejected" }); }}>
                        <XCircle className="w-3.5 h-3.5 mr-1" />{t("quality.ppap.reject")}
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
          <DialogHeader><DialogTitle>{t("quality.ppap.newSubmission")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("quality.ppap.partName")} *</Label>
                <Input {...form.register("partName")} />
                {form.formState.errors.partName && <p className="text-destructive text-sm mt-1">{form.formState.errors.partName.message}</p>}
              </div>
              <div>
                <Label>{t("quality.ppap.partNumber")} *</Label>
                <Input {...form.register("partNumber")} />
                {form.formState.errors.partNumber && <p className="text-destructive text-sm mt-1">{form.formState.errors.partNumber.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("quality.ppap.revision")}</Label><Input {...form.register("revision")} /></div>
              <div><Label>{t("quality.ppap.customerName")}</Label><Input {...form.register("customerName")} /></div>
            </div>
            <div>
              <Label>{t("quality.ppap.submissionLevel")}</Label>
              <Select value={form.watch("submissionLevel")} onValueChange={(v) => form.setValue("submissionLevel", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("quality.ppap.level1")}</SelectItem>
                  <SelectItem value="2">{t("quality.ppap.level2")}</SelectItem>
                  <SelectItem value="3">{t("quality.ppap.level3")}</SelectItem>
                  <SelectItem value="4">{t("quality.ppap.level4")}</SelectItem>
                  <SelectItem value="5">{t("quality.ppap.level5")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("quality.ppap.submissionReason")}</Label><Input {...form.register("submissionReason")} /></div>
            <div><Label>{t("quality.ppap.remarks")}</Label><Textarea {...form.register("notes")} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t("quality.common.cancel")}</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{t("quality.common.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 2: PPAP详情 ───────────────────────────────────────────

function SubmissionDetailTab({ id, onBack }: { id: number; onBack: () => void }) {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const detailQ = trpc.ppap.getById.useQuery({ id });
  const updateElemMut = trpc.ppap.updateElement.useMutation({
    onSuccess: () => { toast.success(t("quality.ppap.updateSuccess")); utils.ppap.getById.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.ppap.update.useMutation({
    onSuccess: () => { toast.success(t("quality.ppap.statusUpdateSuccess")); utils.ppap.getById.invalidate({ id }); utils.ppap.list.invalidate(); utils.ppap.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const sub = detailQ.data;

  if (detailQ.isLoading) return <LoadingSkeleton rows={6} />;
  if (!sub) return <Card><CardContent className="py-12 text-center text-muted-foreground">{t("quality.ppap.notFound")}</CardContent></Card>;

  const progress = sub.progress ?? { completed: 0, total: 18, percent: 0 };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />{t("quality.ppap.backToList")}</Button>
        <div className="flex items-center gap-2">
          {sub.status === "draft" && (
            <Button size="sm" onClick={() => updateMut.mutate({ id, status: "submitted" })}><Send className="w-4 h-4 mr-1" />{t("quality.ppap.submitForApproval")}</Button>
          )}
          {sub.status === "submitted" && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateMut.mutate({ id, status: "approved" })}><CheckCircle2 className="w-4 h-4 mr-1" />{t("quality.ppap.approve")}</Button>
              <Button size="sm" variant="outline" className="text-orange-600" onClick={() => updateMut.mutate({ id, status: "interim_approved" })}><AlertTriangle className="w-4 h-4 mr-1" />{t("quality.ppap.conditionalApproval")}</Button>
              <Button size="sm" variant="destructive" onClick={() => updateMut.mutate({ id, status: "rejected" })}><XCircle className="w-4 h-4 mr-1" />{t("quality.ppap.reject")}</Button>
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
            <StatusBadgeInline status={sub.status ?? "draft"} map={PPAP_STATUS_KEYS} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div><span className="text-muted-foreground">{t("quality.ppap.number")}:</span> {sub.submissionCode}</div>
            <div><span className="text-muted-foreground">{t("quality.ppap.revision")}:</span> {sub.revision || "-"}</div>
            <div><span className="text-muted-foreground">{t("quality.ppap.customer")}:</span> {sub.customerName || "-"}</div>
            <div><span className="text-muted-foreground">{t("quality.ppap.reason")}:</span> {sub.submissionReason || "-"}</div>
          </div>
          {sub.notes && <p className="text-sm text-muted-foreground mb-4">{t("quality.ppap.remarks")}: {sub.notes}</p>}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("quality.ppap.elementProgress")}</span>
              <span className="text-muted-foreground">{progress.completed} / {progress.total} ({progress.percent}%)</span>
            </div>
            <Progress value={progress.percent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* 18 Elements checklist */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("quality.ppap.elementChecklist")}</CardTitle></CardHeader>
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
  const { t } = useLanguage();
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
          {!isRequired && <Badge variant="outline" className="text-[10px] shrink-0">{t("quality.ppap.optional")}</Badge>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadgeInline status={elem.status ?? "not_started"} map={ELEM_STATUS_KEYS} />
          {elem.documentPath && <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div className="flex flex-wrap gap-2">
            {cycleOptions.map((s) => (
              <Button key={s} size="sm" variant={elem.status === s ? "default" : "outline"} className="text-xs h-7" disabled={isPending}
                onClick={() => onUpdate(s, docPath || undefined, notes || undefined)}>
                {t(ELEM_STATUS_KEYS[s].key)}
              </Button>
            ))}
          </div>
          <div>
            <Label className="text-xs">{t("quality.ppap.docPath")}</Label>
            <div className="flex gap-2">
              <Input value={docPath} onChange={(e) => setDocPath(e.target.value)} placeholder="例: /docs/ppap/design-fmea.pdf" className="text-sm h-8" />
              <Button size="sm" variant="outline" className="h-8 shrink-0" disabled={isPending}
                onClick={() => onUpdate(elem.status ?? "not_started", docPath || undefined, notes || undefined)}>
                {t("quality.ppap.save")}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">{t("quality.ppap.reviewNotes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function PPAPManagement() {
  const { t } = useLanguage();
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
      <PageHeader icon={FileCheck2} title={t("quality.ppap.title")} description={t("quality.ppap.description")} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">{t("quality.ppap.tabSubmissions")}</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedId}>{t("quality.ppap.tabDetails")}</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <SubmissionListTab onSelect={handleSelect} />
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          {selectedId ? <SubmissionDetailTab id={selectedId} onBack={handleBack} /> : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("quality.ppap.selectFromList")}</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
