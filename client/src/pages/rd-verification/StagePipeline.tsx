/**
 * M0-M12 管线可视化组件
 * 已完成: 绿色 ✓ | 当前: 蓝色脉冲 ● | 未来: 灰色 ○
 */
import { STAGES, STAGE_MAP, type Stage } from "../../../../shared/stage-definitions";
import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StagePipelineProps {
  currentStage?: string;
  completedStages?: string[];
  onStageClick?: (stageId: string) => void;
  compact?: boolean;
}

export default function StagePipeline({
  currentStage = "M0",
  completedStages = [],
  onStageClick,
  compact = false,
}: StagePipelineProps) {
  const getStageState = (stageId: string) => {
    if (completedStages.includes(stageId)) return "completed";
    if (stageId === currentStage) return "current";
    return "future";
  };

  return (
    <div className={cn(
      "flex items-center gap-1 overflow-x-auto pb-2",
      compact ? "flex-wrap" : "flex-nowrap"
    )}>
      {STAGES.map((stage, index) => {
        const state = getStageState(stage.id);
        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => onStageClick?.(stage.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all min-w-[60px]",
                onStageClick && "cursor-pointer hover:bg-muted/50",
                !onStageClick && "cursor-default"
              )}
            >
              {state === "completed" && (
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              )}
              {state === "current" && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                  <Circle className="w-5 h-5 text-white fill-white" />
                </div>
              )}
              {state === "future" && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center">
                  <Circle className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
              <span className={cn(
                "text-[10px] font-medium",
                state === "completed" && "text-green-500",
                state === "current" && "text-blue-500",
                state === "future" && "text-muted-foreground"
              )}>
                {stage.id}
              </span>
              {!compact && (
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  {stage.name}
                </span>
              )}
            </button>
            {index < STAGES.length - 1 && (
              <div className={cn(
                "w-4 h-0.5 flex-shrink-0",
                state === "completed" ? "bg-green-500" : "bg-muted-foreground/20"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
