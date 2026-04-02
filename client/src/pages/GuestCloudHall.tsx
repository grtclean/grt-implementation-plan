/**
 * GuestCloudHall — 客户定向数字云展厅 V2 (Showcase Hub)
 *
 * Token-gated, time-limited immersive showcase page.
 * Dark sci-fi aesthetic. Progressive loading with Suspense + Skeleton.
 * Zero internal data exposure — only shows template content for the given token.
 *
 * V2 Enhancements:
 * - V-VIP personalized welcome (role-based, pain-point matrix)
 * - CMS content blocks (roadmap, patents, ESG, case studies)
 * - Inline support ticket submission (no login required)
 * - Equipment health monitoring section
 * - Visitor event tracking (funnel analytics)
 */
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock,
  Shield,
  Zap,
  Droplets,
  Gauge,
  TrendingUp,
  ChevronRight,
  Phone,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Factory,
  Package,
  BarChart3,
  HeartPulse,
  MapPin,
  Award,
  Leaf,
  Calendar,
  Send,
  MessageSquare,
  Star,
  Wrench,
  X,
  Activity,
  ArrowUp,
  ArrowLeft,
  LayoutDashboard,
  Home,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Skeleton Components ──

function HeroSkeleton() {
  return (
    <div className="relative w-full h-[70vh] bg-neutral-900 animate-pulse">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="w-96 h-8 bg-neutral-800 rounded" />
        <div className="w-64 h-5 bg-neutral-800 rounded" />
        <div className="w-48 h-10 bg-neutral-800 rounded-full" />
      </div>
    </div>
  );
}

function DataGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 max-w-6xl mx-auto">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 rounded-2xl bg-neutral-900 animate-pulse" />
      ))}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="px-6 max-w-6xl mx-auto space-y-4">
      <div className="w-48 h-6 bg-neutral-900 rounded animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-neutral-900 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ── Glass Panel ──

function GlassPanel({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

// ── Countdown Timer ──

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("EXPIRED");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className={`flex items-center gap-2 text-sm font-mono ${isExpired ? "text-red-400" : "text-cyan-400/80"}`}>
      <Timer className="w-4 h-4" />
      <span>访问有效期剩余</span>
      <span className="font-bold text-base tracking-wider">{timeLeft}</span>
    </div>
  );
}

// ── KPI Card ──

function KpiCard({
  icon: Icon,
  value,
  label,
  unit,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  unit?: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
  };
  const cls = colorMap[color] ?? colorMap.cyan;

  return (
    <GlassPanel className={`p-6 bg-gradient-to-br ${cls} group hover:scale-[1.02] transition-transform duration-300`}>
      <div className="flex items-center gap-2 mb-3 opacity-70">
        <Icon className="w-5 h-5" />
        <span className="text-xs uppercase tracking-widest text-neutral-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-black text-white tracking-tight">{value}</span>
        {unit && <span className="text-sm text-neutral-400">{unit}</span>}
      </div>
    </GlassPanel>
  );
}

// ── Configuration Card ──

function ConfigCard({
  config,
  currency,
  index,
}: {
  config: { name: string; description?: string; price?: number; features?: string[] };
  currency: string;
  index: number;
}) {
  const tierColors = ["border-cyan-500/30", "border-blue-500/30", "border-purple-500/30"];
  const tierGlow = ["shadow-cyan-500/10", "shadow-blue-500/10", "shadow-purple-500/10"];
  const recommended = index === 1;

  return (
    <GlassPanel
      className={`p-6 ${tierColors[index % 3]} ${recommended ? `ring-1 ring-cyan-500/40 ${tierGlow[index % 3]} shadow-xl` : ""} relative`}
    >
      {recommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 px-4">
          推荐方案
        </Badge>
      )}
      <h3 className="text-xl font-bold text-white mb-2">{config.name}</h3>
      {config.description && <p className="text-neutral-400 text-sm mb-4">{config.description}</p>}
      {config.price != null && (
        <div className="mb-4">
          <span className="text-3xl font-black text-white">{currency} {config.price.toLocaleString()}</span>
        </div>
      )}
      {config.features && config.features.length > 0 && (
        <ul className="space-y-2">
          {config.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}

// ── Expired / Forbidden Screen ──

function ForbiddenScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <GlassPanel className="p-12 max-w-md text-center border-red-500/20">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">访问被拒绝</h1>
        <p className="text-neutral-400">{message}</p>
        <p className="text-neutral-500 text-sm mt-4">请联系您的GRT专属代表获取新的访问链接。</p>
      </GlassPanel>
    </div>
  );
}

// ── Loading Screen ──

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <HeroSkeleton />
      <div className="py-12 space-y-12">
        <DataGridSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    </div>
  );
}

// ──── Showcase Content (loaded after token validation) ────

function ShowcaseContent({ data, token }: { data: any; token: string }) {
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 150);
    return () => clearTimeout(t);
  }, []);

  const images = (data.equipmentImages ?? []) as Array<{ url: string; caption?: string }>;
  const specs = (data.technicalSpecs ?? {}) as Record<string, string>;
  const configs = (data.configurations ?? []) as Array<{ name: string; description?: string; price?: number; features?: string[] }>;
  const currency = data.priceCurrency ?? "EUR";
  const contentBlocks = (data.contentBlocks ?? []) as any[];

  // V2: Loyalty points (if customer has an account linked to targetClient)
  const loyaltyQuery = trpc.targetedShowcase.loyalty.getAccount.useQuery(
    { customerCode: data.targetClient ?? "" },
    { enabled: !!data.targetClient, retry: false },
  );
  const loyaltyAccount = loyaltyQuery.data;

  // V2: Equipment health (token-gated)
  const equipmentHealthQuery = trpc.targetedShowcase.equipmentHealth.getGuestEquipmentHealth.useQuery(
    { token },
    { enabled: !!token, retry: false },
  );
  const equipmentHealth = equipmentHealthQuery.data ?? [];

  // V2: Visitor event tracking
  const trackMut = trpc.targetedShowcase.visitorEvent.track.useMutation();
  const trackedRef = useRef(false);
  const sessionId = useRef(`s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const deviceType = typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";

  const trackEvent = useCallback((eventType: string, eventTarget: string, funnelStage?: string) => {
    trackMut.mutate({
      token,
      sessionId: sessionId.current,
      eventType,
      eventTarget,
      deviceType,
      funnelStage,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    });
  }, [token, trackMut, deviceType]);

  // Track initial page view once
  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("page_view", "/guest/showcase", "awareness");
    }
  }, [trackEvent]);

  const reveal = (delay: number) =>
    `transition-all duration-1000 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} delay-[${delay}ms]`;

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      {/* ── Auth Bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-neutral-300">
              专属展示 — <span className="text-white font-semibold">{data.targetClient}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            {loyaltyAccount && (
              <a href={`/loyalty/${data.targetClient}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 hover:border-amber-400/40 transition-colors cursor-pointer">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">{loyaltyAccount.availablePoints} pts</span>
                <Badge className={`text-[10px] px-1.5 py-0 h-4 ${
                  loyaltyAccount.tier === "diamond" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                  loyaltyAccount.tier === "platinum" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                  loyaltyAccount.tier === "gold" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" :
                  loyaltyAccount.tier === "silver" ? "bg-slate-400/20 text-slate-300 border-slate-400/30" :
                  "bg-amber-700/20 text-amber-400 border-amber-700/30"
                }`}>{loyaltyAccount.tier}</Badge>
              </a>
            )}
            <CountdownTimer expiresAt={data.expiresAt} />
          </div>
        </div>
      </div>

      {/* ── Hero Section with Video ── */}
      <section className="relative w-full h-[75vh] overflow-hidden pt-14">
        {/* Video Background */}
        {data.heroVideoUrl ? (
          <video
            src={data.heroVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black" />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-neutral-950/30" />

        {/* Radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-500/[0.07] rounded-full blur-[150px]" />

        {/* Content */}
        <div className={`relative z-10 h-full flex flex-col items-center justify-center text-center px-6 transition-all duration-1000 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 mb-6 text-xs tracking-widest uppercase px-5 py-1.5">
            {data.welcomeMessage ?? `GRT Solution for ${data.targetClient}`}
          </Badge>

          <h1 className="text-5xl md:text-7xl font-black mb-4 leading-[0.95] max-w-4xl">
            <span className="bg-gradient-to-r from-white via-white to-neutral-400 bg-clip-text text-transparent">
              {data.title}
            </span>
          </h1>

          {data.subtitle && (
            <p className="text-xl text-neutral-400 max-w-2xl mb-8">{data.subtitle}</p>
          )}

          <div className="flex items-center gap-1 text-neutral-500 text-sm">
            <ChevronRight className="w-4 h-4 animate-pulse" />
            <span>向下滚动探索</span>
          </div>
        </div>
      </section>

      {/* ── Core Data Grid ── */}
      <section className={`py-16 px-6 max-w-6xl mx-auto transition-all duration-1000 delay-300 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.taktTimeSeconds && (
            <KpiCard icon={Timer} value={Number(data.taktTimeSeconds)} label="Takt Time" unit="sec" color="cyan" />
          )}
          {data.cleaningEfficiency && (
            <KpiCard icon={Droplets} value={data.cleaningEfficiency} label="Cleaning Efficiency" color="blue" />
          )}
          {data.cleanlinessStandard && (
            <KpiCard icon={Shield} value={data.cleanlinessStandard} label="Standard" color="green" />
          )}
          {data.throughputPerHour && (
            <KpiCard icon={Gauge} value={data.throughputPerHour} label="Throughput" unit="/hr" color="amber" />
          )}
          {data.powerConsumptionKw && (
            <KpiCard icon={Zap} value={Number(data.powerConsumptionKw)} label="Power" unit="kW" color="purple" />
          )}
          {data.roiMonths && (
            <KpiCard icon={TrendingUp} value={data.roiMonths} label="ROI Payback" unit="months" color="green" />
          )}
        </div>
      </section>

      {/* ── 设备展示 ── */}
      {images.length > 0 && (
        <section className={`py-12 px-6 max-w-6xl mx-auto transition-all duration-1000 delay-500 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Factory className="w-6 h-6 text-cyan-400" />
            设备展示
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <GlassPanel key={i} className="overflow-hidden group">
                <div className="aspect-video bg-neutral-900 relative overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.caption || `Equipment ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                {img.caption && (
                  <div className="p-3 text-sm text-neutral-400">{img.caption}</div>
                )}
              </GlassPanel>
            ))}
          </div>
        </section>
      )}

      {/* ── 技术参数 ── */}
      {Object.keys(specs).length > 0 && (
        <section className={`py-12 px-6 max-w-6xl mx-auto transition-all duration-1000 delay-600 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" />
            技术参数
          </h2>
          <GlassPanel className="p-6">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {Object.entries(specs).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-white/[0.05]">
                  <span className="text-neutral-400 text-sm">{key}</span>
                  <span className="text-white font-medium">{val}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </section>
      )}

      {/* ── 投资方案与回报 — Configuration Comparison ── */}
      {configs.length > 0 && (
        <section className={`py-16 px-6 max-w-6xl mx-auto transition-all duration-1000 delay-700 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            投资方案与回报
          </h2>
          <p className="text-neutral-400 mb-8">对比不同配置方案，找到适合您产线的最优解决方案。</p>

          <div className={`grid gap-6 ${configs.length === 1 ? "max-w-md mx-auto" : configs.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3"}`}>
            {configs.map((cfg, i) => (
              <ConfigCard key={cfg.name} config={cfg} currency={currency} index={i} />
            ))}
          </div>

          {/* Price range summary */}
          {data.priceRangeMin && data.priceRangeMax && (
            <div className="mt-8 text-center">
              <GlassPanel className="inline-block px-8 py-4 border-cyan-500/20">
                <span className="text-neutral-400 text-sm">投资区间:</span>
                <span className="text-2xl font-black text-white ml-2">
                  {currency} {Number(data.priceRangeMin).toLocaleString()} — {Number(data.priceRangeMax).toLocaleString()}
                </span>
              </GlassPanel>
            </div>
          )}
        </section>
      )}

      {/* ── V2: V-VIP Personalized Section ── */}
      {data.accessLevel === "vvip" && data.personalizedConfig && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <GlassPanel className="p-8 border-purple-500/20 bg-gradient-to-br from-purple-950/10 to-indigo-950/10">
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold">
                {data.recipientRole === "ceo" ? "战略总览" :
                 data.recipientRole === "cto" ? "技术深度解析" :
                 data.recipientRole === "cfo" ? "财务分析" :
                 "高管简报"}
              </h2>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 ml-auto">V-VIP</Badge>
            </div>
            {(data.personalizedConfig as any)?.painPointMatches && (
              <div className="mb-6">
                <h3 className="text-sm uppercase tracking-widest text-neutral-400 mb-3">痛点 / 解决方案匹配</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {((data.personalizedConfig as any).painPointMatches as string[]).map((pp: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-neutral-300">{pp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(data.personalizedConfig as any)?.expertCalendarLink && (
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 gap-2"
                onClick={() => {
                  window.open((data.personalizedConfig as any).expertCalendarLink, "_blank");
                  trackEvent("expert_book", "vvip_calendar");
                }}
              >
                <Calendar className="w-4 h-4" /> 预约专家咨询
              </Button>
            )}
          </GlassPanel>
        </section>
      )}

      {/* ── V2: CMS Content Blocks ── */}
      {contentBlocks.length > 0 && (
        <section className="py-12 px-6 max-w-6xl mx-auto space-y-8">
          {/* Roadmap blocks */}
          {contentBlocks.filter(b => b.blockType === "roadmap").map((block: any) => (
            <div key={block.id}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-cyan-400" />
                {block.title}
              </h2>
              {block.subtitle && <p className="text-neutral-400 mb-6">{block.subtitle}</p>}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-transparent" />
                <div className="space-y-6">
                  {((block.content as any)?.milestones ?? []).map((m: any, i: number) => (
                    <div key={i} className="flex items-start gap-6 ml-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${m.status === "done" ? "bg-cyan-500" : m.status === "current" ? "bg-blue-500 ring-2 ring-blue-400/50" : "bg-neutral-700"}`}>
                        <span className="text-xs font-bold text-white">{m.year?.toString().slice(-2) ?? i + 1}</span>
                      </div>
                      <GlassPanel className="flex-1 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{m.title}</span>
                          {m.year && <Badge className="bg-white/5 text-neutral-400 border-0 text-xs">{m.year}</Badge>}
                        </div>
                        <p className="text-sm text-neutral-400">{m.description}</p>
                      </GlassPanel>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Patent blocks */}
          {contentBlocks.filter(b => b.blockType === "patent").length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-cyan-400" />
                核心专利
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {contentBlocks.filter(b => b.blockType === "patent").map((block: any) => (
                  <GlassPanel key={block.id} className="p-5">
                    <h3 className="font-semibold text-white mb-1">{block.title}</h3>
                    <p className="text-xs text-neutral-500 mb-2">{(block.content as any)?.patentNo} | {(block.content as any)?.country}</p>
                    <p className="text-sm text-neutral-400">{block.subtitle ?? (block.content as any)?.abstract}</p>
                  </GlassPanel>
                ))}
              </div>
            </div>
          )}

          {/* Case study blocks */}
          {contentBlocks.filter(b => b.blockType === "case_study").length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Factory className="w-6 h-6 text-cyan-400" />
                成功案例
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {contentBlocks.filter(b => b.blockType === "case_study").map((block: any) => {
                  const c = block.content as any;
                  return (
                    <GlassPanel key={block.id} className="p-6">
                      <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 mb-3">{c?.industry ?? "Industry"}</Badge>
                      <h3 className="text-lg font-bold text-white mb-2">{block.title}</h3>
                      {c?.challenge && <p className="text-sm text-neutral-400 mb-2"><span className="text-neutral-500">Challenge:</span> {c.challenge}</p>}
                      {c?.solution && <p className="text-sm text-neutral-400 mb-2"><span className="text-neutral-500">Solution:</span> {c.solution}</p>}
                      {c?.results && <p className="text-sm text-emerald-400"><span className="text-neutral-500">Results:</span> {c.results}</p>}
                    </GlassPanel>
                  );
                })}
              </div>
            </div>
          )}

          {/* ESG blocks */}
          {contentBlocks.filter(b => b.blockType === "esg_metric").length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Leaf className="w-6 h-6 text-emerald-400" />
                ESG 可持续发展
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {contentBlocks.filter(b => b.blockType === "esg_metric").map((block: any) => {
                  const c = block.content as any;
                  return (
                    <GlassPanel key={block.id} className="p-5 text-center border-emerald-500/10">
                      <Leaf className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <div className="text-2xl font-black text-white">{c?.value}{c?.unit}</div>
                      <div className="text-xs text-neutral-400 mt-1">{block.title}</div>
                    </GlassPanel>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery center blocks */}
          {contentBlocks.filter(b => b.blockType === "delivery_center").length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-cyan-400" />
                全球交付网络
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {contentBlocks.filter(b => b.blockType === "delivery_center").map((block: any) => {
                  const c = block.content as any;
                  return (
                    <GlassPanel key={block.id} className="p-5">
                      <MapPin className="w-5 h-5 text-cyan-400 mb-2" />
                      <h3 className="font-semibold text-white">{block.title}</h3>
                      <p className="text-xs text-neutral-500">{c?.city}, {c?.country}</p>
                      {c?.capabilities && <p className="text-sm text-neutral-400 mt-2">{Array.isArray(c.capabilities) ? c.capabilities.join(" | ") : c.capabilities}</p>}
                    </GlassPanel>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tech highlights — core technology showcase */}
          {contentBlocks.filter(b => b.blockType === "tech_highlight").length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Zap className="w-6 h-6 text-cyan-400" />
                核心技术
              </h2>
              <p className="text-neutral-400 mb-6">GRT独有的核心竞争力技术</p>
              <div className="grid md:grid-cols-2 gap-5">
                {contentBlocks.filter(b => b.blockType === "tech_highlight").map((block: any) => {
                  const c = block.content as any;
                  const levelColors: Record<string, string> = {
                    "Industry-Leading": "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
                    "Patented": "bg-purple-500/10 text-purple-300 border-purple-500/30",
                    "Next-Gen": "bg-blue-500/10 text-blue-300 border-blue-500/30",
                    "Production-Proven": "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                  };
                  const badgeCls = levelColors[c?.techLevel] ?? levelColors["Production-Proven"];
                  return (
                    <GlassPanel key={block.id} className="p-6 hover:border-cyan-500/20 transition-colors group"
                      onClick={() => trackEvent("content_download", `tech:${block.title}`, "interest")}>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">{block.title}</h3>
                        {c?.techLevel && <Badge className={`${badgeCls} shrink-0 ml-2`}>{c.techLevel}</Badge>}
                      </div>
                      <p className="text-sm text-neutral-400 mb-4">{block.subtitle}</p>
                      {c?.specs && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {(c.specs as string[]).map((spec: string, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-neutral-300">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                              {spec}
                            </div>
                          ))}
                        </div>
                      )}
                      {c?.advantage && (
                        <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-500/10">
                          <p className="text-xs text-cyan-300 font-medium">{c.advantage}</p>
                        </div>
                      )}
                    </GlassPanel>
                  );
                })}
              </div>
            </div>
          )}

          {/* Video testimonial blocks */}
          {contentBlocks.filter(b => b.blockType === "video_testimonial").map((block: any) => (
            <GlassPanel key={block.id} className="p-6">
              <h3 className="text-lg font-bold text-white mb-2">{block.title}</h3>
              {block.subtitle && <p className="text-neutral-400 text-sm">{block.subtitle}</p>}
            </GlassPanel>
          ))}
        </section>
      )}

      {/* ── V2: 设备健康监控ing ── */}
      {equipmentHealth.length > 0 && (
        <section className="py-12 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            设备健康监控
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {equipmentHealth.map((eq: any, i: number) => {
              const scoreColor = eq.healthScore >= 80 ? "text-emerald-400 border-emerald-500/20" :
                                 eq.healthScore >= 60 ? "text-amber-400 border-amber-500/20" :
                                 "text-red-400 border-red-500/20";
              return (
                <GlassPanel key={i} className={`p-5 ${scoreColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white text-sm">{eq.equipmentName}</h3>
                    <div className={`text-2xl font-black ${scoreColor.split(" ")[0]}`}>{eq.healthScore}</div>
                  </div>
                  <div className="text-xs text-neutral-500 mb-2">{eq.equipmentCode}</div>
                  <Badge className={`${eq.healthScore >= 80 ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : eq.healthScore >= 60 ? "bg-amber-500/10 text-amber-300 border-amber-500/30" : "bg-red-500/10 text-red-300 border-red-500/30"}`}>
                    {eq.healthStatus}
                  </Badge>
                  {eq.lastTestDate && <div className="text-xs text-neutral-500 mt-2">Last test: {new Date(eq.lastTestDate).toLocaleDateString()}</div>}
                  {eq.operatingHours != null && <div className="text-xs text-neutral-500">Operating: {eq.operatingHours}h</div>}
                </GlassPanel>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-20 px-6 max-w-3xl mx-auto text-center">
        <GlassPanel className="p-12 border-cyan-500/10 bg-gradient-to-br from-cyan-950/10 to-blue-950/10">
          <h2 className="text-3xl font-bold text-white mb-3">准备好了吗？</h2>
          <p className="text-neutral-400 mb-8">
            联系您的GRT专属代表，讨论技术细节、定制方案和交付计划。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 gap-2 shadow-lg shadow-cyan-500/20"
              onClick={() => trackEvent("cta_click", "contact_sales")}
            >
              <Phone className="w-4 h-4" /> 联系销售
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 text-neutral-300 hover:bg-white/5 gap-2"
              onClick={() => trackEvent("cta_click", "request_quote")}
            >
              <FileText className="w-4 h-4" /> 申请正式报价
            </Button>
          </div>
        </GlassPanel>
      </section>

      {/* ── V2: Inline Support Ticket ── */}
      <InlineSupportWidget token={token} trackEvent={trackEvent} />

      {/* ─── Fixed Bottom Navigation ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-6 border-t border-white/[0.05] backdrop-blur-xl" style={{ background: "rgba(10,10,10,0.92)" }}>
        <span className="text-[10px] font-mono text-neutral-600">GRT Guest Cloud Hall</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { document.documentElement.scrollTo({ top: 0, behavior: "smooth" }); document.body.scrollTo({ top: 0, behavior: "smooth" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <ArrowUp className="w-3.5 h-3.5" /> 返回顶部
          </button>
          <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = "/showcase-hub"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-600/30 text-neutral-400 bg-neutral-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> 返回
          </button>
          <button type="button" onClick={() => { window.location.href = "/showcase-hub"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-500/30 text-purple-400 bg-purple-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <LayoutDashboard className="w-3.5 h-3.5" /> 展示中枢
          </button>
          <button type="button" onClick={() => { window.location.href = "/me"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <Home className="w-3.5 h-3.5" /> 主界面
          </button>
        </div>
      </div>
      <div className="h-12" />

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-6 text-center">
        <p className="text-neutral-600 text-xs">
          本展示内容专为以下客户准备 — {data.targetClient}。机密文件，请勿外传。
        </p>
        <p className="text-neutral-700 text-xs mt-1">
          &copy; {new Date().getFullYear()} GRT集团 — 先进工业清洗解决方案
        </p>
      </footer>
    </div>
  );
}

// ──── V2: Inline Support Widget ────

function InlineSupportWidget({ token, trackEvent }: { token: string; trackEvent: (type: string, target: string) => void }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [form, setForm] = useState({
    guestName: "", guestEmail: "", companyName: "",
    issueType: "technical_question", subject: "", description: "",
  });
  const submitMut = trpc.targetedShowcase.supportTicket.submit.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMut.mutateAsync({
      token,
      guestName: form.guestName || undefined,
      guestEmail: form.guestEmail || undefined,
      companyName: form.companyName || undefined,
      issueType: form.issueType,
      subject: form.subject,
      description: form.description || undefined,
    }).then((res) => {
      setSubmitted(res.ticketCode);
      trackEvent("ticket_submit", form.issueType);
    }).catch(() => {});
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-110 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px]">
      <GlassPanel className="border-cyan-500/20 bg-neutral-950/95 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            {submitted ? "工单已提交" : "需要帮助？"}
          </h3>
          <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">工单已创建</p>
            <p className="text-cyan-400 font-mono text-sm mb-3">{submitted}</p>
            <p className="text-neutral-400 text-xs">我们将在24小时内回复。请保存工单编号以便跟踪。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-neutral-400 text-xs">Name</Label>
                <Input value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-8 text-sm" placeholder="Your name" />
              </div>
              <div>
                <Label className="text-neutral-400 text-xs">Email</Label>
                <Input value={form.guestEmail} onChange={e => setForm(f => ({ ...f, guestEmail: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-8 text-sm" placeholder="email@co.com" />
              </div>
            </div>
            <div>
              <Label className="text-neutral-400 text-xs">Issue Type</Label>
              <Select value={form.issueType} onValueChange={v => setForm(f => ({ ...f, issueType: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical_question">技术咨询</SelectItem>
                  <SelectItem value="pricing_inquiry">价格咨询</SelectItem>
                  <SelectItem value="spare_parts">备件需求</SelectItem>
                  <SelectItem value="maintenance_request">维护请求</SelectItem>
                  <SelectItem value="demo_request">演示申请</SelectItem>
                  <SelectItem value="general_feedback">一般反馈</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-neutral-400 text-xs">Subject *</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="bg-white/5 border-white/10 text-white h-8 text-sm" placeholder="Brief description" required />
            </div>
            <div>
              <Label className="text-neutral-400 text-xs">Details</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white text-sm" rows={3} placeholder="Additional details..." />
            </div>
            <Button type="submit" disabled={submitMut.isPending || !form.subject}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 gap-2 h-9 text-sm">
              {submitMut.isPending ? "提交中..." : <><Send className="w-3.5 h-3.5" /> 提交工单</>}
            </Button>
          </form>
        )}
      </GlassPanel>
    </div>
  );
}

// ──── Main Component ────

export default function GuestCloudHall() {
  const { t } = useLanguage();
  const routeResult = useRoute("/guest/showcase/:token");
  const token = routeResult[0] ? (routeResult[1] as Record<string, string>).token ?? "" : "";

  const showcase = trpc.targetedShowcase.guest.getShowcaseByToken.useQuery(
    { token },
    { enabled: !!token, retry: false },
  );

  if (!token) {
    return <ForbiddenScreen message="未提供访问令牌" />;
  }

  if (showcase.isLoading) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoadingScreen />
      </Suspense>
    );
  }

  if (showcase.error) {
    return <ForbiddenScreen message={showcase.error.message} />;
  }

  if (!showcase.data) {
    return <ForbiddenScreen message="展示数据不可用" />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ShowcaseContent data={showcase.data} token={token} />
    </Suspense>
  );
}
