/**
 * Local Authentication Routes
 * Replaces Manus OAuth with username/password login for standalone deployment.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

async function getDbAndSchema() {
  const dbModule = await import("../db");
  const schema = await import("../../drizzle/schema");
  return { db: await dbModule.requireDb(), users: schema.users };
}

function getJwtSecret() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET || "grt-local-default-secret-change-me";
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
        res.status(400).json({ error: "Username and password are required" });
        return;
      }
      if (username.length < 3) {
        res.status(400).json({ error: "Username must be at least 3 characters" });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      const { db, users } = await getDbAndSchema();

      const existing = await db.select().from(users).where(eq(users.openId, username)).limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const allUsers = await db.select({ id: users.id }).from(users).limit(1);
      const isFirstUser = allUsers.length === 0;

      await db.insert(users).values({
        openId: username,
        name: name || username,
        email: email || null,
        loginMethod: `local:${hash}`,
        role: isFirstUser ? "admin" : "user",
        lastSignedIn: new Date().toISOString(),
      });

      const token = await signToken({ openId: username, name: name || username });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[LocalAuth] User registered: ${username} (role: ${isFirstUser ? "admin" : "user"})`);
      res.json({
        success: true,
        message: isFirstUser
          ? "Registration successful! You are the first user and have been set as admin."
          : "Registration successful!",
      });
    } catch (error) {
      console.error("[LocalAuth] Register error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }

      const { db, users } = await getDbAndSchema();
      const result = await db.select().from(users).where(eq(users.openId, username)).limit(1);

      if (result.length === 0) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      const user = result[0];

      if (!user.loginMethod || !user.loginMethod.startsWith("local:")) {
        res.status(401).json({ error: "This account does not have a local password" });
        return;
      }

      const storedHash = user.loginMethod.substring(6);
      const isValid = await bcrypt.compare(password, storedHash);

      if (!isValid) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      await db.update(users).set({ lastSignedIn: new Date().toISOString() }).where(eq(users.openId, username));

      const token = await signToken({ openId: username, name: user.name || username });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[LocalAuth] User logged in: ${username}`);
      res.json({ success: true });
    } catch (error) {
      console.error("[LocalAuth] Login error:", error);
      res.status(500).json({ error: "Login failed" });
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
        name: user.name,
        email: user.email,
        role: user.role,
        languagePreference: user.languagePreference,
        lastSignedIn: user.lastSignedIn,
      });
    } catch (error) {
      console.error("[LocalAuth] Get me error:", error);
      res.json(null);
    }
  });
}
