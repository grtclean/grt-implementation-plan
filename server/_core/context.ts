import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyToken } from "./local-auth";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { resolveLanguageFromHeader, type Language } from "../lib/server-i18n";
import { sanitizeName } from "@shared/sanitize";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  language: Language;
};

const isLocalAuth = () =>
  process.env.LOCAL_AUTH === "true" || process.env.VITE_LOCAL_AUTH === "true";

async function authenticateLocalUser(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  let token: string | null = null;
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookieHeader(cookieHeader);
    token = cookies[COOKIE_NAME] || null;
  }

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  const session = await verifyToken(token);
  if (!session) return null;

  try {
    const { getUserByOpenId } = await import("../db");
    const user = await getUserByOpenId(session.openId);
    return user ?? null;
  } catch (error) {
    console.error("[LocalAuth] Failed to look up user:", error);
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (isLocalAuth()) {
    user = await authenticateLocalUser(opts.req);
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      user = null;
    }
  }

  // Resolve language: 1) user preference, 2) Accept-Language header, 3) default 'zh'
  let language: Language = 'zh';
  if (user?.languagePreference) {
    language = user.languagePreference as Language;
  } else {
    language = resolveLanguageFromHeader(opts.req.headers['accept-language']);
  }

  // Sanitize user name at the tRPC context level — fixes garbled chars (U+FFFD)
  // from GBK/CP936 encoding mismatch on Chinese Windows, so all downstream
  // consumers (40+ routers) automatically receive a clean name.
  if (user && user.name) {
    user = { ...user, name: sanitizeName(user.name) || user.openId };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    language,
  };
}
