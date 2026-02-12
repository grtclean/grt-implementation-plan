import { ENV, env } from "./env";

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
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  outputSchema?: JsonSchema;
  output_schema?: JsonSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
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
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const provider = env.AI_PROVIDER?.toLowerCase() || "openai";

  const payload: Record<string, unknown> = {
    model: resolveModel(),
    messages: messages.map(normalizeMessage),
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

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
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
    throw new Error(
      `LLM invoke failed (${provider}): ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
