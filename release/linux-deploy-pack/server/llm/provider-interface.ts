/**
 * GRT Unified LLM Provider Interface
 *
 * Defines the standard contract for all LLM provider implementations.
 * Wraps existing server/_core/llm.ts and server/ai-adapter/AIServiceFactory.ts
 * with a clean, unified abstraction layer.
 */

// ── Configuration ───────────────────────────────────────────

export interface LLMProviderConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
}

// ── Messages ────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

// ── Response ────────────────────────────────────────────────

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage?: LLMUsage;
  duration_ms: number;
  request_id: string;
}

// ── Health Check ────────────────────────────────────────────

export interface HealthCheckResult {
  ok: boolean;
  latency_ms: number;
  model: string;
  error?: string;
}

// ── Provider Contract ───────────────────────────────────────

export interface LLMProvider {
  /** Human-readable provider name (e.g. "openai", "ollama") */
  readonly name: string;

  /**
   * Send a chat completion request.
   * @param messages - Conversation messages
   * @param options  - Per-call overrides (model, temperature, etc.)
   */
  chat(
    messages: ChatMessage[],
    options?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse>;

  /**
   * Verify provider connectivity and model availability.
   * Returns structured result with latency measurement.
   */
  healthCheck(): Promise<HealthCheckResult>;
}
