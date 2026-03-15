import React, { useState, useCallback, useMemo } from "react";
import {
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Keyboard, LayoutGrid, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { SandboxContext, type SandboxStep } from "./useSandboxContext";
import SopStepper from "./SopStepper";
import AgentCopilotPanel from "./AgentCopilotPanel";
import SandboxStatusBar from "./SandboxStatusBar";
import SandboxToolbar from "./SandboxToolbar";
import SandboxNineGrid from "./SandboxNineGrid";

interface SandboxWorkbenchProps {
  sandboxId: string;
  title: string;
  titleEn?: string;
  steps: SandboxStep[];
  agentId: string;
  children?: React.ReactNode;
}

export default function SandboxWorkbench({
  sandboxId,
  title,
  titleEn,
  steps,
  agentId,
  children,
}: SandboxWorkbenchProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    () => new Set()
  );
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  /** "grid" = nine-grid cockpit,  "workbench" = SOP three-column */
  const [view, setView] = useState<"grid" | "workbench">("grid");

  const markStepCompleted = useCallback((key: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  // Query scenario initialization status
  const { data: scenarioStatus } = trpc.scenarioInit.getStatus.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const scenarioInitialized = scenarioStatus?.initialized?.includes(sandboxId) ?? false;

  const contextValue = useMemo(
    () => ({
      sandboxId,
      currentStepIndex,
      setCurrentStepIndex,
      steps,
      completedSteps,
      markStepCompleted,
      scenarioInitialized,
    }),
    [sandboxId, currentStepIndex, steps, completedSteps, markStepCompleted, scenarioInitialized]
  );

  const CurrentComponent = steps[currentStepIndex]?.component;

  return (
    <SandboxContext.Provider value={contextValue}>
      <div className="flex h-full flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-3">
            {view === "workbench" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLeftOpen((v) => !v)}
                title={leftOpen ? "Hide steps" : "Show steps"}
              >
                {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
            )}
            <div>
              <h1 className="text-base font-semibold leading-tight">{title}</h1>
              {titleEn && <p className="text-xs text-muted-foreground">{titleEn}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scenarioInitialized && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                场景已注入
              </span>
            )}

            {/* View switcher: Grid ↔ Workbench */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-[10px] gap-1 rounded-md",
                  view === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setView("grid")}
                title="九宫格驾驶舱"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                驾驶舱
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-[10px] gap-1 rounded-md",
                  view === "workbench" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setView("workbench")}
                title="SOP工作台"
              >
                <Play className="h-3.5 w-3.5" />
                工作台
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }))}
              title="快捷键帮助 Keyboard shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" />
            </Button>

            {view === "workbench" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setRightOpen((v) => !v)}
                title={rightOpen ? "Hide agent" : "Show agent"}
              >
                {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* VIEW: Nine-Grid Cockpit 九宫格驾驶舱          */}
        {/* ══════════════════════════════════════════════ */}
        {view === "grid" && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[720px] mx-auto py-4">
              {/* Compact I/O toolbar above grid */}
              <div className="px-4 mb-3">
                <SandboxToolbar sandboxId={sandboxId} compact />
              </div>

              {/* Nine Grid */}
              <SandboxNineGrid
                sandboxId={sandboxId}
                scenarioInitialized={scenarioInitialized}
                onEnterWorkbench={() => setView("workbench")}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* VIEW: SOP Workbench 三列工作台                */}
        {/* ══════════════════════════════════════════════ */}
        {view === "workbench" && (
          <>
            {/* Three-column body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: SOP Stepper */}
              {leftOpen && (
                <div className="w-[220px] shrink-0 border-r bg-background overflow-y-auto">
                  <SopStepper />
                </div>
              )}

              {/* Center: Step content — children override step component */}
              <div className="flex-1 overflow-y-auto p-4">
                {children ?? (CurrentComponent && <CurrentComponent />)}
              </div>

              {/* Right: Agent Copilot */}
              {rightOpen && (
                <div className="w-[320px] shrink-0 border-l bg-background overflow-hidden">
                  <AgentCopilotPanel agentId={agentId} sandboxId={sandboxId} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Status bar */}
        <SandboxStatusBar />
      </div>
    </SandboxContext.Provider>
  );
}
