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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  in_review: { label: "评审中", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  approved: { label: "已批准", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  active: { label: "生效中", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  archived: { label: "已归档", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={s.color}>{s.label}</Badge>;
}

function RpnBadge({ rpn }: { rpn: number }) {
  if (rpn >= 200) return <Badge className="bg-red-600 hover:bg-red-700 text-white">{rpn}</Badge>;
  if (rpn >= 80) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{rpn}</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">{rpn}</Badge>;
}

function PriorityBadge({ ap }: { ap: string }) {
  if (ap === "H") return <Badge className="bg-red-600 hover:bg-red-700 text-white">高</Badge>;
  if (ap === "M") return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">中</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">低</Badge>;
}

// ── Tab 1: FMEA文档 ─────────────────────────────────────────
function DocumentsTab({ onSelect }: { onSelect: (id: number) => void }) {
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
          <StatCard icon={FileText} label="文档总数" value={stats.totalDocuments} subtitle={`DFMEA: ${stats.byType.DFMEA} | PFMEA: ${stats.byType.PFMEA}`} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertTriangle} label="高风险项" value={stats.highRiskItems} subtitle={`中风险: ${stats.mediumRiskItems}`} iconColor="text-red-500" iconBg="bg-red-500/10" />
          <StatCard icon={BarChart3} label="平均RPN" value={stats.avgRpn} subtitle={`失效模式: ${stats.totalItems}项`} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
          <StatCard icon={CheckCircle2} label="措施完成" value={`${stats.completedActions}/${stats.totalActions}`} subtitle={`待处理: ${stats.openActions}`} iconColor="text-green-500" iconBg="bg-green-500/10" />
        </div>
      ) : <LoadingSkeleton rows={1} />}

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="DFMEA">DFMEA</SelectItem>
            <SelectItem value="PFMEA">PFMEA</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="in_review">评审中</SelectItem>
            <SelectItem value="approved">已批准</SelectItem>
            <SelectItem value="active">生效中</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />新建FMEA</Button>
      </div>

      {/* Document list */}
      {docsQ.isLoading ? <LoadingSkeleton rows={4} /> : (
        <div className="space-y-2">
          {(docsQ.data?.items ?? []).length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">暂无FMEA文档，点击"新建FMEA"开始分析</CardContent></Card>
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
                    {doc.fmeaCode} {doc.productName ? `| 产品: ${doc.productName}` : ""} {doc.processName ? `| 过程: ${doc.processName}` : ""} {doc.scope ? `| ${doc.scope}` : ""}
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
          <DialogHeader><DialogTitle>新建FMEA文档</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>FMEA类型</Label>
              <Select value={form.fmeaType} onValueChange={(v) => setForm({ ...form, fmeaType: v as "DFMEA" | "PFMEA" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DFMEA">DFMEA (设计)</SelectItem>
                  <SelectItem value="PFMEA">PFMEA (过程)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>标题 *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：XX产品设计FMEA" />
            </div>
            <div>
              <Label>范围</Label>
              <Input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="分析范围描述" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>产品名称</Label>
                <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
              </div>
              <div>
                <Label>过程名称</Label>
                <Input value={form.processName} onChange={(e) => setForm({ ...form, processName: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button disabled={!form.title.trim() || createMut.isPending} onClick={() => createMut.mutate({
              fmeaType: form.fmeaType, title: form.title.trim(),
              scope: form.scope || undefined, productName: form.productName || undefined, processName: form.processName || undefined,
            })}>
              {createMut.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 2: 风险分析 ─────────────────────────────────────────
function RiskAnalysisTab({ docId, onBack }: { docId: number | null; onBack: () => void }) {
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
          <p>请先在"FMEA文档"标签页选择一个文档进行风险分析</p>
        </CardContent></Card>
        {highRiskQ.data && highRiskQ.data.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />全局高风险项 Top 10</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">失效模式</th><th className="pb-2">影响</th><th className="pb-2">S</th><th className="pb-2">O</th><th className="pb-2">D</th><th className="pb-2">RPN</th><th className="pb-2">优先级</th>
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
  if (!doc) return <Card><CardContent className="p-6 text-center text-muted-foreground">文档未找到</CardContent></Card>;

  const computedRpn = itemForm.severity * itemForm.occurrence * itemForm.detection;

  return (
    <div className="space-y-4">
      {/* Document header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />返回</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{doc.title}</span>
            <Badge variant="outline">{doc.fmeaType}</Badge>
            <StatusBadge status={doc.status} />
          </div>
          <p className="text-xs text-muted-foreground">{doc.fmeaCode} {doc.scope ? `| ${doc.scope}` : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setItemForm({ failureMode: "", failureEffect: "", failureCause: "", severity: 1, occurrence: 1, detection: 1 }); setShowAddItem(true); }}>
          <Plus className="w-4 h-4 mr-1" />添加失效模式
        </Button>
      </div>

      {/* Items table */}
      {(doc.items ?? []).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">暂无失效模式，点击"添加失效模式"开始分析</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="p-3">#</th>
                  <th className="p-3">失效模式</th>
                  <th className="p-3">失效影响</th>
                  <th className="p-3">失效原因</th>
                  <th className="p-3 text-center">S</th>
                  <th className="p-3 text-center">O</th>
                  <th className="p-3 text-center">D</th>
                  <th className="p-3 text-center">RPN</th>
                  <th className="p-3 text-center">优先级</th>
                  <th className="p-3">措施</th>
                  <th className="p-3">操作</th>
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
                          <span className="text-xs text-muted-foreground">{item.actions.length}项措施</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" onClick={() => { setActionItemId(item.id); setActionForm({ actionDescription: "", responsiblePerson: "", targetDate: "" }); setShowAddAction(true); }}>
                          <Zap className="w-3 h-3 mr-1" />措施
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
              {item.failureMode} - 改进措施 ({item.actions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {item.actions.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 text-sm border rounded-md p-2">
                  <Badge variant="outline" className={a.status === "completed" || a.status === "verified" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}>
                    {a.status === "open" ? "待处理" : a.status === "in_progress" ? "进行中" : a.status === "completed" ? "已完成" : a.status === "verified" ? "已验证" : "已取消"}
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
          <DialogHeader><DialogTitle>添加失效模式</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>失效模式 *</Label>
              <Input value={itemForm.failureMode} onChange={(e) => setItemForm({ ...itemForm, failureMode: e.target.value })} placeholder="描述可能的失效方式" />
            </div>
            <div>
              <Label>失效影响</Label>
              <Textarea value={itemForm.failureEffect} onChange={(e) => setItemForm({ ...itemForm, failureEffect: e.target.value })} placeholder="失效对系统/客户的影响" rows={2} />
            </div>
            <div>
              <Label>失效原因</Label>
              <Textarea value={itemForm.failureCause} onChange={(e) => setItemForm({ ...itemForm, failureCause: e.target.value })} placeholder="导致该失效模式的根本原因" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>严重度 S (1-10)</Label>
                <Input type="number" min={1} max={10} value={itemForm.severity} onChange={(e) => setItemForm({ ...itemForm, severity: Math.min(10, Math.max(1, +e.target.value || 1)) })} />
              </div>
              <div>
                <Label>发生度 O (1-10)</Label>
                <Input type="number" min={1} max={10} value={itemForm.occurrence} onChange={(e) => setItemForm({ ...itemForm, occurrence: Math.min(10, Math.max(1, +e.target.value || 1)) })} />
              </div>
              <div>
                <Label>探测度 D (1-10)</Label>
                <Input type="number" min={1} max={10} value={itemForm.detection} onChange={(e) => setItemForm({ ...itemForm, detection: Math.min(10, Math.max(1, +e.target.value || 1)) })} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">预计 RPN:</span>
              <RpnBadge rpn={computedRpn} />
              <span className="text-muted-foreground">({computedRpn >= 200 ? "高风险" : computedRpn >= 80 ? "中风险" : "低风险"})</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>取消</Button>
            <Button disabled={!itemForm.failureMode.trim() || addItemMut.isPending} onClick={() => addItemMut.mutate({
              fmeaDocumentId: docId,
              failureMode: itemForm.failureMode.trim(),
              failureEffect: itemForm.failureEffect || undefined,
              failureCause: itemForm.failureCause || undefined,
              severity: itemForm.severity,
              occurrence: itemForm.occurrence,
              detection: itemForm.detection,
            })}>
              {addItemMut.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add action dialog */}
      <Dialog open={showAddAction} onOpenChange={(open) => { setShowAddAction(open); if (!open) setActionItemId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加改进措施</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>措施描述 *</Label>
              <Textarea value={actionForm.actionDescription} onChange={(e) => setActionForm({ ...actionForm, actionDescription: e.target.value })} placeholder="描述改进措施内容" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>负责人</Label>
                <Input value={actionForm.responsiblePerson} onChange={(e) => setActionForm({ ...actionForm, responsiblePerson: e.target.value })} placeholder="姓名" />
              </div>
              <div>
                <Label>目标日期</Label>
                <Input type="date" value={actionForm.targetDate} onChange={(e) => setActionForm({ ...actionForm, targetDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddAction(false); setActionItemId(null); }}>取消</Button>
            <Button disabled={!actionForm.actionDescription.trim() || !actionItemId || addActionMut.isPending} onClick={() => addActionMut.mutate({
              fmeaItemId: actionItemId!,
              actionDescription: actionForm.actionDescription.trim(),
              responsiblePerson: actionForm.responsiblePerson || undefined,
              targetDate: actionForm.targetDate || undefined,
            })}>
              {addActionMut.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function FMEAManagement() {
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
        title="FMEA管理"
        description="失效模式与影响分析 (IATF 16949 核心工具)"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="documents" className="flex items-center gap-1">
            <FileText className="w-4 h-4" />FMEA文档
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />风险分析
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
