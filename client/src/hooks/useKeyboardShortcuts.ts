/**
 * useKeyboardShortcuts — centralized keyboard shortcut registry.
 *
 * Provides a single hook for registering keyboard shortcuts throughout
 * the application. Shortcuts are automatically cleaned up on unmount.
 *
 * Built-in shortcuts (always active):
 *   Ctrl+K       → Open global search
 *   Ctrl+/       → Open Copilot
 *   Alt+A        → Toggle AI Canvas
 *   F1           → Toggle help
 *   Ctrl+S       → Save (in editable contexts)
 *   Ctrl+Shift+N → New folder (in workspace)
 *   Ctrl+U       → Upload file (in workspace)
 *   Escape       → Close active dialog/panel
 *
 * Usage in components:
 *   useKeyboardShortcuts([
 *     { key: "n", ctrl: true, handler: () => createNew() },
 *     { key: "Delete", handler: () => deleteSelected(), when: !!selected },
 *   ]);
 */
import { useEffect, useRef, useCallback } from "react";

export interface ShortcutDef {
  /** Key value (e.g., "k", "s", "F1", "Escape", "Delete"). Case-insensitive. */
  key: string;
  /** Require Ctrl/Cmd. */
  ctrl?: boolean;
  /** Require Shift. */
  shift?: boolean;
  /** Require Alt/Option. */
  alt?: boolean;
  /** Handler function. */
  handler: (e: KeyboardEvent) => void;
  /** Only active when this condition is true. Default true. */
  when?: boolean;
  /** Prevent default browser action. Default true. */
  preventDefault?: boolean;
  /** Description shown in shortcut help panel. */
  description?: string;
}

/** Central registry for displaying available shortcuts. */
const globalShortcutRegistry: ShortcutDef[] = [];

/**
 * Returns all registered shortcuts for display in a help panel.
 */
export function getRegisteredShortcuts(): ShortcutDef[] {
  return [...globalShortcutRegistry];
}

/**
 * Format a shortcut for display (e.g., "Ctrl+K", "Alt+A").
 */
export function formatShortcut(def: ShortcutDef): string {
  const parts: string[] = [];
  if (def.ctrl) parts.push("Ctrl");
  if (def.shift) parts.push("Shift");
  if (def.alt) parts.push("Alt");
  parts.push(def.key.length === 1 ? def.key.toUpperCase() : def.key);
  return parts.join("+");
}

/**
 * Hook to register keyboard shortcuts. Shortcuts are active only
 * while the component is mounted.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    // Register descriptions for help panel
    const toRegister = shortcuts.filter(s => s.description);
    globalShortcutRegistry.push(...toRegister);

    const handler = (e: KeyboardEvent) => {
      // Skip when focused in an input/textarea/contentEditable
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        // Check condition
        if (shortcut.when === false) continue;

        // Match key
        if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

        // Match modifiers
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (!ctrlMatch || !shiftMatch || !altMatch) continue;

        // For non-modifier shortcuts, skip if editing (e.g., Delete key in a textarea)
        if (!shortcut.ctrl && !shortcut.alt && isEditing) continue;

        // Ctrl+S is allowed everywhere
        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        shortcut.handler(e);
        return;
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
      // Unregister from global registry
      for (const s of toRegister) {
        const idx = globalShortcutRegistry.indexOf(s);
        if (idx >= 0) globalShortcutRegistry.splice(idx, 1);
      }
    };
  }, [shortcuts.length]); // Re-register when shortcut count changes
}

/**
 * Pre-defined workspace shortcuts. Import and spread into useKeyboardShortcuts.
 */
export function createWorkspaceShortcuts(actions: {
  onUpload?: () => void;
  onNewFolder?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onSave?: () => void;
  onSearch?: () => void;
  onToggleO365?: () => void;
  hasSelection?: boolean;
}): ShortcutDef[] {
  const defs: ShortcutDef[] = [];

  if (actions.onUpload) {
    defs.push({
      key: "u", ctrl: true, handler: () => actions.onUpload!(),
      description: "Upload file", preventDefault: true,
    });
  }
  if (actions.onNewFolder) {
    defs.push({
      key: "n", ctrl: true, shift: true, handler: () => actions.onNewFolder!(),
      description: "New folder", preventDefault: true,
    });
  }
  if (actions.onDelete) {
    defs.push({
      key: "Delete", handler: () => actions.onDelete!(),
      when: actions.hasSelection,
      description: "Delete selected",
    });
  }
  if (actions.onRename) {
    defs.push({
      key: "F2", handler: () => actions.onRename!(),
      when: actions.hasSelection,
      description: "Rename selected",
    });
  }
  if (actions.onSearch) {
    defs.push({
      key: "f", ctrl: true, handler: () => actions.onSearch!(),
      description: "Search files", preventDefault: true,
    });
  }
  if (actions.onToggleO365) {
    defs.push({
      key: "o", ctrl: true, shift: true, handler: () => actions.onToggleO365!(),
      description: "Toggle O365 panel", preventDefault: true,
    });
  }

  return defs;
}
