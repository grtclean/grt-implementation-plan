/**
 * AI Open Claw — External Tool Execution Worker
 *
 * Executes registered external HTTP requests in the background.
 * All requests are server-side only — no URL/endpoint is ever
 * exposed to the frontend.
 *
 * Flow: mark processing → build request → fetch with retry →
 *       sanitize → store in knowledge_documents → mark completed
 */

import { requireDb } from "../db";
import { aiTasks } from "../../drizzle/schema";
import type { AiToolRegistry } from "../../drizzle/ai-claw-schema";
import { eq } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { sanitizeExternalResponse, storeExternalResult } from "../services/ai-claw.service";

const log = createChildLogger("claw-worker");

// ── Retry-aware HTTP fetch ─────────────────────────────────────

interface FetchOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  maxRetries: number;
}

async function fetchWithRetry(opts: FetchOptions): Promise<{ status: number; data: unknown }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

      const response = await fetch(opts.url, {
        method: opts.method,
        headers: opts.headers,
        body: opts.method !== "GET" ? opts.body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting with backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") || "5", 10);
        const backoff = Math.min(retryAfter * 1000, 30000);
        log.warn({ attempt, backoff, url: opts.url }, "Rate limited, backing off");
        await sleep(backoff);
        continue;
      }

      // Parse response
      const contentType = response.headers.get("content-type") || "";
      let data: unknown;
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return { status: response.status, data };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < opts.maxRetries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 15000);
        log.warn({ attempt, backoff, err: lastError.message }, "Fetch failed, retrying");
        await sleep(backoff);
      }
    }
  }

  throw lastError ?? new Error("fetchWithRetry exhausted all retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── URL template interpolation ─────────────────────────────────

function interpolateUrl(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const val = params[key];
    return val !== undefined ? encodeURIComponent(String(val)) : "";
  });
}

// ── Main worker entry point ────────────────────────────────────

export async function triggerClawWorker(
  taskId: number,
  toolConfig: AiToolRegistry,
  inputParams: Record<string, unknown>,
  userId: number,
): Promise<void> {
  const db = await requireDb();
  const lockId = `claw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    log.info({ taskId, toolCode: toolConfig.toolCode }, "Claw worker starting");

    // 1. Mark task as processing
    await db.update(aiTasks).set({
      status: "processing",
      workerLockId: lockId,
      startedAt: new Date().toISOString(),
    }).where(eq(aiTasks.id, taskId));

    // 2. Build HTTP request
    const url = interpolateUrl(toolConfig.endpointUrl, inputParams);
    const headers: Record<string, string> = {
      "User-Agent": "GRT-OpenClaw/1.0",
      ...(toolConfig.defaultHeaders ?? {}),
    };

    let body: string | undefined;
    if (toolConfig.httpMethod !== "GET") {
      const mergedParams = { ...(toolConfig.defaultParams ?? {}), ...inputParams };
      body = JSON.stringify(mergedParams);
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    // 3. Execute HTTP request with retry
    const result = await fetchWithRetry({
      url,
      method: toolConfig.httpMethod,
      headers,
      body,
      timeoutMs: toolConfig.timeoutMs ?? 30000,
      maxRetries: toolConfig.maxRetries ?? 3,
    });

    // 4. Sanitize external response
    const sanitized = sanitizeExternalResponse(result.data);
    const wrappedData = {
      data: sanitized,
      source: "EXTERNAL" as const,
      trust_level: "CROWDSOURCED" as const,
      fetchedAt: new Date().toISOString(),
      httpStatus: result.status,
    };

    // 5. Store in knowledge_documents (quarantined)
    const knowledgeDocId = await storeExternalResult({
      toolCode: toolConfig.toolCode,
      responseData: wrappedData,
      userId,
      taskId,
    });

    // 6. Mark task as completed
    await db.update(aiTasks).set({
      status: "completed",
      completedAt: new Date().toISOString(),
      resultData: {
        knowledgeDocId,
        httpStatus: result.status,
        toolCode: toolConfig.toolCode,
      },
    }).where(eq(aiTasks.id, taskId));

    log.info({ taskId, knowledgeDocId, httpStatus: result.status }, "Claw worker completed");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ err, taskId, toolCode: toolConfig.toolCode }, "Claw worker failed");

    // Mark task as failed, increment retry count
    try {
      await db.update(aiTasks).set({
        status: "failed",
        errorMessage: errorMsg.slice(0, 500),
        completedAt: new Date().toISOString(),
      }).where(eq(aiTasks.id, taskId));
    } catch (updateErr) {
      log.error({ err: updateErr, taskId }, "Failed to update task status after error");
    }
  }
}
