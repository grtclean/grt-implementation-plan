/**
 * Microsoft Graph API Service
 * 
 * 提供与Microsoft 365服务的集成：
 * - Outlook日历事件
 * - Teams消息
 * - 用户信息
 */

import { env } from "../_core/env";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("ms-graph");

// Microsoft Graph API 基础URL
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

// Token缓存
let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

/**
 * 获取访问令牌（Client Credentials Flow）
 */
export async function getAccessToken(): Promise<string> {
  // 检查缓存的token是否有效
  if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
    return accessToken;
  }

  const tenantId = env.MICROSOFT_TENANT_ID;
  const clientId = env.MICROSOFT_CLIENT_ID;
  const clientSecret = env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft Graph API凭据未配置");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`获取访问令牌失败: ${error}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000); // 提前5分钟过期

  return accessToken as any;
}

/**
 * 发送Graph API请求
 */
async function graphRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph API请求失败: ${response.status} - ${error}`);
  }

  return response.json();
}

// 日历事件类型
export interface CalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    status: {
      response: string;
    };
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  bodyPreview?: string;
}

// Teams消息类型
export interface TeamsMessage {
  id: string;
  createdDateTime: string;
  from?: {
    user?: {
      displayName: string;
      id: string;
    };
  };
  body: {
    content: string;
    contentType: string;
  };
  importance?: string;
  mentions?: Array<{
    id: number;
    mentionText: string;
    mentioned: {
      user: {
        displayName: string;
        id: string;
      };
    };
  }>;
}

// Teams聊天类型
export interface TeamsChat {
  id: string;
  topic?: string;
  chatType: string;
  createdDateTime: string;
  lastUpdatedDateTime: string;
}

/**
 * 获取用户日历事件
 */
export async function getCalendarEvents(
  userId: string,
  startDateTime: string,
  endDateTime: string
): Promise<CalendarEvent[]> {
  const endpoint = `/users/${userId}/calendar/calendarView?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$orderby=start/dateTime&$top=50`;

  const response = await graphRequest<{ value: CalendarEvent[] }>(endpoint);
  return response.value;
}

/**
 * 获取今日日历事件
 */
export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  return getCalendarEvents(userId, startOfDay, endOfDay);
}

/**
 * 获取本周日历事件
 */
export async function getWeekEvents(userId: string): Promise<CalendarEvent[]> {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return getCalendarEvents(userId, startOfWeek.toISOString(), endOfWeek.toISOString());
}

/**
 * 创建日历事件
 */
export async function createCalendarEvent(
  userId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const endpoint = `/users/${userId}/calendar/events`;

  return graphRequest<CalendarEvent>(endpoint, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

/**
 * 获取用户的Teams聊天列表
 */
export async function getTeamsChats(userId: string): Promise<TeamsChat[]> {
  const endpoint = `/users/${userId}/chats?$top=20&$orderby=lastUpdatedDateTime desc`;

  const response = await graphRequest<{ value: TeamsChat[] }>(endpoint);
  return response.value;
}

/**
 * 获取Teams聊天消息
 */
export async function getTeamsChatMessages(
  chatId: string,
  top: number = 20
): Promise<TeamsMessage[]> {
  const endpoint = `/chats/${chatId}/messages?$top=${top}&$orderby=createdDateTime desc`;

  const response = await graphRequest<{ value: TeamsMessage[] }>(endpoint);
  return response.value;
}

/**
 * 获取用户最近的Teams消息（跨所有聊天）
 */
export async function getRecentTeamsMessages(
  userId: string,
  limit: number = 10
): Promise<Array<TeamsMessage & { chatId: string }>> {
  const chats = await getTeamsChats(userId);
  const allMessages: Array<TeamsMessage & { chatId: string }> = [];

  for (const chat of chats.slice(0, 5)) {
    try {
      const messages = await getTeamsChatMessages(chat.id, 5);
      allMessages.push(...messages.map(m => ({ ...m, chatId: chat.id })));
    } catch (error) {
      log.error({ err: error, chatId: chat.id }, "Failed to get chat messages");
    }
  }

  // 按时间排序并限制数量
  return allMessages
    .sort((a, b) => new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime())
    .slice(0, limit);
}

/**
 * 发送Teams消息
 */
export async function sendTeamsMessage(
  chatId: string,
  content: string
): Promise<TeamsMessage> {
  const endpoint = `/chats/${chatId}/messages`;

  return graphRequest<TeamsMessage>(endpoint, {
    method: "POST",
    body: JSON.stringify({
      body: {
        content,
        contentType: "html",
      },
    }),
  });
}

/**
 * 获取用户信息
 */
export async function getUserInfo(userId: string): Promise<{
  id: string;
  displayName: string;
  mail: string;
  jobTitle?: string;
  department?: string;
}> {
  const endpoint = `/users/${userId}?$select=id,displayName,mail,jobTitle,department`;
  return graphRequest(endpoint);
}

// SharePoint Drive Item类型
export interface DriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  file?: {
    mimeType: string;
    hashes?: {
      quickXorHash?: string;
      sha1Hash?: string;
      sha256Hash?: string;
    };
  };
  folder?: {
    childCount: number;
  };
  createdBy?: {
    user?: {
      displayName: string;
      id: string;
    };
  };
  lastModifiedBy?: {
    user?: {
      displayName: string;
      id: string;
    };
  };
  "@microsoft.graph.downloadUrl"?: string;
}

/**
 * 获取SharePoint站点中的文件列表
 */
export async function getDriveItems(
  siteId: string,
  folderId?: string
): Promise<DriveItem[]> {
  const itemPath = folderId ? `items/${folderId}/children` : "root/children";
  const endpoint = `/sites/${siteId}/drive/${itemPath}?$top=100&$orderby=name`;

  const response = await graphRequest<{ value: DriveItem[] }>(endpoint);
  return response.value;
}

/**
 * 获取SharePoint文件下载URL
 */
export async function getFileDownloadUrl(
  siteId: string,
  itemId: string
): Promise<{ downloadUrl: string; webUrl: string; name: string }> {
  const endpoint = `/sites/${siteId}/drive/items/${itemId}`;

  const item = await graphRequest<DriveItem>(endpoint);
  return {
    downloadUrl: item["@microsoft.graph.downloadUrl"] || item.webUrl,
    webUrl: item.webUrl,
    name: item.name,
  };
}

/**
 * 在SharePoint站点中搜索文件
 */
export async function searchFiles(
  siteId: string,
  query: string
): Promise<DriveItem[]> {
  const endpoint = `/sites/${siteId}/drive/root/search(q='${encodeURIComponent(query)}')`;

  const response = await graphRequest<{ value: DriveItem[] }>(endpoint);
  return response.value;
}

/**
 * 验证Microsoft Graph API凭据
 */
export async function validateCredentials(): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    await getAccessToken();
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "验证失败",
    };
  }
}

/**
 * 清除token缓存（用于凭据更新后）
 */
export function clearTokenCache(): void {
  accessToken = null;
  tokenExpiry = null;
}
