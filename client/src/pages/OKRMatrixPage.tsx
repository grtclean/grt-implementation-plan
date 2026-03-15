/**
 * OKR Matrix Page — OKR矩阵 (/strategy/okr-matrix)
 *
 * Full CRUD: Create/Edit/Delete objectives + key results, check-in, seed demo.
 * Permission-gated: director+ can manage, others read-only.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Target, Loader2, TrendingUp, CheckCircle, AlertTriangle, XCircle,
  Building2, Layers, Users, User, Plus, Pencil, Trash2, Database,
  ChevronDown, ChevronRight, BarChart3, Shield,
} from "lucide-react";

const LEVEL_CONFIG = [
  { key: "companyLevel", labelZh: "公司级", labelEn: "Company", icon: Building2, color: "#0078D4", value: "company" },
  { key: "buLevel",      labelZh: "BU级",   labelEn: "BU",      icon: Layers,    color: "#4F6BED", value: "bu" },
  { key: "deptLevel",    labelZh: "部门级", labelEn: "Dept",    icon: Users,     color: "#008272", value: "department" },
  { key: "teamLevel",    labelZh: "团队级", labelEn: "Team",    icon: User,      color: "#CA5010", value: "individual" },
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  active: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-600" },
};

export default function OKRMatrixPage() {
  const { language } = useLanguage();
  const { level: roleLevel } = useUserProfile();
  const canManage = roleLevel >= 5;
  const isZh = language === "zh";

  const [showCreate, setShowCreate] = useState(false);
  const [editingObj, setEditingObj] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateKr, setShowCreateKr] = useState<number | null>(null);
  const [showCheckIn, setShowCheckIn] = useState<any>(null);

  // ─── Queries ───
  const dashboardQuery = trpc.okr.dashboard.useQuery();
  const listQuery = trpc.okr.list.useQuery({ limit: 100, offset: 0 });
  const seedMut = trpc.okr.seedDemo.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); listQuery.refetch(); toast.success("OKR Demo数据已初始化"); },
    onError: (e) => toast.error(e.message),
  });

  // ─── CRUD Mutations ───
  const createObjMut = trpc.okr.createObjective.useMutation({
    onSuccess: () => { listQuery.refetch(); dashboardQuery.refetch(); setShowCreate(false); toast.success("OKR目标已创建"); },
    onError: (e) => toast.error(e.message),
  });
  const updateObjMut = trpc.okr.updateObjective.useMutation({
    onSuccess: () => { listQuery.refetch(); dashboardQuery.refetch(); setEditingObj(null); toast.success("目标已更新"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteObjMut = trpc.okr.deleteObjective.useMutation({
    onSuccess: () => { listQuery.refetch(); dashboardQuery.refetch(); toast.success("目标已删除"); },
    onError: (e) => toast.error(e.message),
  });
  const createKrMut = trpc.okr.createKeyResult.useMutation({
    onSuccess: () => { listQuery.refetch(); setShowCreateKr(null); toast.success("关键结果已添加"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteKrMut = trpc.okr.deleteKeyResult.useMutation({
    onSuccess: () => { listQuery.refetch(); toast.success("关键结果已删除"); },
    onError: (e) => toast.error(e.message),
  });
  const checkInMut = trpc.okr.checkIn.useMutation({
    onSuccess: () => { listQuery.refetch(); setShowCheckIn(null); toast.success("Check-in已记录"); },
    onError: (e) => toast.error(e.message),
  });

  const dash = dashboardQuery.data;
  const items = (listQuery.data as any)?.items ?? [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{isZh ? "OKR 矩阵" : "OKR Matrix"}</h1>
              <p className="text-sm text-muted-foreground">{isZh ? "目标与关键成果对齐矩阵" : "Objectives & Key Results"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-1" />新建OKR
                </Button>
                <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                  <Database className="h-4 w-4 mr-1" />{seedMut.isPending ? "初始化..." : "初始化Demo"}
                </Button>
              </>
            )}
            {!canManage && (
              <Badge variant="outline" className="text-xs"><Shield className="w-3 h-3 mr-1" />只读模式</Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {dashboardQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-indigo-600">{dash?.totalObjectives ?? 0}</p><p className="text-xs text-muted-foreground mt-1">{isZh ? "总目标数" : "Total OKRs"}</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-blue-600">{dash?.avgProgress ?? 0}%</p><p className="text-xs text-muted-foreground mt-1">{isZh ? "平均进度" : "Avg Progress"}</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /><p className="text-3xl font-bold text-green-600">{dash?.onTrack ?? 0}</p></div><p className="text-xs text-muted-foreground mt-1">{isZh ? "正常" : "On Track"}</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500" /><p className="text-3xl font-bold text-amber-600">{dash?.atRisk ?? 0}</p></div><p className="text-xs text-muted-foreground mt-1">{isZh ? "有风险" : "At Risk"}</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-1"><XCircle className="w-4 h-4 text-red-500" /><p className="text-3xl font-bold text-red-600">{dash?.behind ?? 0}</p></div><p className="text-xs text-muted-foreground mt-1">{isZh ? "落后" : "Behind"}</p></CardContent></Card>
            </div>

            {/* Level Breakdown */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" />{isZh ? "层级分布" : "Level Breakdown"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {LEVEL_CONFIG.map((lv) => {
                    const Icon = lv.icon;
                    const count = (dash as any)?.[lv.key] ?? 0;
                    return (
                      <div key={lv.key} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: lv.color + "15" }}>
                          <Icon className="w-4 h-4" style={{ color: lv.color }} />
                        </div>
                        <div><p className="text-lg font-bold" style={{ color: lv.color }}>{count}</p><p className="text-xs text-muted-foreground">{isZh ? lv.labelZh : lv.labelEn}</p></div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* OKR List with expandable KRs */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  {isZh ? "目标列表" : "Objectives"} ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">{isZh ? "暂无 OKR 目标" : "No OKR objectives yet"}</p>
                    {canManage && <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />创建第一个目标</Button>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((obj: any) => {
                      const isExpanded = expandedId === obj.id;
                      const sc = STATUS_CONFIG[obj.status] ?? STATUS_CONFIG.draft;
                      return (
                        <div key={obj.id} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(isExpanded ? null : obj.id)}>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{obj.title}</span>
                                <Badge variant="outline" className="text-[10px]">{obj.level}</Badge>
                                <Badge className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                              </div>
                              {obj.ownerName && <span className="text-xs text-muted-foreground">{obj.ownerName} · {obj.period}</span>}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="w-24"><Progress value={obj.progress ?? 0} className="h-1.5" /></div>
                              <span className="text-xs font-medium w-10 text-right">{obj.progress ?? 0}%</span>
                              {canManage && (
                                <div className="flex items-center gap-0.5">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setEditingObj(obj); }}><Pencil className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={(e) => { e.stopPropagation(); if (confirm(`删除「${obj.title}」及其所有KR？`)) deleteObjMut.mutate({ id: obj.id }); }}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Expanded: Key Results */}
                          {isExpanded && (
                            <div className="border-t bg-muted/20 p-3 space-y-2">
                              {(obj.keyResults ?? []).length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-2">暂无关键结果</p>
                              )}
                              {(obj.keyResults ?? []).map((kr: any) => (
                                <div key={kr.id} className="flex items-center gap-3 p-2 bg-background rounded border text-sm">
                                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                  <span className="flex-1 min-w-0 truncate">{kr.title}</span>
                                  <span className="text-xs text-muted-foreground">{kr.currentValue}/{kr.targetValue} {kr.unit}</span>
                                  <Badge variant="outline" className="text-[9px]">{kr.status}</Badge>
                                  {canManage && (
                                    <>
                                      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => setShowCheckIn(kr)}>Check-in</Button>
                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-500" onClick={() => { if (confirm(`删除KR「${kr.title}」?`)) deleteKrMut.mutate({ id: kr.id }); }}><Trash2 className="h-2.5 w-2.5" /></Button>
                                    </>
                                  )}
                                </div>
                              ))}
                              {canManage && (
                                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowCreateKr(obj.id)}>
                                  <Plus className="h-3 w-3 mr-1" />添加关键结果
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ═══ Create Objective Dialog ═══ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>新建OKR目标</DialogTitle></DialogHeader>
          <CreateObjForm onSubmit={(data) => createObjMut.mutate(data)} isPending={createObjMut.isPending} />
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Objective Dialog ═══ */}
      <Dialog open={!!editingObj} onOpenChange={(o) => !o && setEditingObj(null)}>
        <DialogContent><DialogHeader><DialogTitle>编辑OKR目标</DialogTitle></DialogHeader>
          {editingObj && <EditObjForm obj={editingObj} onSubmit={(data) => updateObjMut.mutate({ id: editingObj.id, ...data })} isPending={updateObjMut.isPending} />}
        </DialogContent>
      </Dialog>

      {/* ═══ Create Key Result Dialog ═══ */}
      <Dialog open={showCreateKr !== null} onOpenChange={(o) => !o && setShowCreateKr(null)}>
        <DialogContent><DialogHeader><DialogTitle>添加关键结果</DialogTitle></DialogHeader>
          {showCreateKr && <CreateKrForm objectiveId={showCreateKr} onSubmit={(data) => createKrMut.mutate(data)} isPending={createKrMut.isPending} />}
        </DialogContent>
      </Dialog>

      {/* ═══ Check-in Dialog ═══ */}
      <Dialog open={!!showCheckIn} onOpenChange={(o) => !o && setShowCheckIn(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>KR Check-in</DialogTitle></DialogHeader>
          {showCheckIn && <CheckInForm kr={showCheckIn} onSubmit={(data) => checkInMut.mutate(data)} isPending={checkInMut.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Form Components ─────────────────────────────────────────

function CreateObjForm({ onSubmit, isPending }: { onSubmit: (d: any) => void; isPending: boolean }) {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("department");
  const [period, setPeriod] = useState("2026-Q1");
  const [priority, setPriority] = useState("P1");
  const [description, setDescription] = useState("");
  return (
    <div className="space-y-3">
      <div><Label>目标标题 *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如: 2026年海外营收突破8500万" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>层级</Label>
          <Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="company">公司级</SelectItem>
              <SelectItem value="bu">BU级</SelectItem>
              <SelectItem value="department">部门级</SelectItem>
              <SelectItem value="individual">个人级</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>周期</Label>
          <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-Q1">2026 Q1</SelectItem>
              <SelectItem value="2026-Q2">2026 Q2</SelectItem>
              <SelectItem value="2026-H1">2026 H1</SelectItem>
              <SelectItem value="2026-YEAR">2026 全年</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>优先级</Label>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="P0">P0 最高</SelectItem><SelectItem value="P1">P1 高</SelectItem><SelectItem value="P2">P2 中</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>描述</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
      <DialogFooter>
        <Button disabled={isPending || !title} onClick={() => onSubmit({ title, level, period, priority, description: description || undefined })}>
          {isPending ? "创建中..." : "创建目标"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function EditObjForm({ obj, onSubmit, isPending }: { obj: any; onSubmit: (d: any) => void; isPending: boolean }) {
  const [title, setTitle] = useState(obj.title);
  const [status, setStatus] = useState(obj.status ?? "active");
  const [progress, setProgress] = useState(String(obj.progress ?? 0));
  const [priority, setPriority] = useState(obj.priority ?? "P1");
  return (
    <div className="space-y-3">
      <div><Label>标题</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>状态</Label>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="draft">草稿</SelectItem><SelectItem value="active">进行中</SelectItem><SelectItem value="completed">已完成</SelectItem><SelectItem value="cancelled">已取消</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>进度 (%)</Label><Input type="number" value={progress} onChange={e => setProgress(e.target.value)} min="0" max="100" /></div>
        <div><Label>优先级</Label>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="P0">P0</SelectItem><SelectItem value="P1">P1</SelectItem><SelectItem value="P2">P2</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={isPending} onClick={() => onSubmit({ title, status, progress: parseFloat(progress), priority })}>
          {isPending ? "保存中..." : "保存修改"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function CreateKrForm({ objectiveId, onSubmit, isPending }: { objectiveId: number; onSubmit: (d: any) => void; isPending: boolean }) {
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("100");
  const [startValue, setStartValue] = useState("0");
  const [unit, setUnit] = useState("%");
  const [metricType, setMetricType] = useState("percentage");
  return (
    <div className="space-y-3">
      <div><Label>KR标题 *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如: Q1签约金额达2000万" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>起始值</Label><Input type="number" value={startValue} onChange={e => setStartValue(e.target.value)} /></div>
        <div><Label>目标值</Label><Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} /></div>
        <div><Label>单位</Label>
          <Select value={unit} onValueChange={setUnit}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="%">%</SelectItem><SelectItem value="万">万</SelectItem><SelectItem value="个">个</SelectItem><SelectItem value="分">分</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={isPending || !title} onClick={() => onSubmit({ objectiveId, title, startValue: parseFloat(startValue), targetValue: parseFloat(targetValue), unit, metricType })}>
          {isPending ? "添加中..." : "添加KR"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function CheckInForm({ kr, onSubmit, isPending }: { kr: any; onSubmit: (d: any) => void; isPending: boolean }) {
  const [value, setValue] = useState(String(kr.currentValue ?? 0));
  const [confidence, setConfidence] = useState("0.7");
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      <div className="p-2 bg-muted/50 rounded text-sm">
        <div className="font-medium">{kr.title}</div>
        <div className="text-xs text-muted-foreground">目标: {kr.targetValue} {kr.unit} | 当前: {kr.currentValue}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>当前值</Label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div>
        <div><Label>信心度 (0-1)</Label><Input type="number" step="0.1" min="0" max="1" value={confidence} onChange={e => setConfidence(e.target.value)} /></div>
      </div>
      <div><Label>备注</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="进展说明..." /></div>
      <DialogFooter>
        <Button disabled={isPending} onClick={() => onSubmit({ keyResultId: kr.id, value: parseFloat(value), confidence: parseFloat(confidence), note: note || undefined })}>
          {isPending ? "提交中..." : "提交Check-in"}
        </Button>
      </DialogFooter>
    </div>
  );
}
