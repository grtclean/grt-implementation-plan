/**
 * CompanyIntroVDO — GRT 公司介绍 VDO V2
 * Route: /showcase/company-intro (STANDALONE)
 *
 * Cinematic full-screen company presentation with:
 * - 9 data-driven sections from /data/company-intro-vdo.json
 * - Language switcher: 中文 / English / Deutsch / Français
 * - Audience filter: public / customer / colleague / expo
 * - Subtitle overlay mode for VDO recording
 * - Modern dark theme with gradient text + glassmorphism
 * - Auto-play / manual navigation
 *
 * 更新内容: 修改 /data/company-intro-vdo.json，无需改代码
 * 添加视频/图片: 放入 /data/vdo/ 目录，填入 JSON 的 media 字段
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { LayoutDashboard } from "lucide-react";
import FloatingNav from "@/components/FloatingNav";
import vdoData from "../../../data/company-intro-vdo.json";

// ── Types ────────────────────────────────────────────────────

type Lang = "zh" | "en" | "de" | "fr";
type Audience = "public" | "customer" | "colleague" | "expo";

interface Section {
  id: string;
  titleZh: string; titleEn: string; titleDe: string; titleFr: string;
  icon: string;
  audience: Audience[];
  contentZh: string; contentEn: string; contentDe: string; contentFr: string;
  milestones?: Array<{ year: string; zh: string; en: string }>;
  centers?: Array<{ nameZh: string; nameEn: string; role: string; people: number }>;
  techs?: Array<{ nameZh: string; nameEn: string; value: string }>;
  aiCapabilities?: Array<{ nameZh: string; nameEn: string; count?: number; desc?: string }>;
  industries?: Array<{ iconEmoji: string; nameZh: string; nameEn: string }>;
  domains?: Array<{ zh: string; en: string }>;
  deliveryPhases?: Array<{ code: string; zh: string; en: string }>;
  commitments?: Array<{ zh: string; en: string }>;
  quotes?: Array<{ zh: string; en: string }>;
  media?: string;
}

interface Fact { value: string; labelZh: string; labelEn: string }

const LANG_LABELS: Record<Lang, string> = { zh: "中文", en: "English", de: "Deutsch", fr: "Français" };
const AUDIENCE_LABELS: Record<Audience, Record<Lang, string>> = {
  public:    { zh: "公众", en: "Public", de: "Öffentlich", fr: "Public" },
  customer:  { zh: "客户", en: "Customer", de: "Kunde", fr: "Client" },
  colleague: { zh: "同事", en: "Team", de: "Team", fr: "Équipe" },
  expo:      { zh: "展会", en: "Expo", de: "Messe", fr: "Salon" },
};

// ── Helpers ───────────────────────────────────────────────────

function t(obj: Record<string, string> | undefined, lang: Lang, fallback = ""): string {
  if (!obj) return fallback;
  return obj[lang] || obj.en || obj.zh || fallback;
}

function sectionTitle(s: Section, lang: Lang): string {
  const map: Record<Lang, string> = { zh: s.titleZh, en: s.titleEn, de: s.titleDe, fr: s.titleFr };
  return map[lang] || s.titleEn;
}

function sectionContent(s: Section, lang: Lang): string {
  const map: Record<Lang, string> = { zh: s.contentZh, en: s.contentEn, de: s.contentDe, fr: s.contentFr };
  return map[lang] || s.contentEn;
}

const ICON_MAP: Record<string, string> = {
  building: "🏛️", globe: "🌍", zap: "⚡", brain: "🧠",
  network: "🔗", users: "👥", cog: "⚙️", heart: "❤️", star: "⭐",
};

// ── Section Renderers ────────────────────────────────────────

function HeroSection({ lang }: { lang: Lang }) {
  const tagline = t(vdoData.taglines, lang);
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="mb-6">
        <img src="/GRTlogo.gif" alt="GRT" className="w-20 h-20 mx-auto object-contain mb-6" />
      </div>
      <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent leading-tight">
        {vdoData.company.abbr}
      </h1>
      <p className="mt-4 text-2xl md:text-3xl text-gray-300 font-light tracking-widest">
        {lang === "zh" ? vdoData.company.nameZh : vdoData.company.nameEn}
      </p>
      <p className="mt-8 text-xl text-cyan-300/80 font-medium tracking-wider">{tagline}</p>

      {/* Facts ticker */}
      <div className="mt-16 flex items-center gap-8 flex-wrap justify-center">
        {(vdoData.facts as Fact[]).map((f, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl font-black text-white">{f.value}</div>
            <div className="text-xs text-gray-500 mt-1">{lang === "zh" ? f.labelZh : f.labelEn}</div>
          </div>
        ))}
      </div>

      {/* Certifications */}
      <div className="mt-10 flex items-center gap-4 text-gray-600 text-xs font-mono">
        {vdoData.certifications.map((c: string, i: number) => (
          <span key={i} className="flex items-center gap-4">
            {i > 0 && <span className="w-1 h-1 rounded-full bg-gray-700 -ml-2" />}
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function ContentSection({ section, lang }: { section: Section; lang: Lang }) {
  const title = sectionTitle(section, lang);
  const content = sectionContent(section, lang);
  const icon = ICON_MAP[section.icon] || "📌";

  return (
    <div className="flex flex-col h-full px-8 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-4xl mb-3 block">{icon}</span>
        <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {title}
        </h2>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">
        <p className="text-lg text-gray-300 leading-relaxed text-center mb-10">{content}</p>

        {/* Section-specific rich content */}
        {section.milestones && <MilestonesView milestones={section.milestones} lang={lang} />}
        {section.centers && <CentersView centers={section.centers} lang={lang} />}
        {section.techs && <TechsView techs={section.techs} lang={lang} />}
        {section.aiCapabilities && <AiCapView items={section.aiCapabilities} lang={lang} />}
        {section.industries && <IndustriesView items={section.industries} lang={lang} />}
        {section.domains && <DomainsView items={section.domains} lang={lang} />}
        {section.deliveryPhases && <DeliveryView phases={section.deliveryPhases} lang={lang} />}
        {section.commitments && <CommitmentsView items={section.commitments} lang={lang} />}
        {section.quotes && <QuotesView items={section.quotes} lang={lang} />}
      </div>
    </div>
  );
}

// ── Rich Sub-Renderers ───────────────────────────────────────

function MilestonesView({ milestones, lang }: { milestones: Array<{ year: string; zh: string; en: string }>; lang: Lang }) {
  return (
    <div className="relative max-w-3xl mx-auto w-full">
      <div className="absolute left-[60px] top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/40 via-cyan-500/20 to-transparent" />
      <div className="space-y-3">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-start gap-4 pl-2">
            <div className="w-[50px] text-right text-sm font-mono text-cyan-400 font-bold shrink-0 pt-0.5">{m.year}</div>
            <div className="w-3 h-3 rounded-full bg-cyan-500/60 border-2 border-cyan-400 shrink-0 mt-1.5 -ml-1.5" />
            <div className="text-sm text-gray-300 pt-0.5">{lang === "zh" ? m.zh : m.en}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CentersView({ centers, lang }: { centers: Section["centers"]; lang: Lang }) {
  if (!centers) return null;
  return (
    <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto w-full">
      {centers.map((c, i) => (
        <div key={i} className="rounded-xl border border-gray-700/40 bg-gray-800/30 backdrop-blur p-5 text-center hover:border-cyan-500/30 transition-colors">
          <div className="text-2xl font-black text-white">{c.people}</div>
          <div className="text-sm font-bold text-cyan-400 mt-1">{lang === "zh" ? c.nameZh : c.nameEn}</div>
          <div className="text-xs text-gray-500 mt-1">{c.role}</div>
        </div>
      ))}
    </div>
  );
}

function TechsView({ techs, lang }: { techs: Section["techs"]; lang: Lang }) {
  if (!techs) return null;
  return (
    <div className="space-y-2 max-w-3xl mx-auto w-full">
      {techs.map((tech, i) => (
        <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border ${i === 0 ? "border-cyan-500/40 bg-cyan-500/5" : "border-gray-700/30 bg-gray-800/20"} hover:bg-gray-800/30 transition-colors`}>
          <div className={`w-8 h-8 rounded-lg ${i === 0 ? "bg-cyan-500/30 text-cyan-300" : "bg-gray-700/50 text-gray-400"} flex items-center justify-center font-bold text-sm shrink-0`}>{i + 1}</div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white">{lang === "zh" ? tech.nameZh : tech.nameEn}</span>
            <span className="ml-2 text-xs font-mono text-cyan-400">{tech.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AiCapView({ items, lang }: { items: Section["aiCapabilities"]; lang: Lang }) {
  if (!items) return null;
  return (
    <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto w-full">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-gray-700/40 bg-gray-800/20 p-4 hover:border-cyan-500/30 transition-colors">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-white">{lang === "zh" ? item.nameZh : item.nameEn}</span>
            {item.count && <span className="text-xs font-mono text-cyan-400">{item.count}</span>}
          </div>
          {item.desc && <p className="text-xs text-gray-400 mt-1">{item.desc}</p>}
        </div>
      ))}
    </div>
  );
}

function IndustriesView({ items, lang }: { items: Section["industries"]; lang: Lang }) {
  if (!items) return null;
  return (
    <div className="grid grid-cols-4 gap-3 max-w-3xl mx-auto w-full">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-gray-700/40 bg-gray-800/20 p-4 text-center hover:border-cyan-500/30 transition-colors">
          <div className="text-3xl mb-2">{item.iconEmoji}</div>
          <div className="text-xs font-bold text-white">{lang === "zh" ? item.nameZh : item.nameEn}</div>
        </div>
      ))}
    </div>
  );
}

function DomainsView({ items, lang }: { items: Section["domains"]; lang: Lang }) {
  if (!items) return null;
  return (
    <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
      {items.map((d, i) => (
        <span key={i} className="px-4 py-2 rounded-full border border-gray-700/40 bg-gray-800/20 text-sm text-gray-300 hover:border-cyan-500/30 transition-colors">
          {lang === "zh" ? d.zh : d.en}
        </span>
      ))}
    </div>
  );
}

function DeliveryView({ phases, lang }: { phases: Section["deliveryPhases"]; lang: Lang }) {
  if (!phases) return null;
  return (
    <div className="flex gap-1.5 max-w-4xl mx-auto w-full">
      {phases.map((p, i) => (
        <div key={i} className="flex-1 min-w-0 relative">
          {i < phases.length - 1 && <div className="absolute top-4 left-[60%] right-0 h-px bg-gradient-to-r from-cyan-500/40 to-transparent" />}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-[9px] mb-1.5">
              {p.code}
            </div>
            <div className="text-[11px] font-bold text-white text-center leading-tight">{lang === "zh" ? p.zh : p.en}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommitmentsView({ items, lang }: { items: Section["commitments"]; lang: Lang }) {
  if (!items) return null;
  return (
    <div className="grid grid-cols-2 gap-3 max-w-3xl mx-auto w-full">
      {items.map((c, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-emerald-400 font-bold shrink-0">✓</span>
          <span className="text-sm text-gray-300">{lang === "zh" ? c.zh : c.en}</span>
        </div>
      ))}
    </div>
  );
}

function QuotesView({ items, lang }: { items: Section["quotes"]; lang: Lang }) {
  if (!items) return null;
  return (
    <div className="space-y-4 max-w-3xl mx-auto w-full text-center">
      {items.map((q, i) => (
        <div key={i} className={`text-xl md:text-2xl font-light ${i === 0 ? "text-white" : "text-gray-400"} italic`}>
          "{lang === "zh" ? q.zh : q.en}"
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function CompanyIntroVDO() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<Lang>("zh");
  const [audience, setAudience] = useState<Audience>("public");
  const [current, setCurrent] = useState(0); // 0 = hero, 1..N = sections
  const [transitioning, setTransitioning] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const sections: Section[] = useMemo(() =>
    (vdoData.sections as Section[]).filter(s => s.audience.includes(audience)),
  [audience]);

  const totalSlides = sections.length + 1; // hero + sections

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= totalSlides) return;
    setCurrent(prev => {
      if (idx === prev) return prev;
      setTransitioning(true);
      setTimeout(() => setTransitioning(false), 250);
      return idx;
    });
  }, [totalSlides]);

  const next = useCallback(() => {
    setCurrent(prev => {
      const n = prev + 1;
      if (n >= totalSlides) return prev;
      setTransitioning(true);
      setTimeout(() => setTransitioning(false), 250);
      return n;
    });
  }, [totalSlides]);

  const prev = useCallback(() => {
    setCurrent(prev => {
      const n = prev - 1;
      if (n < 0) return prev;
      setTransitioning(true);
      setTimeout(() => setTransitioning(false), 250);
      return n;
    });
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Home") { e.preventDefault(); goTo(0); }
      if (e.key === "End") { e.preventDefault(); goTo(totalSlides - 1); }
      if (e.key === "s" || e.key === "S") setShowSubtitle(v => !v);
      if (e.key === "h" || e.key === "H") setShowControls(v => !v);
      if (e.key === "a" || e.key === "A") setAutoPlay(v => !v);
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, goTo, totalSlides]);

  // Touch swipe support (mobile/pad)
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) next(); else prev();
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [next, prev]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrent(c => {
        const next = c + 1;
        if (next >= totalSlides) { setAutoPlay(false); return c; }
        setTransitioning(true);
        setTimeout(() => setTransitioning(false), 250);
        return next;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [autoPlay, totalSlides]);

  // Subtitle text = current section content
  const subtitleText = current === 0
    ? t(vdoData.taglines, lang)
    : sectionContent(sections[current - 1], lang);

  return (
    <div
      className="h-screen w-screen bg-gray-950 text-white overflow-hidden relative select-none"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Background ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] rounded-full bg-cyan-500/[0.025]" style={{ filter: "blur(150px)" }} />
        <div className="absolute bottom-0 right-0 w-[900px] h-[450px] rounded-full bg-blue-600/[0.02]" style={{ filter: "blur(120px)" }} />
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.015]" style={{ filter: "blur(100px)" }} />
      </div>

      {/* Top bar */}
      <div className={`absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-6 z-40 transition-opacity duration-500 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-3">
          <img src="/GRTlogo.gif" alt="GRT" className="w-7 h-7 object-contain" />
          <span className="text-[11px] font-mono text-gray-600 tracking-wider">
            {lang === "zh" ? "GRT 公司介绍" : "GRT Company Introduction"} · VDO V2
          </span>
          <div className="flex gap-1 ml-3">
            <button onClick={() => window.history.back()} className="px-2 py-1 rounded-md text-[10px] bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors backdrop-blur">← 返回</button>
            <button onClick={() => { window.location.href = "/"; }} className="px-2 py-1 rounded-md text-[10px] bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors backdrop-blur">⌂ 首页</button>
            <button onClick={() => { window.location.href = "/showcase-hub"; }} className="px-2 py-1 rounded-md text-[10px] bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors backdrop-blur">展示中枢</button>
            <button onClick={() => { window.location.href = "/showroom"; }} className="px-2 py-1 rounded-md text-[10px] bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors backdrop-blur">展厅</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audience selector */}
          <div className="flex gap-1 bg-gray-900/60 rounded-lg p-0.5 backdrop-blur">
            {(Object.keys(AUDIENCE_LABELS) as Audience[]).map(a => (
              <button
                key={a}
                onClick={() => { setAudience(a); setCurrent(0); }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${audience === a ? "bg-cyan-500/20 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}
              >
                {AUDIENCE_LABELS[a][lang]}
              </button>
            ))}
          </div>

          {/* Language switcher */}
          <div className="flex gap-1 bg-gray-900/60 rounded-lg p-0.5 backdrop-blur">
            {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${lang === l ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          {/* Asset Management */}
          <div className="flex gap-1 bg-gray-900/60 rounded-lg p-0.5 backdrop-blur">
            <label className="px-2.5 py-1 rounded-md text-[10px] font-medium text-amber-400 hover:bg-amber-500/20 cursor-pointer transition-colors flex items-center gap-1">
              ↑ 上传资料
              <input type="file" className="hidden" accept=".pptx,.pdf,.mp4,.mov"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const buf = await file.arrayBuffer();
                  const res = await fetch("/api/conference-assets/upload", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/octet-stream",
                      "x-conference-slug": "company-intro",
                      "x-asset-type": file.name.endsWith(".mp4") || file.name.endsWith(".mov") ? "video" : "presentation",
                      "x-file-name": encodeURIComponent(file.name),
                    },
                    body: buf,
                  });
                  const data = await res.json();
                  if (data.success) alert(`已上传: ${file.name}\n路径: ${data.filePath}`);
                }}
              />
            </label>
            <a href="/conference-assets/company-intro-presentation.pptx" download
              className="px-2.5 py-1 rounded-md text-[10px] font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-1">
              ↓ 下载PPT
            </a>
            <a href="/conference-assets/company-intro-video.mp4" download
              className="px-2.5 py-1 rounded-md text-[10px] font-medium text-green-400 hover:bg-green-500/20 transition-colors flex items-center gap-1">
              ↓ 下载VDO
            </a>
          </div>

          {/* Controls */}
          <button
            onClick={() => setAutoPlay(v => !v)}
            className={`px-2 py-1 rounded-md text-[10px] font-mono ${autoPlay ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-800/50 text-gray-500"}`}
          >
            {autoPlay ? "▶ AUTO" : "⏸ MANUAL"}
          </button>

          <span className="text-[11px] font-mono text-gray-600">{current + 1} / {totalSlides}</span>
        </div>
      </div>

      {/* Slide content */}
      <div className={`relative z-10 h-full pt-12 pb-16 transition-all duration-250 ${transitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"}`}>
        {current === 0
          ? <HeroSection lang={lang} />
          : <ContentSection section={sections[current - 1]} lang={lang} />
        }
      </div>

      {/* Subtitle overlay */}
      {showSubtitle && subtitleText && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[85%] max-w-4xl z-30">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 text-center">
            <p className="text-sm text-gray-200 leading-relaxed line-clamp-3">{subtitleText}</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 z-20">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
          style={{ width: `${((current + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-cyan-500" : "w-1.5 bg-gray-700 hover:bg-gray-500"}`}
          />
        ))}
      </div>

      {/* Click/tap navigation zones — 25% width for easy touch on mobile */}
      <div className="absolute inset-y-12 left-0 w-[25%] z-20 cursor-w-resize" onClick={prev} />
      <div className="absolute inset-y-12 right-0 w-[25%] z-20 cursor-e-resize" onClick={next} />

      {/* Keyboard hints */}
      <div className={`absolute bottom-3 right-6 text-[9px] text-gray-700 z-20 font-mono transition-opacity duration-500 ${showControls ? "opacity-100" : "opacity-0"}`}>
        ← → {lang === "zh" ? "翻页" : "Navigate"} · F {lang === "zh" ? "全屏" : "Fullscreen"} · S {lang === "zh" ? "字幕" : "Subtitle"} · A {lang === "zh" ? "自动" : "Auto"} · H {lang === "zh" ? "隐藏" : "Hide"}
      </div>

      <FloatingNav extra={[
        { icon: LayoutDashboard, label: "展示中枢", action: () => navigate("/showcase-hub") },
      ]} />
    </div>
  );
}
