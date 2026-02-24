/**
 * FMEA Management — DFMEA & PFMEA 文档与风险分析
 * IATF 16949 Core Tool: Failure Mode & Effects Analysis
 *
 * Tab 1: FMEA文档 — document list, stats, create dialog, type/status filter
 * Tab 2: 风险分析 — failure mode table with S/O/D, RPN color-coding, actions
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, FileText, Plus, AlertTriangle, TrendingUp,
  CheckCircle2, Clock, BarChart3, Target, Zap,
  ChevronRight, Eye, ArrowLeft,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────
function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  in_review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  archived: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};
const STATUS_KEY: Record<string, string> = {
  draft: "quality.fmea.statusDraft",
  in_review: "quality.fmea.statusReviewing",
  approved: "quality.fmea.statusApproved",
  active: "quality.fmea.statusEffective",
  archived: "quality.fmea.statusArchived",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const color = STATUS_COLOR[status] ?? "bg-muted text-muted-foreground";
  const label = STATUS_KEY[status] ? t(STATUS_KEY[status]) : status;
  return <Badge variant="outline" className={color}>{label}</Badge>;
}

function RpnBadge({ rpn }: { rpn: number }) {
  if (rpn >= 200) return <Badge className="bg-red-600 hover:bg-red-700 text-white">{rpn}</Badge>;
  if (rpn >= 80) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{rpn}</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">{rpn}</Badge>;
}

function PriorityBadge({ ap }: { ap: string }) {
  const { t } = useLanguage();
  if (ap === "H") return <Badge className="bg-red-600 hover:bg-red-700 text-white">{t("quality.fmea.priorityHigh")}</Badge>;
  if (ap === "M") return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{t("quality.fmea.priorityMedium")}</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">{t("quality.fmea.priorityLow")}</Badge>;
}

// ── Tab 1: FMEA文档 ─────────────────────────────────────────
function DocumentsTab({ onSelect }: { onSelect: (id: number) => void }) {
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const statsQ = trpc.fmea.getStats.useQuery({});
  const docsQ = trpc.fmea.listDocuments.useQuery({
    fmeaType: typeFilter !== "all" ? (typeFilter as "DFMEA" | "PFMEA") : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const createMut = trpc.fmea.createDocument.useMutation({
    onSuccess: (res) => { toast.success(res.message); setShowCreate(false); docsQ.refetch(); statsQ.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ fmeaType: "DFMEA" as "DFMEA" | "PFMEA", title: "", scope: "", productName: "", processName: "" });

  const stats = statsQ.data;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label={t("quality.fmea.totalDocuments")} value={stats.totalDocuments} subtitle={`DFMEA: ${stats.byType.DFMEA} | PFMEA: ${stats.byType.PFMEA}`} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertTriangle} label={t("quality.fmea.highRiskItems")} value={stats.highRiskItems} subtitle={`${t("quality.fmea.mediumRisk")}: ${stats.mediumRiskItems}`} iconColor="text-red-500" iconBg="bg-red-500/10" />
          <StatCard icon={BarChart3} label={t("quality.fmea.avgRPN")} value={stats.avgRpn} subtitle={`${t("quality.fmea.failureMode")}: ${stats.totalItems}`} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
          <StatCard icon={CheckCircle2} label={t("quality.fmea.actionCompletion")} value={`${stats.completedActions}/${stats.totalActions}`} subtitle={`${t("quality.fmea.actionPending")}: ${stats.openActions}`} iconColor="text-green-500" iconBg="bg-green-500/10" />
        </div>
      ) : <LoadingSkeleton rows={1} />}

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("quality.fmea.filterType")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("quality.fmea.allTypes")}</SelectItem>
            <SelectItem value="DFMEA">DFMEA</SelectItem>
            <SelectItem value="PFMEA">PFMEA</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("quality.fmea.filterStatus")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("quality.fmea.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("quality.fmea.statusDraft")}</SelectItem>
            <SelectItem value="in_review">{t("quality.fmea.statusReviewing")}</SelectItem>
            <SelectItem value="approved">{t("quality.fmea.statusApproved")}</SelectItem>
            <SelectItem value="active">{t("quality.fmea.statusEffective")}</SelectItem>
            <SelectItem value="archived">{t("quality.fmea.statusArchived")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />{t("quality.fmea.newFmea")}</Button>
      </div>

      {/* Document list */}
      {docsQ.isLoading ? <LoadingSkeleton rows={4} /> : (
        <div className="space-y-2">
          {(docsQ.data?.items ?? []).length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t("quality.fmea.noDocuments")}</CardContent></Card>
          )}
          {(docsQ.data?.items ?? []).map((doc: any) => (
            <Card key={doc.id} className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => onSelect(doc.id)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-sm ${doc.fmeaType === "DFMEA" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{doc.title}</span>
                    <Badge variant="outline">{doc.fmeaType}</Badge>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {doc.fmeaCode} {doc.productName ? `| ${t("quality.fmea.product")} ${doc.productName}` : ""} {doc.processName ? `| ${t("quality.fmea.process")} ${doc.processName}` : ""} {doc.scope ? `| ${doc.scope}` : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("quality.fmea.newFmeaDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("quality.fmea.fmeaType")}</Label>
              <Select value={form.fmeaType} onValueChange={(v) => setForm({ ...form, fmeaType: v as "DFMEA" | "PFMEA" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DFMEA">DFMEA</SelectItem>
                  <SelectItem value="PFMEA">PFMEA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("quality.fmea.fmeaTitle")} *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("quality.fmea.scope")}</Label>
              <Input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("quality.fmea.productName")}</Label>
                <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
              </div>
              <div>
                <Label>{t("quality.fmea.processName")}</Label>
                <Input value={form.processName} onChange={(e) => setForm({ ...form, processName: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("quality.fmea.cancel")}</Button>
            <Button disabled={!form.title.trim() || createMut.isPending} onClick={() => createMut.mutate({
              fmeaType: form.fmeaType, title: form.title.trim(),
              scope: form.scope || undefined, productName: form.productName || undefined, processName: form.processName || undefined,
            })}>
              {createMut.isPending ? t("quality.fmea.creating") : t("quality.fmea.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 2: 风险分析 ─────────────────────────────────────────
function RiskAnalysisTab({ docId, onBack }: { docId: number | null; onBack: () => void }) {
  const { t } = useLanguage();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [actionItemId, setActionItemId] = useState<number | null>(null);

  const docQ = trpc.fmea.getDocument.useQuery({ id: docId! }, { enabled: !!docId });
  const highRiskQ = trpc.fmea.getHighRiskItems.useQuery({});

  const addItemMut = trpc.fmea.addItem.useMutation({
    onSuccess: (res) => { toast.success(res.message); setShowAddItem(false); docQ.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const addActionMut = trpc.fmea.addAction.useMutation({
    onSuccess: (res) => { toast.success(res.message); setShowAddAction(false); setActionItemId(null); docQ.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [itemForm, setItemForm] = useState({
    failureMode: "", failureEffect: "", failureCause: "",
    severity: 1, occurrence: 1, detection: 1,
  });
  const [actionForm, setActionForm] = useState({ actionDescription: "", responsiblePerson: "", targetDate: "" });

  if (!docId) {
    // Show high-risk items overview when no doc selected
    return (
      <div className="space-y-4">
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>{t("quality.fmea.noDocuments")}</p>
        </CardContent></Card>
        {highRiskQ.data && highRiskQ.data.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />{t("quality.fmea.globalTopRisks")}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">{t("quality.fmea.failureMode")}</th><th className="pb-2">{t("quality.fmea.failureEffect")}</th><th className="pb-2">S</th><th className="pb-2">O</th><th className="pb-2">D</th><th className="pb-2">RPN</th><th className="pb-2">{t("quality.fmea.priority")}</th>
                  </tr></thead>
                  <tbody>
                    {highRiskQ.data.slice(0, 10).map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{item.failureMode}</td>
                        <td className="py-2 text-muted-foreground truncate max-w-[200px]">{item.failureEffect ?? "-"}</td>
                        <td className="py-2">{item.severity}</td>
                        <td className="py-2">{item.occurrence}</td>
                        <td className="py-2">{item.detection}</td>
                        <td className="py-2"><RpnBadge rpn={item.rpn} /></td>
                        <td className="py-2"><PriorityBadge ap={item.actionPriority} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (docQ.isLoading) return <LoadingSkeleton rows={5} />;
  const doc = docQ.data;
  if (!doc) return <Card><CardContent className="p-6 text-center text-muted-foreground">{t("quality.fmea.noDocuments")}</CardContent></Card>;

  const computedRpn = itemForm.severity * itemForm.occurrence * itemForm.detection;

  return (
    <div className="space-y-4">
      {/* Document header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />{t("quality.fmea.back")}</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{doc.title}</span>
            <Badge variant="outline">{doc.fmeaType}</Badge>
            <StatusBadge status={doc.status} />
          </div>
          <p className="text-xs text-muted-foreground">{doc.fmeaCode} {doc.scope ? `| ${doc.scope}` : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setItemForm({ failureMode: "", failureEffect: "", failureCause: "", severity: 1, occurrence: 1, detection: 1 }); setShowAddItem(true); }}>
          <Plus className="w-4 h-4 mr-1" />{t("quality.fmea.addFailureMode")}
        </Button>
      </div>

      {/* Items table */}
      {(doc.items ?? []).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t("quality.fmea.noFailureModes")}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="p-3">#</th>
                  <th className="p-3">{t("quality.fmea.failureMode")}</th>
                  <th className="p-3">{t("quality.fmea.failureEffect")}</th>
                  <th className="p-3">{t("quality.fmea.failureCause")}</th>
                  <th className="p-3 text-center">S</th>
                  <th className="p-3 text-center">O</th>
                  <th className="p-3 text-center">D</th>
                  <th className="p-3 text-center">RPN</th>
                  <th className="p-3 text-center">{t("quality.fmea.priority")}</th>
                  <th className="p-3">{t("quality.fmea.actions")}</th>
                  <th className="p-3">{t("quality.fmea.operation")}</th>
                </tr></thead>
                <tbody>
                  {(doc.items as any[]).map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{item.itemNumber}</td>
                      <td className="p-3 font-medium max-w-[160px] truncate">{item.failureMode}</td>
                      <td className="p-3 text-muted-foreground max-w-[160px] truncate">{item.failureEffect ?? "-"}</td>
                      <td className="p-3 text-muted-foreground max-w-[160px] truncate">{item.failureCause ?? "-"}</td>
                      <td className="p-3 text-center font-mono">{item.severity}</td>
                      <td className="p-3 text-center font-mono">{item.occurrence}</td>
                      <td className="p-3 text-center font-mono">{item.detection}</td>
                      <td className="p-3 text-center"><RpnBadge rpn={item.rpn} /></td>
                      <td className="p-3 text-center"><PriorityBadge ap={item.actionPriority} /></td>
                      <td className="p-3">
                        {item.actions?.length > 0 ? (
                          <span className="text-xs text-muted-foreground">{item.actions.length} {t("quality.fmea.actionsCount")}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" onClick={() => { setActionItemId(item.id); setActionForm({ actionDescription: "", responsiblePerson: "", targetDate: "" }); setShowAddAction(true); }}>
                          <Zap className="w-3 h-3 mr-1" />{t("quality.fmea.actions")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expanded actions per item */}
      {(doc.items as any[]).filter((it: any) => it.actions?.length > 0).map((item: any) => (
        <Card key={`actions-${item.id}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              {item.failureMode} - {t("quality.fmea.improvements")} ({item.actions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {item.actions.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 text-sm border rounded-md p-2">
                  <Badge variant="outline" className={a.status === "completed" || a.status === "verified" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}>
                    {a.status === "open" ? t("quality.fmea.actionPending") : a.status === "in_progress" ? t("quality.fmea.actionInProgress") : a.status === "completed" ? t("quality.fmea.actionCompleted") : a.status === "verified" ? t("quality.fmea.actionVerified") : t("quality.fmea.actionCancelled")}
                  </Badge>
                  <span className="flex-1">{a.actionDescription}</span>
                  {a.responsiblePerson && <span className="text-muted-foreground">{a.responsiblePerson}</span>}
                  {a.targetDate && <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{a.targetDate.slice(0, 10)}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add item dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("quality.fmea.addFailureMode")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("quality.fmea.failureMode")} *</Label>
              <Input value={itemForm.failureMode} onChange={(e) => setItemForm({ ...itemForm, failureMode: e.target.value })} />
            </div>
            <div>
              <Label>{t("quality.fmea.failureEffect")}</Label>
              <Textarea value={itemForm.failureEffect} onChange={(e) => setItemForm({ ...itemForm, failureEffect: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>{t("quality.fmea.failureCause")}</Label>
              <Textarea value={itemForm.failureCause} onChange={(e) => setItemForm({ ...itemForm, failureCause: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{t("quality.fmea.severity")} S (1-10)</Label>
                <Input type="number" min={1} max={10} value={itemForm.severity} onChange={(e) => setItemForm({ ...itemForm, severity: Math.min(10, Math.max(1, +e.target.value || 1)) })} />
              </div>
              <div>
                <Label>{t("quality.fmea.occurrence")} O (1-10)</Label>
                <Input type="number" min={1} max={10} value={itemForm.occurrence} onChange={(e) => setItemForm({ ...itemForm, occurrence: Math.min(10, Math.max(1, +e.target.value || 1)) })} />
              </div>
              <div>
                <Label>{t("quality.fmea.detection")} D (1-10)</Label>
                <Input type="number" min={1} max={10} value={itemForm.detection} onChange={(e) => setItemForm({ ...itemForm, detection: Math.min(10, Math.max(1, +e.target.value || 1)) })} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">RPN:</span>
              <RpnBadge rpn={computedRpn} />
              <span className="text-muted-foreground">({computedRpn >= 200 ? t("quality.fmea.highRisk") : computedRpn >= 80 ? t("quality.fmea.mediumRisk") : t("quality.fmea.lowRisk")})</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>{t("quality.fmea.cancel")}</Button>
            <Button disabled={!itemForm.failureMode.trim() || addItemMut.isPending} onClick={() => addItemMut.mutate({
              fmeaDocumentId: docId,
              failureMode: itemForm.failureMode.trim(),
              failureEffect: itemForm.failureEffect || undefined,
              failureCause: itemForm.failureCause || undefined,
              severity: itemForm.severity,
              occurrence: itemForm.occurrence,
              detection: itemForm.detection,
            })}>
              {addItemMut.isPending ? t("quality.fmea.adding") : t("quality.fmea.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add action dialog */}
      <Dialog open={showAddAction} onOpenChange={(open) => { setShowAddAction(open); if (!open) setActionItemId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("quality.fmea.addAction")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("quality.fmea.actionDesc")} *</Label>
              <Textarea value={actionForm.actionDescription} onChange={(e) => setActionForm({ ...actionForm, actionDescription: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("quality.fmea.responsible")}</Label>
                <Input value={actionForm.responsiblePerson} onChange={(e) => setActionForm({ ...actionForm, responsiblePerson: e.target.value })} />
              </div>
              <div>
                <Label>{t("quality.fmea.targetDate")}</Label>
                <Input type="date" value={actionForm.targetDate} onChange={(e) => setActionForm({ ...actionForm, targetDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddAction(false); setActionItemId(null); }}>{t("quality.fmea.cancel")}</Button>
            <Button disabled={!actionForm.actionDescription.trim() || !actionItemId || addActionMut.isPending} onClick={() => addActionMut.mutate({
              fmeaItemId: actionItemId!,
              actionDescription: actionForm.actionDescription.trim(),
              responsiblePerson: actionForm.responsiblePerson || undefined,
              targetDate: actionForm.targetDate || undefined,
            })}>
              {addActionMut.isPending ? t("quality.fmea.adding") : t("quality.fmea.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function FMEAManagement() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("documents");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  const handleSelectDoc = (id: number) => {
    setSelectedDocId(id);
    setTab("risk");
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Shield}
        title={t("quality.fmea.title")}
        description={t("quality.fmea.description")}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="documents" className="flex items-center gap-1">
            <FileText className="w-4 h-4" />{t("quality.fmea.tabDocuments")}
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />{t("quality.fmea.tabRiskAnalysis")}
            {selectedDocId && <Eye className="w-3 h-3 ml-1 text-primary" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab onSelect={handleSelectDoc} />
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <RiskAnalysisTab docId={selectedDocId} onBack={() => { setSelectedDocId(null); setTab("documents"); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
