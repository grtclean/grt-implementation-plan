/**
 * PullSignalsTab - Production pull signal management
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable, StatusBadge, createStatusColorMap } from "@/components/grt";
import type { Column } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { STAGES } from "../../../../shared/stage-definitions";
import {
  Plus, Send, CheckCircle, RefreshCw,
} from "lucide-react";

const signalStatusColors = createStatusColorMap({
  pending: "yellow",
  sent: "blue",
  acknowledged: "cyan",
  executed: "green",
  failed: "red",
  cancelled: "gray",
});

const priorityColors = createStatusColorMap({
  low: "gray",
  normal: "blue",
  high: "orange",
  urgent: "red",
});

type SignalStatus = "pending" | "sent" | "acknowledged" | "executed" | "failed" | "cancelled";
type Priority = "low" | "normal" | "high" | "urgent";

const SIGNAL_STATUS_LABELS: Record<SignalStatus, string> = {
  pending: "待发送",
  sent: "已发送",
  acknowledged: "已确认",
  executed: "已执行",
  failed: "失败",
  cancelled: "已取消",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "低",
  normal: "普通",
  high: "高",
  urgent: "紧急",
};

interface PullSignal {
  id: number;
  signal_id: string;
  project_id: number | null;
  upstream_gate: string;
  trigger_event: string;
  trigger_source: string | null;
  target_aas_id: string;
  target_device_name: string | null;
  action_payload: string;
  priority: Priority;
  status: SignalStatus;
  sent_at: string | null;
  executed_at: string | null;
  project_name: string | null;
}

interface PullSignalsTabProps {
  projectId: number;
}

const GATE_OPTIONS = STAGES.map(s => ({ value: s.id, label: `${s.id} - ${s.name}` }));

export default function PullSignalsTab({ projectId }: PullSignalsTabProps) {
  const [filterGate, setFilterGate] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    upstreamGate: "M5",
    triggerEvent: "",
    targetAasId: "",
    targetDeviceName: "",
    actionPayload: "{}",
    priority: "normal" as Priority,
  });

  const queryInput: any = { projectId, page: 1, pageSize: 100 };
  if (filterGate !== "all") queryInput.upstreamGate = filterGate;
  if (filterStatus !== "all") queryInput.status = filterStatus;

  const { data, isLoading, refetch } = trpc.stageGate.getPullSignals.useQuery(queryInput, {
    enabled: projectId > 0,
  });

  const createMutation = trpc.stageGate.createPullSignal.useMutation({
    onSuccess: (result) => {
      toast.success(`拉动信号已创建: ${result.signalId}`);
      setIsCreateOpen(false);
      setCreateForm({ upstreamGate: "M5", triggerEvent: "", targetAasId: "", targetDeviceName: "", actionPayload: "{}", priority: "normal" });
      refetch();
    },
    onError: (err) => toast.error(`创建失败: ${err.message}`),
  });

  const sendMutation = trpc.stageGate.sendPullSignal.useMutation({
    onSuccess: () => {
      toast.success("信号已发送");
      refetch();
    },
    onError: (err) => toast.error(`发送失败: ${err.message}`),
  });

  const ackMutation = trpc.stageGate.acknowledgePullSignal.useMutation({
    onSuccess: () => {
      toast.success("信号已确认执行");
      refetch();
    },
    onError: (err) => toast.error(`确认失败: ${err.message}`),
  });

  const handleCreate = () => {
    if (!createForm.triggerEvent.trim() || !createForm.targetAasId.trim()) {
      toast.error("请填写必填字段");
      return;
    }
    let parsedPayload: Record<string, any>;
    try {
      parsedPayload = JSON.parse(createForm.actionPayload);
    } catch {
      toast.error("Action Payload 必须是有效的 JSON");
      return;
    }
    createMutation.mutate({
      projectId,
      upstreamGate: createForm.upstreamGate,
      triggerEvent: createForm.triggerEvent,
      targetAasId: createForm.targetAasId,
      targetDeviceName: createForm.targetDeviceName || undefined,
      actionPayload: parsedPayload,
      priority: createForm.priority,
    });
  };

  const signals: PullSignal[] = data?.items ?? [];
  const filteredSignals = filterPriority === "all" ? signals : signals.filter(s => s.priority === filterPriority);

  const columns: Column<PullSignal>[] = [
    {
      key: "signal_id",
      header: "信号ID",
      className: "w-[140px]",
      render: (row) => <span className="font-mono text-xs">{row.signal_id}</span>,
    },
    {
      key: "upstream_gate",
      header: "上游门径",
      className: "w-[90px]",
      render: (row) => <StatusBadge color="blue">{row.upstream_gate}</StatusBadge>,
    },
    {
      key: "trigger_event",
      header: "触发事件",
      render: (row) => <span className="text-sm">{row.trigger_event}</span>,
    },
    {
      key: "target",
      header: "目标设备",
      className: "w-[140px]",
      render: (row) => (
        <div>
          <span className="text-xs font-mono">{row.target_aas_id}</span>
          {row.target_device_name && (
            <p className="text-xs text-muted-foreground">{row.target_device_name}</p>
          )}
        </div>
      ),
    },
    {
      key: "priority",
      header: "优先级",
      className: "w-[80px]",
      render: (row) => (
        <StatusBadge color={priorityColors[row.priority]}>
          {PRIORITY_LABELS[row.priority]}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      header: "状态",
      className: "w-[80px]",
      render: (row) => (
        <StatusBadge color={signalStatusColors[row.status]}>
          {SIGNAL_STATUS_LABELS[row.status]}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "操作",
      className: "w-[120px]",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => sendMutation.mutate({ signalId: row.signal_id })}
              disabled={sendMutation.isPending}
            >
              <Send className="w-3 h-3 mr-1" />发送
            </Button>
          )}
          {(row.status === "sent" || row.status === "acknowledged") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => ackMutation.mutate({ signalId: row.signal_id })}
              disabled={ackMutation.isPending}
            >
              <CheckCircle className="w-3 h-3 mr-1" />确认
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterGate} onValueChange={setFilterGate}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="门径筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部门径</SelectItem>
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
                {(Object.entries(SIGNAL_STATUS_LABELS) as [SignalStatus, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />刷新
              </Button>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1" />新建拉动信号
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>新建拉动信号</DialogTitle>
                    <DialogDescription>创建生产拉动信号发送到目标设备</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>上游门径 *</Label>
                      <Select value={createForm.upstreamGate} onValueChange={v => setCreateForm(f => ({ ...f, upstreamGate: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GATE_OPTIONS.map(g => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>触发事件 *</Label>
                      <Input
                        value={createForm.triggerEvent}
                        onChange={e => setCreateForm(f => ({ ...f, triggerEvent: e.target.value }))}
                        placeholder="如：M5设计评审通过"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>目标AAS ID *</Label>
                        <Input
                          value={createForm.targetAasId}
                          onChange={e => setCreateForm(f => ({ ...f, targetAasId: e.target.value }))}
                          placeholder="如：AAS-CNC-001"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>目标设备名</Label>
                        <Input
                          value={createForm.targetDeviceName}
                          onChange={e => setCreateForm(f => ({ ...f, targetDeviceName: e.target.value }))}
                          placeholder="如：CNC加工中心"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>操作负载 (JSON)</Label>
                      <Textarea
                        value={createForm.actionPayload}
                        onChange={e => setCreateForm(f => ({ ...f, actionPayload: e.target.value }))}
                        rows={3}
                        className="font-mono text-xs"
                        placeholder='{"action": "start_production", "params": {}}'
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>优先级</Label>
                      <Select value={createForm.priority} onValueChange={v => setCreateForm(f => ({ ...f, priority: v as Priority }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "创建中..." : "创建信号"}
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
            data={filteredSignals}
            isLoading={isLoading}
            emptyMessage="暂无拉动信号"
          />
        </CardContent>
      </Card>
    </div>
  );
}
