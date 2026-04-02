/**
 * GRT Unified LLM Provider — DeepSeek
 *
 * DeepSeek uses an OpenAI-compatible API, so this provider reuses the same
 * fetch-based chat completions protocol with DeepSeek-specific defaults.
 * Reads DEEPSEEK_API_KEY from env; baseUrl defaults to https://api.deepseek.com/v1.
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

export class DeepSeekProvider implements LLMProvider {
  readonly name = "deepseek";

  private get apiKey(): string {
    return env.DEEPSEEK_API_KEY;
  }
  private get baseUrl(): string {
    return "https://api.deepseek.com/v1";
  }
  private get defaultModel(): string {
    return "deepseek-chat";
  }

  async chat(
    messages: ChatMessage[],
    options?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel;
    const requestId = `deepseek-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const start = Date.now();

    const base = options?.baseUrl?.replace(/\/$/, "") ?? this.baseUrl;
    const url = `${base}/chat/completions`;
    const apiKey = options?.apiKey ?? this.apiKey;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined,
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          })),
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} — ${errText}`);
      }

      const data = (await response.json()) as Record<string, any>;
      const durationMs = Date.now() - start;

      const result: LLMResponse = {
        content: data.choices?.[0]?.message?.content ?? "",
        model,
        provider: this.name,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.prompt_tokens,
              completion_tokens: data.usage.completion_tokens,
              total_tokens: data.usage.total_tokens,
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
      // DeepSeek is OpenAI-compatible — send minimal chat to verify connectivity
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errText = await response.text();
        return { ok: false, latency_ms: latencyMs, model, error: `HTTP ${response.status}: ${errText}` };
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
