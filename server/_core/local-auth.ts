/**
 * Local Authentication Routes
 * Replaces Manus OAuth with username/password login for standalone deployment.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sanitizeName } from "@shared/sanitize";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("auth");

async function getDbAndSchema() {
  const dbModule = await import("../db");
  const schema = await import("../../drizzle/schema");
  return { db: await dbModule.requireDb(), users: schema.users };
}

function getJwtSecret() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET is not set. Set JWT_SECRET env var (≥32 chars).");
    }
    const devFallback = `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    log.warn("JWT_SECRET not set — using random ephemeral key (tokens won't survive restarts). Set JWT_SECRET in .env");
    return new TextEncoder().encode(devFallback);
  }
  return new TextEncoder().encode(secret);
}

async function signToken(payload: { openId: string; name: string }): Promise<string> {
  const secret = getJwtSecret();
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({
    openId: payload.openId,
    appId: "local",
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export async function verifyToken(token: string | undefined | null) {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const { openId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || typeof name !== "string") return null;
    return { openId, name };
  } catch {
    return null;
  }
}

export function registerLocalAuthRoutes(app: Express) {
  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, name, email } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "用户名和密码为必填项" });
        return;
      }
      if (username.length < 3) {
        res.status(400).json({ error: "用户名至少需要3个字符" });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "密码至少需要6个字符" });
        return;
      }

      const { db, users } = await getDbAndSchema();

      const existing = await db.select().from(users).where(eq(users.openId, username)).limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: "该用户名已被注册" });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const allUsers = await db.select({ id: users.id }).from(users).limit(1);
      const isFirstUser = allUsers.length === 0;

      const cleanName = sanitizeName(name) || username;
      await db.insert(users).values({
        openId: username,
        name: cleanName,
        email: email || null,
        loginMethod: `local:${hash}`,
        role: isFirstUser ? "admin" : "user",
        lastSignedIn: new Date().toISOString(),
      });

      const token = await signToken({ openId: username, name: cleanName });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        message: isFirstUser
          ? "注册成功！您是第一个用户，已自动设为管理员。"
          : "注册成功！",
      });
    } catch (error: any) {
      log.error({ err: error }, "Register failed");
      res.status(500).json({ error: "注册失败，请稍后重试" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "用户名和密码为必填项" });
        return;
      }

      const { db, users } = await getDbAndSchema();
      const result = await db.select().from(users).where(eq(users.openId, username)).limit(1);

      if (result.length === 0) {
        res.status(401).json({ error: "用户名或密码错误" });
        return;
      }

      const user = result[0];

      if (!user.loginMethod || !user.loginMethod.startsWith("local:")) {
        res.status(401).json({ error: "此账户未设置本地密码" });
        return;
      }

      const storedHash = user.loginMethod.substring(6);
      const isValid = await bcrypt.compare(password, storedHash);

      if (!isValid) {
        res.status(401).json({ error: "用户名或密码错误" });
        return;
      }

      await db.update(users).set({ lastSignedIn: new Date().toISOString() }).where(eq(users.openId, username));

      const token = await signToken({ openId: username, name: sanitizeName(user.name) || username });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true });
    } catch (error: any) {
      log.error({ err: error }, "Login failed");
      res.status(500).json({ error: "登录失败，请稍后重试" });
    }
  });

  // Kiosk login — no password, creates/finds a generic kiosk session
  app.post("/api/auth/kiosk-login", async (req: Request, res: Response) => {
    try {
      const { stationId, departmentCode } = req.body;
      if (!stationId) {
        res.status(400).json({ error: "stationId is required" });
        return;
      }

      const kioskUsername = `kiosk-${departmentCode || "workshop"}-${stationId}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
      const { db, users } = await getDbAndSchema();

      // Find or create the kiosk user
      let existing = await db.select().from(users).where(eq(users.openId, kioskUsername)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({
          openId: kioskUsername,
          name: `Kiosk ${stationId}`,
          loginMethod: "kiosk",
          role: "user",
          lastSignedIn: new Date().toISOString(),
        });
        existing = await db.select().from(users).where(eq(users.openId, kioskUsername)).limit(1);
      } else {
        await db.update(users).set({ lastSignedIn: new Date().toISOString() }).where(eq(users.openId, kioskUsername));
      }

      const token = await signToken({ openId: kioskUsername, name: `Kiosk ${stationId}` });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 }); // 24h

      res.json({ success: true, stationId, kioskUser: kioskUsername });
    } catch (error) {
      log.error({ err: error }, "Kiosk login failed");
      res.status(500).json({ error: "Kiosk login failed" });
    }
  });

  // Reset all users — clears the users table so the next registration becomes admin
  app.post("/api/auth/reset-all-users", async (req: Request, res: Response) => {
    try {
      const { db, users } = await getDbAndSchema();

      const allUsers = await db.select({ id: users.id }).from(users);
      const count = allUsers.length;

      // Use TRUNCATE CASCADE to handle foreign key references from other tables
      await db.execute(sql`TRUNCATE TABLE users CASCADE`);

      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, cookieOptions);

      res.json({
        success: true,
        message: `已清除 ${count} 个用户。下一个注册的用户将自动成为管理员。`,
        deletedCount: count,
      });
    } catch (error: any) {
      log.error({ err: error }, "Reset users failed");
      res.status(500).json({ error: "重置用户失败，请稍后重试" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });

  // Get current user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const cookieHeader = req.headers.cookie;
      let token: string | null = null;

      if (cookieHeader) {
        const { parse } = await import("cookie");
        const cookies = parse(cookieHeader);
        token = cookies[COOKIE_NAME] || null;
      }

      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      const session = await verifyToken(token);
      if (!session) {
        res.json(null);
        return;
      }

      const { db, users } = await getDbAndSchema();
      const result = await db.select().from(users).where(eq(users.openId, session.openId)).limit(1);

      if (result.length === 0) {
        res.json(null);
        return;
      }

      const user = result[0];
      res.json({
        id: user.id,
        openId: user.openId,
        name: sanitizeName(user.name) || user.openId,
        email: user.email,
        role: user.role,
        languagePreference: user.languagePreference,
        lastSignedIn: user.lastSignedIn,
      });
    } catch (error) {
      log.error({ err: error }, "Get current user failed");
      res.json(null);
    }
  });
}
