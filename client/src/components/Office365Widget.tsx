/**
 * GRT 5.0 Office 365 工作区组件
 *
 * 集成 Microsoft Graph API 数据：
 * - Teams 最新消息列表
 * - Outlook 今日日历事件
 * - 快捷操作 (新建会议、发消息、查看邮件)
 *
 * 使用 tRPC microsoftGraph router 获取数据
 * 支持 mock fallback（Graph API未配置时显示示例数据）
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Calendar, MessageSquare, Mail, Video, Clock, User,
  ExternalLink, RefreshCw, Send, Plus, AlertCircle,
} from "lucide-react";

// ============================================
// Mock数据 (Graph API未配置时使用)
// ============================================

const mockTeamsMessages = [
  {
    id: "1",
    chatName: "GRT项目组",
    senderName: "赵工",
    content: "M3阶段评审资料已上传到SharePoint，请大家查看",
    sentAt: new Date(Date.now() - 15 * 60000).toISOString(),
    isRead: false,
  },
  {
    id: "2",
    chatName: "BU4半导体团队",
    senderName: "陈工",
    content: "新版BOM已提交审批，请李工确认",
    sentAt: new Date(Date.now() - 45 * 60000).toISOString(),
    isRead: false,
  },
  {
    id: "3",
    chatName: "采购协调群",
    senderName: "张工",
    content: "供应商反馈交期延迟3天，已更新采购计划",
    sentAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    isRead: true,
  },
  {
    id: "4",
    chatName: "王工",
    senderName: "王工",
    content: "现场调试遇到问题，需要远程支援",
    sentAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    isRead: true,
  },
  {
    id: "5",
    chatName: "IT支持",
    senderName: "IT Help Desk",
    content: "GRT系统将于今晚22:00进行维护升级",
    sentAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    isRead: true,
  },
];

const mockCalendarEvents = [
  {
    id: "1",
    subject: "项目周例会",
    start: "2026-02-12T09:00:00",
    end: "2026-02-12T10:00:00",
    location: "会议室A301",
    isOnlineMeeting: true,
    organizer: "赵工",
    importance: "high",
  },
  {
    id: "2",
    subject: "BOM评审会议",
    start: "2026-02-12T14:00:00",
    end: "2026-02-12T15:30:00",
    location: "Teams在线",
    isOnlineMeeting: true,
    organizer: "李工",
    importance: "normal",
  },
  {
    id: "3",
    subject: "客户方案讨论",
    start: "2026-02-12T16:00:00",
    end: "2026-02-12T17:00:00",
    location: "会议室B201",
    isOnlineMeeting: false,
    organizer: "陈工",
    importance: "normal",
  },
];

// ============================================
// Helper functions
// ============================================

function formatTimeAgo(dateStr: string, isEn: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isEn ? "Just now" : "刚刚";
  if (mins < 60) return isEn ? `${mins}m ago` : `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isEn ? `${hours}h ago` : `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return isEn ? `${days}d ago` : `${days}天前`;
}

function formatEventTime(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(s)} - ${fmt(e)}`;
}

function isEventNow(start: string, end: string): boolean {
  const now = Date.now();
  return now >= new Date(start).getTime() && now <= new Date(end).getTime();
}

function isEventUpcoming(start: string): boolean {
  const diff = new Date(start).getTime() - Date.now();
  return diff > 0 && diff < 30 * 60000; // 30分钟内
}

// ============================================
// 子组件: Teams消息列表
// ============================================

function TeamsMessages({
  messages,
  isEn,
}: {
  messages: typeof mockTeamsMessages;
  isEn: boolean;
}) {
  return (
    <ScrollArea className="h-[280px]">
      <div className="space-y-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer ${
              !msg.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {msg.senderName.charAt(0)}
                </div>
                <span className="text-sm font-medium">{msg.chatName}</span>
                {!msg.isRead && (
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(msg.sentAt, isEn)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground ml-9 line-clamp-1">
              <span className="font-medium text-foreground">{msg.senderName}:</span>{" "}
              {msg.content}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================
// 子组件: 日历事件列表
// ============================================

function CalendarEvents({
  events,
  isEn,
}: {
  events: typeof mockCalendarEvents;
  isEn: boolean;
}) {
  return (
    <ScrollArea className="h-[280px]">
      <div className="space-y-2">
        {events.map((event) => {
          const now = isEventNow(event.start, event.end);
          const upcoming = isEventUpcoming(event.start);

          return (
            <div
              key={event.id}
              className={`p-3 rounded-lg border ${
                now
                  ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                  : upcoming
                    ? "border-orange-400 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-transparent bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{event.subject}</span>
                <div className="flex items-center gap-1">
                  {now && (
                    <Badge className="bg-green-500 text-white text-xs">
                      {isEn ? "NOW" : "进行中"}
                    </Badge>
                  )}
                  {upcoming && !now && (
                    <Badge variant="outline" className="text-orange-600 border-orange-400 text-xs">
                      {isEn ? "Soon" : "即将开始"}
                    </Badge>
                  )}
                  {event.isOnlineMeeting && (
                    <Video className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatEventTime(event.start, event.end)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {event.organizer}
                </span>
              </div>
              {event.location && (
                <p className="text-xs text-muted-foreground mt-1">{event.location}</p>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ============================================
// 主组件
// ============================================

export default function Office365Widget() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [activeTab, setActiveTab] = useState("teams");

  // 尝试从Microsoft Graph API获取数据
  const calendarQuery = (trpc.microsoftGraph as any).getTodayEvents.useQuery(undefined, {
    retry: false,
    refetchInterval: 5 * 60000, // 5分钟刷新
  });

  const teamsQuery = (trpc.microsoftGraph as any).getChats.useQuery(
    { limit: 10 },
    { retry: false, refetchInterval: 2 * 60000 }
  );

  // 使用API数据或mock数据
  const calendarEvents = calendarQuery.data?.events || mockCalendarEvents;
  const teamsMessages = teamsQuery.data?.chats
    ? teamsQuery.data.chats.map((chat: any) => ({
        id: chat.id,
        chatName: chat.topic || chat.chatType,
        senderName: chat.lastMessagePreview?.from?.user?.displayName || "",
        content: chat.lastMessagePreview?.body?.content || "",
        sentAt: chat.lastMessagePreview?.createdDateTime || new Date().toISOString(),
        isRead: false,
      }))
    : mockTeamsMessages;

  const isUsingMockData = !calendarQuery.data && !teamsQuery.data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">365</span>
            </div>
            <div>
              <CardTitle className="text-base">
                {isEn ? "Office 365" : "Office 365 工作区"}
              </CardTitle>
              {isUsingMockData && (
                <CardDescription className="text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {isEn ? "Demo mode — configure Graph API in settings" : "演示模式 — 请在设置中配置Graph API"}
                </CardDescription>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              calendarQuery.refetch();
              teamsQuery.refetch();
            }}
            disabled={calendarQuery.isFetching || teamsQuery.isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${(calendarQuery.isFetching || teamsQuery.isFetching) ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="teams" className="flex-1 gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Teams
              {teamsMessages.filter((m: any) => !m.isRead).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {teamsMessages.filter((m: any) => !m.isRead).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {isEn ? "Calendar" : "日历"}
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {calendarEvents.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="mt-3">
            <TeamsMessages messages={teamsMessages} isEn={isEn} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-3">
            <CalendarEvents events={calendarEvents} isEn={isEn} />
          </TabsContent>
        </Tabs>

        <Separator className="my-3" />

        {/* 快捷操作 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1">
            <Plus className="w-3.5 h-3.5" />
            {isEn ? "New Meeting" : "新建会议"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1">
            <Send className="w-3.5 h-3.5" />
            {isEn ? "Send Message" : "发消息"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1">
            <Mail className="w-3.5 h-3.5" />
            {isEn ? "Outlook" : "邮件"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
