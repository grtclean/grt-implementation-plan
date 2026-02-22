/**
 * GuidedWalkthrough — Tooltip-based step-by-step overlay
 *
 * Steps sourced from help_articles where category='WALKTHROUGH'.
 * Content field contains JSON: { steps: [{ target, title, description, placement }] }
 * Completion stored in localStorage.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Footprints,
} from "lucide-react";

// ── Types ──

interface WalkthroughStep {
  /** CSS selector for the target element */
  target: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Tooltip placement relative to target */
  placement?: "top" | "bottom" | "left" | "right";
}

interface WalkthroughDef {
  id: number;
  title: string;
  titleZh: string;
  routePath: string | null;
  steps: WalkthroughStep[];
}

// ── localStorage helpers ──

const STORAGE_KEY = "grt_walkthrough_completed";

function getCompletedWalkthroughs(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markWalkthroughCompleted(id: number) {
  const completed = getCompletedWalkthroughs();
  if (!completed.includes(id)) {
    completed.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }
}

// ── Position calculation ──

interface TooltipPosition {
  top: number;
  left: number;
  arrowDir: "top" | "bottom" | "left" | "right";
}

function calculatePosition(
  target: DOMRect,
  placement: string,
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const gap = 12;
  // Both overlay and tooltip use `position: fixed`, so getBoundingClientRect()
  // values (viewport-relative) are used directly — no scroll offset needed.

  switch (placement) {
    case "bottom":
      return {
        top: target.bottom + gap,
        left: target.left + target.width / 2 - tooltipWidth / 2,
        arrowDir: "top",
      };
    case "left":
      return {
        top: target.top + target.height / 2 - tooltipHeight / 2,
        left: target.left - tooltipWidth - gap,
        arrowDir: "right",
      };
    case "right":
      return {
        top: target.top + target.height / 2 - tooltipHeight / 2,
        left: target.right + gap,
        arrowDir: "left",
      };
    case "top":
    default:
      return {
        top: target.top - tooltipHeight - gap,
        left: target.left + target.width / 2 - tooltipWidth / 2,
        arrowDir: "bottom",
      };
  }
}

// ── Spotlight overlay ──

function SpotlightOverlay({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;

  const padding = 6;
  // Parent is `fixed inset-0`, so getBoundingClientRect() values (viewport-relative) are correct
  // No scroll offset needed for fixed-position elements

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <svg className="w-full h-full" style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <mask id="walkthrough-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#walkthrough-mask)"
        />
      </svg>
      {/* Highlight border around target */}
      <div
        className="absolute border-2 border-primary rounded-lg animate-pulse pointer-events-none"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
      />
    </div>
  );
}

// ── Step Tooltip ──

function StepTooltip({
  step,
  currentStep,
  totalSteps,
  position,
  onPrev,
  onNext,
  onSkip,
}: {
  step: WalkthroughStep;
  currentStep: number;
  totalSteps: number;
  position: TooltipPosition;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  return (
    <div
      className="fixed z-[61] w-[320px] bg-background border rounded-xl shadow-2xl p-4"
      style={{
        top: `${position.top}px`,
        left: `${Math.max(8, Math.min(position.left, window.innerWidth - 340))}px`,
      }}
    >
      {/* Arrow */}
      <div
        className={cn(
          "absolute w-3 h-3 bg-background border rotate-45",
          position.arrowDir === "top" && "-top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0",
          position.arrowDir === "bottom" && "-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0",
          position.arrowDir === "left" && "-left-1.5 top-1/2 -translate-y-1/2 border-t-0 border-r-0",
          position.arrowDir === "right" && "-right-1.5 top-1/2 -translate-y-1/2 border-b-0 border-l-0"
        )}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-primary">
          步骤 {currentStep + 1} / {totalSteps}
        </span>
        <button onClick={onSkip} className="p-0.5 hover:bg-accent rounded transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <h4 className="text-sm font-semibold mb-1">{step.title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        {step.description}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-xs h-7 px-2 text-muted-foreground"
        >
          跳过
        </Button>
        <div className="flex gap-1.5">
          {!isFirst && (
            <Button variant="outline" size="sm" onClick={onPrev} className="h-7 px-2">
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
              上一步
            </Button>
          )}
          <Button size="sm" onClick={onNext} className="h-7 px-3">
            {isLast ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                完成
              </>
            ) : (
              <>
                下一步
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function GuidedWalkthrough() {
  const [location] = useLocation();
  const [activeWalkthrough, setActiveWalkthrough] = useState<WalkthroughDef | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ top: 0, left: 0, arrowDir: "bottom" });
  const [showStartButton, setShowStartButton] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  // Query walkthroughs for current route
  const { data: walkthroughs } = trpc.help.getWalkthroughs.useQuery(
    { routePath: location, limit: 5 },
    { enabled: !!location }
  );

  // Validate + parse walkthrough steps from content JSON
  const parseWalkthroughSteps = useCallback(
    (content: string): WalkthroughStep[] | null => {
      try {
        const parsed = JSON.parse(content);
        if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) return null;
        // Validate each step has required fields
        const valid = parsed.steps.filter(
          (s: any) => typeof s?.target === "string" && typeof s?.title === "string" && typeof s?.description === "string"
        );
        return valid.length > 0 ? valid : null;
      } catch {
        return null;
      }
    },
    []
  );

  // Check for available walkthrough on route change
  useEffect(() => {
    if (!walkthroughs || walkthroughs.length === 0) {
      setShowStartButton(false);
      return;
    }

    const completed = getCompletedWalkthroughs();
    const available = walkthroughs.find((w) => !completed.includes(w.id));

    if (available) {
      const steps = parseWalkthroughSteps(available.content);
      if (steps) {
        setShowStartButton(true);
        return;
      }
    }
    setShowStartButton(false);
  }, [walkthroughs, location, parseWalkthroughSteps]);

  // Start walkthrough
  const startWalkthrough = useCallback(() => {
    if (!walkthroughs || walkthroughs.length === 0) return;

    const completed = getCompletedWalkthroughs();
    const available = walkthroughs.find((w) => !completed.includes(w.id));
    if (!available) return;

    const steps = parseWalkthroughSteps(available.content);
    if (steps) {
      setActiveWalkthrough({
        id: available.id,
        title: available.title,
        titleZh: available.titleZh,
        routePath: available.routePath,
        steps,
      });
      setCurrentStep(0);
      setShowStartButton(false);
    }
  }, [walkthroughs, parseWalkthroughSteps]);

  // Update target rect when step changes
  useEffect(() => {
    if (!activeWalkthrough) {
      setTargetRect(null);
      return;
    }

    const step = activeWalkthrough.steps[currentStep];
    if (!step?.target) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        const pos = calculatePosition(
          rect,
          step.placement || "bottom",
          320,
          200
        );
        // Clamp tooltip vertically to viewport (fixed position = viewport coords)
        pos.top = Math.max(8, Math.min(pos.top, window.innerHeight - 220));
        setTooltipPos(pos);

        // Scroll target into view if needed
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    // Initial update + observe DOM changes
    updateRect();
    const timer = setTimeout(updateRect, 300); // Retry after animations

    // Observe only the target's parent container (not entire body) for perf
    const targetEl = document.querySelector(step.target);
    if (targetEl?.parentElement) {
      observerRef.current = new MutationObserver(updateRect);
      observerRef.current.observe(targetEl.parentElement, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [activeWalkthrough, currentStep]);

  const handleNext = () => {
    if (!activeWalkthrough) return;
    if (currentStep >= activeWalkthrough.steps.length - 1) {
      // Complete
      markWalkthroughCompleted(activeWalkthrough.id);
      setActiveWalkthrough(null);
      setCurrentStep(0);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (activeWalkthrough) {
      markWalkthroughCompleted(activeWalkthrough.id);
    }
    setActiveWalkthrough(null);
    setCurrentStep(0);
  };

  return (
    <>
      {/* Start button — shown when a walkthrough is available */}
      {showStartButton && !activeWalkthrough && (
        <button
          onClick={startWalkthrough}
          className={cn(
            "fixed bottom-20 right-6 z-40",
            "flex items-center gap-2 px-3 py-2 rounded-full",
            "bg-primary/90 text-primary-foreground text-xs font-medium",
            "shadow-lg hover:bg-primary transition-colors",
            "animate-bounce"
          )}
          style={{ animationDuration: "2s" }}
        >
          <Footprints className="w-4 h-4" />
          操作指南
        </button>
      )}

      {/* Active walkthrough overlay */}
      {activeWalkthrough && (
        <>
          <SpotlightOverlay rect={targetRect} />
          {targetRect && (
            <StepTooltip
              step={activeWalkthrough.steps[currentStep]}
              currentStep={currentStep}
              totalSteps={activeWalkthrough.steps.length}
              position={tooltipPos}
              onPrev={handlePrev}
              onNext={handleNext}
              onSkip={handleSkip}
            />
          )}
        </>
      )}
    </>
  );
}
