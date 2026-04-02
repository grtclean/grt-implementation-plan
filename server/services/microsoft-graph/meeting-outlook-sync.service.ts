/**
 * Meeting → Outlook Calendar Sync Service
 * 将 GRT System 的会议自动同步到参会人的 Outlook 日历
 *
 * 功能：
 * 1. 将 sys_meetings 中的会议推送到 Outlook/Teams 日历
 * 2. 自动添加参会人（从 description 中提取邮箱）
 * 3. 设置 Teams 在线会议链接
 * 4. 支持周期性会议的 recurrence 模式
 */
import { graphConfig, graphRequest, isGraphConfigured } from "./config";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("meeting-outlook-sync");

// 员工邮箱映射（基于 seed-real-users.ts 的 pinyin@grt-group.com 规则）
const EMPLOYEE_EMAIL_MAP: Record<string, string> = {
  "倪亚东": "niyadong@grt-group.com",
  "刘奥运": "liuaoyun@grt-group.com",

  "倪微薇": "niweiwei@grt-group.com",
  "王秀萍": "wangxiuping@grt-group.com",
  "沙建梅": "shajianmei@grt-group.com",
  "戴晓燕": "daixiaoyan@grt-group.com",
  "金晓锋": "jinxiaofeng@grt-group.com",
  "王志强": "wangzhiqiang@grt-group.com",
  "刘健康": "liujiankang@grt-group.com",
  "董纾雨": "dongshuyu@grt-group.com",
  "韩保程": "hanbaocheng@grt-group.com",
  "李柯瑶": "likeyao@grt-group.com",
  "冯燕": "fengyan@grt-group.com",
  "匡凯旋": "kuangkaixuan@grt-group.com",
  "廉龙海": "lianlonghai@grt-group.com",
  "徐树奎": "xushukui@grt-group.com",
  "洪香龙": "hongxianglong@grt-group.com",
  "周辉": "zhouhui@grt-group.com",
  "孙坚": "sunjian@grt-group.com",
  "沈迎凤": "shenyingfeng@grt-group.com",
  "杨勇": "yangyong@grt-group.com",
  "马林山": "malinshan@grt-group.com",
  "洪小东": "hongxiaodong@grt-group.com",
  "蔡瑞": "cairui@grt-group.com",
  "钱佳奇": "qianjiaqi@grt-group.com",
  "李大鹏": "lidapeng@grt-group.com",
  "杜显文": "duxianwen@grt-group.com",
  "吕雪冬": "lvxuedong@grt-group.com",
  "马柯": "make@grt-group.com",
  "罗小玲": "luoxiaoling@grt-group.com",
  "刘坤": "liukun@grt-group.com",
  "朱文韬": "zhuwentao@grt-group.com",
  "胡杨": "huyang@grt-group.com",
  "殷金刚": "yinjingang@grt-group.com",
};

// 会议室 → Outlook location 映射
const ROOM_MAP: Record<string, string> = {
  "一楼大厅": "GRT 一楼大厅",
  "车间现场": "GRT 车间现场",
  "一楼会议室A": "GRT 一楼会议室A",
  "二楼会议室B": "GRT 二楼会议室B",
  "三楼培训室": "GRT 三楼培训室",
  "Teams线上": "Microsoft Teams Meeting",
  "客户现场": "客户现场 (详见描述)",
};

// 周期性模式
export type RecurrencePattern = "daily" | "weekly" | "monthly";

interface OutlookMeetingPayload {
  subject: string;
  body: { contentType: "HTML"; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{ emailAddress: { address: string; name: string }; type: "required" | "optional" }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: "teamsForBusiness";
  recurrence?: {
    pattern: { type: string; interval: number; daysOfWeek?: string[] };
    range: { type: string; startDate: string; endDate?: string; numberOfOccurrences?: number };
  };
  importance?: "low" | "normal" | "high";
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
}

/**
 * 从会议描述中提取参会人姓名
 */
function extractAttendeesFromDescription(description: string): string[] {
  const lines = description.split("\n");
  for (const line of lines) {
    if (line.includes("参会") || line.includes("参与") || line.includes("参加")) {
      const namesStr = line.replace(/.*[：:]/, "").trim();
      // 提取括号外的中文姓名
      return namesStr.split(/[,，、]/).map(s => s.replace(/\(.*?\)/g, "").trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * 从会议描述中提取会议室
 */
function extractRoomFromDescription(description: string): string {
  const lines = description.split("\n");
  for (const line of lines) {
    if (line.includes("会议室") || line.includes("场地") || line.includes("地点")) {
      const room = line.replace(/.*[：:]/, "").trim();
      return ROOM_MAP[room] || room;
    }
  }
  return "";
}

/**
 * 将 GRT Meeting 转换为 Outlook Calendar Event 格式
 */
export function convertToOutlookEvent(meeting: {
  title: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  meetingCategory?: string;
  direction?: string;
  teamsUrl?: string;
}, options?: {
  recurrence?: { pattern: RecurrencePattern; interval?: number; endDate?: string; count?: number };
  isTeamsMeeting?: boolean;
  importance?: "low" | "normal" | "high";
  reminderMinutes?: number;
}): OutlookMeetingPayload {
  const desc = meeting.description || "";
  const attendeeNames = extractAttendeesFromDescription(desc);
  const room = extractRoomFromDescription(desc);

  // 构建 HTML 格式的会议正文
  const bodyHtml = `
    <h2>${meeting.title}</h2>
    <p><b>类别：</b>${meeting.meetingCategory || "TEAM_SYNC"} | ${meeting.direction === "EXTERNAL" ? "外部会议" : "内部会议"}</p>
    ${room ? `<p><b>地点：</b>${room}</p>` : ""}
    <hr/>
    <pre>${desc.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
    <hr/>
    <p><small>由 GRT System 会议日历自动创建</small></p>
  `;

  // 映射参会人姓名 → 邮箱
  const attendees = attendeeNames
    .map(name => {
      const email = EMPLOYEE_EMAIL_MAP[name];
      if (email) return { emailAddress: { address: email, name }, type: "required" as const };
      return null;
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const payload: OutlookMeetingPayload = {
    subject: meeting.title,
    body: { contentType: "HTML", content: bodyHtml },
    start: { dateTime: meeting.scheduledStart || new Date().toISOString(), timeZone: "Asia/Shanghai" },
    end: { dateTime: meeting.scheduledEnd || new Date().toISOString(), timeZone: "Asia/Shanghai" },
    location: room ? { displayName: room } : undefined,
    attendees: attendees.length > 0 ? attendees : undefined,
    importance: options?.importance || (meeting.meetingCategory === "GATE_REVIEW" ? "high" : "normal"),
    isReminderOn: true,
    reminderMinutesBeforeStart: options?.reminderMinutes ?? 15,
  };

  // Teams 在线会议
  if (options?.isTeamsMeeting || room === "Microsoft Teams Meeting") {
    payload.isOnlineMeeting = true;
    payload.onlineMeetingProvider = "teamsForBusiness";
  }

  // 周期性会议
  if (options?.recurrence) {
    const r = options.recurrence;
    const startDate = (meeting.scheduledStart || new Date().toISOString()).slice(0, 10);
    payload.recurrence = {
      pattern: {
        type: r.pattern,
        interval: r.interval || 1,
        ...(r.pattern === "weekly" ? {
          daysOfWeek: [["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(startDate).getDay()]],
        } : {}),
      },
      range: {
        type: r.endDate ? "endDate" : r.count ? "numbered" : "noEnd",
        startDate,
        ...(r.endDate ? { endDate: r.endDate } : {}),
        ...(r.count ? { numberOfOccurrences: r.count } : {}),
      },
    };
  }

  return payload;
}

/**
 * 将会议推送到 Outlook 日历
 * 需要 Microsoft Graph API 配置
 */
export async function syncMeetingToOutlook(meeting: {
  id: number;
  title: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  meetingCategory?: string;
  direction?: string;
}, options?: {
  recurrence?: { pattern: RecurrencePattern; interval?: number; endDate?: string; count?: number };
  isTeamsMeeting?: boolean;
}): Promise<{ success: boolean; outlookEventId?: string; teamsUrl?: string; error?: string }> {
  if (!isGraphConfigured()) {
    log.warn({ meetingId: meeting.id }, "Microsoft Graph not configured — Outlook sync skipped");
    return { success: false, error: "Microsoft Graph API 未配置。请设置 MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET 环境变量。" };
  }

  try {
    const payload = convertToOutlookEvent(meeting, options);

    const response = await graphRequest<any>(graphConfig.endpoints.calendar, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response) {
      return { success: false, error: "Outlook API 调用失败" };
    }

    const teamsUrl = response.onlineMeeting?.joinUrl || response.onlineMeetingUrl || undefined;

    log.info({
      meetingId: meeting.id,
      outlookEventId: response.id,
      attendeeCount: payload.attendees?.length || 0,
      hasTeamsLink: !!teamsUrl,
    }, "Meeting synced to Outlook");

    return {
      success: true,
      outlookEventId: response.id,
      teamsUrl,
    };
  } catch (err: any) {
    log.error({ err, meetingId: meeting.id }, "Failed to sync meeting to Outlook");
    return { success: false, error: err.message || "未知错误" };
  }
}

/**
 * 批量同步 — 将所有 UPCOMING 会议推送到 Outlook
 */
export async function syncAllUpcomingMeetings(meetings: Array<{
  id: number;
  title: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  meetingCategory?: string;
  direction?: string;
}>): Promise<{ total: number; synced: number; failed: number; errors: string[] }> {
  const results = { total: meetings.length, synced: 0, failed: 0, errors: [] as string[] };

  for (const meeting of meetings) {
    const result = await syncMeetingToOutlook(meeting);
    if (result.success) {
      results.synced++;
    } else {
      results.failed++;
      results.errors.push(`${meeting.title}: ${result.error}`);
    }
  }

  log.info(results, "Batch Outlook sync completed");
  return results;
}

/**
 * 获取周期性会议的 Outlook recurrence 配置
 */
export function getRecurrenceConfig(meetingTitle: string): {
  pattern: RecurrencePattern;
  interval: number;
  endDate?: string;
  count?: number;
} | null {
  if (meetingTitle.includes("走线")) return { pattern: "weekly", interval: 1, count: 52 }; // 每周四
  if (meetingTitle.includes("晨会")) return { pattern: "weekly", interval: 1, count: 52 }; // 每周一
  if (meetingTitle.includes("销售周例会")) return { pattern: "weekly", interval: 1, count: 52 };
  if (meetingTitle.includes("月度")) return { pattern: "monthly", interval: 1, count: 12 };
  if (meetingTitle.includes("季度")) return { pattern: "monthly", interval: 3, count: 4 };
  return null; // 非周期性
}

/**
 * 生成预览（不实际调用 API，返回将要发送的 payload）
 * 用于前端展示确认
 */
export function previewOutlookEvent(meeting: {
  title: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  meetingCategory?: string;
  direction?: string;
}): {
  subject: string;
  location: string;
  attendees: Array<{ name: string; email: string }>;
  isRecurring: boolean;
  recurrenceDesc: string;
  importance: string;
  teamsLink: boolean;
} {
  const desc = meeting.description || "";
  const names = extractAttendeesFromDescription(desc);
  const room = extractRoomFromDescription(desc);
  const recurrence = getRecurrenceConfig(meeting.title);

  return {
    subject: meeting.title,
    location: room || "未指定",
    attendees: names.map(name => ({
      name,
      email: EMPLOYEE_EMAIL_MAP[name] || `${name}@grt-group.com`,
    })),
    isRecurring: !!recurrence,
    recurrenceDesc: recurrence
      ? `${recurrence.pattern === "weekly" ? "每周" : recurrence.pattern === "monthly" ? "每月" : "每天"}重复，共${recurrence.count || "无限"}次`
      : "单次会议",
    importance: meeting.meetingCategory === "GATE_REVIEW" ? "高" : "普通",
    teamsLink: room === "Microsoft Teams Meeting" || room.includes("Teams"),
  };
}
