/**
 * ReportPresent — Full-screen projector presentation for executive reports
 *
 * Standalone page (no sidebar). Parses contentBlocks into slides.
 * Keyboard: ← → navigate, F fullscreen, ESC exit fullscreen.
 * Click left/right zones to navigate. Progress bar + dots.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  ArrowLeft,
  BarChart3,
  FileText,
  Target,
  Minus,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

// ─── Fullscreen Helpers ────────────────────────────────────

function enterFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as any).webkitRequestFullscreen)
    (el as any).webkitRequestFullscreen();
}

function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if ((document as any).webkitExitFullscreen)
    (document as any).webkitExitFullscreen();
}

// ─── Slide type icon mapping ──────────────────────────────

function slideIcon(type: string) {
  switch (type) {
    case "title":
      return FileText;
    case "metric":
      return BarChart3;
    case "divider":
      return Minus;
    default:
      return Target;
  }
}

// ═══════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════

export default function ReportPresent() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading, error } = trpc.reportCenter.get.useQuery(
    { id: params.id || "0" },
    { enabled: !!params.id }
  );

  type SlideBlock = { type: string; title?: string; content?: string; value?: string; unit?: string; accent?: string; accentTo?: string };
  const blocks: SlideBlock[] = Array.isArray(report?.contentBlocks) && report.contentBlocks.length > 0
    ? (report.contentBlocks as SlideBlock[])
    : [{ type: "title", title: report?.title || "汇报", content: "暂无内容页" }];
  const total = blocks.length;
  const block = blocks[current] || blocks[0];
  const Icon = block ? slideIcon(block.type || "text") : FileText;

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
  const goNext = useCallback(
    () => setCurrent((c) => Math.min(c + 1, total - 1)),
    [total]
  );
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "Escape" && isFullscreen) exitFullscreen();
      if (e.key === "f" || e.key === "F") {
        if (!isFullscreen && containerRef.current)
          enterFullscreen(containerRef.current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, isFullscreen]);

  // ── Loading / Error ────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#001f3f]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-cyan-300 text-sm">加载汇报中...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#001f3f]">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">
            {error ? "加载失败" : "汇报不存在"}
          </p>
          <button
            onClick={() => navigate("/report-center")}
            className="text-cyan-400 hover:text-cyan-300 text-sm underline"
          >
            ← 返回汇报中枢
          </button>
        </div>
      </div>
    );
  }

  // ── Gradient for each slide ─────────────────────────────
  const accent = block?.accent || "#0078d4";
  const accentTo = block?.accentTo || "#00b7c3";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden select-none"
      style={{ background: "#001f3f" }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" variant="icon" theme="dark" />
          <button
            onClick={() => navigate("/report-center")}
            className="flex items-center gap-2 text-white/60 hover:text-white/90 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回汇报中枢
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs">
            {current + 1} / {total}
          </span>
          <button
            onClick={() => {
              if (isFullscreen) exitFullscreen();
              else if (containerRef.current)
                enterFullscreen(containerRef.current);
            }}
            className="text-white/60 hover:text-white/90 transition-colors"
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Click zones for navigation */}
      <div
        className="absolute top-0 left-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={goPrev}
      />
      <div
        className="absolute top-0 right-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={goNext}
      />

      {/* Slide content */}
      <div className="flex items-center justify-center w-full h-full px-8">
        {block ? (
          <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in duration-500">
            {/* Icon */}
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accentTo})`,
                }}
              >
                <Icon className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Title */}
            {block.title && (
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accentTo})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {block.title}
              </h1>
            )}

            {/* Content or Metric */}
            {block.type === "metric" ? (
              <div className="space-y-2">
                <p
                  className="text-7xl md:text-8xl font-black"
                  style={{ color: accent }}
                >
                  {block.value || "—"}
                  {block.unit && (
                    <span className="text-4xl ml-2 opacity-70">
                      {block.unit}
                    </span>
                  )}
                </p>
              </div>
            ) : block.type === "divider" ? (
              <div className="flex items-center justify-center gap-4">
                <div
                  className="h-px w-32"
                  style={{
                    background: `linear-gradient(to right, transparent, ${accent})`,
                  }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: accent }}
                />
                <div
                  className="h-px w-32"
                  style={{
                    background: `linear-gradient(to left, transparent, ${accent})`,
                  }}
                />
              </div>
            ) : (
              block.content && (
                <p className="text-xl md:text-2xl text-white/80 leading-relaxed max-w-3xl mx-auto whitespace-pre-line">
                  {block.content}
                </p>
              )
            )}
          </div>
        ) : (
          <p className="text-white/40 text-xl">暂无内容</p>
        )}
      </div>

      {/* Nav buttons */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((current + 1) / total) * 100}%`,
              background: `linear-gradient(to right, ${accent}, ${accentTo})`,
            }}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          {/* Report title */}
          <p className="text-white/40 text-sm truncate max-w-xs">
            {report.title}
          </p>

          {/* Slide dots */}
          <div className="flex items-center gap-2">
            {blocks.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === current
                    ? "scale-125"
                    : "bg-white/20 hover:bg-white/40"
                }`}
                style={idx === current ? { background: accent } : undefined}
              />
            ))}
          </div>

          {/* Prev/Next */}
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={current === 0}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={goNext}
              disabled={current === total - 1}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
