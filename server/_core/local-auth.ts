/**
 * Local Authentication Routes
 * Replaces Manus OAuth with username/password login for standalone deployment.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { eq, and, sql } from "drizzle-orm";
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

let _cachedJwtSecret: Uint8Array | null = null;
function getJwtSecret() {
  if (_cachedJwtSecret) return _cachedJwtSecret;
  const secret = ENV.cookieSecret || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET is not set. Set JWT_SECRET env var (≥32 chars).");
    }
    const devFallback = `dev-fallback-grt-local-auth-secret-2026`;
    log.warn("JWT_SECRET not set — using fixed dev fallback key. Set JWT_SECRET in .env for production");
    _cachedJwtSecret = new TextEncoder().encode(devFallback);
    return _cachedJwtSecret;
  }
  _cachedJwtSecret = new TextEncoder().encode(secret);
  return _cachedJwtSecret;
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

// ── Auto-bootstrap admin user on startup ──────────────────────────────
// Creates admin/Admin123 if no users exist yet (first-time setup).
// Idempotent: does nothing if any user already exists.
const ADMIN_DEFAULT_PASSWORD = "Admin123";

async function bootstrapAdminUser() {
  try {
    const { db, users } = await getDbAndSchema();

    // Widen loginMethod column to fit "local:" + bcrypt hash (66+ chars)
    try {
      await db.execute(sql`ALTER TABLE "users" ALTER COLUMN "login_method" TYPE varchar(128)`);
    } catch { /* already wide enough or column doesn't exist yet */ }

    const existing = await db.select({ id: users.id }).from(users).limit(1);
    if (existing.length > 0) {
      // Ensure admin user exists and has valid password hash
      const adminUser = await db.select().from(users).where(eq(users.openId, "admin")).limit(1);
      if (adminUser.length > 0) {
        const lm = adminUser[0].loginMethod || "";
        // If loginMethod was truncated or missing, re-hash with default password
        if (!lm.startsWith("local:") || lm.length < 66) {
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, salt);
          await db.update(users).set({ loginMethod: `local:${hash}` }).where(eq(users.openId, "admin"));
          log.info("Bootstrap: admin password re-hashed (loginMethod was truncated)");
          return;
        }
        // Migrate from old password (Gerry123) to new password (Admin123)
        const storedHash = lm.substring(6); // strip "local:" prefix
        const isOldPassword = await bcrypt.compare("Gerry123", storedHash);
        if (isOldPassword) {
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, salt);
          await db.update(users).set({ loginMethod: `local:${hash}` }).where(eq(users.openId, "admin"));
          log.info("Bootstrap: admin password migrated from Gerry123 to Admin123");
        }
      }
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, salt);
    await db.insert(users).values({
      openId: "admin",
      name: "系统管理员",
      email: "admin@grt.com",
      loginMethod: `local:${hash}`,
      role: "admin",
      lastSignedIn: new Date().toISOString(),
    });
    log.info(`Bootstrap: admin user created (admin / ${ADMIN_DEFAULT_PASSWORD})`);
  } catch (err) {
    log.warn({ err }, "Bootstrap admin user skipped (DB may not be ready yet)");
  }
}

// ── Auto-ensure customer columns exist (migration 0060) ──────────────
// Idempotent: safe to run multiple times.
async function ensureCustomerColumns() {
  try {
    const { db } = await getDbAndSchema();
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(30)`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" varchar(200)`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_type" varchar(20) DEFAULT 'employee'`);
    log.info("Bootstrap: customer columns ensured (phone/company/user_type)");
  } catch (err) {
    log.warn({ err }, "ensureCustomerColumns skipped (DB may not be ready)");
  }
}

export function registerLocalAuthRoutes(app: Express) {
  // Auto-create admin user if DB is empty (non-blocking)
  bootstrapAdminUser();
  // Ensure customer registration columns exist (non-blocking)
  ensureCustomerColumns();

  // Register — DISABLED for employees (provisioned by IT)
  app.post("/api/auth/register", async (_req: Request, res: Response) => {
    res.status(403).json({
      error: "员工注册已关闭。请联系AI数智部获取账号。客户请使用 /api/auth/customer-register 注册。",
    });
  });

  // ── Customer Registration (phone-based, no password, auto-login) ──
  app.post("/api/auth/customer-register", async (req: Request, res: Response) => {
    const startMs = Date.now();
    try {
      const { phone, name, company } = req.body;

      // ── 必填校验 ──
      if (!phone || !company) {
        res.status(400).json({ error: "联系电话和公司名称为必填项" });
        return;
      }

      // ── 电话格式校验 (允许 +/数字/空格/-, 至少6位数字) ──
      const phoneTrimmed = phone.trim();
      const phoneDigits = phoneTrimmed.replace(/[\s\-\+\(\)]/g, "");
      if (!/^\d{6,15}$/.test(phoneDigits)) {
        res.status(400).json({ error: "联系电话格式不正确" });
        return;
      }

      const { db, users } = await getDbAndSchema();
      const phoneKey = `cust:${phoneDigits}`; // openId = "cust:" + pure digits
      const displayName = (name && name.trim()) || phoneTrimmed;
      const companyTrimmed = company.trim();

      // ── 手机号唯一校验 — 已注册则直接自动登录 ──
      const existing = await db.select().from(users).where(eq(users.openId, phoneKey)).limit(1);
      if (existing.length > 0) {
        // Already registered → auto-login (re-issue token)
        const user = existing[0];
        await db.update(users).set({ lastSignedIn: new Date().toISOString() }).where(eq(users.openId, phoneKey));
        const token = await signToken({ openId: phoneKey, name: sanitizeName(user.name) || phoneTrimmed });
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        log.info({ phone: phoneDigits, ms: Date.now() - startMs }, "Customer auto-login (already registered)");
        res.status(200).json({ success: true, message: "欢迎回来", autoLogin: true, user: { openId: phoneKey, name: sanitizeName(user.name) || phoneTrimmed, company: (user as any).company || companyTrimmed, userType: "customer" } });
        return;
      }

      // ── 创建用户 (include customer columns; fallback if columns missing) ──
      let newUser: any;
      try {
        [newUser] = await db.insert(users).values({
          openId: phoneKey,
          name: displayName,
          loginMethod: "customer-auto",
          role: "user",
          phone: phoneTrimmed,
          company: companyTrimmed,
          userType: "customer",
          lastSignedIn: new Date().toISOString(),
        }).returning();
      } catch {
        // Fallback: customer columns may not exist in older DB — insert base fields only
        [newUser] = await db.insert(users).values({
          openId: phoneKey,
          name: displayName,
          loginMethod: "customer-auto",
          role: "user",
          lastSignedIn: new Date().toISOString(),
        }).returning();
        // Try to add columns and update
        try {
          await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(30)`);
          await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" varchar(200)`);
          await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_type" varchar(20) DEFAULT 'employee'`);
          await db.execute(sql`UPDATE "users" SET "phone" = ${phoneTrimmed}, "company" = ${companyTrimmed}, "user_type" = 'customer' WHERE "id" = ${newUser.id}`);
        } catch {
          log.warn("Could not set customer fields (phone/company/user_type) — base user created");
        }
      }

      // ── 分配 customer RBAC 角色 ──
      try {
        const permSchema = await import("../../drizzle/permission-schema");
        const customerRole = await db.select({ id: permSchema.roles.id })
          .from(permSchema.roles)
          .where(eq(permSchema.roles.name, "customer"))
          .limit(1);

        if (customerRole.length > 0) {
          await db.insert(permSchema.userRoles).values({
            userId: phoneKey,
            roleId: customerRole[0].id,
            isActive: true,
          });
        }
      } catch {
        // RBAC tables may not exist — customer still created with user_type='customer'
      }

      // ── 自动创建社区成员 (论坛访问) ──
      try {
        const comSchema = await import("../../drizzle/schema");
        if (comSchema.communityMembers) {
          await db.insert(comSchema.communityMembers).values({
            externalId: phoneKey,
            platform: "other" as any,
            nickname: displayName,
            realName: displayName,
            phone: phoneTrimmed,
            company: companyTrimmed,
            customerId: newUser.id,
            role: "guest" as any,
            status: "active" as any,
            verificationStatus: "verified" as any,
          });
        }
      } catch {
        // community_members table may not exist — non-blocking
      }

      // ── 签发 JWT cookie → 自动登录 ──
      const token = await signToken({ openId: phoneKey, name: sanitizeName(displayName) || phoneTrimmed });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      log.info({ phone: phoneDigits, company: companyTrimmed, userId: newUser.id, ms: Date.now() - startMs }, "Customer registered + auto-login");
      res.status(201).json({
        success: true,
        message: "注册成功",
        autoLogin: true,
        user: { openId: phoneKey, name: displayName, company: companyTrimmed, userType: "customer" },
      });
    } catch (error: any) {
      log.error({ err: error }, "Customer registration failed");
      if (error?.code === "23505") {
        res.status(409).json({ error: "该手机号已注册，请稍后重试" });
        return;
      }
      res.status(500).json({ error: "注册失败，请稍后重试" });
    }
  });

  // ── Vendor/Supplier Registration (phone-based, no password, auto-login) ──
  app.post("/api/auth/vendor-register", async (req: Request, res: Response) => {
    try {
      const { phone, name, company, contactRole } = req.body;
      if (!phone || !company) {
        res.status(400).json({ error: "联系电话和公司名称为必填项 / Phone and company required" });
        return;
      }
      const phoneTrimmed = phone.trim();
      const phoneDigits = phoneTrimmed.replace(/[\s\-\+\(\)]/g, "");
      if (!/^\d{6,15}$/.test(phoneDigits)) {
        res.status(400).json({ error: "联系电话格式不正确 / Invalid phone format" });
        return;
      }

      const { db, users } = await getDbAndSchema();
      const phoneKey = `vendor:${phoneDigits}`;

      // Check if already registered → auto-login
      const existing = await db.select().from(users).where(eq(users.openId, phoneKey)).limit(1);
      if (existing.length > 0) {
        const user = existing[0];
        await db.update(users).set({ lastSignedIn: new Date().toISOString() }).where(eq(users.openId, phoneKey));
        const token = await signToken({ openId: phoneKey, name: sanitizeName(user.name) || phoneTrimmed });
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        log.info({ phone: phoneDigits }, "Vendor auto-login (already registered)");
        res.status(200).json({ success: true, message: "欢迎回来", autoLogin: true, user: { openId: phoneKey, name: sanitizeName(user.name) || phoneTrimmed, company: (user as any).company || company.trim(), userType: "supplier" } });
        return;
      }

      const displayName = (name && name.trim()) || phoneTrimmed;
      const companyTrimmed = company.trim();

      const [newUser] = await db.insert(users).values({
        openId: phoneKey,
        name: displayName,
        loginMethod: "vendor-auto",
        role: "user",
        lastSignedIn: new Date().toISOString(),
      }).returning();

      try {
        await db.execute(sql`UPDATE "users" SET "phone" = ${phoneTrimmed}, "company" = ${companyTrimmed}, "user_type" = 'supplier' WHERE "id" = ${newUser.id}`);
      } catch {
        try {
          await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(30)`);
          await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" varchar(200)`);
          await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_type" varchar(20) DEFAULT 'employee'`);
          await db.execute(sql`UPDATE "users" SET "phone" = ${phoneTrimmed}, "company" = ${companyTrimmed}, "user_type" = 'supplier' WHERE "id" = ${newUser.id}`);
        } catch {
          log.warn("Could not set vendor fields — base user created");
        }
      }

      const token = await signToken({ openId: phoneKey, name: sanitizeName(displayName) || phoneTrimmed });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      log.info({ phone: phoneDigits, company: companyTrimmed, userId: newUser.id }, "Vendor registered + auto-login");
      res.status(201).json({
        success: true, message: "注册成功",
        autoLogin: true,
        user: { openId: phoneKey, name: displayName, company: companyTrimmed, userType: "supplier" },
      });
    } catch (error: any) {
      log.error({ err: error }, "Vendor registration failed");
      if (error?.code === "23505") {
        res.status(409).json({ error: "该手机号已注册" });
        return;
      }
      res.status(500).json({ error: "注册失败，请稍后重试" });
    }
  });

  // Login (supports both employee ID and customer email)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "用户名和密码为必填项" });
        return;
      }

      const { db, users } = await getDbAndSchema();

      // Support login by employee ID (GRT112), pinyin username (xiewei), or email (xiewei@grt-group.com)
      let result = await db.select().from(users).where(eq(users.openId, username)).limit(1);

      // Fallback: try matching by email prefix (pinyin username → {pinyin}@grt-group.com)
      if (result.length === 0) {
        const emailGuess = username.includes("@") ? username : `${username.toLowerCase()}@grt-group.com`;
        result = await db.select().from(users).where(eq(users.email, emailGuess)).limit(1);
      }

      // Auto-bootstrap: if user "admin" not found and DB has no users at all,
      // create admin account on-the-fly so first login always works.
      if (result.length === 0 && username === "admin") {
        const allUsers = await db.select({ id: users.id }).from(users).limit(1);
        if (allUsers.length === 0) {
          log.info("Auto-creating admin user on first login attempt");
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(password, salt);
          await db.insert(users).values({
            openId: "admin",
            name: "系统管理员",
            email: "admin@grt.com",
            loginMethod: `local:${hash}`,
            role: "admin",
            lastSignedIn: new Date().toISOString(),
          });
          result = await db.select().from(users).where(eq(users.openId, "admin")).limit(1);
        }
      }

      if (result.length === 0) {
        res.status(401).json({ error: "用户名或密码错误" });
        return;
      }

      const user = result[0];

      if (!user.loginMethod || !user.loginMethod.startsWith("local:")) {
        res.status(401).json({ error: "此账户未设置本地密码" });
        return;
      }

      // Support both "local:{hash}" and "local:init:{hash}" (provisioned, must change)
      const storedHash = user.loginMethod.startsWith("local:init:")
        ? user.loginMethod.substring(11)
        : user.loginMethod.substring(6);
      const isValid = await bcrypt.compare(password, storedHash);

      if (!isValid) {
        // Admin password migration: if admin user has old "Gerry123" password,
        // auto-migrate to the submitted password and retry
        if (user.openId === "admin") {
          const isOldPw = await bcrypt.compare("Gerry123", storedHash);
          if (isOldPw) {
            log.info("Admin login: migrating from old password to new password");
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            await db.update(users).set({ loginMethod: `local:${hash}` }).where(eq(users.openId, "admin"));
            // Allow this login to proceed
          } else {
            res.status(401).json({ error: "用户名或密码错误" });
            return;
          }
        } else {
          res.status(401).json({ error: "用户名或密码错误" });
          return;
        }
      }

      const userOpenId = user.openId!;
      await db.update(users).set({ lastSignedIn: new Date().toISOString() }).where(eq(users.openId, userOpenId));

      const token = await signToken({ openId: userOpenId, name: sanitizeName(user.name) || userOpenId });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // 检测是否初始密码需要强制修改:
      // 1. loginMethod 以 "local:init:" 开头（由provisioning脚本设置）
      // 2. 密码匹配 {pinyin}100 或旧版 {pinyin}123 格式
      const isProvisionedInitial = user.loginMethod?.startsWith("local:init:") ?? false;
      const isInitialPassword = /^[a-z]+100$/.test(password) || /^[a-z]+123$/.test(password);
      const mustChangePassword = isProvisionedInitial || isInitialPassword;

      res.json({ success: true, mustChangePassword, userName: sanitizeName(user.name) || username });
    } catch (error: any) {
      log.error({ err: error }, "Login failed");
      res.status(500).json({ error: "登录失败，请稍后重试" });
    }
  });

  // ── Password Change ──
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    try {
      const { username, oldPassword, newPassword } = req.body;
      if (!username || !oldPassword || !newPassword) {
        res.status(400).json({ error: "用户名、旧密码、新密码均为必填项" });
        return;
      }

      // ── 密码安全规则 ──
      if (newPassword.length < 8) {
        res.status(400).json({ error: "新密码至少8位" });
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        res.status(400).json({ error: "新密码必须包含至少1个大写字母" });
        return;
      }
      if (!/[a-z]/.test(newPassword)) {
        res.status(400).json({ error: "新密码必须包含至少1个小写字母" });
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        res.status(400).json({ error: "新密码必须包含至少1个数字" });
        return;
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"|,.<>?/~`]/.test(newPassword)) {
        res.status(400).json({ error: "新密码必须包含至少1个特殊字符(!@#$%^&*等)" });
        return;
      }
      if (newPassword === oldPassword) {
        res.status(400).json({ error: "新密码不能与旧密码相同" });
        return;
      }
      // 不能包含用户名
      if (newPassword.toLowerCase().includes(username.toLowerCase())) {
        res.status(400).json({ error: "新密码不能包含用户名" });
        return;
      }

      const { db, users } = await getDbAndSchema();
      // Support lookup by employee ID or pinyin username
      let result = await db.select().from(users).where(eq(users.openId, username)).limit(1);
      if (result.length === 0) {
        const emailGuess = username.includes("@") ? username : `${username.toLowerCase()}@grt-group.com`;
        result = await db.select().from(users).where(eq(users.email, emailGuess)).limit(1);
      }
      if (result.length === 0) {
        res.status(401).json({ error: "用户不存在" });
        return;
      }
      const user = result[0];
      const userOpenId = user.openId!;
      if (!user.loginMethod?.startsWith("local:")) {
        res.status(400).json({ error: "此账户不支持密码修改" });
        return;
      }
      const storedHash = user.loginMethod.startsWith("local:init:")
        ? user.loginMethod.substring(11)
        : user.loginMethod.substring(6);
      const isValid = await bcrypt.compare(oldPassword, storedHash);
      if (!isValid) {
        res.status(401).json({ error: "旧密码错误" });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);
      // 更新密码 + 清除首次登录标记
      await db.update(users).set({
        loginMethod: `local:${newHash}`,
        lastSignedIn: new Date().toISOString(),
      }).where(eq(users.openId, userOpenId));

      // 用 metadata 字段记录密码已修改（利用现有字段）
      try {
        await db.execute(
          sql`UPDATE users SET role = REPLACE(role, ':must_change_pwd', '') WHERE open_id = ${username}`
        );
      } catch { /* column may not support, ignore */ }

      log.info({ username }, "Password changed successfully");
      res.json({ success: true, message: "密码修改成功，请重新登录" });
    } catch (error: any) {
      log.error({ err: error }, "Change password failed");
      res.status(500).json({ error: "密码修改失败" });
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

      const allUsers = await db.select({ id: users.id }).from(users).limit(1000);
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

      // Query RBAC roles from grt_user_roles + grt_roles
      const userType = (user as any).userType ?? (user as any).user_type ?? '';
      let effectiveRole: string = user.role === 'admin' ? 'admin' : userType === 'customer' ? 'customer' : 'employee';
      let rbacRoles: Array<{ roleName: string; level: number | null }> = [];
      let maxLevel = user.role === 'admin' ? 10 : 1;
      try {
        const permSchema = await import("../../drizzle/permission-schema");
        const activeRoles = await db.select({
          roleName: permSchema.roles.name,
          level: permSchema.roles.level,
        }).from(permSchema.userRoles)
          .innerJoin(permSchema.roles, eq(permSchema.userRoles.roleId, permSchema.roles.id))
          .where(and(
            eq(permSchema.userRoles.userId, user.openId),
            eq(permSchema.userRoles.isActive, true),
          )).limit(20);

        if (activeRoles.length > 0) {
          rbacRoles = activeRoles;
          const sorted = activeRoles.sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
          effectiveRole = sorted[0].roleName;
          maxLevel = sorted[0].level ?? 1;
        }
      } catch {
        // RBAC tables may not exist yet — graceful fallback
      }

      res.json({
        id: user.id,
        openId: user.openId,
        name: sanitizeName(user.name) || user.openId,
        email: user.email,
        role: user.role,
        effectiveRole,
        rbacRoles,
        maxLevel,
        // ── Customer fields ──
        phone: (user as any).phone ?? null,
        company: (user as any).company ?? null,
        userType: (user as any).userType ?? "employee",
        // ──────────────────────
        languagePreference: user.languagePreference,
        lastSignedIn: user.lastSignedIn,
      });
    } catch (error) {
      log.error({ err: error }, "Get current user failed");
      res.json(null);
    }
  });
}
