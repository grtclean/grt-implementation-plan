/**
 * 8D Problem Solving + CAPA Management
 * IATF 16949 — D0-D8 structured problem solving & Corrective/Preventive Actions
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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
const D_LABELS: Record<string, string> = {
  open: "立项", D1: "团队", D2: "描述", D3: "围堵", D4: "根因",
  D5: "纠正", D6: "验证", D7: "预防", D8: "总结", closed: "关闭", verified: "已验证",
};

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  critical: { label: "严重", color: "bg-red-500/15 text-red-500 border-red-500/30" },
  high: { label: "高", color: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  medium: { label: "中", color: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  low: { label: "低", color: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

const CAPA_STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "待处理", color: "bg-gray-500/15 text-gray-400" },
  investigation: { label: "调查中", color: "bg-blue-500/15 text-blue-500" },
  action_planned: { label: "已计划", color: "bg-indigo-500/15 text-indigo-500" },
  implemented: { label: "已实施", color: "bg-amber-500/15 text-amber-500" },
  verified: { label: "已验证", color: "bg-green-500/15 text-green-500" },
  closed: { label: "已关闭", color: "bg-emerald-500/15 text-emerald-400" },
};

const CAPA_STATUS_ORDER = ["open", "investigation", "action_planned", "implemented", "verified", "closed"];

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
}

// ─── D-Step Pipeline ──────────────────────────────────────────
function DStepPipeline({ current }: { current: string }) {
  const idx = D_STEPS.indexOf(current as typeof D_STEPS[number]);
  // Show a compact pipeline: open → D1-D8 → closed → verified
  const display = D_STEPS.slice(0, -1); // exclude "verified" from circles for space
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
              title={D_LABELS[step]}
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
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-green-500 border-green-500 text-white border" title="已验证">
            V
          </div>
        </>
      )}
    </div>
  );
}

// ─── CAPA Status Pipeline ─────────────────────────────────────
function CapaStatusPipeline({ current }: { current: string }) {
  const idx = CAPA_STATUS_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-0.5">
      {CAPA_STATUS_ORDER.map((st, i) => {
        const done = i < idx;
        const active = i === idx;
        const meta = CAPA_STATUS_MAP[st];
        return (
          <div key={st} className="flex items-center">
            <div
              className={`h-2 w-6 rounded-full transition-colors ${
                done ? "bg-green-500" : active ? "bg-primary" : "bg-muted"
              }`}
              title={meta?.label}
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
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", problemDescription: "", severity: "medium", source: "", customerName: "", partNumber: "", dueDate: "" });

  const utils = trpc.useUtils();
  const statsQ = trpc.eightDCapa.getStats.useQuery({});
  const listQ = trpc.eightDCapa.list8D.useQuery({});
  const createMut = trpc.eightDCapa.create8D.useMutation({
    onSuccess: () => { toast.success("8D报告已创建"); setShowCreate(false); resetForm(); utils.eightDCapa.list8D.invalidate(); utils.eightDCapa.getStats.invalidate(); },
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
        <StatCard icon={ClipboardList} label="8D报告总数" value={stats?.total ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="进行中" value={stats?.open ?? 0} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard icon={CheckCircle2} label="已关闭" value={stats?.closed ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={XCircle} label="严重问题" value={stats?.bySeverity?.critical ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">8D报告列表</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />新建8D</Button>
      </div>

      {/* List */}
      {listQ.isLoading ? <LoadingSkeleton rows={4} /> : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">暂无8D报告，点击"新建8D"创建</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((r: any) => {
            const sev = SEVERITY_MAP[r.severity] ?? SEVERITY_MAP.medium;
            const next = getNextStep(r.currentStep);
            return (
              <Card key={r.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{r.reportCode}</span>
                        <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
                        <Badge variant="outline">{D_LABELS[r.currentStep] ?? r.currentStep}</Badge>
                        {r.customerName && <span className="text-xs text-muted-foreground">客户: {r.customerName}</span>}
                        {r.partNumber && <span className="text-xs text-muted-foreground">零件号: {r.partNumber}</span>}
                      </div>
                      <p className="font-medium truncate">{r.title}</p>
                      {r.problemDescription && <p className="text-sm text-muted-foreground line-clamp-1">{r.problemDescription}</p>}
                      <DStepPipeline current={r.currentStep} />
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {r.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{r.dueDate}</span>
                      )}
                      {next && (
                        <Button size="sm" variant="outline" onClick={() => handleAdvance(r.id, r.currentStep)} disabled={advanceMut.isPending}>
                          推进至{D_LABELS[next] ?? next}<ChevronRight className="w-3 h-3 ml-1" />
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
          <DialogHeader><DialogTitle>新建8D报告</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>标题 *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="简要描述问题" />
            </div>
            <div>
              <Label>问题描述</Label>
              <Textarea value={form.problemDescription} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })} placeholder="详细描述问题现象" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>严重程度</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">严重</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>来源</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="客户投诉/内部审核..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>客户名称</Label>
                <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="(可选)" />
              </div>
              <div>
                <Label>零件号</Label>
                <Input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} placeholder="(可选)" />
              </div>
            </div>
            <div>
              <Label>目标关闭日期</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={() => createMut.mutate({ title: form.title, problemDescription: form.problemDescription || undefined, severity: form.severity as "critical", source: form.source || undefined, customerName: form.customerName || undefined, partNumber: form.partNumber || undefined, dueDate: form.dueDate || undefined })} disabled={!form.title || createMut.isPending}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 2: CAPA Management ──────────────────────────────────
function CapaTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ capaType: "corrective" as "corrective" | "preventive", title: "", description: "", rootCause: "", responsibleName: "", targetDate: "" });

  const utils = trpc.useUtils();
  const statsQ = trpc.eightDCapa.getStats.useQuery({});
  const listQ = trpc.eightDCapa.listCAPA.useQuery({});
  const createMut = trpc.eightDCapa.createCAPA.useMutation({
    onSuccess: () => { toast.success("CAPA已创建"); setShowCreate(false); resetForm(); utils.eightDCapa.listCAPA.invalidate(); utils.eightDCapa.getStats.invalidate(); },
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
        <StatCard icon={Target} label="CAPA总数" value={stats?.total ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="未关闭" value={stats?.open ?? 0} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard icon={Bug} label="纠正措施" value={stats?.corrective ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Lightbulb} label="预防措施" value={stats?.preventive ?? 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">CAPA列表</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />新建CAPA</Button>
      </div>

      {/* List */}
      {listQ.isLoading ? <LoadingSkeleton rows={4} /> : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">暂无CAPA记录，点击"新建CAPA"创建</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((c: any) => {
            const statusMeta = CAPA_STATUS_MAP[c.status] ?? CAPA_STATUS_MAP.open;
            const isTerminal = c.status === "closed";
            const nextIdx = CAPA_STATUS_ORDER.indexOf(c.status) + 1;
            const nextLabel = nextIdx < CAPA_STATUS_ORDER.length ? CAPA_STATUS_MAP[CAPA_STATUS_ORDER[nextIdx]]?.label : null;
            return (
              <Card key={c.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{c.capaCode}</span>
                        <Badge variant="outline" className={c.capaType === "corrective" ? "bg-red-500/15 text-red-500 border-red-500/30" : "bg-purple-500/15 text-purple-500 border-purple-500/30"}>
                          {c.capaType === "corrective" ? "纠正" : "预防"}
                        </Badge>
                        <Badge variant="outline" className={statusMeta.color}>{statusMeta.label}</Badge>
                        {c.responsibleName && <span className="text-xs text-muted-foreground">负责人: {c.responsibleName}</span>}
                      </div>
                      <p className="font-medium truncate">{c.title}</p>
                      {c.rootCause && <p className="text-sm text-muted-foreground line-clamp-1">根因: {c.rootCause}</p>}
                      <CapaStatusPipeline current={c.status} />
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {c.targetDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{c.targetDate}</span>
                      )}
                      {!isTerminal && nextLabel && (
                        <Button size="sm" variant="outline" onClick={() => advanceCapaStatus(c.id, c.status)} disabled={updateMut.isPending}>
                          推进至{nextLabel}<ChevronRight className="w-3 h-3 ml-1" />
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
          <DialogHeader><DialogTitle>新建CAPA</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>类型 *</Label>
              <Select value={form.capaType} onValueChange={(v) => setForm({ ...form, capaType: v as "corrective" | "preventive" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">纠正措施 (Corrective)</SelectItem>
                  <SelectItem value="preventive">预防措施 (Preventive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>标题 *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="CAPA标题" />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="详细描述" rows={2} />
            </div>
            <div>
              <Label>根本原因</Label>
              <Textarea value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} placeholder="分析根本原因" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>负责人</Label>
                <Input value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })} placeholder="(可选)" />
              </div>
              <div>
                <Label>目标完成日期</Label>
                <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={() => createMut.mutate({ capaType: form.capaType, title: form.title, description: form.description || undefined, rootCause: form.rootCause || undefined, responsibleName: form.responsibleName || undefined, targetDate: form.targetDate || undefined })} disabled={!form.title || createMut.isPending}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function EightDCapaManagement() {
  const [tab, setTab] = useState("eightd");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Shield}
        title="8D问题解决 & CAPA管理"
        description="IATF 16949 结构化问题解决流程 (D0-D8) 与纠正/预防措施管理"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="eightd" className="gap-1"><FileSearch className="w-4 h-4" />8D报告</TabsTrigger>
          <TabsTrigger value="capa" className="gap-1"><Target className="w-4 h-4" />CAPA管理</TabsTrigger>
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
