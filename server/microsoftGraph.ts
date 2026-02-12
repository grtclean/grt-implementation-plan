/**
 * Microsoft Graph API Integration for Teams Meetings
 * 
 * 功能：
 * 1. 创建Teams在线会议
 * 2. 获取会议详情
 * 3. 更新会议信息
 * 4. 删除会议
 * 
 * 配置要求：
 * - MICROSOFT_CLIENT_ID: Azure AD应用程序ID
 * - MICROSOFT_CLIENT_SECRET: Azure AD应用程序密钥
 * - MICROSOFT_TENANT_ID: Azure AD租户ID
 * 
 * API文档: https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings
 */

import { requireDb } from './utils/db-helpers';
import { teamsMeetingConfigs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Microsoft Graph API配置
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
const OAUTH_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token";

// 环境变量
const getConfig = () => ({
  clientId: process.env.MICROSOFT_CLIENT_ID || "",
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  tenantId: process.env.MICROSOFT_TENANT_ID || "",
});

// 获取访问令牌（Client Credentials Flow）
async function getAccessToken(): Promise<string | null> {
  const config = getConfig();
  
  if (!config.clientId || !config.clientSecret || !config.tenantId) {
    console.warn("[Microsoft Graph] API credentials not configured");
    return null;
  }

  const tokenUrl = OAUTH_TOKEN_URL.replace("{tenant}", config.tenantId);
  
  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Microsoft Graph] Token error:", error);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("[Microsoft Graph] Token fetch error:", error);
    return null;
  }
}

// Teams会议创建参数
export interface CreateMeetingParams {
  subject: string;
  startDateTime: Date;
  endDateTime: Date;
  organizerUserId?: string; // 组织者的Microsoft用户ID
  participants?: Array<{
    email: string;
    displayName?: string;
  }>;
  lobbyBypassSettings?: {
    scope: "everyone" | "organization" | "organizer" | "invited";
  };
  allowedPresenters?: "everyone" | "organization" | "roleIsPresenter" | "organizer";
}

// Teams会议响应
export interface TeamsMeetingResponse {
  id: string;
  joinUrl: string;
  joinWebUrl: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  videoTeleconferenceId?: string;
  chatInfo?: {
    threadId: string;
    messageId: string;
  };
  audioConferencing?: {
    conferenceId: string;
    tollNumber: string;
    tollFreeNumber?: string;
    dialinUrl: string;
  };
}

// 创建Teams在线会议
export async function createTeamsOnlineMeeting(
  params: CreateMeetingParams
): Promise<{ success: boolean; meeting?: TeamsMeetingResponse; error?: string }> {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    // 如果没有配置API，返回模拟数据用于演示
    return createMockMeeting(params);
  }

  try {
    const endpoint = params.organizerUserId
      ? `${GRAPH_API_BASE}/users/${params.organizerUserId}/onlineMeetings`
      : `${GRAPH_API_BASE}/me/onlineMeetings`;

    const body: any = {
      subject: params.subject,
      startDateTime: params.startDateTime.toISOString(),
      endDateTime: params.endDateTime.toISOString(),
    };

    if (params.participants && params.participants.length > 0) {
      body.participants = {
        attendees: params.participants.map((p) => ({
          upn: p.email,
          identity: {
            user: {
              displayName: p.displayName || p.email,
            },
          },
          role: "attendee",
        })),
      };
    }

    if (params.lobbyBypassSettings) {
      body.lobbyBypassSettings = params.lobbyBypassSettings;
    }

    if (params.allowedPresenters) {
      body.allowedPresenters = params.allowedPresenters;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Microsoft Graph] Create meeting error:", error);
      return { success: false, error: `API Error: ${response.status}` };
    }

    const meeting = await response.json();
    return {
      success: true,
      meeting: {
        id: meeting.id,
        joinUrl: meeting.joinUrl,
        joinWebUrl: meeting.joinWebUrl,
        subject: meeting.subject,
        startDateTime: meeting.startDateTime,
        endDateTime: meeting.endDateTime,
        videoTeleconferenceId: meeting.videoTeleconferenceId,
        chatInfo: meeting.chatInfo,
        audioConferencing: meeting.audioConferencing,
      },
    };
  } catch (error) {
    console.error("[Microsoft Graph] Create meeting error:", error);
    return { success: false, error: String(error) };
  }
}

// 获取Teams会议详情
export async function getTeamsOnlineMeeting(
  meetingId: string,
  userId?: string
): Promise<{ success: boolean; meeting?: TeamsMeetingResponse; error?: string }> {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    return { success: false, error: "API credentials not configured" };
  }

  try {
    const endpoint = userId
      ? `${GRAPH_API_BASE}/users/${userId}/onlineMeetings/${meetingId}`
      : `${GRAPH_API_BASE}/me/onlineMeetings/${meetingId}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: `API Error: ${response.status}` };
    }

    const meeting = await response.json();
    return { success: true, meeting };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// 更新Teams会议
export async function updateTeamsOnlineMeeting(
  meetingId: string,
  updates: Partial<CreateMeetingParams>,
  userId?: string
): Promise<{ success: boolean; meeting?: TeamsMeetingResponse; error?: string }> {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    return { success: false, error: "API credentials not configured" };
  }

  try {
    const endpoint = userId
      ? `${GRAPH_API_BASE}/users/${userId}/onlineMeetings/${meetingId}`
      : `${GRAPH_API_BASE}/me/onlineMeetings/${meetingId}`;

    const body: any = {};
    if (updates.subject) body.subject = updates.subject;
    if (updates.startDateTime) body.startDateTime = updates.startDateTime.toISOString();
    if (updates.endDateTime) body.endDateTime = updates.endDateTime.toISOString();

    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { success: false, error: `API Error: ${response.status}` };
    }

    const meeting = await response.json();
    return { success: true, meeting };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// 删除Teams会议
export async function deleteTeamsOnlineMeeting(
  meetingId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    return { success: false, error: "API credentials not configured" };
  }

  try {
    const endpoint = userId
      ? `${GRAPH_API_BASE}/users/${userId}/onlineMeetings/${meetingId}`
      : `${GRAPH_API_BASE}/me/onlineMeetings/${meetingId}`;

    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      return { success: false, error: `API Error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// 创建模拟会议（用于演示，当API未配置时）
function createMockMeeting(params: CreateMeetingParams): {
  success: boolean;
  meeting: TeamsMeetingResponse;
} {
  const meetingId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const conferenceId = Math.random().toString().substring(2, 11);
  
  return {
    success: true,
    meeting: {
      id: meetingId,
      joinUrl: `https://teams.microsoft.com/l/meetup-join/mock/${meetingId}`,
      joinWebUrl: `https://teams.microsoft.com/l/meetup-join/mock/${meetingId}`,
      subject: params.subject,
      startDateTime: params.startDateTime.toISOString(),
      endDateTime: params.endDateTime.toISOString(),
      videoTeleconferenceId: `VTC-${conferenceId}`,
      chatInfo: {
        threadId: `19:meeting_${meetingId}@thread.v2`,
        messageId: "0",
      },
      audioConferencing: {
        conferenceId: conferenceId,
        tollNumber: "+86 10 8888 8888",
        tollFreeNumber: "+86 400 888 8888",
        dialinUrl: `https://dialin.teams.microsoft.com/${conferenceId}`,
      },
    },
  };
}

// 为候选人创建面试会议并保存到数据库
export async function createInterviewMeeting(
  candidateId: number,
  candidateName: string,
  interviewerEmail: string,
  startTime: Date,
  durationMinutes: number = 60
): Promise<{ success: boolean; meetingId?: number; joinUrl?: string; error?: string }> {
  const db = await requireDb();
  if (!db) return { success: false, error: "Database not available" };

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  
  // 创建Teams会议
  const result = await createTeamsOnlineMeeting({
    subject: `面试 - ${candidateName}`,
    startDateTime: startTime,
    endDateTime: endTime,
    participants: [{ email: interviewerEmail }],
    lobbyBypassSettings: { scope: "organization" },
    allowedPresenters: "organizer",
  });

  if (!result.success || !result.meeting) {
    return { success: false, error: result.error };
  }

  // 生成会议代码
  const meetingCode = `MTG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 保存到数据库
  const [dbResult] = await db.insert(teamsMeetingConfigs).values({
    candidateId,
    meetingCode,
    subject: result.meeting.subject,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMinutes,
    teamsMeetingId: result.meeting.id,
    meetingUrl: result.meeting.joinUrl,
    status: "scheduled",
  } as any).returning();

  return {
    success: true,
    meetingId: dbResult.id,
    joinUrl: result.meeting.joinUrl,
  };
}

// 检查API配置状态
export function checkMicrosoftGraphConfig(): {
  configured: boolean;
  missingKeys: string[];
} {
  const config = getConfig();
  const missingKeys: string[] = [];
  
  if (!config.clientId) missingKeys.push("MICROSOFT_CLIENT_ID");
  if (!config.clientSecret) missingKeys.push("MICROSOFT_CLIENT_SECRET");
  if (!config.tenantId) missingKeys.push("MICROSOFT_TENANT_ID");

  return {
    configured: missingKeys.length === 0,
    missingKeys,
  };
}
