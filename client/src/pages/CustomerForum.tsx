/**
 * CustomerForum — 客户技术论坛
 * Route: /customer/forum (STANDALONE)
 * 默认中文，右上角可切换 English
 */
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  MessageSquare, ArrowLeft, Send, ThumbsUp, Eye, Clock,
  Plus, ChevronRight, Languages, LogOut, Sparkles,
  Shield, CheckCircle2, AlertTriangle, Loader2,
} from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "wouter";

type Lang = "zh" | "en";
const LANG_KEY = "grt_customer_lang";

const T = {
  zh: {
    title: "GRT 技术论坛",
    subtitle: "产品技术交流平台",
    switchLang: "EN",
    signOut: "退出",
    back: "返回工作台",
    stats: { topics: "话题", comments: "评论", myTopics: "我的发帖" },
    tabs: { all: "全部", qa: "产品问答", tech: "技术讨论", knowledge: "知识分享" },
    newTopic: "发布新话题",
    titleLabel: "标题",
    titlePh: "输入话题标题...",
    contentLabel: "内容",
    contentPh: "分享您的技术问题、使用经验或行业见解...",
    typeLabel: "类型",
    types: { tech_forum: "技术讨论", product_qa: "产品问答", discussion: "自由讨论", knowledge: "知识分享" },
    publish: "发布",
    cancel: "取消",
    reply: "回复",
    replyPh: "输入您的回复...",
    sendReply: "发送",
    noTopics: "暂无话题，成为第一个发帖的人！",
    loading: "加载中...",
    official: "GRT 官方",
    customer: "客户",
    views: "浏览",
    likes: "赞",
    comments: "评论",
    backToList: "返回列表",
    sensitive: "内容包含敏感词，已被过滤",
    copyright: "© 2026 GRT · 技术论坛 · 无锡 · 斯图加特 · 底特律",
  },
  en: {
    title: "GRT Tech Forum",
    subtitle: "Product & Technology Exchange",
    switchLang: "中文",
    signOut: "Sign Out",
    back: "Back to Workspace",
    stats: { topics: "Topics", comments: "Comments", myTopics: "My Posts" },
    tabs: { all: "All", qa: "Product Q&A", tech: "Tech Discussion", knowledge: "Knowledge" },
    newTopic: "New Topic",
    titleLabel: "Title",
    titlePh: "Enter topic title...",
    contentLabel: "Content",
    contentPh: "Share your technical questions, experience, or industry insights...",
    typeLabel: "Type",
    types: { tech_forum: "Tech Discussion", product_qa: "Product Q&A", discussion: "Open Discussion", knowledge: "Knowledge Sharing" },
    publish: "Publish",
    cancel: "Cancel",
    reply: "Reply",
    replyPh: "Type your reply...",
    sendReply: "Send",
    noTopics: "No topics yet — be the first to post!",
    loading: "Loading...",
    official: "GRT Official",
    customer: "Customer",
    views: "views",
    likes: "likes",
    comments: "comments",
    backToList: "Back to list",
    sensitive: "Content contains sensitive words and was filtered",
    copyright: "© 2026 GRT · Tech Forum · Wuxi · Stuttgart · Detroit",
  },
};

const TAB_TYPES: Record<string, string | undefined> = {
  all: undefined,
  qa: "product_qa",
  tech: "tech_forum",
  knowledge: "knowledge",
};

function timeAgo(date: string | Date, zh: boolean): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return zh ? "刚刚" : "just now";
  if (mins < 60) return zh ? `${mins}分钟前` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return zh ? `${hrs}小时前` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return zh ? `${days}天前` : `${days}d ago`;
}

export default function CustomerForum() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "zh");
  const zh = lang === "zh";
  const t = T[lang];
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const replyRef = useRef<HTMLInputElement>(null);

  const toggleLang = () => { const n = zh ? "en" : "zh"; setLang(n); localStorage.setItem(LANG_KEY, n); };

  // Queries
  const statsQ = trpc.community.forum.getForumStats.useQuery(undefined, { retry: false });
  const topicsQ = trpc.community.forum.listTopics.useQuery(
    { page: 1, pageSize: 30, postType: TAB_TYPES[activeTab] },
    { retry: false }
  );
  const detailQ = trpc.community.forum.getTopicDetail.useQuery(
    { postId: selectedPostId! },
    { enabled: view === "detail" && selectedPostId !== null, retry: false }
  );

  // Mutations
  const createTopic = trpc.community.forum.createTopic.useMutation({
    onSuccess: () => { setShowNewForm(false); topicsQ.refetch(); statsQ.refetch(); },
  });
  const createComment = trpc.community.forum.createComment.useMutation({
    onSuccess: () => { setReplyTo(null); detailQ.refetch(); topicsQ.refetch(); },
  });
  const likeTopic = trpc.community.forum.likeTopic.useMutation({
    onSuccess: () => { if (view === "detail") detailQ.refetch(); topicsQ.refetch(); },
  });

  const openDetail = (id: number) => { setSelectedPostId(id); setView("detail"); };
  const backToList = () => { setView("list"); setSelectedPostId(null); };

  const handleCreateTopic = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createTopic.mutate({
      title: (fd.get("title") as string)?.trim() || "",
      content: (fd.get("content") as string)?.trim() || "",
      postType: (fd.get("postType") as any) || "tech_forum",
    });
  };

  const handleReply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const content = (fd.get("reply") as string)?.trim();
    if (!content || !selectedPostId) return;
    createComment.mutate({ postId: selectedPostId, content, parentId: replyTo ?? undefined });
    e.currentTarget.reset();
  };

  const stats = statsQ.data;

  return (
    <div className="min-h-screen bg-[#faf9f8] pb-20" style={{ fontFamily: "'Segoe UI', 'PingFang SC', system-ui, sans-serif", WebkitFontSmoothing: "antialiased" as any }}>

      {/* Header */}
      <div className="bg-white border-b border-[#edebe9] px-4 pt-5 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <img src="/GRTlogo.gif" alt="GRT" className="w-9 h-9 rounded-lg" />
              <div>
                <div className="text-base font-bold leading-tight">{t.title}</div>
                <div className="text-[10px] text-[#605e5c]">{t.subtitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleLang} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#edebe9] hover:bg-[#f3f2f1] text-[11px] text-[#605e5c]">
                <Languages className="h-3 w-3" />{t.switchLang}
              </button>
              <Link href="/customer-workspace" className="px-2 py-1 rounded-lg border border-[#edebe9] hover:bg-[#f3f2f1] text-[11px] text-[#605e5c]">
                {t.back}
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="flex gap-4 text-center">
              {[
                { n: stats.totalTopics, l: t.stats.topics },
                { n: stats.totalComments, l: t.stats.comments },
                { n: stats.myTopics, l: t.stats.myTopics },
              ].map(s => (
                <div key={s.l} className="flex-1 py-2 rounded-lg bg-white border border-[#edebe9]">
                  <div className="text-lg font-bold text-[#0078d4]">{s.n}</div>
                  <div className="text-[10px] text-[#605e5c]">{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <>
            {/* Tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {Object.entries(t.tabs).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === key ? "bg-[#0078d4]/20 text-[#0078d4] border border-sky-500/30" : "text-[#605e5c] hover:text-[#323130] border border-[#edebe9]"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setShowNewForm(!showNewForm)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#0078d4] text-white flex items-center gap-1 ml-auto shrink-0"
              >
                <Plus className="h-3 w-3" />{t.newTopic}
              </button>
            </div>

            {/* New topic form */}
            {showNewForm && (
              <Card className="bg-white border-[#edebe9] shadow-none">
                <CardContent className="pt-4 pb-4">
                  <form onSubmit={handleCreateTopic} className="space-y-3">
                    <div>
                      <label className="text-[10px] text-[#605e5c]">{t.titleLabel}</label>
                      <Input name="title" required placeholder={t.titlePh} className="bg-white border-[#8a8886] text-[#323130] placeholder:text-[#a19f9d] text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#605e5c]">{t.contentLabel}</label>
                      <textarea name="content" required rows={4} placeholder={t.contentPh}
                        className="w-full rounded-md bg-white border border-[#8a8886] text-[#323130] placeholder:text-[#a19f9d] text-sm p-2.5 outline-none resize-none focus:border-[#0078d4]" />
                    </div>
                    <div className="flex items-center gap-3">
                      <select name="postType" defaultValue="tech_forum"
                        className="bg-white border border-[#8a8886] text-[#323130] text-xs rounded-md px-2 py-1.5 outline-none">
                        {Object.entries(t.types).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <div className="flex-1" />
                      <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)} className="text-[#605e5c] text-xs h-8">{t.cancel}</Button>
                      <Button type="submit" disabled={createTopic.isPending} className="bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs h-8">
                        {createTopic.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                        {t.publish}
                      </Button>
                    </div>
                    {createTopic.error && (
                      <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />{createTopic.error.message}
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Topic list */}
            {topicsQ.isLoading ? (
              <div className="text-center py-12 text-[#605e5c] text-sm">{t.loading}</div>
            ) : !topicsQ.data?.items.length ? (
              <div className="text-center py-12 text-[#a19f9d] text-sm">{t.noTopics}</div>
            ) : (
              <div className="space-y-2">
                {topicsQ.data.items.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => openDetail(topic.id)}
                    className="w-full text-left p-3.5 rounded-xl border border-[#edebe9] bg-white hover:bg-[#f3f2f1] transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      {topic.isPinned && <Badge className="bg-amber-500/20 text-[#d83b01] border-0 text-[9px]">PIN</Badge>}
                      {!topic.contentClean && <Badge className="bg-red-500/20 text-red-400 border-0 text-[9px]">!</Badge>}
                      <h3 className="text-sm font-medium text-[#323130] flex-1 line-clamp-1">{topic.title}</h3>
                      <ChevronRight className="h-4 w-4 text-[#a19f9d] shrink-0 mt-0.5" />
                    </div>
                    <p className="text-[11px] text-[#605e5c] line-clamp-2 mb-2">{topic.content}</p>
                    <div className="flex items-center gap-3 text-[10px] text-[#a19f9d]">
                      <span className="font-medium text-[#605e5c]">
                        {(topic as any).authorName}
                        {(topic as any).authorType === "customer" && (topic as any).authorCompany && ` · ${(topic as any).authorCompany}`}
                      </span>
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{timeAgo(topic.createdAt, zh)}</span>
                      <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{topic.viewCount}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{topic.likeCount}</span>
                      <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{topic.commentCount}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === "detail" && detailQ.data?.post && (
          <>
            <button onClick={backToList} className="flex items-center gap-1.5 text-xs text-[#0078d4] hover:text-[#106ebe] mb-2">
              <ArrowLeft className="h-3.5 w-3.5" />{t.backToList}
            </button>

            {/* Post */}
            <Card className="bg-white border-[#edebe9] shadow-none">
              <CardContent className="pt-4 pb-4">
                <h2 className="text-lg font-bold text-[#323130] mb-2">{detailQ.data.post.title}</h2>
                <div className="flex items-center gap-2 mb-3 text-[11px] text-[#605e5c]">
                  <span className="font-medium text-[#323130]">{detailQ.data.post.name}</span>
                  {detailQ.data.post.userType !== "customer" && (
                    <Badge className="bg-[#0078d4]/20 text-[#0078d4] border-0 text-[9px]">{t.official}</Badge>
                  )}
                  {detailQ.data.post.company && <span>· {detailQ.data.post.company}</span>}
                  <span>· {timeAgo(detailQ.data.post.createdAt, zh)}</span>
                </div>
                <div className="text-sm text-[#323130] leading-relaxed whitespace-pre-wrap mb-3">
                  {detailQ.data.post.content}
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-[#edebe9] text-[11px] text-[#605e5c]">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{detailQ.data.post.viewCount} {t.views}</span>
                  <button
                    onClick={() => likeTopic.mutate({ postId: detailQ.data!.post.id })}
                    className="flex items-center gap-1 hover:text-[#0078d4] transition-colors"
                  >
                    <ThumbsUp className="h-3 w-3" />{detailQ.data.post.likeCount} {t.likes}
                  </button>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{detailQ.data.post.commentCount} {t.comments}</span>
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <div className="space-y-2">
              {detailQ.data.comments.map(c => (
                <div key={c.id} className={`p-3 rounded-xl border border-[#edebe9] bg-[#f3f2f1] ${c.parentId ? "ml-6" : ""}`}>
                  <div className="flex items-center gap-2 mb-1 text-[11px]">
                    <span className="font-medium text-[#323130]">{c.authorName}</span>
                    {c.authorType !== "customer" && (
                      <Badge className="bg-[#0078d4]/20 text-[#0078d4] border-0 text-[9px]">{t.official}</Badge>
                    )}
                    {c.authorType === "customer" && c.authorCompany && (
                      <span className="text-[#a19f9d]">· {c.authorCompany}</span>
                    )}
                    <span className="text-[#a19f9d]">· {timeAgo(c.createdAt, zh)}</span>
                  </div>
                  <p className="text-xs text-[#605e5c] leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  {!c.parentId && (
                    <button
                      onClick={() => { setReplyTo(c.id); setTimeout(() => replyRef.current?.focus(), 100); }}
                      className="text-[10px] text-[#0078d4]/60 hover:text-[#0078d4] mt-1.5 flex items-center gap-0.5"
                    >
                      <MessageSquare className="h-2.5 w-2.5" />{t.reply}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Reply form */}
            <form onSubmit={handleReply} className="flex gap-2 items-center">
              <Input
                ref={replyRef}
                name="reply"
                required
                placeholder={replyTo ? `${t.reply}...` : t.replyPh}
                className="flex-1 bg-white border-[#8a8886] text-[#323130] placeholder:text-[#a19f9d] text-xs h-9"
              />
              {replyTo && (
                <button type="button" onClick={() => setReplyTo(null)} className="text-[10px] text-[#605e5c] hover:text-[#323130]">
                  {t.cancel}
                </button>
              )}
              <Button type="submit" disabled={createComment.isPending} className="bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs h-9 px-3">
                {createComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </form>
            {createComment.error && (
              <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />{createComment.error.message}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/95 backdrop-blur border border-[#edebe9] shadow-lg">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#0078d4] hover:bg-[#f3f2f1] transition-colors">
          {zh ? "回顶部" : "Top"}
        </button>
        <Link href="/customer-workspace" className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#8764b8] hover:bg-[#f3f2f1] transition-colors">
          {zh ? "工作台" : "Workspace"}
        </Link>
        <a href="/showcase/new-energy" target="_blank" rel="noopener" className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#107c10] hover:bg-[#f3f2f1] transition-colors">
          {zh ? "新能源" : "NEV"}
        </a>
        <Link href="/showcase-hub" className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#d83b01] hover:bg-[#f3f2f1] transition-colors">
          {zh ? "展示中枢" : "Hub"}
        </Link>
      </nav>
    </div>
  );
}
