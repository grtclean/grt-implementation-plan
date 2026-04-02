/**
 * IndustryConference — data-driven conference presentation engine
 *
 * Renders a full-screen keynote presentation from a ConferenceConfig object.
 * Each industry (gear-shaft, aluminum-casting, engine-block, injection-system)
 * provides its own config; the renderers and shell are shared.
 *
 * To update content: edit the corresponding config file under
 * client/src/config/conference/<slug>.ts — no component code changes needed.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { LayoutDashboard } from "lucide-react";
import FloatingNav from "@/components/FloatingNav";

// ── Public Types (re-exported for config files) ──────────────

export type SlideLayout =
  | "cover" | "intro" | "stats" | "showcase" | "tech"
  | "case-hero" | "customers" | "equipment" | "addons"
  | "comparison" | "timeline" | "digital" | "cases"
  | "quote" | "closing";

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  speakerNote?: string;
  data?: Record<string, unknown>;
}

export interface ConferenceMeta {
  /** Top-bar left label, e.g. "齿轴行业大会 2026 · CEO KEYNOTE" */
  topBarLabel: string;
  /** Badge text on cover slide, e.g. "2026 齿轴行业大会 · 25分钟主题演讲" */
  coverBadge: string;
  /** Total presentation duration in minutes (for time indicator) */
  totalMinutes: number;
  /** Accent color class prefix, default "cyan" */
  accent?: string;
  /** Standards shown on cover slide footer */
  coverStandards?: string[];
}

export interface ConferenceConfig {
  meta: ConferenceMeta;
  slides: Slide[];
}

// ── Accent helper ────────────────────────────────────────────

function ac(accent: string | undefined, shade: string) {
  const c = accent || "cyan";
  return `${c}-${shade}`;
}

// ── Slide Renderers ──────────────────────────────────────────

function CoverSlide({ slide, meta }: { slide: Slide; meta: ConferenceMeta }) {
  const standards = meta.coverStandards ?? ["ISO 16232", "VDA 19.1", "NAS 1638", "IATF 16949"];
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="mb-10">
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border border-${ac(meta.accent, "500/30")} bg-${ac(meta.accent, "500/10")}`}>
          <span className="relative flex h-2.5 w-2.5"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${ac(meta.accent, "400")} opacity-75`} /><span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-${ac(meta.accent, "500")}`} /></span>
          <span className={`text-sm font-mono text-${ac(meta.accent, "300")} tracking-wider`}>{meta.coverBadge}</span>
        </div>
      </div>
      <h1 className={`text-6xl md:text-8xl font-black leading-tight whitespace-pre-line bg-gradient-to-r from-white via-${ac(meta.accent, "200")} to-${ac(meta.accent, "400")} bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(34,211,238,0.3)] animate-[fadeInUp_1s_ease-out]`}>
        {slide.title}
      </h1>
      <p className="mt-8 text-2xl md:text-3xl text-gray-100 font-light tracking-[0.2em] animate-[fadeInUp_1.2s_ease-out]">{slide.subtitle}</p>
      <div className="mt-16 flex items-center gap-6 text-gray-500 text-sm font-mono">
        {standards.map((s, i) => (
          <span key={i} className="flex items-center gap-6">{i > 0 && <span className="w-1 h-1 rounded-full bg-gray-600 -ml-3" />}{s}</span>
        ))}
      </div>
    </div>
  );
}

function IntroSlide({ slide }: { slide: Slide }) {
  const d = slide.data as { facts: Array<{value:string;label:string;icon:string}>; centers: Array<{name:string;role:string;people:string}>; certifications: string[] };
  return (
    <div className="flex flex-col h-full px-8 py-4">
      <div className="text-center mb-8">
        <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">{slide.title}</h2>
        <p className="text-xl text-gray-200 mt-2">{slide.subtitle}</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto w-full">
        {d.facts.map((f, i) => (
          <div key={i} className="text-center p-5 rounded-xl border border-gray-500/40 bg-gray-800/40 shadow-lg shadow-cyan-500/5">
            <div className="text-3xl mb-2">{f.icon}</div>
            <div className="text-4xl font-black text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">{f.value}</div>
            <div className="text-sm text-gray-200 mt-1">{f.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto w-full">
        {d.centers.map((c, i) => (
          <div key={i} className="p-4 rounded-lg border border-gray-700/30 bg-gray-800/10 text-center">
            <div className="text-sm font-bold text-white">{c.name}</div>
            <div className="text-sm text-cyan-300 font-semibold mt-1">{c.role}</div>
            <div className="text-sm text-gray-300 mt-1">{c.people}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-3 flex-wrap">
        {d.certifications.map((c, i) => (
          <span key={i} className="px-3 py-1 rounded-full border border-gray-700/30 bg-gray-800/20 text-sm text-gray-200">{c}</span>
        ))}
      </div>
    </div>
  );
}

function StatsSlide({ slide }: { slide: Slide }) {
  const stats = (slide.data?.stats as Array<{ value: string; label: string; color: string; sub?: string }>) ?? [];
  const isThreeCol = stats.length === 3;
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-3">{slide.title}</h2>
      <p className="text-xl text-gray-200 mb-14">{slide.subtitle}</p>
      <div className={`grid ${isThreeCol ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"} gap-6 w-full max-w-5xl`}>
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col items-center p-7 rounded-2xl border border-gray-500/50 bg-gray-800/40 shadow-lg shadow-cyan-500/5 backdrop-blur">
            <span className={`text-5xl md:text-6xl font-black drop-shadow-[0_0_20px_rgba(34,211,238,0.3)] ${s.color}`}>{s.value}</span>
            <span className="mt-3 text-base text-gray-100 text-center leading-relaxed whitespace-pre-line">{s.label}</span>
            {s.sub && <span className="mt-2 text-[11px] text-gray-500 text-center">{s.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TechSlide({ slide }: { slide: Slide }) {
  const techs = (slide.data?.techs as Array<{ name: string; value: string; desc: string; highlight?: boolean }>) ?? [];
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-2">{slide.title}</h2>
      <p className="text-xl text-gray-200 mb-10">{slide.subtitle}</p>
      <div className="space-y-3 w-full max-w-4xl">
        {techs.map((t, i) => (
          <div key={i} className={`flex items-center gap-5 p-4 rounded-xl border ${t.highlight ? "border-cyan-500/40 bg-cyan-500/5" : "border-gray-500/40 bg-gray-800/40 shadow-lg shadow-cyan-500/5"} hover:bg-gray-800/40 transition-colors`}>
            <div className={`w-10 h-10 rounded-lg ${t.highlight ? "bg-cyan-500/30 text-cyan-300" : "bg-gray-700/50 text-gray-400"} flex items-center justify-center font-bold text-lg shrink-0`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-white">{t.name}</h3>
                <span className="text-base font-mono text-cyan-300 font-bold">{t.value}</span>
              </div>
              <p className="text-base text-gray-200 mt-0.5">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseHeroSlide({ slide }: { slide: Slide }) {
  const d = slide.data as {
    customer: string; product: string; architecture: string;
    specs: Array<{label:string; value:string; highlight?: boolean}>;
    configs: Array<{name:string; price:string; features:string}>;
    tagLabel?: string; tagCode?: string;
  };
  return (
    <div className="flex flex-col h-full px-8 py-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 mb-3">
          <span className="text-xs font-mono text-amber-300 tracking-wider">{d.tagLabel ?? "FLAGSHIP CASE"} · {d.tagCode ?? d.customer}</span>
        </div>
        <h2 className="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{slide.title}</h2>
        <p className="text-base text-gray-200 mt-1">{slide.subtitle}</p>
      </div>
      <div className="grid grid-cols-12 gap-5 flex-1 max-w-6xl mx-auto w-full">
        <div className="col-span-5 space-y-3">
          <div className="text-sm text-gray-300 uppercase tracking-wider mb-2">核心指标</div>
          {d.specs.map((s, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span className="text-base text-gray-200">{s.label}</span>
              <span className={`text-sm font-bold ${s.highlight ? "text-emerald-400" : "text-white"}`}>{s.value}</span>
            </div>
          ))}
        </div>
        <div className="col-span-7 space-y-4">
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
            <div className="text-sm text-cyan-300 font-semibold uppercase tracking-wider mb-2">设备架构</div>
            <p className="text-base text-gray-100">{d.architecture}</p>
          </div>
          <div className="text-sm text-gray-300 uppercase tracking-wider">配置方案</div>
          <div className="grid grid-cols-3 gap-3">
            {d.configs.map((c, i) => (
              <div key={i} className={`p-3 rounded-lg border ${i === 1 ? "border-cyan-500/30 bg-cyan-500/5" : "border-gray-700/30 bg-gray-800/10"}`}>
                <div className="text-sm font-bold text-white">{c.name}</div>
                <div className="text-lg font-black text-cyan-400 mt-1">{c.price}</div>
                <div className="text-sm text-gray-200 mt-1">{c.features}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseSlide({ slide }: { slide: Slide }) {
  const items = (slide.data?.items as Array<{ icon: string; name: string; desc: string; specs: string; cases: string }>) ?? [];
  return (
    <div className="flex flex-col h-full px-8 py-4">
      <div className="text-center mb-8">
        <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">{slide.title}</h2>
        <p className="text-xl text-gray-200 mt-2">{slide.subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 flex-1 max-w-6xl mx-auto w-full">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-500/50 bg-gray-800/40 shadow-lg shadow-cyan-500/5 p-5 flex flex-col hover:border-cyan-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{item.icon}</span>
              <h3 className="text-xl font-bold text-white">{item.name}</h3>
            </div>
            <p className="text-gray-300 text-sm mb-2">{item.desc}</p>
            <div className="mt-auto space-y-1.5">
              <p className="text-xs font-mono text-cyan-400/80 bg-cyan-500/10 px-3 py-1.5 rounded">{item.specs}</p>
              <p className="text-sm text-gray-300">标杆客户: {item.cases}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonSlide({ slide }: { slide: Slide }) {
  const headers = (slide.data?.headers as string[]) ?? [];
  const rows = (slide.data?.rows as string[][]) ?? [];
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-2">{slide.title}</h2>
      <p className="text-xl text-gray-200 mb-8">{slide.subtitle}</p>
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border-2 border-gray-500/50 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
        <table className="w-full text-base">
          <thead>
            <tr className="bg-gray-800/80 border-b-2 border-cyan-500/30">
              {headers.map((h, i) => (
                <th key={i} className={`px-5 py-3 text-left font-semibold ${i === 0 ? "text-gray-300" : i === 2 ? "text-cyan-400" : i === 3 ? "text-emerald-400" : "text-gray-400"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-t border-gray-700/30 hover:bg-gray-800/20">
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-5 py-2.5 ${ci === 0 ? "text-gray-300 font-medium" : ci === 1 ? "text-gray-500" : ci === 2 ? "text-white font-semibold" : "text-emerald-400 font-mono text-xs"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimelineSlide({ slide }: { slide: Slide }) {
  const milestones = (slide.data?.milestones as Array<{ week: string; phase: string; items: string[]; color?: string }>) ?? [];
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-2">{slide.title}</h2>
      <p className="text-xl text-gray-200 mb-10">{slide.subtitle}</p>
      <div className="flex gap-2 w-full max-w-6xl">
        {milestones.map((m, i) => (
          <div key={i} className="flex-1 min-w-0 relative">
            {i < milestones.length - 1 && <div className="absolute top-5 left-[60%] right-0 h-px bg-gradient-to-r from-cyan-500/40 to-transparent" />}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full bg-gray-800 border-2 ${m.color || "border-cyan-500/50"} flex items-center justify-center text-cyan-400 font-bold text-[10px] mb-2`}>
                {m.week.split("-")[0]}
              </div>
              <h4 className="text-xs font-bold text-white text-center mb-1.5 leading-tight">{m.phase}</h4>
              <ul className="text-sm text-gray-200 space-y-0.5 text-center">
                {m.items.map((item, j) => <li key={j}>· {item}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DigitalSlide({ slide }: { slide: Slide }) {
  const capabilities = (slide.data?.capabilities as Array<{name:string; desc:string; icon:string}>) ?? [];
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-2">{slide.title}</h2>
      <p className="text-xl text-gray-200 mb-10">{slide.subtitle}</p>
      <div className="grid grid-cols-2 gap-5 w-full max-w-5xl">
        {capabilities.map((c, i) => (
          <div key={i} className="p-6 rounded-xl border border-gray-500/40 bg-gray-800/40 shadow-lg shadow-cyan-500/5 hover:border-cyan-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{c.icon}</span>
              <h3 className="text-xl font-bold text-white">{c.name}</h3>
            </div>
            <p className="text-base text-gray-200 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CasesSlide({ slide }: { slide: Slide }) {
  const cases = (slide.data?.cases as Array<{ customer: string; project: string; result: string }>) ?? [];
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-10">{slide.title}</h2>
      <div className="grid grid-cols-3 gap-5 w-full max-w-5xl">
        {cases.map((c, i) => (
          <div key={i} className="rounded-xl border border-gray-500/50 bg-gray-800/40 shadow-lg shadow-cyan-500/5 p-6">
            <div className="text-xs font-mono text-cyan-400 mb-2">CASE {String(i + 1).padStart(2, "0")}</div>
            <h3 className="text-lg font-bold text-white mb-1">{c.customer}</h3>
            <p className="text-base text-gray-200 mb-4">{c.project}</p>
            <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-300 text-xs">{c.result}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteSlide({ slide }: { slide: Slide }) {
  const d = slide.data as { quote: string; author: string; tagline: string };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="text-8xl text-cyan-400/30 font-serif mb-4 drop-shadow-[0_0_40px_rgba(34,211,238,0.2)]">"</div>
      <blockquote className="text-4xl md:text-5xl font-light text-white leading-relaxed whitespace-pre-line max-w-4xl drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
        {d?.quote}
      </blockquote>
      <div className="mt-10 text-gray-200 text-xl tracking-[0.3em]">{d?.author}</div>
      <div className="mt-6 px-10 py-4 rounded-full border-2 border-cyan-400/40 bg-cyan-500/10 text-cyan-200 text-xl font-semibold shadow-[0_0_30px_rgba(34,211,238,0.2)]">{d?.tagline}</div>
    </div>
  );
}

function ClosingSlide({ slide }: { slide: Slide }) {
  const d = slide.data as { actions: Array<{icon:string;label:string;desc:string}>; links?: Array<{label:string;url:string}>; website: string; email: string };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <h2 className="text-6xl font-black text-white mb-3 drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">{slide.title}</h2>
      <p className="text-2xl text-gray-100 mb-8 tracking-wide">{slide.subtitle}</p>
      <div className="flex gap-5 mb-8">
        {d?.actions?.map((a, i) => (
          <div key={i} className="w-48 p-5 rounded-xl border border-gray-500/50 bg-gray-800/40 shadow-lg shadow-cyan-500/5">
            <div className="text-3xl mb-2">{a.icon}</div>
            <div className="text-sm font-bold text-white mb-1">{a.label}</div>
            <div className="text-sm text-gray-200">{a.desc}</div>
          </div>
        ))}
      </div>
      {d?.links && (
        <div className="flex gap-3 mb-8 flex-wrap justify-center">
          {d.links.map((link, i) => (
            <button
              key={i}
              onClick={() => window.open(link.url, "_blank")}
              className="px-4 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-xs hover:bg-cyan-500/15 transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1 text-sm text-gray-500">
        <div>{d?.website}</div>
        <div>{d?.email}</div>
      </div>
      <div className="mt-6 text-gray-700 text-xs tracking-[0.3em]">
        GRT · 杰瑞德自动化 · GLOBAL ROBOT TECHNOLOGY
      </div>
    </div>
  );
}

function CustomersSlide({ slide }: { slide: Slide }) {
  const groups = (slide.data?.groups as Array<{title:string; customers:Array<{name:string;tag:string;projects:string[];type:string}>}>) ?? [];
  return (
    <div className="flex flex-col h-full px-8 py-4">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{slide.title}</h2>
        <p className="text-base text-gray-200 mt-1">{slide.subtitle}</p>
      </div>
      <div className="grid grid-cols-3 gap-4 flex-1 max-w-6xl mx-auto w-full">
        {groups.map((g, gi) => (
          <div key={gi} className="space-y-3">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider border-b border-cyan-500/20 pb-1">{g.title}</div>
            {g.customers.map((c, ci) => (
              <div key={ci} className="rounded-xl border border-gray-500/40 bg-gray-800/40 shadow-lg shadow-cyan-500/5 p-4 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">{c.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{c.tag}</span>
                </div>
                <div className="space-y-1 mb-2">
                  {c.projects.map((p, pi) => (
                    <div key={pi} className="text-xs text-gray-300 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-cyan-500/60 shrink-0" />
                      {p}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-300 font-mono">{c.type}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EquipmentSlide({ slide }: { slide: Slide }) {
  const machines = (slide.data?.machines as Array<{name:string;partner:string;specs:string[];highlight:string;imageNote:string}>) ?? [];
  return (
    <div className="flex flex-col h-full px-8 py-4">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{slide.title}</h2>
        <p className="text-base text-gray-200 mt-1">{slide.subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-6 flex-1 max-w-6xl mx-auto w-full">
        {machines.map((m, i) => (
          <div key={i} className="rounded-xl border border-gray-500/50 bg-gray-800/40 shadow-lg shadow-cyan-500/5 p-6 flex flex-col">
            <div className="w-full h-36 rounded-lg bg-gray-800/60 border border-dashed border-gray-600/50 flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="text-3xl mb-1">🏭</div>
                <span className="text-sm text-gray-300">{m.imageNote}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{m.name}</h3>
            <p className="text-sm text-cyan-300 font-semibold mb-3">{m.partner}</p>
            <ul className="space-y-1.5 flex-1">
              {m.specs.map((s, si) => (
                <li key={si} className="text-base text-gray-100 flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5 shrink-0">✓</span>
                  {s}
                </li>
              ))}
            </ul>
            <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs text-amber-300">⭐ {m.highlight}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddonsSlide({ slide }: { slide: Slide }) {
  const addons = (slide.data?.addons as Array<{name:string;icon:string;desc:string;details:string[];why:string}>) ?? [];
  return (
    <div className="flex flex-col h-full px-8 py-4">
      <div className="text-center mb-6">
        <h2 className="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{slide.title}</h2>
        <p className="text-base text-gray-200 mt-1">{slide.subtitle}</p>
      </div>
      <div className="grid grid-cols-4 gap-4 flex-1 max-w-6xl mx-auto w-full">
        {addons.map((a, i) => (
          <div key={i} className="rounded-xl border border-gray-500/40 bg-gray-800/40 shadow-lg shadow-cyan-500/5 p-4 flex flex-col hover:border-cyan-500/30 transition-colors">
            <div className="text-3xl mb-2">{a.icon}</div>
            <h3 className="text-lg font-bold text-white mb-0.5">{a.name}</h3>
            <p className="text-sm text-gray-200 mb-3">{a.desc}</p>
            <ul className="space-y-1 flex-1">
              {a.details.map((d, di) => (
                <li key={di} className="text-[11px] text-gray-300 flex items-start gap-1.5">
                  <span className="text-cyan-500/60 shrink-0">·</span>
                  {d}
                </li>
              ))}
            </ul>
            <div className="mt-2 pt-2 border-t border-gray-700/30">
              <p className="text-[10px] text-cyan-400/70 italic">{a.why}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Slide Dispatcher ─────────────────────────────────────────

function SlideContent({ slide, meta }: { slide: Slide; meta: ConferenceMeta }) {
  switch (slide.layout) {
    case "cover": return <CoverSlide slide={slide} meta={meta} />;
    case "intro": return <IntroSlide slide={slide} />;
    case "stats": return <StatsSlide slide={slide} />;
    case "tech": return <TechSlide slide={slide} />;
    case "case-hero": return <CaseHeroSlide slide={slide} />;
    case "customers": return <CustomersSlide slide={slide} />;
    case "equipment": return <EquipmentSlide slide={slide} />;
    case "addons": return <AddonsSlide slide={slide} />;
    case "showcase": return <ShowcaseSlide slide={slide} />;
    case "comparison": return <ComparisonSlide slide={slide} />;
    case "timeline": return <TimelineSlide slide={slide} />;
    case "digital": return <DigitalSlide slide={slide} />;
    case "cases": return <CasesSlide slide={slide} />;
    case "quote": return <QuoteSlide slide={slide} />;
    case "closing": return <ClosingSlide slide={slide} />;
    default: return null;
  }
}

// ── Main Presentation Shell ──────────────────────────────────

// Inject animation keyframes for venue-grade transitions
const VENUE_STYLES = `
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes glowPulse { 0%, 100% { box-shadow: 0 0 20px rgba(34,211,238,0.2); } 50% { box-shadow: 0 0 40px rgba(34,211,238,0.4); } }
`;

export default function IndustryConference({ config }: { config: ConferenceConfig }) {
  const { meta, slides } = config;
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= slides.length || idx === current) return;
    setTransitioning(true);
    setTimeout(() => { setCurrent(idx); setTransitioning(false); }, 200);
  }, [current, slides.length]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Home") { e.preventDefault(); goTo(0); }
      if (e.key === "End") { e.preventDefault(); goTo(slides.length - 1); }
      if (e.key === "n" || e.key === "N") setShowNotes(v => !v);
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, goTo, slides.length]);

  const slide = slides[current];

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden relative select-none">
      <style dangerouslySetInnerHTML={{ __html: VENUE_STYLES }} />
      {/* Background — high-contrast glow for large venue LED */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1400px] h-[700px] rounded-full bg-cyan-500/[0.08] animate-pulse" style={{ filter: "blur(160px)", animationDuration: "4s" }} />
        <div className="absolute bottom-[-5%] right-[-5%] w-[900px] h-[500px] rounded-full bg-blue-600/[0.06]" style={{ filter: "blur(140px)" }} />
        <div className="absolute top-1/2 left-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.04] animate-pulse" style={{ filter: "blur(120px)", animationDuration: "6s" }} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-3">
          <img src="/GRTlogo.gif" alt="GRT" className="w-7 h-7 object-contain" />
          <span className="text-[11px] font-mono text-gray-600 tracking-wider">{meta.topBarLabel}</span>
          <div className="flex gap-1 ml-2">
            <button onClick={() => window.history.back()} className="px-2 py-0.5 rounded text-[10px] bg-gray-800/60 text-gray-500 hover:text-gray-200 hover:bg-gray-700/80 transition-colors">← 返回</button>
            <button onClick={() => { window.location.href = "/"; }} className="px-2 py-0.5 rounded text-[10px] bg-gray-800/60 text-gray-500 hover:text-gray-200 hover:bg-gray-700/80 transition-colors">⌂ 首页</button>
            <button onClick={() => { window.location.href = "/showcase-hub"; }} className="px-2 py-0.5 rounded text-[10px] bg-gray-800/60 text-gray-500 hover:text-gray-200 hover:bg-gray-700/80 transition-colors">展示中枢</button>
            <button onClick={() => { window.location.href = "/showroom"; }} className="px-2 py-0.5 rounded text-[10px] bg-gray-800/60 text-gray-500 hover:text-gray-200 hover:bg-gray-700/80 transition-colors">展厅</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-gray-600">{current + 1} / {slides.length}</span>
          <span className="text-[10px] text-gray-700">~{Math.round(((current + 1) / slides.length) * meta.totalMinutes)}min</span>
        </div>
      </div>

      {/* Slide — enhanced transition for large screen */}
      <div className={`relative z-10 h-full pt-11 pb-8 transition-all duration-500 ease-out ${transitioning ? "opacity-0 scale-[0.96] blur-sm" : "opacity-100 scale-100 blur-0"}`}>
        <SlideContent slide={slide} meta={meta} />
      </div>

      {/* Speaker notes (toggle with N key) */}
      {showNotes && slide.speakerNote && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[80%] max-w-3xl z-30 p-4 rounded-xl bg-black/90 border border-gray-700/50 backdrop-blur">
          <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">演讲备注 (N键切换)</div>
          <p className="text-base text-gray-100 leading-relaxed">{slide.speakerNote}</p>
        </div>
      )}

      {/* Progress — thicker, glowing for LED visibility */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-900/80 z-20">
        <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 transition-all duration-700 shadow-[0_0_20px_rgba(34,211,238,0.5)]" style={{ width: `${((current + 1) / slides.length) * 100}%` }} />
      </div>

      {/* Indicators — larger for 500-person venue */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]" : i < current ? "w-2 bg-cyan-700" : "w-2 bg-gray-600 hover:bg-gray-400"}`} />
        ))}
      </div>

      {/* Click zones */}
      <div className="absolute inset-y-11 left-0 w-[15%] z-20 cursor-w-resize" onClick={prev} />
      <div className="absolute inset-y-11 right-0 w-[15%] z-20 cursor-e-resize" onClick={next} />

      {/* Keyboard hint */}
      <div className="absolute bottom-2 right-6 text-[9px] text-gray-700 z-20 font-mono">← → 翻页 · F 全屏 · N 备注</div>

      <FloatingNav extra={[
        { icon: LayoutDashboard, label: "展示中枢", action: () => navigate("/showcase-hub") },
      ]} />
    </div>
  );
}
