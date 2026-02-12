/**
 * Toast Hook
 * 简单的toast通知hook
 */

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastState {
  toasts: Toast[];
}

let toastCount = 0;

function generateId() {
  return `toast-${++toastCount}`;
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
      const id = generateId();
      const newToast: Toast = { id, title, description, variant };
      
      setState((prev) => ({
        toasts: [...prev.toasts, newToast],
      }));

      // 自动移除toast
      setTimeout(() => {
        setState((prev) => ({
          toasts: prev.toasts.filter((t) => t.id !== id),
        }));
      }, 3000);

      return { id, dismiss: () => dismiss(id) };
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setState((prev) => ({
      toasts: prev.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
}
