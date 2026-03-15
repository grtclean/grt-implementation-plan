import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSandboxContext } from "./useSandboxContext";

export default function SopStepper() {
  const { steps, currentStepIndex, setCurrentStepIndex, completedSteps } =
    useSandboxContext();

  const completedCount = completedSteps.size;
  const totalSteps = steps.length;
  const progressPct =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Step list */}
      <div className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 px-2">
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = completedSteps.has(step.key);
            const Icon = step.icon;

            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {/* Step number / check */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
                          isActive
                            ? "border-primary text-primary"
                            : "border-muted-foreground/40 text-muted-foreground"
                        )}
                      >
                        {idx + 1}
                      </span>
                    )}
                  </span>

                  {/* Icon */}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />

                  {/* Label */}
                  <span className="truncate">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Progress footer */}
      <div className="border-t px-3 py-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {completedCount}/{totalSteps} completed
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
