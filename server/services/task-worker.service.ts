/**
 * Task Worker Service — Background async AI task processor
 *
 * Polls `ai_tasks` for pending tasks, claims via SELECT FOR UPDATE SKIP LOCKED,
 * dispatches to registered engine handlers, handles retry & timeout.
 */
import { requireDb } from "../db";
import { aiTasks } from "../../drizzle/schema";
import { eq, and, sql, lt, or, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ── Types ────────────────────────────────────────────────────

export type TaskHandler = (taskId: number, input: Record<string, unknown>) => Promise<Record<string, unknown>>;

interface WorkerConfig {
  pollIntervalMs: number;        // how often to poll (default: 5000)
  taskTimeoutMs: number;         // per-task timeout (default: 120000 = 2 min)
  maxRetries: number;            // default max retries (default: 3)
  concurrency: number;           // max concurrent tasks (default: 2)
}

const DEFAULT_CONFIG: WorkerConfig = {
  pollIntervalMs: 5000,
  taskTimeoutMs: 120_000,
  maxRetries: 3,
  concurrency: 2,
};

// ── Worker State ─────────────────────────────────────────────

const handlers = new Map<string, TaskHandler>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeTasks = 0;
let config = { ...DEFAULT_CONFIG };
const workerId = `worker-${uuidv4().slice(0, 8)}`;

// ── Public API ───────────────────────────────────────────────

/**
 * Register a handler for a specific task type.
 * When the worker picks up a task with this type, it invokes the handler.
 */
export function registerTaskHandler(taskType: string, handler: TaskHandler): void {
  handlers.set(taskType, handler);
  console.log(`[TaskWorker] Registered handler: ${taskType}`);
}

/**
 * Start the background polling loop.
 */
export function startTaskWorker(overrides?: Partial<WorkerConfig>): void {
  if (pollTimer) {
    console.warn("[TaskWorker] Already running");
    return;
  }

  config = { ...DEFAULT_CONFIG, ...overrides };
  console.log(`[TaskWorker] Starting (id=${workerId}, poll=${config.pollIntervalMs}ms, concurrency=${config.concurrency})`);

  pollTimer = setInterval(() => {
    pollAndProcess().catch(err => {
      console.error("[TaskWorker] Poll error:", err);
    });
  }, config.pollIntervalMs);

  // Also run immediately
  pollAndProcess().catch(err => {
    console.error("[TaskWorker] Initial poll error:", err);
  });
}

/**
 * Stop the background worker.
 */
export function stopTaskWorker(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[TaskWorker] Stopped");
  }
}

/**
 * Submit a new task to the queue (convenience wrapper).
 */
export async function submitTask(
  taskType: string,
  inputData: Record<string, unknown>,
  createdBy: string,
  opts?: { maxRetries?: number },
): Promise<{ taskId: number }> {
  const db = await requireDb();
  const [task] = await db.insert(aiTasks).values({
    taskType,
    inputData,
    status: "pending",
    createdBy,
    maxRetries: opts?.maxRetries ?? config.maxRetries,
    retryCount: 0,
  }).returning();
  return { taskId: task.id };
}

// ── Internal: Poll & Process ─────────────────────────────────

async function pollAndProcess(): Promise<void> {
  if (activeTasks >= config.concurrency) return;
  if (handlers.size === 0) return;

  const db = await requireDb();

  // Also reclaim timed-out tasks
  try {
    const now = new Date().toISOString();
    await db.update(aiTasks).set({
      status: "pending",
      workerLockId: null,
      timeoutAt: null,
    }).where(
      and(
        eq(aiTasks.status, "processing"),
        lt(aiTasks.timeoutAt, now),
      )
    );
  } catch {
    // ignore — timeout reclaim is best-effort
  }

  // Claim tasks — use raw SQL for FOR UPDATE SKIP LOCKED
  const slotsAvailable = config.concurrency - activeTasks;
  if (slotsAvailable <= 0) return;

  const taskTypes = Array.from(handlers.keys());
  if (taskTypes.length === 0) return;

  try {
    const typeList = taskTypes.map(t => `'${t}'`).join(",");
    const timeoutAt = new Date(Date.now() + config.taskTimeoutMs).toISOString();

    // Claim up to `slotsAvailable` pending tasks
    const claimed = await db.execute(sql`
      UPDATE ai_tasks
      SET status = 'processing',
          worker_lock_id = ${workerId},
          started_at = NOW(),
          timeout_at = ${timeoutAt}::timestamp
      WHERE id IN (
        SELECT id FROM ai_tasks
        WHERE status = 'pending'
          AND task_type IN (${sql.raw(typeList)})
        ORDER BY created_at ASC
        LIMIT ${slotsAvailable}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, task_type, input_data
    `);

    const rows = (claimed as any).rows || claimed || [];
    for (const row of rows) {
      activeTasks++;
      processTask(row.id, row.task_type, row.input_data).finally(() => {
        activeTasks--;
      });
    }
  } catch (err) {
    console.error("[TaskWorker] Claim error:", err);
  }
}

async function processTask(
  taskId: number,
  taskType: string,
  inputData: Record<string, unknown>,
): Promise<void> {
  const handler = handlers.get(taskType);
  if (!handler) {
    console.warn(`[TaskWorker] No handler for ${taskType}, skipping task ${taskId}`);
    return;
  }

  const db = await requireDb();

  try {
    // Execute with timeout
    const result = await Promise.race([
      handler(taskId, inputData),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Task ${taskId} timed out after ${config.taskTimeoutMs}ms`)), config.taskTimeoutMs)
      ),
    ]);

    // Success
    await db.update(aiTasks).set({
      status: "completed",
      resultData: result,
      completedAt: new Date().toISOString(),
      workerLockId: null,
      timeoutAt: null,
    }).where(eq(aiTasks.id, taskId));

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[TaskWorker] Task ${taskId} (${taskType}) failed:`, message);

    // Check retry
    const [task] = await db.select({
      retryCount: aiTasks.retryCount,
      maxRetries: aiTasks.maxRetries,
    }).from(aiTasks).where(eq(aiTasks.id, taskId));

    const retryCount = (task?.retryCount ?? 0) + 1;
    const maxRetries = task?.maxRetries ?? config.maxRetries;

    if (retryCount < maxRetries) {
      // Re-queue for retry
      await db.update(aiTasks).set({
        status: "pending",
        retryCount,
        errorMessage: `Retry ${retryCount}/${maxRetries}: ${message.slice(0, 400)}`,
        workerLockId: null,
        timeoutAt: null,
      }).where(eq(aiTasks.id, taskId));
      console.log(`[TaskWorker] Task ${taskId} retrying (${retryCount}/${maxRetries})`);
    } else {
      // Final failure
      await db.update(aiTasks).set({
        status: "failed",
        retryCount,
        errorMessage: message.slice(0, 500),
        completedAt: new Date().toISOString(),
        workerLockId: null,
        timeoutAt: null,
      }).where(eq(aiTasks.id, taskId));
    }
  }
}
