/**
 * AsyncTaskCard — GRT开发第一定律 Layer III
 *
 * Unified UI for async AI task states:
 *   - submitting/pending/processing → Skeleton loader
 *   - completed → renders children with result
 *   - failed → red Alert card with retry button
 *   - cancelled → muted card
 *
 * Usage:
 *   <AsyncTaskCard status={status} error={error} onRetry={retry}>
 *     <ResultComponent data={result} />
 *   </AsyncTaskCard>
 */
import React from "react";
import type { AsyncTaskStatus } from "../hooks/useAsyncTask";

interface AsyncTaskCardProps {
  status: AsyncTaskStatus;
  error?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
  /** Optional label shown during loading */
  loadingLabel?: string;
}

export function AsyncTaskCard({
  status,
  error,
  onRetry,
  onCancel,
  children,
  loadingLabel = "AI 分析中...",
}: AsyncTaskCardProps) {
  // Skeleton / loading state
  if (status === "submitting" || status === "pending" || status === "processing") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-blue-400 animate-spin" />
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {loadingLabel}
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700 underline"
            >
              取消
            </button>
          )}
        </div>
        {/* Skeleton lines */}
        <div className="space-y-2">
          <div className="h-3 bg-blue-200/50 dark:bg-blue-800/30 rounded w-full" />
          <div className="h-3 bg-blue-200/50 dark:bg-blue-800/30 rounded w-4/5" />
          <div className="h-3 bg-blue-200/50 dark:bg-blue-800/30 rounded w-3/5" />
        </div>
      </div>
    );
  }

  // Error state
  if (status === "failed") {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              AI 任务失败
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error || "未知错误"}
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              重试
            </button>
          )}
        </div>
      </div>
    );
  }

  // Cancelled state
  if (status === "cancelled") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500">任务已取消</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            重新开始
          </button>
        )}
      </div>
    );
  }

  // Idle — nothing to show yet
  if (status === "idle") {
    return null;
  }

  // Completed — render children
  return <>{children}</>;
}
