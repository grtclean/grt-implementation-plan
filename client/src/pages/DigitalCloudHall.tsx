/**
 * Digital Cloud Hall — 数字云厅 (/digital-cloud-hall)
 *
 * Immersive dark-themed dual-mode UI for field sales ↔ HQ leadership video sessions.
 * - Sales Mode: slide context panel + video container + call button
 * - Leadership Mode: incoming call queue + video container
 *
 * Core requirement: video crash must NEVER take down the GRT system.
 * ErrorBoundary isolates the VideoContainer; all mutations wrapped in try/catch.
 */
import { useState, useEffect, useRef, useCallback, Component, type ReactNode, type ErrorInfo } from "react";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneIncoming,
  Monitor,
  Wifi,
  WifiOff,
  Clock,
  Users,
  MapPin,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Package,
  History,
  Sparkles,
  RefreshCw,
  Globe,
  RotateCw,
  Box,
} from "lucide-react";
import GlobalServiceDashboard from "./GlobalServiceDashboard";

// ─── Constants ──────────────────────────────────────────────

const SALES_ROLES = ["bu_sales", "cs_engineer", "bu_pm", "employee"];
const LEADERSHIP_ROLES = ["director", "bu_gm", "admin", "dept_manager"];

const DEMO_PRODUCTS = [
  { id: 1, name: "UC-3000 超声波清洗机", category: "ultrasonic", desc: "多槽超声波清洗系统，适用于精密零件" },
  { id: 2, name: "SP-5000 高压喷淋清洗机", category: "spray", desc: "工业级高压喷淋清洗线" },
  { id: 3, name: "IM-2000 浸没式清洗线", category: "immersion", desc: "全自动浸没清洗解决方案" },
  { id: 4, name: "CB-8000 组合式清洗系统", category: "combination", desc: "超声波+喷淋组合型清洗机" },
  { id: 5, name: "VD-1200 真空干燥机", category: "drying", desc: "高效真空干燥系统" },
];

const DEMO_LEADERS = [
  { userId: 2, name: "王总 (事业部总经理)", role: "bu_gm" },
  { userId: 4, name: "赵总监 (技术总监)", role: "director" },
  { userId: 6, name: "刘总 (副总经理)", role: "director" },
];

const STATUS_CONFIG: Record<string, { color: string; label: string; pulse?: boolean }> = {
  waiting: { color: "bg-amber-500", label: "等待中", pulse: true },
  ringing: { color: "bg-blue-500", label: "呼叫中", pulse: true },
  connecting: { color: "bg-blue-400", label: "连接中", pulse: true },
  active: { color: "bg-emerald-500", label: "通话中" },
  ended: { color: "bg-gray-500", label: "已结束" },
  failed: { color: "bg-red-500", label: "连接失败" },
};

const QUALITY_CONFIG: Record<string, { icon: typeof Wifi; color: string; label: string }> = {
  excellent: { icon: Wifi, color: "text-emerald-400", label: "信号极佳" },
  good: { icon: Wifi, color: "text-green-400", label: "信号良好" },
  fair: { icon: Wifi, color: "text-amber-400", label: "信号一般" },
  poor: { icon: Wifi, color: "text-red-400", label: "信号较差" },
  disconnected: { icon: WifiOff, color: "text-red-500", label: "已断开" },
};

// ─── Video Error Boundary (isolated crash containment) ──────

interface VideoFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

function VideoFallback({ error, onRetry }: VideoFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black/40 rounded-xl border border-red-500/30 p-8">
      <VideoOff className="w-12 h-12 text-red-400 mb-4" />
      <h3 className="text-white font-semibold mb-2">视频组件异常</h3>
      <p className="text-white/50 text-sm mb-4 text-center max-w-xs">
        视频模块遇到意外错误，但不影响系统其他功能。
        {error?.message && (
          <span className="block mt-1 text-xs text-red-400/70 font-mono">
            {error.message.slice(0, 120)}
          </span>
        )}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
        重试视频
      </button>
    </div>
  );
}

interface VEBProps {
  children: ReactNode;
}
interface VEBState {
  hasError: boolean;
  error: Error | null;
}

class VideoErrorBoundary extends Component<VEBProps, VEBState> {
  state: VEBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<VEBState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CloudHall] Video component crashed:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <VideoFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

// ─── Skeleton Loader ────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="min-h-screen p-6" style={{ background: "radial-gradient(circle at 35% 35%, #0a3d6b 0%, #001a33 50%, #000d1a 100%)" }}>
      <Skeleton className="h-14 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-12" />
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-96" />
        </div>
      </div>
      <Skeleton className="h-32 mt-6" />
    </div>
  );
}

// ─── Session Status Bar ─────────────────────────────────────

interface StatusBarProps {
  session: any | null;
  elapsed: number;
}

function SessionStatusBar({ session, elapsed }: StatusBarProps) {
  const status = session?.status ?? "waiting";
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting;
  const quality = session?.connectionQuality;
  const qCfg = quality ? QUALITY_CONFIG[quality] : null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 mb-6">
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`} />
        <span className="text-white font-medium">{cfg.label}</span>
        {session?.sessionCode && (
          <Badge variant="outline" className="text-white/60 border-white/20 text-xs">
            {session.sessionCode}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-4">
        {qCfg && (
          <div className="flex items-center gap-1.5">
            <qCfg.icon className={`w-4 h-4 ${qCfg.color}`} />
            <span className={`text-xs ${qCfg.color}`}>{qCfg.label}</span>
          </div>
        )}
        {(status === "active" || status === "connecting") && (
          <div className="flex items-center gap-1.5 text-white/60">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">{formatTime(elapsed)}</span>
          </div>
        )}
        {session?.customerName && (
          <div className="flex items-center gap-1.5 text-white/50 text-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span>{session.customerName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Video Container (WebRTC placeholder) ───────────────────

interface VideoContainerProps {
  session: any | null;
  notes: string;
  onNotesChange: (v: string) => void;
  slideContext: any | null;
}

function VideoContainer({ session, notes, onNotesChange, slideContext }: VideoContainerProps) {
  const status = session?.status;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Video area */}
      <div className="relative flex-1 min-h-[300px] bg-black/60 flex items-center justify-center">
        {/* Remote video placeholder */}
        <div
          id="cloud-hall-video-remote"
          className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
            status === "active" ? "border-2 border-emerald-500/50 rounded-lg m-1" : ""
          } ${status === "active" ? "animate-[pulse_3s_ease-in-out_infinite]" : ""}`}
        >
          {status === "active" ? (
            <div className="text-center">
              <Video className="w-16 h-16 text-emerald-400/40 mx-auto mb-3" />
              <p className="text-white/40 text-sm">远端视频 — SDK 集成预留区</p>
              <p className="text-white/20 text-xs mt-1">WebRTC / Agora / Daily.co 接入</p>
            </div>
          ) : status === "connecting" || status === "ringing" ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-spin" />
              <p className="text-white/50 text-sm">正在建立连接...</p>
            </div>
          ) : (
            <div className="text-center">
              <Monitor className="w-16 h-16 text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm">等待视频连接</p>
            </div>
          )}
        </div>

        {/* Local video preview (PIP) */}
        <div
          id="cloud-hall-video-local"
          className="absolute bottom-3 right-3 w-32 h-24 bg-black/80 border border-white/20 rounded-lg flex items-center justify-center"
        >
          <Video className="w-6 h-6 text-white/30" />
        </div>

        {/* Slide context overlay */}
        {slideContext && status === "active" && (
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
            <p className="text-cyan-300 text-xs font-medium">{slideContext.slideTitle}</p>
            {slideContext.productName && (
              <p className="text-white/40 text-xs mt-0.5">{slideContext.productName}</p>
            )}
          </div>
        )}
      </div>

      {/* Notes input */}
      <div className="p-3 border-t border-white/10">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="会话笔记... (记录客户需求、关键问题)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm placeholder:text-white/30 resize-none h-16 focus:outline-none focus:border-cyan-500/50"
        />
      </div>
    </div>
  );
}

// ─── Slide Context Panel (Sales Mode) ───────────────────────

interface SlidePanelProps {
  activeProduct: number | null;
  onSelectProduct: (idx: number) => void;
  currentContext: any | null;
}

function SlideContextPanel({ activeProduct, onSelectProduct, currentContext }: SlidePanelProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 h-full flex flex-col">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Package className="w-4 h-4 text-cyan-300" />
        产品方案展示
      </h3>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {DEMO_PRODUCTS.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => onSelectProduct(idx)}
            className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
              activeProduct === idx
                ? "bg-cyan-500/20 border-cyan-500/40 text-white"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            <div className="font-medium text-sm">{p.name}</div>
            <div className="text-xs mt-1 text-white/40">{p.desc}</div>
            <Badge variant="outline" className="mt-2 text-xs border-white/20 text-white/50">
              {p.category}
            </Badge>
          </button>
        ))}
      </div>

      {currentContext && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-white/40 mb-1">当前同步上下文</p>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
            <p className="text-cyan-300 text-sm font-medium">{currentContext.slideTitle}</p>
            {currentContext.productName && (
              <p className="text-white/50 text-xs mt-0.5">{currentContext.productName}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Leadership Inbox (Leadership Mode) ─────────────────────

interface InboxProps {
  onJoin: (sessionId: number) => void;
  onReject: (sessionId: number) => void;
}

function LeadershipInbox({ onJoin, onReject }: InboxProps) {
  const ringingQuery = trpc.cloudHall.listSessions.useQuery(
    { status: "ringing", limit: 20, offset: 0 },
    { refetchInterval: 5000 }
  );

  const items = Array.isArray(ringingQuery.data?.items) ? ringingQuery.data.items : [];

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 h-full flex flex-col">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <PhoneIncoming className="w-4 h-4 text-amber-300" />
        来电队列
        {items.length > 0 && (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs ml-auto">
            {items.length} 通来电
          </Badge>
        )}
      </h3>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {ringingQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        )}

        {!ringingQuery.isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-white/30">
            <Phone className="w-10 h-10 mb-3" />
            <p className="text-sm">暂无来电</p>
            <p className="text-xs mt-1">来电会实时显示在这里</p>
          </div>
        )}

        {items.map((session: any) => (
          <div
            key={session.id}
            className="bg-white/5 border border-amber-500/20 rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-medium text-sm">
                  {session.initiatorName ?? "未知来电"}
                </p>
                <p className="text-white/40 text-xs">{session.initiatorRole}</p>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                来电中
              </Badge>
            </div>
            {session.customerName && (
              <p className="text-white/50 text-xs mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> {session.customerName}
              </p>
            )}
            {session.customerSite && (
              <p className="text-white/50 text-xs mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {session.customerSite}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => onJoin(session.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                接听
              </button>
              <button
                onClick={() => onReject(session.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg text-sm transition-colors cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                拒绝
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Session History ────────────────────────────────────────

interface HistoryProps {
  userId?: number;
  isLeader: boolean;
}

function SessionHistory({ userId, isLeader }: HistoryProps) {
  const [expanded, setExpanded] = useState(false);

  const historyQuery = trpc.cloudHall.listSessions.useQuery(
    {
      ...(isLeader ? { leadershipUserId: userId } : { initiatorUserId: userId }),
      limit: 10,
      offset: 0,
    },
    { refetchInterval: 10000 }
  );

  const items = Array.isArray(historyQuery.data?.items) ? historyQuery.data.items : [];

  const formatDuration = (sec?: number) => {
    if (!sec) return "--";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${s}秒`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-white/60 hover:text-white/80 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <History className="w-4 h-4" />
          会话历史 ({historyQuery.data?.total ?? 0})
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-5 py-3">
          {historyQuery.isLoading && <Skeleton className="h-20" />}

          {!historyQuery.isLoading && items.length === 0 && (
            <p className="text-white/30 text-sm py-4 text-center">暂无历史会话</p>
          )}

          <div className="space-y-2">
            {items.map((s: any) => {
              const sCfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.ended;
              return (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${sCfg.color}`} />
                    <div>
                      <span className="text-white/70 text-sm">{s.sessionCode}</span>
                      <span className="text-white/40 text-xs ml-2">{s.customerName ?? "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-white/50 border-white/20 text-xs">
                      {sCfg.label}
                    </Badge>
                    <span className="text-white/40 text-xs">{formatDuration(s.sessionDurationSec)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Asset Gallery — 3D Product Showcase ─────────────────────

function AssetGallery() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveIdx(p => (p + 1) % DEMO_PRODUCTS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mb-6">
      <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center gap-2">
        <Box className="w-4 h-4 text-cyan-400" />
        3D 资产库
      </h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {DEMO_PRODUCTS.map((product, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={product.id}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 w-36 rounded-xl border p-3 transition-all duration-500 cursor-pointer ${
                isActive
                  ? "bg-cyan-500/15 border-cyan-500/40 shadow-lg shadow-cyan-500/10 scale-105"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
              style={{
                transform: isActive ? "perspective(600px) rotateY(-5deg) scale(1.05)" : "perspective(600px) rotateY(0deg)",
                transition: "transform 0.6s ease, background 0.3s, border-color 0.3s",
              }}
            >
              <div className={`w-full h-16 rounded-lg mb-2 flex items-center justify-center ${
                isActive ? "bg-cyan-500/20" : "bg-white/5"
              }`}>
                <RotateCw className={`w-6 h-6 ${isActive ? "text-cyan-300 animate-spin" : "text-white/20"}`} style={{ animationDuration: "4s" }} />
              </div>
              <div className="text-xs text-white/80 font-medium truncate">{product.name}</div>
              <div className="text-[10px] text-white/40 truncate">{product.category}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────

export default function DigitalCloudHall() {
  const { currentUserRole } = useUserProfile();
  const { t } = useLanguage();

  // Dual-module toggle: showcase (existing) vs service (global service dashboard)
  const [activeModule, setActiveModule] = useState<"showcase" | "service">("showcase");

  // Read query param for deep-linking: ?module=service
  useEffect(() => {
    if (window.location.search.includes("module=service")) setActiveModule("service");
  }, []);

  // Determine mode
  const isLeader = LEADERSHIP_ROLES.includes(currentUserRole);
  const isSales = !isLeader; // default to sales if unknown role

  // Session state
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [activeProduct, setActiveProduct] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showLeaderSelect, setShowLeaderSelect] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tRPC queries & mutations
  const sessionQuery = trpc.cloudHall.getSessionState.useQuery(
    { sessionId: activeSessionId! },
    {
      enabled: !!activeSessionId,
      refetchInterval: activeSessionId ? 3000 : false,
    }
  );

  const createSession = trpc.cloudHall.createSession.useMutation();
  const inviteLeadership = trpc.cloudHall.inviteLeadership.useMutation();
  const joinSession = trpc.cloudHall.joinSession.useMutation();
  const updateSlide = trpc.cloudHall.updateSlideContext.useMutation();
  const heartbeat = trpc.cloudHall.heartbeat.useMutation();
  const endSessionMut = trpc.cloudHall.endSession.useMutation();
  const seedDemo = trpc.cloudHall.seedDemo.useMutation();

  const session = sessionQuery.data;

  // Simulate page load
  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (session?.status === "active") {
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (session?.status !== "active") setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status]);

  // Heartbeat
  useEffect(() => {
    if (activeSessionId && session?.status === "active") {
      heartbeatRef.current = setInterval(() => {
        try {
          heartbeat.mutate({ sessionId: activeSessionId, connectionQuality: "good" });
        } catch {
          // Heartbeat failure is non-fatal — just log
          console.warn("[CloudHall] Heartbeat failed");
        }
      }, 10000);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [activeSessionId, session?.status]);

  // ─── Sales actions ────

  const handleCreateSession = useCallback(async () => {
    try {
      const result = await createSession.mutateAsync({
        initiatorName: "当前用户",
        initiatorRole: currentUserRole,
        initiatorDevice: "laptop",
        customerName: "客户现场",
      });
      setActiveSessionId(result.id);
      setShowLeaderSelect(true);
      toast.success("会话已创建，请选择呼叫对象");
    } catch (err: any) {
      toast.error("创建会话失败: " + (err?.message ?? "未知错误"));
    }
  }, [createSession, currentUserRole]);

  const handleInviteLeader = useCallback(async (leader: typeof DEMO_LEADERS[0]) => {
    if (!activeSessionId) return;
    try {
      await inviteLeadership.mutateAsync({
        sessionId: activeSessionId,
        leadershipUserId: leader.userId,
        leadershipName: leader.name,
        leadershipRole: leader.role,
      });
      setShowLeaderSelect(false);
      toast.success(`正在呼叫 ${leader.name}...`);
    } catch (err: any) {
      toast.error("呼叫失败: " + (err?.message ?? "未知错误"));
    }
  }, [activeSessionId, inviteLeadership]);

  const handleSelectProduct = useCallback(async (idx: number) => {
    setActiveProduct(idx);
    if (!activeSessionId) return;
    const product = DEMO_PRODUCTS[idx];
    if (!product) return;
    try {
      await updateSlide.mutateAsync({
        sessionId: activeSessionId,
        slideContext: {
          slideIndex: idx,
          slideTitle: product.name,
          productId: product.id,
          productName: product.name,
          productCategory: product.category,
        },
      });
    } catch (err: any) {
      toast.error("同步幻灯片失败: " + (err?.message ?? "未知错误"));
    }
  }, [activeSessionId, updateSlide]);

  // ─── Leadership actions ────

  const handleJoinSession = useCallback(async (sessionId: number) => {
    try {
      await joinSession.mutateAsync({ sessionId });
      setActiveSessionId(sessionId);
      toast.success("已接听，通话开始");
    } catch (err: any) {
      toast.error("接听失败: " + (err?.message ?? "未知错误"));
    }
  }, [joinSession]);

  const handleRejectSession = useCallback(async (sessionId: number) => {
    try {
      await endSessionMut.mutateAsync({ sessionId, reason: "rejected" });
      toast.info("已拒绝来电");
    } catch (err: any) {
      toast.error("拒绝失败: " + (err?.message ?? "未知错误"));
    }
  }, [endSessionMut]);

  // ─── Shared actions ────

  const handleEndSession = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await endSessionMut.mutateAsync({
        sessionId: activeSessionId,
        reason: "normal",
        notes: notes || undefined,
      });
      setActiveSessionId(null);
      setActiveProduct(null);
      setNotes("");
      setElapsed(0);
      toast.success("会话已结束");
    } catch (err: any) {
      toast.error("结束会话失败: " + (err?.message ?? "未知错误"));
    }
  }, [activeSessionId, endSessionMut, notes]);

  const handleSeedDemo = useCallback(async () => {
    try {
      await seedDemo.mutateAsync();
      toast.success("演示数据已填充");
    } catch (err: any) {
      toast.error("填充失败: " + (err?.message ?? "未知错误"));
    }
  }, [seedDemo]);

  // ─── Slide context from session ────
  const slideContext = session?.currentSlideContext as any | null;

  // ─── Render ────

  if (!pageReady) return <PageSkeleton />;

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{
        background: "radial-gradient(circle at 35% 35%, #0a3d6b 0%, #001a33 50%, #000d1a 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Video className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">数字云厅</h1>
            <p className="text-white/40 text-xs">
              {isLeader ? "领导端 — 远程支援接入" : "现场端 — 一键呼叫总部"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/10 text-white/60 border-white/20 text-xs">
            {isLeader ? "Leadership Mode" : "Sales Mode"}
          </Badge>
          <button
            onClick={handleSeedDemo}
            disabled={seedDemo.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white/60 hover:text-white/80 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            填充演示数据
          </button>
          {activeSessionId && (session?.status === "active" || session?.status === "ringing") && (
            <button
              onClick={handleEndSession}
              disabled={endSessionMut.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <PhoneOff className="w-4 h-4" />
              结束通话
            </button>
          )}
        </div>
      </div>

      {/* Module Toggle Bar */}
      <div className="flex gap-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveModule("showcase")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeModule === "showcase"
              ? "bg-cyan-600/80 text-white shadow-lg shadow-cyan-500/20"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          <Video className="w-4 h-4" />
          数字云厅
        </button>
        <button
          onClick={() => setActiveModule("service")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeModule === "service"
              ? "bg-cyan-600/80 text-white shadow-lg shadow-cyan-500/20"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          <Globe className="w-4 h-4" />
          全球客服系统
        </button>
      </div>

      {activeModule === "showcase" ? (
        <>
          {/* Status Bar */}
          <SessionStatusBar session={session} elapsed={elapsed} />

          {/* 3D Asset Gallery */}
          <AssetGallery />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Panel */}
            <div className="lg:col-span-2">
              {isSales ? (
                <div className="h-full flex flex-col">
                  <SlideContextPanel
                    activeProduct={activeProduct}
                    onSelectProduct={handleSelectProduct}
                    currentContext={slideContext}
                  />

                  {/* Call button */}
                  {!activeSessionId && (
                    <button
                      onClick={handleCreateSession}
                      disabled={createSession.isPending}
                      className="mt-4 w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-lg font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                    >
                      {createSession.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <PhoneCall className="w-5 h-5" />
                      )}
                      呼叫总部支援
                    </button>
                  )}

                  {/* Leader selection dropdown */}
                  {showLeaderSelect && (
                    <div className="mt-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <p className="text-white/60 text-sm mb-3">选择呼叫对象:</p>
                      <div className="space-y-2">
                        {DEMO_LEADERS.map((leader) => (
                          <button
                            key={leader.userId}
                            onClick={() => handleInviteLeader(leader)}
                            disabled={inviteLeadership.isPending}
                            className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 rounded-lg text-white/80 text-sm transition-all cursor-pointer disabled:opacity-50"
                          >
                            <span className="font-medium">{leader.name}</span>
                            <span className="text-white/40 text-xs ml-2">({leader.role})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <LeadershipInbox onJoin={handleJoinSession} onReject={handleRejectSession} />
              )}
            </div>

            {/* Right Panel — Video */}
            <div className="lg:col-span-3">
              <VideoErrorBoundary>
                <VideoContainer
                  session={session}
                  notes={notes}
                  onNotesChange={setNotes}
                  slideContext={slideContext}
                />
              </VideoErrorBoundary>
            </div>
          </div>

          {/* Session History */}
          <SessionHistory userId={0} isLeader={isLeader} />
        </>
      ) : (
        <GlobalServiceDashboard />
      )}
    </div>
  );
}
