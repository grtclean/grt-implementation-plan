/**
 * GRT LLM Provider Registry
 *
 * Singleton registry that maps provider names to LLMProvider implementations.
 * Auto-registers providers based on environment variables on first access.
 */

import { env } from "../_core/env";
import { createChildLogger } from "../lib/logger";
import type { HealthCheckResult, LLMProvider } from "./provider-interface";
import { OpenAIProvider } from "./providers/openai";
import { OllamaProvider } from "./providers/ollama";
import { GeminiProvider } from "./providers/gemini";
import { DeepSeekProvider } from "./providers/deepseek";

const log = createChildLogger("llm-registry");

class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();
  private initialized = false;

  /**
   * Register a provider implementation.
   */
  register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
    log.info({ provider: provider.name }, "LLM provider registered");
  }

  /**
   * Get a provider by name. Falls back to the AI_PROVIDER env default.
   * Auto-initializes on first call.
   */
  getProvider(name?: string): LLMProvider {
    this.ensureInitialized();

    const resolvedName = (name ?? env.AI_PROVIDER ?? "openai").toLowerCase();
    const provider = this.providers.get(resolvedName);

    if (!provider) {
      const available = Array.from(this.providers.keys()).join(", ");
      throw new Error(
        `LLM provider "${resolvedName}" not found. Available: [${available}]`,
      );
    }

    return provider;
  }

  /**
   * List all registered providers with their names.
   */
  listProviders(): { name: string; provider: LLMProvider }[] {
    this.ensureInitialized();
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      provider,
    }));
  }

  /**
   * Run health checks on all registered providers in parallel.
   */
  async healthCheckAll(): Promise<
    { name: string; result: HealthCheckResult }[]
  > {
    this.ensureInitialized();

    const entries = Array.from(this.providers.entries());

    const results = await Promise.allSettled(
      entries.map(async ([name, provider]) => {
        const result = await provider.healthCheck();
        return { name, result };
      }),
    );

    return results.map((settled, i) => {
      if (settled.status === "fulfilled") {
        return settled.value;
      }
      return {
        name: entries[i][0],
        result: {
          ok: false,
          latency_ms: 0,
          model: "unknown",
          error: settled.reason instanceof Error
            ? settled.reason.message
            : String(settled.reason),
        },
      };
    });
  }

  /**
   * Auto-register providers from environment on first access.
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Register all providers — each one reads its own env vars at call time
    this.register(new OpenAIProvider());
    this.register(new OllamaProvider());
    this.register(new GeminiProvider());
    this.register(new DeepSeekProvider());

    log.info(
      { default: env.AI_PROVIDER, count: this.providers.size },
      "LLM provider registry initialized",
    );
  }
}

/** Singleton registry instance */
export const providerRegistry = new ProviderRegistry();
