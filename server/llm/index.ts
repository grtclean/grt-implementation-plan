/**
 * GRT Unified LLM Layer — Barrel Export
 *
 * Usage:
 *   import { providerRegistry, type ChatMessage, type LLMResponse } from "../llm";
 *
 *   const provider = providerRegistry.getProvider(); // uses AI_PROVIDER env
 *   const response = await provider.chat([{ role: "user", content: "Hello" }]);
 */

export type {
  LLMProvider,
  LLMProviderConfig,
  ChatMessage,
  LLMResponse,
  LLMUsage,
  HealthCheckResult,
} from "./provider-interface";

export { providerRegistry } from "./provider-registry";

export { logModelCall, logModelCallError } from "./model-call-logger";
