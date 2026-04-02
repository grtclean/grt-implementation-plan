import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, Upload, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  stepNumber: number;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  estimatedMinutes: number;
  actualMinutes?: number;
  evidenceUrl?: string;
  measuredValue?: string;
  expectedValue?: string;
  measurementPass?: boolean;
}

interface MaintenanceStepExecutorProps {
  steps: Step[];
  onStepComplete?: (stepNumber: number) => void;
  onAddEvidence?: (stepNumber: number) => void;
  className?: string;
}

function StepIcon({ status }: { status: Step["status"] }) {
  switch (status) {
    case "completed":
      return <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"><Check className="h-4 w-4 text-white" /></div>;
    case "failed":
      return <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center"><X className="h-4 w-4 text-white" /></div>;
    case "in_progress":
      return <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse"><Circle className="h-4 w-4 text-white" /></div>;
    default:
      return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600"><Circle className="h-4 w-4" /></div>;
  }
}

export function MaintenanceStepExecutor({ steps, onStepComplete, onAddEvidence, className }: MaintenanceStepExecutorProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(
    steps.find((s) => s.status === "in_progress")?.stepNumber ?? null
  );
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [measurements, setMeasurements] = useState<Record<number, string>>({});

  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, idx) => {
        const isExpanded = expandedStep === step.stepNumber || step.status === "in_progress";
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.stepNumber} className="flex gap-3">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {!isLast && <div className="w-0.5 flex-1 bg-gray-200 min-h-[20px]" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setExpandedStep(expandedStep === step.stepNumber ? null : step.stepNumber)}
              >
                <span className="font-medium text-sm">
                  Step {step.stepNumber}: {step.description}
                </span>
                {step.status === "completed" && step.actualMinutes != null && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />{step.actualMinutes}分钟
                  </Badge>
                )}
                {step.measurementPass === true && <Badge className="bg-green-100 text-green-700 text-xs">PASS</Badge>}
                {step.measurementPass === false && <Badge className="bg-red-100 text-red-700 text-xs">FAIL</Badge>}
              </div>

              {/* Collapsed completed: evidence thumbnail */}
              {step.status === "completed" && !isExpanded && step.evidenceUrl && (
                <div className="mt-1 w-12 h-8 bg-muted rounded border flex items-center justify-center text-[10px] text-muted-foreground">
                  IMG
                </div>
              )}

              {/* Expanded view */}
              {isExpanded && step.status !== "completed" && (
                <div className="mt-2 space-y-3 bg-muted/50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    预计 {step.estimatedMinutes} 分钟
                  </div>

                  {/* Measurement */}
                  {step.expectedValue && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">期望值:</span>
                      <span className="text-xs font-mono">{step.expectedValue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">测量值:</span>
                    <Input
                      className="h-7 text-xs w-40"
                      placeholder="输入测量值..."
                      value={measurements[step.stepNumber] ?? step.measuredValue ?? ""}
                      onChange={(e) => setMeasurements((p) => ({ ...p, [step.stepNumber]: e.target.value }))}
                    />
                    {step.measurementPass === true && <Badge className="bg-green-100 text-green-700 text-xs">PASS</Badge>}
                    {step.measurementPass === false && <Badge className="bg-red-100 text-red-700 text-xs">FAIL</Badge>}
                  </div>

                  {/* Evidence upload */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => onAddEvidence?.(step.stepNumber)}
                  >
                    <Upload className="h-3 w-3 mr-1" />上传证据
                  </Button>

                  {/* Notes */}
                  <Textarea
                    placeholder="备注..."
                    className="text-xs min-h-[48px]"
                    value={notes[step.stepNumber] ?? ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [step.stepNumber]: e.target.value }))}
                  />

                  {/* Complete button */}
                  {step.status === "in_progress" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                      onClick={() => onStepComplete?.(step.stepNumber)}
                    >
                      <Check className="h-3 w-3 mr-1" />完成步骤
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
