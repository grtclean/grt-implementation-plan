/**
 * 拉动信号 Tab - JIT/JIS信号管理
 * 来源: StageGate(signals)
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { STAGES } from "../../../../shared/stage-definitions";
import {
  Zap, Plus, ArrowRight, Factory, Inbox,
} from "lucide-react";

export default function PullSignals() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSignal, setNewSignal] = useState({
    upstreamGate: "",
    triggerEvent: "",
    targetAasId: "",
    actionPayload: "",
  });

  // tRPC queries
  const { data: pullSignals, isLoading, refetch: refetchSignals } = trpc.stageGate.getPullSignals.useQuery({
    page: 1,
    pageSize: 50,
  });

  // tRPC mutations
  const createSignalMutation = trpc.stageGate.createPullSignal.useMutation({
    onSuccess: () => {
      toast.success("拉动信号已创建");
      setShowAddDialog(false);
      setNewSignal({ upstreamGate: "", triggerEvent: "", targetAasId: "", actionPayload: "" });
      refetchSignals();
    },
    onError: (error) => toast.error(`创建失败: ${error.message}`),
  });

  const triggerSignalMutation = (trpc.stageGate as any).triggerPullSignal.useMutation({
    onSuccess: () => { toast.success("拉动信号已触发"); refetchSignals(); },
    onError: (error: any) => toast.error(`触发失败: ${error.message}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">生产拉动信号</h3>
          <p className="text-sm text-muted-foreground">JIT/JIS拉动信号管理，触发设备AAS指令</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              创建信号
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建生产拉动信号</DialogTitle>
              <DialogDescription>配置JIT/JIS拉动信号触发条件</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>上游节点</Label>
                <Select
                  value={newSignal.upstreamGate}
                  onValueChange={(v) => setNewSignal({ ...newSignal, upstreamGate: v })}
                >
                  <SelectTrigger><SelectValue placeholder="选择上游门径节点" /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.id} - {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>触发事件</Label>
                <Input
                  value={newSignal.triggerEvent}
                  onChange={(e) => setNewSignal({ ...newSignal, triggerEvent: e.target.value })}
                  placeholder="如: 上汽JIS订单到达"
                />
              </div>
              <div className="space-y-2">
                <Label>目标设备AAS ID</Label>
                <Input
                  value={newSignal.targetAasId}
                  onChange={(e) => setNewSignal({ ...newSignal, targetAasId: e.target.value })}
                  placeholder="设备Active AAS标识"
                />
              </div>
              <div className="space-y-2">
                <Label>指令载荷 (JSON)</Label>
                <Textarea
                  value={newSignal.actionPayload}
                  onChange={(e) => setNewSignal({ ...newSignal, actionPayload: e.target.value })}
                  placeholder='{"action": "start_production", "params": {...}}'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
              <Button
                onClick={() => {
                  let payload = {};
                  try {
                    payload = JSON.parse(newSignal.actionPayload || "{}");
                  } catch {
                    toast.error("指令载荷JSON格式错误");
                    return;
                  }
                  createSignalMutation.mutate({
                    upstreamGate: newSignal.upstreamGate,
                    triggerEvent: newSignal.triggerEvent,
                    targetAasId: newSignal.targetAasId,
                    actionPayload: payload,
                  });
                }}
                disabled={createSignalMutation.isPending || !newSignal.triggerEvent}
              >
                {createSignalMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 信号列表 */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : pullSignals?.items?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无拉动信号</p>
              <p className="text-sm mt-2">点击"创建信号"配置JIT/JIS拉动</p>
            </CardContent>
          </Card>
        ) : (
          pullSignals?.items?.map((signal: any) => (
            <Card key={signal.id} className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-400">
                        {signal.upstream_gate}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{signal.trigger_event}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Factory className="w-4 h-4" />
                        目标: {signal.target_aas_id}
                      </span>
                    </div>
                    {signal.action_payload && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono">
                        {JSON.stringify(signal.action_payload, null, 2)}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => triggerSignalMutation.mutate({ signalId: signal.id })}
                    disabled={triggerSignalMutation.isPending}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    触发
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
