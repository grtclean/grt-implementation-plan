/**
 * GRT Unified LLM Provider — Gemini
 *
 * Uses Google's Gemini generateContent API (native format, not OpenAI-compatible).
 * Reads GEMINI_API_KEY, GEMINI_MODEL from env.
 * Converts ChatMessage[] to Gemini's parts/contents format.
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

/** Map unified roles to Gemini roles */
function toGeminiRole(role: ChatMessage["role"]): string {
  switch (role) {
    case "assistant":
      return "model";
    case "system":
    case "user":
    case "tool":
    default:
      return "user";
  }
}

/** Convert ChatMessage[] to Gemini contents format, merging system into first user turn */
function toGeminiContents(
  messages: ChatMessage[],
): { role: string; parts: { text: string }[] }[] {
  const contents: { role: string; parts: { text: string }[] }[] = [];
  let systemPrefix = "";

  for (const msg of messages) {
    if (msg.role === "system") {
      // Gemini has no system role — prepend to next user message
      systemPrefix += msg.content + "\n\n";
      continue;
    }

    const text = systemPrefix ? systemPrefix + msg.content : msg.content;
    systemPrefix = "";
    contents.push({
      role: toGeminiRole(msg.role),
      parts: [{ text }],
    });
  }

  // If only system messages were provided, add as a user turn
  if (contents.length === 0 && systemPrefix) {
    contents.push({ role: "user", parts: [{ text: systemPrefix.trim() }] });
  }

  return contents;
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  private get apiKey(): string {
    return env.GEMINI_API_KEY;
  }
  private get defaultModel(): string {
    return env.GEMINI_MODEL || "gemini-2.0-flash";
  }
  private get baseUrl(): string {
    return "https://generativelanguage.googleapis.com/v1beta";
  }

  async chat(
    messages: ChatMessage[],
    options?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel;
    const apiKey = options?.apiKey ?? this.apiKey;
    const requestId = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const start = Date.now();

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    const contents = toGeminiContents(messages);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined,
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 4096,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} — ${errText}`);
      }

      const data = (await response.json()) as Record<string, any>;
      const durationMs = Date.now() - start;

      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";

      const result: LLMResponse = {
        content: text,
        model,
        provider: this.name,
        usage: data.usageMetadata
          ? {
              prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
              completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
              total_tokens: data.usageMetadata.totalTokenCount ?? 0,
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
      // List available models to verify API key and connectivity
      const url = `${this.baseUrl}/models?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
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
