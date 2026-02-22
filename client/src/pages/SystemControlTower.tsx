/**
 * 系统控制塔 — System Control Tower
 * 企业级治理中心：数据字典、工作流、安全策略、审计与全局运营
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BookOpen, GitBranch, Shield, ScrollText, Rocket,
  Plus, Search, Trash2, Edit, RefreshCw, Play,
  CheckCircle, RotateCcw, Eye, Landmark,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────
const qOpts = { retry: false as const, refetchOnWindowFocus: false as const };

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <Badge className="bg-green-500/20 text-green-400 border-0">启用</Badge>
    : <Badge className="bg-gray-500/20 text-gray-400 border-0">停用</Badge>;
}

const campaignStatusMap: Record<string, { label: string; cls: string }> = {
  DRAFT:       { label: "草稿",   cls: "bg-gray-500/20 text-gray-400" },
  SIMULATED:   { label: "已模拟", cls: "bg-blue-500/20 text-blue-400" },
  APPROVED:    { label: "已审批", cls: "bg-green-500/20 text-green-400" },
  EXECUTING:   { label: "执行中", cls: "bg-amber-500/20 text-amber-400" },
  COMPLETED:   { label: "已完成", cls: "bg-emerald-500/20 text-emerald-400" },
  ROLLED_BACK: { label: "已回滚", cls: "bg-red-500/20 text-red-400" },
  FAILED:      { label: "失败",   cls: "bg-red-500/20 text-red-400" },
};

function CampaignBadge({ status }: { status: string }) {
  const s = campaignStatusMap[status] ?? { label: status, cls: "bg-gray-500/20 text-gray-400" };
  return <Badge className={`${s.cls} border-0`}>{s.label}</Badge>;
}

const campaignTypes = [
  { value: "ORG_RESTRUCTURE",    label: "组织重组" },
  { value: "INVENTORY_ROLLOVER", label: "库存翻转" },
  { value: "PRICE_UPDATE",       label: "价格更新" },
  { value: "ROLE_MIGRATION",     label: "角色迁移" },
  { value: "DATA_CLEANUP",       label: "数据清洗" },
];

const auditActions = ["CREATE","UPDATE","DELETE","VIEW","APPROVE","REJECT","LOGIN","EXPORT"];

// ── Component ────────────────────────────────────────────────
export default function SystemControlTower() {
  const [activeTab, setActiveTab] = useState("dictionaries");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="系统控制塔  System Control Tower"
        description="企业级治理中心：数据字典、工作流、安全策略、审计与全局运营"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dictionaries" className="gap-1"><BookOpen className="size-4" />数据字典</TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1"><GitBranch className="size-4" />工作流定义</TabsTrigger>
          <TabsTrigger value="policies" className="gap-1"><Shield className="size-4" />数据策略</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1"><ScrollText className="size-4" />审计日志</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1"><Rocket className="size-4" />全局运营</TabsTrigger>
        </TabsList>

        <TabsContent value="dictionaries"><DictionariesTab /></TabsContent>
        <TabsContent value="workflows"><WorkflowsTab /></TabsContent>
        <TabsContent value="policies"><PoliciesTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 1 — 数据字典
// ═══════════════════════════════════════════════════════════
function DictionariesTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [form, setForm] = useState({ category: "", code: "", label: "", labelZh: "", value: "", sortOrder: 0 });
  const resetForm = () => setForm({ category: "", code: "", label: "", labelZh: "", value: "", sortOrder: 0 });

  const { data, refetch } = trpc.governance.listDictionaries.useQuery(
    { category: search || undefined, limit: 50, offset: 0 },
    qOpts,
  );
  const items: any[] = data?.items ?? [];

  const createMut = trpc.governance.createDictionary.useMutation({ onSuccess: () => { toast.success("字典项已创建"); utils.governance.listDictionaries.invalidate(); setCreateOpen(false); resetForm(); } });
  const updateMut = trpc.governance.updateDictionary.useMutation({ onSuccess: () => { toast.success("字典项已更新"); utils.governance.listDictionaries.invalidate(); setEditItem(null); resetForm(); } });
  const deleteMut = trpc.governance.deleteDictionary.useMutation({ onSuccess: () => { toast.success("已删除"); utils.governance.listDictionaries.invalidate(); } });

  const handleCreate = () => {
    try { createMut.mutate({ ...form, sortOrder: Number(form.sortOrder) }); } catch (e: any) { toast.error(e.message ?? "创建失败"); }
  };
  const handleUpdate = () => {
    try { updateMut.mutate({ id: editItem.id, ...form, sortOrder: Number(form.sortOrder) }); } catch (e: any) { toast.error(e.message ?? "更新失败"); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ category: item.category ?? "", code: item.code ?? "", label: item.label ?? "", labelZh: item.labelZh ?? "", value: item.value ?? "", sortOrder: item.sortOrder ?? 0 });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><BookOpen className="size-5" />数据字典 Dictionaries</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="按分类筛选..." className="pl-8 w-56" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />刷新</Button>
            <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />新建</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>新建字典项</DialogTitle></DialogHeader>
                <DictForm form={form} setForm={setForm} />
                <Button onClick={handleCreate} disabled={!form.category || !form.code || createMut.isPending}>创建</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>分类 Category</TableHead>
              <TableHead>编码 Code</TableHead>
              <TableHead>标签 Label</TableHead>
              <TableHead>中文标签</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
            )}
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.category}</TableCell>
                <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{item.code}</code></TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell>{item.labelZh}</TableCell>
                <TableCell>{item.sortOrder}</TableCell>
                <TableCell><StatusBadge active={item.isActive !== false && item.isActive !== 0} /></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="编辑"><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: item.id })} title="删除"><Trash2 className="size-4 text-red-400" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Edit dialog */}
        <Dialog open={!!editItem} onOpenChange={v => { if (!v) { setEditItem(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>编辑字典项</DialogTitle></DialogHeader>
            <DictForm form={form} setForm={setForm} />
            <Button onClick={handleUpdate}>保存</Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function DictForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>分类 Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
        <div><Label>编码 Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>英文标签 Label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div>
        <div><Label>中文标签 LabelZh</Label><Input value={form.labelZh} onChange={e => setForm({ ...form, labelZh: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>值 Value</Label><Input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
        <div><Label>排序 Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} /></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 2 — 工作流定义
// ═══════════════════════════════════════════════════════════
function WorkflowsTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [form, setForm] = useState({ code: "", name: "", nameZh: "", description: "", entityType: "" });
  const resetForm = () => setForm({ code: "", name: "", nameZh: "", description: "", entityType: "" });

  const { data, refetch } = trpc.governance.listWorkflowDefinitions.useQuery(
    { entityType: search || undefined, limit: 50, offset: 0 },
    qOpts,
  );
  const items: any[] = data?.items ?? [];

  const createMut = trpc.governance.createWorkflowDefinition.useMutation({ onSuccess: () => { toast.success("工作流已创建"); utils.governance.listWorkflowDefinitions.invalidate(); setCreateOpen(false); resetForm(); } });
  const updateMut = trpc.governance.updateWorkflowDefinition.useMutation({ onSuccess: () => { toast.success("工作流已更新"); utils.governance.listWorkflowDefinitions.invalidate(); setEditItem(null); resetForm(); } });

  const handleCreate = () => {
    try { createMut.mutate(form); } catch (e: any) { toast.error(e.message ?? "创建失败"); }
  };
  const handleUpdate = () => {
    try { updateMut.mutate({ id: editItem.id, ...form }); } catch (e: any) { toast.error(e.message ?? "更新失败"); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ code: item.code ?? "", name: item.name ?? "", nameZh: item.nameZh ?? "", description: item.description ?? "", entityType: item.entityType ?? "" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><GitBranch className="size-5" />工作流定义 Workflows</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="按实体类型筛选..." className="pl-8 w-56" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />刷新</Button>
            <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />新建</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>新建工作流定义</DialogTitle></DialogHeader>
                <WorkflowForm form={form} setForm={setForm} />
                <Button onClick={handleCreate} disabled={!form.code || !form.name || createMut.isPending}>创建</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>编码 Code</TableHead>
              <TableHead>名称 Name</TableHead>
              <TableHead>中文名称</TableHead>
              <TableHead>实体类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
            )}
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{item.code}</code></TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.nameZh}</TableCell>
                <TableCell>{item.entityType ?? "—"}</TableCell>
                <TableCell><StatusBadge active={item.isActive !== false && item.isActive !== 0} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="编辑"><Edit className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={!!editItem} onOpenChange={v => { if (!v) { setEditItem(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>编辑工作流定义</DialogTitle></DialogHeader>
            <WorkflowForm form={form} setForm={setForm} />
            <Button onClick={handleUpdate}>保存</Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function WorkflowForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>编码 Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
        <div><Label>实体类型 Entity Type</Label><Input value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>名称 Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>中文名称 NameZh</Label><Input value={form.nameZh} onChange={e => setForm({ ...form, nameZh: e.target.value })} /></div>
      </div>
      <div><Label>描述 Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 3 — 数据策略
// ═══════════════════════════════════════════════════════════
function PoliciesTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [form, setForm] = useState({ name: "", description: "", entityTable: "", conditionExpression: "", allowedRoles: "", allowedBus: "", priority: 0 });
  const resetForm = () => setForm({ name: "", description: "", entityTable: "", conditionExpression: "", allowedRoles: "", allowedBus: "", priority: 0 });

  const { data, refetch } = trpc.governance.listDataPolicies.useQuery(
    { entityTable: search || undefined, limit: 50, offset: 0 },
    qOpts,
  );
  const items: any[] = data?.items ?? [];

  const createMut = trpc.governance.createDataPolicy.useMutation({ onSuccess: () => { toast.success("策略已创建"); utils.governance.listDataPolicies.invalidate(); setCreateOpen(false); resetForm(); } });
  const updateMut = trpc.governance.updateDataPolicy.useMutation({ onSuccess: () => { toast.success("策略已更新"); utils.governance.listDataPolicies.invalidate(); setEditItem(null); resetForm(); } });
  const deleteMut = trpc.governance.deleteDataPolicy.useMutation({ onSuccess: () => { toast.success("已删除"); utils.governance.listDataPolicies.invalidate(); } });

  const handleCreate = () => {
    try { createMut.mutate({ ...form, priority: Number(form.priority), allowedRoles: form.allowedRoles ? form.allowedRoles.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined, allowedBus: form.allowedBus ? form.allowedBus.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined }); } catch (e: any) { toast.error(e.message ?? "创建失败"); }
  };
  const handleUpdate = () => {
    try { updateMut.mutate({ id: editItem.id, ...form, priority: Number(form.priority), allowedRoles: form.allowedRoles ? form.allowedRoles.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined, allowedBus: form.allowedBus ? form.allowedBus.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined }); } catch (e: any) { toast.error(e.message ?? "更新失败"); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name ?? "", description: item.description ?? "", entityTable: item.entityTable ?? "", conditionExpression: item.conditionExpression ?? "", allowedRoles: item.allowedRoles ?? "", allowedBus: item.allowedBus ?? "", priority: item.priority ?? 0 });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Shield className="size-5" />数据策略 Data Policies</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="按数据表筛选..." className="pl-8 w-56" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />刷新</Button>
            <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />新建</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>新建数据策略</DialogTitle></DialogHeader>
                <PolicyForm form={form} setForm={setForm} />
                <Button onClick={handleCreate} disabled={!form.name || !form.entityTable || !form.conditionExpression || createMut.isPending}>创建</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>策略名称</TableHead>
              <TableHead>数据表</TableHead>
              <TableHead>条件表达式</TableHead>
              <TableHead>允许角色</TableHead>
              <TableHead>优先级</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
            )}
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{item.entityTable}</code></TableCell>
                <TableCell className="max-w-[200px] truncate text-xs font-mono">{item.conditionExpression}</TableCell>
                <TableCell className="text-xs">{item.allowedRoles ?? "—"}</TableCell>
                <TableCell>{item.priority}</TableCell>
                <TableCell><StatusBadge active={item.isActive !== false && item.isActive !== 0} /></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="编辑"><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: item.id })} title="删除"><Trash2 className="size-4 text-red-400" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={!!editItem} onOpenChange={v => { if (!v) { setEditItem(null); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>编辑数据策略</DialogTitle></DialogHeader>
            <PolicyForm form={form} setForm={setForm} />
            <Button onClick={handleUpdate}>保存</Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function PolicyForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="grid gap-3">
      <div><Label>策略名称 Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>数据表 Entity Table</Label><Input value={form.entityTable} onChange={e => setForm({ ...form, entityTable: e.target.value })} placeholder="e.g. projects, bom_masters" /></div>
      <div><Label>条件表达式 Condition</Label><Textarea value={form.conditionExpression} onChange={e => setForm({ ...form, conditionExpression: e.target.value })} placeholder='e.g. bu_code = :currentBU' /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>允许角色 Roles (逗号分隔)</Label><Input value={form.allowedRoles} onChange={e => setForm({ ...form, allowedRoles: e.target.value })} placeholder="admin,manager" /></div>
        <div><Label>允许BU (逗号分隔)</Label><Input value={form.allowedBus} onChange={e => setForm({ ...form, allowedBus: e.target.value })} placeholder="BU1,BU2" /></div>
      </div>
      <div><Label>优先级 Priority</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} /></div>
      <div><Label>描述 Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 4 — 审计日志
// ═══════════════════════════════════════════════════════════
function AuditTab() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const { data, refetch } = trpc.governance.listAuditLogs.useQuery(
    { entityType: entityType || undefined, action: (action || undefined) as any, limit: 100, offset: 0 },
    qOpts,
  );
  const logs: any[] = data?.items ?? [];

  // Stats for last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const { data: statsData } = trpc.governance.getAuditLogStats.useQuery(
    { startDate: thirtyDaysAgo.toISOString(), endDate: now.toISOString() },
    qOpts,
  );

  const statsByAction: Record<string, number> = {};
  if (statsData?.byAction) {
    const ba = statsData.byAction as any;
    if (Array.isArray(ba)) {
      for (const row of ba) { statsByAction[row.action] = row.count; }
    } else if (typeof ba === "object") {
      Object.assign(statsByAction, ba);
    }
  }

  const actionColorMap: Record<string, string> = {
    CREATE: "bg-green-500/20 text-green-400",
    UPDATE: "bg-blue-500/20 text-blue-400",
    DELETE: "bg-red-500/20 text-red-400",
    VIEW: "bg-gray-500/20 text-gray-400",
    APPROVE: "bg-emerald-500/20 text-emerald-400",
    REJECT: "bg-orange-500/20 text-orange-400",
    LOGIN: "bg-cyan-500/20 text-cyan-400",
    EXPORT: "bg-violet-500/20 text-violet-400",
  };

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">30天总计</div>
            <div className="text-2xl font-bold">{statsData?.totalCount ?? "—"}</div>
          </CardContent>
        </Card>
        {["CREATE", "UPDATE", "DELETE"].map(a => (
          <Card key={a}>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">{a}</div>
              <div className="text-2xl font-bold">{statsByAction[a] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><ScrollText className="size-5" />审计日志 Audit Logs</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="实体类型..." className="w-40" value={entityType} onChange={e => setEntityType(e.target.value)} />
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-36"><SelectValue placeholder="操作类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部</SelectItem>
                  {auditActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />刷新</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>实体类型</TableHead>
                <TableHead>实体ID</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>变更摘要</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无日志</TableCell></TableRow>
              )}
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString("zh-CN") : "—"}</TableCell>
                  <TableCell>
                    <Badge className={`${actionColorMap[log.action] ?? "bg-gray-500/20 text-gray-400"} border-0`}>{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell className="font-mono text-xs">{log.entityId ?? "—"}</TableCell>
                  <TableCell>{log.actorId ?? "—"}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-xs">{log.changeSummary ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 5 — 全局运营 (Campaigns)
// ═══════════════════════════════════════════════════════════
function CampaignsTab() {
  const utils = trpc.useUtils();
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);

  const [form, setForm] = useState({ code: "", name: "", description: "", campaignType: "DATA_CLEANUP" });
  const resetForm = () => setForm({ code: "", name: "", description: "", campaignType: "DATA_CLEANUP" });

  const { data, refetch } = trpc.campaign.listCampaigns.useQuery(
    {
      campaignType: (typeFilter || undefined) as any,
      status: (statusFilter || undefined) as any,
      limit: 50,
      offset: 0,
    },
    qOpts,
  );
  const items: any[] = data?.items ?? [];

  // Payloads for viewed campaign
  const { data: payloadsData } = trpc.campaign.listPayloads.useQuery(
    { campaignId: viewItem?.id },
    { ...qOpts, enabled: !!viewItem },
  );
  const payloads: any[] = payloadsData?.items ?? [];

  const invalidateCampaigns = () => utils.campaign.listCampaigns.invalidate();
  const createMut = trpc.campaign.createCampaign.useMutation({ onSuccess: () => { toast.success("运营活动已创建"); invalidateCampaigns(); setCreateOpen(false); resetForm(); } });
  const updateMut = trpc.campaign.updateCampaign.useMutation({ onSuccess: () => { toast.success("运营活动已更新"); invalidateCampaigns(); setEditItem(null); resetForm(); } });
  const deleteMut = trpc.campaign.deleteCampaign.useMutation({ onSuccess: () => { toast.success("已删除"); invalidateCampaigns(); } });
  const simulateMut = trpc.campaign.simulateCampaign.useMutation({ onSuccess: () => { toast.success("模拟完成"); invalidateCampaigns(); } });
  const approveMut = trpc.campaign.approveCampaign.useMutation({ onSuccess: () => { toast.success("已审批"); invalidateCampaigns(); } });
  const executeMut = trpc.campaign.executeCampaign.useMutation({ onSuccess: () => { toast.success("执行完成"); invalidateCampaigns(); } });
  const rollbackMut = trpc.campaign.rollbackCampaign.useMutation({ onSuccess: () => { toast.success("已回滚"); invalidateCampaigns(); } });

  const handleCreate = () => {
    try { createMut.mutate({ ...form, campaignType: form.campaignType as any }); } catch (e: any) { toast.error(e.message ?? "创建失败"); }
  };
  const handleUpdate = () => {
    try { updateMut.mutate({ id: editItem.id, ...form, campaignType: form.campaignType as any }); } catch (e: any) { toast.error(e.message ?? "更新失败"); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ code: item.code ?? "", name: item.name ?? "", description: item.description ?? "", campaignType: item.campaignType ?? "DATA_CLEANUP" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Rocket className="size-5" />全局运营 Campaigns</CardTitle>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="活动类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部类型</SelectItem>
                  {campaignTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder="状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部状态</SelectItem>
                  {Object.entries(campaignStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />刷新</Button>
              <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />新建</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>新建运营活动</DialogTitle></DialogHeader>
                  <CampaignForm form={form} setForm={setForm} />
                  <Button onClick={handleCreate} disabled={!form.code || !form.name || createMut.isPending}>创建</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>编码</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>载荷数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
              )}
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{item.code}</code></TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-xs">{campaignTypes.find(t => t.value === item.campaignType)?.label ?? item.campaignType}</TableCell>
                  <TableCell><CampaignBadge status={item.status} /></TableCell>
                  <TableCell>{item.payloadCount ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewItem(item)} title="查看"><Eye className="size-4" /></Button>
                      {item.status === "DRAFT" && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="编辑"><Edit className="size-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: item.id })} title="删除"><Trash2 className="size-4 text-red-400" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => simulateMut.mutate({ campaignId: item.id })} title="模拟"><Play className="size-4 mr-1" />模拟</Button>
                        </>
                      )}
                      {item.status === "SIMULATED" && (
                        <Button variant="ghost" size="sm" onClick={() => approveMut.mutate({ campaignId: item.id, approvedBy: 1 })} title="审批"><CheckCircle className="size-4 mr-1 text-green-400" />审批</Button>
                      )}
                      {item.status === "APPROVED" && (
                        <Button variant="ghost" size="sm" onClick={() => executeMut.mutate({ campaignId: item.id, executedBy: 1 })} title="执行"><Play className="size-4 mr-1 text-amber-400" />执行</Button>
                      )}
                      {(item.status === "COMPLETED" || item.status === "FAILED") && (
                        <Button variant="ghost" size="sm" onClick={() => rollbackMut.mutate({ campaignId: item.id, reason: "管理员回滚", actorId: 1 })} title="回滚"><RotateCcw className="size-4 mr-1 text-red-400" />回滚</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={v => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑运营活动</DialogTitle></DialogHeader>
          <CampaignForm form={form} setForm={setForm} />
          <Button onClick={handleUpdate}>保存</Button>
        </DialogContent>
      </Dialog>

      {/* View / Payloads dialog */}
      <Dialog open={!!viewItem} onOpenChange={v => { if (!v) setViewItem(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>运营活动详情 — {viewItem?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">编码:</span> {viewItem?.code}</div>
            <div><span className="text-muted-foreground">状态:</span> {viewItem && <CampaignBadge status={viewItem.status} />}</div>
            <div><span className="text-muted-foreground">类型:</span> {campaignTypes.find(t => t.value === viewItem?.campaignType)?.label}</div>
            <div><span className="text-muted-foreground">描述:</span> {viewItem?.description ?? "—"}</div>
          </div>
          <div className="mt-2">
            <h4 className="font-medium text-sm mb-2">载荷列表 Payloads ({payloads.length})</h4>
            {payloads.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无载荷</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>序号</TableHead>
                    <TableHead>实体类型</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payloads.map((p: any, i: number) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.executionOrder ?? i + 1}</TableCell>
                      <TableCell>{p.entityType}</TableCell>
                      <TableCell><Badge variant="outline">{p.operation}</Badge></TableCell>
                      <TableCell>{p.status ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>编码 Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. CAMP-2026-001" /></div>
        <div>
          <Label>类型 Type</Label>
          <Select value={form.campaignType} onValueChange={v => setForm({ ...form, campaignType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {campaignTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>名称 Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>描述 Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
    </div>
  );
}
