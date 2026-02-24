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

type Lang = 'zh' | 'en' | 'de' | 'fr';

function resolveLanguage(req: Request): Lang {
  const acceptLang = req.headers['accept-language'] || '';
  if (acceptLang.includes('de')) return 'de';
  if (acceptLang.includes('fr')) return 'fr';
  if (acceptLang.includes('en')) return 'en';
  return 'zh';
}

const authMessages: Record<string, Record<Lang, string>> = {
  usernamePasswordRequired: {
    zh: '用户名和密码为必填项',
    en: 'Username and password are required',
    de: 'Benutzername und Passwort sind erforderlich',
    fr: "Le nom d'utilisateur et le mot de passe sont requis",
  },
  usernameMinLength: {
    zh: '用户名至少需要3个字符',
    en: 'Username must be at least 3 characters',
    de: 'Benutzername muss mindestens 3 Zeichen lang sein',
    fr: "Le nom d'utilisateur doit comporter au moins 3 caractères",
  },
  passwordMinLength: {
    zh: '密码至少需要6个字符',
    en: 'Password must be at least 6 characters',
    de: 'Passwort muss mindestens 6 Zeichen lang sein',
    fr: 'Le mot de passe doit comporter au moins 6 caractères',
  },
  usernameAlreadyExists: {
    zh: '该用户名已被注册',
    en: 'This username is already registered',
    de: 'Dieser Benutzername ist bereits registriert',
    fr: "Ce nom d'utilisateur est déjà enregistré",
  },
  registerSuccessAdmin: {
    zh: '注册成功！您是第一个用户，已自动设为管理员。',
    en: 'Registration successful! You are the first user and have been set as admin.',
    de: 'Registrierung erfolgreich! Sie sind der erste Benutzer und wurden als Administrator festgelegt.',
    fr: 'Inscription réussie ! Vous êtes le premier utilisateur et avez été défini comme administrateur.',
  },
  registerSuccess: {
    zh: '注册成功！',
    en: 'Registration successful!',
    de: 'Registrierung erfolgreich!',
    fr: 'Inscription réussie !',
  },
  registerFailed: {
    zh: '注册失败，请稍后重试',
    en: 'Registration failed, please try again later',
    de: 'Registrierung fehlgeschlagen, bitte versuchen Sie es später erneut',
    fr: "L'inscription a échoué, veuillez réessayer plus tard",
  },
  invalidCredentials: {
    zh: '用户名或密码错误',
    en: 'Invalid username or password',
    de: 'Ungültiger Benutzername oder Passwort',
    fr: "Nom d'utilisateur ou mot de passe invalide",
  },
  noLocalPassword: {
    zh: '此账户未设置本地密码',
    en: 'This account does not have a local password set',
    de: 'Für dieses Konto ist kein lokales Passwort festgelegt',
    fr: "Ce compte n'a pas de mot de passe local défini",
  },
  loginFailed: {
    zh: '登录失败，请稍后重试',
    en: 'Login failed, please try again later',
    de: 'Anmeldung fehlgeschlagen, bitte versuchen Sie es später erneut',
    fr: 'La connexion a échoué, veuillez réessayer plus tard',
  },
  kioskStationRequired: {
    zh: 'stationId 为必填项',
    en: 'stationId is required',
    de: 'stationId ist erforderlich',
    fr: 'stationId est requis',
  },
  kioskLoginFailed: {
    zh: 'Kiosk登录失败',
    en: 'Kiosk login failed',
    de: 'Kiosk-Anmeldung fehlgeschlagen',
    fr: 'Échec de la connexion Kiosk',
  },
  resetSuccess: {
    zh: '已清除 {count} 个用户。下一个注册的用户将自动成为管理员。',
    en: 'Cleared {count} user(s). The next registered user will automatically become admin.',
    de: '{count} Benutzer gelöscht. Der nächste registrierte Benutzer wird automatisch Administrator.',
    fr: '{count} utilisateur(s) supprimé(s). Le prochain utilisateur enregistré deviendra automatiquement administrateur.',
  },
  resetFailed: {
    zh: '重置用户失败，请稍后重试',
    en: 'User reset failed, please try again later',
    de: 'Benutzer-Reset fehlgeschlagen, bitte versuchen Sie es später erneut',
    fr: 'La réinitialisation des utilisateurs a échoué, veuillez réessayer plus tard',
  },
};

function t(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  let msg = authMessages[key]?.[lang] || authMessages[key]?.['zh'] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
}

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
    const lang = resolveLanguage(req);
    try {
      const { username, password, name, email } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: t('usernamePasswordRequired', lang) });
        return;
      }
      if (username.length < 3) {
        res.status(400).json({ error: t('usernameMinLength', lang) });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: t('passwordMinLength', lang) });
        return;
      }

      const { db, users } = await getDbAndSchema();

      const existing = await db.select().from(users).where(eq(users.openId, username)).limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: t('usernameAlreadyExists', lang) });
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
          ? t('registerSuccessAdmin', lang)
          : t('registerSuccess', lang),
      });
    } catch (error: any) {
      console.error("[LocalAuth] Register error:", error?.message || error);
      res.status(500).json({ error: t('registerFailed', lang) });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const lang = resolveLanguage(req);
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: t('usernamePasswordRequired', lang) });
        return;
      }

      const { db, users } = await getDbAndSchema();
      const result = await db.select().from(users).where(eq(users.openId, username)).limit(1);

      if (result.length === 0) {
        res.status(401).json({ error: t('invalidCredentials', lang) });
        return;
      }

      const user = result[0];

      if (!user.loginMethod || !user.loginMethod.startsWith("local:")) {
        res.status(401).json({ error: t('noLocalPassword', lang) });
        return;
      }

      const storedHash = user.loginMethod.substring(6);
      const isValid = await bcrypt.compare(password, storedHash);

      if (!isValid) {
        res.status(401).json({ error: t('invalidCredentials', lang) });
        return;
      }

      await db.update(users).set({ lastSignedIn: new Date().toISOString() }).where(eq(users.openId, username));

      const token = await signToken({ openId: username, name: user.name || username });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[LocalAuth] User logged in: ${username}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[LocalAuth] Login error:", error?.message || error);
      res.status(500).json({ error: t('loginFailed', lang) });
    }
  });

  // Kiosk login — no password, creates/finds a generic kiosk session
  app.post("/api/auth/kiosk-login", async (req: Request, res: Response) => {
    const lang = resolveLanguage(req);
    try {
      const { stationId, departmentCode } = req.body;
      if (!stationId) {
        res.status(400).json({ error: t('kioskStationRequired', lang) });
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

      console.log(`[LocalAuth] Kiosk logged in: ${kioskUsername} (station: ${stationId})`);
      res.json({ success: true, stationId, kioskUser: kioskUsername });
    } catch (error) {
      console.error("[LocalAuth] Kiosk login error:", error);
      res.status(500).json({ error: t('kioskLoginFailed', lang) });
    }
  });

  // Reset all users — clears the users table so the next registration becomes admin
  app.post("/api/auth/reset-all-users", async (req: Request, res: Response) => {
    const lang = resolveLanguage(req);
    try {
      const { db, users } = await getDbAndSchema();

      const allUsers = await db.select({ id: users.id }).from(users);
      const count = allUsers.length;

      // Use TRUNCATE CASCADE to handle foreign key references from other tables
      await db.execute(sql`TRUNCATE TABLE users CASCADE`);

      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, cookieOptions);

      console.log(`[LocalAuth] All users reset — ${count} user(s) deleted. Next registration will be admin.`);
      res.json({
        success: true,
        message: t('resetSuccess', lang, { count }),
        deletedCount: count,
      });
    } catch (error: any) {
      console.error("[LocalAuth] Reset users error:", error?.message || error);
      res.status(500).json({ error: t('resetFailed', lang) });
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
