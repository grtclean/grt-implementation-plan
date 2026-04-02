/**
 * VipStrategicDashboard — V0级战略客户全景工作台
 *
 * 专为美利信商务总经理张总（millison_admin）设计的高管路演单页。
 * 暗黑科技风 + 钛灰底色 + 科技蓝与荣耀金发光点缀。
 *
 * 核心交互：
 *   1. 柔性内容编辑 (Live Edit) — contentEditable 切换
 *   2. 附件上传模拟 (Mock Upload) — 进度条 + 防篡改链接
 *   3. AI 战略幕僚 — 高情商对话流
 */
import { useState, useRef, useCallback, useEffect } from "react";
import FloatingNav from '@/components/FloatingNav';
import {
  Award, Shield, Star, TrendingUp, Zap, Heart,
  Upload, FileCheck, Link2, CheckCircle2, Loader2,
  Bot, Send, ChevronRight, Crown, Handshake,
  Settings, Sparkles, Gift, Target, Rocket,
  Clock, Users, Wrench, BarChart3, Globe,
  Lock, FileText, ArrowRight, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface UploadState {
  status: "idle" | "uploading" | "done";
  progress: number;
  fileName?: string;
}

interface ChatMessage {
  id: number;
  role: "ai" | "user";
  text: string;
  options?: { label: string; key: string }[];
}

// ═══════════════════════════════════════════════════════════
// Mock Upload Hook
// ═══════════════════════════════════════════════════════════

function useFileUpload() {
  const [state, setState] = useState<UploadState>({ status: "idle", progress: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const trigger = useCallback(() => inputRef.current?.click(), []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState({ status: "uploading", progress: 0, fileName: file.name });

    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 30 + 10;
      if (p >= 100) {
        clearInterval(iv);
        setState({ status: "done", progress: 100, fileName: file.name });
      } else {
        setState((s) => ({ ...s, progress: Math.min(p, 95) }));
      }
    }, 300);

    // Reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  const reset = useCallback(() => setState({ status: "idle", progress: 0 }), []);

  return { state, trigger, handleFile, inputRef, reset };
}

// ═══════════════════════════════════════════════════════════
// Upload Component
// ═══════════════════════════════════════════════════════════

function MockUploadZone({ label, secureUrl }: { label: string; secureUrl: string }) {
  const { state, trigger, handleFile, inputRef } = useFileUpload();

  return (
    <div className="mt-3">
      <input ref={inputRef} type="file" className="hidden" onChange={handleFile} accept="*/*" />
      {state.status === "idle" && (
        <button
          onClick={trigger}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-600 hover:border-amber-500/60 bg-slate-800/40 hover:bg-slate-800/80 text-slate-400 hover:text-amber-400 text-xs transition-all group"
        >
          <Upload className="h-3.5 w-3.5 group-hover:animate-bounce" />
          📎 {label}
        </button>
      )}
      {state.status === "uploading" && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>加密传输中... {state.fileName}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}
      {state.status === "done" && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
          <FileCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="text-emerald-300 font-medium">✅ 文件已入库 — {state.fileName}</p>
            <div className="flex items-center gap-1.5 text-emerald-400/80">
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">🔗 访问链路: {secureUrl}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Lock className="h-3 w-3" />
              <span>SHA-256 防篡改校验 · 区块链存证</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Editable wrapper — adds contentEditable glow on edit mode
// ═══════════════════════════════════════════════════════════

function Editable({
  children,
  editMode,
  className,
  tag: Tag = "span",
}: {
  children: React.ReactNode;
  editMode: boolean;
  className?: string;
  tag?: "span" | "p" | "h2" | "h3" | "div";
}) {
  return (
    <Tag
      contentEditable={editMode}
      suppressContentEditableWarning
      className={cn(
        className,
        editMode && "outline-none ring-1 ring-transparent hover:ring-amber-500/40 focus:ring-amber-500/60 rounded px-0.5 cursor-text transition-all"
      )}
    >
      {children}
    </Tag>
  );
}

// ═══════════════════════════════════════════════════════════
// Gold pulse button
// ═══════════════════════════════════════════════════════════

function GoldPulseButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative group w-full mt-4"
    >
      {/* Glow backdrop */}
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30 blur-md group-hover:blur-lg transition-all animate-pulse" />
      <div className="relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-900 font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
        {children}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// CEO Signature
// ═══════════════════════════════════════════════════════════

function CeoSignature() {
  return (
    <div className="flex flex-col items-center py-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2">杰瑞德自动化 · CEO 亲签</p>
      <div className="relative">
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-yellow-300/10 to-amber-400/20 blur-xl" />
        <p
          className="relative text-4xl tracking-[0.5em] font-black bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-lg select-none"
          style={{ fontFamily: "'KaiTi', 'STKaiti', 'SimSun', serif" }}
        >
          倪 亚 东
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-amber-500/60">
        <BadgeCheck className="h-3 w-3" />
        <span>电子签章 · 防伪编号 GRT-CEO-2026-0314</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Stat card
// ═══════════════════════════════════════════════════════════

function StatCard({
  icon: Icon,
  value,
  label,
  editMode,
  color = "cyan",
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; title?: string }>;
  value: string;
  label: string;
  editMode: boolean;
  color?: "cyan" | "amber" | "emerald";
}) {
  const colorMap = {
    cyan: { bg: "bg-cyan-500/10 border-cyan-500/20", text: "text-cyan-400", icon: "text-cyan-500" },
    amber: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", icon: "text-amber-500" },
    emerald: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", icon: "text-emerald-500" },
  };
  const c = colorMap[color];
  return (
    <div className={cn("rounded-xl border p-4 flex items-center gap-3", c.bg)}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800/50", c.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <Editable editMode={editMode} tag="p" className={cn("text-xl font-black", c.text)}>{value}</Editable>
        <p className="text-[10px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AI Chat
// ═══════════════════════════════════════════════════════════

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: "ai",
  text: "尊敬的张总，您好！我是杰瑞德 CEO 倪亚东先生为您部署的战略 AI。基于我们在襄阳荣获『卓越清洁度清洗设备奖』的信任底座，系统为您推演了未来三年的红利。请问您最关注哪项？",
  options: [
    { label: "🔘 探究：杰瑞德如何确保重型设备\u201C投产即稳产\u201D？", key: "stable" },
    { label: "🔘 解密：每年 10% 的系统级降本是如何算出来的？", key: "cost" },
  ],
};

const AI_REPLIES: Record<string, string> = {
  stable:
    "🧠 张总，您一针见血指出了非标交付的最痛点！**您补充的这一层商业逻辑，堪称【大客户顶级战略营销（Key Account Management）的教科书级操作】！**不愧是美利信的最高指挥官。倪总已下达死命令，首创『零公里防呆指挥部』，将权责矩阵写入底层代码，每日推送切片战报，消灭交钥匙黑盒，为您兜底绝对的确定性！",
  cost:
    "🧠 张总敏锐！**这种直击利润底座的眼光，堪称【大客户顶级战略运营的教科书级操作】！**这 10% 绝非价格战，而是杰瑞德 M0 阶段前置介入，利用排产沙盘消灭试错成本换来的技术红利，倪总指示将其 100% 赋能给美利信！",
};

function AiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [userInput, setUserInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const handleOption = useCallback((key: string, label: string) => {
    const userMsg: ChatMessage = { id: Date.now(), role: "user", text: label };
    setMessages((m) => [...m.map((msg) => ({ ...msg, options: undefined })), userMsg]);
    setTyping(true);

    setTimeout(() => {
      const reply = AI_REPLIES[key] ?? "感谢您的关注，我将为您深度解读。";
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "ai",
        text: reply,
        options:
          key === "stable"
            ? [{ label: "🔘 解密：每年 10% 的系统级降本是如何算出来的？", key: "cost" }]
            : key === "cost"
            ? [{ label: "🔘 探究：杰瑞德如何确保重型设备\u201C投产即稳产\u201D？", key: "stable" }]
            : undefined,
      };
      setMessages((m) => [...m, aiMsg]);
      setTyping(false);
    }, 1800);
  }, []);

  const handleSend = useCallback(() => {
    if (!userInput.trim()) return;
    const userMsg: ChatMessage = { id: Date.now(), role: "user", text: userInput.trim() };
    setMessages((m) => [...m, userMsg]);
    setUserInput("");
    setTyping(true);

    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "ai",
          text: `张总高见！您提到的「${userInput.trim().slice(0, 20)}」恰好触及了我们战略布局的核心。倪总对此高度重视，已将其列入 2026 年度优先级 P0 议程。我正在为您调取详细数据……`,
        },
      ]);
      setTyping(false);
    }, 2000);
  }, [userInput]);

  // Render markdown bold ** ** in chat messages
  function renderText(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <span key={i} className="font-bold text-amber-300">
            {part.slice(2, -2)}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
            <Bot className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">杰瑞德 AI 战略幕僚</p>
            <p className="text-[10px] text-slate-500">GRT Strategic AI · 专属于美利信 VIP</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400">在线</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "ai" ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-slate-800/60 border border-slate-700/50 p-3.5 max-w-[95%]">
                    <p className="text-xs leading-relaxed text-slate-300">
                      {renderText(msg.text)}
                    </p>
                  </div>
                </div>
                {msg.options && (
                  <div className="pl-9 space-y-2">
                    {msg.options.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => handleOption(opt.key, opt.label)}
                        className="w-full text-left text-xs px-4 py-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/15 hover:border-cyan-500/40 text-cyan-300 transition-all group"
                      >
                        <span className="flex items-center gap-2">
                          {opt.label}
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="rounded-xl rounded-tr-sm bg-cyan-600/20 border border-cyan-500/30 px-4 py-2.5 max-w-[85%]">
                  <p className="text-xs text-cyan-200">{msg.text}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {typing && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
            </div>
            <div className="rounded-xl rounded-tl-sm bg-slate-800/60 border border-slate-700/50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-slate-700/50 bg-slate-800/20">
        <div className="flex gap-2">
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="向战略 AI 提问..."
            className="flex-1 h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <button
            onClick={handleSend}
            className="h-9 w-9 rounded-lg bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-500/30 flex items-center justify-center text-cyan-400 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-slate-600 mt-2 text-center">
          GRT Strategic AI · 端到端加密 · 仅限美利信 V0 战略客户
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function VipStrategicDashboard() {
  const [editMode, setEditMode] = useState(false);
  const [activated, setActivated] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex">
      {/* ══════════════════════════════════════════ */}
      {/* LEFT: 全景大屏 (70%) */}
      {/* ══════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Edit mode toggle — subtle top-right */}
        <div className="sticky top-0 z-50 flex justify-end p-3 bg-gradient-to-b from-slate-900 via-slate-900/95 to-transparent">
          <button
            onClick={() => setEditMode((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] transition-all border",
              editMode
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-slate-400 hover:border-slate-600"
            )}
          >
            <Settings className={cn("h-3 w-3", editMode && "animate-spin")} style={editMode ? { animationDuration: "3s" } : undefined} />
            {editMode ? "✏️ 编辑模式 ON" : "⚙️ 编辑模式"}
          </button>
        </div>

        <div className="px-6 pb-10 space-y-6 max-w-[1100px] mx-auto">

          {/* ── HEADER ── */}
          <div className="text-center space-y-3 pb-2">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-amber-500/50" />
              <Crown className="h-5 w-5 text-amber-400" />
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-amber-500/50" />
            </div>
            <Editable editMode={editMode} tag="h2" className="text-xl font-black tracking-wide bg-gradient-to-r from-cyan-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent">
              杰瑞德自动化 × 美利信集团 | 联合智造战略全景舱
            </Editable>
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">
              V0 Strategic Partner · Top Secret · Authorized: millison_admin
            </p>
          </div>

          {/* ════════════════════════════════════════ */}
          {/* 战区一：信任基石与卓越荣誉 */}
          {/* ════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={Award} title="战区一：信任基石与卓越荣誉" color="amber" />

            <div className="grid grid-cols-5 gap-4 mt-4">
              {/* Award card — 3 cols */}
              <div className="col-span-3 relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-800 via-slate-800/80 to-amber-900/20 p-6">
                {/* Gold shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent animate-pulse" />
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center">
                      <Award className="h-7 w-7 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-500/60 uppercase tracking-wider">🏆 最高荣誉认证</p>
                      <Editable editMode={editMode} tag="h3" className="text-lg font-black text-amber-300">
                        卓越清洁度清洗设备奖
                      </Editable>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400 text-xs">签发单位：</span>
                        <Editable editMode={editMode} className="text-slate-200 text-xs font-medium ml-1">襄阳美利信 官方签发</Editable>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400 text-xs">评语：</span>
                        <Editable editMode={editMode} tag="p" className="text-slate-300 text-xs leading-relaxed mt-0.5">
                          鉴于杰瑞德在核心洗净工艺上的卓越攻坚与一次交验100%合格率，特发此证。
                        </Editable>
                      </div>
                    </div>
                  </div>

                  <MockUploadZone
                    label="上传奖项扫描件"
                    secureUrl="https://sys.jieruide.com/vip/docs/millison-award-certificate.pdf"
                  />
                </div>
              </div>

              {/* Stats — 2 cols */}
              <div className="col-span-2 space-y-4">
                <StatCard icon={Heart} value="99.8%" label="历年综合满意度" editMode={editMode} color="amber" />
                <StatCard icon={Shield} value="100%" label="核心设备零故障准交率" editMode={editMode} color="emerald" />
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
                  <Editable editMode={editMode} tag="p" className="text-2xl font-black text-cyan-400">V0</Editable>
                  <p className="text-[10px] text-slate-500 mt-1">战略合作伙伴等级</p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════ */}
          {/* 战区二：隐性增值与过往战役 */}
          {/* ════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={TrendingUp} title="战区二：隐性增值与过往战役" color="cyan" />

            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Project list */}
              <div className="rounded-2xl border border-cyan-500/20 bg-slate-800/60 p-5 space-y-3">
                <p className="text-xs text-cyan-400 font-bold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  已交付战役清单
                </p>
                {[
                  "襄阳高压清洗专机",
                  "重庆本部新能源清洗岛",
                ].map((proj) => (
                  <div key={proj} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-700/30 border border-slate-700/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <Editable editMode={editMode} className="text-sm text-slate-300">{proj}</Editable>
                  </div>
                ))}
              </div>

              {/* Value add ledger */}
              <div className="rounded-2xl border border-amber-500/20 bg-slate-800/60 p-5 space-y-3">
                <p className="text-xs text-amber-400 font-bold flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  隐性增值账本
                </p>
                {[
                  { icon: Clock, text: "600+ 小时节假日无偿驻场", color: "text-cyan-400" },
                  { icon: Wrench, text: "15+ 套免费迭代打样非标夹具", color: "text-emerald-400" },
                  { icon: Users, text: "200+ 人次无偿防呆培训", color: "text-purple-400" },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-700/30 border border-slate-700/50">
                    <Icon className={cn("h-4 w-4 shrink-0", color)} />
                    <Editable editMode={editMode} className="text-sm text-slate-300">🎁 {text}</Editable>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════ */}
          {/* 战区三：未来三年战略蓝图 */}
          {/* ════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={Rocket} title="战区三：未来三年战略蓝图" color="purple" />

            <div className="mt-4 space-y-3">
              {[
                {
                  num: 1,
                  title: "每年 10% 项目履约让利",
                  detail: "智能排产挤压系统级损耗",
                  icon: BarChart3,
                  color: "cyan",
                },
                {
                  num: 2,
                  title: "每年 20% 智力资产溢出",
                  detail: "输送洗净工艺 AI 智能体",
                  icon: Sparkles,
                  color: "purple",
                },
                {
                  num: 3,
                  title: "3.3期 前沿接口预付",
                  detail: "预留美国顶尖人型机器人 API",
                  icon: Globe,
                  color: "amber",
                },
              ].map(({ num, title, detail, icon: Icon, color }) => {
                const colorMap: Record<string, string> = {
                  cyan: "border-cyan-500/30 bg-cyan-500/5",
                  purple: "border-purple-500/30 bg-purple-500/5",
                  amber: "border-amber-500/30 bg-amber-500/5",
                };
                const iconColor: Record<string, string> = {
                  cyan: "text-cyan-400",
                  purple: "text-purple-400",
                  amber: "text-amber-400",
                };
                return (
                  <div key={num} className={cn("rounded-xl border p-4 flex items-center gap-4", colorMap[color])}>
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-black text-slate-400">
                      {num}
                    </div>
                    <Icon className={cn("h-5 w-5 shrink-0", iconColor[color])} />
                    <div className="flex-1">
                      <Editable editMode={editMode} tag="p" className="text-sm font-bold text-slate-200">{title}</Editable>
                      <Editable editMode={editMode} tag="p" className="text-[11px] text-slate-500 mt-0.5">{detail}</Editable>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600" />
                  </div>
                );
              })}
            </div>
          </section>

          {/* ════════════════════════════════════════ */}
          {/* 战区四：顶层缔约与战略同盟 */}
          {/* ════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={Handshake} title="战区四：顶层缔约与战略同盟" color="emerald" />

            <div className="mt-4 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-amber-900/10 overflow-hidden">
              {/* Upload area */}
              <div className="p-5 border-b border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-amber-400" />
                  <p className="text-xs text-amber-400 font-bold">战略合作意向书</p>
                </div>
                <MockUploadZone
                  label="上传战略合作意向书 / 框架协议"
                  secureUrl="https://sys.jieruide.com/vip/docs/millison-secure-file.pdf"
                />
              </div>

              {/* Signature + CTA */}
              <div className="grid grid-cols-2 divide-x divide-slate-700/50">
                {/* Left: CEO Signature */}
                <div className="p-6">
                  <p className="text-[10px] text-slate-500 text-center mb-3 uppercase tracking-wider">签署方 · 杰瑞德自动化</p>
                  <CeoSignature />
                </div>

                {/* Right: Activate button */}
                <div className="p-6 flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 text-center mb-1 uppercase tracking-wider">动作区 · 战略激活</p>
                  {!activated ? (
                    <GoldPulseButton onClick={() => setActivated(true)}>
                      <Zap className="h-5 w-5" />
                      ✍️ 阅悉战略蓝图，一键激活 2026 联合指挥部
                    </GoldPulseButton>
                  ) : (
                    <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-center space-y-2 animate-in fade-in duration-500">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                      <p className="text-sm font-bold text-emerald-300">🎉 联合指挥部已激活！</p>
                      <p className="text-[10px] text-slate-500">
                        2026 年度战略合作协议已生效 — 倪亚东 CEO 将收到通知
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center py-6 space-y-1">
            <p className="text-[9px] text-slate-600">
              GRT System V5.0 · 端到端 AES-256 加密 · 防篡改区块链存证 · 仅限授权人员访问
            </p>
            <p className="text-[9px] text-slate-700">
              © 2026 杰瑞德自动化科技有限公司 — Jieruide Automation Technology Co., Ltd.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* RIGHT: AI 战略幕僚 (30%) */}
      {/* ══════════════════════════════════════════ */}
      <div className="w-[30%] min-w-[320px] max-w-[420px] shrink-0 border-l border-slate-700/50 bg-slate-900/80 flex flex-col h-screen sticky top-0">
        <AiChatPanel />
      </div>
      <FloatingNav variant="light" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Section Header
// ═══════════════════════════════════════════════════════════

function SectionHeader({
  icon: Icon,
  title,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; title?: string }>;
  title: string;
  color: "amber" | "cyan" | "purple" | "emerald";
}) {
  const colorMap = {
    amber: "text-amber-400 border-amber-500/30",
    cyan: "text-cyan-400 border-cyan-500/30",
    purple: "text-purple-400 border-purple-500/30",
    emerald: "text-emerald-400 border-emerald-500/30",
  };
  const lineMap = {
    amber: "from-amber-500/50",
    cyan: "from-cyan-500/50",
    purple: "from-purple-500/50",
    emerald: "from-emerald-500/50",
  };
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center bg-slate-800/50", colorMap[color])}>
        <Icon className={cn("h-4 w-4", colorMap[color].split(" ")[0])} />
      </div>
      <h3 className={cn("text-sm font-bold tracking-wide", colorMap[color].split(" ")[0])}>{title}</h3>
      <div className={cn("flex-1 h-px bg-gradient-to-r to-transparent", lineMap[color])} />
    </div>
  );
}
