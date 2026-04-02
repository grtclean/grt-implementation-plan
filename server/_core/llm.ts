import { ENV, env } from "./env";
import { providerRegistry } from "../llm";
import { logModelCall, logModelCallError } from "../llm/model-call-logger";
import { createChildLogger } from "../lib/logger";

const llmLog = createChildLogger("llm-core");

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages?: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  outputSchema?: JsonSchema;
  output_schema?: JsonSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /** Convenience: system prompt (prepended as system message) */
  system?: string;
  /** Convenience: user prompt (appended as user message) */
  prompt?: string;
  /** Convenience: output JSON schema */
  schema?: Record<string, unknown>;
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type ResponseFormat =
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" };

export type InvokeResult = {
  id?: string;
  /** Shortcut: parsed content from first choice */
  content?: string | null;
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: {
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const normalizeMessage = (
  msg: Message
): { role: string; content: string | object[] } => {
  if (typeof msg.content === "string") {
    return { role: msg.role, content: msg.content };
  }
  if (Array.isArray(msg.content)) {
    return { role: msg.role, content: msg.content as object[] };
  }
  return { role: msg.role, content: [msg.content] as object[] };
};

const normalizeToolChoice = (
  choice: ToolChoice | undefined,
  tools: Tool[] | undefined
):
  | string
  | { type: "function"; function: { name: string } }
  | undefined => {
  if (!choice) return undefined;
  if (typeof choice === "string") return choice;

  if ("type" in choice && choice.type === "function") {
    return choice as ToolChoiceExplicit;
  }

  if ("name" in choice) {
    return { type: "function", function: { name: choice.name } };
  }

  return undefined;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: JsonSchema;
  output_schema?: JsonSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

/**
 * Resolve the LLM API URL based on configuration.
 * Priority: BUILT_IN_FORGE_API_URL > LLM_API_URL > provider-specific defaults
 */
const resolveApiUrl = (): string => {
  // Explicit URL takes highest priority
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    return `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }

  // Provider-based resolution
  const provider = env.AI_PROVIDER?.toLowerCase() || "openai";

  switch (provider) {
    case "ollama":
      // Ollama's OpenAI-compatible endpoint
      return `${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`;
    case "deepseek":
      return "https://api.deepseek.com/v1/chat/completions";
    case "openai":
    default:
      return `${env.OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  }
};

/**
 * Resolve the model name based on provider configuration.
 */
const resolveModel = (): string => {
  const provider = env.AI_PROVIDER?.toLowerCase() || "openai";
  switch (provider) {
    case "ollama":
      return env.OLLAMA_MODEL || "llama3.1";
    case "deepseek":
      return "deepseek-chat";
    case "openai":
    default:
      return env.OPENAI_MODEL || "gpt-4o";
  }
};

const assertApiKey = () => {
  const provider = env.AI_PROVIDER?.toLowerCase() || "openai";
  // Ollama doesn't need an API key
  if (provider === "ollama") return;
  
  if (!ENV.forgeApiKey) {
    throw new Error(
      `LLM API key is not configured. Set OPENAI_API_KEY or LLM_API_KEY in .env ` +
      `(current provider: ${provider})`
    );
  }
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    system,
    prompt,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const provider = env.AI_PROVIDER?.toLowerCase() || "openai";
  const requestId = `llm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  // Build messages array: support both explicit messages and system/prompt shorthand
  const resolvedMessages: Message[] = messages ? [...messages] : [];
  if (system) resolvedMessages.unshift({ role: "system", content: system });
  if (prompt) resolvedMessages.push({ role: "user", content: prompt });

  const payload: Record<string, unknown> = {
    model: resolveModel(),
    messages: resolvedMessages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;

  // Only add thinking config for models that support it (skip for Ollama/standard OpenAI)
  if (provider !== "ollama" && provider !== "openai") {
    payload.thinking = {
      budget_tokens: 128,
    };
  }

  // Support schema shorthand from ime.service.ts callers
  const resolvedSchema = params.schema
    ? { name: "response", schema: params.schema, strict: true }
    : undefined;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema: outputSchema || resolvedSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const apiUrl = resolveApiUrl();
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  // Add authorization header (Ollama doesn't need one)
  if (provider !== "ollama" && ENV.forgeApiKey) {
    headers.authorization = `Bearer ${ENV.forgeApiKey}`;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const duration = Date.now() - startTime;
    logModelCallError(provider, resolveModel(), requestId, duration, new Error(`${response.status} ${response.statusText} – ${errorText}`));
    throw new Error(
      `LLM invoke failed (${provider}): ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const result = (await response.json()) as InvokeResult;
  const duration = Date.now() - startTime;

  // Populate content shortcut from first choice
  if (!result.content && result.choices?.[0]?.message?.content) {
    result.content = result.choices[0].message.content;
  }

  // Structured logging via model-call-logger
  logModelCall({
    content: result.content ?? "",
    model: resolveModel(),
    provider,
    usage: result.usage,
    duration_ms: duration,
    request_id: requestId,
  });

  return result;
}

/**
 * Run health checks on all registered LLM providers.
 * Used by /api/health and deploy/healthcheck.sh
 */
export async function healthCheckAllProviders() {
  return providerRegistry.healthCheckAll();
}

/**
 * List all available LLM providers.
 */
export function listAvailableProviders() {
  return providerRegistry.listProviders().map(p => p.name);
}

// ── Multi-Provider Wrapper ──────────────────────────────────

export type LLMProvider = "gemini" | "claude" | "openai";

export interface MultiProviderParams {
  provider: LLMProvider;
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface MultiProviderResult {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
  provider: LLMProvider;
}

export async function invokeLLMWithProvider(params: MultiProviderParams): Promise<MultiProviderResult> {
  const { provider, system, prompt, maxTokens = 16384 } = params;

  if (provider === "claude") {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const model = env.ANTHROPIC_MODEL;
    const url = `${env.ANTHROPIC_BASE_URL.replace(/\/$/, "")}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error: ${res.status} ${errText}`);
    }
    const data = await res.json() as any;
    const text = data.content?.map((b: any) => b.text).join("") ?? "";
    return {
      content: text,
      usage: data.usage ? { prompt_tokens: data.usage.input_tokens, completion_tokens: data.usage.output_tokens, total_tokens: data.usage.input_tokens + data.usage.output_tokens } : undefined,
      model,
      provider,
    };
  }

  if (provider === "gemini") {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    const model = env.GEMINI_MODEL;
    const url = `${env.GEMINI_BASE_URL.replace(/\/$/, "")}/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${errText}`);
    }
    const data = await res.json() as any;
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      usage: data.usage,
      model,
      provider,
    };
  }

  // openai — delegate to existing invokeLLM
  const result = await invokeLLM({ system, prompt });
  return {
    content: result.content ?? "",
    usage: result.usage,
    model: resolveModel(),
    provider,
  };
}
