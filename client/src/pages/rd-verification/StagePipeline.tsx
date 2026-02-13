/**
 * M0-M12 管线可视化组件
 */
import { STAGES } from "../../../../shared/stage-definitions";
import { CheckCircle, Circle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface StagePipelineProps {
  currentStage: string;
  completedStages: string[];
  projectId?: string;
  onStageClick?: (stageId: string) => void;
  compact?: boolean;
}

type StageState = "completed" | "current" | "future";

function getStageState(id: string, cur: string, done: string[]): StageState {
  if (done.includes(id)) return "completed";
  if (id === cur) return "current";
  return "future";
}

function StageNode({ stageId, stageName, state, compact }: {
  stageId: string; stageName: string; state: StageState; compact: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
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
      <span className={cn("text-[10px] font-medium",
        state === "completed" && "text-green-500",
        state === "current" && "text-blue-500",
        state === "future" && "text-muted-foreground",
      )}>{stageId}</span>
      {!compact && <span className="text-[9px] text-muted-foreground whitespace-nowrap">{stageName}</span>}
    </div>
  );
}

function Connector({ completed }: { completed: boolean }) {
  return <div className={cn("w-4 h-0.5 flex-shrink-0", completed ? "bg-green-500" : "bg-muted-foreground/20")} />;
}

export default function StagePipeline({
  currentStage, completedStages, projectId, onStageClick, compact = false,
}: StagePipelineProps) {
  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto pb-2", "flex-wrap sm:flex-nowrap")}>
      {STAGES.map((stage, index) => {
        const state = getStageState(stage.id, currentStage, completedStages);
        const nodeEl = (
          <button onClick={() => onStageClick?.(stage.id)} className={cn(
            "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all min-w-[60px]",
            (onStageClick || projectId) && "cursor-pointer hover:bg-muted/50",
            !onStageClick && !projectId && "cursor-default",
          )}>
            <StageNode stageId={stage.id} stageName={stage.name} state={state} compact={compact} />
          </button>
        );
        return (
          <div key={stage.id} className="flex items-center">
            {projectId ? (
              <Link href={`/pos/projects/${projectId}/stage/${stage.id}`}>{nodeEl}</Link>
            ) : nodeEl}
            {index < STAGES.length - 1 && <Connector completed={state === "completed"} />}
          </div>
        );
      })}
    </div>
  );
}
