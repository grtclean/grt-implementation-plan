/**
 * 晨会专栏 — CEO 全屏演讲模式
 *
 * Full-screen pitch deck for projector presentations.
 * 5 strategic slides with Microsoft Fluent Design.
 * Keyboard navigation: ← → arrows, Escape exits fullscreen.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Maximize, Minimize, ChevronLeft, ChevronRight,
  Rocket, GitBranch, ShieldCheck, Lock, Brain,
} from "lucide-react";

// ─── Slide Data ─────────────────────────────────────────────

interface Slide {
  title: string;
  content: string;
  icon: React.ComponentType<any>;
  accent: string;       // gradient from
  accentTo: string;     // gradient to
  highlight: string;    // key metric or phrase
}

const SLIDES: Slide[] = [
  {
    title: "重塑基因 —— GRT 迈向世界级AI制造数字底座",
    content: "告别数据孤岛与表哥表姐。目标：对标世界500强与IATF 16949标准。",
    icon: Rocket,
    accent: "#0078d4",
    accentTo: "#106ebe",
    highlight: "世界级AI制造数字底座",
  },
  {
    title: "核心战果 1：M0-M12 全生命周期贯通",
    content: "一次录入，全程流转。161个核心字段、28张业务表单全面数字化，打破部门墙。",
    icon: GitBranch,
    accent: "#0078d4",
    accentTo: "#00b7c3",
    highlight: "161个核心字段 · 28张表单",
  },
  {
    title: "核心战果 2：车间质量防线 (Quality Guard)",
    content: "全员能力矩阵底座。AI智能防呆拦截：核心工位技能不达标（如L1），系统瞬间拉响红灯并物理拦截，扼杀不良品。",
    icon: ShieldCheck,
    accent: "#d83b01",
    accentTo: "#ea4300",
    highlight: "AI智能防呆 · 零不良品",
  },
  {
    title: "核心战果 3：军工级数据安全底座",
    content: "三塔架构与零信任隔离：1.生产金库(绝对断网) 2.开发沙盒 3.AI物理网关。图纸与配方100%安全。",
    icon: Lock,
    accent: "#107c10",
    accentTo: "#0b6a0b",
    highlight: "三塔架构 · 零信任隔离",
  },
  {
    title: "展望未来：AI 孪生指挥舱",
    content: "数字员工后台极限推演。管理模式从'事后救火'跨入'事前推演'的AI时代！",
    icon: Brain,
    accent: "#5c2d91",
    accentTo: "#8661c5",
    highlight: "事前推演 · AI时代",
  },
];

// ─── Fullscreen Helpers ─────────────────────────────────────

function enterFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
}

function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
}

// ═══════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════

export default function MorningMeetingPresentation() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const slide = SLIDES[current];
  const Icon = slide.icon;
  const total = SLIDES.length;

  // ── Fullscreen state sync ──────────────────────────────
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  // ── Keyboard navigation ────────────────────────────────
  const goNext = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "Escape" && isFullscreen) exitFullscreen();
      if (e.key === "f" || e.key === "F") {
        if (!isFullscreen && containerRef.current) enterFullscreen(containerRef.current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, isFullscreen]);

  // ── Toggle fullscreen ──────────────────────────────────
  function toggleFullscreen() {
    if (isFullscreen) {
      exitFullscreen();
    } else if (containerRef.current) {
      enterFullscreen(containerRef.current);
    }
  }

  // ── Progress bar width ─────────────────────────────────
  const progress = ((current + 1) / total) * 100;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#001f3f] text-white flex flex-col select-none"
      style={{ cursor: "default" }}
    >
      {/* ── Top Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/30 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#0078d4] animate-pulse" />
          <span className="text-sm font-medium text-white/70 tracking-wide">
            GRT 晨会专栏
          </span>
          <span className="text-xs text-white/40 font-mono">
            {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50 font-mono">
            {current + 1} / {total}
          </span>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-semibold transition-colors"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4" />
                退出全屏
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                进入全屏演讲模式
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Progress Bar ──────────────────────────────────── */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${slide.accent}, ${slide.accentTo})`,
          }}
        />
      </div>

      {/* ── Slide Content ─────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 md:px-16 lg:px-24 py-12 relative overflow-hidden"
        onClick={(e) => {
          // Click left half = prev, right half = next
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width / 3) goPrev();
          else goNext();
        }}
      >
        {/* Background accent glow */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 60% 50%, ${slide.accent} 0%, transparent 70%)`,
          }}
        />

        {/* Slide number badge */}
        <div className="relative z-10 mb-6">
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${slide.accent}, ${slide.accentTo})`,
            }}
          >
            <Icon className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-bold text-center leading-tight mb-8 max-w-[1200px]">
          {slide.title}
        </h1>

        {/* Highlight Metric */}
        <div
          className="relative z-10 inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg md:text-2xl font-bold mb-8"
          style={{
            background: `linear-gradient(135deg, ${slide.accent}33, ${slide.accentTo}22)`,
            border: `2px solid ${slide.accent}88`,
          }}
        >
          <span style={{ color: slide.accentTo === "#ea4300" ? "#ff6a33" : slide.accentTo }}>
            {slide.highlight}
          </span>
        </div>

        {/* Content */}
        <p className="relative z-10 text-xl md:text-2xl lg:text-3xl text-white/80 text-center leading-relaxed max-w-[1000px]">
          {slide.content}
        </p>
      </div>

      {/* ── Bottom Navigation ─────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-sm">
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
          上一页
        </button>

        {/* Slide dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === current
                  ? "scale-125"
                  : "bg-white/30 hover:bg-white/50"
              }`}
              style={i === current ? { background: `linear-gradient(135deg, ${slide.accent}, ${slide.accentTo})` } : undefined}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={goNext}
          disabled={current === total - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10"
        >
          下一页
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Keyboard hint (only when not fullscreen) ───── */}
      {!isFullscreen && (
        <div className="text-center py-2 text-xs text-white/30">
          快捷键：← → 翻页 · F 全屏 · ESC 退出全屏 · 点击画面左/右侧翻页
        </div>
      )}
    </div>
  );
}
