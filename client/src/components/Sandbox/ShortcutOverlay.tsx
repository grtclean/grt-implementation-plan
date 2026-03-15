import React from "react";
import { Keyboard, X } from "lucide-react";
import type { ShortcutDef } from "./useSandboxShortcuts";

interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
  commonShortcuts: ShortcutDef[];
  sandboxShortcuts: ShortcutDef[];
  sandboxTitle?: string;
}

function KeyBadge({ shortcut }: { shortcut: string }) {
  const parts = shortcut.split("+");
  return (
    <span className="inline-flex items-center gap-0.5">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-gray-600 text-[10px]">+</span>}
          <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] font-mono text-gray-300 uppercase">
            {p}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

function ShortcutRow({ def }: { def: ShortcutDef }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-800/50">
      <span className="text-xs text-gray-300">
        {def.label}
        {def.labelEn && <span className="text-gray-600 ml-1.5">({def.labelEn})</span>}
      </span>
      <KeyBadge shortcut={def.key} />
    </div>
  );
}

export default function ShortcutOverlay({
  open,
  onClose,
  commonShortcuts,
  sandboxShortcuts,
  sandboxTitle,
}: ShortcutOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-gray-700 bg-[#0d1321] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-200">快捷键 Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Common shortcuts */}
        <div className="px-4 py-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">通用 Common</h3>
          <div className="space-y-0.5">
            {commonShortcuts.map((s) => (
              <ShortcutRow key={s.key} def={s} />
            ))}
          </div>
        </div>

        {/* Sandbox-specific shortcuts */}
        {sandboxShortcuts.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-800">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
              {sandboxTitle ?? "沙盘专属"} Sandbox-Specific
            </h3>
            <div className="space-y-0.5">
              {sandboxShortcuts.map((s) => (
                <ShortcutRow key={s.key} def={s} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-600">
            按 <KeyBadge shortcut="?" /> 打开/关闭此面板 · Press <KeyBadge shortcut="Esc" /> to close
          </p>
        </div>
      </div>
    </div>
  );
}
