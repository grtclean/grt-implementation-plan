/**
 * ChecklistsTab - Filtered checklist table with create/update/auto-verify
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable, StatusBadge, createStatusColorMap } from "@/components/grt";
import type { Column } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { STAGES, CHECKLIST_STATUSES } from "../../../../shared/stage-definitions";
import {
  Plus, Shield, Zap, Edit, RefreshCw,
} from "lucide-react";

const checklistStatusColors = createStatusColorMap({
  pending: "yellow",
  pass: "green",
  fail: "red",
  waived: "gray",
  not_applicable: "gray",
});

type ChecklistStatus = "pending" | "pass" | "fail" | "waived" | "not_applicable";

interface ChecklistItem {
  id: number;
  project_id: number;
  gate_stage: string;
  check_item: string;
  description: string | null;
  category: string | null;
  status: ChecklistStatus;
  is_mandatory: number;
  auto_verify_source: string | null;
  auto_verified: number;
  verified_by: number | null;
  verified_at: string | null;
  verification_note: string | null;
  evidence_url: string | null;
  sort_order: number;
  due_date: string | null;
  project_name: string | null;
}

interface ChecklistsTabProps {
  projectId: number;
}

const GATE_OPTIONS = STAGES.map(s => ({ value: s.id, label: `${s.id} - ${s.name}` }));
const STATUS_OPTIONS: { value: ChecklistStatus; label: string }[] = [
  { value: "pending", label: "待检查" },
  { value: "pass", label: "通过" },
  { value: "fail", label: "未通过" },
  { value: "waived", label: "豁免" },
  { value: "not_applicable", label: "不适用" },
];

export default function ChecklistsTab({ projectId }: ChecklistsTabProps) {
  // Filters
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMandatory, setFilterMandatory] = useState(false);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    gateStage: "M3" as string,
    checkItem: "",
    description: "",
    category: "",
    isMandatory: false,
    autoVerifySource: "",
    sortOrder: 0,
    dueDate: "",
  });

  // Update form
  const [updateForm, setUpdateForm] = useState({
    status: "pending" as ChecklistStatus,
    verificationNote: "",
    evidenceUrl: "",
  });

  // Query
  const queryInput: any = { projectId, page: 1, pageSize: 200 };
  if (filterStage !== "all") queryInput.gateStage = filterStage;
  if (filterStatus !== "all") queryInput.status = filterStatus;
  if (filterMandatory) queryInput.isMandatory = true;

  const { data, isLoading, refetch } = trpc.stageGate.getGateChecklists.useQuery(queryInput, {
    enabled: projectId > 0,
  });

  const createMutation = trpc.stageGate.createGateChecklist.useMutation({
    onSuccess: () => {
      toast.success("检查项已创建");
      setIsCreateOpen(false);
      setCreateForm({ gateStage: "M3", checkItem: "", description: "", category: "", isMandatory: false, autoVerifySource: "", sortOrder: 0, dueDate: "" });
      refetch();
    },
    onError: (err) => toast.error(`创建失败: ${err.message}`),
  });

  const updateMutation = trpc.stageGate.updateGateChecklistStatus.useMutation({
    onSuccess: () => {
      toast.success("状态已更新");
      setIsUpdateOpen(false);
      refetch();
    },
    onError: (err) => toast.error(`更新失败: ${err.message}`),
  });

  const autoVerifyMutation = trpc.stageGate.autoVerifyGateChecklist.useMutation({
    onSuccess: (result) => {
      toast.success(result.passed ? "自动验证通过" : "自动验证未通过");
      refetch();
    },
    onError: (err) => toast.error(`自动验证失败: ${err.message}`),
  });

  const handleOpenUpdate = (item: ChecklistItem) => {
    setSelectedItem(item);
    setUpdateForm({
      status: item.status,
      verificationNote: item.verification_note || "",
      evidenceUrl: item.evidence_url || "",
    });
    setIsUpdateOpen(true);
  };

  const handleCreate = () => {
    if (!createForm.checkItem.trim()) {
      toast.error("请输入检查项名称");
      return;
    }
    createMutation.mutate({
      projectId,
      gateStage: createForm.gateStage as any,
      checkItem: createForm.checkItem,
      description: createForm.description || undefined,
      category: createForm.category || undefined,
      isMandatory: createForm.isMandatory,
      autoVerifySource: createForm.autoVerifySource || undefined,
      sortOrder: createForm.sortOrder,
      dueDate: createForm.dueDate || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedItem) return;
    updateMutation.mutate({
      id: selectedItem.id,
      status: updateForm.status,
      verificationNote: updateForm.verificationNote || undefined,
      evidenceUrl: updateForm.evidenceUrl || undefined,
    });
  };

  const items: ChecklistItem[] = (data?.items ?? []) as unknown as ChecklistItem[];

  const columns: Column<ChecklistItem>[] = [
    {
      key: "gate_stage",
      header: "阶段",
      className: "w-[80px]",
      render: (row) => (
        <Badge variant="outline">{row.gate_stage}</Badge>
      ),
    },
    {
      key: "check_item",
      header: "检查项",
      render: (row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{row.check_item}</span>
          {row.is_mandatory === 1 && (
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
              <Shield className="w-3 h-3 mr-0.5" />一票否决
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "类别",
      className: "w-[100px]",
      render: (row) => <span className="text-sm text-muted-foreground">{row.category || "-"}</span>,
    },
    {
      key: "status",
      header: "状态",
      className: "w-[90px]",
      render: (row) => {
        const statusDef = CHECKLIST_STATUSES[row.status as keyof typeof CHECKLIST_STATUSES];
        return (
          <StatusBadge color={checklistStatusColors[row.status]}>
            {statusDef?.label || row.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "auto_verify",
      header: "自动验证",
      className: "w-[100px]",
      render: (row) => row.auto_verify_source ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            autoVerifyMutation.mutate({ id: row.id });
          }}
          disabled={autoVerifyMutation.isPending}
        >
          <Zap className="w-3 h-3 mr-1" />
          {row.auto_verified ? "重新验证" : "自动验证"}
        </Button>
      ) : <span className="text-xs text-muted-foreground">手动</span>,
    },
    {
      key: "actions",
      header: "操作",
      className: "w-[80px]",
      render: (row) => (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenUpdate(row)}>
          <Edit className="w-3 h-3 mr-1" />更新
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="阶段筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部阶段</SelectItem>
                {GATE_OPTIONS.map(g => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Switch checked={filterMandatory} onCheckedChange={setFilterMandatory} id="mandatory-filter" />
              <Label htmlFor="mandatory-filter" className="text-xs cursor-pointer">仅一票否决</Label>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />刷新
              </Button>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1" />新增检查项
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>新增检查项</DialogTitle>
                    <DialogDescription>为项目添加门径检查项</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>阶段 *</Label>
                      <Select value={createForm.gateStage} onValueChange={v => setCreateForm(f => ({ ...f, gateStage: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GATE_OPTIONS.map(g => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>检查项名称 *</Label>
                      <Input value={createForm.checkItem} onChange={e => setCreateForm(f => ({ ...f, checkItem: e.target.value }))} placeholder="输入检查项名称" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>描述</Label>
                      <Textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>类别</Label>
                        <Input value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))} placeholder="如：设计、质量" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>排序</Label>
                        <Input type="number" value={createForm.sortOrder} onChange={e => setCreateForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>自动验证源</Label>
                        <Input value={createForm.autoVerifySource} onChange={e => setCreateForm(f => ({ ...f, autoVerifySource: e.target.value }))} placeholder="如：PLM_Model_Status" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>到期日</Label>
                        <Input type="date" value={createForm.dueDate} onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={createForm.isMandatory} onCheckedChange={v => setCreateForm(f => ({ ...f, isMandatory: v }))} />
                      <Label>一票否决（必须通过）</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreate} disabled={createMutation.isPending || !createForm.checkItem.trim()}>
                      {createMutation.isPending ? "创建中..." : "创建"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            emptyMessage="暂无检查项数据"
          />
        </CardContent>
      </Card>

      {/* Update status dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新检查项状态</DialogTitle>
            <DialogDescription>
              {selectedItem?.check_item}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={updateForm.status} onValueChange={v => setUpdateForm(f => ({ ...f, status: v as ChecklistStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>验证备注</Label>
              <Textarea
                value={updateForm.verificationNote}
                onChange={e => setUpdateForm(f => ({ ...f, verificationNote: e.target.value }))}
                rows={2}
                placeholder="输入验证备注信息"
              />
            </div>
            <div className="space-y-1.5">
              <Label>证据链接</Label>
              <Input
                value={updateForm.evidenceUrl}
                onChange={e => setUpdateForm(f => ({ ...f, evidenceUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "更新中..." : "更新状态"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
