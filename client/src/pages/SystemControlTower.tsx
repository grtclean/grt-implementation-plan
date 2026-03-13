/**
 * 系统控制塔 — System Control Tower
 * 企业级治理中心：数据字典、工作流、安全策略、审计与全局运营
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
  return active
    ? <Badge className="bg-green-500/20 text-green-400 border-0">{t("sct.enabled")}</Badge>
    : <Badge className="bg-gray-500/20 text-gray-400 border-0">{t("sct.disabled")}</Badge>;
}

// Campaign status keys mapped to i18n keys + CSS classes
const campaignStatusConfig: Record<string, { key: string; cls: string }> = {
  DRAFT:       { key: "sct.campaign.draft",     cls: "bg-gray-500/20 text-gray-400" },
  SIMULATED:   { key: "sct.campaign.simulated", cls: "bg-blue-500/20 text-blue-400" },
  APPROVED:    { key: "sct.campaign.approved",  cls: "bg-green-500/20 text-green-400" },
  EXECUTING:   { key: "sct.campaign.executing", cls: "bg-amber-500/20 text-amber-400" },
  COMPLETED:   { key: "sct.campaign.completed", cls: "bg-emerald-500/20 text-emerald-400" },
  ROLLED_BACK: { key: "sct.campaign.rolledBack", cls: "bg-red-500/20 text-red-400" },
  FAILED:      { key: "sct.campaign.failed",    cls: "bg-red-500/20 text-red-400" },
};

function CampaignBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const s = campaignStatusConfig[status] ?? { key: "", cls: "bg-gray-500/20 text-gray-400" };
  const label = s.key ? t(s.key) : status;
  return <Badge className={`${s.cls} border-0`}>{label}</Badge>;
}

// Campaign type keys for i18n resolution at render time
const campaignTypeKeys = [
  { value: "ORG_RESTRUCTURE",    key: "sct.campaignType.orgRestructure" },
  { value: "INVENTORY_ROLLOVER", key: "sct.campaignType.inventoryRollover" },
  { value: "PRICE_UPDATE",       key: "sct.campaignType.priceUpdate" },
  { value: "ROLE_MIGRATION",     key: "sct.campaignType.roleMigration" },
  { value: "DATA_CLEANUP",       key: "sct.campaignType.dataCleanup" },
];

const auditActions = ["CREATE","UPDATE","DELETE","VIEW","APPROVE","REJECT","LOGIN","EXPORT"];

// ── Component ────────────────────────────────────────────────
export default function SystemControlTower() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dictionaries");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title={t("sct.title")}
        description={t("sct.description")}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dictionaries" className="gap-1"><BookOpen className="size-4" />{t("sct.tab.dictionaries")}</TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1"><GitBranch className="size-4" />{t("sct.tab.workflows")}</TabsTrigger>
          <TabsTrigger value="policies" className="gap-1"><Shield className="size-4" />{t("sct.tab.policies")}</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1"><ScrollText className="size-4" />{t("sct.tab.audit")}</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1"><Rocket className="size-4" />{t("sct.tab.campaigns")}</TabsTrigger>
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
  const { t } = useLanguage();
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

  const createMut = trpc.governance.createDictionary.useMutation({ onSuccess: () => { toast.success(t("sct.dict.created")); utils.governance.listDictionaries.invalidate(); setCreateOpen(false); resetForm(); } });
  const updateMut = trpc.governance.updateDictionary.useMutation({ onSuccess: () => { toast.success(t("sct.dict.updated")); utils.governance.listDictionaries.invalidate(); setEditItem(null); resetForm(); } });
  const deleteMut = trpc.governance.deleteDictionary.useMutation({ onSuccess: () => { toast.success(t("sct.dict.deleted")); utils.governance.listDictionaries.invalidate(); } });

  const handleCreate = () => {
    try { createMut.mutate({ ...form, sortOrder: Number(form.sortOrder) }); } catch (e: any) { toast.error(e.message ?? t("sct.dict.createFailed")); }
  };
  const handleUpdate = () => {
    try { updateMut.mutate({ id: editItem.id, ...form, sortOrder: Number(form.sortOrder) }); } catch (e: any) { toast.error(e.message ?? t("sct.dict.updateFailed")); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ category: item.category ?? "", code: item.code ?? "", label: item.label ?? "", labelZh: item.labelZh ?? "", value: item.value ?? "", sortOrder: item.sortOrder ?? 0 });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><BookOpen className="size-5" />{t("sct.dict.title")}</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder={t("sct.dict.filterPlaceholder")} className="pl-8 w-56" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />{t("common.refresh")}</Button>
            <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />{t("common.create")}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("sct.dict.createTitle")}</DialogTitle></DialogHeader>
                <DictForm form={form} setForm={setForm} />
                <Button onClick={handleCreate} disabled={!form.category || !form.code || createMut.isPending}>{t("common.create")}</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sct.dict.category")}</TableHead>
              <TableHead>{t("sct.dict.code")}</TableHead>
              <TableHead>{t("sct.dict.label")}</TableHead>
              <TableHead>{t("sct.dict.labelZh")}</TableHead>
              <TableHead>{t("sct.dict.sortOrder")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
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
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title={t("common.edit")}><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: item.id })} title={t("common.delete")}><Trash2 className="size-4 text-red-400" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Edit dialog */}
        <Dialog open={!!editItem} onOpenChange={v => { if (!v) { setEditItem(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("sct.dict.editTitle")}</DialogTitle></DialogHeader>
            <DictForm form={form} setForm={setForm} />
            <Button onClick={handleUpdate}>{t("common.save")}</Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function DictForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t("sct.dict.category")}</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
        <div><Label>{t("sct.dict.code")}</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t("sct.dict.labelEn")}</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div>
        <div><Label>{t("sct.dict.labelZh")}</Label><Input value={form.labelZh} onChange={e => setForm({ ...form, labelZh: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t("sct.dict.value")}</Label><Input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
        <div><Label>{t("sct.dict.sortOrder")}</Label><Input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} /></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 2 — 工作流定义
// ═══════════════════════════════════════════════════════════
function WorkflowsTab() {
  const { t } = useLanguage();
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

  const createMut = trpc.governance.createWorkflowDefinition.useMutation({ onSuccess: () => { toast.success(t("sct.wf.created")); utils.governance.listWorkflowDefinitions.invalidate(); setCreateOpen(false); resetForm(); } });
  const updateMut = trpc.governance.updateWorkflowDefinition.useMutation({ onSuccess: () => { toast.success(t("sct.wf.updated")); utils.governance.listWorkflowDefinitions.invalidate(); setEditItem(null); resetForm(); } });

  const handleCreate = () => {
    try { createMut.mutate(form); } catch (e: any) { toast.error(e.message ?? t("sct.wf.createFailed")); }
  };
  const handleUpdate = () => {
    try { updateMut.mutate({ id: editItem.id, ...form }); } catch (e: any) { toast.error(e.message ?? t("sct.wf.updateFailed")); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ code: item.code ?? "", name: item.name ?? "", nameZh: item.nameZh ?? "", description: item.description ?? "", entityType: item.entityType ?? "" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><GitBranch className="size-5" />{t("sct.wf.title")}</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder={t("sct.wf.filterPlaceholder")} className="pl-8 w-56" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />{t("common.refresh")}</Button>
            <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />{t("common.create")}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("sct.wf.createTitle")}</DialogTitle></DialogHeader>
                <WorkflowForm form={form} setForm={setForm} />
                <Button onClick={handleCreate} disabled={!form.code || !form.name || createMut.isPending}>{t("common.create")}</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sct.wf.code")}</TableHead>
              <TableHead>{t("sct.wf.name")}</TableHead>
              <TableHead>{t("sct.wf.nameZh")}</TableHead>
              <TableHead>{t("sct.wf.entityType")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
            )}
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{item.code}</code></TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.nameZh}</TableCell>
                <TableCell>{item.entityType ?? "\u2014"}</TableCell>
                <TableCell><StatusBadge active={item.isActive !== false && item.isActive !== 0} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title={t("common.edit")}><Edit className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={!!editItem} onOpenChange={v => { if (!v) { setEditItem(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("sct.wf.editTitle")}</DialogTitle></DialogHeader>
            <WorkflowForm form={form} setForm={setForm} />
            <Button onClick={handleUpdate}>{t("common.save")}</Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function WorkflowForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t("sct.wf.code")}</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
        <div><Label>{t("sct.wf.entityType")}</Label><Input value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t("sct.wf.name")}</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>{t("sct.wf.nameZh")}</Label><Input value={form.nameZh} onChange={e => setForm({ ...form, nameZh: e.target.value })} /></div>
      </div>
      <div><Label>{t("sct.wf.description")}</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 3 — 数据策略
// ═══════════════════════════════════════════════════════════
function PoliciesTab() {
  const { t } = useLanguage();
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

  const createMut = trpc.governance.createDataPolicy.useMutation({ onSuccess: () => { toast.success(t("sct.policy.created")); utils.governance.listDataPolicies.invalidate(); setCreateOpen(false); resetForm(); } });
  const updateMut = trpc.governance.updateDataPolicy.useMutation({ onSuccess: () => { toast.success(t("sct.policy.updated")); utils.governance.listDataPolicies.invalidate(); setEditItem(null); resetForm(); } });
  const deleteMut = trpc.governance.deleteDataPolicy.useMutation({ onSuccess: () => { toast.success(t("sct.policy.deleted")); utils.governance.listDataPolicies.invalidate(); } });

  const handleCreate = () => {
    try { createMut.mutate({ ...form, priority: Number(form.priority), allowedRoles: form.allowedRoles ? form.allowedRoles.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined, allowedBus: form.allowedBus ? form.allowedBus.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined }); } catch (e: any) { toast.error(e.message ?? t("sct.policy.createFailed")); }
  };
  const handleUpdate = () => {
    try { updateMut.mutate({ id: editItem.id, ...form, priority: Number(form.priority), allowedRoles: form.allowedRoles ? form.allowedRoles.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined, allowedBus: form.allowedBus ? form.allowedBus.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined }); } catch (e: any) { toast.error(e.message ?? t("sct.policy.updateFailed")); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name ?? "", description: item.description ?? "", entityTable: item.entityTable ?? "", conditionExpression: item.conditionExpression ?? "", allowedRoles: item.allowedRoles ?? "", allowedBus: item.allowedBus ?? "", priority: item.priority ?? 0 });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Shield className="size-5" />{t("sct.policy.title")}</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder={t("sct.policy.filterPlaceholder")} className="pl-8 w-56" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />{t("common.refresh")}</Button>
            <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />{t("common.create")}</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{t("sct.policy.createTitle")}</DialogTitle></DialogHeader>
                <PolicyForm form={form} setForm={setForm} />
                <Button onClick={handleCreate} disabled={!form.name || !form.entityTable || !form.conditionExpression || createMut.isPending}>{t("common.create")}</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sct.policy.policyName")}</TableHead>
              <TableHead>{t("sct.policy.entityTable")}</TableHead>
              <TableHead>{t("sct.policy.conditionExpr")}</TableHead>
              <TableHead>{t("sct.policy.allowedRoles")}</TableHead>
              <TableHead>{t("sct.policy.priority")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
            )}
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{item.entityTable}</code></TableCell>
                <TableCell className="max-w-[200px] truncate text-xs font-mono">{item.conditionExpression}</TableCell>
                <TableCell className="text-xs">{item.allowedRoles ?? "\u2014"}</TableCell>
                <TableCell>{item.priority}</TableCell>
                <TableCell><StatusBadge active={item.isActive !== false && item.isActive !== 0} /></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title={t("common.edit")}><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: item.id })} title={t("common.delete")}><Trash2 className="size-4 text-red-400" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={!!editItem} onOpenChange={v => { if (!v) { setEditItem(null); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("sct.policy.editTitle")}</DialogTitle></DialogHeader>
            <PolicyForm form={form} setForm={setForm} />
            <Button onClick={handleUpdate}>{t("common.save")}</Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function PolicyForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-3">
      <div><Label>{t("sct.policy.policyName")}</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>{t("sct.policy.entityTable")}</Label><Input value={form.entityTable} onChange={e => setForm({ ...form, entityTable: e.target.value })} placeholder="e.g. projects, bom_masters" /></div>
      <div><Label>{t("sct.policy.conditionExpr")}</Label><Textarea value={form.conditionExpression} onChange={e => setForm({ ...form, conditionExpression: e.target.value })} placeholder='e.g. bu_code = :currentBU' /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t("sct.policy.rolesSeparator")}</Label><Input value={form.allowedRoles} onChange={e => setForm({ ...form, allowedRoles: e.target.value })} placeholder="admin,manager" /></div>
        <div><Label>{t("sct.policy.buSeparator")}</Label><Input value={form.allowedBus} onChange={e => setForm({ ...form, allowedBus: e.target.value })} placeholder="BU1,BU2" /></div>
      </div>
      <div><Label>{t("sct.policy.priority")}</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} /></div>
      <div><Label>{t("common.description")}</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 4 — 审计日志
// ═══════════════════════════════════════════════════════════
function AuditTab() {
  const { t } = useLanguage();
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
            <div className="text-xs text-muted-foreground">{t("sct.audit.30dayTotal")}</div>
            <div className="text-2xl font-bold">{statsData?.totalCount ?? "\u2014"}</div>
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
            <CardTitle className="flex items-center gap-2"><ScrollText className="size-5" />{t("sct.audit.title")}</CardTitle>
            <div className="flex gap-2">
              <Input placeholder={t("sct.audit.entityTypePlaceholder")} className="w-40" value={entityType} onChange={e => setEntityType(e.target.value)} />
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-36"><SelectValue placeholder={t("sct.audit.actionType")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("sct.audit.allActions")}</SelectItem>
                  {auditActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />{t("common.refresh")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sct.audit.timestamp")}</TableHead>
                <TableHead>{t("sct.audit.action")}</TableHead>
                <TableHead>{t("sct.audit.entityType")}</TableHead>
                <TableHead>{t("sct.audit.entityId")}</TableHead>
                <TableHead>{t("sct.audit.actor")}</TableHead>
                <TableHead>{t("sct.audit.changeSummary")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("sct.audit.noLogs")}</TableCell></TableRow>
              )}
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString("zh-CN") : "\u2014"}</TableCell>
                  <TableCell>
                    <Badge className={`${actionColorMap[log.action] ?? "bg-gray-500/20 text-gray-400"} border-0`}>{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell className="font-mono text-xs">{log.entityId ?? "\u2014"}</TableCell>
                  <TableCell>{log.actorId ?? "\u2014"}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-xs">{log.changeSummary ?? "\u2014"}</TableCell>
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
  const { t } = useLanguage();
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
  const createMut = trpc.campaign.createCampaign.useMutation({ onSuccess: () => { toast.success(t("sct.camp.created")); invalidateCampaigns(); setCreateOpen(false); resetForm(); } });
  const updateMut = trpc.campaign.updateCampaign.useMutation({ onSuccess: () => { toast.success(t("sct.camp.updated")); invalidateCampaigns(); setEditItem(null); resetForm(); } });
  const deleteMut = trpc.campaign.deleteCampaign.useMutation({ onSuccess: () => { toast.success(t("sct.camp.deleted")); invalidateCampaigns(); } });
  const simulateMut = trpc.campaign.simulateCampaign.useMutation({ onSuccess: () => { toast.success(t("sct.camp.simulated")); invalidateCampaigns(); } });
  const approveMut = trpc.campaign.approveCampaign.useMutation({ onSuccess: () => { toast.success(t("sct.camp.approved")); invalidateCampaigns(); } });
  const executeMut = trpc.campaign.executeCampaign.useMutation({ onSuccess: () => { toast.success(t("sct.camp.executed")); invalidateCampaigns(); } });
  const rollbackMut = trpc.campaign.rollbackCampaign.useMutation({ onSuccess: () => { toast.success(t("sct.camp.rolledBack")); invalidateCampaigns(); } });

  const handleCreate = () => {
    try { createMut.mutate({ ...form, campaignType: form.campaignType as any }); } catch (e: any) { toast.error(e.message ?? t("sct.camp.createFailed")); }
  };
  const handleUpdate = () => {
    try { updateMut.mutate({ id: editItem.id, ...form, campaignType: form.campaignType as any }); } catch (e: any) { toast.error(e.message ?? t("sct.camp.updateFailed")); }
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
            <CardTitle className="flex items-center gap-2"><Rocket className="size-5" />{t("sct.camp.title")}</CardTitle>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder={t("sct.camp.campaignType")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("sct.camp.allTypes")}</SelectItem>
                  {campaignTypeKeys.map(ct => <SelectItem key={ct.value} value={ct.value}>{t(ct.key)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder={t("common.status")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("sct.camp.allStatuses")}</SelectItem>
                  {Object.entries(campaignStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{t(v.key)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => refetch()}><RefreshCw className="size-4 mr-1" />{t("common.refresh")}</Button>
              <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />{t("common.create")}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("sct.camp.createTitle")}</DialogTitle></DialogHeader>
                  <CampaignForm form={form} setForm={setForm} />
                  <Button onClick={handleCreate} disabled={!form.code || !form.name || createMut.isPending}>{t("common.create")}</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sct.camp.code")}</TableHead>
                <TableHead>{t("sct.camp.name")}</TableHead>
                <TableHead>{t("sct.camp.type")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("sct.camp.payloadCount")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
              )}
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{item.code}</code></TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-xs">{campaignTypeKeys.find(ct => ct.value === item.campaignType) ? t(campaignTypeKeys.find(ct => ct.value === item.campaignType)!.key) : item.campaignType}</TableCell>
                  <TableCell><CampaignBadge status={item.status} /></TableCell>
                  <TableCell>{item.payloadCount ?? "\u2014"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewItem(item)} title={t("common.view")}><Eye className="size-4" /></Button>
                      {item.status === "DRAFT" && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title={t("common.edit")}><Edit className="size-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: item.id })} title={t("common.delete")}><Trash2 className="size-4 text-red-400" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => simulateMut.mutate({ campaignId: item.id })} title={t("sct.camp.simulate")}><Play className="size-4 mr-1" />{t("sct.camp.simulate")}</Button>
                        </>
                      )}
                      {item.status === "SIMULATED" && (
                        <Button variant="ghost" size="sm" onClick={() => approveMut.mutate({ campaignId: item.id })} title={t("sct.camp.approve")}><CheckCircle className="size-4 mr-1 text-green-400" />{t("sct.camp.approve")}</Button>
                      )}
                      {item.status === "APPROVED" && (
                        <Button variant="ghost" size="sm" onClick={() => executeMut.mutate({ campaignId: item.id })} title={t("sct.camp.execute")}><Play className="size-4 mr-1 text-amber-400" />{t("sct.camp.execute")}</Button>
                      )}
                      {(item.status === "COMPLETED" || item.status === "FAILED") && (
                        <Button variant="ghost" size="sm" onClick={() => rollbackMut.mutate({ campaignId: item.id, reason: t("sct.camp.adminRollback"), actorId: 1 })} title={t("sct.camp.rollback")}><RotateCcw className="size-4 mr-1 text-red-400" />{t("sct.camp.rollback")}</Button>
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
          <DialogHeader><DialogTitle>{t("sct.camp.editTitle")}</DialogTitle></DialogHeader>
          <CampaignForm form={form} setForm={setForm} />
          <Button onClick={handleUpdate}>{t("common.save")}</Button>
        </DialogContent>
      </Dialog>

      {/* View / Payloads dialog */}
      <Dialog open={!!viewItem} onOpenChange={v => { if (!v) setViewItem(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t("sct.camp.detailTitle")} — {viewItem?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">{t("sct.camp.code")}:</span> {viewItem?.code}</div>
            <div><span className="text-muted-foreground">{t("common.status")}:</span> {viewItem && <CampaignBadge status={viewItem.status} />}</div>
            <div><span className="text-muted-foreground">{t("sct.camp.type")}:</span> {campaignTypeKeys.find(ct => ct.value === viewItem?.campaignType) ? t(campaignTypeKeys.find(ct => ct.value === viewItem?.campaignType)!.key) : ""}</div>
            <div><span className="text-muted-foreground">{t("common.description")}:</span> {viewItem?.description ?? "\u2014"}</div>
          </div>
          <div className="mt-2">
            <h4 className="font-medium text-sm mb-2">{t("sct.camp.payloads")} ({payloads.length})</h4>
            {payloads.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("sct.camp.noPayloads")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sct.camp.seqNo")}</TableHead>
                    <TableHead>{t("sct.audit.entityType")}</TableHead>
                    <TableHead>{t("sct.camp.operation")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payloads.map((p: any, i: number) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.executionOrder ?? i + 1}</TableCell>
                      <TableCell>{p.entityType}</TableCell>
                      <TableCell><Badge variant="outline">{p.operation}</Badge></TableCell>
                      <TableCell>{p.status ?? "\u2014"}</TableCell>
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
  const { t } = useLanguage();
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t("sct.camp.code")}</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. CAMP-2026-001" /></div>
        <div>
          <Label>{t("sct.camp.type")}</Label>
          <Select value={form.campaignType} onValueChange={v => setForm({ ...form, campaignType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {campaignTypeKeys.map(ct => <SelectItem key={ct.value} value={ct.value}>{t(ct.key)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>{t("sct.camp.name")}</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>{t("common.description")}</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
    </div>
  );
}
