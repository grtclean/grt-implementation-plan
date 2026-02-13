import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export interface SmartPrefillResult<T> {
  draft: T | null;
  saveDraft: (data: T) => void;
  clearDraft: () => void;
  hasDraft: boolean;
}

export function useSmartPrefill<T>(formType: string): SmartPrefillResult<T> {
  const storageKey = "grt_draft_" + formType;
  const [draft, setDraft] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) { setDraft(JSON.parse(saved) as T); }
    } catch { /* ignore */ }
  }, [storageKey]);

  const saveDraft = useCallback((data: T) => {
    setDraft(data);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(data)); }
      catch { /* ignore */ }
    }, 1000);
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    setDraft(null);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]);

  return { draft, saveDraft, clearDraft, hasDraft: draft !== null };
}

// ---- Banner Component ----
export interface SmartPrefillBannerProps {
  hasDraft: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

export function SmartPrefillBanner({ hasDraft, onRestore, onDiscard }: SmartPrefillBannerProps) {
  if (!hasDraft) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
      <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
      <span className="flex-1 text-sm text-yellow-700 dark:text-yellow-300">
        检测到未完成的草稿，是否恢复？
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRestore}>恢复</Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>丢弃</Button>
      </div>
    </div>
  );
}
