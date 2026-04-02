/**
 * GRT LLM Call Logger
 *
 * Structured logging for every LLM invocation.
 * Uses the project's pino-based logger via createChildLogger.
 */

import { createChildLogger } from "../lib/logger";
import type { LLMResponse, LLMUsage } from "./provider-interface";

const log = createChildLogger("llm");

export interface ModelCallLogEntry {
  request_id: string;
  provider: string;
  model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  duration_ms: number;
  success: boolean;
  error?: string;
}

/**
 * Log a successful LLM call.
 */
export function logModelCall(response: LLMResponse): void {
  const entry: ModelCallLogEntry = {
    request_id: response.request_id,
    provider: response.provider,
    model: response.model,
    prompt_tokens: response.usage?.prompt_tokens,
    completion_tokens: response.usage?.completion_tokens,
    total_tokens: response.usage?.total_tokens,
    duration_ms: response.duration_ms,
    success: true,
  };
  log.info(entry, "LLM call completed");
}

/**
 * Log a failed LLM call.
 */
export function logModelCallError(
  provider: string,
  model: string,
  request_id: string,
  duration_ms: number,
  error: unknown,
): void {
  const entry: ModelCallLogEntry = {
    request_id,
    provider,
    model,
    duration_ms,
    success: false,
    error: error instanceof Error ? error.message : String(error),
  };
  log.error(entry, "LLM call failed");
}
