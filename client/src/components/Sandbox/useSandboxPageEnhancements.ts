/**
 * useSandboxPageEnhancements — composite hook for sandbox page integration.
 *
 * Wires up:
 * - Per-sandbox keyboard shortcuts (via useSandboxShortcuts)
 * - Auto-save (via useAutoSave)
 * - Shortcut overlay toggle state
 *
 * Usage in a sandbox page:
 *   const { shortcutOverlayOpen, setShortcutOverlayOpen, lastSaved, isSaving } =
 *     useSandboxPageEnhancements({ sandboxShortcuts, autoSave: { data, onSave } });
 */
import { useState, useCallback } from "react";
import { useSandboxShortcuts, type ShortcutDef } from "./useSandboxShortcuts";
import { useAutoSave } from "@/hooks/useAutoSave";

interface AutoSaveConfig<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseSandboxPageEnhancementsOptions<T = unknown> {
  sandboxShortcuts?: ShortcutDef[];
  autoSave?: AutoSaveConfig<T>;
}

export function useSandboxPageEnhancements<T = unknown>({
  sandboxShortcuts = [],
  autoSave,
}: UseSandboxPageEnhancementsOptions<T> = {}) {
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);

  const onShowHelp = useCallback(() => {
    setShortcutOverlayOpen((v) => !v);
  }, []);

  let shortcutsResult;
  try {
    shortcutsResult = useSandboxShortcuts({
      sandboxShortcuts,
      onShowHelp,
    });
  } catch {
    // Not inside SandboxContext — return noop shortcuts
    shortcutsResult = {
      allShortcuts: [],
      commonShortcuts: [],
      sandboxShortcuts: [],
    };
  }

  const autoSaveResult = useAutoSave(
    autoSave ?? {
      data: null as T,
      onSave: async () => {},
      enabled: false,
    }
  );

  return {
    shortcutOverlayOpen,
    setShortcutOverlayOpen,
    shortcuts: shortcutsResult,
    lastSaved: autoSaveResult.lastSaved,
    isSaving: autoSaveResult.isSaving,
  };
}
