/**
 * GRT Unified LLM Provider — Ollama
 *
 * Local LLM inference via Ollama's OpenAI-compatible endpoint.
 * Reads OLLAMA_BASE_URL (default http://localhost:11434), OLLAMA_MODEL from env.
 * No API key required.
 */

import { env } from "../../_core/env";
import type {
  ChatMessage,
  HealthCheckResult,
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
} from "../provider-interface";
import { logModelCall, logModelCallError } from "../model-call-logger";

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  private get baseUrl(): string {
    return (env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
  }
  private get defaultModel(): string {
    return env.OLLAMA_MODEL || "llama3.1";
  }

  async chat(
    messages: ChatMessage[],
    options?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel;
    const requestId = `ollama-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const start = Date.now();
    const base = options?.baseUrl?.replace(/\/$/, "") ?? this.baseUrl;

    // Use Ollama's OpenAI-compatible endpoint
    const url = `${base}/v1/chat/completions`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined,
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} — ${errText}`);
      }

      const data = (await response.json()) as Record<string, any>;
      const durationMs = Date.now() - start;

      const result: LLMResponse = {
        content: data.choices?.[0]?.message?.content ?? "",
        model,
        provider: this.name,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.prompt_tokens ?? 0,
              completion_tokens: data.usage.completion_tokens ?? 0,
              total_tokens: data.usage.total_tokens ?? 0,
            }
          : undefined,
        duration_ms: durationMs,
        request_id: requestId,
      };

      logModelCall(result);
      return result;
    } catch (error) {
      logModelCallError(this.name, model, requestId, Date.now() - start, error);
      throw error;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const model = this.defaultModel;
    const start = Date.now();

    try {
      // Ollama exposes /api/tags to list available models
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return { ok: false, latency_ms: latencyMs, model, error: `HTTP ${response.status}` };
      }

      return { ok: true, latency_ms: latencyMs, model };
    } catch (error) {
      return {
        ok: false,
        latency_ms: Date.now() - start,
        model,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
