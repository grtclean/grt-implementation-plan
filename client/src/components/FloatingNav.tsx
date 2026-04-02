/**
 * FloatingNav — 右下角浮动导航按钮组
 * 用于所有 STANDALONE 页面（无侧边栏的全屏页面）
 * 提供：返回首页、返回上页、全屏切换
 *
 * Usage: <FloatingNav /> 或 <FloatingNav variant="dark" extra={[...]} />
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Home, ArrowLeft, Fullscreen, Minimize } from "lucide-react";

interface NavButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
}

interface FloatingNavProps {
  /** "dark" for dark-themed pages, "light" for light pages */
  variant?: "dark" | "light";
  /** Additional custom buttons */
  extra?: NavButton[];
}

export default function FloatingNav({ variant = "dark", extra }: FloatingNavProps) {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-collapse after 5s
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setExpanded(false), 5000);
    return () => clearTimeout(timer);
  }, [expanded]);

  const isDark = variant === "dark";
  const btnBg = isDark ? "bg-black/60 hover:bg-white/15 border-white/10" : "bg-white/80 hover:bg-white border-gray-200";
  const btnText = isDark ? "text-white/80 hover:text-white" : "text-gray-600 hover:text-gray-900";
  const fabBg = isDark ? "bg-black/50 hover:bg-white/15 border-white/10" : "bg-white/70 hover:bg-white border-gray-200";
  const fabText = isDark ? "text-white/60 hover:text-white" : "text-gray-400 hover:text-gray-700";

  const buttons: NavButton[] = [
    { icon: Home, label: "首页", action: () => navigate("/") },
    { icon: ArrowLeft, label: "返回", action: () => window.history.back() },
    { icon: isFullscreen ? Minimize : Fullscreen, label: isFullscreen ? "退出全屏" : "全屏", action: toggleFullscreen },
    ...(extra || []),
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden">
      {expanded && (
        <div className="flex flex-col gap-1.5 mb-1 animate-in slide-in-from-bottom-2 duration-200">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              onClick={() => { btn.action(); setExpanded(false); }}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg backdrop-blur-md transition-all text-xs whitespace-nowrap shadow-lg ${btnBg} ${btnText}`}
            >
              <btn.icon className="w-4 h-4" />
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-10 h-10 rounded-full border backdrop-blur-md flex items-center justify-center transition-all shadow-lg ${fabBg} ${fabText}`}
        title="导航"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {expanded
            ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
            : <><circle cx="12" cy="5" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="19" r="1.5" fill="currentColor" /></>
          }
        </svg>
      </button>
    </div>
  );
}
