/**
 * Async Agent Service — GRT开发第一定律 Layer II
 *
 * Factory for converting blocking AI calls into async task queue pattern.
 * Any AI/Agent call taking >2s MUST use this pattern:
 *   1. startAgentTask mutation → returns taskId immediately
 *   2. getTaskStatus query → frontend polls for result
 *
 * Usage in routers:
 *   import { createAsyncAgentProcedures } from "../services/async-agent.service";
 *   const { start, status, cancel } = createAsyncAgentProcedures("COPILOT_ASK", handler);
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { submitTask, getTaskStatus, cancelTask, registerTaskHandler, type TaskHandler } from "./task-worker.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("async-agent");

/**
 * Create a trio of tRPC procedures for an async AI task:
 *   - start: mutation that enqueues the task, returns { taskId }
 *   - status: query that returns task status/result (for polling)
 *   - cancel: mutation that cancels a pending task
 *
 * @param taskType  Unique task type key (e.g. "COPILOT_ASK", "SKILL_RECOMMEND")
 * @param handler   The actual async AI handler (runs in background worker)
 * @param inputSchema  Zod schema for the task input
 */
export function createAsyncAgentProcedures<TInput extends z.ZodTypeAny>(
  taskType: string,
  handler: TaskHandler,
  inputSchema: TInput,
) {
  // Register the handler with the task worker
  registerTaskHandler(taskType, handler);
  log.info({ taskType }, "Registered async agent handler");

  return {
    start: protectedProcedure
      .input(inputSchema)
      .mutation(async ({ ctx, input }) => {
        const { taskId } = await submitTask(
          taskType,
          input as Record<string, unknown>,
          ctx.user!.name ?? `user-${ctx.user!.id}`,
          { submittedById: ctx.user!.id },
        );
        return { taskId };
      }),

    status: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        const task = await getTaskStatus(input.taskId);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        }
        return task;
      }),

    cancel: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input }) => {
        const cancelled = await cancelTask(input.taskId);
        if (!cancelled) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Task is no longer pending — cannot cancel",
          });
        }
        return { success: true };
      }),
  };
}

/**
 * Convenience: wrap an invokeLLM call as a TaskHandler.
 * Catches LLM errors and returns them as structured error data.
 */
export function wrapLLMHandler(
  fn: (input: Record<string, unknown>) => Promise<Record<string, unknown>>,
): TaskHandler {
  return async (_taskId: number, input: Record<string, unknown>) => {
    try {
      return await fn(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : "LLM invocation failed";
      log.error({ err, taskType: "llm-wrapper" }, message);
      throw new Error(message);
    }
  };
}
