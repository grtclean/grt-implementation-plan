export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // LLM API - supports OpenAI-compatible endpoints (OpenAI, Ollama, etc.)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? process.env.LLM_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
};

// Extended environment variables for external integrations
export const env = {
  ...ENV,
  // AI Provider Configuration
  AI_PROVIDER: process.env.AI_PROVIDER ?? "openai", // openai | ollama | deepseek
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o",
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? "llama3.1",
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? "",
  APP_REGION: process.env.APP_REGION ?? "US",
  // Microsoft Graph API
  MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID ?? "",
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID ?? "",
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET ?? "",
  // Gemini API
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  // Jiandaoyun API
  JIANDAOYUN_API_KEY: process.env.JIANDAOYUN_API_KEY ?? "",
  JIANDAOYUN_CORP_ID: process.env.JIANDAOYUN_CORP_ID ?? "",
};
