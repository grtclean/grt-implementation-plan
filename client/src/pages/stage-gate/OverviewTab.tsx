/**
 * OverviewTab - M0-M12 pipeline visualization with passability check and template import
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { STAGES } from "../../../../shared/stage-definitions";
import {
  ArrowRight, CheckCircle, XCircle, AlertTriangle,
  Shield, Download, Loader2,
} from "lucide-react";

interface StageOverviewItem {
  gate_stage: string;
  total_items: number;
  passed_items: number;
  failed_items: number;
  pending_items: number;
  mandatory_failures: number;
}

interface OverviewTabProps {
  projectId: number;
}

export default function OverviewTab({ projectId }: OverviewTabProps) {
  const [checkingStage, setCheckingStage] = useState<string | null>(null);
  const [passResult, setPassResult] = useState<{
    stage: string;
    passable: boolean;
    completionRate: string | number;
    totalItems: number;
    completedItems: number;
    mandatoryFailures: any[];
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: overview = [], isLoading } = trpc.stageGate.getProjectGateOverview.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const templateMutation = trpc.stageGate.createGateChecklistsFromTemplate.useMutation({
    onSuccess: (result) => {
      toast.success(`成功导入 ${result.insertedCount} 个检查项`);
      utils.stageGate.getProjectGateOverview.invalidate({ projectId });
    },
    onError: (err) => toast.error(`导入失败: ${err.message}`),
  });

  const getStageData = (stageId: string): StageOverviewItem | undefined => {
    return (overview as StageOverviewItem[]).find((o) => o.gate_stage === stageId);
  };

  const getStageColor = (stageId: string) => {
    const data = getStageData(stageId);
    if (!data || data.total_items === 0) return "bg-muted text-muted-foreground";
    if (data.mandatory_failures > 0) return "bg-red-500 text-white";
    if (data.failed_items > 0) return "bg-red-400 text-white";
    if (data.pending_items > 0) return "bg-yellow-500 text-white";
    return "bg-green-500 text-white";
  };

  const handleCheckPassable = async (stage: string) => {
    setCheckingStage(stage);
    try {
      const result = await utils.stageGate.checkGatePassable.fetch({
        projectId,
        gateStage: stage as any,
      });
      setPassResult({ stage, ...result });
    } catch (err: any) {
      toast.error(`检查失败: ${err.message}`);
    } finally {
      setCheckingStage(null);
    }
  };

  const handleImportTemplate = () => {
    if (confirm("确定要为此项目导入标准门径检查模板？\n将添加M3-M12的标准检查项。")) {
      templateMutation.mutate({ projectId, templateName: "standard" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template import action */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleImportTemplate}
          disabled={templateMutation.isPending}
        >
          <Download className="w-4 h-4 mr-2" />
          {templateMutation.isPending ? "导入中..." : "导入标准模板"}
        </Button>
      </div>

      {/* M0-M12 Pipeline */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3">阶段流水线</h3>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <button
                  className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px] border border-transparent hover:border-primary/30`}
                  onClick={() => handleCheckPassable(stage.id)}
                  disabled={checkingStage !== null}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${getStageColor(stage.id)}`}>
                    {stage.id}
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground whitespace-nowrap">
                    {stage.name}
                  </span>
                  {getStageData(stage.id) && (
                    <span className="text-[9px] text-muted-foreground">
                      {getStageData(stage.id)!.passed_items}/{getStageData(stage.id)!.total_items}
                    </span>
                  )}
                </button>
                {index < STAGES.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Passability check result */}
      {passResult && (
        <Card className={passResult.passable ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {passResult.passable ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <h3 className="font-medium">
                {passResult.stage} 门径检查结果：{passResult.passable ? "可通过" : "不可通过"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setPassResult(null)}>
                关闭
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">完成率：</span>
                <span className="font-medium">{passResult.completionRate}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">已完成：</span>
                <span className="font-medium">{passResult.completedItems}/{passResult.totalItems}</span>
              </div>
              <div>
                <span className="text-muted-foreground">一票否决失败：</span>
                <span className="font-medium text-red-400">{passResult.mandatoryFailures.length}</span>
              </div>
            </div>
            {passResult.mandatoryFailures.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-red-400">未通过的一票否决项：</p>
                {passResult.mandatoryFailures.map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-3 h-3 text-red-400" />
                    {f.check_item}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Per-stage summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(overview as StageOverviewItem[]).map((item) => {
          const stageDef = STAGES.find(s => s.id === item.gate_stage);
          const progress = item.total_items > 0 ? Math.round((item.passed_items / item.total_items) * 100) : 0;
          return (
            <Card key={item.gate_stage} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStageColor(item.gate_stage) + " border-0"}>
                      {item.gate_stage}
                    </Badge>
                    <span className="font-medium text-sm">{stageDef?.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 mb-2" />
                <div className="flex items-center gap-3 text-xs">
                  <StatusBadge color="green">通过 {item.passed_items}</StatusBadge>
                  <StatusBadge color="red">未通过 {item.failed_items}</StatusBadge>
                  <StatusBadge color="yellow">待检查 {item.pending_items}</StatusBadge>
                </div>
                {item.mandatory_failures > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    {item.mandatory_failures} 个一票否决项未通过
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(overview as StageOverviewItem[]).length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <p>暂无门径数据，请先导入标准模板</p>
          </div>
        )}
      </div>
    </div>
  );
}
