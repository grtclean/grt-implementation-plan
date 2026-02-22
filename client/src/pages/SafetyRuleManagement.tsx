/**
 * 安全规则管理页面
 * 安全规则库 + 安全校验引擎
 * Wired to safety-rule.router.ts
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ShieldCheck, Plus, AlertTriangle, Ban, CheckCircle2,
  Info, Zap, Flame, FlaskConical, Settings, Activity,
  Search, Trash2, ShieldAlert,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: typeof Flame }> = {
  physical:    { label: "物理", color: "bg-blue-100 text-blue-700", icon: Activity },
  chemical:    { label: "化学", color: "bg-purple-100 text-purple-700", icon: FlaskConical },
  electrical:  { label: "电气", color: "bg-amber-100 text-amber-700", icon: Zap },
  operational: { label: "操作", color: "bg-green-100 text-green-700", icon: Settings },
};

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  fatal:    { label: "致命", color: "bg-red-100 text-red-700" },
  critical: { label: "严重", color: "bg-orange-100 text-orange-700" },
  warning:  { label: "警告", color: "bg-amber-100 text-amber-700" },
  info:     { label: "信息", color: "bg-blue-100 text-blue-700" },
};

const CATEGORIES = ["physical", "chemical", "electrical", "operational"] as const;
const SEVERITIES = ["fatal", "critical", "warning", "info"] as const;

function LoadingSkeleton() {
  return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
}

/* ───────────────────────── Tab 1: Rules Library ───────────────────────── */
function RulesTab() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "physical" as string, parameterName: "", unit: "", minValue: "", maxValue: "", severity: "warning" as string, materialType: "", equipmentModel: "", description: "" });

  const utils = trpc.useUtils();
  const listQ = trpc.safetyRule.list.useQuery({});
  const statsQ = trpc.safetyRule.getStats.useQuery();
  const createM = trpc.safetyRule.create.useMutation({ onSuccess: () => { utils.safetyRule.list.invalidate(); utils.safetyRule.getStats.invalidate(); toast.success("规则已创建"); setDialogOpen(false); resetForm(); } });
  const updateM = trpc.safetyRule.update.useMutation({ onSuccess: () => { utils.safetyRule.list.invalidate(); utils.safetyRule.getStats.invalidate(); } });
  const seedM = trpc.safetyRule.seedDefaults.useMutation({ onSuccess: (r) => { utils.safetyRule.list.invalidate(); utils.safetyRule.getStats.invalidate(); toast.success(r.message); } });

  const resetForm = () => setForm({ name: "", category: "physical", parameterName: "", unit: "", minValue: "", maxValue: "", severity: "warning", materialType: "", equipmentModel: "", description: "" });

  const items = (listQ.data?.items ?? []).filter((r: any) => !search || r.name?.includes(search) || r.ruleCode?.includes(search) || r.parameterName?.includes(search));
  const stats = statsQ.data;

  const toggleActive = (id: number, current: number) => {
    updateM.mutate({ id, isActive: current === 1 ? false : true });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={ShieldCheck} label="规则总数" value={stats.total} />
          <StatCard icon={CheckCircle2} label="启用中" value={stats.active} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard icon={AlertTriangle} label="致命+严重" value={stats.bySeverity.fatal + stats.bySeverity.critical} iconColor="text-red-600" iconBg="bg-red-100" />
          <StatCard icon={Activity} label="类别覆盖" value={Object.values(stats.byCategory).filter(v => v > 0).length + "/4"} iconColor="text-blue-600" iconBg="bg-blue-100" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索规则..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => seedM.mutate()} disabled={seedM.isPending}>
            <ShieldAlert className="h-4 w-4 mr-1" />初始化默认规则
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />新建规则</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>新建安全规则</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>规则名称 *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>类别 *</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c].label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>参数名称 *</Label><Input value={form.parameterName} onChange={e => setForm(f => ({ ...f, parameterName: e.target.value }))} /></div>
                  <div><Label>单位</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>最小值</Label><Input value={form.minValue} onChange={e => setForm(f => ({ ...f, minValue: e.target.value }))} /></div>
                  <div><Label>最大值</Label><Input value={form.maxValue} onChange={e => setForm(f => ({ ...f, maxValue: e.target.value }))} /></div>
                  <div><Label>严重级别 *</Label>
                    <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{SEVERITY_MAP[s].label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>材料类型</Label><Input placeholder="如 aluminum" value={form.materialType} onChange={e => setForm(f => ({ ...f, materialType: e.target.value }))} /></div>
                  <div><Label>设备型号</Label><Input placeholder="如 GRT-SC-*" value={form.equipmentModel} onChange={e => setForm(f => ({ ...f, equipmentModel: e.target.value }))} /></div>
                </div>
                <div><Label>描述</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <Button onClick={() => createM.mutate({ ...form, category: form.category as any, severity: form.severity as any, minValue: form.minValue || undefined, maxValue: form.maxValue || undefined, unit: form.unit || undefined, materialType: form.materialType || undefined, equipmentModel: form.equipmentModel || undefined, description: form.description || undefined })} disabled={!form.name || !form.parameterName || createM.isPending}>
                  {createM.isPending ? "创建中..." : "创建规则"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rule list */}
      {listQ.isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {items.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">暂无安全规则，点击"初始化默认规则"开始</CardContent></Card>}
          {items.map((r: any) => {
            const cat = CATEGORY_LABELS[r.category] || CATEGORY_LABELS.physical;
            const sev = SEVERITY_MAP[r.severity] || SEVERITY_MAP.info;
            return (
              <Card key={r.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.ruleCode}</span>
                      <Badge className={cat.color} variant="secondary">{cat.label}</Badge>
                      <Badge className={sev.color} variant="secondary">{sev.label}</Badge>
                      {r.isActive === 0 && <Badge variant="destructive">停用</Badge>}
                    </div>
                    <p className="font-semibold mt-1 truncate">{r.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      参数: {r.parameterName}{r.unit ? ` (${r.unit})` : ""}
                      {r.minValue != null && ` | 最小: ${r.minValue}`}
                      {r.maxValue != null && ` | 最大: ${r.maxValue}`}
                      {r.materialType && ` | 材料: ${r.materialType}`}
                      {r.equipmentModel && ` | 设备: ${r.equipmentModel}`}
                    </p>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{r.isActive ? "启用" : "停用"}</span>
                      <Switch checked={r.isActive === 1} onCheckedChange={() => toggleActive(r.id, r.isActive)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Tab 2: Validation ───────────────────────── */
function ValidationTab() {
  const [materialType, setMaterialType] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [params, setParams] = useState([{ name: "", value: "", unit: "" }]);
  const [result, setResult] = useState<any>(null);

  const validateQ = trpc.safetyRule.validate.useQuery(
    { materialType, equipmentModel, parameters: params.filter(p => p.name && p.value).map(p => ({ name: p.name, value: Number(p.value), unit: p.unit || undefined })) },
    { enabled: false },
  );

  const doValidate = async () => {
    if (!materialType || !equipmentModel || params.every(p => !p.name || !p.value)) {
      toast.error("请填写材料类型、设备型号和至少一个参数");
      return;
    }
    const res = await validateQ.refetch();
    if (res.data) setResult(res.data);
  };

  const addParam = () => setParams(ps => [...ps, { name: "", value: "", unit: "" }]);
  const removeParam = (i: number) => setParams(ps => ps.filter((_, idx) => idx !== i));
  const updateParam = (i: number, field: string, val: string) => setParams(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-lg">安全参数校验</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>材料类型 *</Label><Input placeholder="如 aluminum, stainless_steel, plastic" value={materialType} onChange={e => setMaterialType(e.target.value)} /></div>
            <div><Label>设备型号 *</Label><Input placeholder="如 GRT-SC-100, GRT-HP-200" value={equipmentModel} onChange={e => setEquipmentModel(e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>校验参数</Label>
              <Button variant="ghost" size="sm" onClick={addParam}><Plus className="h-3 w-3 mr-1" />添加参数</Button>
            </div>
            <div className="space-y-2">
              {params.map((p, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1"><Input placeholder="参数名 (如 temperature)" value={p.name} onChange={e => updateParam(i, "name", e.target.value)} /></div>
                  <div className="w-32"><Input placeholder="值" type="number" value={p.value} onChange={e => updateParam(i, "value", e.target.value)} /></div>
                  <div className="w-24"><Input placeholder="单位" value={p.unit} onChange={e => updateParam(i, "unit", e.target.value)} /></div>
                  {params.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeParam(i)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={doValidate} disabled={validateQ.isFetching} className="w-full">
            <ShieldCheck className="h-4 w-4 mr-1" />{validateQ.isFetching ? "校验中..." : "执行校验"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className={result.passed ? "border-green-300" : result.blocked ? "border-red-400" : "border-amber-300"}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {result.passed ? (
                <Badge className="bg-green-100 text-green-700 text-base px-3 py-1"><CheckCircle2 className="h-4 w-4 mr-1" />通过</Badge>
              ) : result.blocked ? (
                <Badge className="bg-red-100 text-red-700 text-base px-3 py-1"><Ban className="h-4 w-4 mr-1" />阻止</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 text-base px-3 py-1"><AlertTriangle className="h-4 w-4 mr-1" />警告</Badge>
              )}
              <span className="text-sm font-medium">{result.summary}</span>
            </div>

            {result.violations.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-1"><Ban className="h-4 w-4" />违规项 ({result.violations.length})</h4>
                <div className="space-y-1.5">
                  {result.violations.map((v: any, i: number) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-red-500">{v.ruleCode}</span>
                        <Badge className={SEVERITY_MAP[v.severity]?.color || ""} variant="secondary">{SEVERITY_MAP[v.severity]?.label || v.severity}</Badge>
                        <span className="font-medium">{v.ruleName}</span>
                      </div>
                      <p className="text-red-700">{v.message}</p>
                      <p className="text-xs text-red-500 mt-0.5">{v.limit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div>
                <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />警告 ({result.warnings.length})</h4>
                <div className="space-y-1.5">
                  {result.warnings.map((w: any, i: number) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-amber-500">{w.ruleCode}</span>
                        <span className="font-medium">{w.ruleName}</span>
                      </div>
                      <p className="text-amber-700">{w.message}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{w.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.passed && result.warnings.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-medium">所有参数均在安全范围内</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────── Main Page ───────────────────────── */
export default function SafetyRuleManagement() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader icon={ShieldCheck} title="安全规则管理" description="工业安全规则库与实时参数校验引擎" />
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">安全规则库</TabsTrigger>
          <TabsTrigger value="validate">安全校验</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4"><RulesTab /></TabsContent>
        <TabsContent value="validate" className="mt-4"><ValidationTab /></TabsContent>
      </Tabs>
    </div>
  );
}
