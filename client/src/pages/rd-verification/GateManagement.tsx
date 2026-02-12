/**
 * 阶段门管理 Tab - 检查清单CRUD、状态管理、自动验证
 * 来源: StageGate(checklists)
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { STAGES, CHECKLIST_STATUSES } from "../../../../shared/stage-definitions";
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Plus, Shield,
  FileCheck, RefreshCw, ArrowRight, Inbox,
} from "lucide-react";

export default function GateManagement() {
  const [selectedStage, setSelectedStage] = useState<string>("M3");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    gateStage: "M3",
    checkItem: "",
    isMandatory: false,
    autoVerifySource: "",
  });

  // tRPC queries
  const { data: checklists, isLoading, refetch: refetchChecklists } = trpc.stageGate.getGateChecklists.useQuery({
    gateStage: selectedStage as any,
  });

  // tRPC mutations
  const createChecklistMutation = trpc.stageGate.createGateChecklist.useMutation({
    onSuccess: () => {
      toast.success("检查项已添加");
      setShowAddDialog(false);
      setNewChecklist({ gateStage: "M3", checkItem: "", isMandatory: false, autoVerifySource: "" });
      refetchChecklists();
    },
    onError: (error) => toast.error(`添加失败: ${error.message}`),
  });

  const updateStatusMutation = trpc.stageGate.updateGateChecklistStatus.useMutation({
    onSuccess: () => { toast.success("状态已更新"); refetchChecklists(); },
    onError: (error) => toast.error(`更新失败: ${error.message}`),
  });

  const calculateProgress = (items: any[]) => {
    if (!items?.length) return 0;
    return (items.filter(i => i.status === "pass").length / items.length) * 100;
  };

  const hasMandatoryFail = (items: any[]) =>
    items?.some(i => i.is_mandatory && i.status === "fail");

  const getStatusBadge = (status: string) => {
    const config = CHECKLIST_STATUSES[status as keyof typeof CHECKLIST_STATUSES];
    const icons: Record<string, any> = { pending: Clock, pass: CheckCircle, fail: XCircle };
    const Icon = icons[status] || Clock;
    return (
      <Badge variant="outline" className={config?.color || ""}>
        <Icon className="w-3 h-3 mr-1" />
        {config?.label || status}
      </Badge>
    );
  };

  const currentStage = STAGES.find(s => s.id === selectedStage);

  return (
    <div className="space-y-4">
      {/* 阶段选择器 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <button
                  className={`
                    flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px]
                    ${selectedStage === stage.id
                      ? "bg-primary/20 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                    }
                  `}
                  onClick={() => setSelectedStage(stage.id)}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${selectedStage === stage.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                    }
                  `}>
                    {stage.id}
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground whitespace-nowrap">{stage.name}</span>
                </button>
                {index < STAGES.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 检查项列表头 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{currentStage?.id} - {currentStage?.name}</h3>
          <p className="text-sm text-muted-foreground">{currentStage?.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchChecklists()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                添加检查项
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加门径检查项</DialogTitle>
                <DialogDescription>为当前阶段添加新的检查项</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>所属阶段</Label>
                  <Select
                    value={newChecklist.gateStage}
                    onValueChange={(v) => setNewChecklist({ ...newChecklist, gateStage: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.id} - {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>检查项名称</Label>
                  <Input
                    value={newChecklist.checkItem}
                    onChange={(e) => setNewChecklist({ ...newChecklist, checkItem: e.target.value })}
                    placeholder="如: 模具PO已下达"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>一票否决权</Label>
                    <p className="text-xs text-muted-foreground">此项未通过将阻止阶段推进</p>
                  </div>
                  <Switch
                    checked={newChecklist.isMandatory}
                    onCheckedChange={(v) => setNewChecklist({ ...newChecklist, isMandatory: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>自动验证源 (可选)</Label>
                  <Input
                    value={newChecklist.autoVerifySource}
                    onChange={(e) => setNewChecklist({ ...newChecklist, autoVerifySource: e.target.value })}
                    placeholder="如: ERP_PO_Table 或 PLM_Drawing_Status"
                  />
                  <p className="text-xs text-muted-foreground">配置后系统将自动从指定数据源验证此项</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
                <Button
                  onClick={() => createChecklistMutation.mutate({
                    projectId: 1,
                    gateStage: newChecklist.gateStage as any,
                    checkItem: newChecklist.checkItem,
                    isMandatory: newChecklist.isMandatory,
                    autoVerifySource: newChecklist.autoVerifySource || undefined,
                  } as any)}
                  disabled={createChecklistMutation.isPending || !newChecklist.checkItem}
                >
                  {createChecklistMutation.isPending ? "添加中..." : "添加"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 阶段进度 */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          {isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">阶段完成度</span>
                <span className="text-sm font-bold">
                  {calculateProgress(checklists?.items || []).toFixed(0)}%
                </span>
              </div>
              <Progress value={calculateProgress(checklists?.items || [])} className="h-2" />
              {hasMandatoryFail(checklists?.items || []) && (
                <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  存在一票否决项未通过，无法推进到下一阶段
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 检查项列表 */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : checklists?.items?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无检查项</p>
              <p className="text-sm mt-2">点击"添加检查项"创建门径检查清单</p>
            </CardContent>
          </Card>
        ) : (
          checklists?.items?.map((item: any) => (
            <Card key={item.id} className={`
              border-l-4 hover:shadow-md transition-shadow
              ${item.status === "pass" ? "border-l-green-500" : ""}
              ${item.status === "fail" ? "border-l-red-500" : ""}
              ${item.status === "pending" ? "border-l-yellow-500" : ""}
            `}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.check_item}</span>
                      {item.is_mandatory && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                          <Shield className="w-3 h-3 mr-1" />
                          一票否决
                        </Badge>
                      )}
                      {getStatusBadge(item.status)}
                    </div>
                    {item.auto_verify_source && (
                      <p className="text-xs text-muted-foreground">自动验证源: {item.auto_verify_source}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {item.status === "pending" && (
                      <>
                        <Button
                          size="sm" variant="outline"
                          className="text-green-400 hover:text-green-300"
                          onClick={() => updateStatusMutation.mutate({ id: item.id, status: "pass" })}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />通过
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => updateStatusMutation.mutate({ id: item.id, status: "fail" })}
                        >
                          <XCircle className="w-4 h-4 mr-1" />不通过
                        </Button>
                      </>
                    )}
                    {item.status !== "pending" && (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: item.id, status: "pending" })}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />重置
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
