/**
 * 控制计划管理 — IATF 16949 Core Tool
 * 控制计划列表 + 控制项明细
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Search, Loader2, ArrowLeft,
  FileText, Layers, Star, Eye, Gauge,
} from "lucide-react";

// ─── Labels ────────────────────────────────────────────────────
const PHASE_LABEL: Record<string, string> = {
  prototype: "试制",
  pre_launch: "试产",
  production: "量产",
};
const PHASE_VARIANT: Record<string, string> = {
  prototype: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pre_launch: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  production: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  active: "生效",
  superseded: "已替代",
  archived: "已归档",
};
const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  superseded: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  archived: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};
const CHAR_TYPE_LABEL: Record<string, string> = { product: "产品", process: "过程" };
const METHOD_LABEL: Record<string, string> = {
  visual: "目视", gauge: "量具", spc: "SPC", cmm: "CMM",
  test: "试验", audit: "审核", other: "其他",
};

// ─── Main Component ────────────────────────────────────────────
export default function ControlPlanManagement() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  // Create plan form
  const [fTitle, setFTitle] = useState("");
  const [fPartName, setFPartName] = useState("");
  const [fPartNumber, setFPartNumber] = useState("");
  const [fPhase, setFPhase] = useState<"prototype" | "pre_launch" | "production">("prototype");
  const [fFmeaId, setFFmeaId] = useState("");

  // Add item form
  const [iStep, setIStep] = useState("");
  const [iCharName, setICharName] = useState("");
  const [iCharType, setICharType] = useState<"product" | "process">("product");
  const [iSpecial, setISpecial] = useState("");
  const [iSpec, setISpec] = useState("");
  const [iTol, setITol] = useState("");
  const [iMethod, setIMethod] = useState<"visual" | "gauge" | "spc" | "cmm" | "test" | "audit" | "other">("visual");
  const [iSize, setISize] = useState("");
  const [iFreq, setIFreq] = useState("");
  const [iReaction, setIReaction] = useState("");

  // Queries
  const { data: stats } = trpc.controlPlan.getStats.useQuery({});
  const { data: listData, isLoading: listLoading } = trpc.controlPlan.list.useQuery({});
  const { data: detail, isLoading: detailLoading } = trpc.controlPlan.getById.useQuery(
    { id: selectedPlanId! },
    { enabled: selectedPlanId !== null },
  );

  const utils = trpc.useUtils();

  // Mutations
  const createMut = trpc.controlPlan.create.useMutation({
    onSuccess: () => {
      toast.success("控制计划已创建");
      setCreateOpen(false);
      resetCreateForm();
      utils.controlPlan.list.invalidate();
      utils.controlPlan.getStats.invalidate();
    },
    onError: (e) => toast.error("创建失败: " + e.message),
  });

  const addItemMut = trpc.controlPlan.addItem.useMutation({
    onSuccess: () => {
      toast.success("控制项已添加");
      setAddItemOpen(false);
      resetItemForm();
      utils.controlPlan.getById.invalidate({ id: selectedPlanId! });
      utils.controlPlan.getStats.invalidate();
    },
    onError: (e) => toast.error("添加失败: " + e.message),
  });

  const resetCreateForm = () => {
    setFTitle(""); setFPartName(""); setFPartNumber("");
    setFPhase("prototype"); setFFmeaId("");
  };
  const resetItemForm = () => {
    setIStep(""); setICharName(""); setICharType("product");
    setISpecial(""); setISpec(""); setITol(""); setIMethod("visual");
    setISize(""); setIFreq(""); setIReaction("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle.trim()) { toast.error("标题为必填项"); return; }
    createMut.mutate({
      title: fTitle.trim(),
      partName: fPartName.trim() || undefined,
      partNumber: fPartNumber.trim() || undefined,
      phase: fPhase,
      fmeaDocumentId: fFmeaId ? parseInt(fFmeaId) : undefined,
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iCharName.trim()) { toast.error("特性名称为必填项"); return; }
    addItemMut.mutate({
      controlPlanId: selectedPlanId!,
      processStep: iStep.trim() || undefined,
      characteristicName: iCharName.trim(),
      characteristicType: iCharType,
      specialCharacteristic: iSpecial.trim() || undefined,
      specification: iSpec.trim() || undefined,
      tolerance: iTol.trim() || undefined,
      controlMethod: iMethod,
      sampleSize: iSize.trim() || undefined,
      sampleFrequency: iFreq.trim() || undefined,
      reactionPlan: iReaction.trim() || undefined,
    });
  };

  // Filter
  const plans = (listData?.items ?? []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.planCode?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.partName?.toLowerCase().includes(q) ||
      p.partNumber?.toLowerCase().includes(q)
    );
  });

  // ─── Detail View ─────────────────────────────────────────────
  if (selectedPlanId !== null) {
    const items = detail?.items ?? [];
    return (
      <div className="space-y-6">
        <PageHeader
          icon={ClipboardList}
          title={detail?.title ?? "控制计划详情"}
          description={[detail?.planCode, detail?.partName, detail?.partNumber].filter(Boolean).join(" | ")}
          actions={
            <>
              <Button variant="outline" onClick={() => setSelectedPlanId(null)}>
                <ArrowLeft className="h-4 w-4 mr-2" />返回列表
              </Button>
              <Button onClick={() => setAddItemOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />添加控制项
              </Button>
            </>
          }
        />

        {detail && (
          <div className="flex gap-2 flex-wrap">
            <Badge className={PHASE_VARIANT[detail.phase] ?? ""}>{PHASE_LABEL[detail.phase] ?? detail.phase}</Badge>
            <Badge className={STATUS_VARIANT[detail.status] ?? ""}>{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
            {detail.fmeaDocumentId && <Badge variant="outline">FMEA #{detail.fmeaDocumentId}</Badge>}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>控制项明细 <span className="text-sm font-normal text-muted-foreground ml-2">共 {items.length} 项</span></CardTitle>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无控制项</p>
                <p className="text-sm mt-1">点击"添加控制项"开始填写</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      {["#","工序","特性名称","类型","特殊特性","规格/公差","控制方法","样本量/频率","反应计划"].map((h) => (
                        <th key={h} className="py-2 pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const spec = it.specification || it.tolerance
                        ? `${it.specification ?? ""}${it.tolerance ? ` ${it.tolerance}` : ""}` : "-";
                      return (
                        <tr key={it.id} className="border-b last:border-0 hover:bg-accent/50">
                          <td className="py-2 pr-3 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 pr-3">{it.processStep || "-"}</td>
                          <td className="py-2 pr-3 font-medium">{it.characteristicName}</td>
                          <td className="py-2 pr-3"><Badge variant="outline">{CHAR_TYPE_LABEL[it.characteristicType ?? ""] ?? "-"}</Badge></td>
                          <td className="py-2 pr-3">
                            {it.specialCharacteristic
                              ? <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">{it.specialCharacteristic}</Badge>
                              : "-"}
                          </td>
                          <td className="py-2 pr-3">{spec}</td>
                          <td className="py-2 pr-3"><Badge variant="secondary">{METHOD_LABEL[it.controlMethod ?? ""] ?? it.controlMethod}</Badge></td>
                          <td className="py-2 pr-3">{[it.sampleSize, it.sampleFrequency].filter(Boolean).join(" / ") || "-"}</td>
                          <td className="py-2 pr-3 max-w-[200px] truncate">{it.reactionPlan || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Item Dialog */}
        <Dialog open={addItemOpen} onOpenChange={(o) => { setAddItemOpen(o); if (!o) resetItemForm(); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>添加控制项</DialogTitle>
              <DialogDescription>为控制计划添加工序级质量控制项</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>工序步骤</Label><Input placeholder="例: OP10 清洗" value={iStep} onChange={(e) => setIStep(e.target.value)} /></div>
                <div className="space-y-1"><Label>特性名称 <span className="text-red-500">*</span></Label><Input placeholder="例: 清洁度" value={iCharName} onChange={(e) => setICharName(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>特性类型</Label>
                  <Select value={iCharType} onValueChange={(v) => setICharType(v as "product" | "process")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="product">产品特性</SelectItem><SelectItem value="process">过程特性</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>特殊特性</Label><Input placeholder="CC / SC" value={iSpecial} onChange={(e) => setISpecial(e.target.value)} /></div>
                <div className="space-y-1">
                  <Label>控制方法</Label>
                  <Select value={iMethod} onValueChange={(v) => setIMethod(v as typeof iMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(METHOD_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>规格</Label><Input placeholder="例: 5mg/件" value={iSpec} onChange={(e) => setISpec(e.target.value)} /></div>
                <div className="space-y-1"><Label>公差</Label><Input placeholder="例: +/-0.5" value={iTol} onChange={(e) => setITol(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>样本量</Label><Input placeholder="例: 5件" value={iSize} onChange={(e) => setISize(e.target.value)} /></div>
                <div className="space-y-1"><Label>样本频率</Label><Input placeholder="例: 每批" value={iFreq} onChange={(e) => setIFreq(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>反应计划</Label><Input placeholder="例: 停机 + 100%全检" value={iReaction} onChange={(e) => setIReaction(e.target.value)} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddItemOpen(false)}>取消</Button>
                <Button type="submit" disabled={addItemMut.isPending}>
                  {addItemMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}添加
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── List View ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="控制计划管理"
        description="IATF 16949 核心工具 — 工序级质量控制"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />新建控制计划
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="控制计划总数" value={stats?.totalPlans ?? 0} />
        <StatCard icon={FileText} label="控制项总数" value={stats?.totalItems ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Star} label="特殊特性" value={stats?.specialCharacteristics ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Gauge} label="SPC控制" value={stats?.byControlMethod?.spc ?? 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      {/* Phase / Status breakdown */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">阶段:</span>
          {(["prototype", "pre_launch", "production"] as const).map((ph) => (
            <Badge key={ph} className={PHASE_VARIANT[ph]}>{PHASE_LABEL[ph]} {stats?.byPhase?.[ph] ?? 0}</Badge>
          ))}
          <span className="mx-2 text-border">|</span>
          <span className="text-sm font-medium text-muted-foreground">状态:</span>
          {(["draft", "active", "superseded", "archived"] as const).map((st) => (
            <Badge key={st} className={STATUS_VARIANT[st]}>{STATUS_LABEL[st]} {stats?.byStatus?.[st] ?? 0}</Badge>
          ))}
        </CardContent>
      </Card>

      {/* Plan List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>控制计划列表 {listData && <span className="text-sm font-normal text-muted-foreground ml-2">共 {listData.total} 条</span>}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索编号/标题/零件..."
                className="pl-9 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mb-3 opacity-50" />
              <p className="font-medium">暂无控制计划</p>
              <p className="text-sm mt-1">点击"新建控制计划"创建第一份</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedPlanId(p.id)}
                >
                  <ClipboardList className="h-10 w-10 text-primary/20 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{p.planCode}</span>
                      <Badge className={PHASE_VARIANT[p.phase] ?? ""}>{PHASE_LABEL[p.phase] ?? p.phase}</Badge>
                      <Badge className={STATUS_VARIANT[p.status] ?? ""}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                    </div>
                    <p className="font-medium mt-1 truncate">{p.title}</p>
                    {(p.partName || p.partNumber) && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {[p.partName, p.partNumber].filter(Boolean).join(" | ")}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedPlanId(p.id); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建控制计划</DialogTitle>
            <DialogDescription>创建新的IATF 16949控制计划</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>标题 <span className="text-red-500">*</span></Label>
              <Input placeholder="例: 缸体清洗线控制计划" value={fTitle} onChange={(e) => setFTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>零件名称</Label>
                <Input placeholder="例: 缸体" value={fPartName} onChange={(e) => setFPartName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>零件编号</Label>
                <Input placeholder="例: P-2026-001" value={fPartNumber} onChange={(e) => setFPartNumber(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>阶段</Label>
                <Select value={fPhase} onValueChange={(v) => setFPhase(v as typeof fPhase)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prototype">试制</SelectItem>
                    <SelectItem value="pre_launch">试产</SelectItem>
                    <SelectItem value="production">量产</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>关联FMEA ID</Label>
                <Input placeholder="可选" value={fFmeaId} onChange={(e) => setFFmeaId(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
