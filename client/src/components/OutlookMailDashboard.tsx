/**
 * OutlookMailDashboard.tsx — 邮件摘要 widget
 *
 * 嵌入个人门户(MeEngine / PersonalizedPortal)的邮件概览组件：
 * - 4个指标卡: 未读/今日收件/待回复(已标记)/重要
 * - 最近5封未读邮件预览
 * - "查看全部"跳转 /outlook-mail
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Mail, MailOpen, Flag, AlertTriangle, ExternalLink, Paperclip,
} from "lucide-react";

function formatShortTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return mins < 1 ? "刚刚" : `${mins}分钟前`;
  }
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function OutlookMailDashboard() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [, navigate] = useLocation();

  const inboxQuery = trpc.microsoftGraph.mail.getInbox.useQuery(
    { top: 20, skip: 0 },
    { refetchInterval: 120000, staleTime: 60000 },
  );
  const unreadQuery = trpc.microsoftGraph.mail.getUnreadCount.useQuery(undefined, {
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const messages = inboxQuery.data?.messages ?? [];
  const unreadCount = unreadQuery.data?.count ?? messages.filter((m: any) => !m.isRead).length;

  // 计算指标
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMessages = messages.filter(
    (m: any) => new Date(m.receivedDateTime).getTime() >= todayStart.getTime(),
  );
  const flaggedMessages = messages.filter((m: any) => m.flag?.flagStatus === "flagged");
  const importantMessages = messages.filter((m: any) => m.importance === "high");
  const recentUnread = messages.filter((m: any) => !m.isRead).slice(0, 5);

  const stats = [
    {
      label: isEn ? "Unread" : "未读邮件",
      value: unreadCount,
      icon: Mail,
      color: "text-blue-500",
    },
    {
      label: isEn ? "Today" : "今日收件",
      value: todayMessages.length,
      icon: MailOpen,
      color: "text-green-500",
    },
    {
      label: isEn ? "Flagged" : "待回复",
      value: flaggedMessages.length,
      icon: Flag,
      color: "text-amber-500",
    },
    {
      label: isEn ? "Important" : "重要邮件",
      value: importantMessages.length,
      icon: AlertTriangle,
      color: "text-red-500",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            <CardTitle className="text-sm font-semibold">
              {isEn ? "Outlook Mail" : "企业邮箱"}
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/outlook-mail")}
            className="gap-1 text-xs"
          >
            <ExternalLink className="w-3 h-3" />
            {isEn ? "View All" : "查看全部"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 4个指标卡 */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center p-2 rounded-lg bg-muted/50"
            >
              <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
              <span className="text-lg font-bold">{s.value}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* 最近未读邮件 */}
        {recentUnread.length > 0 && (
          <ScrollArea className="max-h-[180px]">
            <div className="space-y-1">
              {recentUnread.map((msg: any) => (
                <button
                  key={msg.id}
                  onClick={() => navigate("/outlook-mail")}
                  className="w-full text-left p-2 rounded-md hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {msg.from?.emailAddress?.name?.charAt(0) ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">
                          {msg.from?.emailAddress?.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {formatShortTime(msg.receivedDateTime)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {msg.subject}
                      </p>
                    </div>
                    {msg.hasAttachments && (
                      <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {recentUnread.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <MailOpen className="w-8 h-8 mx-auto mb-1 opacity-30" />
            {isEn ? "All caught up!" : "所有邮件已读"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
