/**
 * SupplierConferenceView — Supplier Conference Presentation Page
 *
 * Token-gated, standalone dark sci-fi page for supplier conferences.
 * Shows GRT's core competitiveness and future roadmap.
 * Route: /showcase/supplier-conference/:token (STANDALONE_PREFIXES covers /showcase/)
 */
import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Timer,
  AlertTriangle,
  Award,
  Globe,
  Leaf,
  Factory,
  Shield,
  Zap,
  ChevronDown,
  MapPin,
  TrendingUp,
  Phone,
  FileText,
  Calendar,
  CheckCircle2,
  Target,
  Cpu,
  ArrowUp,
  ArrowLeft,
  LayoutDashboard,
  Home,
} from "lucide-react";

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

// ── Forbidden Screen ──

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
      <div className="relative w-full h-[70vh] bg-neutral-900 animate-pulse">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-96 h-8 bg-neutral-800 rounded" />
          <div className="w-64 h-5 bg-neutral-800 rounded" />
          <div className="w-48 h-10 bg-neutral-800 rounded-full" />
        </div>
      </div>
      <div className="py-12 space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 max-w-6xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-neutral-900 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Core Competitiveness Card ──

function CompetencyCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: "cyan" | "blue" | "purple" | "amber";
}) {
  const colorMap = {
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400",
  };
  const cls = colorMap[color];

  return (
    <GlassPanel className={`p-6 bg-gradient-to-br ${cls} group hover:scale-[1.02] transition-transform duration-300`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-white/5">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
    </GlassPanel>
  );
}

// ── Timeline Node ──

function TimelineNode({
  year,
  title,
  content,
  isLeft,
}: {
  year: string;
  title: string;
  content: string;
  isLeft: boolean;
}) {
  return (
    <div className={`relative flex items-start gap-6 ${isLeft ? "flex-row" : "flex-row-reverse"} mb-12`}>
      <div className={`flex-1 ${isLeft ? "text-right" : "text-left"}`}>
        <GlassPanel className="p-5 border-cyan-500/10 hover:border-cyan-500/30 transition-colors">
          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-2">{year}</Badge>
          <h4 className="text-lg font-semibold text-white mb-1">{title}</h4>
          <p className="text-sm text-neutral-400 leading-relaxed">{content}</p>
        </GlassPanel>
      </div>
      <div className="relative flex flex-col items-center z-10">
        <div className="w-4 h-4 rounded-full bg-cyan-500 ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/30" />
        <div className="w-0.5 h-full bg-gradient-to-b from-cyan-500/40 to-transparent absolute top-4" />
      </div>
      <div className="flex-1" />
    </div>
  );
}

// ── Section Title ──

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">{title}</h2>
      {subtitle && <p className="text-neutral-400 text-lg max-w-2xl mx-auto">{subtitle}</p>}
      <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto mt-4 rounded-full" />
    </div>
  );
}

// ── Content Block Types ──

interface ContentBlock {
  id: number;
  blockType: string;
  title: string | null;
  subtitle: string | null;
  content: unknown;
  tags: unknown;
  watermarkLevel: string | null;
  sortOrder: number;
}

// ──── Main Showcase Content ────

function ShowcaseContent({ data, token }: { data: Record<string, unknown>; token: string }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const contentBlocks = (data.contentBlocks as ContentBlock[]) ?? [];
  const roadmapBlocks = contentBlocks.filter((b) => b.blockType === "roadmap");
  const deliveryCenterBlocks = contentBlocks.filter((b) => b.blockType === "delivery_center");
  const esgBlocks = contentBlocks.filter((b) => b.blockType === "esg_metric");

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight * 0.85, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* ── Header Bar ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollY > 50
            ? "bg-neutral-950/90 backdrop-blur-xl border-b border-white/[0.06] shadow-2xl"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-black tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              GRT GROUP
            </span>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
              Supplier Conference
            </Badge>
          </div>
          <CountdownTimer expiresAt={data.expiresAt as string} />
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section
        ref={heroRef}
        className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/40 via-neutral-950 to-neutral-950" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, rgba(6,182,212,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(139,92,246,0.1) 0%, transparent 50%)",
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 text-center px-6">
          <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 mb-6 text-sm px-4 py-1.5">
            2026-2030 Strategic Vision
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            <span className="bg-gradient-to-r from-white via-white to-neutral-400 bg-clip-text text-transparent">
              GRT GROUP
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 font-light max-w-3xl mx-auto mb-4">
            Shaping the Future of Industrial Cleaning
          </p>
          {!!data.welcomeMessage && (
            <p className="text-lg text-cyan-400/70 italic mt-2 max-w-xl mx-auto">
              {String(data.welcomeMessage)}
            </p>
          )}

          {/* Scroll indicator */}
          <button
            onClick={scrollToContent}
            className="mt-12 flex flex-col items-center gap-2 text-neutral-500 hover:text-cyan-400 transition-colors group cursor-pointer"
          >
            <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ── Core Competitiveness ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title="Core Competitiveness"
            subtitle="Decades of innovation in industrial cleaning technology"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CompetencyCard
              icon={Calendar}
              title="26+ Years Experience"
              description="Industrial cleaning expertise since 2000. Deep domain knowledge across automotive, semiconductor, and general industrial sectors."
              color="cyan"
            />
            <CompetencyCard
              icon={Factory}
              title="500+ Installations"
              description="Equipment delivered and commissioned globally. Proven track record of reliable deployments across diverse manufacturing environments."
              color="blue"
            />
            <CompetencyCard
              icon={Cpu}
              title="6 Core Patents"
              description="Proprietary ultrasonic and vacuum technology. Continuous R&D investment driving next-generation cleaning solutions."
              color="purple"
            />
            <CompetencyCard
              icon={Shield}
              title="ISO 9001 / IATF 16949"
              description="Quality management certifications ensuring consistent product excellence and automotive-grade manufacturing processes."
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* ── Technology Roadmap ── */}
      {roadmapBlocks.length > 0 && (
        <section className="py-20 px-6 bg-gradient-to-b from-neutral-950 via-blue-950/10 to-neutral-950">
          <div className="max-w-4xl mx-auto">
            <SectionTitle
              title="Technology Roadmap"
              subtitle="Our strategic technology evolution and milestones"
            />
            <div className="relative">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/40 via-cyan-500/20 to-transparent -translate-x-1/2 hidden md:block" />
              {roadmapBlocks.map((block, idx) => {
                const content = block.content as Record<string, string> | null;
                const blockTitle = block.title ?? "Milestone";
                const blockContent = content?.description ?? content?.body ?? block.subtitle ?? "";
                const year = content?.year ?? (block.tags as string[] | null)?.[0] ?? `${2026 + idx}`;
                return (
                  <div key={block.id} className="hidden md:block">
                    <TimelineNode
                      year={String(year)}
                      title={blockTitle}
                      content={String(blockContent)}
                      isLeft={idx % 2 === 0}
                    />
                  </div>
                );
              })}
              {/* Mobile fallback: stacked cards */}
              <div className="md:hidden space-y-4">
                {roadmapBlocks.map((block, idx) => {
                  const content = block.content as Record<string, string> | null;
                  const blockTitle = block.title ?? "Milestone";
                  const blockContent = content?.description ?? content?.body ?? block.subtitle ?? "";
                  const year = content?.year ?? (block.tags as string[] | null)?.[0] ?? `${2026 + idx}`;
                  return (
                    <GlassPanel key={block.id} className="p-5 border-cyan-500/10">
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-2">{String(year)}</Badge>
                      <h4 className="text-lg font-semibold text-white mb-1">{blockTitle}</h4>
                      <p className="text-sm text-neutral-400">{String(blockContent)}</p>
                    </GlassPanel>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Global Presence ── */}
      {deliveryCenterBlocks.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <SectionTitle
              title="Global Presence"
              subtitle="Delivery centers and service networks worldwide"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deliveryCenterBlocks.map((block) => {
                const content = block.content as Record<string, string> | null;
                return (
                  <GlassPanel
                    key={block.id}
                    className="p-6 border-blue-500/10 hover:border-blue-500/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <MapPin className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">
                          {block.title ?? "Location"}
                        </h4>
                        {content?.country && (
                          <span className="text-xs text-neutral-500 uppercase tracking-wider">
                            {content.country}
                          </span>
                        )}
                      </div>
                    </div>
                    {block.subtitle && (
                      <p className="text-sm text-neutral-400 mb-3">{block.subtitle}</p>
                    )}
                    {content?.capabilities && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {String(content.capabilities)
                          .split(",")
                          .map((cap, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs text-blue-300 border-blue-500/20 bg-blue-500/5"
                            >
                              {cap.trim()}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </GlassPanel>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── ESG Metrics ── */}
      {esgBlocks.length > 0 && (
        <section className="py-20 px-6 bg-gradient-to-b from-neutral-950 via-emerald-950/10 to-neutral-950">
          <div className="max-w-6xl mx-auto">
            <SectionTitle
              title="ESG Commitment"
              subtitle="Environmental, Social, and Governance performance"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {esgBlocks.map((block) => {
                const content = block.content as Record<string, string> | null;
                return (
                  <GlassPanel
                    key={block.id}
                    className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/15 hover:scale-[1.02] transition-transform"
                  >
                    <div className="flex items-center gap-2 mb-3 opacity-70">
                      <Leaf className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs uppercase tracking-widest text-neutral-400">
                        {block.subtitle ?? "ESG"}
                      </span>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">
                      {content?.value ?? "--"}
                    </div>
                    <p className="text-sm text-neutral-400">
                      {block.title ?? "Metric"}
                    </p>
                    {content?.trend && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        <span>{content.trend}</span>
                      </div>
                    )}
                  </GlassPanel>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Partnership CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <GlassPanel className="p-10 md:p-14 text-center bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 border-cyan-500/20">
            <div className="p-3 rounded-2xl bg-cyan-500/10 w-fit mx-auto mb-6">
              <Target className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Partner with GRT
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Join our strategic supplier network and co-create the next generation of industrial
              cleaning solutions. Together, we deliver excellence across automotive, semiconductor,
              and advanced manufacturing sectors worldwide.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white border-0 px-8 gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Phone className="w-4 h-4" />
                Contact Us
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white px-8 gap-2"
              >
                <FileText className="w-4 h-4" />
                Download Brochure
              </Button>
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <span>&copy; {new Date().getFullYear()} GRT Group. All rights reserved.</span>
          <span className="text-xs text-neutral-600 text-center">
            CONFIDENTIAL: This presentation contains proprietary information intended solely for
            authorized recipients. Unauthorized distribution is prohibited.
          </span>
        </div>
      </footer>

      {/* ─── Fixed Bottom Navigation ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-6 border-t border-white/[0.05] backdrop-blur-xl" style={{ background: "rgba(10,10,10,0.92)" }}>
        <span className="text-[10px] font-mono text-neutral-600">GRT Supplier Conference</span>
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
    </div>
  );
}

// ──── Page Entry Point ────

export default function SupplierConferenceView() {
  const [, params] = useRoute("/showcase/supplier-conference/:token");
  const token = params?.token ?? "";

  const { data, isLoading, error } = trpc.targetedShowcase.guest.getShowcaseByToken.useQuery(
    { token },
    { enabled: !!token, retry: false },
  );

  // Visitor tracking
  const trackMutation = trpc.targetedShowcase.visitorEvent.track.useMutation();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (data && !trackedRef.current) {
      trackedRef.current = true;
      trackMutation.mutate({
        token,
        eventType: "page_view",
        eventTarget: "/showcase/supplier-conference",
        funnelStage: "awareness",
      });
    }
  }, [data, token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return <ForbiddenScreen message="No access token provided." />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ForbiddenScreen message={error.message} />;
  }

  if (!data) {
    return <ForbiddenScreen message="Showcase data not found." />;
  }

  return <ShowcaseContent data={data as Record<string, unknown>} token={token} />;
}
