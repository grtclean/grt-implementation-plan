import { useEffect, useCallback } from "react";
import { useSandboxContext } from "./useSandboxContext";

export interface ShortcutDef {
  key: string;        // e.g. "ctrl+g", "alt+1"
  label: string;      // display label
  labelEn?: string;
  action: () => void;
}

interface UseSandboxShortcutsOptions {
  sandboxShortcuts?: ShortcutDef[];
  onShowHelp?: () => void;
  onLaunchScenario?: () => void;
  onSave?: () => void;
}

function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split("+");
  const needCtrl = parts.includes("ctrl");
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt");
  const keyPart = parts.filter((p) => !["ctrl", "shift", "alt"].includes(p))[0];

  if (needCtrl !== (e.ctrlKey || e.metaKey)) return false;
  if (needShift !== e.shiftKey) return false;
  if (needAlt !== e.altKey) return false;

  if (keyPart === "enter") return e.key === "Enter";
  if (keyPart === "?") return e.key === "?";
  if (keyPart === "s") return e.key === "s" || e.key === "S";
  return e.key.toLowerCase() === keyPart;
}

export function useSandboxShortcuts({
  sandboxShortcuts = [],
  onShowHelp,
  onLaunchScenario,
  onSave,
}: UseSandboxShortcutsOptions) {
  const ctx = useSandboxContext();

  const commonShortcuts: ShortcutDef[] = [
    {
      key: "ctrl+enter",
      label: "完成当前步骤并前进",
      labelEn: "Complete step & advance",
      action: () => {
        const step = ctx.steps[ctx.currentStepIndex];
        if (step) {
          ctx.markStepCompleted(step.key);
          if (ctx.currentStepIndex < ctx.steps.length - 1) {
            ctx.setCurrentStepIndex(ctx.currentStepIndex + 1);
          }
        }
      },
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      key: `alt+${i + 1}`,
      label: `跳到步骤 ${i + 1}`,
      labelEn: `Jump to step ${i + 1}`,
      action: () => {
        if (i < ctx.steps.length) ctx.setCurrentStepIndex(i);
      },
    })),
    ...(onSave
      ? [{ key: "ctrl+s", label: "保存", labelEn: "Save", action: onSave }]
      : []),
    ...(onLaunchScenario
      ? [{ key: "ctrl+shift+l", label: "启动场景", labelEn: "Launch scenario", action: onLaunchScenario }]
      : []),
    ...(onShowHelp
      ? [{ key: "?", label: "快捷键帮助", labelEn: "Shortcut help", action: onShowHelp }]
      : []),
  ];

  const allShortcuts = [...commonShortcuts, ...sandboxShortcuts];

  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        // Allow Ctrl+Enter and Ctrl+S even in inputs
        if (!(e.key === "Enter" && (e.ctrlKey || e.metaKey)) &&
            !(e.key === "s" && (e.ctrlKey || e.metaKey))) {
          return;
        }
      }

      for (const shortcut of allShortcuts) {
        if (matchesShortcut(e, shortcut.key)) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    [allShortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);

  return { allShortcuts, commonShortcuts, sandboxShortcuts };
}
