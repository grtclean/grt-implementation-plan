/**
 * External Sync Worker — ai_tasks Queue-Driven Async Import
 *
 * Wraps ExtSyncFullImportService to comply with GRT "Development First Law":
 * heavy migration tasks MUST run through ai_tasks queue, never block main thread.
 *
 * Pattern: matches knowledgeWorker.ts — receives taskId, marks processing,
 * delegates to existing import pipeline, bridges progress to ai_tasks.resultData.
 */
import { requireDb } from "../db";
import { aiTasks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getExtSyncFullImportService, type ImportConfig, type ImportProgress } from "../services/ext-sync-full-import.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ext-sync-worker");

const PROGRESS_POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 3600; // 3h max at 3s intervals

/**
 * Main worker entry — fire-and-forget from router.
 * Bridges JdyFullImportService progress → ai_tasks.resultData for frontend polling.
 */
export async function triggerExternalSyncWorker(
  taskId: number,
  config: ImportConfig
): Promise<void> {
  const db = await requireDb();

  try {
    log.info({ taskId, phases: config.phases }, "External sync worker starting");

    // 1. Mark ai_task as processing
    await db.update(aiTasks)
      .set({
        status: "processing",
        startedAt: new Date().toISOString(),
      })
      .where(eq(aiTasks.id, taskId));

    // 2. Delegate to existing full import service
    const importService = getExtSyncFullImportService();
    const runCode = await importService.startImport(config);

    // 3. Poll import progress and bridge to ai_tasks.resultData
    let pollCount = 0;
    let finalProgress: ImportProgress | null = null;

    while (pollCount < MAX_POLL_ATTEMPTS) {
      await sleep(PROGRESS_POLL_INTERVAL_MS);
      pollCount++;

      const progress = await importService.getProgress(runCode);
      if (!progress) {
        log.warn({ taskId, runCode }, "Import progress not found");
        break;
      }

      // Update ai_tasks with latest progress
      await db.update(aiTasks)
        .set({
          resultData: {
            runCode,
            status: progress.status,
            currentPhase: progress.currentPhase,
            currentStep: progress.currentStep,
            progressPercent: progress.progressPercent,
            totalCreated: progress.totalCreated,
            totalUpdated: progress.totalUpdated,
            totalSkipped: progress.totalSkipped,
            totalFailed: progress.totalFailed,
            errorCount: progress.errors.length,
          } as Record<string, unknown>,
        })
        .where(eq(aiTasks.id, taskId));

      // Terminal states — break
      if (progress.status === "completed" || progress.status === "failed" || progress.status === "cancelled") {
        finalProgress = progress;
        break;
      }
    }

    // 4. Mark ai_task as completed/failed
    if (!finalProgress) {
      // Timed out waiting for import
      await db.update(aiTasks)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: "Worker timed out waiting for import completion",
        })
        .where(eq(aiTasks.id, taskId));
      log.error({ taskId, runCode, pollCount }, "Worker timed out");
      return;
    }

    const isSuccess = finalProgress.status === "completed";
    await db.update(aiTasks)
      .set({
        status: isSuccess ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        errorMessage: isSuccess ? null : `Import ${finalProgress.status}: ${finalProgress.errors.map(e => e.message).join("; ").substring(0, 490)}`,
        resultData: {
          runCode,
          status: finalProgress.status,
          progressPercent: finalProgress.progressPercent,
          totalCreated: finalProgress.totalCreated,
          totalUpdated: finalProgress.totalUpdated,
          totalSkipped: finalProgress.totalSkipped,
          totalFailed: finalProgress.totalFailed,
          phaseResults: finalProgress.phaseResults,
          errors: finalProgress.errors.slice(0, 50), // Cap at 50 errors
        } as Record<string, unknown>,
      })
      .where(eq(aiTasks.id, taskId));

    log.info({
      taskId,
      runCode,
      status: finalProgress.status,
      created: finalProgress.totalCreated,
      updated: finalProgress.totalUpdated,
      failed: finalProgress.totalFailed,
    }, "External sync worker finished");

  } catch (err) {
    log.error({ err, taskId }, "External sync worker fatal error");

    await db.update(aiTasks)
      .set({
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message.substring(0, 490) : "Unknown error",
      })
      .where(eq(aiTasks.id, taskId));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
