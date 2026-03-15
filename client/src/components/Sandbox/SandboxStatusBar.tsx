import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useSandboxContext } from "./useSandboxContext";

interface SandboxStatusBarProps {
  lastSaved?: Date | null;
  isSaving?: boolean;
  scenarioInitialized?: boolean;
}

export default function SandboxStatusBar({
  lastSaved: lastSavedProp,
  isSaving,
  scenarioInitialized: scenarioInitializedProp,
}: SandboxStatusBarProps = {}) {
  const ctx = useSandboxContext();
  const { sandboxId, steps, currentStepIndex, completedSteps } = ctx;
  const lastSaved = lastSavedProp ?? ctx.lastSaved;
  const scenarioInitialized = scenarioInitializedProp ?? ctx.scenarioInitialized;

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const completedCount = completedSteps.size;
  const progressPct =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const savedTime = lastSaved
    ? `${String(lastSaved.getHours()).padStart(2, "0")}:${String(lastSaved.getMinutes()).padStart(2, "0")}:${String(lastSaved.getSeconds()).padStart(2, "0")}`
    : null;

  return (
    <div className="flex items-center gap-4 border-t bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
      <span>
        Sandbox: <span className="font-mono">{sandboxId}</span>
      </span>
      <span className="hidden sm:inline">|</span>
      <span className="hidden sm:inline">
        Step: {currentStep?.label ?? "—"}
      </span>
      <span>|</span>
      <span>
        {completedCount}/{totalSteps} ({progressPct}%)
      </span>

      {/* Auto-save indicator */}
      {isSaving && (
        <span className="flex items-center gap-1 text-cyan-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </span>
      )}
      {!isSaving && savedTime && (
        <span className="flex items-center gap-1 text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Saved {savedTime}
        </span>
      )}

      {/* Scenario status */}
      {scenarioInitialized && (
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          场景已注入
        </span>
      )}

      <span className="ml-auto">{timestamp}</span>
    </div>
  );
}
