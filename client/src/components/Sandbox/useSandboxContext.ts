import { createContext, useContext } from "react";
import type { LucideIcon } from "lucide-react";

export interface SandboxStep {
  key: string;
  label: string;
  labelEn?: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

export interface SandboxContextValue {
  sandboxId: string;
  currentStepIndex: number;
  setCurrentStepIndex: (i: number) => void;
  steps: SandboxStep[];
  completedSteps: Set<string>;
  markStepCompleted: (key: string) => void;
  scenarioInitialized?: boolean;
  lastSaved?: Date | null;
}

export const SandboxContext = createContext<SandboxContextValue | null>(null);

export function useSandboxContext() {
  const ctx = useContext(SandboxContext);
  if (!ctx)
    throw new Error(
      "useSandboxContext must be used within SandboxWorkbench"
    );
  return ctx;
}
