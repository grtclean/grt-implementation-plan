import { useEffect, useRef, useState, useCallback } from "react";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  const initialRef = useRef(true);

  dataRef.current = data;

  const save = useCallback(async () => {
    if (!enabled) return;
    setIsSaving(true);
    try {
      await onSave(dataRef.current);
      setLastSaved(new Date());
    } catch {
      // silently fail — status bar shows stale lastSaved
    } finally {
      setIsSaving(false);
    }
  }, [onSave, enabled]);

  useEffect(() => {
    // Skip first render (initial load)
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      save();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, debounceMs, enabled, save]);

  return { lastSaved, isSaving };
}
