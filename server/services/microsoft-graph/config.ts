// server/services/microsoft-graph/config.ts
// Microsoft Graph API 配置和认证服务

import { env } from "../../_core/env";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("ms-graph-config");

// Graph API 配置
export const graphConfig = {
  clientId: env.MICROSOFT_CLIENT_ID || "",
  clientSecret: env.MICROSOFT_CLIENT_SECRET || "",
  tenantId: env.MICROSOFT_TENANT_ID || "",
  scopes: [
    "https://graph.microsoft.com/.default",
  ],
  endpoints: {
    calendar: "https://graph.microsoft.com/v1.0/me/calendar/events",
    teams: "https://graph.microsoft.com/v1.0/me/chats",
    teamsMessages: "https://graph.microsoft.com/v1.0/me/chats/{chatId}/messages",
    users: "https://graph.microsoft.com/v1.0/users",
    presence: "https://graph.microsoft.com/v1.0/me/presence",
  },
};

// Token 缓存
let cachedToken: { token: string; expiresAt: number } | null = null;

// 获取访问令牌
export async function getAccessToken(): Promise<string> {
  // 检查缓存的令牌是否有效
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  // 如果没有配置凭据，返回空字符串（使用模拟数据）
  if (!graphConfig.clientId || !graphConfig.clientSecret || !graphConfig.tenantId) {
    log.info({}, "No credentials configured, using mock data");
    return "";
  }

  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${graphConfig.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: graphConfig.clientId,
      client_secret: graphConfig.clientSecret,
      scope: graphConfig.scopes.join(" "),
      grant_type: "client_credentials",
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // 缓存令牌
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return cachedToken.token;
  } catch (error) {
    log.error({ err: error }, "Failed to get access token");
    return "";
  }
}

// 通用 Graph API 请求函数
export async function graphRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  const token = await getAccessToken();
  
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Graph API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log.error({ err: error, endpoint }, "Request failed");
    return null;
  }
}

// 检查 Graph API 是否已配置
export function isGraphConfigured(): boolean {
  return !!(graphConfig.clientId && graphConfig.clientSecret && graphConfig.tenantId);
}
