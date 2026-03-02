import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sanitizeName } from "@shared/sanitize";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("oauth");

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// Parse state parameter to extract return path
function parseStateForReturnPath(state: string): string {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    const stateData = JSON.parse(decoded);
    // Return the original path user wanted to access, default to "/"
    return stateData.returnPath || "/";
  } catch {
    // If state is not JSON (legacy format), just return "/"
    return "/";
  }
}

export function registerOAuthRoutes(app: Express) {
  // Add a route to check login status and redirect to login-success page
  app.get("/api/oauth/login-success", (req: Request, res: Response) => {
    const returnPath = getQueryParam(req, "returnPath") || "/";
    res.redirect(302, `/login-success?returnPath=${encodeURIComponent(returnPath)}`);
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);

      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const cleanName = sanitizeName(userInfo.name);
      await db.upsertUser({
        openId: userInfo.openId,
        name: cleanName || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date().toISOString(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: cleanName || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);

      // Set the cookie with all required options for cross-origin iframe support
      res.cookie(COOKIE_NAME, sessionToken, { 
        ...cookieOptions, 
        maxAge: ONE_YEAR_MS 
      });

      // Redirect to the original path user wanted to access
      const returnPath = parseStateForReturnPath(state);

      // For iframe/preview mode, pass the token via URL parameter as a fallback
      // This allows the frontend to store it in localStorage when cookies don't work
      const redirectUrl = `/login-success?returnPath=${encodeURIComponent(returnPath)}&token=${encodeURIComponent(sessionToken)}`;
      res.redirect(302, redirectUrl);
    } catch (error) {
      log.error({ err: error }, "[OAuth] Callback failed");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
