/**
 * DashboardCarousel — Auto-cycling wrapper for large-screen views
 *
 * Takes an array of { component, duration } entries and cycles through
 * them with smooth CSS fade transitions. Supports pause on hover.
 */
import { useState, useEffect, useRef, type ReactNode } from "react";

export interface CarouselView {
  key: string;
  label?: string;
  component: ReactNode;
  durationMs: number;
}

interface Props {
  views: CarouselView[];
  /** If true, pause auto-advance on mouse hover */
  pauseOnHover?: boolean;
}

export default function DashboardCarousel({
  views,
  pauseOnHover = true,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const isPaused = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = views.length;
  const current = views[activeIndex] || views[0];

  useEffect(() => {
    if (total <= 1) return; // No auto-advance needed for 0 or 1 views

    function scheduleNext() {
      const duration = views[activeIndex]?.durationMs || 30000;
      timerRef.current = setTimeout(() => {
        if (isPaused.current) {
          scheduleNext();
          return;
        }
        // Start fade-out
        setFading(true);
        setTimeout(() => {
          setActiveIndex((prev) => (prev + 1) % total);
          setFading(false);
        }, 500); // 500ms fade transition
      }, duration);
    }

    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, total, views]);

  if (!current) return null;

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => pauseOnHover && (isPaused.current = true)}
      onMouseLeave={() => pauseOnHover && (isPaused.current = false)}
    >
      {/* Active view */}
      <div
        className="w-full h-full transition-opacity duration-500"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {current.component}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
          {views.map((v, idx) => (
            <button
              key={v.key}
              onClick={() => {
                setFading(true);
                setTimeout(() => {
                  setActiveIndex(idx);
                  setFading(false);
                }, 300);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? "w-8 bg-cyan-400"
                  : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
