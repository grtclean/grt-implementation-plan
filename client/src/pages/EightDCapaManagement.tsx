/**
 * 8D Problem Solving + CAPA Management
 * IATF 16949 — D0-D8 structured problem solving & Corrective/Preventive Actions
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, Plus, AlertTriangle, CheckCircle2, XCircle,
  ChevronRight, ClipboardList, FileSearch, Target,
  ArrowRight, Clock, Users, Bug, Lightbulb,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────
const D_STEPS = ["open", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "closed", "verified"] as const;
const D_LABEL_KEYS: Record<string, string> = {
  open: "quality.eightD.stepOpen", D1: "quality.eightD.stepD1", D2: "quality.eightD.stepD2",
  D3: "quality.eightD.stepD3", D4: "quality.eightD.stepD4", D5: "quality.eightD.stepD5",
  D6: "quality.eightD.stepD6", D7: "quality.eightD.stepD7", D8: "quality.eightD.stepD8",
  closed: "quality.eightD.stepClosed", verified: "quality.eightD.stepVerified",
};

const SEVERITY_KEYS: Record<string, { key: string; color: string }> = {
  critical: { key: "quality.eightD.sevCritical", color: "bg-red-500/15 text-red-500 border-red-500/30" },
  high: { key: "quality.eightD.sevHigh", color: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  medium: { key: "quality.eightD.sevMedium", color: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  low: { key: "quality.eightD.sevLow", color: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

const CAPA_STATUS_KEYS: Record<string, { key: string; color: string }> = {
  open: { key: "quality.eightD.capaStatusOpen", color: "bg-gray-500/15 text-gray-400" },
  investigation: { key: "quality.eightD.capaStatusInvestigation", color: "bg-blue-500/15 text-blue-500" },
  action_planned: { key: "quality.eightD.capaStatusPlanned", color: "bg-indigo-500/15 text-indigo-500" },
  implemented: { key: "quality.eightD.capaStatusImplemented", color: "bg-amber-500/15 text-amber-500" },
  verified: { key: "quality.eightD.capaStatusVerified", color: "bg-green-500/15 text-green-500" },
  closed: { key: "quality.eightD.capaStatusClosed", color: "bg-emerald-500/15 text-emerald-400" },
};

const CAPA_STATUS_ORDER = ["open", "investigation", "action_planned", "implemented", "verified", "closed"];

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
}

// ─── D-Step Pipeline ──────────────────────────────────────────
function DStepPipeline({ current, t }: { current: string; t: (key: string) => string }) {
  const idx = D_STEPS.indexOf(current as typeof D_STEPS[number]);
  const display = D_STEPS.slice(0, -1);
  return (
    <div className="flex items-center gap-0.5">
      {display.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        const isVerified = current === "verified";
        return (
          <div key={step} className="flex items-center">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors ${
                (done || isVerified)
                  ? "bg-green-500 border-green-500 text-white"
                  : active
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-border text-muted-foreground"
              }`}
              title={t(D_LABEL_KEYS[step])}
            >
              {done || isVerified ? "\u2713" : step === "open" ? "0" : step === "closed" ? "C" : step.replace("D", "")}
            </div>
            {i < display.length - 1 && (
              <div className={`w-2 h-0.5 ${(done || isVerified) ? "bg-green-500" : "bg-border"}`} />
            )}
          </div>
        );
      })}
      {current === "verified" && (
        <>
          <div className="w-2 h-0.5 bg-green-500" />
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-green-500 border-green-500 text-white border" title={t("quality.eightD.stepVerified")}>
            V
          </div>
        </>
      )}
    </div>
  );
}

// ─── CAPA Status Pipeline ─────────────────────────────────────
function CapaStatusPipeline({ current, t }: { current: string; t: (key: string) => string }) {
  const idx = CAPA_STATUS_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-0.5">
      {CAPA_STATUS_ORDER.map((st, i) => {
        const done = i < idx;
        const active = i === idx;
        const meta = CAPA_STATUS_KEYS[st];
        return (
          <div key={st} className="flex items-center">
            <div
              className={`h-2 w-6 rounded-full transition-colors ${
                done ? "bg-green-500" : active ? "bg-primary" : "bg-muted"
              }`}
              title={meta ? t(meta.key) : st}
            />
            {i < CAPA_STATUS_ORDER.length - 1 && <div className="w-0.5" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Next step helper ─────────────────────────────────────────
function getNextStep(current: string): string | null {
  const idx = D_STEPS.indexOf(current as typeof D_STEPS[number]);
  if (idx < 0 || idx >= D_STEPS.length - 1) return null;
  return D_STEPS[idx + 1];
}

// ─── Tab 1: 8D Reports ───────────────────────────────────────
function EightDTab() {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", problemDescription: "", severity: "medium", source: "", customerName: "", partNumber: "", dueDate: "" });

  const utils = trpc.useUtils();
  const statsQ = trpc.eightDCapa.getStats.useQuery({});
  const listQ = trpc.eightDCapa.list8D.useQuery({});
  const createMut = trpc.eightDCapa.create8D.useMutation({
    onSuccess: () => { toast.success(t("quality.eightD.created")); setShowCreate(false); resetForm(); utils.eightDCapa.list8D.invalidate(); utils.eightDCapa.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const advanceMut = trpc.eightDCapa.update8DStep.useMutation({
    onSuccess: (d) => { toast.success(d.message); utils.eightDCapa.list8D.invalidate(); utils.eightDCapa.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() { setForm({ title: "", problemDescription: "", severity: "medium", source: "", customerName: "", partNumber: "", dueDate: "" }); }

  const stats = statsQ.data?.eightD;
  const items = listQ.data?.items ?? [];

  function handleAdvance(id: number, current: string) {
    const next = getNextStep(current);
    if (!next) return;
    advanceMut.mutate({ id, currentStep: next as "D1" });
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label={t("quality.eightD.totalReports")} value={stats?.total ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label={t("quality.eightD.inProgress")} value={stats?.open ?? 0} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard icon={CheckCircle2} label={t("quality.eightD.closed")} value={stats?.closed ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={XCircle} label={t("quality.eightD.criticalIssues")} value={stats?.bySeverity?.critical ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("quality.eightD.reportList")}</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />{t("quality.eightD.new8D")}</Button>
      </div>

      {/* List */}
      {listQ.isLoading ? <LoadingSkeleton rows={4} /> : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("quality.eightD.emptyHint")}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((r: any) => {
            const sev = SEVERITY_KEYS[r.severity] ?? SEVERITY_KEYS.medium;
            const next = getNextStep(r.currentStep);
            return (
              <Card key={r.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{r.reportCode}</span>
                        <Badge variant="outline" className={sev.color}>{t(sev.key)}</Badge>
                        <Badge variant="outline">{D_LABEL_KEYS[r.currentStep] ? t(D_LABEL_KEYS[r.currentStep]) : r.currentStep}</Badge>
                        {r.customerName && <span className="text-xs text-muted-foreground">{t("quality.eightD.customer")}: {r.customerName}</span>}
                        {r.partNumber && <span className="text-xs text-muted-foreground">{t("quality.eightD.partNumber")}: {r.partNumber}</span>}
                      </div>
                      <p className="font-medium truncate">{r.title}</p>
                      {r.problemDescription && <p className="text-sm text-muted-foreground line-clamp-1">{r.problemDescription}</p>}
                      <DStepPipeline current={r.currentStep} t={t} />
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {r.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{r.dueDate}</span>
                      )}
                      {next && (
                        <Button size="sm" variant="outline" onClick={() => handleAdvance(r.id, r.currentStep)} disabled={advanceMut.isPending}>
                          {t("quality.eightD.advanceTo")}{D_LABEL_KEYS[next] ? t(D_LABEL_KEYS[next]) : next}<ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("quality.eightD.createDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("quality.eightD.titleRequired")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("quality.eightD.titlePlaceholder")} />
            </div>
            <div>
              <Label>{t("quality.eightD.problemDesc")}</Label>
              <Textarea value={form.problemDescription} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })} placeholder={t("quality.eightD.problemDescPlaceholder")} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("quality.eightD.severityLabel")}</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">{t("quality.eightD.sevCritical")}</SelectItem>
                    <SelectItem value="high">{t("quality.eightD.sevHigh")}</SelectItem>
                    <SelectItem value="medium">{t("quality.eightD.sevMedium")}</SelectItem>
                    <SelectItem value="low">{t("quality.eightD.sevLow")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("quality.eightD.sourceLabel")}</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder={t("quality.eightD.sourcePlaceholder")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("quality.eightD.customerName")}</Label>
                <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder={t("quality.eightD.optional")} />
              </div>
              <div>
                <Label>{t("quality.eightD.partNumberLabel")}</Label>
                <Input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} placeholder={t("quality.eightD.optional")} />
              </div>
            </div>
            <div>
              <Label>{t("quality.eightD.targetCloseDate")}</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("quality.eightD.cancel")}</Button>
            <Button onClick={() => createMut.mutate({ title: form.title, problemDescription: form.problemDescription || undefined, severity: form.severity as "critical", source: form.source || undefined, customerName: form.customerName || undefined, partNumber: form.partNumber || undefined, dueDate: form.dueDate || undefined })} disabled={!form.title || createMut.isPending}>
              {t("quality.eightD.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 2: CAPA Management ──────────────────────────────────
function CapaTab() {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ capaType: "corrective" as "corrective" | "preventive", title: "", description: "", rootCause: "", responsibleName: "", targetDate: "" });

  const utils = trpc.useUtils();
  const statsQ = trpc.eightDCapa.getStats.useQuery({});
  const listQ = trpc.eightDCapa.listCAPA.useQuery({});
  const createMut = trpc.eightDCapa.createCAPA.useMutation({
    onSuccess: () => { toast.success(t("quality.eightD.capaCreated")); setShowCreate(false); resetForm(); utils.eightDCapa.listCAPA.invalidate(); utils.eightDCapa.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.eightDCapa.updateCAPA.useMutation({
    onSuccess: (d) => { toast.success(d.message); utils.eightDCapa.listCAPA.invalidate(); utils.eightDCapa.getStats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() { setForm({ capaType: "corrective", title: "", description: "", rootCause: "", responsibleName: "", targetDate: "" }); }

  const stats = statsQ.data?.capa;
  const items = listQ.data?.items ?? [];

  function advanceCapaStatus(id: number, current: string) {
    const idx = CAPA_STATUS_ORDER.indexOf(current);
    if (idx < 0 || idx >= CAPA_STATUS_ORDER.length - 1) return;
    const next = CAPA_STATUS_ORDER[idx + 1];
    updateMut.mutate({ id, status: next as "investigation" });
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Target} label={t("quality.eightD.capaTotal")} value={stats?.total ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label={t("quality.eightD.capaOpen")} value={stats?.open ?? 0} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard icon={Bug} label={t("quality.eightD.corrective")} value={stats?.corrective ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Lightbulb} label={t("quality.eightD.preventive")} value={stats?.preventive ?? 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("quality.eightD.capaList")}</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />{t("quality.eightD.newCapa")}</Button>
      </div>

      {/* List */}
      {listQ.isLoading ? <LoadingSkeleton rows={4} /> : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("quality.eightD.capaEmptyHint")}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((c: any) => {
            const statusMeta = CAPA_STATUS_KEYS[c.status] ?? CAPA_STATUS_KEYS.open;
            const isTerminal = c.status === "closed";
            const nextIdx = CAPA_STATUS_ORDER.indexOf(c.status) + 1;
            const nextKey = nextIdx < CAPA_STATUS_ORDER.length ? CAPA_STATUS_KEYS[CAPA_STATUS_ORDER[nextIdx]]?.key : null;
            return (
              <Card key={c.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{c.capaCode}</span>
                        <Badge variant="outline" className={c.capaType === "corrective" ? "bg-red-500/15 text-red-500 border-red-500/30" : "bg-purple-500/15 text-purple-500 border-purple-500/30"}>
                          {c.capaType === "corrective" ? t("quality.eightD.correctiveShort") : t("quality.eightD.preventiveShort")}
                        </Badge>
                        <Badge variant="outline" className={statusMeta.color}>{t(statusMeta.key)}</Badge>
                        {c.responsibleName && <span className="text-xs text-muted-foreground">{t("quality.eightD.responsible")}: {c.responsibleName}</span>}
                      </div>
                      <p className="font-medium truncate">{c.title}</p>
                      {c.rootCause && <p className="text-sm text-muted-foreground line-clamp-1">{t("quality.eightD.rootCauseLabel")}: {c.rootCause}</p>}
                      <CapaStatusPipeline current={c.status} t={t} />
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {c.targetDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{c.targetDate}</span>
                      )}
                      {!isTerminal && nextKey && (
                        <Button size="sm" variant="outline" onClick={() => advanceCapaStatus(c.id, c.status)} disabled={updateMut.isPending}>
                          {t("quality.eightD.advanceTo")}{t(nextKey)}<ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("quality.eightD.createCapaDialog")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("quality.eightD.typeRequired")}</Label>
              <Select value={form.capaType} onValueChange={(v) => setForm({ ...form, capaType: v as "corrective" | "preventive" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">{t("quality.eightD.correctiveFull")}</SelectItem>
                  <SelectItem value="preventive">{t("quality.eightD.preventiveFull")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("quality.eightD.titleRequired")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("quality.eightD.capaTitlePlaceholder")} />
            </div>
            <div>
              <Label>{t("quality.eightD.descriptionLabel")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("quality.eightD.descriptionPlaceholder")} rows={2} />
            </div>
            <div>
              <Label>{t("quality.eightD.rootCauseAnalysis")}</Label>
              <Textarea value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} placeholder={t("quality.eightD.rootCausePlaceholder")} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("quality.eightD.responsibleName")}</Label>
                <Input value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })} placeholder={t("quality.eightD.optional")} />
              </div>
              <div>
                <Label>{t("quality.eightD.targetCompleteDate")}</Label>
                <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("quality.eightD.cancel")}</Button>
            <Button onClick={() => createMut.mutate({ capaType: form.capaType, title: form.title, description: form.description || undefined, rootCause: form.rootCause || undefined, responsibleName: form.responsibleName || undefined, targetDate: form.targetDate || undefined })} disabled={!form.title || createMut.isPending}>
              {t("quality.eightD.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function EightDCapaManagement() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("eightd");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Shield}
        title={t("quality.eightD.pageTitle")}
        description={t("quality.eightD.pageDesc")}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="eightd" className="gap-1"><FileSearch className="w-4 h-4" />{t("quality.eightD.tab8D")}</TabsTrigger>
          <TabsTrigger value="capa" className="gap-1"><Target className="w-4 h-4" />{t("quality.eightD.tabCapa")}</TabsTrigger>
        </TabsList>

        <TabsContent value="eightd" className="mt-4">
          <EightDTab />
        </TabsContent>
        <TabsContent value="capa" className="mt-4">
          <CapaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
