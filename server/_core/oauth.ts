import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sanitizeName } from "@shared/sanitize";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

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

    console.log("[OAuth] Callback received, code:", code ? "present" : "missing", "state:", state ? "present" : "missing");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Exchanging code for token...");
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log("[OAuth] Token exchange successful");
      
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log("[OAuth] User info retrieved:", userInfo.openId, userInfo.name);

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
      console.log("[OAuth] User upserted to database");

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: cleanName || "",
        expiresInMs: ONE_YEAR_MS,
      });
      console.log("[OAuth] Session token created, length:", sessionToken.length);

      const cookieOptions = getSessionCookieOptions(req);
      console.log("[OAuth] Cookie options:", JSON.stringify(cookieOptions));
      
      // Set the cookie with all required options for cross-origin iframe support
      res.cookie(COOKIE_NAME, sessionToken, { 
        ...cookieOptions, 
        maxAge: ONE_YEAR_MS 
      });
      console.log("[OAuth] Cookie set with name:", COOKIE_NAME);

      // Redirect to the original path user wanted to access
      const returnPath = parseStateForReturnPath(state);
      console.log("[OAuth] Redirecting to:", returnPath);
      
      // For iframe/preview mode, pass the token via URL parameter as a fallback
      // This allows the frontend to store it in localStorage when cookies don't work
      const redirectUrl = `/login-success?returnPath=${encodeURIComponent(returnPath)}&token=${encodeURIComponent(sessionToken)}`;
      console.log("[OAuth] Redirecting to login-success with token");
      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
