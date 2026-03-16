/**
 * Database connection setup — getDb, requireDb, db proxy
 * Auto-decomposed from server/db.ts
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { ENV } from '../_core/env';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("db");

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    const connUrl = process.env.DATABASE_URL;
    // Safety: prevent dev/test from accidentally connecting to production
    if (!ENV.isProduction && connUrl.includes("grt_prod_db")) {
      log.error({ nodeEnv: ENV.nodeEnv }, "SAFETY HALT: DATABASE_URL points to production. Refusing to connect");
      return null;
    }
    try {
      const pool = new pg.Pool({
        connectionString: connUrl,
        // Ensure UTF-8 on Windows where system code page may be GBK/CP936
        options: '-c client_encoding=UTF8',
      });
      _db = drizzle(pool);
      log.info({ nodeEnv: ENV.nodeEnv }, "PostgreSQL connected");
    } catch (error) {
      log.warn({ err: error }, "Failed to connect to database");
      _db = null;
    }
  }
  return _db;
}

// 辅助函数：获取数据库连接，如果不可用则抛出错误
export async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }
  return db;
}

// Synchronous db proxy — eagerly initializes on first property access.
// Allows routers to `import { db } from "../db"` and use `db.select()` directly
// without awaiting requireDb() in every procedure.
export const db: ReturnType<typeof drizzle> = new Proxy({} as any, {
  get(_target, prop) {
    if (!_db) {
      // Trigger lazy init synchronously — pool connects on first query, not on creation
      if (process.env.DATABASE_URL) {
        const pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          options: '-c client_encoding=UTF8',
        });
        _db = drizzle(pool);
      } else {
        throw new Error("Database not configured: DATABASE_URL is not set");
      }
    }
    return (_db as any)[prop];
  },
});
