/**
 * GuestCloudHall — 客户定向数字云展厅
 *
 * Token-gated, time-limited immersive showcase page.
 * Dark sci-fi aesthetic. Progressive loading with Suspense + Skeleton.
 * Zero internal data exposure — only shows template content for the given token.
 */
import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function GlassPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`}>
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
      <span>Access expires in</span>
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
          RECOMMENDED
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
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-neutral-400">{message}</p>
        <p className="text-neutral-500 text-sm mt-4">Please contact your GRT representative for a new access link.</p>
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

function ShowcaseContent({ data }: { data: any }) {
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 150);
    return () => clearTimeout(t);
  }, []);

  const images = (data.equipmentImages ?? []) as Array<{ url: string; caption?: string }>;
  const specs = (data.technicalSpecs ?? {}) as Record<string, string>;
  const configs = (data.configurations ?? []) as Array<{ name: string; description?: string; price?: number; features?: string[] }>;
  const currency = data.priceCurrency ?? "EUR";

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
              Exclusive Showcase for <span className="text-white font-semibold">{data.targetClient}</span>
            </span>
          </div>
          <CountdownTimer expiresAt={data.expiresAt} />
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
            <span>Scroll to explore</span>
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

      {/* ── Equipment Gallery ── */}
      {images.length > 0 && (
        <section className={`py-12 px-6 max-w-6xl mx-auto transition-all duration-1000 delay-500 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Factory className="w-6 h-6 text-cyan-400" />
            Equipment Gallery
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

      {/* ── Technical Specifications ── */}
      {Object.keys(specs).length > 0 && (
        <section className={`py-12 px-6 max-w-6xl mx-auto transition-all duration-1000 delay-600 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" />
            Technical Specifications
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

      {/* ── Investment & ROI — Configuration Comparison ── */}
      {configs.length > 0 && (
        <section className={`py-16 px-6 max-w-6xl mx-auto transition-all duration-1000 delay-700 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Investment & ROI
          </h2>
          <p className="text-neutral-400 mb-8">Compare configurations and find the optimal solution for your production line.</p>

          <div className={`grid gap-6 ${configs.length === 1 ? "max-w-md mx-auto" : configs.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3"}`}>
            {configs.map((cfg, i) => (
              <ConfigCard key={cfg.name} config={cfg} currency={currency} index={i} />
            ))}
          </div>

          {/* Price range summary */}
          {data.priceRangeMin && data.priceRangeMax && (
            <div className="mt-8 text-center">
              <GlassPanel className="inline-block px-8 py-4 border-cyan-500/20">
                <span className="text-neutral-400 text-sm">Investment Range: </span>
                <span className="text-2xl font-black text-white ml-2">
                  {currency} {Number(data.priceRangeMin).toLocaleString()} — {Number(data.priceRangeMax).toLocaleString()}
                </span>
              </GlassPanel>
            </div>
          )}
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-20 px-6 max-w-3xl mx-auto text-center">
        <GlassPanel className="p-12 border-cyan-500/10 bg-gradient-to-br from-cyan-950/10 to-blue-950/10">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to Proceed?</h2>
          <p className="text-neutral-400 mb-8">
            Contact your GRT representative to discuss technical details, customization options, and delivery timeline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 gap-2 shadow-lg shadow-cyan-500/20">
              <Phone className="w-4 h-4" /> Contact Sales
            </Button>
            <Button size="lg" variant="outline" className="border-white/10 text-neutral-300 hover:bg-white/5 gap-2">
              <FileText className="w-4 h-4" /> Request Formal Quote
            </Button>
          </div>
        </GlassPanel>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-6 text-center">
        <p className="text-neutral-600 text-xs">
          This showcase is exclusively prepared for {data.targetClient}. Confidential — do not distribute.
        </p>
        <p className="text-neutral-700 text-xs mt-1">
          &copy; {new Date().getFullYear()} GRT Group — Advanced Industrial Cleaning Solutions
        </p>
      </footer>
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
    return <ForbiddenScreen message="No access token provided" />;
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
    return <ForbiddenScreen message="Showcase data unavailable" />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ShowcaseContent data={showcase.data} />
    </Suspense>
  );
}
