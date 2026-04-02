// server/services/microsoft-graph/calendar.service.ts
// 日程服务 - 连接 Microsoft Outlook 日历

import { graphConfig, graphRequest, isGraphConfigured } from "./config";
import type { AgendaEvent } from "@shared/types/grt-system";

// Graph API 日历事件类型
interface GraphCalendarEvent {
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
  isAllDay: boolean;
  importance: string;
  showAs: string;
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    status: {
      response: string;
    };
  }>;
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
}

interface GraphCalendarResponse {
  value: GraphCalendarEvent[];
}

// 获取今日日程
export async function getTodayEvents(userId?: string): Promise<AgendaEvent[]> {
  if (!isGraphConfigured()) {
    return getMockEvents();
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const endpoint = `${graphConfig.endpoints.calendar}?$filter=start/dateTime ge '${startOfDay}' and start/dateTime le '${endOfDay}'&$orderby=start/dateTime`;
  
  const response = await graphRequest<GraphCalendarResponse>(endpoint);
  
  if (!response) {
    return getMockEvents();
  }

  return response.value.map(transformGraphEvent);
}

// 获取本周日程
export async function getWeekEvents(userId?: string): Promise<AgendaEvent[]> {
  if (!isGraphConfigured()) {
    return getMockEvents();
  }

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const endpoint = `${graphConfig.endpoints.calendar}?$filter=start/dateTime ge '${startOfWeek.toISOString()}' and start/dateTime le '${endOfWeek.toISOString()}'&$orderby=start/dateTime`;
  
  const response = await graphRequest<GraphCalendarResponse>(endpoint);
  
  if (!response) {
    return getMockEvents();
  }

  return response.value.map(transformGraphEvent);
}

// 创建日程事件
export async function createEvent(event: Partial<AgendaEvent>): Promise<AgendaEvent | null> {
  if (!isGraphConfigured()) {
    return null;
  }

  const graphEvent = {
    subject: event.title,
    start: {
      dateTime: event.startTime,
      timeZone: "Asia/Shanghai",
    },
    end: {
      dateTime: event.endTime,
      timeZone: "Asia/Shanghai",
    },
    location: event.location ? { displayName: event.location } : undefined,
    isAllDay: event.isAllDay || false,
  };

  const response = await graphRequest<GraphCalendarEvent>(graphConfig.endpoints.calendar, {
    method: "POST",
    body: JSON.stringify(graphEvent),
  });

  if (!response) {
    return null;
  }

  return transformGraphEvent(response);
}

// 转换 Graph API 事件为应用事件格式
function transformGraphEvent(graphEvent: GraphCalendarEvent): AgendaEvent {
  return {
    id: graphEvent.id,
    title: graphEvent.subject,
    startTime: graphEvent.start.dateTime,
    endTime: graphEvent.end.dateTime,
    location: graphEvent.location?.displayName,
    isAllDay: graphEvent.isAllDay,
    type: determineEventType(graphEvent),
    attendees: graphEvent.attendees?.map(a => ({
      name: a.emailAddress.name,
      email: a.emailAddress.address,
      status: a.status.response as 'accepted' | 'declined' | 'tentative' | 'pending',
    })),
    organizer: graphEvent.organizer ? {
      name: graphEvent.organizer.emailAddress.name,
      email: graphEvent.organizer.emailAddress.address,
    } : undefined,
    importance: graphEvent.importance as 'low' | 'normal' | 'high',
  };
}

// 根据事件内容判断类型
function determineEventType(event: GraphCalendarEvent): AgendaEvent['type'] {
  const subject = event.subject.toLowerCase();
  
  if (subject.includes('meeting') || subject.includes('会议')) {
    return 'meeting';
  }
  if (subject.includes('deadline') || subject.includes('截止') || subject.includes('due')) {
    return 'deadline';
  }
  if (subject.includes('reminder') || subject.includes('提醒')) {
    return 'reminder';
  }
  if (subject.includes('task') || subject.includes('任务')) {
    return 'task';
  }
  
  return 'event';
}

// 模拟数据（当 Graph API 未配置时使用）
function getMockEvents(): AgendaEvent[] {
  const today = new Date();
  const formatTime = (hours: number, minutes: number = 0) => {
    const date = new Date(today);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  };

  return [
    {
      id: "mock-1",
      title: "项目启动会议",
      startTime: formatTime(9, 0),
      endTime: formatTime(10, 0),
      location: "会议室A",
      type: "meeting",
      isAllDay: false,
      importance: "high",
      attendees: [
        { name: "杨勇", email: "yangyong@grt.com", status: "accepted" },
        { name: "洪香龙", email: "hongxl@grt.com", status: "tentative" },
      ],
    },
    {
      id: "mock-2",
      title: "设计评审截止",
      startTime: formatTime(12, 0),
      endTime: formatTime(12, 0),
      type: "deadline",
      isAllDay: false,
      importance: "high",
    },
    {
      id: "mock-3",
      title: "客户电话会议",
      startTime: formatTime(14, 0),
      endTime: formatTime(15, 0),
      location: "线上 - Teams",
      type: "meeting",
      isAllDay: false,
      importance: "normal",
    },
    {
      id: "mock-4",
      title: "周报提交",
      startTime: formatTime(17, 0),
      endTime: formatTime(17, 0),
      type: "reminder",
      isAllDay: false,
      importance: "normal",
    },
  ];
}

export const calendarService = {
  getTodayEvents,
  getWeekEvents,
  createEvent,
};
