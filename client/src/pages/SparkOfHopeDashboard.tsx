/**
 * SparkOfHopeDashboard — 星火大屏 & 奋斗者殿堂
 *
 * 暗夜深空黑底 + 工业激光蓝 + 警示橙
 * framer-motion 硬件加速动画 (GPU transform only)
 *
 * Layout:
 *   CEO 寄语 Banner
 *   ├── 左 8 cols: 全球前线战报 (Terminal + 打字机 stagger)
 *   └── 右 4 cols: 奋斗者殿堂 (3D 勋章卡片)
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Flame,
  Globe,
  MapPin,
  Award,
  Sparkles,
  Terminal,
  ChevronRight,
  Star,
  Clock,
  Zap,
} from "lucide-react";

const Q = { retry: false, refetchOnWindowFocus: false } as const;

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const HIGHLIGHT_REGEX = /(?:美国查特|Chart|现场|验收|FAT|SAT|完美运行|极值|零排放|合规|99\.7%|突破|标杆|一次通过|52°C|里程碑|Acceptance|Certificate)/g;

const MEDAL_CONFIG = {
  GOLD: {
    bg: "from-amber-500/20 via-yellow-500/10 to-amber-600/20",
    border: "border-amber-500/50",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
    icon: "text-amber-400",
    label: "GOLD",
  },
  SILVER: {
    bg: "from-slate-300/15 via-gray-400/10 to-slate-500/15",
    border: "border-slate-400/50",
    text: "text-slate-300",
    glow: "shadow-slate-400/20",
    icon: "text-slate-300",
    label: "SILVER",
  },
  BRONZE: {
    bg: "from-orange-700/15 via-orange-600/10 to-orange-800/15",
    border: "border-orange-600/40",
    text: "text-orange-400",
    glow: "shadow-orange-500/15",
    icon: "text-orange-400",
    label: "BRONZE",
  },
} as const;

const FEED_TYPE_BADGE: Record<string, { color: string; label: string }> = {
  MILESTONE: { color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", label: "MILESTONE" },
  DAILY: { color: "bg-slate-500/20 text-slate-300 border-slate-500/30", label: "DAILY" },
  ALERT: { color: "bg-red-500/20 text-red-300 border-red-500/30", label: "ALERT" },
  CELEBRATION: { color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "CELEBRATION" },
};

const LOCATION_FLAGS: Record<string, string> = {
  US: "🇺🇸", DE: "🇩🇪", CN: "🇨🇳", SA: "🇸🇦", JP: "🇯🇵", KR: "🇰🇷", FR: "🇫🇷",
};

// ═══════════════════════════════════════════════════════════
// Animation variants
// ═══════════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const feedItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
};

const medalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 250, damping: 20 },
  },
};

const bannerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function highlightText(text: string): React.ReactNode[] {
  const parts = text.split(HIGHLIGHT_REGEX);
  const matches = text.match(HIGHLIGHT_REGEX) ?? [];

  const result: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) result.push(<span key={`t-${i}`}>{part}</span>);
    if (matches[i]) {
      result.push(
        <span key={`h-${i}`} className="text-cyan-400 font-bold">
          {matches[i]}
        </span>,
      );
    }
  });
  return result;
}

function getFlag(location: string): string {
  const prefix = location.split("-")[0];
  return LOCATION_FLAGS[prefix] ?? "🌍";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

/** CEO 寄语横幅 */
function CeoBanner({ quote }: { quote: string }) {
  return (
    <motion.div
      variants={bannerVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-lg border border-cyan-900/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950"
    >
      {/* Scan line effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.03] via-transparent to-cyan-500/[0.03]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="relative px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Flame className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-500/60">
              SPARK OF HOPE — 星火大屏
            </p>
            <p className="text-sm font-medium text-slate-300 mt-0.5">
              全球前线战报 & 奋斗者殿堂
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 italic font-light tracking-wide hidden md:block">
          "{quote}" —— GRT 奋斗者宣言
        </p>
      </div>
    </motion.div>
  );
}

/** 单条战报 */
function FeedItem({ feed, index }: {
  feed: {
    id: number;
    projectName: string | null;
    location: string;
    feedMessage: string;
    feedType: string;
    importance: string;
    reportedBy: string | null;
    createdAt: string;
  };
  index: number;
}) {
  const badge = FEED_TYPE_BADGE[feed.feedType] ?? FEED_TYPE_BADGE.DAILY;
  const isHigh = feed.importance === "high";

  return (
    <motion.div
      variants={feedItemVariants}
      className={`group relative p-4 rounded-lg border transition-all duration-200
        ${isHigh
          ? "border-cyan-500/20 bg-cyan-950/20 hover:border-cyan-500/40 hover:bg-cyan-950/30"
          : "border-slate-700/50 bg-slate-900/30 hover:border-slate-600/50 hover:bg-slate-800/30"
        }`}
    >
      {/* Terminal line number */}
      <div className="absolute top-4 left-0 w-8 text-right">
        <span className="text-[10px] font-mono text-slate-600">{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className="pl-6">
        {/* Header: location + badge + time */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-base">{getFlag(feed.location)}</span>
          <span className="text-xs font-mono text-cyan-400/80 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {feed.location}
          </span>
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${badge.color}`}>
            {badge.label}
          </Badge>
          {isHigh && (
            <Zap className="h-3 w-3 text-amber-400 animate-pulse" />
          )}
          <span className="ml-auto text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(feed.createdAt)}
          </span>
        </div>

        {/* Message with keyword highlighting */}
        <p className="text-sm text-slate-300 leading-relaxed">
          {feed.projectName && (
            <span className="text-cyan-400/70 font-mono text-xs mr-1.5">[{feed.projectName}]</span>
          )}
          {highlightText(feed.feedMessage)}
        </p>

        {/* Reporter */}
        {feed.reportedBy && (
          <p className="text-[10px] text-slate-500 mt-2 font-mono">
            <ChevronRight className="h-2.5 w-2.5 inline mr-0.5" />
            {feed.reportedBy}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/** 勋章卡片 */
function MedalCard({ striver }: {
  striver: {
    id: number;
    userName: string;
    achievementTitle: string;
    medalLevel: string;
    storySummary: string | null;
    awardedAt: string;
    buCode: string | null;
  };
}) {
  const config = MEDAL_CONFIG[striver.medalLevel as keyof typeof MEDAL_CONFIG] ?? MEDAL_CONFIG.BRONZE;

  return (
    <motion.div
      variants={medalVariants}
      whileHover={{ rotateY: 5, scale: 1.02 }}
      style={{ transformStyle: "preserve-3d", perspective: 800 }}
      className={`group relative p-4 rounded-xl border bg-gradient-to-br ${config.bg} ${config.border}
        shadow-lg ${config.glow} hover:shadow-xl transition-shadow duration-300 cursor-default`}
    >
      {/* Medal icon */}
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-full bg-slate-900/60 border ${config.border}`}>
          <Award className={`h-5 w-5 ${config.icon}`} />
        </div>
        <Badge variant="outline" className={`text-[10px] font-mono ${config.text} border-current`}>
          {config.label}
        </Badge>
      </div>

      {/* Name */}
      <h4 className="text-base font-bold text-white mb-1">{striver.userName}</h4>

      {/* Title */}
      <p className={`text-sm font-medium ${config.text} mb-2`}>
        <Star className="h-3 w-3 inline mr-1" />
        {striver.achievementTitle}
      </p>

      {/* Story (revealed on hover) */}
      <div className="overflow-hidden">
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
          {striver.storySummary}
        </p>
      </div>

      {/* BU tag */}
      {striver.buCode && (
        <p className="text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-wider">
          BU: {striver.buCode}
        </p>
      )}
    </motion.div>
  );
}

/** 科技扫描 Skeleton */
function ScanSkeleton({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="relative overflow-hidden rounded-lg">
          <Skeleton className="h-20 w-full bg-slate-800/50" />
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/[0.06] to-transparent animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function SparkOfHopeDashboard() {
  const { language, t } = useLanguage();
  const isZh = language === "zh";

  const { data, isLoading } = trpc.culture.getSparkDashboardData.useQuery(undefined, {
    ...Q,
    refetchInterval: 60_000,
  });

  const feeds = useMemo(() => data?.feeds ?? [], [data]);
  const strivers = useMemo(() => data?.strivers ?? [], [data]);
  const ceoQuote = data?.ceoQuote ?? "努力工作，掌控自己的人生。";

  return (
    <div className="space-y-4 bg-slate-950 rounded-xl p-4 md:p-6 border border-slate-800/50">
      {/* CEO Banner */}
      <CeoBanner quote={ceoQuote} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Left: 全球前线战报 ──────────────────────────── */}
        <div className="lg:col-span-8">
          <Card className="bg-slate-900/50 border-slate-700/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  {isZh ? "全球前线战报" : "Global Frontline Live"}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-wider">
                    Live
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ScanSkeleton lines={5} />
              ) : feeds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Globe className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">{isZh ? "暂无前线战报" : "No frontline feeds"}</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide"
                >
                  {feeds.map((feed, i) => (
                    <FeedItem key={feed.id} feed={feed} index={i} />
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: 奋斗者殿堂 ──────────────────────────── */}
        <div className="lg:col-span-4">
          <Card className="bg-slate-900/50 border-slate-700/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                <Sparkles className="h-4 w-4 text-amber-400" />
                {isZh ? "奋斗者殿堂" : "Strivers' Hall of Fame"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ScanSkeleton lines={3} />
              ) : strivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Award className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">{isZh ? "暂无奋斗者记录" : "No strivers yet"}</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {strivers.map((s) => (
                    <MedalCard key={s.id} striver={s} />
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Footer: CEO 暗纹寄语 ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="text-center py-2"
      >
        <p className="text-[11px] text-slate-700 font-light tracking-[0.15em] italic">
          "{ceoQuote}" —— GRT 奋斗者宣言
        </p>
      </motion.div>
    </div>
  );
}
