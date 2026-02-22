import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "path";

/**
 * Environment-aware Drizzle configuration.
 *
 * Loading priority:
 *   1. .env.{NODE_ENV}  (e.g. .env.production)
 *   2. .env             (local override)
 *   3. OS-level env vars
 *
 * Defaults to "development" when NODE_ENV is unset — this is a safety
 * measure to prevent accidental migrations against production.
 */
const nodeEnv = process.env.NODE_ENV || "development";
const envFile = `.env.${nodeEnv}`;

// Load environment-specific file first, then generic .env as fallback
dotenv.config({ path: path.resolve(import.meta.dirname, envFile) });
dotenv.config({ path: path.resolve(import.meta.dirname, ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    `DATABASE_URL is required.\n` +
    `  Current NODE_ENV: "${nodeEnv}"\n` +
    `  Looked for: ${envFile}, .env\n` +
    `  Hint: Copy .env.example to .env.${nodeEnv} and set DATABASE_URL`
  );
}

// Safety: warn loudly if about to touch production DB
if (nodeEnv !== "production" && connectionString.includes("grt_prod_db")) {
  throw new Error(
    "SAFETY HALT: DATABASE_URL points to production database but NODE_ENV is not 'production'.\n" +
    "Aborting to prevent accidental data corruption."
  );
}
if (nodeEnv === "production") {
  console.warn(
    "⚠ PRODUCTION MODE — Drizzle will operate against the production database."
  );
}

export default defineConfig({
  schema: "./drizzle/*schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
