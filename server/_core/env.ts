import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("env");

/**
 * GRT Environment Loader — 3-Tier Isolation
 *
 * Loading priority:
 *   1. OS-level environment variables (highest — vault-injected in prod)
 *   2. .env.{NODE_ENV}  (environment-specific)
 *   3. .env             (local fallback)
 *
 * Defaults to "development" when NODE_ENV is unset to protect production.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");

const nodeEnv = process.env.NODE_ENV || "development";

// Load env-specific file, then generic .env (dotenv won't overwrite existing vars)
dotenv.config({ path: path.resolve(rootDir, `.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(rootDir, ".env") });

// Log which environment is active (once at startup)
log.info({ environment: nodeEnv.toUpperCase() }, "Active environment");
if (nodeEnv === "production") {
  log.info("PRODUCTION MODE — all safety guards active");
}

export const ENV = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  isDevelopment: nodeEnv === "development",
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
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
