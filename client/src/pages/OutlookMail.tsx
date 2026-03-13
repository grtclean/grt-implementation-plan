/**
 * OutlookMail.tsx — 企业邮箱（Outlook 风格三栏布局）
 *
 * 左栏: 文件夹列表 + 未读 badge
 * 中栏: 邮件列表 + 搜索框（未读高亮）
 * 右栏: 邮件详情 / 撰写模式
 */

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Mail, Inbox, Send, FileText, Trash2, AlertTriangle,
  Search, RefreshCw, PenSquare, Reply, Forward, Trash,
  Paperclip, Star, ChevronLeft, MailOpen, X, Flag,
  ArrowLeft,
} from "lucide-react";

// ============================================
// i18n 文本
// ============================================

const i18n = {
  zh: {
    title: "企业邮箱",
    compose: "写邮件",
    refresh: "刷新",
    search: "搜索邮件...",
    inbox: "收件箱",
    sent: "已发送",
    drafts: "草稿",
    deleted: "已删除",
    junk: "垃圾邮件",
    unread: "未读",
    noMails: "暂无邮件",
    selectMail: "选择一封邮件查看详情",
    from: "发件人",
    to: "收件人",
    cc: "抄送",
    subject: "主题",
    reply: "回复",
    forward: "转发",
    delete: "删除",
    markRead: "标为已读",
    send: "发送",
    cancel: "取消",
    toPlaceholder: "收件人邮箱，多个用逗号分隔",
    ccPlaceholder: "抄送邮箱（可选）",
    subjectPlaceholder: "邮件主题",
    bodyPlaceholder: "请输入邮件内容...",
    replyPlaceholder: "输入回复内容...",
    forwardTo: "转发给",
    forwardPlaceholder: "转发收件人邮箱",
    sending: "发送中...",
    sent_success: "发送成功",
    back: "返回",
    important: "重要",
    flagged: "已标记",
    hasAttachment: "有附件",
    today: "今天",
    yesterday: "昨天",
  },
  en: {
    title: "Enterprise Mail",
    compose: "Compose",
    refresh: "Refresh",
    search: "Search mail...",
    inbox: "Inbox",
    sent: "Sent",
    drafts: "Drafts",
    deleted: "Deleted",
    junk: "Junk",
    unread: "Unread",
    noMails: "No emails",
    selectMail: "Select an email to view details",
    from: "From",
    to: "To",
    cc: "CC",
    subject: "Subject",
    reply: "Reply",
    forward: "Forward",
    delete: "Delete",
    markRead: "Mark as read",
    send: "Send",
    cancel: "Cancel",
    toPlaceholder: "Recipient email(s), comma separated",
    ccPlaceholder: "CC email(s) (optional)",
    subjectPlaceholder: "Subject",
    bodyPlaceholder: "Write your email...",
    replyPlaceholder: "Type your reply...",
    forwardTo: "Forward to",
    forwardPlaceholder: "Forward recipient email",
    sending: "Sending...",
    sent_success: "Sent successfully",
    back: "Back",
    important: "Important",
    flagged: "Flagged",
    hasAttachment: "Attachment",
    today: "Today",
    yesterday: "Yesterday",
  },
};

// ============================================
// 类型
// ============================================

interface MailMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { contentType: string; content: string };
  from: { emailAddress: { name: string; address: string } };
  toRecipients: Array<{ emailAddress: { name: string; address: string } }>;
  ccRecipients?: Array<{ emailAddress: { name: string; address: string } }>;
  receivedDateTime: string;
  sentDateTime: string;
  isRead: boolean;
  importance: "low" | "normal" | "high";
  hasAttachments: boolean;
  flag: { flagStatus: string };
  parentFolderId: string;
  conversationId: string;
}

interface MailFolder {
  id: string;
  displayName: string;
  unreadItemCount: number;
  totalItemCount: number;
}

type ViewMode = "list" | "detail" | "compose" | "reply" | "forward";

// ============================================
// 帮助函数
// ============================================

function formatMailDate(dateStr: string, isEn: boolean): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  if (diff < dayMs && date.getDate() === now.getDate()) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
    return isEn ? "Yesterday" : "昨天";
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const folderIcons: Record<string, React.ReactNode> = {
  inbox: <Inbox className="w-4 h-4" />,
  sentitems: <Send className="w-4 h-4" />,
  drafts: <FileText className="w-4 h-4" />,
  deleteditems: <Trash2 className="w-4 h-4" />,
  junkemail: <AlertTriangle className="w-4 h-4" />,
};

const folderNameMap: Record<string, { zh: string; en: string }> = {
  inbox: { zh: "收件箱", en: "Inbox" },
  sentitems: { zh: "已发送邮件", en: "Sent Items" },
  drafts: { zh: "草稿", en: "Drafts" },
  deleteditems: { zh: "已删除邮件", en: "Deleted Items" },
  junkemail: { zh: "垃圾邮件", en: "Junk Email" },
};

// ============================================
// 文件夹栏组件
// ============================================

function FolderPane({
  folders,
  activeFolder,
  onSelect,
  isEn,
}: {
  folders: MailFolder[];
  activeFolder: string;
  onSelect: (id: string) => void;
  isEn: boolean;
}) {
  return (
    <div className="space-y-1">
      {folders.map((folder) => {
        const isActive = folder.id === activeFolder;
        const localName = folderNameMap[folder.id];
        const displayName = localName ? (isEn ? localName.en : localName.zh) : folder.displayName;
        return (
          <button
            key={folder.id}
            onClick={() => onSelect(folder.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted text-foreground"
            }`}
          >
            {folderIcons[folder.id] ?? <Mail className="w-4 h-4" />}
            <span className="flex-1 text-left truncate">{displayName}</span>
            {folder.unreadItemCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                {folder.unreadItemCount}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// 邮件列表栏组件
// ============================================

function MailListPane({
  messages,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  isEn,
  t,
}: {
  messages: MailMessage[];
  selectedId: string | null;
  onSelect: (msg: MailMessage) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isEn: boolean;
  t: (typeof i18n)["zh"];
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 搜索框 */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.search}
            className="pl-9 h-9"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-2.5"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* 邮件列表 */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MailOpen className="w-10 h-10 mb-2 opacity-40" />
            <span className="text-sm">{t.noMails}</span>
          </div>
        ) : (
          <div className="divide-y">
            {messages.map((msg) => {
              const isActive = msg.id === selectedId;
              return (
                <button
                  key={msg.id}
                  onClick={() => onSelect(msg)}
                  className={`w-full text-left p-3 transition-colors ${
                    isActive
                      ? "bg-primary/10"
                      : !msg.isRead
                        ? "bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        : "hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* 头像 */}
                    <div
                      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                        !msg.isRead ? "bg-blue-500" : "bg-gray-400"
                      }`}
                    >
                      {getInitials(msg.from.emailAddress.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 发件人 + 时间 */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm truncate ${!msg.isRead ? "font-semibold" : "font-normal"}`}
                        >
                          {msg.from.emailAddress.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatMailDate(msg.receivedDateTime, isEn)}
                        </span>
                      </div>

                      {/* 主题 */}
                      <p className={`text-sm truncate ${!msg.isRead ? "font-medium" : "text-muted-foreground"}`}>
                        {msg.subject}
                      </p>

                      {/* 预览 + badges */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate flex-1">
                          {msg.bodyPreview}
                        </p>
                        {msg.importance === "high" && (
                          <span className="text-red-500 flex-shrink-0">
                            <Flag className="w-3 h-3" />
                          </span>
                        )}
                        {msg.hasAttachments && (
                          <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                        {msg.flag.flagStatus === "flagged" && (
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================
// 邮件详情栏组件
// ============================================

function MailDetailPane({
  message,
  onReply,
  onForward,
  onDelete,
  onMarkRead,
  t,
}: {
  message: MailMessage;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
  t: (typeof i18n)["zh"];
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 p-2 border-b">
        <Button variant="ghost" size="sm" onClick={onReply} className="gap-1">
          <Reply className="w-4 h-4" /> {t.reply}
        </Button>
        <Button variant="ghost" size="sm" onClick={onForward} className="gap-1">
          <Forward className="w-4 h-4" /> {t.forward}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1 text-red-500 hover:text-red-600">
          <Trash className="w-4 h-4" /> {t.delete}
        </Button>
        {!message.isRead && (
          <Button variant="ghost" size="sm" onClick={onMarkRead} className="gap-1 ml-auto">
            <MailOpen className="w-4 h-4" /> {t.markRead}
          </Button>
        )}
      </div>

      {/* 邮件头 */}
      <div className="p-4 border-b space-y-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            {getInitials(message.from.emailAddress.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">{message.subject}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium">{message.from.emailAddress.name}</span>
              <span className="text-xs text-muted-foreground">
                &lt;{message.from.emailAddress.address}&gt;
              </span>
              {message.importance === "high" && (
                <Badge variant="destructive" className="text-[10px]">{t.important}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <span>{t.to}: {message.toRecipients.map((r) => r.emailAddress.name).join(", ")}</span>
              {message.ccRecipients && message.ccRecipients.length > 0 && (
                <span className="ml-3">{t.cc}: {message.ccRecipients.map((r) => r.emailAddress.name).join(", ")}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(message.receivedDateTime).toLocaleString()}
              {message.hasAttachments && (
                <span className="ml-2 inline-flex items-center gap-0.5">
                  <Paperclip className="w-3 h-3" /> {t.hasAttachment}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 邮件正文 */}
      <ScrollArea className="flex-1 p-4">
        {message.body.contentType === "HTML" ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: message.body.content }}
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm">{message.body.content}</pre>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================
// 撰写/回复/转发面板
// ============================================

function ComposePane({
  mode,
  originalMessage,
  onSend,
  onCancel,
  isSending,
  t,
}: {
  mode: "compose" | "reply" | "forward";
  originalMessage?: MailMessage | null;
  onSend: (data: { to: string; cc: string; subject: string; body: string }) => void;
  onCancel: () => void;
  isSending: boolean;
  t: (typeof i18n)["zh"];
}) {
  const [to, setTo] = useState(
    mode === "reply" ? originalMessage?.from.emailAddress.address ?? "" : "",
  );
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(
    mode === "reply"
      ? `Re: ${originalMessage?.subject ?? ""}`
      : mode === "forward"
        ? `Fwd: ${originalMessage?.subject ?? ""}`
        : "",
  );
  const [body, setBody] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">
          {mode === "reply" ? t.reply : mode === "forward" ? t.forward : t.compose}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-3 border-b">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium w-12">{t.to}:</label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={mode === "forward" ? t.forwardPlaceholder : t.toPlaceholder}
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium w-12">{t.cc}:</label>
          <Input
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder={t.ccPlaceholder}
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium w-12">{t.subject}:</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t.subjectPlaceholder}
            className="h-8"
          />
        </div>
      </div>

      <div className="flex-1 p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={mode === "reply" ? t.replyPlaceholder : t.bodyPlaceholder}
          className="h-full min-h-[200px] resize-none"
        />
      </div>

      {/* 原始邮件引用 */}
      {originalMessage && (mode === "reply" || mode === "forward") && (
        <div className="px-3 pb-2">
          <Separator className="mb-2" />
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded max-h-[120px] overflow-auto">
            <p className="font-medium mb-1">
              {t.from}: {originalMessage.from.emailAddress.name} &lt;{originalMessage.from.emailAddress.address}&gt;
            </p>
            <p>{originalMessage.bodyPreview}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 border-t">
        <Button
          onClick={() => onSend({ to, cc, subject, body })}
          disabled={isSending || !to.trim() || !subject.trim()}
          className="gap-1"
        >
          <Send className="w-4 h-4" />
          {isSending ? t.sending : t.send}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export default function OutlookMail() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = isEn ? i18n.en : i18n.zh;

  // 状态
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mobileView, setMobileView] = useState<"folders" | "list" | "detail">("list");

  // tRPC 查询
  const inboxQuery = trpc.microsoftGraph.mail.getInbox.useQuery(
    { top: 50, skip: 0 },
    { refetchInterval: 60000 },
  );
  const foldersQuery = trpc.microsoftGraph.mail.getFolders.useQuery(undefined, {
    staleTime: 300000,
  });
  const searchMailQuery = trpc.microsoftGraph.mail.searchMail.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 },
  );

  // mutations
  const sendMailMut = trpc.microsoftGraph.mail.sendMail.useMutation();
  const replyMailMut = trpc.microsoftGraph.mail.replyMail.useMutation();
  const forwardMailMut = trpc.microsoftGraph.mail.forwardMail.useMutation();
  const markReadMut = trpc.microsoftGraph.mail.markAsRead.useMutation();
  const deleteMailMut = trpc.microsoftGraph.mail.deleteMail.useMutation();

  // 数据
  const folders = (foldersQuery.data?.folders ?? []) as unknown as MailFolder[];
  const messages = (searchQuery.length >= 2
    ? (searchMailQuery.data?.messages ?? [])
    : (inboxQuery.data?.messages ?? [])) as unknown as MailMessage[];

  // handlers
  const handleSelectMessage = useCallback((msg: MailMessage) => {
    setSelectedMessage(msg);
    setViewMode("detail");
    setMobileView("detail");
    if (!msg.isRead) {
      markReadMut.mutate({ messageId: msg.id });
    }
  }, [markReadMut]);

  const handleSend = useCallback(async (data: { to: string; cc: string; subject: string; body: string }) => {
    setIsSending(true);
    try {
      if (viewMode === "reply" && selectedMessage) {
        await replyMailMut.mutateAsync({
          messageId: selectedMessage.id,
          comment: data.body,
        });
      } else if (viewMode === "forward" && selectedMessage) {
        const toList = data.to.split(",").map((e) => e.trim()).filter(Boolean);
        await forwardMailMut.mutateAsync({
          messageId: selectedMessage.id,
          to: toList.map((email) => ({ email })),
          comment: data.body,
        });
      } else {
        const toList = data.to.split(",").map((e) => e.trim()).filter(Boolean);
        const ccList = data.cc ? data.cc.split(",").map((e) => e.trim()).filter(Boolean) : [];
        await sendMailMut.mutateAsync({
          to: toList.map((email) => ({ email })),
          cc: ccList.length > 0 ? ccList.map((email) => ({ email })) : undefined,
          subject: data.subject,
          body: data.body,
        });
      }
      setViewMode("list");
      setSelectedMessage(null);
      inboxQuery.refetch();
    } finally {
      setIsSending(false);
    }
  }, [viewMode, selectedMessage, sendMailMut, replyMailMut, forwardMailMut, inboxQuery]);

  const handleDelete = useCallback(() => {
    if (!selectedMessage) return;
    deleteMailMut.mutate({ messageId: selectedMessage.id });
    setSelectedMessage(null);
    setViewMode("list");
    setMobileView("list");
    inboxQuery.refetch();
  }, [selectedMessage, deleteMailMut, inboxQuery]);

  const handleMarkRead = useCallback(() => {
    if (!selectedMessage) return;
    markReadMut.mutate({ messageId: selectedMessage.id });
  }, [selectedMessage, markReadMut]);

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.isRead).length,
    [messages],
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold">{t.title}</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} {t.unread}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setViewMode("compose");
              setSelectedMessage(null);
              setMobileView("detail");
            }}
            className="gap-1"
          >
            <PenSquare className="w-4 h-4" />
            <span className="hidden sm:inline">{t.compose}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inboxQuery.refetch()}
            disabled={inboxQuery.isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${inboxQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 三栏主体 — 桌面端 */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* 左栏: 文件夹 */}
        <div className="w-48 border-r p-2 flex-shrink-0">
          <FolderPane
            folders={folders}
            activeFolder={activeFolder}
            onSelect={(id) => {
              setActiveFolder(id);
              setSelectedMessage(null);
              setViewMode("list");
            }}
            isEn={isEn}
          />
        </div>

        {/* 中栏: 邮件列表 */}
        <div className="w-80 border-r flex-shrink-0 flex flex-col overflow-hidden">
          <MailListPane
            messages={messages}
            selectedId={selectedMessage?.id ?? null}
            onSelect={handleSelectMessage}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isEn={isEn}
            t={t}
          />
        </div>

        {/* 右栏: 详情/撰写 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === "compose" || viewMode === "reply" || viewMode === "forward" ? (
            <ComposePane
              mode={viewMode}
              originalMessage={selectedMessage}
              onSend={handleSend}
              onCancel={() => {
                setViewMode(selectedMessage ? "detail" : "list");
              }}
              isSending={isSending}
              t={t}
            />
          ) : selectedMessage ? (
            <MailDetailPane
              message={selectedMessage}
              onReply={() => setViewMode("reply")}
              onForward={() => setViewMode("forward")}
              onDelete={handleDelete}
              onMarkRead={handleMarkRead}
              t={t}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Mail className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">{t.selectMail}</p>
            </div>
          )}
        </div>
      </div>

      {/* 移动端单栏 */}
      <div className="flex-1 md:hidden flex flex-col overflow-hidden">
        {mobileView === "list" && (
          <>
            {/* 文件夹横滚 */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-b overflow-x-auto scrollbar-hide">
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    f.id === activeFolder
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {folderNameMap[f.id] ? (isEn ? folderNameMap[f.id].en : folderNameMap[f.id].zh) : f.displayName}
                  {f.unreadItemCount > 0 && (
                    <span className="ml-1 text-[10px]">({f.unreadItemCount})</span>
                  )}
                </button>
              ))}
            </div>
            <MailListPane
              messages={messages}
              selectedId={null}
              onSelect={handleSelectMessage}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isEn={isEn}
              t={t}
            />
          </>
        )}

        {mobileView === "detail" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-2 py-1 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMobileView("list");
                  setViewMode("list");
                  setSelectedMessage(null);
                }}
                className="gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> {t.back}
              </Button>
            </div>
            {viewMode === "compose" || viewMode === "reply" || viewMode === "forward" ? (
              <ComposePane
                mode={viewMode}
                originalMessage={selectedMessage}
                onSend={handleSend}
                onCancel={() => {
                  setMobileView("list");
                  setViewMode("list");
                }}
                isSending={isSending}
                t={t}
              />
            ) : selectedMessage ? (
              <MailDetailPane
                message={selectedMessage}
                onReply={() => setViewMode("reply")}
                onForward={() => setViewMode("forward")}
                onDelete={handleDelete}
                onMarkRead={handleMarkRead}
                t={t}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
