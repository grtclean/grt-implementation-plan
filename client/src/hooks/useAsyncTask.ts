/**
 * useAsyncTask — GRT开发第一定律 Layer III
 *
 * Frontend hook for async AI task polling pattern.
 * Replaces blocking LLM calls with:
 *   1. startTask mutation → returns taskId
 *   2. Polls getTaskStatus every N ms
 *   3. Returns skeleton/loading/result/error states
 *
 * Usage:
 *   const { startTask, status, result, error, isPolling } = useAsyncTask(
 *     trpc.help.askCopilot.mutate,
 *     trpc.help.getCopilotResult.useQuery,
 *   );
 */
import { useState, useEffect, useCallback, useRef } from "react";

export type AsyncTaskStatus = "idle" | "submitting" | "pending" | "processing" | "completed" | "failed" | "cancelled";

interface UseAsyncTaskOptions {
  pollIntervalMs?: number;
  maxPollDurationMs?: number;
  onComplete?: (result: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

interface UseAsyncTaskReturn<TInput> {
  startTask: (input: TInput) => Promise<void>;
  taskId: number | null;
  status: AsyncTaskStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  isPolling: boolean;
  isLoading: boolean;
  cancel: () => void;
  reset: () => void;
}

/**
 * Generic async task hook — works with any start/poll pair.
 *
 * @param startMutationFn  The tRPC mutation that returns { taskId }
 * @param pollQueryFn      Function that fetches task status by taskId
 */
export function useAsyncTask<TInput>(
  startMutationFn: (input: TInput) => Promise<{ taskId: number }>,
  pollQueryFn: (taskId: number) => Promise<{
    status: string;
    result?: Record<string, unknown> | null;
    resultData?: Record<string, unknown> | null;
    error?: string | null;
    errorMessage?: string | null;
    [key: string]: unknown;
  }>,
  options: UseAsyncTaskOptions = {},
): UseAsyncTaskReturn<TInput> {
  const {
    pollIntervalMs = 2000,
    maxPollDurationMs = 300_000, // 5 min max
    onComplete,
    onError,
  } = options;

  const [taskId, setTaskId] = useState<number | null>(null);
  const [status, setStatus] = useState<AsyncTaskStatus>("idle");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setTaskId(null);
    setStatus("idle");
    setResult(null);
    setError(null);
  }, [stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    setStatus("cancelled");
  }, [stopPolling]);

  // Poll effect
  useEffect(() => {
    if (!taskId || (status !== "pending" && status !== "processing")) return;

    pollStartRef.current = Date.now();

    const poll = async () => {
      try {
        const task = await pollQueryFn(taskId);
        const taskStatus = task.status as AsyncTaskStatus;
        setStatus(taskStatus);

        if (taskStatus === "completed") {
          const taskResult = task.result ?? task.resultData ?? null;
          setResult(taskResult);
          stopPolling();
          onComplete?.(taskResult as Record<string, unknown>);
        } else if (taskStatus === "failed" || taskStatus === "cancelled") {
          const taskError = task.error ?? task.errorMessage ?? "Task failed";
          setError(taskError);
          stopPolling();
          onError?.(taskError);
        } else if (Date.now() - pollStartRef.current > maxPollDurationMs) {
          setStatus("failed");
          setError("任务超时 / Task timed out");
          stopPolling();
          onError?.("Task timed out");
        }
      } catch (err) {
        // Network error during poll — don't crash, keep trying
        console.warn("[useAsyncTask] poll error:", err);
      }
    };

    // Immediate first poll
    poll();
    pollTimerRef.current = setInterval(poll, pollIntervalMs);

    return stopPolling;
  }, [taskId, status, pollQueryFn, pollIntervalMs, maxPollDurationMs, stopPolling, onComplete, onError]);

  const startTask = useCallback(async (input: TInput) => {
    reset();
    setStatus("submitting");
    try {
      const { taskId: newTaskId } = await startMutationFn(input);
      setTaskId(newTaskId);
      setStatus("pending");
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to submit task");
    }
  }, [startMutationFn, reset]);

  const isPolling = status === "pending" || status === "processing";
  const isLoading = status === "submitting" || isPolling;

  return {
    startTask,
    taskId,
    status,
    result,
    error,
    isPolling,
    isLoading,
    cancel,
    reset,
  };
}
